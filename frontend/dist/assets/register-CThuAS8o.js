import{S as s,r as v,l as j,i as w}from"./index-CamYUUDR.js";async function g(e,{setState:n}){e.innerHTML=`
    <div class="stage-inner l-stack l-stack--8 auth-card">
      <header class="page-header">
        <h1 class="h1">Create your account</h1>
        <div class="text-ink-dim text-sm">This also creates your company — you'll be its owner.</div>
      </header>
      <form class="card-flat space-y-3 js-form" novalidate>
        <label class="l-stack l-stack--2">
          <span class="eyebrow">Your name</span>
          <input class="input js-name" type="text" autocomplete="name" required />
        </label>
        <label class="l-stack l-stack--2">
          <span class="eyebrow">Company <span class="text-ink-mute">(optional)</span></span>
          <input class="input js-company" type="text" autocomplete="organization" placeholder="Defaults to your name's company" />
        </label>
        <label class="l-stack l-stack--2">
          <span class="eyebrow">Email</span>
          <input class="input js-email" type="email" autocomplete="username" required />
        </label>
        <label class="l-stack l-stack--2">
          <span class="eyebrow">Password <span class="text-ink-mute">(at least 8 characters)</span></span>
          <input class="input js-password" type="password" autocomplete="new-password" required />
        </label>
        <p class="js-err text-negative text-sm" hidden></p>
        <button type="submit" class="btn js-submit">Create account</button>
      </form>
      <p class="text-ink-dim text-sm">
        By creating an account you agree to how Sero handles your data.
        <button type="button" class="link js-privacy">Read the privacy note</button>.
      </p>
      <p class="text-ink-dim text-sm">
        Already have an account?
        <button type="button" class="link js-to-login">Log in</button>
      </p>
    </div>
  `;const m=e.querySelector(".js-form"),i=e.querySelector(".js-name"),d=e.querySelector(".js-company"),y=e.querySelector(".js-email"),b=e.querySelector(".js-password"),t=e.querySelector(".js-submit"),l=e.querySelector(".js-err");function u(c){l.textContent=c,l.hidden=!1}async function h(c){c.preventDefault(),l.hidden=!0;const p=i.value.trim(),k=d.value.trim(),r=y.value.trim(),o=b.value;if(!p||!r||!o){u("Fill in your name, email, and password.");return}t.disabled=!0,t.textContent="Creating…";try{await v({email:r,name:p,password:o,company:k});const{user:a}=await j({email:r,password:o});n({user:a,stage:w(a)?s.START:s.MEMBER_HOME})}catch(a){u(a.message||"Could not create your account."),t.disabled=!1,t.textContent="Create account"}}m.addEventListener("submit",h),e.querySelector(".js-to-login").addEventListener("click",()=>n({stage:s.LOGIN})),e.querySelector(".js-privacy").addEventListener("click",()=>n({stage:s.PRIVACY})),requestAnimationFrame(()=>i.focus({preventScroll:!0}))}function x(){}export{g as mount,x as unmount};
//# sourceMappingURL=register-CThuAS8o.js.map
