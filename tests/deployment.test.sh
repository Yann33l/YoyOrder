#!/usr/bin/env bash
# Tests du déroulement du déploiement avec Git/Docker/Wasp simulés.
# Aucun accès au réseau, au dépôt réel ou au moteur Docker.
set -Eeuo pipefail
SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/scripts/update-yoyorder-vps.sh"
TEST_ROOT="$(mktemp -d)"
export PROJECT_DIR="$TEST_ROOT/project" BACKUP_PARENT_DIR="$TEST_ROOT/backups"
export CALLS="$TEST_ROOT/calls"
export BACKUP_IDENTITY_FILE="$TEST_ROOT/backup.agekey"
touch "$BACKUP_IDENTITY_FILE"
chmod 600 "$BACKUP_IDENTITY_FILE"
mkdir -p "$PROJECT_DIR/app/migrations/initial" "$PROJECT_DIR/app/.wasp/out/web-app/build"
touch "$PROJECT_DIR/.env.production" "$PROJECT_DIR/.env.production.server" "$PROJECT_DIR/docker-compose.yml"
touch "$PROJECT_DIR/app/migrations/initial/migration.sql" "$PROJECT_DIR/app/.wasp/out/Dockerfile" "$PROJECT_DIR/app/.wasp/out/web-app/build/200.html"
git() {
  printf 'git %s\n' "$*" >> "$CALLS"
  case "$1" in
    rev-parse)
      case "$2" in
        --git-dir) echo .git ;;
        HEAD) echo old ;;
        *) if [[ "$SCENARIO" == current ]]; then echo old; else echo new; fi ;;
      esac ;;
    status) [[ "$SCENARIO" != dirty ]] || echo ' M changed.ts' ;;
    merge-base) [[ "$SCENARIO" != diverged ]]; return $? ;;
  esac
  return 0
}
docker() {
  printf 'docker %s\n' "$*" >> "$CALLS"
  if [[ "$1" == inspect ]]; then
    if [[ "$SCENARIO" == unhealthy ]]; then echo unhealthy; else echo healthy; fi
  elif [[ "$*" == *'ps --all --quiet postgres'* ]]; then
    echo db-id
  elif [[ "$*" == *'ps --all --quiet server'* ]]; then
    echo server-id
  elif [[ "$*" == *pg_dump* ]]; then
    [[ "$SCENARIO" != backup_failed ]] || return 1
    echo simulated-dump
  elif [[ "$*" == *pg_restore* ]]; then
    cat >/dev/null
    [[ "$SCENARIO" != restore_failed ]] || return 1
  elif [[ "$*" == *'config --format json'* ]]; then
    echo '{}'
  elif [[ "$*" == *'up -d --remove-orphans'* && "$SCENARIO" == startup_failed ]]; then
    return 1
  fi
  return 0
}
wasp() { printf 'wasp %s\n' "$*" >> "$CALLS"; [[ "$1" != version ]] || echo 'Wasp 0.25.0'; }
npm() { return 0; }
npx() { printf 'npx %s\n' "$*" >> "$CALLS"; }
node() { cat >/dev/null; echo https://api-order.example.fr; }
flock() { return 0; }
age-keygen() {
  if [[ "${REAL_CRYPTO:-0}" == 1 ]]; then command age-keygen "$@"; else printf 'age1mockrecipient\n'; fi
}
age() {
  printf 'age %s\n' "$*" >> "$CALLS"
  if [[ "${REAL_CRYPTO:-0}" == 1 ]]; then command age "$@"; return $?; fi
  if [[ "$1" == --encrypt ]]; then
    echo 'mock-encrypted-header'
    cat
    [[ "$SCENARIO" != encryption_failed ]] || return 1
  else
    tail -n +2 "${@: -1}"
    # Simuler une erreur d'authenticité après avoir émis tout le contenu.
    [[ "$SCENARIO" != decryption_failed ]] || return 1
  fi
}
stat() {
  if [[ "$(uname -s)" != Linux && "${@: -1}" == "$BACKUP_IDENTITY_FILE" ]]; then
    if [[ "$2" == %u ]]; then id -u; else echo 600; fi
  else
    command stat "$@"
  fi
}
export -f git docker wasp npm npx node flock age age-keygen stat

run_case() {
  export SCENARIO="$1"
  if [[ "$SCENARIO" == missing_key ]]; then
    export BACKUP_IDENTITY_FILE="$TEST_ROOT/absent.agekey"
  else
    export BACKUP_IDENTITY_FILE="$TEST_ROOT/backup.agekey"
  fi
  : > "$CALLS"
  local result=0
  bash "$SCRIPT" > "$TEST_ROOT/output-$SCENARIO" 2>&1 || result=$?
  if [[ "$2" == success ]]; then
    [[ "$result" == 0 ]] || { cat "$TEST_ROOT/output-$SCENARIO"; exit 1; }
  else
    [[ "$result" != 0 ]] || { echo "Échec attendu : $SCENARIO"; exit 1; }
  fi
  case "$SCENARIO" in
    current|dirty|diverged|unhealthy|backup_failed|missing_key|encryption_failed|decryption_failed|restore_failed)
      ! grep -q '^git merge --ff-only' "$CALLS"
      ! grep -q 'up -d' "$CALLS"
      [[ -z "$(find "$BACKUP_PARENT_DIR" -name '*.dump.age')" ]] ;;
    deployed|startup_failed)
      local dump_line merge_line
      dump_line="$(grep -n pg_dump "$CALLS" | head -1 | cut -d: -f1)"
      merge_line="$(grep -n '^git merge --ff-only' "$CALLS" | cut -d: -f1)"
      [[ "$dump_line" -lt "$merge_line" ]]
      grep -q '^age --decrypt' "$CALLS"
      # Aucune archive finale acceptée lors des scénarios précédents en échec.
      [[ "$(find "$BACKUP_PARENT_DIR" -name '*.dump.age' | wc -l)" -ge 1 ]]
      [[ -z "$(find "$BACKUP_PARENT_DIR" -name '*.dump')" ]]
      # Les permissions POSIX ne sont pas représentées fidèlement sur Windows.
      if [[ "$(uname -s)" == Linux ]]; then
        [[ "$(stat -c %a "$BACKUP_PARENT_DIR"/*.dump.age | head -1)" == 600 ]]
        [[ "$(stat -c %a "$PROJECT_DIR/app/.wasp/out/web-app/build/200.html")" == 644 ]]
      fi ;;
  esac
  printf 'OK : %s\n' "$SCENARIO"
}
run_case current success
run_case dirty failure
run_case diverged failure
run_case unhealthy failure
run_case backup_failed failure
run_case missing_key failure
run_case encryption_failed failure
run_case decryption_failed failure
run_case restore_failed failure
run_case deployed success
run_case startup_failed failure
if [[ "${TEST_REAL_AGE:-0}" == 1 ]]; then
  mv "$TEST_ROOT/backup.agekey" "$TEST_ROOT/mock-key"
  command age-keygen -o "$TEST_ROOT/backup.agekey" 2>/dev/null
  chmod 600 "$TEST_ROOT/backup.agekey"
  export REAL_CRYPTO=1
  run_case deployed success
  # L'archive réelle est opaque et peut être déchiffrée avec la clé dédiée.
  REAL_ARCHIVE="$(find "$BACKUP_PARENT_DIR" -name '*.dump.age' | sort | tail -1)"
  command age --decrypt --identity "$TEST_ROOT/backup.agekey" "$REAL_ARCHIVE" | grep -qx simulated-dump
  ! grep -aq simulated-dump "$REAL_ARCHIVE"
  head -c -1 "$REAL_ARCHIVE" > "$TEST_ROOT/truncated.dump.age"
  if command age --decrypt --identity "$TEST_ROOT/backup.agekey" "$TEST_ROOT/truncated.dump.age" >/dev/null 2>&1; then
    echo 'Une archive tronquée ne doit pas être acceptée.'
    exit 1
  fi
  printf 'OK : chiffrement/déchiffrement age réel\n'
  printf 'OK : rejet réel d’une archive tronquée\n'
fi
printf 'Artefacts de test : %s\n' "$TEST_ROOT"
