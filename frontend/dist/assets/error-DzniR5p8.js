import{S as i,P as o,e as l}from"./index-D93BFPRu.js";const u=async(s,{store:t,setState:e})=>{var n,a;const c=t.retryStage||i.INTAKE,r=t.error||"Unknown error";o(r),s.innerHTML=`
    <div class="stage-inner l-stack l-stack--6">
      <h1 class="h1">We hit a snag.</h1>
      <div class="error-card">
        <div class="text-ink">Something went wrong on this step. You can retry or start a new session.</div>
        <details class="error-details mt-3">
          <summary class="text-sm text-ink-dim cursor-pointer">Technical details</summary>
          <div class="text-ink-dim text-sm mt-2">${l(r)}</div>
        </details>
      </div>
      <div class="space-y-2">
        <div class="text-ink-mute text-sm">What you can do:</div>
        <div class="l-cluster l-cluster--2">
          <button class="btn js-retry">Retry this step</button>
          <button class="btn btn--ghost js-restart">New session</button>
        </div>
      </div>
    </div>
  `,(n=s.querySelector(".js-retry"))==null||n.addEventListener("click",()=>{e({error:null,stage:c})}),(a=s.querySelector(".js-restart"))==null||a.addEventListener("click",()=>{try{localStorage.removeItem("seroSessionId")}catch{}e({error:null,sessionId:null,stage:i.INTAKE,substage:"NAME"})})},m=()=>{};export{u as mount,m as unmount};
//# sourceMappingURL=error-DzniR5p8.js.map
