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
  var presaleClock=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric',second:'numeric',hourCycle:'h23'});
  var presaleTimer;
  var presaleDismissKey='vg-presale-dismissed';

  function presaleDismissed(){
    try{return window.localStorage.getItem(presaleDismissKey)==='1'}catch(e){return false}
  }

  function rememberPresaleDismissal(){
    try{window.localStorage.setItem(presaleDismissKey,'1')}catch(e){}
  }

  /* Branch deploys and local builds accept ?presale=before|live|ended so each
     presale state can be reviewed ahead of the real window. Production ignores it. */
  var presaleOverride=(function(){
    var host=window.location.hostname;
    if(!/--.+\.netlify\.app$/.test(host)&&host!=='localhost'&&host!=='127.0.0.1')return null;
    var value=new URLSearchParams(window.location.search).get('presale');
    return value==='before'||value==='live'||value==='ended'?value:null;
  })();

  function presalePhase(now){
    if(presaleOverride)return presaleOverride;
    if(now<presaleStart)return 'before';
    if(now<presaleEnd)return 'live';
    return 'ended';
  }

  function timeParts(milliseconds){
    var seconds=Math.max(0,Math.floor(milliseconds/1000));
    return {
      days:Math.floor(seconds/86400),
      hours:Math.floor((seconds%86400)/3600),
      minutes:Math.floor((seconds%3600)/60),
      seconds:seconds%60
    };
  }

  function houstonWallClock(timestamp){
    var values={};
    presaleClock.formatToParts(new Date(timestamp)).forEach(function(part){
      if(part.type!=='literal')values[part.type]=Number(part.value);
    });
    return Date.UTC(values.year,values.month-1,values.day,values.hour,values.minute,values.second);
  }

  function updatePresaleForm(phase){
    var form=doc.querySelector('[data-presale-form]');
    if(!form)return;
    var kicker=doc.querySelector('[data-presale-kicker]');
    var heading=doc.querySelector('[data-presale-heading]');
    var copy=doc.querySelector('[data-presale-copy]');
    var submit=form.querySelector('[data-presale-submit]');
    /* During the window the Stripe checkout replaces the waitlist form. */
    var buy=doc.querySelector('[data-presale-buy]');
    form.hidden=phase==='live'&&!!buy;
    if(buy)buy.hidden=phase!=='live';
    if(phase==='live'){
      if(kicker)kicker.textContent='Presale is open through November 1';
      if(heading)heading.textContent=buy?'Order Your Shirt':'Reserve Your Shirt';
      if(copy)copy.textContent=buy?'The 72-hour presale is open. Order yours in Small, Medium, Large, XL or 2X while the window lasts.':'Submit your presale request while the 72-hour window is open. Available in Small, Medium, Large, XL and 2X.';
      if(submit)submit.textContent='Request My Shirt';
    }else if(phase==='ended'){
      if(kicker)kicker.textContent='Presale closed';
      if(heading)heading.textContent='Join the Merch Waitlist';
      if(copy)copy.textContent='This presale has ended. Leave your details and size to hear about the next Visionary Grinders shirt release.';
      if(submit)submit.textContent='Join the Waitlist';
    }
  }

  function mountPresale(){
    var now=Date.now(),phase=presalePhase(now);
    updatePresaleForm(phase);
    var pagePath=window.location.pathname.replace(/\/index\.html$/,'/');
    if(pagePath!=='/'){
      /* Flip the merch page at each window boundary for visitors already on it.
         The delay is capped at the browser's setTimeout maximum (about 24 days). */
      (function scheduleFlip(){
        var current=Date.now(),currentPhase=presalePhase(current);
        var boundary=currentPhase==='before'?presaleStart:currentPhase==='live'?presaleEnd:0;
        if(!boundary||presaleOverride||!doc.querySelector('[data-presale-form]'))return;
        window.setTimeout(function(){
          updatePresaleForm(presalePhase(Date.now()));
          scheduleFlip();
        },Math.min(boundary-current+1000,2147483647));
      })();
      return;
    }
    if(phase==='ended'||presaleDismissed())return;
    var popup=doc.createElement('aside');
    popup.className='presale-popup';
    popup.setAttribute('role','dialog');
    popup.setAttribute('aria-label','Shirt presale countdown');
    popup.innerHTML='<button class="presale-close" type="button" aria-label="Close presale announcement">&times;</button>'+
      '<p class="eyebrow">Coffee &amp; Culture Shirt</p><h2 class="presale-title" data-presale-title></h2>'+
      '<div class="presale-clock" data-presale-clock aria-live="off"></div>'+
      '<ul class="presale-details"><li>October 30–November 1, 2026</li><li>Sizes Small–2X</li><li>Ships two weeks after ordering</li></ul>'+
      '<div class="presale-signup-copy"><strong>Want a heads-up?</strong> We&rsquo;ll email you once, the morning it opens.</div>'+
      '<form name="newsletter" method="POST" action="/subscribed.html" data-netlify="true" netlify-honeypot="bot-field" class="presale-signup">'+
        '<input type="hidden" name="form-name" value="newsletter"><p class="hp"><label>Don\'t fill this out <input name="bot-field"></label></p>'+
        '<label class="sr" for="presale-email">Email address</label><input id="presale-email" type="email" name="email" required autocomplete="email" placeholder="you@email.com">'+
        '<button class="btn btn-sm" type="submit">Keep Me Updated</button></form>'+
      '<a class="presale-link" href="/merch/#shirt-presale">See the shirt first <span aria-hidden="true">&rarr;</span></a>';
    doc.body.appendChild(popup);
    /* Let the hero land first; an instant modal reads like a template. */
    window.setTimeout(function(){
      if(popup.isConnected)popup.classList.add('show');
    },2000);

    var title=popup.querySelector('[data-presale-title]');
    var clock=popup.querySelector('[data-presale-clock]');
    var link=popup.querySelector('.presale-link');
    function renderPresale(){
      var current=Date.now(),currentPhase=presalePhase(current);
      updatePresaleForm(currentPhase);
      if(currentPhase==='ended'){
        window.clearInterval(presaleTimer);
        popup.classList.remove('show');
        window.setTimeout(function(){popup.remove()},250);
        return;
      }
    title.textContent=currentPhase==='before'?'Presale Opens In':'Presale Ends In';
      /* Once the window opens, send visitors to checkout instead of the heads-up signup. */
      var live=currentPhase==='live';
      if(popup.classList.contains('is-live')!==live){
        popup.classList.toggle('is-live',live);
        link.classList.toggle('btn',live);
        link.innerHTML=(live?'Order Your Shirt':'See the shirt first')+' <span aria-hidden="true">&rarr;</span>';
      }
      var target=currentPhase==='before'?presaleStart:presaleEnd;
      /* Compare Houston wall-clock values so the advertised Friday-through-Sunday
         window displays as 72 hours even though daylight saving time ends Nov. 1. */
      var remaining=timeParts(houstonWallClock(target)-houstonWallClock(current));
      clock.innerHTML=[['Days',remaining.days],['Hours',remaining.hours],['Minutes',remaining.minutes],['Seconds',remaining.seconds]].map(function(part){
        return '<span><strong>'+String(part[1]).padStart(2,'0')+'</strong><small>'+part[0]+'</small></span>';
      }).join('');
    }
    renderPresale();
    if(phase!=='ended')presaleTimer=window.setInterval(renderPresale,1000);
    function closePresale(){
      rememberPresaleDismissal();
      window.clearInterval(presaleTimer);
      popup.classList.remove('show');
      window.setTimeout(function(){popup.remove()},250);
    }
    popup.querySelector('.presale-close').addEventListener('click',closePresale);
    popup.querySelector('.presale-link').addEventListener('click',closePresale);
    doc.addEventListener('keydown',function(e){
      if((e.key==='Escape'||e.key==='Esc')&&popup.isConnected)closePresale();
    });
  }

  mountPresale();

  /* Event announcements carry data-hide-after (an ISO time with offset) and
     drop off the page once the event is over. */
  doc.querySelectorAll('[data-hide-after]').forEach(function(el){
    if(Date.now()>=Date.parse(el.getAttribute('data-hide-after')))el.remove();
  });

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
