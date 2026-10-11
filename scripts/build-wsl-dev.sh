#!/usr/bin/env bash
set -Eeuo pipefail
cd /workspace/app
[[ "$DATABASE_URL" == *'@postgres:5432/yoyorder_wsl_test' ]] || { echo 'Base locale inattendue.' >&2; exit 1; }
# La commande db de Wasp lit la connexion dans .env.server.
if grep -q '^DATABASE_URL=' .env.server; then
  [[ "$(sed -n 's/^DATABASE_URL=//p' .env.server | tail -1)" == "$DATABASE_URL" ]] \
    || { echo 'Le fichier .env.server cible une autre base ; corriger sa connexion locale.' >&2; exit 1; }
else
  printf '\nDATABASE_URL=%s\n' "$DATABASE_URL" >> .env.server
fi
chmod 600 .env.server
# Adapter uniquement la copie Linux : SMTP vers Mailpit pour les e-mails de test.
node --input-type=module <<'JS'
import fs from 'node:fs';
const file = 'src/server/emailSender.wasp.ts';
const content = fs.readFileSync(file, 'utf8');
fs.writeFileSync(file, content.replace(/provider:\s*"[^"]+"/, 'provider: "SMTP"'));
JS
wasp version
wasp build
# La détection de DB de la CLI Wasp ne fonctionne pas dans ce conteneur sans
# daemon Docker. Prisma accède directement à la base du réseau Compose.
# Migrations créées uniquement dans la copie Linux ; aucun reset forcé.
npx --no-install prisma migrate dev --schema .wasp/out/db/schema.prisma --name wsl-local
mkdir -p migrations
if [[ "$(realpath .wasp/out/db/migrations)" != "$(realpath migrations)" ]]; then
  cp -a .wasp/out/db/migrations/. migrations/
fi
# Inclure les migrations générées dans l'image serveur produite par Wasp.
wasp build
node /workspace/scripts/prepare-wsl-client.cjs
REACT_APP_API_URL=http://localhost:3083 npx --no-install vite build
chmod -R a+rX .wasp/out/web-app/build
node /workspace/scripts/prepare-wsl-server.cjs
