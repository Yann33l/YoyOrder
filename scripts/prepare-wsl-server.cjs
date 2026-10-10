const fs = require('node:fs');
const file = '/workspace/app/.wasp/out/Dockerfile';
const marker = 'RUN cd .wasp/out/server && npm run bundle';
let content = fs.readFileSync(file, 'utf8');
if (!content.includes(marker)) throw new Error('Structure du Dockerfile Wasp inattendue.');
// npm/cli#4828 : compléter les dépendances musl quand le lock vient de Debian.
// Les versions sont celles déclarées par les paquets déjà installés dans l'image.
const installScript = `const fs=require('fs');const cp=require('child_process');const names=['rollup','@node-rs/argon2','@node-rs/bcrypt'];const specs=names.filter(n=>fs.existsSync('./node_modules/'+n+'/package.json')).flatMap(n=>{const p=JSON.parse(fs.readFileSync('./node_modules/'+n+'/package.json','utf8'));return Object.entries(p.optionalDependencies||{}).filter(([k])=>k.endsWith('-linux-'+process.arch+'-musl')).map(([k,v])=>k+'@'+v)});if(specs.length)cp.execFileSync('npm',['install','--no-save',...specs],{stdio:'inherit'});`;
const install = `RUN node -e "${installScript}"`;
// Permettre la réparation des artefacts déjà construits, sans dupliquer la ligne.
content = content.split('\n').filter(line =>
  !line.startsWith('RUN npm install --no-save @rollup/rollup-linux-') &&
  line !== install
).join('\n');
fs.writeFileSync(file, content.replace(marker, install + '\n' + marker));
