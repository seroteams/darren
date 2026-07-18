#!/usr/bin/env node
/*
 * plan-board.js — the "Where we are" board for a Darren-Method plan.
 *
 * Reads a plan folder and draws it as a single visual board Carl can open:
 *   docs/plans/doing/<slug>/plan.md   → title, goal, phase list
 *   docs/plans/doing/<slug>/phase-*.md → each phase's status, what landed, how to test
 * Writes:
 *   docs/plans/doing/<slug>/board.html  (self-contained; opens in a browser OR
 *                                         publishes as a claude.ai artifact as-is)
 *
 * Usage:  node scripts/plan-board.js <slug>
 *         node scripts/plan-board.js ux-audit-fixes
 *
 * The board is generated, never hand-edited — re-run it whenever a phase moves.
 * Wired into the darren-method (folder setup) and phase-close (green light) skills.
 */

const fs = require('fs');
const path = require('path');

// ---- the one project-constant: how a tester starts the app ----------------
// Same for every Sero plan; edit here if the local setup ever changes.
const SETUP = {
  eyebrow: 'BEFORE YOU TEST — ONE SETUP',
  lines: [
    'Start the app (run <b>Start Sero.bat</b>), then two local apps are live:',
    '<code>localhost:3000</code> — you, admins &amp; managers   ·   <code>localhost:3002</code> — members',
    'On the sign-in screen, the <b>Dev login</b> row switches profile in one click — <b>Manager · Admin · Member</b> — no passwords.',
  ],
};

// ---------------------------------------------------------------------------
function die(msg) { console.error(msg); process.exit(1); }

function clean(s) {
  if (!s) return '';
  return s
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // [text](link) -> text
    .replace(/`/g, '')                        // drop code ticks
    .replace(/\*\*/g, '')                     // drop bold
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1$2')  // drop italic
    .replace(/\s+/g, ' ')
    .trim();
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// strip a leading audit-ref prefix like "M1 — " / "B2 · X7 — "
function stripRef(s) {
  return s.replace(/^([MBXOC]\d+(\s*[·+/]\s*[MBXOC]\d+)*)\s*[—–-]\s*/i, '').trim();
}

// pull a section body: everything between "## <name>" and the next "## "
function section(md, name) {
  const lines = md.split('\n');
  const head = new RegExp(`^##\\s+${name}\\b`, 'i');
  const start = lines.findIndex(l => head.test(l));
  if (start === -1) return '';
  const body = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) break;
    body.push(lines[i]);
  }
  return body.join('\n').trim();
}

// top-level "- " bullets of a section, headline only, cleaned + de-reffed
function bullets(body, max) {
  const out = [];
  for (const raw of body.split('\n')) {
    const m = raw.match(/^\s*-\s+(.*)$/);
    if (!m) continue;
    let text = m[1];
    const bold = text.match(/^\*\*(.+?)\*\*/);         // prefer the bold label
    let head = bold ? bold[1] : text.split(/\s+[—–]\s+| \(| \. /)[0];
    head = stripRef(clean(head)).replace(/[:.]$/, '');
    head = head.replace(/\s*\(([MBXOC]\d+[^)]*)\)\s*$/i, ''); // trailing ref tag
    if (head.length > 96) head = head.slice(0, 93).trimEnd() + '…';
    if (head) out.push(head.charAt(0).toUpperCase() + head.slice(1));
    if (max && out.length >= max) break;
  }
  return out;
}

function firstPara(body) {
  const lines = [];
  for (const raw of body.split('\n')) {
    const t = raw.trim();
    if (!t) { if (lines.length) break; else continue; }
    if (t.startsWith('#') || t.startsWith('- ') || t.startsWith('* ')) break;
    lines.push(t);
  }
  return clean(lines.join(' '));
}

// ---- read the plan folder --------------------------------------------------
const slug = process.argv[2];
if (!slug) die('Usage: node scripts/plan-board.js <slug>');

const dir = path.resolve('docs/plans/doing', slug);
const planPath = path.join(dir, 'plan.md');
if (!fs.existsSync(planPath)) {
  const alt = path.resolve('docs/plans/done', slug, 'plan.md');
  if (fs.existsSync(alt)) die(`"${slug}" is under docs/plans/done — boards are for live plans only.`);
  die(`No plan found at ${planPath}`);
}
const plan = fs.readFileSync(planPath, 'utf8');

const planTitle = (plan.match(/^#\s+(.+)$/m) || [, slug])[1].trim();
const goal = clean((plan.match(/\*\*Goal:\*\*\s*(.+)/) || [, ''])[1]);

// "what it lands" one-liners from the plan's Phases table, keyed by phase number
const lands = {};
for (const row of plan.split('\n')) {
  const m = row.match(/^\|\s*(\d+)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*([⬜🔨✅])?\s*\|/);
  if (m) lands[+m[1]] = clean(m[3]);
}

// ---- read each phase file --------------------------------------------------
const phaseFiles = fs.readdirSync(dir)
  .filter(f => /^phase-\d+\.md$/.test(f))
  .sort((a, b) => (+a.match(/\d+/)[0]) - (+b.match(/\d+/)[0]));
if (!phaseFiles.length) die(`No phase-N.md files in ${dir}`);

const phases = phaseFiles.map(file => {
  const md = fs.readFileSync(path.join(dir, file), 'utf8');
  const num = +file.match(/\d+/)[0];
  const name = clean((md.match(/^#\s+Phase\s+\d+\s*[—–-]\s*(.+)$/m) || [, `Phase ${num}`])[1]);
  const statusLine = (md.match(/\*\*Status:\*\*\s*(.+)/) || [, ''])[1];

  const signed = /^##\s*✅\s*GREEN[- ]?LIT/im.test(md) || /✅/.test(statusLine);
  const builtSec = section(md, 'Built');
  const built = !!builtSec || /🔨/.test(statusLine) || /\bbuilt\b/i.test(statusLine);
  const status = signed ? 'signed' : built ? 'built' : 'todo';

  const items = bullets(builtSec || section(md, 'Changes'), 6);

  const testSec = section(md, 'Test scenarios');
  const port = (testSec.match(/localhost:(\d+)/) || [, '3000'])[1];
  const role = (testSec.match(/\b(Manager|Member|Admin)\b/i) || [, 'Manager'])[1];
  // A phase whose walk isn't in the app (e.g. "read the report") gets its scenario
  // names on the TEST IT line instead of a misleading localhost pointer.
  const inApp = /localhost|sign in|log ?in|screen|click/i.test(testSec);
  const scenarioNames = [...testSec.matchAll(/^\s*\d+\.\s+\*\*(.+?)\*\*/gm)].map(m => clean(m[1]));

  return {
    num, name, status,
    desc: firstPara(section(md, 'Goal')) || lands[num] || '',
    lands: lands[num] || '',
    items,
    port, role: role.charAt(0).toUpperCase() + role.slice(1).toLowerCase(),
    inApp, scenarioNames,
  };
});

// ---- derive board-level state ---------------------------------------------
const N = phases.length;
const signedCount = phases.filter(p => p.status === 'signed').length;
const builtCount = phases.filter(p => p.status === 'built').length;
const totalItems = phases.reduce((n, p) => n + p.items.length, 0);
const currentIdx = Math.min(phases.findIndex(p => p.status !== 'signed') + 0, N - 1);
const current = phases[currentIdx === -1 ? N - 1 : currentIdx] || phases[N - 1];
const allDone = signedCount === N;

const eyebrowTitle = planTitle.split(/\s+[—–-]\s+/)[0].toUpperCase();

// ---- render ----------------------------------------------------------------
const barSeg = (p, i) => {
  const fill = p.status === 'signed' ? 'seg-signed' : p.status === 'built' ? 'seg-built' : 'seg-todo';
  // Label mirrors the segment's own status — a built phase never reads "Next"
  // just because an earlier one is still awaiting sign-off.
  let label = '—';
  if (p.status === 'signed') label = 'Signed';
  else if (p.status === 'built') label = 'Built';
  else if (i === currentIdx) label = 'Now';
  else if (i === currentIdx + 1) label = 'Next';
  return `<div class="seg"><div class="seg-bar ${fill}"></div><div class="seg-label">${label}</div></div>`;
};

const pill = p => {
  if (p.status === 'signed') return '<span class="pill pill-signed">SIGNED OFF</span>';
  if (p.status === 'built') return '<span class="pill pill-built">BUILT · AWAITING YOUR WALK</span>';
  return '<span class="pill pill-todo">NOT STARTED</span>';
};

const itemsHtml = p => p.items.map(t => {
  const mark = p.status === 'todo'
    ? '<span class="tick tick-todo">○</span>'
    : `<span class="tick ${p.status === 'signed' ? 'tick-signed' : 'tick-built'}">✓</span>`;
  return `<li class="${p.status === 'todo' ? 'item-todo' : ''}">${mark}<span>${esc(t)}</span></li>`;
}).join('');

const testFoot = p => {
  if (p.status !== 'built') return '';
  if (!p.inApp && p.scenarioNames.length) {
    return `<div class="testit"><span class="testit-tag">TEST IT</span> ${p.scenarioNames.map(n => `<span class="role">${esc(n)}</span>`).join(' · ')}</div>`;
  }
  return `<div class="testit"><span class="testit-tag">TEST IT</span> go to <code>localhost:${esc(p.port)}</code> · sign in as <span class="role">${esc(p.role)}</span></div>`;
};

const phaseCards = phases.map((p, i) => `
  <div class="row ${i === currentIdx && !allDone ? 'row-here' : ''}">
    <div class="node ${p.status}">${p.num}</div>
    <div class="card">
      <div class="card-head">
        <h3>${esc(p.name)}</h3>
        ${pill(p)}
        ${i === currentIdx && !allDone ? '<span class="here">● YOU ARE HERE</span>' : ''}
      </div>
      ${p.desc ? `<p class="desc">${esc(p.desc)}</p>` : ''}
      ${p.items.length ? `<ul class="items">${itemsHtml(p)}</ul>` : ''}
      ${testFoot(p)}
    </div>
  </div>`).join('');

const intro = allDone
  ? `All ${N} phases signed off. Every step below is done — this is the finished picture.`
  : `The plan is ${N} phases and ${totalItems} steps. One phase at a time — you sign it off, then the next begins. This board fills up as we go.`;

const progressHead = allDone
  ? `All ${N} phases done`
  : `Phase ${current.num} of ${N} — ${esc(current.name.toLowerCase())}`;

const html = `<meta charset="utf-8">
<style>
  .board{--bg:#0c0c0e;--card:#161619;--card2:#1c1c20;--line:#2a2a30;--ink:#ececf0;--mut:#8a8a94;--dim:#5f5f68;
    --red:#e5484d;--amber:#d9a441;--green:#41b658;
    background:var(--bg);color:var(--ink);max-width:820px;margin:0 auto;padding:56px 28px 80px;
    font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.55;
    -webkit-font-smoothing:antialiased;}
  .board *{box-sizing:border-box;}
  .eyebrow{color:var(--mut);font-size:12px;font-weight:600;letter-spacing:.16em;margin-bottom:18px;}
  .eyebrow .dot{color:var(--red);}
  .board h1{font-family:Georgia,'Times New Roman',serif;font-size:56px;line-height:1.02;font-weight:600;
    letter-spacing:-.02em;margin:0 0 18px;}
  .board h1 .dot{color:var(--red);}
  .lead{color:var(--mut);font-size:18px;max-width:560px;margin:0 0 32px;}
  .panel{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:26px 28px;margin-bottom:16px;}
  .prog-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:20px;flex-wrap:wrap;}
  .prog-head h2{font-family:Georgia,serif;font-size:24px;font-weight:600;margin:0;}
  .prog-sub{color:var(--mut);font-size:14px;}
  .segs{display:flex;gap:8px;}
  .seg{flex:1;}
  .seg-bar{height:6px;border-radius:99px;background:var(--card2);}
  .seg-signed{background:var(--green);}
  .seg-built{background:var(--amber);}
  .seg-label{text-align:center;color:var(--mut);font-size:13px;margin-top:9px;}
  .setup .eyebrow{margin-bottom:14px;}
  .setup p{margin:0 0 8px;color:#c9c9d2;font-size:15px;}
  .board code{background:var(--card2);border:1px solid var(--line);border-radius:6px;padding:2px 7px;
    font-family:'SF Mono',ui-monospace,Menlo,Consolas,monospace;font-size:13px;color:#dfe1e6;}
  .legend{display:flex;gap:22px;flex-wrap:wrap;margin:26px 2px 6px;color:var(--mut);font-size:14px;}
  .legend span{display:inline-flex;align-items:center;gap:8px;}
  .lg{width:10px;height:10px;border-radius:99px;}
  .lg-signed{background:var(--green);}
  .lg-built{background:var(--amber);}
  .lg-todo{border:1.5px solid var(--dim);}
  .rows{position:relative;margin-top:14px;}
  .row{display:grid;grid-template-columns:34px 1fr;gap:18px;position:relative;padding-bottom:14px;}
  .row::before{content:"";position:absolute;left:16px;top:34px;bottom:-4px;width:2px;background:var(--line);}
  .row:last-child::before{display:none;}
  .node{width:34px;height:34px;border-radius:99px;display:flex;align-items:center;justify-content:center;
    font-size:14px;font-weight:600;background:var(--card2);border:2px solid var(--line);color:var(--mut);z-index:1;}
  .node.signed{border-color:var(--green);color:var(--green);}
  .node.built{border-color:var(--amber);color:var(--amber);}
  .row-here .node{box-shadow:0 0 0 4px rgba(229,72,77,.14);}
  .card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:22px 24px;}
  .row-here .card{border-color:rgba(229,72,77,.4);}
  .card-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:10px;}
  .card-head h3{font-family:Georgia,serif;font-size:23px;font-weight:600;margin:0;}
  .pill{font-size:11px;font-weight:700;letter-spacing:.06em;padding:5px 11px;border-radius:99px;white-space:nowrap;}
  .pill-signed{background:rgba(65,182,88,.14);color:var(--green);}
  .pill-built{background:rgba(217,164,65,.14);color:var(--amber);border:1px solid rgba(217,164,65,.35);}
  .pill-todo{background:var(--card2);color:var(--mut);}
  .here{color:var(--red);font-size:12px;font-weight:700;letter-spacing:.06em;margin-left:auto;}
  .desc{color:var(--mut);font-size:16px;margin:0 0 16px;}
  .items{list-style:none;padding:0;margin:0;}
  .items li{display:flex;gap:12px;align-items:flex-start;padding:7px 0;font-size:15.5px;color:#d4d4dc;}
  .items li.item-todo{color:var(--mut);}
  .tick{flex:none;font-weight:700;line-height:1.5;}
  .tick-signed{color:var(--green);}
  .tick-built{color:var(--amber);}
  .tick-todo{color:var(--dim);}
  .testit{margin-top:16px;padding-top:16px;border-top:1px dashed var(--line);color:var(--mut);font-size:14px;}
  .testit-tag{color:var(--dim);font-weight:700;letter-spacing:.08em;font-size:12px;margin-right:8px;}
  .role{background:var(--card2);border:1px solid var(--line);border-radius:6px;padding:2px 9px;color:#dfe1e6;}
  .foot{color:var(--dim);font-size:12.5px;text-align:center;margin-top:40px;}
  @media(max-width:560px){.board{padding:36px 16px 60px;}.board h1{font-size:40px;}}
</style>
<div class="board">
  <div class="eyebrow"><span class="dot">●</span> SERO · ${esc(eyebrowTitle)}</div>
  <h1>Where we are<span class="dot">.</span></h1>
  <p class="lead">${esc(intro)}</p>

  <div class="panel">
    <div class="prog-head">
      <h2>${progressHead}</h2>
      <div class="prog-sub">${signedCount} of ${N} signed off · ${builtCount} built</div>
    </div>
    <div class="segs">${phases.map(barSeg).join('')}</div>
  </div>

  <div class="panel setup">
    <div class="eyebrow"><span class="dot">●</span> ${SETUP.eyebrow}</div>
    ${SETUP.lines.map(l => `<p>${l}</p>`).join('')}
  </div>

  <div class="legend">
    <span><i class="lg lg-signed"></i> Signed off</span>
    <span><i class="lg lg-built"></i> Built · awaiting you</span>
    <span><i class="lg lg-todo"></i> Not started</span>
  </div>

  <div class="rows">${phaseCards}
  </div>

  <div class="foot">Auto-generated from docs/plans/doing/${esc(slug)}/ · re-run scripts/plan-board.js to refresh</div>
</div>`;

const outPath = path.join(dir, 'board.html');
fs.writeFileSync(outPath, html, 'utf8');
console.log(`Board written: ${path.relative(process.cwd(), outPath)}`);
console.log(`  ${N} phases · ${signedCount} signed · ${builtCount} built · current: Phase ${current.num} (${current.name})`);
