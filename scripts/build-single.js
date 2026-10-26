// 단일 HTML 파일 빌드: index.html + css + js 를 하나로 합칩니다 (USB 배포·오프라인 실행용).
// 인라인 스크립트·스타일은 CSP 해시로 허용하므로 'unsafe-inline' 없이 동작합니다.
// 사용법: node scripts/build-single.js  →  dist/성민-평생과정설계.html
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '..');
const hash = (s) => "'sha256-" + crypto.createHash('sha256').update(s, 'utf8').digest('base64') + "'";
const scriptHashes = [];
const styleHashes = [];
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, href) => {
  const css = '\n' + fs.readFileSync(path.join(root, href), 'utf8') + '\n';
  styleHashes.push(hash(css));
  return '<style>' + css + '</style>';
});
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => {
  const js = '\n' + fs.readFileSync(path.join(root, src), 'utf8').replace(/<\/script/gi, '<\\/script') + '\n';
  scriptHashes.push(hash(js));
  return '<script>' + js + '</script>';
});
html = html.replace(/script-src 'self'/, 'script-src ' + scriptHashes.join(' ')).replace(/style-src 'self'/, 'style-src ' + styleHashes.join(' '));
const out = path.join(root, 'dist', '성민-평생과정설계.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(path.relative(root, out), (Buffer.byteLength(html) / 1024).toFixed(0) + 'KB');
