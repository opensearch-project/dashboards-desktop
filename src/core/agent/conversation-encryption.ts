/**
 * Conversation encryption — encrypt conversations at rest with user-derived key.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGO = 'aes-256-gcm';
const SALT_LEN = 16;
const IV_LEN = 12;
const TAG_LEN = 16;

export function deriveKey(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, 32);
}

export function encrypt(plaintext: string, password: string): string {
  const salt = randomBytes(SALT_LEN);
  const key = deriveKey(password, salt);
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: salt:iv:tag:ciphertext (all base64)
  return [salt, iv, tag, encrypted].map((b) => b.toString('base64')).join(':');
}

export function decrypt(encoded: string, password: string): string {
  const [saltB64, ivB64, tagB64, dataB64] = encoded.split(':');
  const salt = Buffer.from(saltB64, 'base64');
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');
  const key = deriveKey(password, salt);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(data) + decipher.final('utf8');
}
