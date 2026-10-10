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

  function presalePhase(now){
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

  function mountPresale(){
    var now=Date.now(),phase=presalePhase(now);
    updatePresaleForm(phase);
    if(phase==='ended')return;
    var popup=doc.createElement('aside');
    popup.className='presale-popup';
    popup.setAttribute('aria-label','Shirt presale countdown');
    popup.innerHTML='<button class="presale-close" type="button" aria-label="Close presale announcement">&times;</button>'+
      '<p class="eyebrow">Coffee &amp; Culture Shirt</p><p class="presale-title" data-presale-title></p>'+
      '<div class="presale-clock" data-presale-clock aria-live="off"></div>'+
      '<p class="presale-details">October 30–November 1, 2026 &nbsp;•&nbsp; Small–2X &nbsp;•&nbsp; Ships two weeks after ordering</p>'+
      '<a class="btn btn-sm" href="/merch/#shirt-presale">View the Shirt Presale</a>';
    doc.body.appendChild(popup);
    window.requestAnimationFrame(function(){popup.classList.add('show')});

    var title=popup.querySelector('[data-presale-title]');
    var clock=popup.querySelector('[data-presale-clock]');
    function renderPresale(){
      var current=Date.now(),currentPhase=presalePhase(current);
      updatePresaleForm(currentPhase);
      if(currentPhase==='ended'){
        window.clearInterval(presaleTimer);
        popup.classList.remove('show');
        window.setTimeout(function(){popup.remove()},250);
        return;
      }
      title.textContent=currentPhase==='before'?'Presale opens in':'Presale ends in';
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
    popup.querySelector('.presale-close').addEventListener('click',function(){
      window.clearInterval(presaleTimer);
      popup.classList.remove('show');
      window.setTimeout(function(){popup.remove()},250);
    });
  }

  mountPresale();

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
