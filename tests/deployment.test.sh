#!/usr/bin/env bash
# Tests du déroulement du déploiement avec Git/Docker/Wasp simulés.
# Aucun accès au réseau, au dépôt réel ou au moteur Docker.
set -Eeuo pipefail
SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/scripts/update-yoyorder-vps.sh"
TEST_ROOT="$(mktemp -d)"
export PROJECT_DIR="$TEST_ROOT/project" BACKUP_PARENT_DIR="$TEST_ROOT/backups"
export CALLS="$TEST_ROOT/calls"
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
export -f git docker wasp npm npx node flock

run_case() {
  export SCENARIO="$1"
  : > "$CALLS"
  local result=0
  bash "$SCRIPT" > "$TEST_ROOT/output-$SCENARIO" 2>&1 || result=$?
  if [[ "$2" == success ]]; then
    [[ "$result" == 0 ]] || { cat "$TEST_ROOT/output-$SCENARIO"; exit 1; }
  else
    [[ "$result" != 0 ]] || { echo "Échec attendu : $SCENARIO"; exit 1; }
  fi
  case "$SCENARIO" in
    current|dirty|diverged|unhealthy|backup_failed)
      ! grep -q '^git merge --ff-only' "$CALLS"
      ! grep -q 'up -d' "$CALLS" ;;
    deployed|startup_failed)
      local dump_line merge_line
      dump_line="$(grep -n pg_dump "$CALLS" | head -1 | cut -d: -f1)"
      merge_line="$(grep -n '^git merge --ff-only' "$CALLS" | cut -d: -f1)"
      [[ "$dump_line" -lt "$merge_line" ]]
      # Les permissions POSIX ne sont pas représentées fidèlement sur Windows.
      if [[ "$(uname -s)" == Linux ]]; then
        [[ "$(stat -c %a "$BACKUP_PARENT_DIR"/*.dump | head -1)" == 600 ]]
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
run_case deployed success
run_case startup_failed failure
printf 'Artefacts de test : %s\n' "$TEST_ROOT"
