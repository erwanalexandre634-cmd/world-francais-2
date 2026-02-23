import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../../wordle-fr.db');

let db = null;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

export function initDb() {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      guild_id TEXT,
      puzzle_number INTEGER NOT NULL,
      guesses TEXT NOT NULL DEFAULT '[]',
      colors TEXT NOT NULL DEFAULT '[]',
      result INTEGER NOT NULL DEFAULT -1,
      completed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, channel_id, puzzle_number)
    );

    CREATE TABLE IF NOT EXISTS streaks (
      user_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      current_streak INTEGER DEFAULT 0,
      max_streak INTEGER DEFAULT 0,
      last_puzzle INTEGER DEFAULT 0,
      PRIMARY KEY (user_id, channel_id)
    );
  `);

  return database;
}
