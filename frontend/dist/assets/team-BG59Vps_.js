import{v as S,w as T,S as k,s as $,x as C,y as P,z as I,A as R,B as q,C as M,e as s,p as _}from"./index-CamYUUDR.js";import{b as H}from"./group-people-BP1R16Np.js";import{r as O}from"./time-C7qwLehH.js";import{S as z}from"./star-6WkPOSOg.js";function f(t){if(t.count===0)return s(t.openCount>0?"1:1 prep in progress · not met yet":"not met yet");const c=[`${t.count} meeting${t.count>1?"s":""}`],i=O(t.lastMet);i&&c.push(`last ${i}`),t.openCount>0&&c.push("prep in progress");const l=t.avgStars!=null?`${_(z,{size:16,fill:"currentColor"})} ${s(t.avgStars.toFixed(1))} avg (${t.ratedCount} rated)`:"not yet rated";return`${s(c.join(" · "))} · ${l}`}function D(t){const c=t.role?`<span class="text-ink-dim"> · ${s(t.role)}</span>`:"",i=`<span class="l-stack l-stack--2"><span class="text-sm"><strong>${s(t.name)}</strong>${c}</span><span class="text-sm text-ink-dim">${f(t)}</span></span>`;return t.met?`<button type="button" class="card-flat runs-list__row js-person" data-key="${s(t.key)}">${i}</button>`:`
    <div class="card-flat runs-list__row l-cluster" style="justify-content:space-between;align-items:center;">
      ${i}
      <button type="button" class="btn btn--ghost btn--sm js-prep-new" data-key="${s(t.key)}" data-name="${s(t.name)}" data-role="${s(t.role)}">Prep first 1:1</button>
    </div>`}function K(t,c){const i=t.role?`<span class="text-ink-dim"> · ${s(t.role)}</span>`:"",l=c.map(u=>`<option value="${s(u.id)}" ${u.id===t.userId?"selected":""}>${s(u.name)} (${s(u.email)})</option>`).join(""),m=c.length?`<label class="text-sm text-ink-dim l-stack l-stack--1">Linked account
         <select class="input js-link" data-key="${s(t.key)}" data-name="${s(t.name)}">
           <option value="" ${t.userId?"":"selected"}>— none —</option>${l}
         </select></label>`:"",b=t.userId?"":`<button type="button" class="btn btn--ghost btn--sm js-invite" data-key="${s(t.key)}" data-name="${s(t.name)}">Invite…</button>`;return`
    <div class="card-flat l-stack l-stack--2">
      <div class="text-sm"><strong>${s(t.name)}</strong>${i}</div>
      <div class="text-sm text-ink-dim">${f(t)}</div>
      <div class="l-cluster l-cluster--2">
        <button type="button" class="btn btn--ghost btn--sm js-rename" data-key="${s(t.key)}" data-name="${s(t.name)}">Rename</button>
        ${b}
      </div>
      ${m}
    </div>`}const N=async(t,{setState:c})=>{let i=[],l=!1,m=[];const b=e=>`
    <header class="page-header">
      <div class="page-header__row">
        <h1 class="h1">Team</h1>
        <div class="l-cluster l-cluster--2">
          ${e?`<button type="button" class="btn btn--ghost btn--sm js-edit">${l?"Done":"Tidy up"}</button>`:""}
          ${l?"":'<button type="button" class="btn btn--ghost btn--sm js-add">Add someone</button>'}
        </div>
      </div>
      <div class="text-ink-dim text-sm">${l?"Rename a person.":"Everyone on your team. Add a name now; their 1:1 history fills in as you meet."}</div>
    </header>`,u=(e,a=!0)=>`<div class="stage-inner l-stack l-stack--8">${b(a)}${e}</div>`,h=(e={})=>{$.scripted=null,Object.assign($.ctx,{personId:e.personId??null,name:e.name??"",role:e.role??"",seniority:"",meetingType:"",meetingTypeIndex:null,notes:""}),c({sessionId:null,stage:k.INTAKE,substage:"NAME"})},g=`
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
    </section>`,p=()=>{const e=l?i.map(a=>K(a,m)).join(""):i.map(D).join("");t.innerHTML=u(`<section class="l-stack l-stack--2">${e}</section>`),v()},j=async()=>{if(l=!l,l&&m.length===0)try{const e=await P();m=Array.isArray(e.users)?e.users:[]}catch{m=[]}p()},v=()=>{var e,a,r,o;(e=t.querySelector(".js-start"))==null||e.addEventListener("click",()=>h()),(a=t.querySelector(".js-retry"))==null||a.addEventListener("click",()=>{y()}),(r=t.querySelector(".js-add"))==null||r.addEventListener("click",()=>{A()}),(o=t.querySelector(".js-edit"))==null||o.addEventListener("click",()=>{j()}),t.querySelectorAll(".js-person").forEach(n=>{n.addEventListener("click",()=>{const d=n.dataset.key;d&&c({personKey:d,stage:k.PERSON_DETAIL})})}),t.querySelectorAll(".js-prep-new").forEach(n=>{n.addEventListener("click",()=>h({personId:n.dataset.key,name:n.dataset.name,role:n.dataset.role}))}),t.querySelectorAll(".js-rename").forEach(n=>{n.addEventListener("click",()=>{L(n.dataset.key||"",n.dataset.name||"")})}),t.querySelectorAll(".js-link").forEach(n=>{n.addEventListener("change",()=>{E(n.dataset.key||"",n.dataset.name||"",n.value)})}),t.querySelectorAll(".js-invite").forEach(n=>{n.addEventListener("click",()=>{x(n.dataset.key||"",n.dataset.name||"")})})},x=async(e,a)=>{const r=window.prompt(`Invite ${a} — their email address:`,"");if(!(r===null||!r.trim()))try{const o=await M(e,r.trim());window.prompt(`Send ${a} this link (valid 7 days, works once). They'll set a password and see their own 1:1 history — never your notes:`,`${window.location.origin}${o.link}`)}catch(o){window.alert(o instanceof Error?o.message:"Couldn't create the invite — please try again.")}},E=async(e,a,r)=>{const o=m.find(d=>d.id===r),n=o?`Link "${a}" to ${o.name} (${o.email})? They'll see the list of 1:1s about them — dates and meeting types, never your notes.`:`Unlink "${a}" from their account? They'll stop seeing the 1:1s about them.`;if(!window.confirm(n)){p();return}try{o?await R(e,r):await q(e),await y()}catch(d){window.alert(d instanceof Error?d.message:"Couldn't update the link — please try again."),p()}},A=async()=>{const e=window.prompt("Add someone to your team — their name:","");if(e!==null&&e.trim())try{await C({name:e.trim()}),await y()}catch{window.alert("Couldn't add them — please try again.")}},L=async(e,a)=>{const r=window.prompt("Rename this person:",a);if(!(r===null||!r.trim()))try{await I(e,r.trim()),await y()}catch{window.alert("Couldn't rename — please try again.")}},y=async()=>{t.innerHTML=u('<section class="card-flat"><p class="text-sm text-ink-dim">Loading your team…</p></section>',!1);let e,a;try{const[r,o]=await Promise.all([S(),T({open:!0})]),n=r,d=o;e=Array.isArray(n.people)?n.people:[],a=Array.isArray(d.runs)?d.runs:[]}catch{t.innerHTML=u(w,!1),v();return}if(i=H(e,a),i.length===0){l=!1,t.innerHTML=u(g,!1),v();return}p()};await y()},U=()=>{};export{N as mount,U as unmount};
//# sourceMappingURL=team-BG59Vps_.js.map
