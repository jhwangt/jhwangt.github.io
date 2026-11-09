import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';

const logo = readFileSync('src/assets/ingenuity-logo.png').toString('base64');
const template = readFileSync('src/index.html','utf8').replace('__INGENUITY_LOGO__', 'data:image/png;base64,'+logo);
const direct = `
const connectSharedRecords = null;
function requestRecords(method, record) {
  return fetch('/api/records', method === 'GET' ? {} : {
    method, headers:{'content-type':'application/json'}, body:JSON.stringify(record)
  });
}
`;
const html = template.replace('__SHARED_TRANSPORT__', () => direct);
const connect = readFileSync('src/connect.html','utf8');
mkdirSync('dist/server', {recursive:true});
writeFileSync('dist/server/index.js', 'const html = '+JSON.stringify(html)+';\nconst connectHtml = '+JSON.stringify(connect)+';\n'+readFileSync('src/worker.js','utf8'));

if (process.argv[2]) {
  const github = readFileSync('src/github-transport.js','utf8');
  writeFileSync(process.argv[2], template.replace('__SHARED_TRANSPORT__', () => github));
}
