import{s as t,S as e,i}from"./index-Lojh5UQc.js";async function l(a,{setState:o}){const s=!!t.user,r=s?i(t.user)?e.START:e.MEMBER_HOME:e.REGISTER,n=s?"← Back":"← Back to sign up";a.innerHTML=`
    <div class="stage-inner l-stack l-stack--8">
      <header class="page-header">
        <h1 class="h1">Your data &amp; privacy</h1>
        <div class="text-ink-dim text-sm">Plain and short — what Sero keeps, who sees it, and how to remove it.</div>
      </header>

      <section class="card-flat space-y-3">
        <div class="eyebrow">Early alpha</div>
        <p class="text-sm">Sero is an early version shared with a few managers. Use real notes only if you're comfortable — you can delete a session at any time.</p>
      </section>

      <section class="card-flat space-y-3">
        <div class="eyebrow">What we store</div>
        <p class="text-sm">The person's name and role, any notes you type when prepping a 1:1, your answers during the prep, and the briefing Sero writes for you. If you rate how useful a 1:1 was, we store that star rating and any note you add with it. Nothing more.</p>
      </section>

      <section class="card-flat space-y-3">
        <div class="eyebrow">Who can see it</div>
        <p class="text-sm">Inside your company, only you and your company's owner. Your data is walled off from every <em>other</em> company — no other customer can see it. During this early alpha, a member of the Sero team can view companies' people, 1:1s and ratings to run and support the trial; we only look to keep things working and we never share it. To write your briefing, the text is sent to our AI provider, which processes it to produce the result.</p>
      </section>

      <section class="card-flat space-y-3">
        <div class="eyebrow">How to delete it</div>
        <p class="text-sm">You can delete any run from its row whenever you like. To remove your whole account and company, email <a class="link" href="mailto:carl@seroteams.com">carl@seroteams.com</a> and we'll erase it for you.</p>
      </section>

      <div>
        <button type="button" class="link js-back">${n}</button>
      </div>
    </div>
  `,a.querySelector(".js-back").addEventListener("click",()=>o({stage:r}))}function d(){}export{l as mount,d as unmount};
//# sourceMappingURL=privacy-5YoDp9xz.js.map
