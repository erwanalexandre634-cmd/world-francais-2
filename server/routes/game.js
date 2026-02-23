import { Router } from 'express';
import { getPuzzleNumber, getMotDuJour } from '../game/daily.js';
import { colorerMot } from '../game/wordle.js';
import { getSolutions, getAccepted } from '../game/words.js';
import { getGame, createGame, addGuess, completeGame } from '../database/queries.js';

const router = Router();
const MAX_GUESSES = 6;

// GET /api/today — Infos sur le puzzle du jour + partie existante
router.get('/today', (req, res) => {
  const { userId, channelId } = req.query;

  if (!userId || !channelId) {
    return res.status(400).json({ error: 'userId et channelId requis' });
  }

  const puzzleNumber = getPuzzleNumber();
  const game = getGame(userId, channelId, puzzleNumber);

  const response = { puzzleNumber, existingGame: null };

  if (game) {
    response.existingGame = {
      guesses: JSON.parse(game.guesses),
      colors: JSON.parse(game.colors),
      completed: !!game.completed,
      result: game.result,
    };

    // Si la partie est terminée et perdue, renvoyer le mot
    if (game.completed && game.result === 0) {
      response.existingGame.answer = getMotDuJour();
    }
  }

  res.json(response);
});

// POST /api/guess — Soumettre une tentative
router.post('/guess', (req, res) => {
  const { userId, channelId, guildId, guess, puzzleNumber } = req.body;

  if (!userId || !channelId || !guess || puzzleNumber === undefined) {
    return res.status(400).json({ isValid: false, errorMessage: 'Paramètres manquants' });
  }

  const currentPuzzle = getPuzzleNumber();
  if (puzzleNumber !== currentPuzzle) {
    return res.json({ isValid: false, errorMessage: 'Puzzle expiré, rechargez la page' });
  }

  const mot = guess.toUpperCase();

  // Vérifier la longueur
  if (mot.length !== 5) {
    return res.json({ isValid: false, errorMessage: 'Le mot doit faire 5 lettres' });
  }

  // Vérifier que le mot est dans la liste des mots acceptés
  const accepted = getAccepted();
  if (!accepted.has(mot)) {
    return res.json({ isValid: false, errorMessage: 'Mot inconnu' });
  }

  // Récupérer ou créer la partie
  let game = getGame(userId, channelId, puzzleNumber);

  if (game && game.completed) {
    return res.json({ isValid: false, errorMessage: 'Partie déjà terminée' });
  }

  let guesses = [];
  let colors = [];

  if (!game) {
    createGame(userId, channelId, guildId, puzzleNumber);
    game = getGame(userId, channelId, puzzleNumber);
  } else {
    guesses = JSON.parse(game.guesses);
    colors = JSON.parse(game.colors);
  }

  if (guesses.length >= MAX_GUESSES) {
    return res.json({ isValid: false, errorMessage: 'Plus de tentatives' });
  }

  // Calculer les couleurs
  const secret = getMotDuJour();
  const result = colorerMot(mot, secret);

  guesses.push(mot);
  colors.push(result);

  const won = result.every(c => c === 'correct');
  const isGameOver = won || guesses.length >= MAX_GUESSES;

  // Sauvegarder
  addGuess(userId, channelId, puzzleNumber, guesses, colors);

  if (isGameOver) {
    const gameResult = won ? guesses.length : 0;
    completeGame(userId, channelId, puzzleNumber, gameResult);
  }

  const response = {
    isValid: true,
    colors: result,
    won,
    gameOver: isGameOver,
  };

  // Si perdu, renvoyer le mot
  if (isGameOver && !won) {
    response.answer = secret;
  }

  res.json(response);
});

export default router;
