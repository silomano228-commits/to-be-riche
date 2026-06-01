#!/bin/bash
# ==============================================
# 🚀 Script de déploiement Be Rich - Serveur LWS
# ==============================================
# Utilisation: bash deploy.sh
# Prérequis: Node.js 20+, PM2, Nginx
# ==============================================

set -e

# Configuration
APP_NAME="be-rich"
APP_DIR="/var/www/be-rich"
APP_PORT=3000
DOMAIN="votre-domaine.com"  # <-- REMPLACEZ PAR VOTRE DOMAINE
REPO_URL=""                 # <-- REMPLACEZ PAR VOTRE URL GIT (si applicable)

echo "🚀 Déploiement de Be Rich sur le serveur LWS..."
echo "================================================"

# ----- Étape 1: Installer les prérequis si nécessaire -----
echo ""
echo "📦 Vérification des prérequis..."

if ! command -v node &> /dev/null; then
    echo "⚙️ Installation de Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

if ! command -v pm2 &> /dev/null; then
    echo "⚙️ Installation de PM2..."
    sudo npm install -g pm2
fi

echo "✅ Node.js $(node -v) | PM2 $(pm2 -v)"

# ----- Étape 2: Préparer le dossier de l'app -----
echo ""
echo "📁 Préparation du dossier..."

sudo mkdir -p $APP_DIR
sudo mkdir -p $APP_DIR/db
sudo mkdir -p $APP_DIR/logs
sudo chown -R $USER:$USER $APP_DIR

# ----- Étape 3: Copier les fichiers -----
echo ""
echo "📋 Copie des fichiers du projet..."

# Si vous avez un dépôt Git:
# if [ ! -d "$APP_DIR/.git" ]; then
#     git clone $REPO_URL $APP_DIR
# fi
# cd $APP_DIR && git pull origin main

# Sinon, copiez les fichiers depuis votre machine locale:
# scp -r ./dist/* user@votre-serveur:$APP_DIR/
echo "⚠️  Assurez-vous d'avoir copié les fichiers du projet dans $APP_DIR"
echo "   Vous pouvez utiliser: rsync -avz --exclude node_modules --exclude .next ./ user@serveur:$APP_DIR/"

cd $APP_DIR

# ----- Étape 4: Installer les dépendances -----
echo ""
echo "📦 Installation des dépendances..."
npm install

# ----- Étape 5: Configurer la base de données -----
echo ""
echo "🗄️ Configuration de la base de données SQLite..."

# Créer le fichier .env pour la production
cat > .env << 'EOF'
DATABASE_URL=file:/var/www/be-rich/db/production.db
EOF

# Générer le client Prisma
npx prisma generate

# Créer les tables si nécessaire
npx prisma db push

echo "✅ Base de données prête"

# ----- Étape 6: Builder l'application -----
echo ""
echo "🔨 Build de l'application..."
npm run build

echo "✅ Build terminé"

# ----- Étape 7: Copier les fichiers statiques -----
echo ""
echo "📂 Copie des fichiers statiques pour standalone..."

# Next.js standalone a besoin de certains dossiers copiés manuellement
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static

# Copier les fichiers Prisma nécessaires
mkdir -p .next/standalone/prisma
cp prisma/schema.prisma .next/standalone/prisma/
cp -r node_modules/.prisma .next/standalone/node_modules/

echo "✅ Fichiers statiques copiés"

# ----- Étape 8: Configurer PM2 -----
echo ""
echo "⚙️ Configuration de PM2..."

# Copier la config PM2
cp ecosystem.config.js .next/standalone/ 2>/dev/null || true

# Démarrer/redémarrer avec PM2
cd .next/standalone
pm2 delete $APP_NAME 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo "✅ Application démarrée avec PM2"

# ----- Étape 9: Configurer Nginx -----
echo ""
echo "🌐 Configuration de Nginx..."

NGINX_CONF="/etc/nginx/sites-available/$APP_NAME"

if [ ! -f "$NGINX_CONF" ]; then
    echo "⚙️ Création de la config Nginx..."
    sudo tee $NGINX_CONF > /dev/null << NGINXEOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
NGINXEOF

    sudo ln -sf $NGINX_CONF /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx
    echo "✅ Nginx configuré"
else
    echo "✅ Nginx déjà configuré"
fi

# ----- Étape 10: SSL avec Let's Encrypt -----
echo ""
echo "🔒 Configuration SSL (optionnel)..."
if command -v certbot &> /dev/null; then
    echo "Pour activer le SSL, exécutez:"
    echo "  sudo certbot --nginx -d $DOMAIN"
else
    echo "Pour installer Let's Encrypt:"
    echo "  sudo apt install certbot python3-certbot-nginx"
    echo "  sudo certbot --nginx -d $DOMAIN"
fi

# ----- Terminé! -----
echo ""
echo "================================================"
echo "🎉 DÉPLOIEMENT TERMINÉ!"
echo "================================================"
echo ""
echo "📊 Statut de l'application:"
pm2 status $APP_NAME
echo ""
echo "🔗 URL: http://$DOMAIN"
echo "📂 Dossier: $APP_DIR"
echo "🗄️ Base de données: $APP_DIR/db/production.db"
echo "📋 Logs: pm2 logs $APP_NAME"
echo "🔄 Redémarrer: pm2 restart $APP_NAME"
echo ""
