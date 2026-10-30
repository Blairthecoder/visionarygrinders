(function(){
  var doc=document,root=doc.documentElement;
  var header=doc.querySelector('.site-header'),toggle=doc.querySelector('.nav-toggle');
  var sticky=doc.querySelector('.sticky-cta');
  var heroPast=false,blockers=new Set();

  /* Shirt presale: midnight Friday, October 30 through the end of Sunday,
     November 1 in Houston. Explicit offsets keep the window consistent for
     visitors in every timezone, including the Nov. 1 daylight-saving change. */
  var presaleStart=new Date('2026-10-30T00:00:00-05:00').getTime();
  var presaleEnd=new Date('2026-11-02T00:00:00-06:00').getTime();
  function presalePhase(now){
    if(now<presaleStart)return 'before';
    if(now<presaleEnd)return 'live';
    return 'ended';
  }

  function updatePresaleForm(phase){
    var form=doc.querySelector('[data-presale-form]');
    if(!form)return;
    var kicker=doc.querySelector('[data-presale-kicker]');
    var heading=doc.querySelector('[data-presale-heading]');
    var copy=doc.querySelector('[data-presale-copy]');
    var submit=form.querySelector('[data-presale-submit]');
    if(phase==='live'){
      if(kicker)kicker.textContent='Presale is open through November 1';
      if(heading)heading.textContent='Reserve Your Shirt';
      if(copy)copy.textContent='Submit your presale request while the 72-hour window is open. Available in Small, Medium, Large, XL and 2X.';
      if(submit)submit.textContent='Request My Shirt';
    }else if(phase==='ended'){
      if(kicker)kicker.textContent='Presale closed';
      if(heading)heading.textContent='Join the Merch Waitlist';
      if(copy)copy.textContent='This presale has ended. Leave your details and size to hear about the next Visionary Grinders shirt release.';
      if(submit)submit.textContent='Join the Waitlist';
    }
  }

  updatePresaleForm(presalePhase(Date.now()));

  /* Event announcements carry data-hide-after (an ISO time with offset) and
     drop off the page once the event is over. */
  doc.querySelectorAll('[data-hide-after]').forEach(function(el){
    if(Date.now()>=Date.parse(el.getAttribute('data-hide-after')))el.remove();
  });

  doc.addEventListener('click',function(e){doc.querySelectorAll('.nav-more[open]').forEach(function(el){if(!el.contains(e.target))el.removeAttribute('open')})});
  doc.addEventListener('keydown',function(e){if(e.key==='Escape'){var more=doc.querySelector('.nav-more[open]');if(more){more.removeAttribute('open');more.querySelector('summary').focus()}}});
  var year=doc.getElementById('yr');
  if(year)year.textContent=new Date().getFullYear();

  function menuOpen(){return !!header&&header.classList.contains('open')}

  function renderSticky(){
    if(!sticky)return;
    var show=heroPast&&blockers.size===0&&!menuOpen();
    if(sticky.hidden===!show)return;
    sticky.hidden=!show;
  }

  function setMenu(open){
    if(!header||!toggle)return;
    header.classList.toggle('open',open);
    toggle.setAttribute('aria-expanded',open?'true':'false');
    root.classList.toggle('menu-open',open);
    renderSticky();
  }

  if(header&&toggle){
    toggle.addEventListener('click',function(){setMenu(!menuOpen())});
    var nav=doc.getElementById('site-nav');
    if(nav){
      nav.addEventListener('click',function(e){
        if(e.target.closest('a[href]'))setMenu(false);
      });
    }
    doc.addEventListener('keydown',function(e){
      if((e.key==='Escape'||e.key==='Esc')&&menuOpen()){
        setMenu(false);
        toggle.focus();
      }
    });
    var mq=window.matchMedia('(min-width:861px)');
    var reset=function(){if(mq.matches&&menuOpen())setMenu(false)};
    if(mq.addEventListener)mq.addEventListener('change',reset);else if(mq.addListener)mq.addListener(reset);

    /* Mobile browsers may restore this page from their back/forward cache with
       its previous DOM classes intact. Always return with an unlocked, closed
       menu, and clear the state before navigating away. */
    var resetMenu=function(){setMenu(false)};
    window.addEventListener('pagehide',resetMenu);
    window.addEventListener('pageshow',resetMenu);
  }

  if(sticky&&'IntersectionObserver' in window){
    var hero=doc.getElementById('hero-cta');
    if(hero){
      new IntersectionObserver(function(entries){
        var e=entries[entries.length-1];
        heroPast=!e.isIntersecting&&e.boundingClientRect.bottom<=0;
        renderSticky();
      }).observe(hero);
    }
    var seen=new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting)blockers.add(e.target);else blockers.delete(e.target);
      });
      renderSticky();
    });
    doc.querySelectorAll('[data-primary-cta]:not(#hero-cta), form.form, .site-footer').forEach(function(el){seen.observe(el)});
  }

  /* Keep analytics out of the rendering path. Real interaction loads GA immediately;
     the timer still records engaged visitors who read without interacting. */
  var analyticsLoaded=false;
  function loadAnalytics(){
    if(analyticsLoaded)return;
    analyticsLoaded=true;
    window.dataLayer=window.dataLayer||[];
    window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};
    window.gtag('js',new Date());
    window.gtag('config','G-VW0LYN6GD6');
    var script=doc.createElement('script');
    script.async=true;
    script.src='https://www.googletagmanager.com/gtag/js?id=G-VW0LYN6GD6';
    doc.head.appendChild(script);
  }
  ['pointerdown','keydown','touchstart','scroll'].forEach(function(eventName){
    window.addEventListener(eventName,loadAnalytics,{once:true,passive:true});
  });
  window.setTimeout(loadAnalytics,15000);
})();
