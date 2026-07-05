const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/briefing-DM_1hjlh.js","assets/index-D93BFPRu.js","assets/index-dzS5fEQK.css","assets/axes-DGXdW7yE.js","assets/reveal-CdKVaBU1.js","assets/star-rating-BVsY_rPU.js","assets/star-6WkPOSOg.js","assets/check-GyDbZBob.js","assets/copy-eqjIEJPA.js"])))=>i.map(i=>d[i]);
import{S as x,f as O,A as F,B as oe,n as ae,C as y,D as re,E as le,F as ce,G as de,_ as ue,H as fe}from"./index-D93BFPRu.js";import{f as pe}from"./field-iS32XwvO.js";import{r as ye,s as G}from"./reveal-CdKVaBU1.js";import{o as _,c as Q}from"./orb-BvJ65ChT.js";import{c as ve,A as me,a as be}from"./axes-DGXdW7yE.js";import{c as ge}from"./session-reset-DdQ5WOmY.js";function he(f,o){const v=Array.isArray(f)?f:[],q=(Array.isArray(o)?o:[]).map(d=>({key:d.key,label:d.label,rows:[]})),c=new Map(q.map(d=>[d.key,d])),u={key:null,label:null,rows:[]};for(const d of v)(d&&d.group&&c.get(d.group)||u).rows.push(d);const g=q.filter(d=>d.rows.length);return u.rows.length&&g.push(u),g}function we(f){return f.some(o=>o.label)}const ke=()=>typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,N=()=>ke()?"auto":"smooth",R=[{key:"NAME",field:"name",type:"text",required:!0,question:"Who are you prepping for?",hint:"Their first name is enough.",placeholder:"e.g. Priya"},{key:"ROLE",field:"role",type:"text",required:!0,question:"What do they do?",hint:"Their role as you'd say it out loud.",placeholder:"e.g. Senior backend engineer"},{key:"SENIORITY",field:"seniority",type:"text",required:!0,question:"And their seniority?",hint:"IC level, staff, manager, director — whatever reads naturally.",placeholder:"e.g. Senior / Staff / Lead"},{key:"MEETING_TYPE",type:"meeting",question:"What kind of meeting?",hint:"Pick the shape that fits today."},{key:"NOTES",field:"notes",type:"textarea",required:!1,question:"Anything Sero should know?",placeholder:"e.g. They've been working late. Something feels off."}],xe=[{label:"Likely theme",key:"coreIssue",type:"paragraph"},{label:"How sure is this",key:"confidence",type:"paragraph"},{label:"Don't assume yet",key:"dontAssume",type:"paragraph"},{label:"Say this first",key:"openingQuestion",type:"callout"},{label:"Listen for",key:"listenFor",type:"bullets"},{label:"Avoid",key:"avoid",type:"bullets"},{label:"Success looks like",key:"goodOutcome",type:"paragraph"},{label:"Suggested action",key:"suggestedAction",type:"paragraph"}];let T=null;async function Ce(f,{store:o,setState:v}){f.classList.add("flow-page"),f.innerHTML=`
    <div class="stage-inner l-stack l-stack--8">
      <header class="space-y-3">
        <div class="intake-header__row">
          <div class="space-y-1 min-w-0">
            <div class="eyebrow">One-page run</div>
            <h1 class="h1">Prep your 1:1</h1>
            <p class="text-ink-dim text-sm js-flow-lede">Answer each step and the next appears below.</p>
          </div>
          <button class="btn btn--ghost js-cancel flex-shrink-0" type="button">Cancel</button>
        </div>
      </header>
      <div class="flow-steps l-stack l-stack--6"></div>
    </div>
  `;const m=f.querySelector(".flow-steps"),q=f.querySelector(".stage-inner");let c=null,u=null,g=null,d=null,k=null,S=null,E=null;T=()=>{c&&(c.close(),c=null),u&&(document.removeEventListener("keydown",u),u=null)},f.querySelector(".js-cancel").addEventListener("click",async()=>{await ge(O,{to:x.START})&&(F(),v({stage:x.START}))});let b=[];try{b=(await oe()).types||[]}catch{b=[]}let C=0,$=null;function L(e,t,{muted:n=!1}={}){const s=document.createElement("div");return s.className="flow-section flow-section--settled",s.innerHTML=`
      <div class="flow-answer">
        <div class="flow-answer__q"></div>
        <div class="flow-answer__a${n?" flow-answer__a--muted":""}"></div>
      </div>
    `,s.querySelector(".flow-answer__q").textContent=e,s.querySelector(".flow-answer__a").textContent=t,s}function h(e,{scrollTo:t=!0,focus:n=!1}={}){return e.classList.add("field-enter"),m.appendChild(e),ye(e),t&&requestAnimationFrame(()=>e.scrollIntoView({behavior:N(),block:"start"})),n&&pe(e),e}function P(e,{scrollTo:t=!0}={}){$=e,h(e,{scrollTo:t,focus:!0})}function j(e,t,n={}){if($&&m.replaceChild(L(e,t,n),$),C+=1,C>=R.length)return V();P(M(R[C]))}function M(e){return e.type==="meeting"?B(e):e.type==="textarea"?U(e):W(e)}function W(e){const t=document.createElement("div");t.className="flow-section flow-section--active space-y-4",t.innerHTML=`
      <label class="block">
        <h1 class="h1 flow-q mb-4"></h1>
        <input class="input" type="text" autocomplete="off" spellcheck="false" data-autofocus />
      </label>
      <div class="hint"></div>
      <div class="field__error" hidden></div>
      <div class="field__actions"><button class="btn js-next" type="button">Continue</button></div>
    `,t.querySelector(".flow-q").textContent=e.question,t.querySelector(".hint").textContent=e.hint;const n=t.querySelector("input");n.placeholder=e.placeholder,n.value=o.ctx[e.field]||"";const s=t.querySelector(".field__error");function i(){const r=n.value.trim();if(e.required&&!r){s.textContent="Add a value to continue.",s.hidden=!1,n.setAttribute("aria-invalid","true");return}s.hidden=!0,n.removeAttribute("aria-invalid"),o.ctx[e.field]=r,j(e.question,r)}return n.addEventListener("keydown",r=>{r.key==="Enter"&&(r.preventDefault(),i())}),t.querySelector(".js-next").addEventListener("click",i),t}function U(e){const t=document.createElement("div");t.className="flow-section flow-section--active space-y-4",t.innerHTML=`
      <label class="block">
        <h1 class="h1 flow-q mb-4"></h1>
        <textarea class="textarea" rows="4" data-autofocus></textarea>
      </label>
      <div class="field__actions">
        <button class="btn js-submit" type="button">Continue</button>
        <button class="btn btn--ghost js-skip" type="button">Skip (optional)</button>
      </div>
    `,t.querySelector(".flow-q").textContent=e.question;const n=t.querySelector("textarea");n.placeholder=e.placeholder,n.value=o.ctx[e.field]||"";function s(i){o.ctx[e.field]=i,j(e.question,i||"(skipped)",{muted:!i})}return n.addEventListener("keydown",i=>{i.key==="Enter"&&!i.shiftKey&&(i.preventDefault(),s(n.value.trim()))}),t.querySelector(".js-submit").addEventListener("click",()=>s(n.value.trim())),t.querySelector(".js-skip").addEventListener("click",()=>s("")),t}function B(e){const t=document.createElement("div");t.className="flow-section flow-section--active space-y-5",t.setAttribute("tabindex","0"),t.setAttribute("data-autofocus",""),t.innerHTML=`
      <h1 class="h1 flow-q mb-2"></h1>
      <div class="hint mb-3"></div>
      <div class="grid gap-3 js-cards"></div>
    `,t.querySelector(".flow-q").textContent=e.question,t.querySelector(".hint").textContent=e.hint;const n=t.querySelector(".js-cards");if(!b.length)return n.innerHTML=`<div class="field__error">Couldn't load meeting types. Reload and try again.</div>`,t;let s=Number.isInteger(o.ctx.meetingTypeIndex)?o.ctx.meetingTypeIndex:0;function i(){n.innerHTML="",b.forEach((a,l)=>{const w=document.createElement("button");w.type="button",w.className="meeting-card"+(l===s?" is-selected":""),w.innerHTML=`
          <div>
            <span class="meeting-card__label">${a.label}</span>
            ${a.badge?`<span class="meeting-card__badge">${a.badge}</span>`:""}
          </div>
          <div class="meeting-card__meta">${a.duration} · ${a.description}</div>
        `,w.addEventListener("click",()=>{s=l,r()}),n.appendChild(w)})}function r(){o.ctx.meetingTypeIndex=s,o.ctx.meetingType=b[s].label,j(e.question,b[s].label)}return t.addEventListener("keydown",a=>{if(a.key==="ArrowDown"||a.key==="ArrowRight")a.preventDefault(),s=(s+1)%b.length,i();else if(a.key==="ArrowUp"||a.key==="ArrowLeft")a.preventDefault(),s=(s-1+b.length)%b.length,i();else if(/^[1-9]$/.test(a.key)){const l=Number(a.key)-1;l<b.length&&(s=l,r())}else a.key==="Enter"&&(a.preventDefault(),r())}),i(),t}async function V(){try{const e=await ae({name:o.ctx.name,role:o.ctx.role,seniority:o.ctx.seniority,meetingTypeIndex:o.ctx.meetingTypeIndex,notes:o.ctx.notes||""});try{localStorage.setItem("seroSessionId",e.sessionId)}catch{}v({sessionId:e.sessionId,sessionDir:e.sessionDir||null,createdAt:e.createdAt??Date.now()}),K()}catch(e){v({stage:x.ERROR,error:e.message,retryStage:x.ONEPAGE})}}function A(e){const t=document.createElement("div");t.className="flow-section flow-section--active";const n=Q(e);return t.appendChild(n.el),h(t),{node:t,orb:n}}function p(e){v({stage:x.ERROR,error:e,retryStage:x.ONEPAGE})}function K(){const e=A("Analyzing context…"),t=_(`/api/v1/sessions/${encodeURIComponent(o.sessionId)}/focus-points/stream`);c=t,t.on("thinking",n=>e.orb.setLabel(n.label)).on("result",async n=>{t.close(),c=null,await e.orb.exit(),e.node.remove(),Y(n)}).on("error",n=>p(n.message||"Focus-point generation failed.")).onError(()=>p("Lost connection while generating focus areas.")).open()}function Y(e){o.focusPoints=e.focus_points;const t=new Set,n=document.createElement("div");n.className="flow-section flow-section--active space-y-4",n.innerHTML=`
      <h2 class="h2 flow-q">What we'll cover</h2>
      <div class="focus-select-hint">Select at least one topic for this 1:1.</div>
      <div class="card focus-point-list">
        ${e.focus_points.map((i,r)=>`
          <div class="js-fp-wrapper">
            <button type="button" class="focus-point focus-point--selectable js-fp-toggle" data-fp-id="${y(i.id)}" aria-pressed="false" title="${y(i.reason||"")}">
              <div class="focus-point__num">${r+1}</div>
              <div class="focus-point__body">
                <div class="focus-point__label">${y(i.label||i.type||i.id)}</div>
                ${i.reason?`<div class="focus-point__reason">${y(Ee(i.reason))}</div>`:""}
              </div>
              <div class="focus-point__check" aria-hidden="true"></div>
            </button>
          </div>
        `).join("")}
      </div>
      <div class="field__actions"><button class="btn js-continue" type="button" disabled>Continue to prep brief</button></div>
    `,h(n);const s=n.querySelector(".js-continue");n.querySelectorAll(".js-fp-toggle").forEach(i=>{i.addEventListener("click",()=>{const r=i.dataset.fpId;t.has(r)?(t.delete(r),i.classList.remove("is-selected"),i.setAttribute("aria-pressed","false")):(t.add(r),i.classList.add("is-selected"),i.setAttribute("aria-pressed","true")),s.disabled=t.size===0})}),s.addEventListener("click",async()=>{const i=Array.from(t);if(!i.length)return;s.disabled=!0;try{await re(o.sessionId,i)}catch(l){console.warn("[onepage] focus save failed:",l.message)}const r=e.focus_points.filter(l=>t.has(l.id));o.focusPoints=r;const a=r.map(l=>l.label||l.type||l.id).join(" · ");m.replaceChild(L("Focus areas",a),n),z()})}function z(){const e=A("Preparing your prep brief…"),t=_(`/api/v1/sessions/${encodeURIComponent(o.sessionId)}/preparation/stream`);c=t,t.on("thinking",n=>e.orb.setLabel(n.label)).on("result",async n=>{t.close(),c=null,await e.orb.exit(),e.node.remove(),v({preparation:n.brief,preparationRunId:n.runId}),X(n.brief)}).on("error",n=>p(n.message||"Preparation briefing failed.")).onError(()=>p("Lost connection while generating the prep brief.")).open()}function X(e){const t=xe.filter(s=>{const i=e[s.key];return Array.isArray(i)?i.length:i&&String(i).trim()}),n=document.createElement("div");n.className="flow-section space-y-5",n.innerHTML=`
      <div class="eyebrow">Prep brief</div>
      <div class="card prep-brief">
        ${t.map(s=>`
          <div class="prep-brief__row">
            <div class="eyebrow">${s.label}</div>
            ${_e(s.type,e[s.key])}
          </div>
        `).join("")}
      </div>
      <div class="field__actions"><button class="btn js-to-interview" type="button">Continue to interview</button></div>
    `,h(n),n.querySelector(".js-to-interview").addEventListener("click",s=>{s.currentTarget.disabled=!0,J()})}async function J(){let e=[],t=[];try{const a=await le(o.sessionId);e=Array.isArray(a==null?void 0:a.terminology)?a.terminology:[],t=Array.isArray(a==null?void 0:a.terminologyGroups)?a.terminologyGroups:[]}catch(a){console.warn("[onepage] role profile fetch failed:",a.message)}if(!e.length){D();return}const n=a=>a.map(l=>`
      <div class="flow-glossary__row">
        <div class="flow-glossary__term">${y(l.term||"")}</div>
        <div class="flow-glossary__meaning">${y(l.meaning||"")}</div>
      </div>
    `).join(""),s=he(e,t),i=we(s)?`<div class="card flow-glossary-card">${s.map(a=>`
          <div class="flow-glossary-group">
            <h3 class="flow-glossary-group__head eyebrow">${y(a.label||"Other")}</h3>
            <div class="flow-glossary">${n(a.rows)}</div>
          </div>
        `).join("")}</div>`:`<div class="card flow-glossary">${n(e)}</div>`,r=document.createElement("div");r.className="flow-section space-y-4",r.innerHTML=`
      <div class="eyebrow">The language of this role</div>
      <p class="hint">Words a ${y(o.ctx.role||"this role")} uses — so you're speaking the same language.</p>
      ${i}
      <div class="field__actions"><button class="btn js-to-interview-2" type="button">Continue to interview</button></div>
    `,h(r),r.querySelector(".js-to-interview-2").addEventListener("click",a=>{a.currentTarget.disabled=!0,D()})}function D(){const e=A("Building questions…"),t=_(`/api/v1/sessions/${encodeURIComponent(o.sessionId)}/bank/stream`);c=t,t.on("thinking",n=>e.orb.setLabel(n.label)).on("ready",async()=>{t.close(),c=null,await e.orb.exit(),e.node.remove(),Z()}).on("error",n=>p(n.message||"Question generation failed.")).onError(()=>p("Lost connection while building questions.")).open()}function Z(){var t;const e=document.createElement("div");e.className="flow-interview-rail l-stack l-stack--3",e.innerHTML=`
      <div class="thinking-host min-h-[48px]"></div>
      <div class="js-note-host text-sm text-ink-mute"></div>
      <div class="axes-wrap space-y-2" aria-label="Live scores — updated each answer, not the final briefing">
        <div class="eyebrow">Live scores</div>
        <div class="card axes-host"></div>
      </div>
      <div><button class="btn btn--ghost btn--sm js-skip-brief" type="button">Skip to briefing</button></div>
    `,q.appendChild(e),S=e,d=e.querySelector(".thinking-host"),k=e.querySelector(".js-note-host"),g=ve({celebrate:!1}),g.renderInitial((t=o.axes)!=null&&t.length?o.axes:me.map(n=>({id:n,score:be[n],lastDelta:0,historyLen:0}))),e.querySelector(".axes-host").appendChild(g.el),e.querySelector(".js-skip-brief").addEventListener("click",async()=>{await O({message:"Skip the remaining questions and open the briefing now? Any unanswered questions will be dropped.",confirmLabel:"Open briefing",cancelLabel:"Keep questioning"})&&(E&&(E.remove(),E=null),I())}),H()}async function H(){var t;d&&(d.innerHTML=""),k&&(k.textContent="");let e;try{e=await ce(o.sessionId)}catch(n){p(n.message||"Couldn't load the next question.");return}if(e.done){if((t=e.agenda)!=null&&t.summary&&e.agenda.covered==null){te(e.agenda);return}I();return}ee(e)}function ee(e){const t=e.question;o.currentQuestion=t;const n=document.createElement("div");n.className="flow-section flow-section--active space-y-4",n.innerHTML=`
      <div class="eyebrow">Question ${e.turn} of ${e.total}</div>
      <h2 class="question-stem leading-snug">${y(t.name)}</h2>
      ${t.description?`<div class="question-desc">${y(t.description)}</div>`:""}
      <label class="block">
        <span class="sr-only">Your notes</span>
        <textarea class="textarea textarea--question" rows="5" placeholder="Jot what they said — your shorthand, not a transcript" data-autofocus></textarea>
      </label>
      <div class="field__actions">
        <button class="btn js-submit" type="button">Submit answer</button>
        <button class="btn btn--ghost js-skip" type="button">Skip</button>
      </div>
      <p class="hint text-xs text-ink-mute">Enter to submit · Esc to skip</p>
    `,h(n,{scrollTo:!0,focus:!0}),E=n;const s=n.querySelector("textarea");s.addEventListener("keydown",a=>{a.key==="Enter"&&!a.shiftKey&&(a.preventDefault(),r(s.value))}),u&&document.removeEventListener("keydown",u),u=a=>{a.key==="Escape"&&(a.preventDefault(),r(""))},document.addEventListener("keydown",u),n.querySelector(".js-submit").addEventListener("click",()=>r(s.value)),n.querySelector(".js-skip").addEventListener("click",()=>r(""));let i=!1;async function r(a){if(i)return;const l=a.trim();i=!0,u&&(document.removeEventListener("keydown",u),u=null);try{await de(o.sessionId,l,{answerSource:"manual",alias:t.alias})}catch(w){p(w.message);return}m.replaceChild(L(t.name,l||"(skipped)",{muted:!l}),n),E=null,await ne(l)}}function te(e){const t=document.createElement("div");t.className="flow-section flow-section--active space-y-4",t.innerHTML=`
      <div class="eyebrow">Before we wrap</div>
      <h2 class="question-stem leading-snug">Earlier they wanted to cover ${y(e.summary)}. Did you get to it?</h2>
      <div class="field__actions">
        <button class="btn js-agenda-yes" type="button">Yes, covered</button>
        <button class="btn btn--ghost js-agenda-no" type="button">Not yet</button>
      </div>
    `,h(t,{scrollTo:!0});async function n(s){try{await fe(o.sessionId,s)}catch(i){console.warn("[onepage] agenda cover failed:",i.message)}m.replaceChild(L("Agenda check",s?"Covered":"Not yet"),t),I()}t.querySelector(".js-agenda-yes").addEventListener("click",()=>n(!0)),t.querySelector(".js-agenda-no").addEventListener("click",()=>n(!1))}async function ne(e){const t=e.trim()==="",n=Q(t?"Next question…":"Scoring answer…");d.appendChild(n.el),requestAnimationFrame(()=>n.el.scrollIntoView({behavior:N(),block:"nearest"}));const s=_(`/api/v1/sessions/${encodeURIComponent(o.sessionId)}/plan/stream`);c=s;let i=null,r=!1;s.on("thinking",l=>n.setLabel(l.label)).on("axes",async l=>{await n.exit(),d.innerHTML="",g.update(l.axes,{showDelta:!0}),o.axes=l.axes}).on("note",l=>{!l.note||r||!k||(r=!0,k.textContent=l.note)}).on("next",()=>{i="next"}).on("done",()=>{i="done"}).on("error",l=>p(l.message||"Planning failed.")).onError(()=>p("Lost connection while scoring the answer.")).open(),await G(1600);const a=Date.now();for(;!i&&Date.now()-a<12e4;)await G(100);c=null,i==="done"?I():i==="next"?H():(s.close(),p("Scoring this answer is taking too long — the connection may be stuck."))}function I(){u&&(document.removeEventListener("keydown",u),u=null),S&&(S.remove(),S=null),se()}function se(){c&&(c.close(),c=null);const e=A("Writing the brief…"),t=_(`/api/v1/sessions/${encodeURIComponent(o.sessionId)}/evaluation/stream`);c=t,t.on("thinking",n=>e.orb.setLabel(n.label)).on("briefing",async n=>{t.close(),c=null,await e.orb.exit(),e.node.remove(),o.briefing=n,v({briefing:n,completedAt:n.completedAt??o.completedAt??null}),await ie()}).on("error",n=>p(n.message||"Evaluation failed.")).onError(()=>p("Lost connection during synthesis.")).open()}async function ie(){const e=document.createElement("div");e.className="flow-section flow-briefing",m.appendChild(e);try{await(await ue(()=>import("./briefing-DM_1hjlh.js"),__vite__mapDeps([0,1,2,3,4,5,6,7,8]))).mount(e,{store:o,setState:v,resetSession:F})}catch(t){console.error("[onepage] inline briefing render failed:",t),p("Couldn't render the briefing.");return}requestAnimationFrame(()=>e.scrollIntoView({behavior:N(),block:"start"}))}P(M(R[0]),{scrollTo:!1})}function $e(){T&&T(),T=null}function Ee(f){var m;const o=String(f??"").trim();return o?((m=o.match(/^(.+?[.!?])(?:\s|$)/))==null?void 0:m[1])||o:""}function _e(f,o){return f==="bullets"&&Array.isArray(o)?`<ul class="prep-list">${o.map(v=>`<li>${y(v)}</li>`).join("")}</ul>`:f==="callout"?`<blockquote class="prep-callout">${y(o||"")}</blockquote>`:`<p class="text-ink leading-relaxed">${y(o||"")}</p>`}export{Ce as mount,$e as unmount};
//# sourceMappingURL=onepage-BBAyurxg.js.map
