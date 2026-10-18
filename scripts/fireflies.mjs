// fireflies: gráfico de contribuciones con luciérnagas parpadeantes para el README de perfil.
// Uso: node scripts/fireflies.mjs          (necesita GITHUB_TOKEN)
//      node scripts/fireflies.mjs --demo   (datos aleatorios para probar)
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const USER = process.env.GITHUB_USER || process.env.GITHUB_REPOSITORY_OWNER || 'ag-hp';
const TOKEN = process.env.GITHUB_TOKEN;
const OUT = process.env.OUTPUT_DIR || 'dist';
const DEMO = process.argv.includes('--demo');

const CELL = 10, GAP = 3, PITCH = CELL + GAP, LEFT = 6, TOP = 6;

const THEMES = {
  dark: { text: '#8b949e', edge: 'rgba(255,255,255,0.05)', scan: '#39d353',
    levels: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'] },
  light: { text: '#57606a', edge: 'rgba(27,31,35,0.06)', scan: '#30a14e',
    levels: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'] },
};
const LEVEL = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };

async function fetchWeeks() {
  const query = `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{
    weeks{contributionDays{date contributionCount contributionLevel weekday}}}}}}`;
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': 'fireflies' },
    body: JSON.stringify({ query, variables: { login: USER } }),
  });
  const json = await res.json();
  if (!res.ok || json.errors || !json.data?.user) {
    throw new Error('Error al consultar GitHub: ' + JSON.stringify(json.errors || json.message || res.status));
  }
  return json.data.user.contributionsCollection.contributionCalendar.weeks.map((w) =>
    w.contributionDays.map((d) => ({
      date: d.date, count: d.contributionCount, weekday: d.weekday, level: LEVEL[d.contributionLevel] ?? 0,
    })));
}

function demoWeeks() {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const start = new Date(today); start.setUTCDate(today.getUTCDate() - today.getUTCDay() - 52 * 7);
  const weeks = [];
  for (let w = 0; w < 53; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start); date.setUTCDate(start.getUTCDate() + w * 7 + d);
      if (date > today) break;
      const r = rnd(); const count = r < 0.45 ? 0 : Math.floor(r * r * 14);
      days.push({ date: date.toISOString().slice(0, 10), count, weekday: d,
        level: count === 0 ? 0 : count < 3 ? 1 : count < 6 ? 2 : count < 10 ? 3 : 4 });
    }
    weeks.push(days);
  }
  return weeks;
}

const hash = (n) => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };

function render(weeks, t) {
  const graphW = weeks.length * PITCH - GAP;
  const W = LEFT + graphW + 6, H = TOP + 7 * PITCH - GAP + 6;
  let cols = '', i = 0;

  weeks.forEach((days, w) => {
    let cells = '';
    for (const d of days) {
      i++;
      let style = '', cls = 'c';
      if (d.level > 0) { // parpadeo: fuerte en el verde más claro, leve en el resto
        const strong = d.level === 4;
        const dur = strong ? 2.2 + hash(i) * 1.4 : 3.2 + hash(i) * 1.8;
        const del = hash(i + 999) * 2.5;
        cls += strong ? ' s' : ' w';
        style = ` style="animation-duration:${dur.toFixed(2)}s;animation-delay:${del.toFixed(2)}s"`;
      }
      cells += `<rect class="${cls}" x="${LEFT + w * PITCH}" y="${TOP + d.weekday * PITCH}" width="${CELL}" height="${CELL}" rx="2" fill="${t.levels[d.level]}" stroke="${t.edge}"${style}/>`;
    }
    cols += `<g>${cells}</g>`;
  });

  const css = `
.s,.w{animation-timing-function:ease-in-out;animation-iteration-count:infinite}
.s{animation-name:twS}.w{animation-name:twW}
@keyframes twS{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes twW{0%,100%{opacity:1}50%{opacity:.75}}
@media (prefers-reduced-motion:reduce){.s,.w{animation:none!important}}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="fireflies: contribuciones de ${USER} en el último año">
<title>fireflies · contribuciones de ${USER}</title>
<style>${css}</style>
${cols}
</svg>`;
}

if (!DEMO && !TOKEN) { console.error('Falta GITHUB_TOKEN (o usa --demo).'); process.exit(1); }
const weeks = DEMO ? demoWeeks() : await fetchWeeks();
mkdirSync(OUT, { recursive: true });
for (const name of ['dark', 'light']) {
  writeFileSync(join(OUT, `fireflies-${name}.svg`), render(weeks, THEMES[name]));
}
const total = weeks.flat().reduce((n, d) => n + d.count, 0);
console.log(`fireflies | Usuario: ${DEMO ? '(demo)' : USER} | ${total} contribuciones en ${weeks.length} semanas | SVG en ${OUT}/`);
