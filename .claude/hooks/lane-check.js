#!/usr/bin/env node
// Lane-board check (PreToolUse on Edit/Write).
// Reads LANES.md; if the file being edited sits inside ANOTHER session's
// claimed lane (claim <= 2 days old), block the edit with a warning so the
// session surfaces it to Carl instead of ploughing in.

const fs = require('fs');
const path = require('path');

function norm(p, root) {
  let out = p.replace(/\\/g, '/');
  const r = root.replace(/\\/g, '/');
  if (out.toLowerCase().startsWith(r.toLowerCase() + '/')) out = out.slice(r.length + 1);
  return out.toLowerCase().replace(/\/+$/, '');
}

let input = '';
process.stdin.on('data', d => (input += d));
process.stdin.on('end', () => {
  try {
    const evt = JSON.parse(input);
    const filePath = evt.tool_input && (evt.tool_input.file_path || evt.tool_input.notebook_path);
    if (!filePath) process.exit(0);

    const root = process.cwd();
    const target = norm(filePath, root);

    // The board itself is always editable (claiming/clearing lanes).
    if (target === 'lanes.md') process.exit(0);

    const boardPath = path.join(root, 'LANES.md');
    if (!fs.existsSync(boardPath)) process.exit(0);
    const board = fs.readFileSync(boardPath, 'utf8');

    const mySession = (evt.session_id || '').slice(0, 8).toLowerCase();
    const now = Date.now();
    const STALE_MS = 2 * 24 * 60 * 60 * 1000;

    for (const line of board.split('\n')) {
      const cells = line.split('|').map(c => c.trim());
      // | session | area | paths | claimed |  ->  ['', s, a, p, c, '']
      if (cells.length < 6 || !/^[0-9a-f]{6,}$/i.test(cells[1])) continue;
      const [, session, area, paths, claimed] = cells;
      if (session.toLowerCase() === mySession) continue;
      const claimedAt = Date.parse(claimed);
      if (!isNaN(claimedAt) && now - claimedAt > STALE_MS) continue;

      for (const raw of paths.split(',')) {
        const lane = norm(raw.trim(), root);
        if (!lane) continue;
        if (target === lane || target.startsWith(lane + '/') ||
            (lane.endsWith('/') && target.startsWith(lane))) {
          process.stderr.write(
            `LANE CONFLICT: "${filePath}" is inside the lane "${area}" claimed by another ` +
            `chat (session ${session}, claimed ${claimed}) in LANES.md. Do NOT edit it. ` +
            `Tell Carl which chat holds this lane and let him decide whether to proceed.`
          );
          process.exit(2);
        }
      }
    }
    process.exit(0);
  } catch (e) {
    process.exit(0); // never break editing on a hook bug
  }
});
