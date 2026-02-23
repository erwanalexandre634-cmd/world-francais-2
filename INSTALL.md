# Guide d'installation — Wordle FR (Discord Activity)

Ce guide explique pas à pas comment configurer et déployer l'application Discord Activity "Wordle FR".

---

## Partie 1 : Créer l'application Discord

### Étape 1 — Créer l'application

1. Va sur https://discord.com/developers/applications
2. Clique sur **"New Application"** (bouton bleu en haut à droite)
3. Nomme l'application **"Wordle FR"** → clique **"Create"**

### Étape 2 — Récupérer les identifiants

1. Sur la page **General Information** :
   - Copie le **Application ID** (c'est ton `VITE_DISCORD_CLIENT_ID`)
   - Note-le quelque part

2. Va dans **OAuth2** (menu à gauche) :
   - Clique sur **"Reset Secret"** pour générer un secret
   - Copie le **Client Secret** (c'est ton `DISCORD_CLIENT_SECRET`)
   - ⚠️ **Note-le immédiatement**, tu ne pourras plus le revoir !

3. Toujours dans **OAuth2** → **Redirects** :
   - Clique **"Add Redirect"**
   - Ajoute : `https://127.0.0.1`
   - Clique **"Save Changes"**

### Étape 3 — Configurer les contextes d'installation

1. Va dans **Installation** (menu à gauche)
2. Sous **Installation Contexts** :
   - ✅ Coche **User Install**
   - ✅ Coche **Guild Install**
   - ⚠️ **C'est crucial** — sans User Install, l'app ne marchera pas dans les DM et Group Chats
3. Sous **Default Install Settings** :
   - **User Install** → Ajoute le scope : `applications.commands`
   - **Guild Install** → Ajoute les scopes : `applications.commands` et `bot`
4. Clique **"Save Changes"**

### Étape 4 — Activer les Activities

1. Va dans **Activities** (menu à gauche)
2. Sous **Activities** → **Settings** :
   - Active **"Enable Activities"** → switch sur ON
   - Discord crée automatiquement une commande "Launch" (Entry Point)

### Étape 5 — Configurer les URL Mappings

1. Va dans **Activities** → **URL Mappings**
2. Dans **Root Mapping** (`/`) :
   - En développement : mets l'URL de ton tunnel cloudflared (ex: `https://funky-bunny.trycloudflare.com`)
   - En production : mets l'URL de ton serveur (ex: `http://164.92.245.185` ou `https://ton-domaine.com`)
3. Clique **"Save Changes"**

### Étape 6 — Installer l'application

1. Va dans **Installation** (menu à gauche)
2. Copie le **Install Link** affiché en haut
3. Ouvre ce lien dans ton navigateur
4. Choisis d'installer l'app :
   - Sur **ton compte** (User Install) — pour les DM/GC
   - Sur **un serveur** (Guild Install) — pour les salons du serveur
5. Autorise l'installation

---

## Partie 2 : Développement local

### Prérequis

- **Node.js 18+** installé (vérifie avec `node -v`)
- **npm** installé (vérifie avec `npm -v`)

### Installation du projet

```bash
# Aller dans le dossier du projet
cd wordle-fr-activity

# Créer le fichier .env à la racine
# (remplace les valeurs par tes identifiants Discord)
cat > .env << 'EOF'
VITE_DISCORD_CLIENT_ID=ton_client_id_ici
DISCORD_CLIENT_SECRET=ton_client_secret_ici
PORT=3001
EOF

# Installer les dépendances du client
cd client
npm install
cd ..

# Installer les dépendances du serveur
cd server
npm install
cd ..
```

### Lancer en développement

Tu as besoin de **3 terminaux** :

**Terminal 1 — Serveur backend :**
```bash
cd server
npm run dev
# → Le serveur démarre sur http://localhost:3001
```

**Terminal 2 — Client frontend :**
```bash
cd client
npm run dev
# → Vite démarre sur http://localhost:5173
# → Le proxy Vite redirige /api vers localhost:3001
```

**Terminal 3 — Tunnel cloudflared :**
```bash
# Installer cloudflared (une seule fois)
# Sur Ubuntu/Debian :
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared
sudo mv cloudflared /usr/local/bin/

# Sur macOS :
brew install cloudflared

# Lancer le tunnel (pointe vers le port Vite)
cloudflared tunnel --url http://localhost:5173
```

Cloudflared affiche une URL du type `https://funky-bunny.trycloudflare.com`.
→ **Copie cette URL** et colle-la dans le Developer Portal :
  **Activities → URL Mappings → Root Mapping**
→ Sauvegarde.

### Tester

1. Ouvre Discord (application desktop ou navigateur)
2. Va dans un salon de serveur (ou un DM/GC)
3. Clique sur l'**App Launcher** (icône fusée/manette 🚀 dans la barre de chat)
4. Tu devrais voir **"Wordle FR"** → clique dessus
5. L'Activity s'ouvre dans un iframe → le jeu se charge !

---

## Partie 3 : Déploiement en production (VPS)

### Se connecter au VPS

```bash
ssh root@164.92.245.185
```

### Installer Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # Vérifie : v20.x.x
npm -v    # Vérifie : 10.x.x
```

### Installer les outils nécessaires

```bash
sudo apt-get install -y build-essential python3 git nginx
```

### Déployer le projet

```bash
# Créer le dossier
mkdir -p /opt/wordle-fr-activity

# Copier les fichiers (depuis ta machine locale)
# Option 1 : git clone
cd /opt
git clone <url-de-ton-repo> wordle-fr-activity

# Option 2 : scp depuis ta machine locale
# (depuis ta machine locale :)
# scp -r ./wordle-fr-activity root@164.92.245.185:/opt/

cd /opt/wordle-fr-activity

# Créer le .env
nano .env
# Coller :
# VITE_DISCORD_CLIENT_ID=ton_client_id
# DISCORD_CLIENT_SECRET=ton_secret
# PORT=3001

# Installer et builder le client
cd client
npm install
npm run build
cd ..

# Installer les dépendances du serveur
cd server
npm install
cd ..
```

### Lancer avec PM2 (process manager)

```bash
# Installer PM2 globalement
npm install -g pm2

# Lancer le serveur
cd /opt/wordle-fr-activity/server
pm2 start server.js --name wordle-fr

# Sauvegarder la config PM2 (redémarre auto après reboot)
pm2 save
pm2 startup
# → Exécute la commande affichée par pm2 startup
```

### Configurer Nginx (reverse proxy)

```bash
# Créer la config Nginx
nano /etc/nginx/sites-available/wordle-fr
```

Coller ce contenu :

```nginx
server {
    listen 80;
    server_name 164.92.245.185;  # Remplace par ton domaine si tu en as un

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
# Activer le site
ln -s /etc/nginx/sites-available/wordle-fr /etc/nginx/sites-enabled/

# Supprimer le site par défaut (optionnel)
rm -f /etc/nginx/sites-enabled/default

# Tester la config
nginx -t

# Redémarrer Nginx
systemctl restart nginx
```

### Mettre à jour les URL Mappings Discord

Va dans le Developer Portal :
→ **Activities → URL Mappings → Root Mapping**
→ Mets : `http://164.92.245.185` (ou `https://ton-domaine.com` si tu as un domaine)
→ Sauvegarde

### (Optionnel) Ajouter HTTPS avec un domaine

Si tu as un nom de domaine pointant vers ton VPS :

```bash
# Installer Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Obtenir un certificat SSL
sudo certbot --nginx -d ton-domaine.com

# Le renouvellement est automatique
```

Puis dans les URL Mappings, mets `https://ton-domaine.com`.

---

## Commandes utiles

### Logs du serveur
```bash
pm2 logs wordle-fr
```

### Redémarrer le serveur
```bash
pm2 restart wordle-fr
```

### Mettre à jour le code
```bash
cd /opt/wordle-fr-activity
git pull

# Rebuilder le client si nécessaire
cd client && npm run build && cd ..

# Redémarrer le serveur
pm2 restart wordle-fr
```

### Voir l'état des processus
```bash
pm2 status
```

---

## Dépannage

### L'Activity ne se lance pas
- Vérifie que **Activities** est activé dans le Developer Portal
- Vérifie que l'**URL Mapping** pointe vers la bonne adresse
- Vérifie que le serveur tourne (`pm2 status`)

### "Erreur de connexion" dans l'Activity
- Vérifie que le `VITE_DISCORD_CLIENT_ID` dans le `.env` correspond à ton Application ID
- Vérifie que le `DISCORD_CLIENT_SECRET` est correct
- Vérifie que la Redirect URI `https://127.0.0.1` est bien ajoutée dans OAuth2

### L'app n'apparaît pas dans les DM/Group Chats
- Vérifie que **User Install** est coché dans Installation
- Réinstalle l'app via le Install Link sur ton compte personnel

### "Mot inconnu" pour tous les mots
- Vérifie que les fichiers `mots-solutions.txt` et `mots-acceptes.txt` existent dans `server/data/`
- Vérifie qu'ils contiennent des mots en MAJUSCULES, 5 lettres, un par ligne

### Le serveur crash avec "better-sqlite3"
- Assure-toi que `build-essential` et `python3` sont installés
- Relance `npm install` dans le dossier `server/`
