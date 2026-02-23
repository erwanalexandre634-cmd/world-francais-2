import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import gameRoutes from './routes/game.js';
import statsRoutes from './routes/stats.js';
import { initDb } from './database/db.js';

dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3001;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json());

// Initialiser la base de données
initDb();

// En production, servir les fichiers statiques du client buildé
app.use(express.static(path.join(__dirname, '../client/dist')));

// Routes API
app.use('/api', authRoutes);
app.use('/api', gameRoutes);
app.use('/api', statsRoutes);

// Fallback pour SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Serveur Wordle FR démarré sur le port ${PORT}`);
});
