import { colorerMot } from './wordleLogic.js';

const MAX_TENTATIVES = 6;
const MOT_LENGTH = 5;

let playerInfo = null;
let currentRow = 0;
let currentCol = 0;
let currentGuess = '';
let gameOver = false;
let puzzleNumber = 0;
let guesses = [];
let allColors = [];
let keyboardState = {};

// État du clavier : 'correct' > 'present' > 'absent'
const KEY_PRIORITY = { correct: 3, present: 2, absent: 1 };

export async function initGame(info) {
  playerInfo = info;
  renderGame();
  await loadExistingGame();
  setupKeyboardListeners();
}

function renderGame() {
  const container = document.getElementById('game-container');
  container.innerHTML = `
    <div class="header">
      <h1>WORDLE <span class="flag">FR</span></h1>
    </div>
    <div id="message-bar" class="message-bar"></div>
    <div class="grid" id="grid">
      ${Array.from({ length: MAX_TENTATIVES }, (_, r) => `
        <div class="row" data-row="${r}">
          ${Array.from({ length: MOT_LENGTH }, (_, c) => `
            <div class="tile" data-row="${r}" data-col="${c}"></div>
          `).join('')}
        </div>
      `).join('')}
    </div>
    <div class="keyboard" id="keyboard">
      <div class="keyboard-row">
        ${['A','Z','E','R','T','Y','U','I','O','P'].map(k =>
          `<button class="key" data-key="${k}">${k}</button>`
        ).join('')}
      </div>
      <div class="keyboard-row">
        ${['Q','S','D','F','G','H','J','K','L','M'].map(k =>
          `<button class="key" data-key="${k}">${k}</button>`
        ).join('')}
      </div>
      <div class="keyboard-row">
        <button class="key wide" data-key="ENTER">ENTRÉE</button>
        ${['W','X','C','V','B','N'].map(k =>
          `<button class="key" data-key="${k}">${k}</button>`
        ).join('')}
        <button class="key wide" data-key="BACKSPACE">⌫</button>
      </div>
    </div>
    <div id="stats-modal" class="modal hidden">
      <div class="modal-content">
        <button class="modal-close" id="close-stats">&times;</button>
        <h2>Statistiques</h2>
        <div id="stats-body"></div>
        <div id="share-section" class="hidden">
          <button id="share-btn" class="share-btn">Partager</button>
          <p id="share-copied" class="share-copied hidden">Copié !</p>
        </div>
      </div>
    </div>
  `;
}

async function loadExistingGame() {
  try {
    const res = await fetch(`/api/today?userId=${playerInfo.userId}&channelId=${playerInfo.channelId}`);
    const data = await res.json();
    puzzleNumber = data.puzzleNumber;

    if (data.existingGame) {
      guesses = data.existingGame.guesses;
      allColors = data.existingGame.colors;
      currentRow = guesses.length;

      // Rejouer les tentatives sur la grille sans animation
      for (let r = 0; r < guesses.length; r++) {
        const word = guesses[r];
        const colors = allColors[r];
        for (let c = 0; c < MOT_LENGTH; c++) {
          const tile = getTile(r, c);
          tile.textContent = word[c];
          tile.classList.add(colors[c]);
          updateKeyState(word[c], colors[c]);
        }
      }
      updateKeyboardColors();

      if (data.existingGame.completed) {
        gameOver = true;
        if (data.existingGame.result > 0) {
          showMessage('Bravo ! 🎉', true);
        } else {
          showMessage(`Perdu ! Le mot était : ${data.existingGame.answer}`, true);
        }
        showStatsAfterDelay();
      }
    }
  } catch (err) {
    console.error('Erreur chargement partie:', err);
  }
}

function setupKeyboardListeners() {
  // Clavier virtuel
  document.getElementById('keyboard').addEventListener('click', (e) => {
    const btn = e.target.closest('.key');
    if (!btn) return;
    const key = btn.dataset.key;
    handleKey(key);
  });

  // Clavier physique
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const key = e.key.toUpperCase();
    if (key === 'ENTER') {
      handleKey('ENTER');
    } else if (key === 'BACKSPACE') {
      handleKey('BACKSPACE');
    } else if (/^[A-Z]$/.test(key)) {
      handleKey(key);
    }
  });
}

function handleKey(key) {
  if (gameOver) return;

  if (key === 'BACKSPACE') {
    if (currentCol > 0) {
      currentCol--;
      currentGuess = currentGuess.slice(0, -1);
      const tile = getTile(currentRow, currentCol);
      tile.textContent = '';
      tile.classList.remove('active');
    }
    return;
  }

  if (key === 'ENTER') {
    submitGuess();
    return;
  }

  // Lettre
  if (currentCol < MOT_LENGTH) {
    const tile = getTile(currentRow, currentCol);
    tile.textContent = key;
    tile.classList.add('active');
    currentGuess += key;
    currentCol++;
  }
}

async function submitGuess() {
  if (currentGuess.length !== MOT_LENGTH) {
    showMessage('Pas assez de lettres');
    shakeRow(currentRow);
    return;
  }

  try {
    const res = await fetch('/api/guess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: playerInfo.userId,
        channelId: playerInfo.channelId,
        guildId: playerInfo.guildId,
        guess: currentGuess,
        puzzleNumber,
      }),
    });

    const data = await res.json();

    if (!data.isValid) {
      showMessage(data.errorMessage || 'Mot inconnu');
      shakeRow(currentRow);
      return;
    }

    const colors = data.colors;
    guesses.push(currentGuess);
    allColors.push(colors);

    // Animer les tuiles
    await animateRow(currentRow, currentGuess, colors);

    // Mettre à jour le clavier
    for (let c = 0; c < MOT_LENGTH; c++) {
      updateKeyState(currentGuess[c], colors[c]);
    }
    updateKeyboardColors();

    if (data.won) {
      gameOver = true;
      showMessage('Bravo ! 🎉', true);
      bounceRow(currentRow);
      showStatsAfterDelay();
    } else if (data.gameOver) {
      gameOver = true;
      showMessage(`Le mot était : ${data.answer}`, true);
      showStatsAfterDelay();
    }

    currentRow++;
    currentCol = 0;
    currentGuess = '';
  } catch (err) {
    console.error('Erreur soumission:', err);
    showMessage('Erreur réseau');
  }
}

function animateRow(row, word, colors) {
  return new Promise((resolve) => {
    const tiles = [];
    for (let c = 0; c < MOT_LENGTH; c++) {
      tiles.push(getTile(row, c));
    }

    let i = 0;
    function flipNext() {
      if (i >= MOT_LENGTH) {
        resolve();
        return;
      }
      const tile = tiles[i];
      const color = colors[i];

      tile.classList.add('flip');

      setTimeout(() => {
        tile.classList.remove('active');
        tile.classList.add(color);
      }, 250);

      i++;
      setTimeout(flipNext, 300);
    }
    flipNext();
  });
}

function bounceRow(row) {
  for (let c = 0; c < MOT_LENGTH; c++) {
    const tile = getTile(row, c);
    setTimeout(() => {
      tile.classList.add('bounce');
    }, c * 100);
  }
}

function shakeRow(row) {
  const rowEl = document.querySelector(`.row[data-row="${row}"]`);
  rowEl.classList.add('shake');
  setTimeout(() => rowEl.classList.remove('shake'), 600);
}

function getTile(row, col) {
  return document.querySelector(`.tile[data-row="${row}"][data-col="${col}"]`);
}

function showMessage(text, persistent = false) {
  const bar = document.getElementById('message-bar');
  bar.textContent = text;
  bar.classList.add('visible');

  if (!persistent) {
    setTimeout(() => {
      bar.classList.remove('visible');
    }, 2000);
  }
}

function updateKeyState(letter, color) {
  const current = keyboardState[letter];
  const currentPriority = current ? (KEY_PRIORITY[current] || 0) : 0;
  const newPriority = KEY_PRIORITY[color] || 0;
  if (newPriority > currentPriority) {
    keyboardState[letter] = color;
  }
}

function updateKeyboardColors() {
  for (const [letter, color] of Object.entries(keyboardState)) {
    const keyEl = document.querySelector(`.key[data-key="${letter}"]`);
    if (keyEl) {
      keyEl.classList.remove('correct', 'present', 'absent');
      keyEl.classList.add(color);
    }
  }
}

function showStatsAfterDelay() {
  setTimeout(() => showStats(), 1500);
}

async function showStats() {
  try {
    const res = await fetch(`/api/stats?userId=${playerInfo.userId}`);
    const stats = await res.json();

    const modal = document.getElementById('stats-modal');
    const body = document.getElementById('stats-body');

    body.innerHTML = `
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-value">${stats.played}</div>
          <div class="stat-label">Jouées</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0}</div>
          <div class="stat-label">% Victoire</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stats.currentStreak}</div>
          <div class="stat-label">Série actuelle</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stats.maxStreak}</div>
          <div class="stat-label">Meilleure série</div>
        </div>
      </div>
      <h3>Répartition</h3>
      <div class="distribution">
        ${[1,2,3,4,5,6].map(n => {
          const count = stats.distribution[n] || 0;
          const maxCount = Math.max(1, ...Object.values(stats.distribution));
          const width = Math.max(8, (count / maxCount) * 100);
          const isCurrentRow = (guesses.length === n && allColors.length > 0 && allColors[allColors.length - 1].every(c => c === 'correct'));
          return `
            <div class="dist-row">
              <div class="dist-label">${n}</div>
              <div class="dist-bar ${isCurrentRow ? 'highlight' : ''}" style="width:${width}%">${count}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    // Share section
    if (gameOver) {
      const shareSection = document.getElementById('share-section');
      shareSection.classList.remove('hidden');
    }

    modal.classList.remove('hidden');

    // Close button
    document.getElementById('close-stats').onclick = () => {
      modal.classList.add('hidden');
    };

    // Share button
    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
      shareBtn.onclick = () => {
        const shareText = generateShareText();
        navigator.clipboard.writeText(shareText).then(() => {
          document.getElementById('share-copied').classList.remove('hidden');
          setTimeout(() => {
            document.getElementById('share-copied').classList.add('hidden');
          }, 2000);
        }).catch(() => {
          // Fallback si clipboard pas dispo dans iframe
          showMessage('Impossible de copier');
        });
      };
    }
  } catch (err) {
    console.error('Erreur stats:', err);
  }
}

function generateShareText() {
  const won = allColors.length > 0 && allColors[allColors.length - 1].every(c => c === 'correct');
  const score = won ? `${allColors.length}/6` : 'X/6';
  let text = `Wordle FR #${puzzleNumber} — ${score}\n\n`;

  for (const row of allColors) {
    text += row.map(c => {
      if (c === 'correct') return '🟩';
      if (c === 'present') return '🟨';
      return '⬛';
    }).join('') + '\n';
  }

  return text.trim();
}
