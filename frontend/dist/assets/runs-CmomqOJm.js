import{i as g,s as l,w as f,p as b,e as p,S as u}from"./index-Lojh5UQc.js";import{r as w}from"./time-C7qwLehH.js";import{S as v}from"./star-6WkPOSOg.js";function x(e){const t=e.ctx||{},n=[];t.name&&n.push(t.name),t.role&&n.push(t.seniority?`${t.role}, ${t.seniority}`:t.role),t.meetingType&&n.push(t.meetingType);const i=w(e.lastSeenAt);return i&&n.push(i),p(n.length?n.join(" · "):e.headline||"Untitled 1:1")}const A=async(e,{setState:t})=>{const n=`
    <header class="page-header">
      <h1 class="h1">Past 1:1s</h1>
      <div class="text-ink-dim text-sm">Your past prep sessions.</div>
    </header>`,i=a=>`<div class="stage-inner l-stack l-stack--8">${n}${a}</div>`,m=g(l.user)?`
    <section class="card-flat space-y-3">
      <div class="eyebrow">No 1:1s yet</div>
      <p class="text-sm text-ink-dim">You haven't done any 1:1s yet. Start your first one and it'll show up here.</p>
      <button type="button" class="btn js-start">Start a 1:1</button>
    </section>`:`
    <section class="card-flat space-y-3">
      <div class="eyebrow">No 1:1s yet</div>
      <p class="text-sm text-ink-dim">Your past 1:1s will show up here once you've had one.</p>
    </section>`,y=`
    <section class="card-flat space-y-3">
      <div class="eyebrow">Couldn't load your 1:1s</div>
      <p class="text-sm text-ink-dim">Something went wrong on our end, not yours. Try again in a moment. If it keeps happening, email <a href="mailto:carl@seroteams.com">carl@seroteams.com</a> and we'll help sort it out.</p>
      <button type="button" class="btn btn--ghost js-retry">Try again</button>
    </section>`,h=()=>{l.scripted=null,Object.assign(l.ctx,{name:"",role:"",seniority:"",meetingType:"",meetingTypeIndex:null,notes:""}),t({sessionId:null,stage:u.INTAKE,substage:"NAME"})},c=()=>{var a,o;(a=e.querySelector(".js-start"))==null||a.addEventListener("click",h),(o=e.querySelector(".js-retry"))==null||o.addEventListener("click",()=>{d()}),e.querySelectorAll(".js-open").forEach(s=>{s.addEventListener("click",()=>{const r=s.dataset.id;r&&t({myRunId:r,stage:u.RUN_DETAIL})})})},d=async()=>{e.innerHTML=i('<section class="card-flat"><p class="text-sm text-ink-dim">Loading your 1:1s…</p></section>');let a;try{const s=await f();a=Array.isArray(s==null?void 0:s.runs)?s.runs:[]}catch{e.innerHTML=i(y),c();return}if(a.length===0){e.innerHTML=i(m),c();return}const o=a.slice().sort((s,r)=>(r.lastSeenAt||0)-(s.lastSeenAt||0)).map(s=>{const r=s.rating?`<span class="runs-list__stars text-sm" aria-label="rated ${s.rating.stars} out of 5">${b(v,{size:16,fill:"currentColor"})} ${s.rating.stars}</span>`:"";return`<button type="button" class="card-flat runs-list__row js-open" data-id="${p(s.id)}"><span class="text-sm">${x(s)}</span>${r}</button>`}).join("");e.innerHTML=i(`<section class="l-stack l-stack--2">${o}</section>`),c()};await d()},$=()=>{};export{A as mount,$ as unmount};
//# sourceMappingURL=runs-CmomqOJm.js.map
