import crypto from 'node:crypto';

/**
 * Generates a secure scrypt password hash.
 * Returns a colon-separated salt and derived key string.
 */
export function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

/**
 * Verifies a password against an scrypt hash using timing-safe comparisons.
 */
export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(':');
    if (!salt || !key) return resolve(false);
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      const keyBuffer = Buffer.from(key, 'hex');
      if (keyBuffer.length !== derivedKey.length) {
        return resolve(false);
      }
      resolve(crypto.timingSafeEqual(keyBuffer, derivedKey));
    });
  });
}
