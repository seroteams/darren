import{v as L,w as S,S as v,s as f,x as T,y as C,z as P,A as R,B as q,e as n,p as I}from"./index-Lojh5UQc.js";import{b as M}from"./group-people-BP1R16Np.js";import{r as _}from"./time-C7qwLehH.js";import{S as H}from"./star-6WkPOSOg.js";function g(t){if(t.count===0)return n(t.openCount>0?"1:1 prep in progress · not met yet":"not met yet");const i=[`${t.count} meeting${t.count>1?"s":""}`],r=_(t.lastMet);r&&i.push(`last ${r}`),t.openCount>0&&i.push("prep in progress");const o=t.avgStars!=null?`${I(H,{size:16,fill:"currentColor"})} ${n(t.avgStars.toFixed(1))} avg (${t.ratedCount} rated)`:"not yet rated";return`${n(i.join(" · "))} · ${o}`}function O(t){const i=t.role?`<span class="text-ink-dim"> · ${n(t.role)}</span>`:"",r=`<span class="l-stack l-stack--2"><span class="text-sm"><strong>${n(t.name)}</strong>${i}</span><span class="text-sm text-ink-dim">${g(t)}</span></span>`;return t.met?`<button type="button" class="card-flat runs-list__row js-person" data-key="${n(t.key)}">${r}</button>`:`
    <div class="card-flat runs-list__row l-cluster" style="justify-content:space-between;align-items:center;">
      ${r}
      <button type="button" class="btn btn--ghost btn--sm js-prep-new" data-key="${n(t.key)}" data-name="${n(t.name)}" data-role="${n(t.role)}">Prep first 1:1</button>
    </div>`}function z(t,i){const r=t.role?`<span class="text-ink-dim"> · ${n(t.role)}</span>`:"",o=i.map(m=>`<option value="${n(m.id)}" ${m.id===t.userId?"selected":""}>${n(m.name)} (${n(m.email)})</option>`).join(""),u=i.length?`<label class="text-sm text-ink-dim l-stack l-stack--1">Linked account
         <select class="input js-link" data-key="${n(t.key)}" data-name="${n(t.name)}">
           <option value="" ${t.userId?"":"selected"}>— none —</option>${o}
         </select></label>`:"";return`
    <div class="card-flat l-stack l-stack--2">
      <div class="text-sm"><strong>${n(t.name)}</strong>${r}</div>
      <div class="text-sm text-ink-dim">${g(t)}</div>
      <div class="l-cluster l-cluster--2">
        <button type="button" class="btn btn--ghost btn--sm js-rename" data-key="${n(t.key)}" data-name="${n(t.name)}">Rename</button>
      </div>
      ${u}
    </div>`}const B=async(t,{setState:i})=>{let r=[],o=!1,u=[];const m=e=>`
    <header class="page-header">
      <div class="page-header__row">
        <h1 class="h1">Team</h1>
        <div class="l-cluster l-cluster--2">
          ${e?`<button type="button" class="btn btn--ghost btn--sm js-edit">${o?"Done":"Tidy up"}</button>`:""}
          ${o?"":'<button type="button" class="btn btn--ghost btn--sm js-add">Add someone</button>'}
        </div>
      </div>
      <div class="text-ink-dim text-sm">${o?"Rename a person.":"Everyone on your team. Add a name now; their 1:1 history fills in as you meet."}</div>
    </header>`,p=(e,a=!0)=>`<div class="stage-inner l-stack l-stack--8">${m(a)}${e}</div>`,h=(e={})=>{f.scripted=null,Object.assign(f.ctx,{personId:e.personId??null,name:e.name??"",role:e.role??"",seniority:"",meetingType:"",meetingTypeIndex:null,notes:""}),i({sessionId:null,stage:v.INTAKE,substage:"NAME"})},$=`
    <section class="card-flat space-y-3">
      <div class="eyebrow">Your team starts here</div>
      <p class="text-sm text-ink-dim">Add the people you manage — even before your first 1:1. Their history fills in as you prep and meet.</p>
      <div class="l-cluster l-cluster--2">
        <button type="button" class="btn js-add">Add someone</button>
        <button type="button" class="btn btn--ghost js-start">Prep a 1:1</button>
      </div>
    </section>`,w=`
    <section class="card-flat space-y-3">
      <div class="eyebrow">Couldn't load your team</div>
      <p class="text-sm text-ink-dim">Something went wrong. Please try again.</p>
      <button type="button" class="btn btn--ghost js-retry">Try again</button>
    </section>`,b=()=>{const e=o?r.map(a=>z(a,u)).join(""):r.map(O).join("");t.innerHTML=p(`<section class="l-stack l-stack--2">${e}</section>`),k()},x=async()=>{if(o=!o,o&&u.length===0)try{const e=await C();u=Array.isArray(e.users)?e.users:[]}catch{u=[]}b()},k=()=>{var e,a,l,d;(e=t.querySelector(".js-start"))==null||e.addEventListener("click",()=>h()),(a=t.querySelector(".js-retry"))==null||a.addEventListener("click",()=>{y()}),(l=t.querySelector(".js-add"))==null||l.addEventListener("click",()=>{A()}),(d=t.querySelector(".js-edit"))==null||d.addEventListener("click",()=>{x()}),t.querySelectorAll(".js-person").forEach(s=>{s.addEventListener("click",()=>{const c=s.dataset.key;c&&i({personKey:c,stage:v.PERSON_DETAIL})})}),t.querySelectorAll(".js-prep-new").forEach(s=>{s.addEventListener("click",()=>h({personId:s.dataset.key,name:s.dataset.name,role:s.dataset.role}))}),t.querySelectorAll(".js-rename").forEach(s=>{s.addEventListener("click",()=>{E(s.dataset.key||"",s.dataset.name||"")})}),t.querySelectorAll(".js-link").forEach(s=>{s.addEventListener("change",()=>{j(s.dataset.key||"",s.dataset.name||"",s.value)})})},j=async(e,a,l)=>{const d=u.find(c=>c.id===l),s=d?`Link "${a}" to ${d.name} (${d.email})? They'll see the list of 1:1s about them — dates and meeting types, never your notes.`:`Unlink "${a}" from their account? They'll stop seeing the 1:1s about them.`;if(!window.confirm(s)){b();return}try{d?await R(e,l):await q(e),await y()}catch(c){window.alert(c instanceof Error?c.message:"Couldn't update the link — please try again."),b()}},A=async()=>{const e=window.prompt("Add someone to your team — their name:","");if(e!==null&&e.trim())try{await T({name:e.trim()}),await y()}catch{window.alert("Couldn't add them — please try again.")}},E=async(e,a)=>{const l=window.prompt("Rename this person:",a);if(!(l===null||!l.trim()))try{await P(e,l.trim()),await y()}catch{window.alert("Couldn't rename — please try again.")}},y=async()=>{t.innerHTML=p('<section class="card-flat"><p class="text-sm text-ink-dim">Loading your team…</p></section>',!1);let e,a;try{const[l,d]=await Promise.all([L(),S({open:!0})]),s=l,c=d;e=Array.isArray(s.people)?s.people:[],a=Array.isArray(c.runs)?c.runs:[]}catch{t.innerHTML=p(w,!1),k();return}if(r=M(e,a),r.length===0){o=!1,t.innerHTML=p($,!1),k();return}b()};await y()},F=()=>{};export{B as mount,F as unmount};
//# sourceMappingURL=team-C_b9vW3h.js.map
