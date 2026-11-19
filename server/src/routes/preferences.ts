import { Router, Response } from 'express';
import { z } from 'zod';
import { queryOne, run } from '../db/index.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { StudentPreferences } from '../../../shared/types.js';

const router = Router();

const preferencesSchema = z.object({
  interests: z.array(z.string()).default([]),
  primarySubjects: z.array(z.string()).min(1, 'Please select at least one primary subject'),
  skillLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  learningObjectives: z.array(z.string()).default([]),
  preferredDifficulty: z.enum(['foundational', 'moderate', 'rigorous']),
  dailyGoalMinutes: z.number().min(5).max(360).default(30)
});

// GET /api/preferences
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const row = await queryOne<{
      user_id: string;
      interests: string;
      primary_subjects: string;
      skill_level: 'beginner' | 'intermediate' | 'advanced';
      learning_objectives: string;
      preferred_difficulty: 'foundational' | 'moderate' | 'rigorous';
      daily_goal_minutes: number;
      created_at: string;
      updated_at: string;
    }>('SELECT * FROM student_preferences WHERE user_id = ?', [userId]);

    if (!row) {
      return res.status(404).json({ success: false, error: 'Preferences not found' });
    }

    const preferences: StudentPreferences = {
      userId: row.user_id,
      interests: JSON.parse(row.interests || '[]'),
      primarySubjects: JSON.parse(row.primary_subjects || '[]'),
      skillLevel: row.skill_level,
      learningObjectives: JSON.parse(row.learning_objectives || '[]'),
      preferredDifficulty: row.preferred_difficulty,
      dailyGoalMinutes: row.daily_goal_minutes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    return res.json({ success: true, preferences });
  } catch (err: any) {
    console.error('[Preferences] Fetch error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch student preferences' });
  }
});

// PUT /api/preferences
router.put('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const parse = preferencesSchema.safeParse(req.body);

    if (!parse.success) {
      return res.status(400).json({
        success: false,
        error: parse.error.errors[0]?.message || 'Invalid preferences payload'
      });
    }

    const { interests, primarySubjects, skillLevel, learningObjectives, preferredDifficulty, dailyGoalMinutes } = parse.data;

    await run(
      `INSERT INTO student_preferences (user_id, interests, primary_subjects, skill_level, learning_objectives, preferred_difficulty, daily_goal_minutes, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id) DO UPDATE SET
         interests = excluded.interests,
         primary_subjects = excluded.primary_subjects,
         skill_level = excluded.skill_level,
         learning_objectives = excluded.learning_objectives,
         preferred_difficulty = excluded.preferred_difficulty,
         daily_goal_minutes = excluded.daily_goal_minutes,
         updated_at = CURRENT_TIMESTAMP`,
      [
        userId,
        JSON.stringify(interests),
        JSON.stringify(primarySubjects),
        skillLevel,
        JSON.stringify(learningObjectives),
        preferredDifficulty,
        dailyGoalMinutes
      ]
    );

    const updated: StudentPreferences = {
      userId,
      interests,
      primarySubjects,
      skillLevel,
      learningObjectives,
      preferredDifficulty,
      dailyGoalMinutes,
      updatedAt: new Date().toISOString()
    };

    return res.json({
      success: true,
      message: 'Learning preferences updated successfully',
      preferences: updated
    });
  } catch (err: any) {
    console.error('[Preferences] Update error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update preferences' });
  }
});

export default router;
