import{u as E,v as S,S as f,s as k,w as L,x as A,e as r,p as C}from"./index-D93BFPRu.js";import{g}from"./group-people-D9T6J-u8.js";import{r as M}from"./time-C7qwLehH.js";import{S as P}from"./star-6WkPOSOg.js";function v(e){if(e.count===0)return r("1:1 prep in progress · not met yet");const l=[`${e.count} meeting${e.count>1?"s":""}`],a=M(e.lastMet);a&&l.push(`last ${a}`),e.openCount>0&&l.push("prep in progress");const o=e.avgStars!=null?`${C(P,{size:16,fill:"currentColor"})} ${r(e.avgStars.toFixed(1))} avg (${e.ratedCount} rated)`:"not yet rated";return`${r(l.join(" · "))} · ${o}`}function R(e){const l=e.role?`<span class="text-ink-dim"> · ${r(e.role)}</span>`:"",a=`<span class="l-stack l-stack--2"><span class="text-sm"><strong>${r(e.name)}</strong>${l}</span><span class="text-sm text-ink-dim">${v(e)}</span></span>`;return e.count===0?`<div class="card-flat runs-list__row">${a}</div>`:`<button type="button" class="card-flat runs-list__row js-person" data-key="${r(e.key)}">${a}</button>`}function _(e,l){const a=e.role?`<span class="text-ink-dim"> · ${r(e.role)}</span>`:"",o=l.filter(c=>c.key!==e.key).map(c=>`<option value="${r(c.key)}">${r(c.name)}</option>`).join(""),d=o?`<label class="text-sm text-ink-dim">Merge into
         <select class="input js-merge" data-key="${r(e.key)}" data-name="${r(e.name)}">
           <option value="">— choose —</option>${o}
         </select></label>`:"";return`
    <div class="card-flat l-stack l-stack--2">
      <div class="text-sm"><strong>${r(e.name)}</strong>${a}</div>
      <div class="text-sm text-ink-dim">${v(e)}</div>
      <div class="l-cluster l-cluster--2">
        <button type="button" class="btn btn--ghost btn--sm js-rename" data-key="${r(e.key)}" data-name="${r(e.name)}">Rename</button>
        ${d}
      </div>
    </div>`}const N=async(e,{setState:l})=>{let a={merges:{},names:{}},o=[],d=!1,c=[];const b=t=>`
    <header class="page-header">
      <div class="page-header__row">
        <h1 class="h1">Team</h1>
        ${t?`<button type="button" class="btn btn--ghost btn--sm js-edit">${d?"Done":"Tidy up"}</button>`:""}
      </div>
      <div class="text-ink-dim text-sm">${d?"Merge duplicates or rename a person.":"The people you meet with, built from your 1:1s."}</div>
    </header>`,u=(t,i=!0)=>`<div class="stage-inner l-stack l-stack--8">${b(i)}${t}</div>`,$=()=>{k.scripted=null,Object.assign(k.ctx,{name:"",role:"",seniority:"",meetingType:"",meetingTypeIndex:null,notes:""}),l({sessionId:null,stage:f.INTAKE,substage:"NAME"})},w=`
    <section class="card-flat space-y-3">
      <div class="eyebrow">Your team will fill in here</div>
      <p class="text-sm text-ink-dim">As you prep 1:1s, the people you meet with appear here with their history. Start your first one.</p>
      <button type="button" class="btn js-start">Prep a 1:1</button>
    </section>`,x=`
    <section class="card-flat space-y-3">
      <div class="eyebrow">Couldn't load your team</div>
      <p class="text-sm text-ink-dim">Something went wrong. Please try again.</p>
      <button type="button" class="btn btn--ghost js-retry">Try again</button>
    </section>`,m=()=>{const t=d?o.map(i=>_(i,o)).join(""):o.map(R).join("");e.innerHTML=u(`<section class="l-stack l-stack--2">${t}</section>`),y()},y=()=>{var t,i,s;(t=e.querySelector(".js-start"))==null||t.addEventListener("click",$),(i=e.querySelector(".js-retry"))==null||i.addEventListener("click",()=>{h()}),(s=e.querySelector(".js-edit"))==null||s.addEventListener("click",()=>{d=!d,m()}),e.querySelectorAll(".js-person").forEach(n=>{n.addEventListener("click",()=>{const p=n.dataset.key;p&&l({personKey:p,stage:f.PERSON_DETAIL})})}),e.querySelectorAll(".js-rename").forEach(n=>{n.addEventListener("click",()=>{j(n.dataset.key||"",n.dataset.name||"")})}),e.querySelectorAll(".js-merge").forEach(n=>{n.addEventListener("change",()=>{T(n.dataset.key||"",n.dataset.name||"",n.value)})})},j=async(t,i)=>{const s=window.prompt("Rename this person (leave blank to reset to the auto name):",i);if(s!==null)try{a=await L(t,s.trim()),o=g(c,a),m()}catch{window.alert("Couldn't rename — please try again.")}},T=async(t,i,s)=>{if(!s)return;const n=o.find(p=>p.key===s);if(!window.confirm(`Merge "${i}" into "${(n==null?void 0:n.name)??s}"? Their 1:1s and rating combine into one person.`)){m();return}try{a=await A(t,s),o=g(c,a),m()}catch{window.alert("Couldn't merge — please try again.")}},h=async()=>{e.innerHTML=u('<section class="card-flat"><p class="text-sm text-ink-dim">Loading your team…</p></section>',!1);try{const[t,i]=await Promise.all([E({open:!0}),S().catch(()=>({}))]);c=Array.isArray(t==null?void 0:t.runs)?t.runs:[];const s=i;a={merges:(s==null?void 0:s.merges)||{},names:(s==null?void 0:s.names)||{}}}catch{e.innerHTML=u(x,!1),y();return}if(o=g(c,a),o.length===0){d=!1,e.innerHTML=u(w,!1),y();return}m()};await h()},D=()=>{};export{N as mount,D as unmount};
//# sourceMappingURL=team-D-qQGGyd.js.map
