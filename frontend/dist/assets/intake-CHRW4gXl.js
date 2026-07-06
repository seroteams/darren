import{S as v,f as W,E as Y,F as B,v as K,e as O,n as Q}from"./index-Lojh5UQc.js";import{s as w,f as T}from"./field-iS32XwvO.js";import{c as z}from"./session-reset-DJVGH_hT.js";const m=["NAME","ROLE","SENIORITY","MEETING_TYPE","NOTES"],A={NAME:{question:"Who are you prepping for?",hint:"Their first name is enough.",placeholder:"e.g. Priya",key:"name"},ROLE:{question:"What do they do?",hint:"Their role as you'd say it out loud.",placeholder:"e.g. Senior backend engineer",key:"role"},SENIORITY:{question:"And their seniority?",hint:"IC level, staff, manager, director — whatever reads naturally.",placeholder:"e.g. Senior / Staff / Lead",key:"seniority"},NOTES:{question:"Anything Sero should know?",placeholder:"e.g. Quieter since the reorg ~3 weeks ago. Something feels off.",key:"notes"}};async function Z(f,{store:s,setState:b}){var M;f.innerHTML=`
    <div class="stage-inner l-stack l-stack--10">
      <header class="space-y-3">
        <div class="intake-header__row">
          <div class="space-y-1 min-w-0">
            <div class="eyebrow">Setup</div>
            <div class="stage-step text-sm text-ink-mute"></div>
          </div>
          <button class="btn btn--ghost js-start-fresh flex-shrink-0" type="button">Cancel setup</button>
        </div>
        <p class="text-ink-dim text-sm max-w-measure js-intake-lede">Sero prepares and runs a 1:1 interview, then writes a manager briefing.</p>
        <div class="intake-progress" role="progressbar" aria-valuemin="1" aria-valuemax="${m.length}" aria-valuenow="1">
          <div class="intake-progress__fill"></div>
        </div>
      </header>
      <div class="field-host"></div>
    </div>
  `;const k=f.querySelector(".field-host"),C=f.querySelector(".stage-step"),L=f.querySelector(".js-intake-lede"),R=f.querySelector(".intake-progress"),P=f.querySelector(".intake-progress__fill");f.querySelector(".js-start-fresh").addEventListener("click",async()=>{await z(W,{to:v.START})&&(Y(),b({stage:v.START}))});let y=null,g=null,h=s.substage||"NAME";function N(){const e=m.indexOf(h)+1;C.textContent=`Step ${e} of ${m.length}`,L&&(L.hidden=h!=="NAME"),R.setAttribute("aria-valuenow",String(e)),P.style.width=`${e/m.length*100}%`}N();function _(e){return e==="NAME"?D():e==="MEETING_TYPE"?G():e==="NOTES"?F():q(e)}function D(){if(!g||g.length===0)return I();const e=document.createElement("div");e.className="space-y-5",e.innerHTML=`
      <h1 class="h1 mb-2">${A.NAME.question}</h1>
      <div class="hint mb-3">Pick someone from your team, or add someone new.</div>
      <div class="grid gap-3 js-cards"></div>
    `;const t=e.querySelector(".js-cards");for(const a of g){const r=document.createElement("button");r.type="button",r.className="meeting-card",s.ctx.personId===a.id&&r.classList.add("is-selected");const i=a.role?`<div class="meeting-card__meta">${O(a.role)}</div>`:"";r.innerHTML=`<div><span class="meeting-card__label">${O(a.name)}</span></div>${i}`,r.addEventListener("click",()=>{s.ctx.personId=a.id,s.ctx.name=a.name,s.ctx.role=a.role||s.ctx.role||"",s.ctx.seniority=a.seniority||s.ctx.seniority||"",x()}),t.appendChild(r)}const n=document.createElement("button");return n.type="button",n.className="meeting-card",n.innerHTML='<div><span class="meeting-card__label">Someone new</span></div><div class="meeting-card__meta">Type their name — they join your Team automatically.</div>',n.addEventListener("click",async()=>{const a=await w(k,()=>I());T(a)}),t.appendChild(n),e}function I(){const e=q("NAME");return e.querySelector("input").addEventListener("input",()=>{s.ctx.personId=null}),e}const $=[{id:"workload",label:"Workload"},{id:"motivation",label:"Motivation"},{id:"friction",label:"Friction"},{id:"delivery",label:"Delivery"},{id:"growth",label:"Growth"}];function H({pills:e,free:t}){const n=[];return e.length&&n.push(`On the manager's mind: ${e.map(a=>a.label.toLowerCase()).join(", ")}.`),t&&n.push(t),n.join(`
`)}function q(e){const t=A[e],n=document.createElement("div");n.className="space-y-4",n.innerHTML=`
      <label class="block">
        <h1 class="h1 mb-4">${t.question}</h1>
        <input class="input" type="text" autocomplete="off"
               spellcheck="false" placeholder="${t.placeholder}"
               aria-describedby="hint-${t.key} err-${t.key}" data-autofocus />
      </label>
      <div class="hint" id="hint-${t.key}">${t.hint}</div>
      <div class="field__error" id="err-${t.key}" hidden></div>
      <div class="field__actions">
        <button class="btn js-next">Continue</button>
      </div>
    `;const a=n.querySelector("input");a.value=s.ctx[t.key]||"",a.addEventListener("keydown",i=>{i.key==="Enter"&&(i.preventDefault(),r())}),n.querySelector(".js-next").addEventListener("click",r);function r(){const i=a.value.trim(),c=n.querySelector(".field__error");if(!i){c.textContent="Add a value to continue.",c.hidden=!1,a.setAttribute("aria-invalid","true");return}c.hidden=!0,a.removeAttribute("aria-invalid"),s.ctx[t.key]=i,x()}return n}function F(){const e=A.NOTES,t=document.createElement("div");t.className="space-y-5",t.innerHTML=`
      <h1 class="h1 mb-2">${e.question}</h1>
      <div class="hint">Optional. Tap what's prompting this 1:1, then add anything in your own words.</div>
      <div class="space-y-2">
        <div class="eyebrow" id="pills-label">What's on your mind?</div>
        <div class="pill-row js-pills" role="group" aria-labelledby="pills-label"></div>
      </div>
      <label class="block space-y-2">
        <textarea class="textarea js-notes" rows="4" placeholder="${e.placeholder}"></textarea>
      </label>
      <div class="field__actions">
        <button class="btn js-submit">Continue</button>
        <button class="btn btn--ghost js-skip">Skip (optional)</button>
      </div>
    `;const n=new Set(s.ctx.issuePills||[]),a=t.querySelector(".js-pills"),r=[];function i(o){const u=(o+r.length)%r.length;r.forEach((l,d)=>{l.tabIndex=d===u?0:-1}),r[u].focus()}$.forEach((o,u)=>{const l=document.createElement("button");l.type="button",l.className="pill"+(n.has(o.id)?" is-selected":""),l.textContent=o.label,l.setAttribute("aria-pressed",n.has(o.id)?"true":"false"),l.tabIndex=u===0?0:-1,u===0&&l.setAttribute("data-autofocus",""),l.addEventListener("click",()=>{const d=n.has(o.id);d?n.delete(o.id):n.add(o.id),l.classList.toggle("is-selected",!d),l.setAttribute("aria-pressed",String(!d))}),l.addEventListener("keydown",d=>{d.key==="ArrowRight"||d.key==="ArrowDown"?(d.preventDefault(),i(u+1)):(d.key==="ArrowLeft"||d.key==="ArrowUp")&&(d.preventDefault(),i(u-1))}),r.push(l),a.appendChild(l)});const c=t.querySelector(".js-notes");c.value=s.ctx.freeNotes??s.ctx.notes??"";function p(){const o=$.filter(l=>n.has(l.id)),u=c.value.trim();s.ctx.issuePills=o.map(l=>l.id),s.ctx.freeNotes=u,s.ctx.notes=H({pills:o,free:u}),S()}return c.addEventListener("keydown",o=>{o.key==="Enter"&&!o.shiftKey&&(o.preventDefault(),p())}),t.querySelector(".js-submit").addEventListener("click",p),t.querySelector(".js-skip").addEventListener("click",()=>{n.clear(),s.ctx.issuePills=[],s.ctx.freeNotes="",s.ctx.notes="",S()}),t}function G(){const e=document.createElement("div");e.className="space-y-5",e.setAttribute("tabindex","0"),e.setAttribute("data-autofocus",""),e.innerHTML=`
      <h1 class="h1 mb-2">What kind of meeting?</h1>
      <div class="hint mb-3">Pick the shape that fits today. Click a card to continue — you can add nuance in the notes step.</div>
      <div class="grid gap-3 js-cards"></div>
    `;const t=e.querySelector(".js-cards");let n=Number.isInteger(s.ctx.meetingTypeIndex)?s.ctx.meetingTypeIndex:0;function a(){t.innerHTML="",y.forEach((i,c)=>{const p=document.createElement("button");p.className="meeting-card",c===n&&p.classList.add("is-selected"),p.setAttribute("data-i",String(c)),p.innerHTML=`
          <div>
            <span class="meeting-card__label">${i.label}</span>
            ${i.badge?`<span class="meeting-card__badge">${i.badge}</span>`:""}
          </div>
          <div class="meeting-card__meta">${i.duration} · ${i.description}</div>
        `,p.addEventListener("click",()=>{n=c,a(),r()}),t.appendChild(p)})}function r(){s.ctx.meetingTypeIndex=n,s.ctx.meetingType=y[n].label,x()}return a(),e.addEventListener("keydown",i=>{if(i.key==="ArrowDown"||i.key==="ArrowRight")i.preventDefault(),n=(n+1)%y.length,a();else if(i.key==="ArrowUp"||i.key==="ArrowLeft")i.preventDefault(),n=(n-1+y.length)%y.length,a();else if(/^[1-9]$/.test(i.key)){const c=Number(i.key)-1;c<y.length&&(n=c,a(),r())}else i.key==="Enter"&&(i.preventDefault(),r())}),e}async function x(){const e=m.indexOf(h),t=m[e+1];if(!t)return S();h=t,N();const n=await w(k,()=>_(t));T(n)}async function S(){try{const e={personId:s.ctx.personId||void 0,name:s.ctx.name,role:s.ctx.role,seniority:s.ctx.seniority,meetingTypeIndex:s.ctx.meetingTypeIndex,notes:s.ctx.notes||""},t=await Q(e);try{localStorage.setItem("seroSessionId",t.sessionId)}catch{}b({sessionId:t.sessionId,sessionDir:t.sessionDir||null,createdAt:t.createdAt??Date.now(),stage:v.FOCUS_POINTS})}catch(e){b({stage:v.ERROR,error:e.message,retryStage:v.INTAKE})}}const[j,E]=await Promise.allSettled([B(),K()]);y=j.status==="fulfilled"?j.value.types:[],g=E.status==="fulfilled"&&Array.isArray((M=E.value)==null?void 0:M.people)?E.value.people:null;const U=await w(k,()=>_(h));T(U)}function ee(){}export{Z as mount,ee as unmount};
//# sourceMappingURL=intake-CHRW4gXl.js.map
