import { describe, it, expect, beforeAll } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb, queryOne, run } from '../server/src/db/index.js';

describe('Auth & User Security Suite', () => {
  const JWT_SECRET = process.env.JWT_SECRET || 'learnsphere-default-secret-change-in-prod';
  const testUser = {
    id: `usr-test-${Date.now()}`,
    email: `test-${Date.now()}@learnsphere.edu`,
    password: 'SecurePassword123!',
    fullName: 'Test Student'
  };

  beforeAll(async () => {
    await getDb();
  });

  it('correctly hashes password with bcrypt', () => {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(testUser.password, salt);

    expect(hash).not.toBe(testUser.password);
    expect(bcrypt.compareSync(testUser.password, hash)).toBe(true);
    expect(bcrypt.compareSync('WrongPassword', hash)).toBe(false);
  });

  it('registers a new user and persists in database', async () => {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(testUser.password, salt);

    await run(
      `INSERT INTO users (id, email, password_hash, full_name, role)
       VALUES (?, ?, ?, ?, 'student')`,
      [testUser.id, testUser.email, hash, testUser.fullName]
    );

    const saved = await queryOne<{ id: string; email: string; full_name: string }>(
      'SELECT id, email, full_name FROM users WHERE id = ?',
      [testUser.id]
    );

    expect(saved).not.toBeNull();
    expect(saved?.email).toBe(testUser.email);
    expect(saved?.full_name).toBe(testUser.fullName);
  });

  it('enforces email uniqueness constraint', async () => {
    let duplicateError = false;
    try {
      await run(
        `INSERT INTO users (id, email, password_hash, full_name, role)
         VALUES (?, ?, 'dummyhash', 'Duplicate Name', 'student')`,
        [`usr-dup-${Date.now()}`, testUser.email]
      );
    } catch {
      duplicateError = true;
    }
    expect(duplicateError).toBe(true);
  });

  it('generates and decodes signed JWT session token', () => {
    const token = jwt.sign(
      { id: testUser.id, email: testUser.email, role: 'student' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    expect(typeof token).toBe('string');
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };
    expect(decoded.id).toBe(testUser.id);
    expect(decoded.email).toBe(testUser.email);
    expect(decoded.role).toBe('student');
  });

  it('rejects tampered or invalid JWT session tokens', () => {
    expect(() => {
      jwt.verify('tampered.token.data', JWT_SECRET);
    }).toThrow();
  });
});
