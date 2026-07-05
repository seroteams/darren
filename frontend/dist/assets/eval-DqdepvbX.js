import{S as n}from"./index-D93BFPRu.js";import{c,o as m}from"./orb-BvJ65ChT.js";let i=null;async function d(r,{store:t,setState:s}){r.innerHTML=`
    <div class="stage-medium l-stack l-stack--8">
      <div class="flex items-center justify-center min-h-[40dvh]">
        <div class="thinking-host flex items-center justify-center"></div>
      </div>
    </div>
  `;const l=r.querySelector(".thinking-host"),o=c("Writing briefing…");l.appendChild(o.el);const a=m(`/api/v1/sessions/${encodeURIComponent(t.sessionId)}/evaluation/stream`);a.on("thinking",e=>o.setLabel(e.label)).on("briefing",async e=>{await o.exit(),t.briefing=e,s({briefing:e,stage:n.BRIEFING,completedAt:e.completedAt??t.completedAt??null})}).on("error",e=>{s({stage:n.ERROR,error:e.message||"Evaluation failed.",retryStage:n.EVAL})}).onError(()=>{s({stage:n.ERROR,error:"Lost connection during synthesis.",retryStage:n.EVAL})}).open(),i=()=>a.close()}function f(){i&&i(),i=null}export{d as mount,f as unmount};
//# sourceMappingURL=eval-DqdepvbX.js.map
