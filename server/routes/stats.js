import { Router } from 'express';
import { getPlayerStats, getLeaderboard } from '../database/queries.js';

const router = Router();

// GET /api/stats — Stats personnelles du joueur
router.get('/stats', (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'userId requis' });
  }

  const stats = getPlayerStats(userId);
  res.json(stats);
});

// GET /api/leaderboard — Classement du channel
router.get('/leaderboard', (req, res) => {
  const { channelId } = req.query;

  if (!channelId) {
    return res.status(400).json({ error: 'channelId requis' });
  }

  const leaderboard = getLeaderboard(channelId);
  res.json(leaderboard);
});

export default router;
