(function(){
  var doc=document,root=doc.documentElement;
  var header=doc.querySelector('.site-header'),toggle=doc.querySelector('.nav-toggle');
  var sticky=doc.querySelector('.sticky-cta');
  var heroPast=false,blockers=new Set();

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
    header.classList.toggle('open',open);
    toggle.setAttribute('aria-expanded',open?'true':'false');
    root.classList.toggle('menu-open',open);
    renderSticky();
  }

  if(header&&toggle){
    toggle.addEventListener('click',function(){setMenu(!menuOpen())});
    doc.addEventListener('keydown',function(e){
      if((e.key==='Escape'||e.key==='Esc')&&menuOpen()){
        setMenu(false);
        toggle.focus();
      }
    });
    var mq=window.matchMedia('(min-width:861px)');
    var reset=function(){if(mq.matches&&menuOpen())setMenu(false)};
    if(mq.addEventListener)mq.addEventListener('change',reset);else if(mq.addListener)mq.addListener(reset);
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
