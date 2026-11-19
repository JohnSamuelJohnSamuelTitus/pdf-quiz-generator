import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { run, queryOne } from '../db/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'learnsphere-default-secret-change-in-prod';

export interface AuthenticatedUser {
  id: string;
  email?: string;
  role?: string;
  isGuest: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Ensures a guest session exists in the database
 */
export async function ensureGuestSession(guestId: string): Promise<string> {
  const cleanId = guestId.trim();
  const existing = await queryOne('SELECT id FROM guest_sessions WHERE id = ?', [cleanId]);
  if (!existing) {
    await run(
      `INSERT INTO guest_sessions (id, created_at, last_active_at)
       VALUES (?, datetime('now'), datetime('now'))`,
      [cleanId]
    );
  } else {
    await run(
      `UPDATE guest_sessions SET last_active_at = datetime('now') WHERE id = ?`,
      [cleanId]
    );
  }
  return cleanId;
}

/**
 * Migrates all records from a guest session to a registered user account
 */
export async function migrateGuestData(guestId: string, targetUserId: string): Promise<{ success: boolean; migratedCount: number }> {
  let count = 0;
  try {
    const pRes = await run('UPDATE learning_projects SET user_id = ? WHERE user_id = ?', [targetUserId, guestId]);
    count += pRes.changes;

    const dRes = await run('UPDATE uploaded_documents SET user_id = ? WHERE user_id = ?', [targetUserId, guestId]);
    count += dRes.changes;

    const qRes = await run('UPDATE quiz_attempts SET user_id = ? WHERE user_id = ?', [targetUserId, guestId]);
    count += qRes.changes;

    const spRes = await run(
      `UPDATE student_progress SET user_id = ? WHERE user_id = ?
       AND topic_id NOT IN (SELECT topic_id FROM student_progress WHERE user_id = ?)`,
      [targetUserId, guestId, targetUserId]
    );
    count += spRes.changes;

    const lsRes = await run('UPDATE learning_sessions SET user_id = ? WHERE user_id = ?', [targetUserId, guestId]);
    count += lsRes.changes;

    const tmhRes = await run('UPDATE topic_mastery_history SET user_id = ? WHERE user_id = ?', [targetUserId, guestId]);
    count += tmhRes.changes;

    const swRes = await run('UPDATE student_weaknesses SET user_id = ? WHERE user_id = ?', [targetUserId, guestId]);
    count += swRes.changes;

    const revRes = await run('UPDATE revision_schedules SET user_id = ? WHERE user_id = ?', [targetUserId, guestId]);
    count += revRes.changes;

    const noteRes = await run('UPDATE topic_notes SET user_id = ? WHERE user_id = ?', [targetUserId, guestId]);
    count += noteRes.changes;

    // Remove obsolete guest session
    await run('DELETE FROM guest_sessions WHERE id = ?', [guestId]);
  } catch (err) {
    console.error('[AuthMiddleware] Guest migration error:', err);
  }
  return { success: true, migratedCount: count };
}

/**
 * Universal session resolver middleware:
 * Accepts registered user JWT OR persistent Guest session token.
 * Automatically generates a guest session if neither is supplied.
 */
export async function requireSession(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  // 1. Check for registered user JWT Bearer token
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        id: string;
        email: string;
        role: string;
      };
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        isGuest: false
      };
      return next();
    } catch {
      // If JWT expired, proceed to check guest session rather than blocking
    }
  }

  // 2. Check for explicit guest session header or query
  const guestHeader = (req.headers['x-guest-session'] as string) || (req.query.guestSession as string);
  if (guestHeader && guestHeader.trim().length > 0) {
    const validGuestId = await ensureGuestSession(guestHeader);
    req.user = {
      id: validGuestId,
      isGuest: true,
      role: 'guest'
    };
    res.setHeader('X-Guest-Session', validGuestId);
    return next();
  }

  // 3. Auto-generate persistent guest session ID if none provided
  const newGuestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  await ensureGuestSession(newGuestId);
  req.user = {
    id: newGuestId,
    isGuest: true,
    role: 'guest'
  };
  res.setHeader('X-Guest-Session', newGuestId);
  return next();
}

/**
 * Enforces that the request is made by an authenticated registered account
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Missing or malformed authorization header.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      role: string;
    };
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      isGuest: false
    };
    next();
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired session token. Please log in again.'
    });
  }
}
