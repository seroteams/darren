import{i as y,s as d,S as m,q as g,e as l,t as h}from"./index-D93BFPRu.js";let c=null;async function b(a,{setState:s}){a.innerHTML=`
    <div class="stage-inner l-stack l-stack--8">
      <header class="page-header">
        <h1 class="h1">Welcome to Sero</h1>
        <div class="text-ink-dim text-sm">Prep for your next 1:1 in a few minutes.</div>
      </header>

      <section class="card-flat space-y-3">
        <div class="eyebrow">Start here</div>
        <p class="text-sm">Sero walks you through a quick prep and writes a briefing you can use in the meeting. Here's how it goes:</p>
        <p class="text-sm text-ink-dim">1 &middot; Tell Sero who you're meeting and what's on your mind.</p>
        <p class="text-sm text-ink-dim">2 &middot; Answer a few short questions.</p>
        <p class="text-sm text-ink-dim">3 &middot; Get a briefing to guide the 1:1.</p>
        <button type="button" class="btn js-start">Start a new session</button>
      </section>
    </div>
  `;function t(){d.scripted=null,Object.assign(d.ctx,{name:"",role:"",seniority:"",meetingType:"",meetingTypeIndex:null,notes:""}),s({sessionId:null,stage:m.INTAKE,substage:"NAME"})}if(a.querySelector(".js-start").addEventListener("click",t),y(d.user)){const e=a.querySelector(".card-flat"),n=document.createElement("button");n.type="button",n.className="btn btn--ghost js-prefill",n.textContent="Prefill a run (dev)",n.style.marginLeft="8px",e.appendChild(n),n.addEventListener("click",()=>f(s))}c=e=>{document.querySelector(".modal-backdrop")||e.target&&/^(input|textarea|select)$/i.test(e.target.tagName)||e.key==="Enter"&&(e.preventDefault(),t())},window.addEventListener("keydown",c)}function f(a){const s=document.createElement("div");s.className="modal-backdrop";const t=document.createElement("div");t.className="card modal",t.setAttribute("role","dialog"),t.setAttribute("aria-modal","true"),t.innerHTML=`
    <div class="h3">Prefill a run</div>
    <p class="text-sm text-ink-dim">Pick a finished run to copy into a new one you can walk through. Free — nothing is generated.</p>
    <div class="js-list l-stack l-stack--2" style="max-height:50vh;overflow:auto;margin-top:8px;">
      <p class="text-sm text-ink-mute">Loading…</p>
    </div>
    <div class="modal__actions"><button class="btn btn--ghost js-close" type="button">Close</button></div>
  `,s.appendChild(t),document.body.appendChild(s);const e=t.querySelector(".js-list"),n=()=>s.remove();t.querySelector(".js-close").addEventListener("click",n),s.addEventListener("click",r=>{r.target===s&&n()}),g().then(r=>{const u=r&&r.runs||[];if(!u.length){e.innerHTML='<p class="text-sm text-ink-mute">No finished runs to copy yet.</p>';return}e.innerHTML=u.map(i=>{const o=i.ctx||{},p=[o.name,o.role,o.meetingType].filter(Boolean).map(l).join(" · ")||l(i.headline||i.id);return`<button class="btn btn--ghost js-pick" type="button" data-id="${l(i.id)}" style="text-align:left;justify-content:flex-start;">${p}</button>`}).join(""),e.querySelectorAll(".js-pick").forEach(i=>{i.addEventListener("click",async()=>{e.innerHTML='<p class="text-sm text-ink-dim">Prefilling…</p>';try{const{id:o}=await h(i.getAttribute("data-id"));n(),a({myRunId:o,stage:m.RUN_DETAIL})}catch(o){e.innerHTML=`<p class="text-sm" style="color:var(--color-negative)">Couldn't prefill: ${l(o.message||"error")}</p>`}})})}).catch(r=>{e.innerHTML=`<p class="text-sm" style="color:var(--color-negative)">Couldn't load runs: ${l(r.message||"error")}</p>`})}function k(){var a;c&&(window.removeEventListener("keydown",c),c=null),(a=document.querySelector(".modal-backdrop"))==null||a.remove()}export{b as mount,k as unmount};
//# sourceMappingURL=member-home-D5RCNt65.js.map
