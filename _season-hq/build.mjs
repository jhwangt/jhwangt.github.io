import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
mkdirSync('dist/server', {recursive:true});
const logo = readFileSync('src/assets/ingenuity-logo.png').toString('base64');
const html = readFileSync('src/index.html','utf8').replace('__INGENUITY_LOGO__', 'data:image/png;base64,'+logo);
writeFileSync('dist/server/index.js', 'const html = '+JSON.stringify(html)+';\n'+readFileSync('src/worker.js','utf8'));
