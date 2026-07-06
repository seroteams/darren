import{M as X,f as z,S as m,J as W,G as T,N as Z,O as ee,K as te,p as ne,L as se}from"./index-Lojh5UQc.js";import{c as ae,o as ie}from"./orb-BvJ65ChT.js";import{c as oe,A as re,a as ce}from"./axes-d0BE7b8-.js";import{r as j,s as H}from"./reveal-CdKVaBU1.js";import{C as le}from"./copy-eqjIEJPA.js";let A=null;async function ge(u,{store:a,setState:r}){var M,O;u.innerHTML=`
    <div class="stage-questioning l-stack l-stack--6">
      <header class="page-header">
        <div class="page-header__row">
          <div class="questioning-head min-w-0 space-y-1">
            <p class="turn-label page-header__step"></p>
            <div class="question-session-ctx ctx-segments" aria-label="Session context"></div>
            <p class="question-session-notes" aria-label="What you told Sero" hidden></p>
          </div>
          <button class="btn btn--ghost js-save-exit shrink-0" type="button">Skip to briefing</button>
        </div>
      </header>
      <div class="question-host"></div>
      <div class="thinking-host min-h-[72px]"></div>
      <div class="axes-wrap space-y-2" aria-label="Live scores — updated each answer, not the final briefing">
        <div class="eyebrow" title="Live scores — updated each answer, not the final briefing">Live scores</div>
        <div class="card axes-host"></div>
      </div>
      <div class="footer-host text-sm text-ink-mute"></div>
    </div>
  `;const h=u.querySelector(".turn-label"),P=u.querySelector(".question-session-ctx"),q=u.querySelector(".question-host");X(P,a.ctx||{});const _=u.querySelector(".question-session-notes"),$=String(((M=a.ctx)==null?void 0:M.notes)||"").replace(/\s*\n+\s*/g," ").trim();$&&(_.textContent=`“${$}”`,_.hidden=!1);const L=u.querySelector(".thinking-host"),Y=u.querySelector(".axes-host"),w=u.querySelector(".footer-host"),E=oe({celebrate:!1});E.renderInitial((O=a.axes)!=null&&O.length?a.axes:re.map(o=>({id:o,score:ce[o],lastDelta:0,historyLen:0}))),Y.appendChild(E.el);let g=null,c=null;function R(){g&&(g.close(),g=null),c&&(document.removeEventListener("keydown",c),c=null)}u.querySelector(".js-save-exit").addEventListener("click",async()=>{await z({message:"Skip the remaining questions and open the briefing now? Any unanswered questions will be dropped.",confirmLabel:"Open briefing",cancelLabel:"Keep questioning"})&&(R(),r({stage:m.BRIEFING}))});async function I({prefill:o=null}={}){var F;q.innerHTML="",L.innerHTML="",w.innerHTML="";const n=await W(a.sessionId);if(n.done){if((F=n.agenda)!=null&&F.summary&&n.agenda.covered==null){K(n.agenda);return}r({stage:m.EVAL});return}h.textContent=`Question ${n.turn} of ${n.total}`;const i=n.question;a.currentQuestion=i;const p=n.scripted||a.scripted||null,v=n.scripted?n.scripted.answer:p?p.answers[i.alias]:void 0,y=!!p&&v!=null,N=/thread_follow|drill|follow_up/i.test(i.alias||""),e=document.createElement("div");e.className="card questioning-card space-y-4 reveal",e.innerHTML=`
      ${N?'<div class="question-drill-hint text-sm text-ink-dim">↳ Following up on what you just said.</div>':""}
      ${p?`<div class="script-meta text-xs">
        <span class="script-alias">${T(i.alias)}</span>
        <span class="script-state ${y?"script-state--matched":"script-state--missing"}">${y?"replay answer ready":"no replay answer — fallback available"}</span>
      </div>`:""}
      <div class="question-card-head">
        <div class="question-card-head__text space-y-2">
          <h1 class="question-stem leading-snug">${T(i.name)}</h1>
          ${i.description?`<div class="question-desc">${T(i.description)}</div>`:""}
        </div>
        <button type="button" class="copy-snippet-btn js-copy-question" title="Copy question" aria-label="Copy question">
          <span class="copy-snippet-btn__label">Copy</span>${de}
        </button>
      </div>
      <label class="block">
        <span class="sr-only">Your notes</span>
        <textarea class="textarea textarea--question" rows="5" placeholder="Jot what they said — your shorthand, not a transcript" aria-label="Your notes"></textarea>
      </label>
      <div class="field__actions">
        <button class="btn js-submit">Submit answer</button>
        <button class="btn btn--ghost js-skip">Skip</button>
        ${n.turn>1&&!p?'<button class="btn btn--ghost js-back" type="button" title="Go back and fix your last answer">Back</button>':""}
        ${p?'<button class="btn btn--ghost js-play" type="button">Insert scripted answer</button><button class="btn btn--ghost js-play-submit" type="button">Insert & submit</button>':""}
        
      </div>
      <p class="hint hint--kbd text-xs text-ink-mute">Enter · Skip · Esc</p>
      
    `,q.appendChild(e),j(e,40),e.querySelector(".js-copy-question").addEventListener("click",t=>{const l=[`Question ${n.turn}`];i.name&&l.push(String(i.name).trim()),i.description&&l.push(String(i.description).trim()),ue(l.join(`

`),t.currentTarget)});const s=e.querySelector("textarea");o&&(s.value=o),setTimeout(()=>s.focus({preventScroll:!0}),260),r({draftAnswer:s.value});let D=null;s.addEventListener("input",()=>{clearTimeout(D),D=setTimeout(()=>r({draftAnswer:s.value}),250)}),s.addEventListener("keydown",t=>{t.key==="Enter"&&!t.shiftKey&&(t.preventDefault(),x(s.value))}),c&&document.removeEventListener("keydown",c),c=t=>{t.key==="Escape"&&(t.preventDefault(),x(""))},document.addEventListener("keydown",c),e.querySelector(".js-submit").addEventListener("click",()=>x(s.value)),e.querySelector(".js-skip").addEventListener("click",()=>x(""));const S=e.querySelector(".js-back");S&&S.addEventListener("click",async()=>{S.disabled=!0;let t;try{t=await Z(a.sessionId)}catch{S.disabled=!1,w.innerHTML="";const d=document.createElement("div");d.className="hint mt-2 text-amber-500",d.textContent="Couldn't go back — the previous answer may already be locked in.",w.appendChild(d);return}c&&(document.removeEventListener("keydown",c),c=null),t.axes&&(E.renderInitial(t.axes),a.axes=t.axes),I({prefill:t.answer??""})});let C="manual";function Q(){const t=y?v:p.fallback||"";if(C=y?"scripted":"fallback",s.value=t,s.focus({preventScroll:!0}),!y){const l=e.querySelector(".script-state");l&&(l.classList.add("script-state--fallback"),l.textContent="fallback answer used")}return t}const B=e.querySelector(".js-play");B&&B.addEventListener("click",Q);const G=e.querySelector(".js-play-submit");G&&G.addEventListener("click",()=>{const t=Q();x(t)}),s.addEventListener("input",()=>{C!=="manual"&&(C="manual")});const f=e.querySelector(".js-suggest");if(f){const t=e.querySelector(".answer-suggestions");f.addEventListener("click",async()=>{f.disabled=!0;const l=f.textContent;f.textContent="Thinking…",t.hidden=!1,t.innerHTML='<div class="hint">Drafting sample notes…</div>';let d=[];try{({answers:d=[]}=await ee(a.sessionId))}catch{d=[]}if(f.disabled=!1,f.textContent=l,!d.length){t.innerHTML='<div class="hint">No suggestions came back — write your own or try again.</div>';return}t.innerHTML='<div class="hint">Dev only — sample notes to speed up test runs.</div>',d.forEach(b=>{const k=document.createElement("button");k.type="button",k.className="suggest-row",k.textContent=b,k.addEventListener("click",()=>{s.value=b,s.focus({preventScroll:!0})}),t.appendChild(k)})})}let U=!1;async function x(t){if(U)return;const l=t.trim();U=!0,r({draftAnswer:""});let d;try{d=await te(a.sessionId,l,{answerSource:C,alias:i.alias})}catch(b){r({stage:m.ERROR,error:b.message,retryStage:m.QUESTIONING});return}if(await V(e),d!=null&&d.truncated){const b=document.createElement("div");b.className="hint mt-2 text-amber-500",b.textContent="Answer was too long — trimmed to 4000 characters.",w.appendChild(b)}await J(l)}}function K(o){q.innerHTML="",L.innerHTML="",w.innerHTML="",h.textContent="Before we wrap";const n=document.createElement("div");n.className="card questioning-card space-y-4 reveal",n.innerHTML=`
      <div class="question-card-head__text space-y-2">
        <h1 class="question-stem leading-snug">Earlier they wanted to cover ${T(o.summary)}. Did you get to it?</h1>
      </div>
      <div class="field__actions">
        <button class="btn js-agenda-yes" type="button">Yes, covered</button>
        <button class="btn btn--ghost js-agenda-no" type="button">Not yet</button>
      </div>
    `,q.appendChild(n),j(n,40);async function i(p){try{await se(a.sessionId,p)}catch(v){console.warn("[questioning] agenda cover failed:",v.message)}r({stage:m.EVAL})}n.querySelector(".js-agenda-yes").addEventListener("click",()=>i(!0)),n.querySelector(".js-agenda-no").addEventListener("click",()=>i(!1))}async function V(o){c&&(document.removeEventListener("keydown",c),c=null),o.classList.add("field-exit"),requestAnimationFrame(()=>o.classList.add("is-out")),await H(240),o.remove()}async function J(o){const n=o.trim()==="",i=ae(n?"Next question…":"Scoring answer…");L.appendChild(i.el);const p=ie(`/api/v1/sessions/${encodeURIComponent(a.sessionId)}/plan/stream`);g=p;let v=null,y=!1;p.on("thinking",e=>i.setLabel(e.label)).on("axes",async e=>{var s;await i.exit(),L.innerHTML="",E.update(e.axes,{showDelta:!0}),a.axes=e.axes,(s=e.issues)!=null&&s.length&&console.warn("[planner] axis issues:",e.issues)}).on("note",e=>{if(!e.note||y)return;y=!0;const s=document.createElement("div");s.className="hint mt-2 reveal",s.textContent=e.note,w.appendChild(s),j(s,100)}).on("next",()=>{v="next"}).on("done",()=>{v="done"}).on("error",e=>{r({stage:m.ERROR,error:e.message||"Planning failed.",retryStage:m.QUESTIONING})}).onError(()=>{r({stage:m.ERROR,error:"Lost connection while scoring the answer.",retryStage:m.QUESTIONING})}).open(),await H(1600);const N=Date.now();for(;!v&&Date.now()-N<12e4;)await H(100);v==="done"?r({stage:m.EVAL}):v==="next"?I():(g==null||g.close(),r({stage:m.ERROR,error:"Scoring this answer is taking too long — the connection may be stuck.",retryStage:m.QUESTIONING}))}I(),A=R}function fe(){A&&A(),A=null}const de=ne(le,{size:14});async function ue(u,a,r="Copied"){if(u)try{await navigator.clipboard.writeText(u);const h=a.getAttribute("aria-label");a.classList.add("is-copied"),a.setAttribute("aria-label",r),setTimeout(()=>{a.classList.remove("is-copied"),a.setAttribute("aria-label",h||"Copy question")},1200)}catch(h){console.warn("[questioning] clipboard write failed:",h.message)}}export{ge as mount,fe as unmount};
//# sourceMappingURL=questioning-DPvpu7t3.js.map
