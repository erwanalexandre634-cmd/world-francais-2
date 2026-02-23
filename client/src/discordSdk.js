import { DiscordSDK } from "@discord/embedded-app-sdk";

let auth = null;
let discordSdk = null;

export async function setupDiscordSdk() {
  discordSdk = new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID);

  await discordSdk.ready();

  // Authorize
  const { code } = await discordSdk.commands.authorize({
    client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
    response_type: "code",
    state: "",
    prompt: "none",
    scope: ["identify"],
  });

  // Échanger le code contre un access_token via notre backend
  const response = await fetch("/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const { access_token } = await response.json();

  // Authentifier
  auth = await discordSdk.commands.authenticate({ access_token });

  return { auth, discordSdk };
}

export function getAuth() {
  return auth;
}

export function getSdk() {
  return discordSdk;
}
