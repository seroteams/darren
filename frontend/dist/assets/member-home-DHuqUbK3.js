import{i as m,s as u,q as p,e as r,t as h,u as y,S as g}from"./index-CamYUUDR.js";import{f as v}from"./time-C7qwLehH.js";async function f(o,{setState:i}){if(o.innerHTML=`
    <div class="stage-inner l-stack l-stack--8">
      <header class="page-header">
        <h1 class="h1">Welcome to Sero</h1>
        <div class="text-ink-dim text-sm">Your manager uses Sero to prepare your 1:1s. Here's your history.</div>
      </header>

      <section class="card-flat space-y-3">
        <div class="eyebrow">Your 1:1s</div>
        <div class="js-about-me l-stack l-stack--2"><p class="text-sm text-ink-mute">Loading…</p></div>
      </section>
    </div>
  `,m(u.user)){const s=o.querySelector(".card-flat"),e=document.createElement("button");e.type="button",e.className="btn btn--ghost js-prefill",e.textContent="Prefill a run (dev)",s.appendChild(e),e.addEventListener("click",()=>k(i))}const n=o.querySelector(".js-about-me");try{const s=await p(),e=s&&s.runs||[];n.innerHTML=e.length?e.map(t=>{const c=t.completedAt||t.lastSeenAt,a=t.managerName?` · with ${r(t.managerName)}`:"";return`<div class="runs-list__row"><span class="text-sm"><strong>${r(t.meetingType||"1:1")}</strong>${a}</span><span class="text-sm text-ink-dim">${c?r(v(c)):""}</span></div>`}).join(""):'<p class="text-sm text-ink-dim">Nothing here yet. When your manager preps a 1:1 with you, it shows up here — the date and meeting type, so you always know where things stand.</p>'}catch{n.innerHTML=`<p class="text-sm text-ink-dim">Couldn't load your 1:1s. Please try again in a moment.</p>`}}function k(o){const i=document.createElement("div");i.className="modal-backdrop";const n=document.createElement("div");n.className="card modal",n.setAttribute("role","dialog"),n.setAttribute("aria-modal","true"),n.innerHTML=`
    <div class="h3">Prefill a run</div>
    <p class="text-sm text-ink-dim">Pick a finished run to copy into a new one you can walk through. Free — nothing is generated.</p>
    <div class="js-list l-stack l-stack--2" style="max-height:50vh;overflow:auto;margin-top:8px;">
      <p class="text-sm text-ink-mute">Loading…</p>
    </div>
    <div class="modal__actions"><button class="btn btn--ghost js-close" type="button">Close</button></div>
  `,i.appendChild(n),document.body.appendChild(i);const s=n.querySelector(".js-list"),e=()=>i.remove();n.querySelector(".js-close").addEventListener("click",e),i.addEventListener("click",t=>{t.target===i&&e()}),h().then(t=>{const c=t&&t.runs||[];if(!c.length){s.innerHTML='<p class="text-sm text-ink-mute">No finished runs to copy yet.</p>';return}s.innerHTML=c.map(a=>{const l=a.ctx||{},d=[l.name,l.role,l.meetingType].filter(Boolean).map(r).join(" · ")||r(a.headline||a.id);return`<button class="btn btn--ghost js-pick" type="button" data-id="${r(a.id)}" style="text-align:left;justify-content:flex-start;">${d}</button>`}).join(""),s.querySelectorAll(".js-pick").forEach(a=>{a.addEventListener("click",async()=>{s.innerHTML='<p class="text-sm text-ink-dim">Prefilling…</p>';try{const{id:l}=await y(a.getAttribute("data-id"));e(),o({myRunId:l,stage:g.RUN_DETAIL})}catch(l){s.innerHTML=`<p class="text-sm" style="color:var(--color-negative)">Couldn't prefill: ${r(l.message||"error")}</p>`}})})}).catch(t=>{s.innerHTML=`<p class="text-sm" style="color:var(--color-negative)">Couldn't load runs: ${r(t.message||"error")}</p>`})}function L(){var o;(o=document.querySelector(".modal-backdrop"))==null||o.remove()}export{f as mount,L as unmount};
//# sourceMappingURL=member-home-DHuqUbK3.js.map
