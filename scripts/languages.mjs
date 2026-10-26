// languages: tarjeta ancha con barras de cuadrados que se rellenan con animación.
// Lee el uso real de lenguajes de tus repositorios (no forks). Con INCLUDE_PRIVATE=true cuenta también los privados.
// Uso: node scripts/languages.mjs          (necesita GITHUB_TOKEN)
//      node scripts/languages.mjs --demo   (datos de ejemplo para probar)
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const USER = process.env.GITHUB_USER || process.env.GITHUB_REPOSITORY_OWNER || 'tu-usuario';
// Para contar tus repos privados hace falta INCLUDE_PRIVATE=true y un token personal con permiso
// de lectura en el secreto LANGUAGES_TOKEN (el token automático del workflow no puede leerlos).
const TOKEN = process.env.LANGUAGES_TOKEN || process.env.GITHUB_TOKEN;
const INCLUDE_PRIVATE = process.env.INCLUDE_PRIVATE === 'true';
const OUT = process.env.OUTPUT_DIR || 'dist';
const DEMO = process.argv.includes('--demo');

// ---- configuración (edita aquí) -------------------------------------------
const MAX_ROWS = 7;                                   // cuántos lenguajes se muestran
const EXCLUDE = ['Dockerfile', 'Makefile', 'Batchfile', 'Jupyter Notebook']; // no se cuentan
const MERGE = { C: 'C / C++', 'C++': 'C / C++' };     // lenguajes que se juntan en una fila
// Lenguajes que quieres que salgan SIEMPRE, aunque GitHub no los detecte en tus repos.
// El número es el nivel de la barra respecto al lenguaje más usado (0.1 = muy poco, 1 = igual que el primero).
// Si GitHub detecta ese lenguaje con más uso del indicado, se usa el real. Borra una línea para quitarlo.
const MANUAL = { HTML: 0.5, CSS: 0.45, SQL: 0.4 };
// -----------------------------------------------------------------------------

const W = 880, PAD = 28, ROW = 32, CELL = 16, GAP = 6, PITCH = CELL + GAP;
const BAR_X = 170;
const STEP = 0.3;   // segundos entre un bloque y el siguiente (más alto = más lento)
const FLASH = 0.6;  // duración del parpadeo con el que se enciende cada bloque
const HOLD = 3;     // segundos que se queda la batería completa antes de vaciarse (de atrás hacia delante)
const DISSOLVE = 0.9; // segundos que tarda cada bloque en desvanecerse al vaciarse
const PAUSE = 1;    // segundos con todo apagado antes de volver a cargar
const SEGMENTS = Math.floor((W - PAD - BAR_X + GAP) / PITCH); // la barra llega hasta el final de la tarjeta
const HEAD = 52;

const THEMES = {
  dark: { card: '#0d1117', border: '#1f2630', title: '#8b949e', name: '#c9d1d9', empty: '#161b22',
    high: '#39d353', mid: '#26a641', low: '#006d32' },
  light: { card: '#ffffff', border: '#d0d7de', title: '#57606a', name: '#24292f', empty: '#ebedf0',
    high: '#216e39', mid: '#30a14e', low: '#9be9a8' },
};

async function fetchLanguages() {
  const scope = INCLUDE_PRIVATE ? 'ownerAffiliations:OWNER' : 'ownerAffiliations:OWNER,privacy:PUBLIC'; // solo tus repos
  const query = `query($login:String!,$after:String){user(login:$login){
    repositories(first:100,after:$after,${scope},isFork:false){
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
      rects += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="3" fill="${t.empty}"/>`;
      if (i < filled) {
        // el grupo controla la carga (de izquierda a derecha) y el rect la descarga (de derecha a izquierda)
        const st = `animation-delay:${(0.4 + ri * 0.12).toFixed(2)}s`;
        const j = filled - 1 - i; // distancia al final de su barra
        rects += `<g class="s" style="animation-name:c${i};${st}"><rect class="s" x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="3" fill="${color}" style="animation-name:d${j};${st}"/></g>`;
      }
    }
  });

  // ciclo: carga (izq -> der) -> batería llena -> descarga (der -> izq, desvaneciéndose) -> pausa
  const maxFilled = Math.max(...rows.map((r) => Math.max(1, Math.round((r.bytes / top) * SEGMENTS))));
  const offStart = (SEGMENTS - 1) * STEP + FLASH + HOLD;
  const CYCLE = offStart + (maxFilled - 1) * STEP + DISSOLVE + PAUSE;
  const pct = (sec) => +((sec / CYCLE) * 100).toFixed(3);
  let frames = '';
  for (let i = 0; i < SEGMENTS; i++) { // carga del bloque i
    const on = i * STEP;
    frames += `@keyframes c${i}{0%,${pct(on)}%{opacity:0}${pct(on + FLASH * 0.15)}%{opacity:1}${pct(on + FLASH * 0.35)}%{opacity:.25}${pct(on + FLASH * 0.55)}%{opacity:1}${pct(on + FLASH * 0.75)}%{opacity:.5}${pct(on + FLASH)}%,100%{opacity:1}}\n`;
  }
  for (let j = 0; j < maxFilled; j++) { // descarga: el bloque a j posiciones del final de su barra
    const off = offStart + j * STEP;
    frames += `@keyframes d${j}{0%,${pct(off)}%{opacity:1}${pct(off + DISSOLVE * 0.15)}%{opacity:.55}${pct(off + DISSOLVE * 0.3)}%{opacity:1}${pct(off + DISSOLVE * 0.45)}%{opacity:.35}${pct(off + DISSOLVE * 0.6)}%{opacity:.8}${pct(off + DISSOLVE)}%,100%{opacity:0}}\n`;
  }

  const css = `
.n{font:16px ui-monospace,SFMono-Regular,'JetBrains Mono','DejaVu Sans Mono',Consolas,monospace;fill:${t.name}}
.h{font:700 12px -apple-system,'Segoe UI','Noto Sans',Helvetica,Arial,sans-serif;fill:${t.title};letter-spacing:2.4px}
.s{animation-duration:${CYCLE.toFixed(2)}s;animation-iteration-count:infinite;animation-timing-function:linear;animation-fill-mode:backwards}
${frames}@media (prefers-reduced-motion:reduce){.s{animation:none!important}}`;

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
if (!DEMO) {
  console.log('Detectado en tus repos:', [...bytes.entries()].sort((a, b) => b[1] - a[1]).map(([n, b]) => `${n} (${b})`).join(', ') || 'nada');
}
const topBytes = Math.max(0, ...bytes.values());
for (const [name, level] of Object.entries(MANUAL)) {
  bytes.set(name, Math.max(bytes.get(name) || 0, level * topBytes));
}
const rows = [...bytes.entries()].map(([name, b]) => ({ name, bytes: b }))
  .sort((a, b) => b.bytes - a.bytes).slice(0, MAX_ROWS);
if (!rows.length) throw new Error('No se encontró ningún lenguaje en tus repositorios.');
mkdirSync(OUT, { recursive: true });
for (const name of ['dark', 'light']) writeFileSync(join(OUT, `languages-${name}.svg`), render(rows, THEMES[name]));
console.log(`languages | ${DEMO ? '(demo)' : USER} | repos ${INCLUDE_PRIVATE ? 'públicos y privados' : 'públicos'} | ${rows.map((r) => r.name).join(', ')} | ${SEGMENTS} segmentos por barra`);
