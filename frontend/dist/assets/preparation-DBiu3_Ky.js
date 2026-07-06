import{F as A,S as c,H as d,f as S,p as T}from"./index-CamYUUDR.js";import{c as I,o as L}from"./orb-BvJ65ChT.js";import{a as _}from"./reveal-CdKVaBU1.js";import{c as E}from"./session-reset-Bf8TMvyi.js";import{C as P}from"./check-GyDbZBob.js";async function D(a,{store:t,setState:s}){const p=t.sessionId;a.innerHTML=`
    <div class="stage-medium l-stack l-stack--8">
      <header class="page-header">
        <div class="eyebrow">Prep brief</div>
        <div class="page-header__row">
          <h1 class="h1">What to walk in with</h1>
          <button class="btn btn--ghost js-start-fresh" type="button">Reset session</button>
        </div>
        <p class="text-ink-dim text-sm">The core issue, your opener, and what to listen for.</p>
      </header>
      <div class="thinking-host min-h-[120px] flex items-center"></div>
      <div class="result-host"></div>
    </div>
  `;const o=a.querySelector(".thinking-host"),l=a.querySelector(".result-host");a.querySelector(".js-start-fresh").addEventListener("click",async()=>{await E(S)&&(A(),s({stage:c.START}))});const y=I("Preparing your prep brief…");o.appendChild(y.el);const r=L(`/api/v1/sessions/${encodeURIComponent(p)}/preparation/stream`);r.on("thinking",n=>y.setLabel(n.label)).on("result",async n=>{await y.exit(),o.remove(),s({preparation:n.brief,preparationRunId:n.runId}),h(n.brief)}).on("error",n=>{s({stage:c.ERROR,error:n.message||"Preparation briefing failed.",retryStage:c.PREPARATION})}).onError(()=>{s({stage:c.ERROR,error:"Lost connection while generating the prep brief.",retryStage:c.PREPARATION})}).open();function h(n){const $=[{label:"Likely theme",key:"coreIssue",type:"paragraph"},{label:"How sure is this",key:"confidence",type:"paragraph"},{label:"Don't assume yet",key:"dontAssume",type:"paragraph"},{label:"Say this first",key:"openingQuestion",type:"callout"},{label:"Listen for",key:"listenFor",type:"bullets"},{label:"Avoid",key:"avoid",type:"bullets"},{label:"Success looks like",key:"goodOutcome",type:"paragraph"},{label:"Suggested action",key:"suggestedAction",type:"paragraph"}].filter(e=>{const i=n[e.key];return Array.isArray(i)?i.length:i&&String(i).trim()});function q(e,i){return e==="bullets"&&Array.isArray(i)?`<ul class="prep-list">${i.map(f=>`<li>${d(f)}</li>`).join("")}</ul>`:e==="callout"?`<blockquote class="prep-callout">${d(i||"")}</blockquote>`:`<p class="text-ink leading-relaxed">${d(i||"")}</p>`}const u=[],g=String(n.suggestedAction||"").trim();g&&u.push({when:"Before you go in",body:g});const b=String(n.openingQuestion||"").trim();b&&u.push({when:"Open with",body:b,quote:!0});const v=(n.listenFor||[]).filter(Boolean);v.length&&u.push({when:"Then listen for",list:v});const k=String(n.goodOutcome||"").trim();k&&u.push({when:"Aim to leave with",body:k});const R=u.length?`
        <div class="reveal">
          <div class="eyebrow mb-2">At a glance — your first move</div>
          <ol class="prep-timeline">
            ${u.map((e,i)=>`
              <li class="prep-timeline__step">
                <div class="prep-timeline__num">${i+1}</div>
                <div class="prep-timeline__body">
                  <div class="prep-timeline__when">${e.when}</div>
                  ${e.quote?`<blockquote class="prep-callout">${d(e.body)}</blockquote>`:e.list?`<ul class="prep-list">${e.list.map(f=>`<li>${d(f)}</li>`).join("")}</ul>`:`<p class="text-ink leading-relaxed">${d(e.body)}</p>`}
                </div>
              </li>`).join("")}
          </ol>
        </div>`:"";l.innerHTML=`
      <div class="space-y-6">
        <div class="briefing-section-head reveal">
          <div class="eyebrow">Prep brief ready</div>
          <button type="button" class="btn btn--ghost btn--sm js-copy-all-prep">Copy all</button>
        </div>
        ${R}
        <details class="prep-full reveal pt-2"${u.length?"":" open"}>
          <summary class="prep-full__summary eyebrow">Full brief</summary>
          <div class="card prep-brief mt-2">
            ${$.map(e=>`
              <div class="prep-brief__row">
                <div class="eyebrow">${e.label}</div>
                ${q(e.type,n[e.key])}
              </div>
            `).join("")}
          </div>
        </details>
        <div class="l-cluster l-cluster--2 pt-2 reveal">
          <button class="btn js-continue">Generate interview questions</button>
          <button class="btn btn--ghost js-restart">New session</button>
        </div>
      </div>
    `;const j=Array.from(l.querySelectorAll(".reveal"));_(j,{stagger:80,initialDelay:80}),l.querySelector(".js-copy-all-prep").addEventListener("click",()=>{H(n,t.ctx,l.querySelector(".js-copy-all-prep"))}),l.querySelector(".js-continue").addEventListener("click",()=>{s({stage:c.BANK})}),l.querySelector(".js-restart").addEventListener("click",async()=>{if(await E(S,{to:c.INTAKE})){try{localStorage.removeItem("seroSessionId")}catch{}A(),s({sessionId:null,stage:c.INTAKE,substage:"NAME"})}});function w(e){if(!(e.metaKey||e.ctrlKey||e.altKey)&&e.key==="Enter"){const i=l.querySelector(".js-continue");i&&!i.disabled&&i.click()}}document.addEventListener("keydown",w),m=()=>{r.close(),document.removeEventListener("keydown",w)}}m=()=>r.close()}let m=null;function Q(){m&&m(),m=null}const C=[{label:"Likely theme",key:"coreIssue"},{label:"How sure is this",key:"confidence"},{label:"Don't assume yet",key:"dontAssume"},{label:"Say this first",key:"openingQuestion"},{label:"Listen for",key:"listenFor"},{label:"Avoid",key:"avoid"},{label:"Success looks like",key:"goodOutcome"},{label:"Suggested action",key:"suggestedAction"}];function O(a,t){const s=["Pre-meeting brief"],p=[t==null?void 0:t.name,t==null?void 0:t.role,t==null?void 0:t.seniority,t==null?void 0:t.meetingType].filter(Boolean).join(" · ");p&&s.push(p);const o=((t==null?void 0:t.notes)||"").trim();o&&s.push("","Context notes",o),s.push("");for(const{label:l,key:y}of C){const r=a[y];r!=null&&(Array.isArray(r)&&!r.length||!Array.isArray(r)&&!String(r).trim()||(s.push(l),Array.isArray(r)?r.forEach(h=>s.push(`- ${h}`)):s.push(String(r).trim()),s.push("")))}return s.join(`
`).trim()}async function H(a,t,s){const p=O(a,t);if(p)try{await navigator.clipboard.writeText(p);const o=s.textContent;s.innerHTML="Copied "+T(P,{size:16}),setTimeout(()=>{s.textContent=o},1500)}catch(o){console.warn("[preparation] clipboard write failed:",o.message)}}export{D as mount,Q as unmount};
//# sourceMappingURL=preparation-DBiu3_Ky.js.map
