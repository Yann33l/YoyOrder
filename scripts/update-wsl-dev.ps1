param(
  [switch]$SkipBuild,
  [switch]$SyncOnly,
  [switch]$NoPause,
  [switch]$NoBrowser,
  [string]$Distribution = 'Ubuntu'
)
$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$url = 'http://localhost:8083'
$exitCode = 0
try {
  if (-not (Test-Path -LiteralPath (Join-Path $repoRoot 'app\main.wasp.ts'))) { throw 'Projet YoyOrder introuvable.' }
  $source = & wsl.exe -d $Distribution -u root -- wslpath -u $repoRoot.Replace('\', '/')
  if ($LASTEXITCODE -ne 0) { throw "Impossible d'acceder a Ubuntu WSL." }
  $source = ($source | Select-Object -Last 1).Trim()
  $singleQuote = [string][char]39
  $escapedQuote = $singleQuote + [char]34 + $singleQuote + [char]34 + $singleQuote
  $quotedSource = $singleQuote + $source.Replace($singleQuote, $escapedQuote) + $singleQuote
  $shellScript = @'
set -Eeuo pipefail
umask 022
source_dir=__SOURCE__
target=/home/yoylinux/yoyorder-wsl-test
mkdir -p "$target"
test "$(realpath "$target")" = /home/yoylinux/yoyorder-wsl-test
test -f "$source_dir/app/main.wasp.ts"
exec 9>"$target/.wsl-update.lock"
flock -n 9 || { echo 'Une opération YoyOrder WSL est déjà en cours.' >&2; exit 1; }
if [[ __SKIP_BUILD__ != true ]]; then
  printf 'Synchronisation du code Windows vers WSL...\n'
  rsync -a --delete \
    --exclude='.git/' --exclude='node_modules/' --exclude='.wasp/' \
    --exclude='dist/' --exclude='build/' --exclude='coverage/' \
    --exclude='.env*' --exclude='backups/' --exclude='migrations/' \
    --exclude='*.agekey' --exclude='*.dump*' --exclude='.wsl-update.lock' \
    --exclude='.ssh/' --exclude='.aws/' --exclude='.codex/' --exclude='.agents/' \
    "$source_dir/" "$target/"
  # Les migrations versionnées sont copiées sans effacer les migrations locales.
  if [[ -d "$source_dir/app/migrations" ]]; then
    mkdir -p "$target/app/migrations"
    rsync -a "$source_dir/app/migrations/" "$target/app/migrations/"
  fi
fi
cd "$target"
if [[ __SKIP_BUILD__ == true && ! -f docker-compose.wsl.yml ]]; then
  echo 'Premiere installation : utiliser Mettre a jour YoyOrder.' >&2
  exit 1
fi
__UPDATE__
'@
  $update = @'
if [[ ! -f .env.wsl ]]; then
  (umask 077; printf 'POSTGRES_PASSWORD=%s\nJWT_SECRET=%s\n' "$(openssl rand -hex 32)" "$(openssl rand -hex 32)" > .env.wsl)
fi
if [[ ! -f app/.env.server ]]; then
  # Valeurs factices du template : aucun secret de production copié depuis Windows.
  (umask 077; cp "$source_dir/app/.env.server.example" app/.env.server)
fi
compose=(docker compose -p yoyorder-wsl-test --env-file .env.wsl -f docker-compose.wsl.yml)
"${compose[@]}" config --quiet
systemctl start docker
if [[ __SKIP_BUILD__ == true ]]; then
  [[ -f docker-compose.wsl.yml ]] || { echo 'Lancer d’abord Mettre à jour YoyOrder.' >&2; exit 1; }
  for service in server web; do
    docker image inspect "yoyorder-wsl-test-$service" >/dev/null 2>&1 \
      || { echo 'Première installation : utiliser Mettre à jour YoyOrder.' >&2; exit 1; }
  done
else
  "${compose[@]}" --profile tools build compiler
  "${compose[@]}" up -d --wait --wait-timeout 120 postgres
  "${compose[@]}" --profile tools run --rm -T compiler < /dev/null
  "${compose[@]}" build server web
fi
"${compose[@]}" up --no-build -d --wait --wait-timeout 300 postgres mailpit server web
"${compose[@]}" ps
'@
  if ($SyncOnly) { $update = "printf 'Synchronisation terminée, sans compilation ni modification de la base.\n'" }
  $skipValue = if ($SkipBuild) { 'true' } else { 'false' }
  $shellScript = $shellScript.Replace('__SOURCE__', $quotedSource).Replace('__UPDATE__', $update).Replace('__SKIP_BUILD__', $skipValue).Replace("`r`n", "`n")
  $encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($shellScript))
  if (-not $SyncOnly) {
    # Maintenir la distribution active après fermeture du terminal.
    $stateDir = Join-Path $env:LOCALAPPDATA 'YoyOrder'
    New-Item -ItemType Directory -Path $stateDir -Force | Out-Null
    $pidFile = Join-Path $stateDir 'wsl-dev-keepalive.pid'
    $existing = $null
    if (Test-Path -LiteralPath $pidFile) {
      $keepaliveId = (Get-Content -LiteralPath $pidFile -Raw).Trim()
      if ($keepaliveId -match '^\d+$') { $existing = Get-CimInstance Win32_Process -Filter "ProcessId = $keepaliveId" }
    }
    if (-not ($existing -and $existing.Name -eq 'wsl.exe' -and $existing.CommandLine -match 'yoyorder-wsl-keepalive')) {
      $helper = Start-Process -FilePath 'wsl.exe' -WindowStyle Hidden -ArgumentList @('-d', $Distribution, '-u', 'root', '--', 'bash', '-c', '"exec -a yoyorder-wsl-keepalive sleep infinity"') -PassThru
      Set-Content -LiteralPath $pidFile -Value $helper.Id
    }
  }
  & wsl.exe -d $Distribution -u root -- bash -lc "printf '%s' '$encoded' | base64 --decode | bash"
  if ($LASTEXITCODE -ne 0) { throw "Opération WSL échouée (code $LASTEXITCODE)." }
  if (-not $SyncOnly) {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 20
    if ($response.StatusCode -ne 200) { throw 'YoyOrder ne répond pas sur le port 8083.' }
    Write-Host "YoyOrder local : $url" -ForegroundColor Green
    if (-not $NoBrowser) { Start-Process $url }
  }
} catch {
  Write-Host $_.Exception.Message -ForegroundColor Red
  $exitCode = 1
} finally {
  if (-not $NoPause) { Read-Host 'Appuyez sur Entrée pour fermer' | Out-Null }
}
exit $exitCode
