import{b as oe,s as r,S as k,g as le,c as O,e as i,d as I,f as ce,h as de,j as ue,k as pe,n as fe,o as he,p as me}from"./index-D93BFPRu.js";import{f as be}from"./time-C7qwLehH.js";import{C as we}from"./check-GyDbZBob.js";let _=null;async function Se(n,{setState:m,rehydrateById:b}){var P;const w=oe(r.user);n.innerHTML=`
    <div class="stage-inner l-stack l-stack--8">
      <header class="page-header">
        <h1 class="h1">Start a 1:1 prep session</h1>
        <div class="text-ink-dim text-sm">Resume a session or start a new one.</div>
        <div class="field__actions">
          ${w?'<button type="button" class="btn js-onepage">One-page run</button>':`<button type="button" class="btn js-startnew">Start a new session</button>
               <button type="button" class="btn btn--ghost js-onepage">One-page run</button>`}
        </div>
      </header>

      <section class="js-bench" hidden>
        <div class="card-flat space-y-3">
          <div>
            <div class="eyebrow">Demo persona</div>
            <p class="text-ink-dim text-sm mt-1">Sample employee context — or leave blank for your own setup.</p>
          </div>
          <div class="bench-select-wrap">
            <select class="bench-select js-bench-select" aria-label="Demo persona" disabled>
            <option value="">Select a persona…</option>
            </select>
          </div>
          <div class="js-persona-review card-flat space-y-2" hidden>
            <div class="eyebrow js-persona-review-title">Session setup</div>
            <div class="text-sm text-ink js-persona-summary"></div>
            <div>
              <div class="eyebrow">What Sero should know</div>
              <p class="text-sm text-ink-dim js-persona-notes"></p>
            </div>
            <p class="text-sm text-ink-mute js-persona-footer"></p>
          </div>
          <div class="space-y-2">
            <div class="eyebrow">How to run</div>
            <p class="text-ink-dim text-sm">Manual or scripted replay — each persona supports both.</p>
          </div>
          <div class="bench-flows" role="radiogroup" aria-label="Demo run flow">
            <button type="button" class="bench-flow js-mode is-active" data-mode="manual" role="radio" aria-checked="true">
              <span class="bench-flow__pick" aria-hidden="true"></span>
              <span class="bench-flow__head">
                <span class="bench-flow__title">Manual</span>
                <span class="bench-flow__tag">You drive</span>
              </span>
              <span class="bench-flow__desc">Answer each question yourself, like a real 1:1 prep session.</span>
              <span class="bench-flow__meta">No persona? Continue to setup and fill everything in yourself.</span>
            </button>
            <button type="button" class="bench-flow js-mode" data-mode="scripted" role="radio" aria-checked="false">
              <span class="bench-flow__pick" aria-hidden="true"></span>
              <span class="bench-flow__head">
                <span class="bench-flow__title">Replay test run</span>
                <span class="bench-flow__tag">Fixed script</span>
              </span>
              <span class="bench-flow__desc">Uses fixed questions and fixed answers so prompt changes are comparable.</span>
              <span class="bench-flow__meta">Focus, prep, and final briefing still run live.</span>
            </button>
          </div>
          <label class="js-runlabel-wrap" hidden>
            <span class="eyebrow">What are you testing? <span class="text-ink-mute">(optional label)</span></span>
            <input class="input js-runlabel" type="text" autocomplete="off" placeholder="e.g. baseline — no Neutral Cause Rule" />
          </label>
          <button type="button" class="btn js-bench-start" disabled>Start demo session</button>
          <p class="js-bench-err text-negative text-sm" hidden></p>
        </div>
      </section>

      <section class="space-y-2">
        <div class="eyebrow">Recent sessions</div>
        <ul class="js-runs space-y-2"></ul>
      </section>
    </div>
  `;const d=n.querySelector(".js-runs"),R=n.querySelector(".js-bench"),p=n.querySelector(".js-bench-select"),v=n.querySelector(".js-bench-start"),$=n.querySelector(".js-bench-err"),E=[...n.querySelectorAll(".js-mode")],F=n.querySelector(".js-runlabel-wrap"),W=n.querySelector(".js-runlabel"),G=n.querySelector(".js-persona-review"),U=n.querySelector(".js-persona-review-title"),Y=n.querySelector(".js-persona-summary"),z=n.querySelector(".js-persona-notes"),K=n.querySelector(".js-persona-footer");let o="manual",y=[],u=[],a=null,x=null;async function V(){var e,t;try{const s=await O("latest");x=((t=(e=s==null?void 0:s.current)==null?void 0:e.aggregates)==null?void 0:t.all)??null}catch(s){console.warn("[start] pipeline status failed:",s),x=null}}function Z(e){var t;return!x||!((t=e.pipelineDigest)!=null&&t.all)?"":e.pipelineDigest.all!==x?'<span class="run-row__drift-dot" title="Engine updated since this run"></span>':""}function J(e){const t=[];for(const h of e.groups||[])if(h.id==="content"||h.id==="engine")for(const c of h.changes||[])c.stageLabel&&!t.includes(c.stageLabel)&&t.push(c.stageLabel);else if(h.id==="models"){const c="Which AI models are used";t.includes(c)||t.push(c)}if(t.length===0)return"Minor version change only — nothing in how this prep is built changed.";const s=t.slice(0,3),f=t.length-s.length;let l=s.join(", ");return f>0&&(l+=`, and ${f} more`),l}function Q(e){return e.reviewStatus==="complete"?` <span class="run-row__review run-row__review--done" title="Reviewed">Reviewed ${me(we,{size:16})}</span>`:e.reviewStatus==="partial"?' <span class="run-row__review run-row__review--partial" title="Review in progress">Review · partial</span>':""}function S(){if(u.length===0){d.innerHTML='<li class="text-ink-mute text-sm">No past sessions yet. Press <kbd class="kbd">Enter</kbd> or click <strong>New session</strong> to start.</li>';return}d.innerHTML=u.map(e=>{const t=a===e.id;return`
      <li class="run-row" data-id="${i(e.id)}">
        <button class="run-row__head js-row" data-id="${i(e.id)}" aria-expanded="${t}">
          <span class="run-row__chevron" aria-hidden="true">${t?"▼":"▶"}</span>
          <span class="run-row__headline">${i(e.headline||e.id)}${Z(e)}${Q(e)}</span>
          <span class="run-row__meta text-ink-mute text-sm">${i(ve(e.lastSeenAt))} · ${i(he(e.stage))}</span>
        </button>
        <div class="run-row__body js-body" data-id="${i(e.id)}" hidden></div>
      </li>
    `}).join("")}async function T(){try{u=(await ue(3)).runs||[]}catch(e){u=[],console.warn("[start] listRecentRuns failed:",e)}await V(),S()}async function C(e){var s;if(a===e){L(e),a=null,S();return}a&&L(a),a=e,S();const t=d.querySelector(`.js-body[data-id="${H(e)}"]`);if(t){t.hidden=!1,t.innerHTML='<div class="text-ink-mute text-sm">Loading…</div>';try{const f=await le(e),l=u.find(g=>g.id===e),h=(l==null?void 0:l.stage)==="BRIEFING";let c="";try{const g=await O(e);(s=g.baseline)!=null&&s.hasLock&&!g.unchanged&&(c=`
            <div class="run-row__drift text-sm">
              <span>${i(h?"This run was made with an older engine version. Reviewing shows the saved result as-is.":"The engine changed since this session paused. Continuing will use the current engine, so the rest may not match the earlier part.")}</span>
              <details class="run-row__drift-details">
                <summary>What changed</summary>
                <p class="run-row__drift-list">${i(J(g))}</p>
              </details>
            </div>`)}catch{}t.innerHTML=`
        <div class="run-row__overview text-ink text-sm">${i(f.overview||"")}</div>
        ${c}
        <div class="run-row__actions">
          ${h?`<button class="btn js-review" data-id="${i(e)}">Review</button>`:`<button class="btn js-resume" data-id="${i(e)}">Resume</button>`}
          <button class="btn btn--ghost js-delete" data-id="${i(e)}">Delete</button>
        </div>
      `}catch{t.innerHTML='<div class="text-ink-mute text-sm">Failed to load overview.</div>'}}}function L(e){const t=d.querySelector(`.js-body[data-id="${H(e)}"]`);t&&(t.hidden=!0,t.innerHTML="")}async function q(e){await b(e)||await I({message:"Could not resume that session. It may have been deleted or expired."})}function N(e){m({reviewRunId:e,stage:k.REVIEW_RUN})}async function D(e){if(await ce({message:"Delete this session permanently? This cannot be undone.",confirmLabel:"Delete session",cancelLabel:"Keep session",destructive:!0})){try{await de(e)}catch(s){await I({message:"Delete failed: "+(s.message||s)});return}a===e&&(a=null),await T()}}const M=()=>({name:"",role:"",seniority:"",meetingType:"",meetingTypeIndex:null,notes:""});function A(){r.scripted=null,Object.assign(r.ctx,M()),m({sessionId:null,stage:k.INTAKE,substage:"NAME"})}function B(){A()}function X(){r.scripted=null,Object.assign(r.ctx,M()),m({sessionId:null,stage:k.ONEPAGE})}function ee(e){return`${e.displayName} · ${e.issue}`}function te(e){return`${e.displayName} · ${e.seniority} · ${e.meeting_type} · ${e.issue}`}function j(){const e=!!p.value,t=y.length>0;o==="scripted"?(v.disabled=!e||!t,v.textContent="Start replay test"):(v.disabled=!t,v.textContent=e?"Start demo session":"Continue to setup"),se()}function se(){const e=y.find(s=>s.id===p.value),t=!!e;G.hidden=!t,!(!t||!e)&&(U.textContent=o==="scripted"?"Replay setup":"Session setup",Y.textContent=`${e.displayName} · ${e.seniority} · ${e.role} · ${e.meeting_type}`,z.textContent=e.notes||"(no manager context provided)",K.textContent=o==="scripted"?"This locks the interview questions and scripted answers. You will still review focus areas, prep, and the final briefing.":"Setup context is pre-filled. You'll answer each question yourself.")}async function ne(){try{y=(await pe()).personas||[],p.innerHTML='<option value="">Select a persona…</option>'+y.map(t=>`<option value="${i(t.id)}" title="${i(te(t))}">${i(ee(t))}</option>`).join(""),p.disabled=y.length===0,R.hidden=!1,$.hidden=!0,j()}catch(e){console.warn("[start] getPersonaBench failed:",e),$.textContent="Couldn't load demo personas.",$.hidden=!1,R.hidden=!1}}async function ae(){const e=y.find(t=>t.id===p.value);if(!(!e||e.meetingTypeIndex<0)){v.disabled=!0;try{r.ctx.name=e.name,r.ctx.role=e.role,r.ctx.seniority=e.seniority,r.ctx.meetingTypeIndex=e.meetingTypeIndex,r.ctx.meetingType=e.meeting_type,r.ctx.notes=e.notes,r.scripted=o==="scripted"?{mode:"scripted",personaId:e.id,fallback:e.scripted_fallback||"",answers:Object.fromEntries((e.script||[]).map(s=>[s.alias,s.answer]))}:null;const t=await fe({name:e.name,role:e.role,seniority:e.seniority,meetingTypeIndex:e.meetingTypeIndex,notes:e.notes,mode:o,runLabel:o==="scripted"?W.value:null,personaId:e.id});try{localStorage.setItem("seroSessionId",t.sessionId)}catch{}m({sessionId:t.sessionId,sessionDir:t.sessionDir||null,createdAt:t.createdAt??Date.now(),stage:k.FOCUS_POINTS})}catch(t){await I({message:"Could not start session: "+(t.message||t)})}finally{j()}}}function ie(e){o=e==="scripted"?"scripted":"manual",E.forEach(t=>{const s=t.dataset.mode===o;t.classList.toggle("is-active",s),t.setAttribute("aria-checked",String(s))}),F.hidden=o!=="scripted",j()}async function re(){if(o==="manual"&&!p.value){A();return}await ae()}n.querySelector(".js-onepage").addEventListener("click",X),(P=n.querySelector(".js-startnew"))==null||P.addEventListener("click",B),p.addEventListener("change",j),v.addEventListener("click",re),E.forEach(e=>e.addEventListener("click",()=>ie(e.dataset.mode))),d.addEventListener("click",e=>{const t=e.target.closest(".js-row");if(t){C(t.dataset.id);return}const s=e.target.closest(".js-resume");if(s){q(s.dataset.id);return}const f=e.target.closest(".js-review");if(f){N(f.dataset.id);return}const l=e.target.closest(".js-delete");if(l){D(l.dataset.id);return}}),_=e=>{if(!(e.target&&/^(input|textarea|select)$/i.test(e.target.tagName))){if(e.key==="Enter"){e.preventDefault(),B();return}if(e.key==="Escape"){a&&(L(a),a=null,S());return}if(/^[1-9]$/.test(e.key)){const t=Number(e.key)-1;u[t]&&C(u[t].id);return}if(a)if(e.key.toLowerCase()==="r"){const t=u.find(s=>s.id===a);(t==null?void 0:t.stage)==="BRIEFING"?N(a):q(a)}else e.key.toLowerCase()==="d"&&D(a)}},window.addEventListener("keydown",_),await Promise.all([T(),w?ne():Promise.resolve()])}function je(){_&&(window.removeEventListener("keydown",_),_=null)}function ve(n){if(!n)return"";const m=Date.now()-Number(n),b=Math.floor(m/6e4);if(b<1)return"just now";if(b<60)return`${b}m ago`;const w=Math.floor(b/60);if(w<24)return`${w}h ago`;const d=Math.floor(w/24);return d<7?`${d}d ago`:be(Number(n))}function H(n){return window.CSS&&CSS.escape?CSS.escape(n):String(n).replace(/[^a-zA-Z0-9_-]/g,"\\$&")}export{Se as mount,je as unmount};
//# sourceMappingURL=start-BcMTnkYT.js.map
