import { setupDiscordSdk } from './discordSdk.js';
import { initGame } from './game.js';
import './style.css';

document.querySelector('#app').innerHTML = `
  <div id="loading">
    <div class="loading-spinner"></div>
    <p>Chargement...</p>
  </div>
  <div id="game-container" style="display:none;"></div>
`;

async function main() {
  try {
    const { auth, discordSdk } = await setupDiscordSdk();

    const user = auth.user;
    const channelId = discordSdk.channelId;
    const guildId = discordSdk.guildId; // null en DM/GC

    document.getElementById('loading').style.display = 'none';
    document.getElementById('game-container').style.display = 'flex';

    initGame({
      userId: user.id,
      username: user.username,
      avatar: user.avatar,
      channelId,
      guildId,
    });
  } catch (error) {
    console.error("Erreur d'initialisation:", error);
    document.querySelector('#app').innerHTML = `
      <div class="error">
        <h2>Erreur de connexion</h2>
        <p>Impossible de se connecter à Discord. Réessayez.</p>
      </div>
    `;
  }
}

main();
