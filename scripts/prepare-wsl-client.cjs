const fs = require('node:fs');
const root = '/workspace/app/.wasp/out/sdk/wasp';
const marker = 'const apiUrl = stripTrailingSlash(env["REACT_APP_API_URL"])';
const replacement = 'const apiUrl = stripTrailingSlash(typeof window === "undefined" ? env["REACT_APP_API_URL"] : new URL("/api", window.location.origin).href)';
// Adapter uniquement le SDK généré dans la copie WSL, après wasp build.
// Le même client fonctionne depuis localhost et depuis un autre appareil Tailscale.
for (const relative of ['client/config.ts', 'dist/client/config.js']) {
  const file = `${root}/${relative}`;
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes(marker) && !content.includes(replacement)) throw new Error(`Configuration client Wasp inattendue : ${relative}`);
  fs.writeFileSync(file, content.replace(marker, replacement));
}
