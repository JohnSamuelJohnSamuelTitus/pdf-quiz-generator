import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { queryOne, run } from '../db/index.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { User } from '../../../shared/types.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'learnsphere-default-secret-change-in-prod';

const registerSchema = z.object({
  email: z.string().email('Please provide a valid academic email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters long')
});

const loginSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(1, 'Password is required')
});

// Helper to generate JWT
function generateToken(user: { id: string; email: string; role: string }): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// POST /api/auth/register
router.post('/register', async (req, res: Response) => {
  try {
    const parse = registerSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: parse.error.errors[0]?.message || 'Invalid input data'
      });
    }

    const { email, password, fullName } = parse.data;
    const cleanEmail = email.toLowerCase().trim();

    // Check existing
    const existing = await queryOne('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email already exists. Please sign in.'
      });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    const userId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    await run(
      `INSERT INTO users (id, email, password_hash, full_name, role)
       VALUES (?, ?, ?, ?, 'student')`,
      [userId, cleanEmail, hash, fullName.trim()]
    );

    // Create default preferences
    await run(
      `INSERT INTO student_preferences (user_id, interests, primary_subjects, skill_level, learning_objectives, preferred_difficulty, daily_goal_minutes)
       VALUES (?, '[]', '[]', 'beginner', '[]', 'foundational', 30)`,
      [userId]
    );

    const user: User = {
      id: userId,
      email: cleanEmail,
      fullName: fullName.trim(),
      role: 'student',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user
    });
  } catch (err: any) {
    console.error('[Auth] Registration error:', err);
    return res.status(500).json({ success: false, error: 'Registration failed due to server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res: Response) => {
  try {
    const parse = loginSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: parse.error.errors[0]?.message || 'Invalid email or password format'
      });
    }

    const { email, password } = parse.data;
    const cleanEmail = email.toLowerCase().trim();

    const dbUser = await queryOne<{
      id: string;
      email: string;
      password_hash: string;
      full_name: string;
      avatar_url?: string;
      role: 'student' | 'educator' | 'admin';
      created_at: string;
      updated_at: string;
    }>('SELECT * FROM users WHERE email = ?', [cleanEmail]);

    if (!dbUser) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. Please verify your email and password.'
      });
    }

    const validPassword = bcrypt.compareSync(password, dbUser.password_hash);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. Please verify your email and password.'
      });
    }

    const user: User = {
      id: dbUser.id,
      email: dbUser.email,
      fullName: dbUser.full_name,
      avatarUrl: dbUser.avatar_url,
      role: dbUser.role,
      createdAt: dbUser.created_at,
      updatedAt: dbUser.updated_at
    };

    const token = generateToken(user);

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user
    });
  } catch (err: any) {
    console.error('[Auth] Login error:', err);
    return res.status(500).json({ success: false, error: 'Login failed due to server error' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const dbUser = await queryOne<{
      id: string;
      email: string;
      full_name: string;
      avatar_url?: string;
      role: 'student' | 'educator' | 'admin';
      created_at: string;
      updated_at: string;
    }>('SELECT id, email, full_name, avatar_url, role, created_at, updated_at FROM users WHERE id = ?', [userId]);

    if (!dbUser) {
      return res.status(404).json({ success: false, error: 'User profile not found' });
    }

    const prefs = await queryOne<{
      interests: string;
      primary_subjects: string;
      skill_level: string;
      learning_objectives: string;
      preferred_difficulty: string;
      daily_goal_minutes: number;
    }>('SELECT * FROM student_preferences WHERE user_id = ?', [userId]);

    return res.json({
      success: true,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        fullName: dbUser.full_name,
        avatarUrl: dbUser.avatar_url,
        role: dbUser.role,
        createdAt: dbUser.created_at,
        updatedAt: dbUser.updated_at
      },
      preferences: prefs
        ? {
            userId,
            interests: JSON.parse(prefs.interests || '[]'),
            primarySubjects: JSON.parse(prefs.primary_subjects || '[]'),
            skillLevel: prefs.skill_level,
            learningObjectives: JSON.parse(prefs.learning_objectives || '[]'),
            preferredDifficulty: prefs.preferred_difficulty,
            dailyGoalMinutes: prefs.daily_goal_minutes
          }
        : null
    });
  } catch (err: any) {
    console.error('[Auth] Profile error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve session profile' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  return res.json({ success: true, message: 'Logged out successfully' });
});

// GET /api/auth/guest-session (Login-Free Immediate Access)
router.get('/guest-session', async (req, res: Response) => {
  const existingGuestId = (req.headers['x-guest-session'] as string) || (req.query.guestSession as string);
  const guestId = existingGuestId && existingGuestId.trim().length > 0
    ? existingGuestId.trim()
    : `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // Record in DB
  const existing = await queryOne('SELECT id FROM guest_sessions WHERE id = ?', [guestId]);
  if (!existing) {
    await run(
      `INSERT INTO guest_sessions (id, created_at, last_active_at)
       VALUES (?, datetime('now'), datetime('now'))`,
      [guestId]
    );
  } else {
    await run(
      `UPDATE guest_sessions SET last_active_at = datetime('now') WHERE id = ?`,
      [guestId]
    );
  }

  res.setHeader('X-Guest-Session', guestId);
  return res.json({
    success: true,
    guestId,
    message: 'Guest session active. Immediate access enabled without mandatory registration.'
  });
});

// POST /api/auth/migrate-guest (Safe guest-to-account data migration)
router.post('/migrate-guest', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { guestSessionId } = req.body;
    if (!guestSessionId || typeof guestSessionId !== 'string') {
      return res.status(400).json({ success: false, error: 'guestSessionId string is required' });
    }

    const userId = req.user!.id;
    const cleanGuestId = guestSessionId.trim();

    // Verify guest session exists
    const guest = await queryOne('SELECT id FROM guest_sessions WHERE id = ?', [cleanGuestId]);
    if (!guest) {
      return res.status(404).json({ success: false, error: 'Guest session not found or already migrated' });
    }

    // Atomic migration across all student entities
    let migratedRecords = 0;

    const p = await run('UPDATE learning_projects SET user_id = ? WHERE user_id = ?', [userId, cleanGuestId]);
    migratedRecords += p.changes;

    const d = await run('UPDATE uploaded_documents SET user_id = ? WHERE user_id = ?', [userId, cleanGuestId]);
    migratedRecords += d.changes;

    const q = await run('UPDATE quiz_attempts SET user_id = ? WHERE user_id = ?', [userId, cleanGuestId]);
    migratedRecords += q.changes;

    const sp = await run(
      `UPDATE student_progress SET user_id = ? WHERE user_id = ?
       AND topic_id NOT IN (SELECT topic_id FROM student_progress WHERE user_id = ?)`,
      [userId, cleanGuestId, userId]
    );
    migratedRecords += sp.changes;

    const ls = await run('UPDATE learning_sessions SET user_id = ? WHERE user_id = ?', [userId, cleanGuestId]);
    migratedRecords += ls.changes;

    const tmh = await run('UPDATE topic_mastery_history SET user_id = ? WHERE user_id = ?', [userId, cleanGuestId]);
    migratedRecords += tmh.changes;

    const sw = await run('UPDATE student_weaknesses SET user_id = ? WHERE user_id = ?', [userId, cleanGuestId]);
    migratedRecords += sw.changes;

    const rev = await run('UPDATE revision_schedules SET user_id = ? WHERE user_id = ?', [userId, cleanGuestId]);
    migratedRecords += rev.changes;

    const tn = await run('UPDATE topic_notes SET user_id = ? WHERE user_id = ?', [userId, cleanGuestId]);
    migratedRecords += tn.changes;

    // Remove obsolete guest session
    await run('DELETE FROM guest_sessions WHERE id = ?', [cleanGuestId]);

    return res.json({
      success: true,
      message: `Successfully migrated ${migratedRecords} records from guest session to permanent account.`,
      migratedRecords
    });
  } catch (err: any) {
    console.error('[Auth] Migration error:', err);
    return res.status(500).json({ success: false, error: 'Migration failed due to server error' });
  }
});

export default router;
