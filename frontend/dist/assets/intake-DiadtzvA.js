import{S as g,f as D,A as R,B as P,n as F}from"./index-D93BFPRu.js";import{s as A,f as L}from"./field-iS32XwvO.js";import{c as H}from"./session-reset-DdQ5WOmY.js";const y=["NAME","ROLE","SENIORITY","MEETING_TYPE","NOTES"],I={NAME:{question:"Who are you prepping for?",hint:"Their first name is enough.",placeholder:"e.g. Priya",key:"name"},ROLE:{question:"What do they do?",hint:"Their role as you'd say it out loud.",placeholder:"e.g. Senior backend engineer",key:"role"},SENIORITY:{question:"And their seniority?",hint:"IC level, staff, manager, director — whatever reads naturally.",placeholder:"e.g. Senior / Staff / Lead",key:"seniority"},NOTES:{question:"Anything Sero should know?",placeholder:"e.g. Quieter since the reorg ~3 weeks ago. Something feels off.",key:"notes"}};async function Y(h,{store:i,setState:m}){h.innerHTML=`
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
        <div class="intake-progress" role="progressbar" aria-valuemin="1" aria-valuemax="${y.length}" aria-valuenow="1">
          <div class="intake-progress__fill"></div>
        </div>
      </header>
      <div class="field-host"></div>
    </div>
  `;const k=h.querySelector(".field-host"),N=h.querySelector(".stage-step"),S=h.querySelector(".js-intake-lede"),_=h.querySelector(".intake-progress"),q=h.querySelector(".intake-progress__fill");h.querySelector(".js-start-fresh").addEventListener("click",async()=>{await H(D,{to:g.START})&&(R(),m({stage:g.START}))});let f=null,v=i.substage||"NAME";function x(){const t=y.indexOf(v)+1;N.textContent=`Step ${t} of ${y.length}`,S&&(S.hidden=v!=="NAME"),_.setAttribute("aria-valuenow",String(t)),q.style.width=`${t/y.length*100}%`}x();function w(t){return t==="MEETING_TYPE"?M():t==="NOTES"?O():j(t)}const E=[{id:"workload",label:"Workload"},{id:"motivation",label:"Motivation"},{id:"friction",label:"Friction"},{id:"delivery",label:"Delivery"},{id:"growth",label:"Growth"}];function $({pills:t,free:e}){const n=[];return t.length&&n.push(`On the manager's mind: ${t.map(r=>r.label.toLowerCase()).join(", ")}.`),e&&n.push(e),n.join(`
`)}function j(t){const e=I[t],n=document.createElement("div");n.className="space-y-4",n.innerHTML=`
      <label class="block">
        <h1 class="h1 mb-4">${e.question}</h1>
        <input class="input" type="text" autocomplete="off"
               spellcheck="false" placeholder="${e.placeholder}"
               aria-describedby="hint-${e.key} err-${e.key}" data-autofocus />
      </label>
      <div class="hint" id="hint-${e.key}">${e.hint}</div>
      <div class="field__error" id="err-${e.key}" hidden></div>
      <div class="field__actions">
        <button class="btn js-next">Continue</button>
      </div>
    `;const r=n.querySelector("input");r.value=i.ctx[e.key]||"",r.addEventListener("keydown",s=>{s.key==="Enter"&&(s.preventDefault(),c())}),n.querySelector(".js-next").addEventListener("click",c);function c(){const s=r.value.trim(),o=n.querySelector(".field__error");if(!s){o.textContent="Add a value to continue.",o.hidden=!1,r.setAttribute("aria-invalid","true");return}o.hidden=!0,r.removeAttribute("aria-invalid"),i.ctx[e.key]=s,T()}return n}function O(){const t=I.NOTES,e=document.createElement("div");e.className="space-y-5",e.innerHTML=`
      <h1 class="h1 mb-2">${t.question}</h1>
      <div class="hint">Optional. Tap what's prompting this 1:1, then add anything in your own words.</div>
      <div class="space-y-2">
        <div class="eyebrow" id="pills-label">What's on your mind?</div>
        <div class="pill-row js-pills" role="group" aria-labelledby="pills-label"></div>
      </div>
      <label class="block space-y-2">
        <textarea class="textarea js-notes" rows="4" placeholder="${t.placeholder}"></textarea>
      </label>
      <div class="field__actions">
        <button class="btn js-submit">Continue</button>
        <button class="btn btn--ghost js-skip">Skip (optional)</button>
      </div>
    `;const n=new Set(i.ctx.issuePills||[]),r=e.querySelector(".js-pills"),c=[];function s(l){const u=(l+c.length)%c.length;c.forEach((a,d)=>{a.tabIndex=d===u?0:-1}),c[u].focus()}E.forEach((l,u)=>{const a=document.createElement("button");a.type="button",a.className="pill"+(n.has(l.id)?" is-selected":""),a.textContent=l.label,a.setAttribute("aria-pressed",n.has(l.id)?"true":"false"),a.tabIndex=u===0?0:-1,u===0&&a.setAttribute("data-autofocus",""),a.addEventListener("click",()=>{const d=n.has(l.id);d?n.delete(l.id):n.add(l.id),a.classList.toggle("is-selected",!d),a.setAttribute("aria-pressed",String(!d))}),a.addEventListener("keydown",d=>{d.key==="ArrowRight"||d.key==="ArrowDown"?(d.preventDefault(),s(u+1)):(d.key==="ArrowLeft"||d.key==="ArrowUp")&&(d.preventDefault(),s(u-1))}),c.push(a),r.appendChild(a)});const o=e.querySelector(".js-notes");o.value=i.ctx.freeNotes??i.ctx.notes??"";function p(){const l=E.filter(a=>n.has(a.id)),u=o.value.trim();i.ctx.issuePills=l.map(a=>a.id),i.ctx.freeNotes=u,i.ctx.notes=$({pills:l,free:u}),b()}return o.addEventListener("keydown",l=>{l.key==="Enter"&&!l.shiftKey&&(l.preventDefault(),p())}),e.querySelector(".js-submit").addEventListener("click",p),e.querySelector(".js-skip").addEventListener("click",()=>{n.clear(),i.ctx.issuePills=[],i.ctx.freeNotes="",i.ctx.notes="",b()}),e}function M(){const t=document.createElement("div");t.className="space-y-5",t.setAttribute("tabindex","0"),t.setAttribute("data-autofocus",""),t.innerHTML=`
      <h1 class="h1 mb-2">What kind of meeting?</h1>
      <div class="hint mb-3">Pick the shape that fits today. Click a card to continue — you can add nuance in the notes step.</div>
      <div class="grid gap-3 js-cards"></div>
    `;const e=t.querySelector(".js-cards");let n=Number.isInteger(i.ctx.meetingTypeIndex)?i.ctx.meetingTypeIndex:0;function r(){e.innerHTML="",f.forEach((s,o)=>{const p=document.createElement("button");p.className="meeting-card",o===n&&p.classList.add("is-selected"),p.setAttribute("data-i",String(o)),p.innerHTML=`
          <div>
            <span class="meeting-card__label">${s.label}</span>
            ${s.badge?`<span class="meeting-card__badge">${s.badge}</span>`:""}
          </div>
          <div class="meeting-card__meta">${s.duration} · ${s.description}</div>
        `,p.addEventListener("click",()=>{n=o,r(),c()}),e.appendChild(p)})}function c(){i.ctx.meetingTypeIndex=n,i.ctx.meetingType=f[n].label,T()}return r(),t.addEventListener("keydown",s=>{if(s.key==="ArrowDown"||s.key==="ArrowRight")s.preventDefault(),n=(n+1)%f.length,r();else if(s.key==="ArrowUp"||s.key==="ArrowLeft")s.preventDefault(),n=(n-1+f.length)%f.length,r();else if(/^[1-9]$/.test(s.key)){const o=Number(s.key)-1;o<f.length&&(n=o,r(),c())}else s.key==="Enter"&&(s.preventDefault(),c())}),t}async function T(){const t=y.indexOf(v),e=y[t+1];if(!e)return b();v=e,x();const n=await A(k,()=>w(e));L(n)}async function b(){try{const t={name:i.ctx.name,role:i.ctx.role,seniority:i.ctx.seniority,meetingTypeIndex:i.ctx.meetingTypeIndex,notes:i.ctx.notes||""},e=await F(t);try{localStorage.setItem("seroSessionId",e.sessionId)}catch{}m({sessionId:e.sessionId,sessionDir:e.sessionDir||null,createdAt:e.createdAt??Date.now(),stage:g.FOCUS_POINTS})}catch(t){m({stage:g.ERROR,error:t.message,retryStage:g.INTAKE})}}try{f=(await P()).types}catch{f=[]}const C=await A(k,()=>w(v));L(C)}function B(){}export{Y as mount,B as unmount};
//# sourceMappingURL=intake-DiadtzvA.js.map
