Stremio Letterboxd Watchlist Addon

Ce projet est un addon Stremio qui récupère votre watchlist Letterboxd et l'affiche comme un catalogue natif via un tunnel sécurisé.

📋 Prérequis (Système Debian)

Node.js (v22.20.0 recommandé)

Cloudflared (Indispensable pour le tunnel HTTPS) :

# Téléchargement et installation du binaire
curl -L --output cloudflared.deb [https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb](https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb)
sudo dpkg -i cloudflared.deb


🛠️ Configuration et Lancement

1. Installation des dépendances Node.js

npm install


2. Démarrage du serveur local

Lancez le serveur backend (il écoute sur le port 7000 par défaut) :

npm run dev:backend


3. Activation du tunnel Cloudflare

Dans un second terminal, lancez le tunnel pour obtenir une URL publique sécurisée :

cloudflared tunnel --url http://localhost:7000


📺 Installation Stremio

Copiez l'URL générée par le tunnel (ex: https://votre-tunnel.trycloudflare.com).

Ajoutez /manifest.json à la fin.

Collez ce lien dans la barre de recherche d'addons de Stremio.

⚙️ Notes Techniques

Serveur : HTTP simple sur le port 7000 (le tunnel gère le SSL).

Cache : Désactivé (cacheMaxAge: 0) pour forcer la mise à jour de movies.json à chaque requête.