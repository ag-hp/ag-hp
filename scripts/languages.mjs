// languages: tarjeta ancha con barras de cuadrados que se rellenan con animación.
// Lee el uso real de lenguajes de tus repositorios públicos (no forks).
// Uso: node scripts/languages.mjs          (necesita GITHUB_TOKEN)
//      node scripts/languages.mjs --demo   (datos de ejemplo para probar)
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const USER = process.env.GITHUB_USER || process.env.GITHUB_REPOSITORY_OWNER || 'tu-usuario';
const TOKEN = process.env.GITHUB_TOKEN;
const OUT = process.env.OUTPUT_DIR || 'dist';
const DEMO = process.argv.includes('--demo');

// ---- configuración (edita aquí) -------------------------------------------
const MAX_ROWS = 7;                                   // cuántos lenguajes se muestran
const EXCLUDE = ['Dockerfile', 'Makefile', 'Batchfile', 'Jupyter Notebook']; // no se cuentan
const MERGE = { C: 'C / C++', 'C++': 'C / C++' };     // lenguajes que se juntan en una fila
// -----------------------------------------------------------------------------

const W = 880, PAD = 28, ROW = 32, CELL = 16, GAP = 6, PITCH = CELL + GAP;
const BAR_X = 170;
const SEGMENTS = Math.floor((W - PAD - BAR_X + GAP) / PITCH); // la barra llega hasta el final de la tarjeta
const HEAD = 52;

const THEMES = {
  dark: { card: '#0d1117', border: '#1f2630', title: '#8b949e', name: '#c9d1d9', empty: '#161b22',
    high: '#39d353', mid: '#26a641', low: '#006d32' },
  light: { card: '#ffffff', border: '#d0d7de', title: '#57606a', name: '#24292f', empty: '#ebedf0',
    high: '#216e39', mid: '#30a14e', low: '#9be9a8' },
};

async function fetchLanguages() {
  const query = `query($login:String!,$after:String){user(login:$login){
    repositories(first:100,after:$after,ownerAffiliations:OWNER,isFork:false,privacy:PUBLIC){
      pageInfo{hasNextPage endCursor}
      nodes{languages(first:20,orderBy:{field:SIZE,direction:DESC}){edges{size node{name}}}}}}}`;
  const bytes = new Map();
  let after = null;
  for (let page = 0; page < 10; page++) {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: { Authorization: `bearer ${TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': 'languages-card' },
      body: JSON.stringify({ query, variables: { login: USER, after } }),
    });
    const json = await res.json();
    if (!res.ok || json.errors || !json.data?.user) {
      throw new Error('Error al consultar GitHub: ' + JSON.stringify(json.errors || json.message || res.status));
    }
    const repos = json.data.user.repositories;
    for (const repo of repos.nodes) {
      for (const { size, node } of repo.languages.edges) {
        const name = MERGE[node.name] || node.name;
        if (EXCLUDE.includes(node.name)) continue;
        bytes.set(name, (bytes.get(name) || 0) + size);
      }
    }
    if (!repos.pageInfo.hasNextPage) break;
    after = repos.pageInfo.endCursor;
  }
  return bytes;
}

function demoLanguages() {
  return new Map([['Java', 520000], ['Python', 470000], ['Kotlin', 330000], ['JavaScript', 300000],
    ['SQL', 280000], ['C / C++', 250000], ['PHP', 150000], ['HTML', 90000]]);
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function render(rows, t) {
  const H = HEAD + rows.length * ROW + PAD - 6;
  const top = rows[0].bytes;
  let rects = '', labels = '';
  rows.forEach((r, ri) => {
    const ratio = r.bytes / top;
    const filled = Math.max(1, Math.round(ratio * SEGMENTS));
    const color = ratio >= 0.7 ? t.high : ratio >= 0.4 ? t.mid : t.low;
    const y = HEAD + ri * ROW;
    labels += `<text class="n" x="${PAD}" y="${y + 13}">${esc(r.name)}</text>`;
    for (let i = 0; i < SEGMENTS; i++) {
      const x = BAR_X + i * PITCH;
      if (i < filled) {
        const delay = (0.25 + ri * 0.18 + i * 0.03).toFixed(2);
        const tip = i === filled - 1;
        const style = tip
          ? `animation-delay:${delay}s,${(+delay + 0.5).toFixed(2)}s`
          : `animation-delay:${delay}s`;
        rects += `<rect class="s${tip ? ' tip' : ''}" x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="3" fill="${color}" style="${style}"/>`;
      } else {
        rects += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="3" fill="${t.empty}"/>`;
      }
    }
  });

  const css = `
.n{font:16px ui-monospace,SFMono-Regular,'JetBrains Mono','DejaVu Sans Mono',Consolas,monospace;fill:${t.name}}
.h{font:700 12px -apple-system,'Segoe UI','Noto Sans',Helvetica,Arial,sans-serif;fill:${t.title};letter-spacing:2.4px}
.s{transform-box:fill-box;transform-origin:center;animation:pop .4s cubic-bezier(.2,.8,.2,1) backwards}
.tip{animation:pop .4s cubic-bezier(.2,.8,.2,1) backwards,tip 2.4s ease-in-out infinite}
@keyframes pop{from{opacity:0;transform:scale(.3)}to{opacity:1;transform:none}}
@keyframes tip{0%,100%{opacity:1}50%{opacity:.35}}
@media (prefers-reduced-motion:reduce){.s,.tip{animation:none!important}}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="languages: lenguajes más usados por ${USER}">
<title>languages · ${USER}</title>
<style>${css}</style>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="14" fill="${t.card}" stroke="${t.border}"/>
<text class="h" x="${PAD}" y="36">LANGUAGES</text>
${labels}${rects}
</svg>`;
}

if (!DEMO && !TOKEN) { console.error('Falta GITHUB_TOKEN (o usa --demo).'); process.exit(1); }
const bytes = DEMO ? demoLanguages() : await fetchLanguages();
const rows = [...bytes.entries()].map(([name, b]) => ({ name, bytes: b }))
  .sort((a, b) => b.bytes - a.bytes).slice(0, MAX_ROWS);
if (!rows.length) throw new Error('No se encontró ningún lenguaje en tus repositorios públicos.');
mkdirSync(OUT, { recursive: true });
for (const name of ['dark', 'light']) writeFileSync(join(OUT, `languages-${name}.svg`), render(rows, THEMES[name]));
console.log(`languages | ${DEMO ? '(demo)' : USER} | ${rows.map((r) => r.name).join(', ')} | ${SEGMENTS} segmentos por barra`);
