import{e as h,p as F,Q as S,S as y}from"./index-Lojh5UQc.js";import{C as M}from"./check-GyDbZBob.js";const C={FOCUS_POINTS:"Focus points",PREPARATION:"Preparation",BANK:"Question bank",QUESTIONING:"Questioning",EVAL:"Evaluation",BRIEFING:"Briefing",INTAKE:"Intake",ERROR:"Error"},R=[{match:/bi-?weekly|check-?in/i,file:"scenarios/batch/lin-biweekly-checkin.json"},{match:/performance|feedback/i,file:"scenarios/batch/sarah-performance-feedback.json"},{match:/growth|career/i,file:"scenarios/batch/maria-growth-career-plan.json"},{match:/onboarding/i,file:"scenarios/batch/sam-onboarding-checkin.json"},{match:/something feels off|feels off/i,file:"scenarios/batch/james-something-feels-off.json"}],j="scenarios/001-senior-backend-weekly.json";function N(t){if(!Number.isFinite(t)||t<0)return null;const e=Math.round(t/1e3);if(e<60)return`${e}s`;const n=Math.floor(e/60),o=e%60;return o?`${n}m ${o}s`:`${n}m`}function P(t){const e=new Date(t),n=String(e.getHours()).padStart(2,"0"),o=String(e.getMinutes()).padStart(2,"0");return`${n}:${o}`}function x(t){const e=t==null?void 0:t.calls;if(!Array.isArray(e)||e.length===0)return{ms:null,label:"—",callCount:0};const n=Date.parse(e[0].at),o=Date.parse(e[e.length-1].at);if(!Number.isFinite(n)||!Number.isFinite(o))return{ms:null,label:"—",callCount:e.length};const s=Math.max(0,o-n);return{ms:s,label:N(s)||"—",callCount:e.length}}function T(t,e){if(!Number.isFinite(t)||!Number.isFinite(e))return{ms:null,label:"—"};const n=Math.max(0,e-t);return{ms:n,label:N(n)||"—"}}function E(t,e){if(t){const n=String(t).replace(/\\/g,"/"),o=n.toLowerCase().indexOf("/logs/");if(o>=0)return n.slice(o+1);const s=n.toLowerCase().indexOf("logs/");return s>=0?n.slice(s):n}if(e){const n=/^\d{4}_([A-Z][a-z]{2})\d{2}_/.exec(e),o=["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"],s=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];let r="may";if(n){const u=s.indexOf(n[1]);u>=0&&(r=o[u])}return`logs/${r}/${e}/`}return"logs/"}function D(t){const e=String(t||"").trim();for(const n of R)if(n.match.test(e))return n.file;return j}function L(t,e="web"){const n=t.endsWith("/")?t:`${t}/`,o=e==="cli"?["transcript.json","axis-state.json","cost.json","notes.md"]:["transcript.json","axis-state.json","session-state.json","notes.md"],s=["01-focus-points/","01b-preparation/","02-intro-questions/","03-question-bank/","04-dynamic-answers/","05-evaluation/"],r=[...o.map(a=>({text:a,isStage:!1})),...s.map(a=>({text:a,isStage:!0}))],u=r.map((a,c)=>({prefix:c===r.length-1?"└":"├",text:a.text,isStage:a.isStage}));return{root:n,lines:u}}function I(t){return Array.isArray(t)?t.filter(e=>String((e==null?void 0:e.text)||"").trim()).map(e=>{const n=Number.isFinite(e==null?void 0:e.ts)?e.ts:Date.now();let o=C[e.stage]||e.stage||"—";return e.stage==="QUESTIONING"&&e.turn&&(o=`${C.QUESTIONING} · Q${e.turn}`),{time:P(n),stageLabel:o,text:String(e.text||"").trim(),title:String(e.text||"").trim()}}):[]}const O=`Go.

Review this session as a prompt-engine QA pass, not as product strategy.

Use ONLY the loaded run evidence:
- focus points
- preparation output
- question bank
- transcript
- final evaluation
- my live testing notes and concerns

Goal:
Find prompt/engine fixes that make future Sero runs more realistic, grounded, and useful.

Pay special attention to these issues from the run:

1. Test input realism
The manager answers were too polished because ChatGPT helped generate them. Assume real managers type shorter, rougher, less complete notes. Identify where the prompts over-reward polished answers or fail when answers are sparse.

2. Skipped / weak answers
The final briefing said "Maya's answers were mostly skips" but still made strong claims. Fix this. Strong conclusions must reduce confidence when evidence is skipped, thin, or manager-supplied.

3. Evidence ownership
Separate:
- what Maya actually said
- what the manager inferred
- what Sero suggested
Do not claim Maya "named" or "proposed" something if it came from the manager input or Sero.

4. Briefing length
The final briefing is too long for a manager. Reduce by 30–40%. Keep only what helps the next action.

5. Tone
Remove harsh/internal wording:
- "forcing her"
- "checklist non-adoption"
- anything that sounds like prompt/system language
Use normal manager language.

6. Scores
Check whether wellbeing/engagement/clarity/growth scoring is useful here. If evidence is weak, prefer "not enough signal" over numeric-looking confidence.

Output format:

A. Confirmed issues from this run
Only list issues grounded in the run.

B. Prompt fixes
For each issue:
- file/stage likely affected
- exact rule to add/change
- why it fixes the issue

C. Engine/data fixes
Only include if prompt changes are not enough.

D. What NOT to change
Protect anything that worked well.

E. Final recommendation
Give me the smallest safe fix set for the next run.`;function q({ctx:t,payload:e,sessionDir:n}){var l,g,f;const o=["## Run context",""],s=String((t==null?void 0:t.name)||"").trim(),r=String((t==null?void 0:t.role)||"").trim(),u=String((t==null?void 0:t.seniority)||"").trim(),a=String((t==null?void 0:t.meetingType)||"").trim();s&&o.push(`**Report:** ${s}`),r&&o.push(`**Role:** ${r}`),u&&o.push(`**Seniority:** ${u}`),a&&o.push(`**Meeting type:** ${a}`),e.sessionId&&o.push(`**Session ID:** ${e.sessionId}`),n&&o.push(`**Log folder (absolute):** ${n}`),e.logDirCopy&&o.push(`**Log folder (relative):** ${e.logDirCopy}`),e.reviewrunTip&&o.push(`**Review command:** ${e.reviewrunTip}`),o.push(""),o.push("**Pipeline on disk:**"),o.push(((l=e.tree)==null?void 0:l.root)||e.logDir||"");for(const d of((g=e.tree)==null?void 0:g.lines)||[])o.push(`${d.prefix} ${d.text}`);o.push("");const c=e.apiDuration||{},i=`**API time:** ${c.label||"—"}`;if(o.push(c.callCount?`${i} (${c.callCount} call${c.callCount===1?"":"s"})`:i),e.hasWallClock&&((f=e.wallDuration)!=null&&f.label)&&o.push(`**Wall clock:** ${e.wallDuration.label}`),e.noteCount>0){o.push(""),o.push("**Testing notes captured during run:**");for(const d of e.notes||[])o.push(`- [${d.time}] ${d.stageLabel}: ${d.text}`);e.notesMdPath&&o.push(`**Notes file:** ${e.notesMdPath}`)}return o.push(""),o.join(`
`)}function B({ctx:t,payload:e,sessionDir:n}){return`${q({ctx:t,payload:e,sessionDir:n})}
${O}`}function Q({sessionId:t,sessionDir:e,notes:n=[],cost:o,createdAt:s,completedAt:r,meetingType:u,surface:a="web"}){const c=E(e,t),i=c.endsWith("/")?c:`${c}/`,l=D(u),g=`node scripts/smoke-test.js ${l}`,f=`npm run smoke
${g}`,{root:d,lines:m}=L(i,a),p=I(n),_=x(o),b=T(s,r);return{sessionId:t||"",logDir:i,logDirCopy:i.replace(/\/$/,""),smokeScenario:l,smokeNpm:"npm run smoke",smokeNode:g,smokeCommandBlock:f,tree:{root:d,lines:m},notes:p,noteCount:p.length,apiDuration:_,wallDuration:b,hasWallClock:Number.isFinite(s)&&Number.isFinite(r),reviewrunTip:`/reviewrun ${i.replace(/\/$/,"")}`,notesMdPath:`${i}notes.md`,surface:a,cost:o||null}}const W=Object.freeze(Object.defineProperty({__proto__:null,STAGE_LABEL:C,buildQaReviewPrompt:B,buildRunDebriefPayload:Q,durationFromCost:x,folderTreeLines:L,formatDebriefNotes:I,relativeLogDir:E,suggestSmokeScenario:D,wallDuration:T},Symbol.toStringTag,{value:"Module"})),{buildRunDebriefPayload:G,buildQaReviewPrompt:H}=W;async function k(t,e){try{if(await navigator.clipboard.writeText(t),e){const n=e.getAttribute("aria-label");e.classList.add("is-copied"),e.setAttribute("aria-label","Copied"),setTimeout(()=>{e.classList.remove("is-copied"),n&&e.setAttribute("aria-label",n)},1200)}}catch(n){console.warn("[run-debrief] clipboard failed:",n.message)}}function $(t,e){const n=document.createElement("button");return n.type="button",n.className="btn btn--ghost btn--sm",n.textContent=t,n.addEventListener("click",()=>k(e(),n)),n}function w(t,e,n){const o=document.createElement("div");return o.className="run-log__stat card-flat",o.innerHTML=`
    <div class="caption run-log__stat-label">${h(t)}</div>
    <div class="run-log__stat-value num-tabular">${h(e)}</div>
    <div class="caption run-log__stat-sub">${h(n)}</div>
  `,o}function A(t,e){var n;return G({sessionId:t.sessionId,sessionDir:t.sessionDir,notes:t.notes||[],cost:e==null?void 0:e.cost,createdAt:t.createdAt,completedAt:(e==null?void 0:e.completedAt)??t.completedAt,meetingType:(n=t.ctx)==null?void 0:n.meetingType,surface:"web"})}function U(t,e){const n=A(t,e);return H({ctx:t.ctx,payload:n,sessionDir:t.sessionDir})}function K(t,e){if(!t||!e)return;const n=document.createElement("section");n.className="run-log reveal-soft",n.setAttribute("aria-labelledby","run-log-title"),n.innerHTML=`
    <header class="run-log__head">
      <div class="run-log__head-left">
        <div id="run-log-title" class="eyebrow">Session review</div>
        <div class="run-log__id num-tabular"></div>
      </div>
      <div class="run-log__actions"></div>
    </header>
    <div class="run-log__stats"></div>
    <div class="run-log__grid">
      <div class="run-log__block run-log__block--retest">
        <div class="run-log__block-label">CLI replay</div>
        <p class="run-log__disclaimer">Replays a scenario file through the CLI — not this session's live answers.</p>
        <div class="run-log__commands" role="group" aria-label="Smoke test commands"></div>
        <div class="run-log__scenario-pill caption"></div>
      </div>
      <div class="run-log__block run-log__block--folder">
        <div class="run-log__block-label">Log on disk</div>
        <button type="button" class="run-log__path num-tabular"></button>
        <p class="caption text-ink-mute">Click path to copy — open in your file manager</p>
        <div class="run-log__tree" aria-label="Log folder structure"></div>
      </div>
    </div>
    <div class="run-log__notes-wrap"></div>
    <button type="button" class="run-log__tip caption"></button>
  `,n.querySelector(".run-log__id").textContent=e.sessionId||"—";const o=n.querySelector(".run-log__actions");o.appendChild($("Copy path",()=>e.logDirCopy)),o.appendChild($("Copy test",()=>e.smokeCommandBlock));const s=n.querySelector(".run-log__stats"),r=e.apiDuration;s.appendChild(w("API time",r.label,r.callCount?`${r.callCount} call${r.callCount===1?"":"s"}`:"—")),s.appendChild(w("Wall clock",e.hasWallClock?e.wallDuration.label:"—",e.hasWallClock?"session":"after eval")),s.appendChild(w("Notes",e.noteCount?String(e.noteCount):"0",e.noteCount?"notes.md":"none")),e.cost&&s.appendChild(w("Session cost (dev)",z(e.cost.usd_total),`${J(e.cost.total_tokens)} tokens · ${e.cost.call_count} call${e.cost.call_count===1?"":"s"}`));const u=n.querySelector(".run-log__commands"),a=document.createElement("div");a.className="run-log__cmd-line",a.textContent=e.smokeNpm;const c=document.createElement("div");c.className="run-log__cmd-line",c.textContent=e.smokeNode,u.appendChild(a),u.appendChild(c);const i=n.querySelector(".run-log__scenario-pill");i.textContent=e.smokeScenario;const l=n.querySelector(".run-log__path");l.textContent=e.tree.root,l.title="Copy log folder path",l.addEventListener("click",()=>k(e.logDirCopy,l));const g=n.querySelector(".run-log__tree");for(const m of e.tree.lines){const p=document.createElement("div");p.className=`run-log__tree-line${m.isStage?" run-log__tree-line--stage":""}`,p.innerHTML=`<span class="run-log__tree-prefix">${m.prefix}</span> ${h(m.text)}`,g.appendChild(p)}const f=n.querySelector(".run-log__notes-wrap");if(e.noteCount>0){const m=document.createElement("div");m.className="run-log__notes card-flat",m.innerHTML='<div class="run-log__block-label">Your notes</div>';const p=document.createElement("div");p.className="run-log__notes-list";for(const b of e.notes){const v=document.createElement("div");v.className="run-log__note-row",v.title=b.title,v.innerHTML=`
        <span class="run-log__note-time caption num-tabular">${h(b.time)}</span>
        <span class="run-log__note-stage">${h(b.stageLabel)}</span>
        <span class="run-log__note-text">${h(b.text)}</span>
      `,p.appendChild(v)}m.appendChild(p);const _=document.createElement("p");_.className="caption run-log__notes-foot",_.textContent=`Saved to ${e.notesMdPath}`,m.appendChild(_),f.appendChild(m)}else{const m=document.createElement("p");m.className="run-log__notes-empty caption",m.textContent="No notes captured — use the notes panel during the run.",f.appendChild(m)}const d=n.querySelector(".run-log__tip");d.textContent=`Tip: ${e.reviewrunTip}`,d.title="Copy reviewrun command",d.addEventListener("click",()=>k(e.reviewrunTip,d)),t.appendChild(n),requestAnimationFrame(()=>n.classList.add("is-in"))}function z(t){return t==null||Number.isNaN(t)?"—":t<.01?`$${t.toFixed(4)}`:t<1?`$${t.toFixed(3)}`:`$${t.toFixed(2)}`}function J(t){return t?t<1e3?`${t}`:t<1e6?`${(t/1e3).toFixed(1)}k`:`${(t/1e6).toFixed(2)}M`:"0"}async function X(t,{store:e,setState:n,resetSession:o}){t.innerHTML=`
    <div class="stage-wide l-stack l-stack--6">
      <header class="page-header">
        <div class="eyebrow">Session review</div>
        <h1 class="h1">How this run went</h1>
        <p class="text-ink-dim text-sm">API time = model calls only · wall clock = your full session length</p>
      </header>
      <div class="run-debrief-mount"></div>
      <footer class="pt-2 l-cluster l-cluster--2 items-center">
        <button type="button" class="btn js-copy-prompt">Copy QA prompt</button>
        <button type="button" class="btn btn--ghost js-continue">Continue to phrase library</button>
        <span class="js-copy-confirm text-sm text-ink-mute" style="opacity:0; transition: opacity 0.2s;">Copied ${F(M,{size:16})}</span>
      </footer>
    </div>
  `;const s=t.querySelector(".run-debrief-mount"),r=A(e,e.briefing);K(s,r);const u=t.querySelector(".js-continue"),a=t.querySelector(".js-copy-prompt"),c=t.querySelector(".js-copy-confirm");a.addEventListener("click",async()=>{const i=U(e,e.briefing);try{await navigator.clipboard.writeText(i),c.style.opacity="1",setTimeout(()=>{c.style.opacity="0"},1500)}catch(l){console.warn("[run-debrief] clipboard write failed:",l.message)}}),u.addEventListener("click",async()=>{let i=!1;try{const l=await S(e.sessionId);i=!!(l!=null&&l.eligible)}catch(l){console.warn("[run-debrief] lexicon scope check failed:",l.message)}if(i){n({stage:y.LEXICON_REVIEW});return}o(),n({stage:y.START})});try{const i=await S(e.sessionId);i!=null&&i.eligible||(u.textContent="Done")}catch{u.textContent="Done"}}function Z(){}export{X as mount,Z as unmount};
//# sourceMappingURL=run-debrief-Z7tvGl5M.js.map
