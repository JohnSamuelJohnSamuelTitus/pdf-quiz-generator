import fs from 'fs';
import path from 'path';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

let dbInstance: Database | null = null;
let SQL: SqlJsStatic | null = null;

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'learnsphere.db');
const SCHEMA_FILE = path.resolve(process.cwd(), 'server/src/db/schema.sql');

// Optional Supabase client initialization
export const supabase: SupabaseClient | null =
  process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)
    ? createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''
      )
    : null;

/**
 * Initializes the database and runs the schema
 */
export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    dbInstance = new SQL.Database(fileBuffer);
  } else {
    dbInstance = new SQL.Database();
  }

  // Run schema
  if (fs.existsSync(SCHEMA_FILE)) {
    const schemaSql = fs.readFileSync(SCHEMA_FILE, 'utf-8');
    dbInstance.run(schemaSql);

    // Safe column migrations for existing SQLite database files
    try {
      dbInstance.run(`ALTER TABLE quiz_answers ADD COLUMN question_type TEXT NOT NULL DEFAULT 'multiple_choice'`);
    } catch {}
    try {
      dbInstance.run(`ALTER TABLE syllabus_topics ADD COLUMN subtopics TEXT DEFAULT '[]'`);
    } catch {}

    saveDb();
  }

  return dbInstance;
}

/**
 * Persists SQLite in-memory changes to disk
 */
export function saveDb(): void {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Failed to persist database to disk:', err);
  }
}

/**
 * Helper to query multiple rows
 */
export async function query<T = any>(sqlStr: string, params: any[] = []): Promise<T[]> {
  const db = await getDb();
  const stmt = db.prepare(sqlStr);
  if (params && params.length > 0) {
    stmt.bind(params);
  }
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

/**
 * Helper to query a single row
 */
export async function queryOne<T = any>(sqlStr: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sqlStr, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Helper to run INSERT/UPDATE/DELETE and persist immediately
 */
export async function run(sqlStr: string, params: any[] = []): Promise<{ changes: number }> {
  const db = await getDb();
  db.run(sqlStr, params);
  saveDb();
  return { changes: db.getRowsModified() };
}
