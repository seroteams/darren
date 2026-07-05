import{S as o,l as y,m as S,i as f}from"./index-D93BFPRu.js";const E=["/login/pexels-alex-green-5699419.jpg","/login/pexels-cottonbro-4861338.jpg","/login/pexels-george-milton-6953779.jpg","/login/pexels-ketut-subiyanto-4623308.jpg","/login/pexels-sarah-chai-7267386.jpg"];async function I(e,{setState:c}){e.classList.add("stage--auth");const _=E[Math.floor(Math.random()*E.length)];e.innerHTML=`
    <div class="auth-split">
      <div class="auth-split__form">
        <div class="auth-panel l-stack l-stack--6">
          <div class="auth-brand">
            <img class="auth-brand__logo" src="/logo.png" alt="" aria-hidden="true" />
            <h1 class="auth-brand__title">Sero - where teams thrive</h1>
            <p class="auth-brand__sub">Your 1:1s are broken. Let's fix that.</p>
          </div>
          <form class="l-stack l-stack--4 js-form" novalidate>
            <label class="l-stack l-stack--2">
              <span class="eyebrow">Email</span>
              <input class="input js-email" type="email" autocomplete="username" required />
            </label>
            <label class="l-stack l-stack--2">
              <span class="eyebrow">Password</span>
              <input class="input js-password" type="password" autocomplete="current-password" required />
            </label>
            <p class="js-err text-negative text-sm" hidden></p>
            <button type="submit" class="btn js-submit">Sign in</button>
          </form>
          <p class="text-ink-dim text-sm">
            No account yet?
            <button type="button" class="link js-to-register">Create one</button>
          </p>
          <p class="text-ink-dim text-sm">
            Just curious?
            <button type="button" class="link js-try-guest">Try it — no account needed</button>
          </p>
        </div>
      </div>
      <div class="auth-split__media" aria-hidden="true">
        <img class="auth-split__img" src="${_}" alt="" onerror="this.remove()" />
      </div>
    </div>
  `;const h=e.querySelector(".js-form"),u=e.querySelector(".js-email"),p=e.querySelector(".js-password"),i=e.querySelector(".js-submit"),d=e.querySelector(".js-err");function g(s){d.textContent=s,d.hidden=!1}async function v(s){s.preventDefault(),d.hidden=!0;const a=u.value.trim(),r=p.value;if(!a||!r){g("Enter your email and password.");return}i.disabled=!0,i.textContent="Logging in…";try{const{user:n}=await y({email:a,password:r});let t=n;try{t=await S()}catch{}c({user:t,stage:f(t)?o.START:o.MEMBER_HOME})}catch(n){g(n.message||"Could not log in."),i.disabled=!1,i.textContent="Sign in"}}h.addEventListener("submit",v),e.querySelector(".js-to-register").addEventListener("click",()=>c({stage:o.REGISTER})),e.querySelector(".js-try-guest").addEventListener("click",()=>{try{localStorage.removeItem("seroSessionId")}catch{}c({user:null,sessionId:null,stage:o.INTAKE,substage:"NAME"})});const l={},m=[{label:"Manager",email:l.VITE_DEV_LOGIN_MANAGER_EMAIL,password:l.VITE_DEV_LOGIN_MANAGER_PASSWORD||""},{label:"Admin",email:l.VITE_DEV_LOGIN_ADMIN_EMAIL,password:l.VITE_DEV_LOGIN_ADMIN_PASSWORD||""},{label:"Member",email:l.VITE_DEV_LOGIN_MEMBER_EMAIL,password:l.VITE_DEV_LOGIN_MEMBER_PASSWORD||""}].filter(s=>s.email);if(m.length>0){let s=function(r){const n=m[r];u.value=n.email,p.value=n.password,a.innerHTML="Dev login: "+m.map((t,b)=>b===r?`<strong>${t.label}</strong>`:`<button type="button" class="link js-swap" data-i="${b}">${t.label}</button>`).join(" · "),a.querySelectorAll(".js-swap").forEach(t=>t.addEventListener("click",()=>s(Number(t.dataset.i))))};const a=document.createElement("p");a.className="text-ink-dim text-sm js-dev-swap",e.querySelector(".js-to-register").closest("p").before(a),s(0),requestAnimationFrame(()=>i.focus({preventScroll:!0}))}else requestAnimationFrame(()=>u.focus({preventScroll:!0}))}function w(e){e==null||e.classList.remove("stage--auth")}export{I as mount,w as unmount};
//# sourceMappingURL=login-g0YQJuJw.js.map
