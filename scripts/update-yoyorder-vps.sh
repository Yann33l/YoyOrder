#!/usr/bin/env bash
# Alias VPS : alias maj-yoyorder='bash /home/ubuntu/yoyOrder/scripts/update-yoyorder-vps.sh'
# Surcharges : PROJECT_DIR=/opt/yoyorder BRANCH=main bash scripts/update-yoyorder-vps.sh
set -Eeuo pipefail
umask 077
readonly PROJECT_DIR="${PROJECT_DIR:-$(dirname "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")")}"
readonly BACKUP_PARENT_DIR="${BACKUP_PARENT_DIR:-${PROJECT_DIR}_backups}"
readonly LOG_FILE="${LOG_FILE:-$BACKUP_PARENT_DIR/yoyorder_deploy.log}"
readonly BRANCH="${BRANCH:-feat/open-saas-clean}"
readonly COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
readonly HEALTH_TIMEOUT_SECONDS="${HEALTH_TIMEOUT_SECONDS:-300}"
readonly PROXY_CONTAINER="${PROXY_CONTAINER:-}"
readonly BACKUP_IDENTITY_FILE="${BACKUP_IDENTITY_FILE:-$HOME/.config/yoyorder/backup.agekey}"
MODE="${1:-update}"
OLD_REVISION=inconnue
NEW_REVISION=inconnue
BACKUP=aucune
case "$MODE" in
  update|--no-pull|--backup-only) ;;
  -h|--help) printf 'Usage: maj-yoyorder [--no-pull | --backup-only]\n'; exit 0 ;;
  *) printf 'Argument inconnu : %s\n' "$MODE" >&2; exit 2 ;;
esac
fail() { printf 'ERREUR : %s\n' "$*" >&2; exit 1; }
[[ "$HEALTH_TIMEOUT_SECONDS" =~ ^[1-9][0-9]*$ ]] || fail 'HEALTH_TIMEOUT_SECONDS doit être un entier positif.'
for tool in docker flock readlink tee; do
  command -v "$tool" >/dev/null || fail "Commande manquante : $tool"
done
mkdir -p "$BACKUP_PARENT_DIR" "$(dirname "$LOG_FILE")"
exec 9>"$BACKUP_PARENT_DIR/.deploy.lock"
flock -n 9 || fail 'Un autre déploiement ou sauvegarde YoyOrder est déjà en cours.'
touch "$LOG_FILE"
exec > >(tee -a "$LOG_FILE") 2>&1
on_error() {
  local code=$?
  printf 'ERREUR : déploiement interrompu à la ligne %s (code %s).\n' "$1" "$code"
  printf 'Ancienne révision : %s\nRévision visée : %s\nSauvegarde : %s\nJournal : %s\n' "$OLD_REVISION" "$NEW_REVISION" "$BACKUP" "$LOG_FILE"
  printf 'La base ne sera pas restaurée automatiquement : vérifier la compatibilité des migrations avant tout retour arrière.\n'
  exit "$code"
}
trap 'on_error $LINENO' ERR
printf '\nDébut du déploiement : %s\n' "$(date '+%Y-%m-%d %H:%M:%S %Z')"
cd "$PROJECT_DIR"
[[ -f "$COMPOSE_FILE" ]] || fail "Fichier Compose introuvable : $COMPOSE_FILE"
[[ -f .env.production && -f .env.production.server ]] || fail 'Créer .env.production et .env.production.server depuis les exemples.'
COMPOSE=(docker compose --project-name yoyorder --env-file "$PROJECT_DIR/.env.production" -f "$COMPOSE_FILE")
"${COMPOSE[@]}" version >/dev/null
docker info >/dev/null
"${COMPOSE[@]}" config --quiet

backup() {
  local db_id identity_path project_path backup_path recipient
  for tool in age age-keygen stat id; do
    command -v "$tool" >/dev/null || fail "Commande manquante pour le chiffrement : $tool"
  done
  [[ -f "$BACKUP_IDENTITY_FILE" && -r "$BACKUP_IDENTITY_FILE" ]] || fail "Clé de sauvegarde absente ou illisible : $BACKUP_IDENTITY_FILE (voir le guide de production)."
  identity_path="$(readlink -f "$BACKUP_IDENTITY_FILE")"
  project_path="$(readlink -f "$PROJECT_DIR")"
  backup_path="$(readlink -f "$BACKUP_PARENT_DIR")"
  case "$identity_path" in
    "$project_path"/*|"$backup_path"/*) fail 'Conserver la clé hors du dépôt et du dossier de sauvegardes.' ;;
  esac
  [[ "$(stat -c %u "$identity_path")" == "$(id -u)" ]] || fail 'La clé doit appartenir au compte de déploiement.'
  case "$(stat -c %a "$identity_path")" in
    400|600) ;;
    *) fail 'La clé doit avoir les permissions 600 ou 400.' ;;
  esac
  # Clé dédiée non protégée par passphrase : aucun prompt pendant le déploiement.
  recipient="$(age-keygen -y "$identity_path")"
  [[ "$recipient" =~ ^age1[a-z0-9]+$ ]] || fail 'Utiliser une seule clé native age dans le fichier identité.'
  db_id="$("${COMPOSE[@]}" ps --all --quiet postgres)"
  [[ -n "$db_id" ]] || fail 'Conteneur PostgreSQL introuvable.'
  [[ "$(docker inspect -f '{{.State.Health.Status}}' "$db_id")" == healthy ]] || fail 'PostgreSQL doit être sain avant la sauvegarde.'
  BACKUP="$BACKUP_PARENT_DIR/yoyorder-$(date -u +%Y%m%dT%H%M%SZ)-$$.dump.age"
  printf 'Sauvegarde PostgreSQL chiffrée : %s\n' "$BACKUP"
  (
    umask 077
    "${COMPOSE[@]}" exec -T postgres sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
      | age --encrypt --recipient "$recipient" > "$BACKUP.partial"
    [[ -s "$BACKUP.partial" ]] || fail 'Sauvegarde vide ; déploiement interrompu.'
    # Déchiffrer uniquement en flux. Drainer le flux après pg_restore pour vérifier
    # aussi l'authenticité de la fin du fichier, sans SIGPIPE sur les grosses bases.
    age --decrypt --identity "$identity_path" "$BACKUP.partial" \
      | "${COMPOSE[@]}" exec -T postgres sh -c 'set -e; pg_restore --list >/dev/null; cat >/dev/null'
    mv "$BACKUP.partial" "$BACKUP"
  )
  printf 'Archive chiffrée créée, déchiffrement intégral et structure vérifiés.\n'
}
if [[ "$MODE" == --backup-only ]]; then
  backup
  exit 0
fi
for tool in git wasp npm node; do
  command -v "$tool" >/dev/null || fail "Commande manquante : $tool"
done
git rev-parse --git-dir >/dev/null
OLD_REVISION="$(git rev-parse HEAD)"
NEW_REVISION="$OLD_REVISION"
if [[ "$MODE" == update ]]; then
  [[ -z "$(git status --porcelain)" ]] || fail 'Le dépôt contient des modifications locales ; les conserver ou utiliser --no-pull.'
  printf 'Récupération de origin/%s...\n' "$BRANCH"
  # Référence explicite : ne pas dépendre de la branche suivie sur le VPS.
  git fetch origin "refs/heads/$BRANCH:refs/remotes/origin/$BRANCH"
  NEW_REVISION="$(git rev-parse "refs/remotes/origin/$BRANCH")"
  if [[ "$OLD_REVISION" == "$NEW_REVISION" ]]; then
    printf 'Application déjà à jour (%s). Pour redéployer : maj-yoyorder --no-pull\n' "$OLD_REVISION"
    exit 0
  fi
  git merge-base --is-ancestor "$OLD_REVISION" "$NEW_REVISION" || fail "La révision locale a divergé de origin/$BRANCH ; intervention manuelle requise."
fi

# Sauvegarder l'installation existante AVANT de changer son code/configuration.
db_id="$("${COMPOSE[@]}" ps --all --quiet postgres)"
if [[ -n "$db_id" ]]; then
  server_id="$("${COMPOSE[@]}" ps --all --quiet server)"
  [[ -n "$server_id" ]] || fail 'Serveur absent : vérifier manuellement l’installation existante.'
  [[ "$(docker inspect -f '{{.State.Health.Status}}' "$server_id")" == healthy ]] || fail 'Le serveur doit être sain avant le déploiement.'
  backup
elif [[ "$MODE" == update ]]; then
  fail 'Installation absente : utiliser --no-pull pour le premier déploiement.'
fi
# Les nouveaux fichiers suivis et les artefacts statiques doivent être lisibles par nginx.
umask 022
if [[ "$MODE" == update ]]; then
  git merge --ff-only "$NEW_REVISION"
fi
"${COMPOSE[@]}" config --quiet
[[ -d app/migrations ]] && find app/migrations -name migration.sql -print -quit | grep -q . \
  || fail 'Migrations absentes : générer et versionner wasp db migrate-dev en développement avant le déploiement.'
WASP_SERVER_URL="$("${COMPOSE[@]}" config --format json | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>process.stdout.write(JSON.parse(s).services.server.environment.WASP_SERVER_URL));')"
printf 'Compilation Wasp et interface...\n'
(
  cd app
  wasp version | grep -Eq '0\.25\.' || fail 'Installer Wasp 0.25.x, comme déclaré dans main.wasp.ts.'
  wasp install
  wasp build
  REACT_APP_API_URL="$WASP_SERVER_URL" npx --no-install vite build
)
[[ -f app/.wasp/out/Dockerfile && -f app/.wasp/out/web-app/build/200.html ]] || fail 'Artefacts Wasp manquants.'
# Corriger aussi d'éventuels artefacts créés précédemment avec umask 077.
chmod -R a+rX app/.wasp/out/web-app/build
"${COMPOSE[@]}" build server web
"${COMPOSE[@]}" up -d --wait --wait-timeout "$HEALTH_TIMEOUT_SECONDS" postgres
# Au premier lancement, sauvegarder la base initiale avant ses premières migrations.
if [[ "$BACKUP" == aucune ]]; then backup; fi
printf 'Démarrage des services et migrations Wasp...\n'
if ! "${COMPOSE[@]}" up -d --remove-orphans --wait --wait-timeout "$HEALTH_TIMEOUT_SECONDS"; then
  "${COMPOSE[@]}" logs --tail=100 server web postgres || true
  fail "Déploiement échoué. Sauvegarde : $BACKUP ; journal : $LOG_FILE"
fi
if [[ -n "$PROXY_CONTAINER" ]]; then
  [[ "$(docker inspect -f '{{.State.Running}}' "$PROXY_CONTAINER")" == true ]] || fail "Proxy arrêté : $PROXY_CONTAINER"
fi
"${COMPOSE[@]}" ps
printf 'Déploiement terminé : %s\nRévision déployée : %s\nSauvegarde : %s\n' "$(date '+%Y-%m-%d %H:%M:%S %Z')" "$NEW_REVISION" "$BACKUP"
