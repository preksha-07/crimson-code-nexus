import { pool, query } from '../db/pool.js';
import { HttpError } from '../shared/http.js';
import { assertTransition, type IssueStatus } from '../core/workflow.js';
import { issueCreateSchema, issueUpdateSchema } from './schema.js';
import type { AuthUser } from '../security/rbac/authorization.js';

const row = (r: Record<string, unknown>) => ({
  id: r.id, projectId: r.project_id, title: r.title, description: r.description, status: r.status,
  severity: r.severity, priority: r.priority, issueType: r.issue_type, component: r.component,
  version: r.version, reporterId: r.reporter_id, assigneeId: r.assignee_id, releaseId: r.release_id,
  createdAt: r.created_at, updatedAt: r.updated_at
});

async function ensureProject(id: string) {
  if (!(await query('SELECT 1 FROM projects WHERE id=$1', [id])).rowCount)
    throw new HttpError(422, 'PROJECT_NOT_FOUND', 'Project does not exist.');
}

async function ensureUser(id: string) {
  if (!(await query('SELECT 1 FROM users WHERE id=$1', [id])).rowCount)
    throw new HttpError(422, 'USER_NOT_FOUND', 'User does not exist.');
}

export async function listIssues(
  params: {
    projectId?: string; status?: string; assigneeId?: string; limit: number; offset: number;
  },
  user?: AuthUser
) {
  const values: unknown[] = [];
  const where: string[] = [];
  if (params.projectId) { values.push(params.projectId); where.push(`project_id=$${values.length}`); }
  if (user && user.role !== 'ADMIN' && user.role !== 'SECURITY_REVIEWER') {
    values.push(user.id);
    where.push(`project_id IN (SELECT project_id FROM project_members WHERE user_id=$${values.length})`);
  }
  if (params.status)    { values.push(params.status);    where.push(`status=$${values.length}`); }
  if (params.assigneeId){ values.push(params.assigneeId); where.push(`assignee_id=$${values.length}`); }
  values.push(params.limit, params.offset);
  const sql = `SELECT * FROM issues ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`;
  return (await query(sql, values)).rows.map(row);
}

export async function getIssue(id: string) {
  const r = await query('SELECT * FROM issues WHERE id=$1', [id]);
  if (!r.rowCount) throw new HttpError(404, 'ISSUE_NOT_FOUND', 'Issue does not exist.');
  return row(r.rows[0]);
}

export async function createIssue(input: unknown, reporterId: string) {
  const data = issueCreateSchema.parse(input);
  await ensureProject(data.projectId);
  await ensureUser(reporterId);
  if (data.assigneeId) await ensureUser(data.assigneeId);
  const id = `BUG-${String(Date.now()).slice(-8)}`;
  const r = await query(
    `INSERT INTO issues(id,project_id,title,description,severity,priority,issue_type,component,version,reporter_id,assignee_id,release_id)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [id, data.projectId, data.title, data.description, data.severity, data.priority,
     data.issueType, data.component ?? null, data.version ?? null,
     reporterId, data.assigneeId ?? null, data.releaseId ?? null]
  );
  await query(
    `INSERT INTO issue_events(issue_id,actor_id,event_type,to_status,metadata) VALUES($1,$2,'ISSUE_CREATED','REPORTED',$3)`,
    [id, reporterId, JSON.stringify({})]
  );
  return row(r.rows[0]);
}

export async function updateIssue(id: string, input: unknown) {
  const data = issueUpdateSchema.parse(input);
  const dbMap: Record<string, string> = {
    title: 'title', description: 'description', severity: 'severity', priority: 'priority',
    issueType: 'issue_type', component: 'component', version: 'version',
    assigneeId: 'assignee_id', releaseId: 'release_id'
  };
  const entries = Object.entries(data).filter(([k]) => dbMap[k] !== undefined);
  if (entries.length === 0) throw new HttpError(400, 'NO_FIELDS', 'No valid fields provided for update.');
  if (data.assigneeId != null) await ensureUser(data.assigneeId);
  const values: unknown[] = [];
  const sets = entries.map(([k, v]) => { values.push(v); return `${dbMap[k]}=$${values.length}`; });
  values.push(id);
  const r = await query(`UPDATE issues SET ${sets.join(', ')} WHERE id=$${values.length} RETURNING *`, values);
  if (!r.rowCount) throw new HttpError(404, 'ISSUE_NOT_FOUND', 'Issue does not exist.');
  return row(r.rows[0]);
}

export async function transitionIssue(id: string, toStatus: IssueStatus, actorId: string, reason?: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query<Record<string, unknown>>('SELECT * FROM issues WHERE id=$1 FOR UPDATE', [id]);
    if (!current.rowCount) throw new HttpError(404, 'ISSUE_NOT_FOUND', 'Issue does not exist.');
    const issue = current.rows[0];
    assertTransition(issue.status as IssueStatus, toStatus);
    await ensureUser(actorId);
    const updated = await client.query<Record<string, unknown>>('UPDATE issues SET status=$1 WHERE id=$2 RETURNING *', [toStatus, id]);
    await client.query(
      `INSERT INTO issue_events(issue_id,actor_id,event_type,from_status,to_status,metadata) VALUES($1,$2,'STATUS_CHANGED',$3,$4,$5)`,
      [id, actorId, issue.status, toStatus, JSON.stringify(reason ? { reason } : {})]
    );
    await client.query('COMMIT');
    return row(updated.rows[0]);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function deleteIssue(id: string) {
  const r = await query('DELETE FROM issues WHERE id=$1', [id]);
  if (!r.rowCount) throw new HttpError(404, 'ISSUE_NOT_FOUND', 'Issue does not exist.');
}
