import{A as j,S as u,C as d,I as R,D as C,f as T,p as E}from"./index-D93BFPRu.js";import{c as $,o as q}from"./orb-BvJ65ChT.js";import{a as L}from"./reveal-CdKVaBU1.js";import{c as A}from"./session-reset-DdQ5WOmY.js";import{C as P}from"./check-GyDbZBob.js";async function U(n,{store:e,setState:t}){const a=e.sessionId;n.innerHTML=`
    <div class="stage-inner l-stack l-stack--8">
      <header class="page-header">
        <div class="eyebrow">Focus areas</div>
        <div class="page-header__row">
          <h1 class="h1">What we'll cover</h1>
          <button class="btn btn--ghost js-start-fresh" type="button">Reset session</button>
        </div>
        <p class="text-ink-dim text-sm">Pick what this 1:1 should cover.</p>
      </header>
      <div class="thinking-host min-h-[120px] flex items-center"></div>
      <div class="result-host"></div>
    </div>
  `;const i=n.querySelector(".thinking-host"),o=n.querySelector(".result-host");n.querySelector(".js-start-fresh").addEventListener("click",async()=>{await A(T)&&(j(),t({stage:u.START}))});const v=$("Analyzing context…");i.appendChild(v.el);const y=e.regenerateFocusPoints;y&&t({regenerateFocusPoints:!1});const S=y?"?regenerate=1":"",p=q(`/api/v1/sessions/${encodeURIComponent(a)}/focus-points/stream${S}`);p.on("thinking",r=>v.setLabel(r.label)).on("result",async r=>{await v.exit(),i.remove(),k(r)}).on("error",r=>{t({stage:u.ERROR,error:r.message||"Focus-point generation failed.",retryStage:u.FOCUS_POINTS})}).onError(()=>{t({stage:u.ERROR,error:"Lost connection while generating focus areas.",retryStage:u.FOCUS_POINTS})}).open();function k(r){var b;e.focusPoints=r.focus_points,e.preparation=null,e.preparationRunId=null;const l=new Set;o.innerHTML=`
      <div class="space-y-1 mb-6 reveal">
        <div class="ctx-segments focus-ctx text-ink-dim"></div>
      </div>
      <div class="card-flat space-y-2 mb-5 reveal">
        <div class="eyebrow">What Sero should know</div>
        <p class="text-sm text-ink-dim">${d(((b=e.ctx)==null?void 0:b.notes)||"(no manager context provided)")}</p>
      </div>
      ${e.scripted?'<div class="focus-select-hint reveal">Choose what the prep brief should emphasize. Replay questions stay fixed.</div>':'<div class="focus-select-hint reveal">Select at least one topic for this 1:1.</div>'}
      <div class="card reveal focus-point-list">
        ${r.focus_points.map((s,c)=>`
          <div class="js-fp-wrapper">
            <button type="button" class="focus-point focus-point--selectable js-fp-toggle" data-fp-id="${d(s.id)}" aria-pressed="false" title="${d(s.reason||"")}">
              <div class="focus-point__num">${c+1}</div>
              <div class="focus-point__body">
                <div class="focus-point__label">${d(s.label||s.type||s.id)}</div>
                ${s.reason?`<div class="focus-point__reason">${d(F(s.reason))}</div>`:""}
                ${I(s)}
              </div>
              <div class="focus-point__check" aria-hidden="true"></div>
            </button>
          </div>
        `).join("")}
      </div>
      <div class="l-cluster l-cluster--2 pt-6 reveal focus-actions">
        <button class="btn js-continue">Continue to prep brief</button>
        <button type="button" class="btn btn--ghost js-copy-focus">Copy focus areas</button>
        <button class="btn btn--ghost js-regen">Regenerate focus areas</button>
      </div>
    `;const w=o.querySelector(".focus-ctx");R(w,{...e.ctx,meetingType:r.meeting_type||e.ctx.meetingType});function h(){const s=o.querySelector(".js-continue");s&&(s.disabled=l.size===0)}o.querySelectorAll(".js-fp-toggle").forEach(s=>{s.addEventListener("click",()=>{const c=s.dataset.fpId;l.has(c)?(l.delete(c),s.classList.remove("is-selected"),s.setAttribute("aria-pressed","false")):(l.add(c),s.classList.add("is-selected"),s.setAttribute("aria-pressed","true")),h()})});const _=Array.from(o.querySelectorAll(".reveal"));L(_,{stagger:60,initialDelay:80});function g(s){if(!(s.metaKey||s.ctrlKey||s.altKey)&&s.key==="Enter"){const c=o.querySelector(".js-continue");c&&!c.disabled&&c.click()}}document.addEventListener("keydown",g),f=()=>{p.close(),document.removeEventListener("keydown",g)},h(),o.querySelector(".js-continue").addEventListener("click",async()=>{const s=Array.from(l);if(!s.length)return;const c=o.querySelector(".js-continue");c.disabled=!0;try{await C(a,s)}catch(m){console.warn("[focus-points] selected focus save failed:",m.message)}e.focusPoints=r.focus_points.filter(m=>l.has(m.id)),t({stage:u.PREPARATION})}),o.querySelector(".js-copy-focus").addEventListener("click",()=>{O(r.focus_points,e.ctx,o.querySelector(".js-copy-focus"))}),o.querySelector(".js-regen").addEventListener("click",()=>{p.close(),t({regenerateFocusPoints:!0,stageTick:e.stageTick+1,focusPoints:null,preparation:null,preparationRunId:null})})}f=()=>p.close()}let f=null;function W(){f&&f(),f=null}function F(n){var a;const e=String(n??"").trim();return e?((a=e.match(/^(.+?[.!?])(?:\s|$)/))==null?void 0:a[1])||e:""}function I(n){return!n||!n.source?"":`<div class="focus-point__evidence text-xs text-ink-mute">${n.source==="signal"?n.confidence==="high"?"from your note, clearly stated":"from your note":"common for this level"}</div>`}function x(n,e){const t=["What we'll cover"],a=[e==null?void 0:e.name,e==null?void 0:e.seniority,e==null?void 0:e.role,e==null?void 0:e.meetingType].filter(Boolean).join(" · ");return a&&t.push(a),t.push(""),n.forEach((i,o)=>{t.push(`${o+1}. ${i.label||i.type||i.id}`),i.reason&&t.push(String(i.reason).trim()),t.push("")}),t.join(`
`).trim()}async function O(n,e,t){const a=x(n,e);if(a)try{await navigator.clipboard.writeText(a);const i=t.textContent;t.innerHTML="Copied "+E(P,{size:16}),setTimeout(()=>{t.textContent=i},1500)}catch(i){console.warn("[focus-points] clipboard write failed:",i.message)}}export{U as mount,W as unmount};
//# sourceMappingURL=focus-points-Ci2GxKb0.js.map
