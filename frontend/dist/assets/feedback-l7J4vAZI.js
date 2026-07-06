import{a as d}from"./index-CamYUUDR.js";async function m(e){e.innerHTML=`
    <div class="stage-inner l-stack l-stack--8">
      <header class="page-header">
        <h1 class="h1">Send feedback</h1>
        <div class="text-ink-dim text-sm">Tell us what's working or what's not — it goes straight to the team.</div>
      </header>
      <form class="card-flat space-y-3 js-form" novalidate>
        <label class="l-stack l-stack--2">
          <span class="eyebrow">Your note</span>
          <textarea class="input js-message" rows="5" placeholder="What's on your mind?"></textarea>
        </label>
        <p class="js-err text-negative text-sm" hidden></p>
        <button type="submit" class="btn js-submit">Send</button>
      </form>
    </div>
  `;const o=e.querySelector(".js-form"),n=e.querySelector(".js-message"),t=e.querySelector(".js-submit"),s=e.querySelector(".js-err");function r(a){s.textContent=a,s.hidden=!1}async function c(a){a.preventDefault(),s.hidden=!0;const i=n.value.trim();if(!i){r("Write a short note first.");return}t.disabled=!0,t.textContent="Sending…";try{await d(i),e.querySelector(".stage-inner").innerHTML=`
        <header class="page-header">
          <h1 class="h1">Thanks!</h1>
          <div class="text-ink-dim text-sm">Your note reached the team. We read every one.</div>
        </header>
      `}catch(l){r(l.message||"Could not send your feedback."),t.disabled=!1,t.textContent="Send"}}o.addEventListener("submit",c),requestAnimationFrame(()=>n.focus({preventScroll:!0}))}function h(){}export{m as mount,h as unmount};
//# sourceMappingURL=feedback-l7J4vAZI.js.map
