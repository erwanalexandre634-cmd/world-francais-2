import { getDb } from './db.js';

/**
 * Récupérer une partie existante.
 */
export function getGame(userId, channelId, puzzleNumber) {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM games WHERE user_id = ? AND channel_id = ? AND puzzle_number = ?'
  ).get(userId, channelId, puzzleNumber);
}

/**
 * Créer une nouvelle partie.
 */
export function createGame(userId, channelId, guildId, puzzleNumber) {
  const db = getDb();
  db.prepare(
    `INSERT OR IGNORE INTO games (user_id, channel_id, guild_id, puzzle_number, guesses, colors, result, completed)
     VALUES (?, ?, ?, ?, '[]', '[]', -1, 0)`
  ).run(userId, channelId, guildId, puzzleNumber);
}

/**
 * Ajouter une tentative à une partie.
 */
export function addGuess(userId, channelId, puzzleNumber, guesses, colors) {
  const db = getDb();
  db.prepare(
    'UPDATE games SET guesses = ?, colors = ? WHERE user_id = ? AND channel_id = ? AND puzzle_number = ?'
  ).run(JSON.stringify(guesses), JSON.stringify(colors), userId, channelId, puzzleNumber);
}

/**
 * Marquer une partie comme terminée et mettre à jour les streaks.
 */
export function completeGame(userId, channelId, puzzleNumber, result) {
  const db = getDb();

  db.prepare(
    'UPDATE games SET result = ?, completed = 1 WHERE user_id = ? AND channel_id = ? AND puzzle_number = ?'
  ).run(result, userId, channelId, puzzleNumber);

  // Mettre à jour les streaks
  const streak = db.prepare(
    'SELECT * FROM streaks WHERE user_id = ? AND channel_id = ?'
  ).get(userId, channelId);

  if (!streak) {
    // Première partie
    const currentStreak = result > 0 ? 1 : 0;
    db.prepare(
      'INSERT INTO streaks (user_id, channel_id, current_streak, max_streak, last_puzzle) VALUES (?, ?, ?, ?, ?)'
    ).run(userId, channelId, currentStreak, currentStreak, puzzleNumber);
  } else {
    let newStreak;
    if (result > 0) {
      // Gagné
      if (streak.last_puzzle === puzzleNumber - 1) {
        newStreak = streak.current_streak + 1;
      } else {
        newStreak = 1;
      }
    } else {
      // Perdu
      newStreak = 0;
    }
    const maxStreak = Math.max(streak.max_streak, newStreak);
    db.prepare(
      'UPDATE streaks SET current_streak = ?, max_streak = ?, last_puzzle = ? WHERE user_id = ? AND channel_id = ?'
    ).run(newStreak, maxStreak, puzzleNumber, userId, channelId);
  }
}

/**
 * Récupérer les stats d'un joueur (toutes channels confondues).
 */
export function getPlayerStats(userId) {
  const db = getDb();

  const games = db.prepare(
    'SELECT result FROM games WHERE user_id = ? AND completed = 1'
  ).all(userId);

  const played = games.length;
  const wins = games.filter(g => g.result > 0).length;

  // Distribution (1-6)
  const distribution = {};
  for (let i = 1; i <= 6; i++) distribution[i] = 0;
  for (const g of games) {
    if (g.result > 0) {
      distribution[g.result] = (distribution[g.result] || 0) + 1;
    }
  }

  // Streak global (toutes channels)
  const streaks = db.prepare(
    'SELECT current_streak, max_streak FROM streaks WHERE user_id = ?'
  ).all(userId);

  let currentStreak = 0;
  let maxStreak = 0;
  for (const s of streaks) {
    currentStreak = Math.max(currentStreak, s.current_streak);
    maxStreak = Math.max(maxStreak, s.max_streak);
  }

  return { played, wins, currentStreak, maxStreak, distribution };
}

/**
 * Récupérer le classement d'un channel.
 */
export function getLeaderboard(channelId) {
  const db = getDb();

  const rows = db.prepare(`
    SELECT user_id,
           COUNT(*) as played,
           SUM(CASE WHEN result > 0 THEN 1 ELSE 0 END) as wins,
           ROUND(AVG(CASE WHEN result > 0 THEN result ELSE NULL END), 2) as avg_guesses
    FROM games
    WHERE channel_id = ? AND completed = 1
    GROUP BY user_id
    ORDER BY wins DESC, avg_guesses ASC
    LIMIT 20
  `).all(channelId);

  return rows;
}
