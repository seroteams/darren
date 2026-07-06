import{S as N,G as d,p as M,D as V,P as Q}from"./index-Lojh5UQc.js";import{c as X}from"./axes-d0BE7b8-.js";import{a as D,r as w,s as J}from"./reveal-CdKVaBU1.js";import{c as Z}from"./star-rating-CwHtAYYJ.js";import{C as ee}from"./check-GyDbZBob.js";import{C as te}from"./copy-eqjIEJPA.js";import"./star-6WkPOSOg.js";const W=["today","this week","this month","next 1:1"];async function he(e,{store:s,setState:n,resetSession:p}){var E;const r=s.briefing,i=!!s.skipBriefingAnimation;if(i&&n({skipBriefingAnimation:!1}),!r){e.innerHTML=`
      <div class="stage-inner l-stack l-stack--6">
        <h1 class="h1">Briefing not available</h1>
        <div class="error-card">
          <div class="text-ink-dim">This session has no saved briefing. You can restart evaluation or begin a new run.</div>
        </div>
        <div class="l-cluster l-cluster--2">
          <button class="btn js-retry-eval" type="button">Run evaluation again</button>
          <button class="btn btn--ghost js-restart" type="button">New session</button>
        </div>
      </div>
    `,e.querySelector(".js-retry-eval").addEventListener("click",()=>{n({stage:N.EVAL,error:null})}),e.querySelector(".js-restart").addEventListener("click",()=>{try{localStorage.removeItem("seroSessionId")}catch{}p(),n({stage:N.INTAKE,substage:"NAME"})});return}if(!i){const a=document.createElement("div");a.className="celebration-wash",document.body.appendChild(a),requestAnimationFrame(()=>a.classList.add("is-active")),setTimeout(()=>a.remove(),1600)}e.innerHTML=`
    <div class="stage-wide max-w-wide mx-auto briefing-page relative z-10 py-8">
      <header class="briefing-block space-y-4">
        <div class="briefing-section-head">
          <div class="eyebrow reveal">Briefing · For ${d(s.ctx.name)}</div>
          <button type="button" class="btn btn--ghost btn--sm js-copy-all-briefing">Copy all</button>
        </div>
        <h1 class="briefing-headline reveal"></h1>
      </header>

      <section class="briefing-block bullets-section space-y-3">
        <div class="eyebrow reveal">What stood out</div>
        <div class="card bullets-host"></div>
      </section>

      <div class="briefing-grid briefing-grid--pair">
        <section class="briefing-block paragraph-section space-y-3 reveal-soft">
          <div class="eyebrow">What we understood</div>
          <p class="briefing-prose paragraph-body"></p>
        </section>

        <section class="briefing-block axes-section space-y-4">
          <div class="eyebrow reveal" title="Scores reflect meaning in answers, not word count or typing style">Final read</div>
          <div class="card axes-mount"></div>
          <div class="axis-meanings space-y-2"></div>
        </section>
      </div>

      <section class="briefing-block brutal-host"></section>

      <section class="briefing-block engagement-section space-y-3 reveal-soft hidden">
        <div class="eyebrow">How engaged they seem</div>
        <div class="card engagement-host"></div>
      </section>

      <div class="briefing-grid briefing-grid--pair">
        <section class="briefing-block actions-section space-y-3">
          <div class="eyebrow reveal">What to do next</div>
          <div class="card actions-host"></div>
        </section>

        <section class="briefing-block watch-section space-y-3">
          <div class="briefing-section-head">
            <div class="eyebrow reveal">Reminders</div>
            <button type="button" class="btn btn--ghost btn--sm js-copy-all-reminders hidden">Copy all</button>
          </div>
          <div class="card watch-host"></div>
        </section>
      </div>

      ${s.scripted?`
      <section class="briefing-block verdict-block card space-y-3">
        <div class="eyebrow">Test lane · verdict</div>
        <div class="verdict-row">
          <button type="button" class="btn btn--ghost js-verdict" data-v="keep" aria-pressed="false">Keep</button>
          <button type="button" class="btn btn--ghost js-verdict" data-v="fix" aria-pressed="false">Fix</button>
          <button type="button" class="btn btn--ghost js-verdict" data-v="block" aria-pressed="false">Block</button>
        </div>
        <label class="block">
          <span class="eyebrow">Issue type</span>
          <select class="bench-select js-issue-type" aria-label="Issue type">
            <option value="">(none)</option>
            <option value="too_generic">too generic</option>
            <option value="wrong_level">wrong level</option>
            <option value="bad_tone">bad tone</option>
            <option value="over_inferred">over inferred</option>
            <option value="missed_focus">missed focus</option>
            <option value="weak_action">weak action</option>
          </select>
        </label>
        <label class="block">
          <span class="eyebrow">Note</span>
          <input class="input js-verdict-note" type="text" autocomplete="off" placeholder="what's wrong, in one line" />
        </label>
        <span class="js-verdict-confirm feedback-confirm text-sm text-ink-mute">Saved</span>
      </section>`:""}

      <footer class="briefing-finish pt-2 l-stack l-stack--2">
        ${s.scripted?"":`
        <div class="rate-inflow card-flat space-y-2 js-rate-inflow">
          <div class="eyebrow" id="rate-inflow-label">Did this help you run the 1:1?</div>
          <div class="l-cluster l-cluster--2 items-center">
            <div class="js-inflow-stars"></div>
            <button type="button" class="btn btn--ghost btn--sm js-rate-skip">Skip</button>
            <span class="js-rate-status text-sm text-ink-mute" role="status" aria-live="polite"></span>
          </div>
        </div>`}
        <div class="text-sm text-ink-mute">This run is complete and saved.</div>
        <div class="l-cluster l-cluster--2 items-center">
          <button class="btn js-restart">Finish &amp; review this run</button>
          <button class="btn btn--ghost js-copy-review hidden">Copy QA prompt</button>
          <span class="js-copy-confirm feedback-confirm text-sm text-ink-mute">Copied</span>
        </div>
      </footer>
    </div>
  `;const x=.45,v=a=>i?Promise.resolve():J(a*x);try{const a=Array.from(e.querySelectorAll("header .reveal"));i?a.forEach(t=>t.classList.add("is-in")):D(a,{stagger:80,initialDelay:80});const l=e.querySelector(".briefing-headline");l.textContent=r.headline||"Briefing",await v(400);const g=e.querySelector(".bullets-section .eyebrow");i?g.classList.add("is-in"):w(g,0);const k=e.querySelector(".bullets-host"),_=(r.summary_bullets||[]).map(t=>{const c=document.createElement("div");return c.className="bullet reveal",c.innerHTML=`<div class="bullet__mark">●</div><div>${d(t)}</div>`,k.appendChild(c),c});i?_.forEach(t=>t.classList.add("is-in")):D(_,{stagger:70,initialDelay:100}),await v(i?0:_.length*70+300);const $=e.querySelector(".paragraph-body");$.textContent=r.understanding_paragraph||"",e.querySelector(".paragraph-section").classList.add("is-in"),await v(i?0:500);const m=e.querySelector(".axes-section .eyebrow");i?m.classList.add("is-in"):w(m,0);const y=X({celebrate:!0});e.querySelector(".axes-mount").appendChild(y.el),y.renderInitial([{id:"wellbeing",score:-1},{id:"engagement",score:-1},{id:"clarity",score:0,noRead:!0},{id:"growth",score:0,noRead:!0}]),await v(i?0:120);const C=t=>t.read_status?t.read_status==="not_read":t.score===0,T=(r.axes||[]).map(t=>({id:t.id,label:t.id,score:t.score,lastDelta:0,noRead:C(t)})),z=new Set(T.map(t=>t.id)),K={wellbeing:-1,engagement:-1,clarity:0,growth:0};for(const t of["wellbeing","engagement","clarity","growth"])z.has(t)||T.push({id:t,label:t,score:K[t],lastDelta:0,noRead:!0});y.update(T,{showDelta:!1});const I=(r.axes||[]).filter(t=>t.meaning&&!C(t)),A=(r.axes||[]).filter(t=>C(t));if(I.length||A.length){const t=e.querySelector(".axis-meanings"),c=I.map(o=>`
        <div class="text-sm text-ink-dim reveal-soft">
          <span class="eyebrow mr-2" style="color: var(--color-accent-dark);">${d(B(o.id))}</span>${d(o.meaning)}
        </div>
      `);if(A.length){const o=A.map(h=>B(h.id)),b=o.length>1?`${o.slice(0,-1).join(", ")} and ${o[o.length-1]}`:o[0];c.push(`
        <div class="text-sm text-ink-mute reveal-soft">${d(b)} — not enough signal to read this session.</div>
      `)}t.innerHTML=c.join(""),i?t.querySelectorAll(".reveal-soft").forEach(o=>o.classList.add("is-in")):setTimeout(()=>{t.querySelectorAll(".reveal-soft").forEach(o=>o.classList.add("is-in"))},900*x)}await v(i?0:1400);const U=e.querySelector(".brutal-host"),G=[{eyebrow:`Honest read — ${d(s.ctx.name||"them")}`,text:r.brutal_truth_employee||"",shareable:!0},{eyebrow:"Honest read — you",text:r.brutal_truth_manager||"",shareable:!1}];for(const t of G){if(!t.text)continue;const c=document.createElement("div");c.className="brutal"+(t.shareable?"":" brutal--private"),c.innerHTML=`
      <div class="brutal__eyebrow">
        ${t.eyebrow}
        <span class="brutal__badge ${t.shareable?"brutal__badge--shareable":"brutal__badge--private"}">${t.shareable?"OK to share":"Private · just for you"}</span>
      </div>
      <div class="brutal__body">${d(t.text)}</div>
      ${t.shareable?"":`<div class="brutal__note">Your reflection — don't paste this into shared notes.</div>`}
    `,U.appendChild(c),i?c.classList.add("is-in"):(w(c,50),await v(420))}const u=r.engagement_read;if(u&&(u.read_status||u.level)){await v(i?0:300);const t=e.querySelector(".engagement-section");t.classList.remove("hidden");const c=e.querySelector(".engagement-host"),o=(u.evidence||[]).filter(Boolean),b=u.read_status?u.read_status==="read"?"What this session actually showed on engagement — quotes below, no labels.":"Not enough from this conversation to read engagement — treat it as a partial read.":ie(u.level),h=[`<div class="engagement-read__lead">${d(b)}</div>`];u.observed_shift&&h.push(`<div class="engagement-read__line"><span class="eyebrow mr-2">You noted</span>${d(u.observed_shift)}</div>`),o.length&&h.push(`<div class="engagement-read__line"><span class="eyebrow mr-2">Why</span>${o.map(d).join("; ")}</div>`),u.missing_evidence&&h.push(`<div class="engagement-read__line text-ink-dim"><span class="eyebrow mr-2">Still missing</span>${d(u.missing_evidence)}</div>`),u.recommended_action&&h.push(`<div class="engagement-read__line"><span class="eyebrow mr-2">Your move</span>${d(u.recommended_action)}</div>`),u.watch_next&&h.push(`<div class="engagement-read__line text-ink-dim"><span class="eyebrow mr-2">Watch next</span>${d(u.watch_next)}</div>`),c.innerHTML=h.join(""),i?t.classList.add("is-in"):w(t,80)}const R=r.next_actions||[];if(R.length){await v(i?0:400);const t=e.querySelector(".actions-section .eyebrow");i?t.classList.add("is-in"):w(t,0);const c=e.querySelector(".actions-host");[...R].sort((b,h)=>j(b.when)-j(h.when)).forEach((b,h)=>{const S=F({className:"action-group",mark:"",bodyHtml:`
          <div class="action-when">${d(P(b.when))}</div>
          <div class="action-body">${d(b.action||"")}</div>
        `,copyText:O(b)});c.appendChild(S),i?S.classList.add("is-in"):w(S,100+h*70)})}else e.querySelector(".actions-section").remove();const H=r.watch_for||[];if(H.length){await v(i?0:R.length*70+300);const t=e.querySelector(".watch-section .eyebrow");i?t.classList.add("is-in"):w(t,0);const c=e.querySelector(".watch-host"),o=e.querySelector(".js-copy-all-reminders");o.classList.remove("hidden"),o.addEventListener("click",()=>{Y(H.join(`
`),o,"Copied all")}),H.forEach((b,h)=>{const S=F({className:"watch-item",mark:"●",bodyHtml:`<div class="watch-item__text">${d(b)}</div>`,copyText:b});c.appendChild(S),i?S.classList.add("is-in"):w(S,100+h*70)})}else e.querySelector(".watch-section").remove()}catch(a){console.error("[briefing] reveal failed; showing full briefing:",a),e.querySelectorAll(".reveal, .reveal-soft, .brutal").forEach(l=>l.classList.add("is-in")),(E=e.querySelector(".paragraph-section"))==null||E.classList.add("is-in"),document.querySelectorAll(".celebration-wash").forEach(l=>l.remove())}e.querySelector(".js-copy-all-briefing").addEventListener("click",()=>{ae(r,s.ctx,e.querySelector(".js-copy-all-briefing"))}),e.querySelector(".js-restart").addEventListener("click",()=>{n({stage:N.RUN_DEBRIEF})});const f=e.querySelector(".js-rate-inflow");if(f){const a=f.querySelector(".js-rate-status"),l=Z({onChange:async g=>{try{await V(s.sessionId,{stars:g}),a&&(a.textContent="Thanks!")}catch{a&&(a.textContent="You can rate it later from Runs.")}}});f.querySelector(".js-inflow-stars").appendChild(l.el),f.querySelector(".js-rate-skip").addEventListener("click",()=>f.remove())}if(s.scripted){const a=[...e.querySelectorAll(".js-verdict")],l=e.querySelector(".js-issue-type"),g=e.querySelector(".js-verdict-note"),k=e.querySelector(".js-verdict-confirm");let _=null;async function $(){if(_)try{await Q(s.sessionId,{verdict:_,issue_type:l.value||null,note:g.value||null}),k.classList.add("is-shown"),setTimeout(()=>{k.classList.remove("is-shown")},1500)}catch(m){console.warn("[briefing] verdict save failed:",m.message)}}a.forEach(m=>m.addEventListener("click",()=>{_=m.dataset.v,a.forEach(y=>{y.classList.toggle("is-active",y===m),y.setAttribute("aria-pressed",String(y===m))}),$()})),l.addEventListener("change",$),g.addEventListener("change",$)}const L=e.querySelector(".js-copy-review"),q=e.querySelector(".js-copy-confirm");(s.notes||[]).length&&s.sessionDir&&(L.classList.remove("hidden"),L.addEventListener("click",async()=>{const l=[`Open notes.md in the session folder (${`${String(s.sessionDir).replace(/\\/g,"/")}/notes.md`}).`,"","These are my notes from a Sero run, tagged by stage. Save the key recurring themes to memory (treat them as feedback about the app, not about me). Then ask me one focused question at a time about the issues I raised so we can decide what changes to make to the prompts and copy."].join(`
`);try{await navigator.clipboard.writeText(l),q.classList.add("is-shown"),setTimeout(()=>{q.classList.remove("is-shown")},1500)}catch(g){console.warn("[briefing] clipboard write failed:",g.message)}}))}function ve(){}function P(e){const s=String(e||"").trim();return s?s==="next 1:1"?"Next 1:1":s.charAt(0).toUpperCase()+s.slice(1):""}function j(e){const s=W.indexOf(e);return s===-1?W.length:s}function O(e){const s=String(e.when||"").trim(),n=String(e.action||"").trim();return s?`${P(s)}: ${n}`:n}function se(e,s){const n=[],p=((s==null?void 0:s.name)||"").trim();n.push(p?`Briefing · For ${p}`:"Briefing");const r=String(e.headline||"").trim();r&&n.push("",r);const i=e.summary_bullets||[];i.length&&(n.push("","What stood out"),i.forEach(a=>n.push(`- ${a}`)));const x=String(e.understanding_paragraph||"").trim();x&&n.push("","What we understood",x);const v=e.axes||[];if(v.length){n.push("","Final read");for(const a of v){const l=B(a.id);if(a.read_status?a.read_status==="not_read":a.score===0){n.push(`${l} (not read — not enough signal)`);continue}const k=a.score!=null?` (${a.score})`:"";n.push(`${l}${k}`),a.meaning&&n.push(String(a.meaning).trim())}}const f=String(e.brutal_truth_employee||"").trim();f&&n.push("",`Honest read — ${p||"them"}`,f);const L=String(e.brutal_truth_manager||"").trim();L&&n.push("","Honest read — you (private · just for you, not for sharing)",L);const q=e.next_actions||[];q.length&&(n.push("","What to do next"),[...q].sort((a,l)=>j(a.when)-j(l.when)).forEach(a=>n.push(`- ${O(a)}`)));const E=e.watch_for||[];return E.length&&(n.push("","Reminders"),E.forEach(a=>n.push(`- ${a}`))),n.join(`
`).trim()}async function ae(e,s,n){const p=se(e,s);if(p)try{await navigator.clipboard.writeText(p);const r=n.textContent;n.innerHTML=`Copied ${M(ee,{size:16})}`,setTimeout(()=>{n.textContent=r},1500)}catch(r){console.warn("[briefing] clipboard write failed:",r.message)}}function F({className:e,mark:s,bodyHtml:n,copyText:p}){const r=document.createElement("div");return r.className=`${e} copyable-row reveal`,r.innerHTML=`
    ${s?`<div class="copyable-row__mark">${s}</div>`:""}
    <div class="copyable-row__content">${n}</div>
    <button type="button" class="copy-snippet-btn" title="Copy" aria-label="Copy">${ne}</button>
  `,r.querySelector(".copy-snippet-btn").addEventListener("click",i=>{i.stopPropagation(),Y(p,i.currentTarget)}),r}const ne=M(te,{size:14});async function Y(e,s,n="Copied"){if(e)try{await navigator.clipboard.writeText(e);const p=s.getAttribute("aria-label");s.classList.add("is-copied"),s.setAttribute("aria-label",n),setTimeout(()=>{s.classList.remove("is-copied"),s.setAttribute("aria-label",p||"Copy")},1200)}catch(p){console.warn("[briefing] clipboard write failed:",p.message)}}function B(e){return e&&e[0].toUpperCase()+e.slice(1)}function ie(e){switch(e){case"clear_concern":return"There's a clear engagement concern here, worth acting on.";case"worth_checking":return"One or two signs worth checking directly — not a pattern yet.";case"no_clear_concern":return"Nothing here points to them pulling away.";case"inconclusive":default:return"Not enough from this conversation to read engagement — treat it as a partial read."}}export{he as mount,ve as unmount};
//# sourceMappingURL=briefing-CFw-Oi7y.js.map
