import { pool } from '../db/pool.js';
import { recordAuditEvent } from '../audit/service.js';

/**
 * Deterministic delivery adapter.
 * In production this would integrate with an SMTP relay.
 * In test environments the spy replaces `deliveryAdapter.send`.
 */
export const deliveryAdapter = {
  send: async (recipient: string, subject: string, _body: string): Promise<void> => {
    // Safe stub — logs delivery without any real SMTP credentials
    console.log(`[Notification Stub] Delivered to ${recipient}: ${subject}`);
  },
};

/**
 * Picks the next eligible job from notification_jobs, attempts delivery,
 * then updates the job status.
 *
 * All database operations use pool.query so that test spies on pool.query
 * work consistently.  The SELECT uses SKIP LOCKED to allow safe concurrency.
 *
 * Retry policy: on failure, retries < max_retries → status=PENDING, run_at
 * deferred by (retries * 10) seconds (deterministic linear backoff).
 * When retries >= max_retries → status=FAILED (dead-letter) + audit event.
 *
 * Any error in the worker itself is logged and returns false; it never throws.
 */
export async function processNextNotificationJob(): Promise<boolean> {
  try {
    // Claim one eligible job atomically using a CTE
    const claimed = await pool.query<{
      id: string;
      recipient: string;
      subject: string;
      body: string;
      retries: number;
      max_retries: number;
    }>(
      `UPDATE notification_jobs
         SET status = 'PROCESSING'
       WHERE id = (
         SELECT id FROM notification_jobs
          WHERE status = 'PENDING' AND run_at <= NOW()
          ORDER BY run_at
          LIMIT 1
          FOR UPDATE SKIP LOCKED
       )
       RETURNING id, recipient, subject, body, retries, max_retries`
    );

    if (claimed.rows.length === 0) {
      return false; // nothing to do
    }

    const job = claimed.rows[0];

    try {
      await deliveryAdapter.send(job.recipient, job.subject, job.body);

      // Success
      await pool.query(
        `UPDATE notification_jobs SET status = 'COMPLETED' WHERE id = $1`,
        [job.id]
      );
    } catch (deliveryError: unknown) {
      const errorMsg =
        deliveryError instanceof Error ? deliveryError.message : 'Unknown delivery error';
      const newRetries = job.retries + 1;

      if (newRetries >= job.max_retries) {
        // Dead-letter: mark FAILED
        await pool.query(
          `UPDATE notification_jobs
             SET status = 'FAILED', retries = $1, last_error = $2
           WHERE id = $3`,
          [newRetries, errorMsg, job.id]
        );

        // Persist observable audit event (fail-safe — never rethrows)
        await recordAuditEvent({
          action: 'notification.failed',
          resourceType: 'notification',
          resourceId: job.id,
          metadata: {
            recipient: job.recipient,
            retries: newRetries,
            error: errorMsg,
          },
        });
      } else {
        // Retry with linear backoff: 10s × newRetries
        const backoffSeconds = 10 * newRetries;
        await pool.query(
          `UPDATE notification_jobs
             SET status = 'PENDING',
                 retries = $1,
                 last_error = $2,
                 run_at = NOW() + ($3 || ' seconds')::INTERVAL
           WHERE id = $4`,
          [newRetries, errorMsg, String(backoffSeconds), job.id]
        );
      }
    }

    return true;
  } catch (workerError: unknown) {
    console.error('[Notification Worker Error]:', workerError);
    return false;
  }
}
