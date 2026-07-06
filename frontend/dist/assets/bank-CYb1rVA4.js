import{S as e}from"./index-Lojh5UQc.js";import{c as d,o as g}from"./orb-BvJ65ChT.js";let s=null;const r=1e3;async function S(i,{store:c,setState:t}){const l=Date.now();i.innerHTML=`
    <div class="stage-medium l-stack l-stack--8">
      <div class="thinking-host min-h-[120px] flex items-center"></div>
    </div>
  `;const u=i.querySelector(".thinking-host"),o=d("Building questions…");u.appendChild(o.el);const a=g(`/api/v1/sessions/${encodeURIComponent(c.sessionId)}/bank/stream`);a.on("thinking",n=>o.setLabel(n.label)).on("ready",async()=>{await o.exit();const n=Date.now()-l;n<r&&await new Promise(m=>setTimeout(m,r-n)),t({stage:e.QUESTIONING,substage:"Q_SHOW",turn:0})}).on("error",n=>{t({stage:e.ERROR,error:n.message||"Question generation failed.",retryStage:e.BANK})}).onError(()=>{t({stage:e.ERROR,error:"Lost connection while building questions.",retryStage:e.BANK})}).open(),s=()=>a.close()}function f(){s&&s(),s=null}export{S as mount,f as unmount};
//# sourceMappingURL=bank-CYb1rVA4.js.map
