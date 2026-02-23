import { Router } from 'express';

const router = Router();

// POST /api/token — Échange le code OAuth contre un access_token
router.post('/token', async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Code manquant' });
  }

  try {
    const response = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.VITE_DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
      }),
    });

    const data = await response.json();

    if (!data.access_token) {
      return res.status(400).json({ error: 'Échec de l\'authentification' });
    }

    res.json({ access_token: data.access_token });
  } catch (err) {
    console.error('Erreur OAuth:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
