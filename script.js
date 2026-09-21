(() => {
 'use strict';
 const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
 const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
 const reduced=matchMedia('(prefers-reduced-motion:reduce)'), fine=matchMedia('(pointer:fine)');
 const body=document.body, hero=$('.hero'), video=$('.hero-video'), header=$('#siteHeader');
 body.classList.add('enhanced');
 // One restrained opening. No fictional progress, no duplicate wordmark.
 const loader=$('#preloader');
 if(!reduced.matches){
  body.classList.add('motion-intro','loading');
  const lines=$('.intro-lines');
  for(let row=0;row<16;row++)for(let col=0;col<4;col++){
   const line=document.createElement('i');
   line.style.cssText=`--x:${col*27-6+(row%2)*6}%;--y:${row*6.5}%;--w:${14+(row*7+col*3)%14}%;--delay:${((row+col*3)%12)*.045}s`;
   lines.append(line);
  }
  const started=performance.now(); let released=false;
  function release(){
   if(released)return;released=true;
   body.classList.add('intro-releasing');loader.classList.add('leaving');
   video?.play().catch(()=>{});
   setTimeout(()=>{body.classList.remove('loading');},700);
   setTimeout(()=>{loader.remove();body.classList.remove('motion-intro','intro-releasing','loading');body.classList.add('ready');},2000);
  }
  const mediaReady=()=>setTimeout(release,Math.max(0,1750-(performance.now()-started)));
  if(video.readyState>=2)mediaReady();else video.addEventListener('loadeddata',mediaReady,{once:true});
  setTimeout(release,2600);
 }else{loader.remove();body.classList.add('ready');video.pause();}
 const pause=$('.video-toggle');
 function updatePause(){pause.innerHTML=video.paused?'Lecture <span aria-hidden="true">▷</span>':'Pause <span aria-hidden="true">Ⅱ</span>';pause.setAttribute('aria-label',video.paused?'Lire la vidéo':'Mettre la vidéo en pause');}
 pause.addEventListener('click',()=>{video.paused?video.play().catch(()=>{}):video.pause();updatePause();});
 video.addEventListener('play',updatePause);video.addEventListener('pause',updatePause);updatePause();
 // Dialogs: focus stays inside the open panel and returns to its opener.
 const menu=$('#menuPanel'), drawer=$('#bookingDrawer'), menuToggle=$('#menuToggle');
 menu.setAttribute('role','dialog');menu.setAttribute('aria-modal','true');menu.setAttribute('aria-label','Navigation OCTEL');
 menu.inert=true;drawer.inert=true;
 let activePanel=null,returnFocus=null;
 const focusables=p=>$$('a[href],button,input,[tabindex="0"]',p).filter(e=>!e.disabled&&e.getClientRects().length);
 function closePanel(){
  if(!activePanel)return;
  activePanel.classList.remove('open');activePanel.setAttribute('aria-hidden','true');activePanel.inert=true;
  body.classList.remove('menu-open','booking-open');menuToggle.setAttribute('aria-expanded','false');
  activePanel=null;returnFocus?.focus({preventScroll:true});
 }
 function openPanel(panel,opener){
  closePanel();returnFocus=opener;activePanel=panel;panel.inert=false;panel.classList.add('open');panel.setAttribute('aria-hidden','false');
  body.classList.add(panel===menu?'menu-open':'booking-open');menuToggle.setAttribute('aria-expanded',String(panel===menu));
  requestAnimationFrame(()=>focusables(panel)[0]?.focus({preventScroll:true}));
 }
 menuToggle.addEventListener('click',()=>openPanel(menu,menuToggle));$('#menuClose').addEventListener('click',closePanel);
 $$('[data-open-booking]').forEach(b=>b.addEventListener('click',()=>openPanel(drawer,b)));
 $$('[data-close-booking]').forEach(b=>b.addEventListener('click',closePanel));
 addEventListener('keydown',e=>{
  if(!activePanel)return;
  if(e.key==='Escape'){e.preventDefault();closePanel();}
  if(e.key==='Tab'){
   const f=focusables(activePanel),first=f[0],last=f.at(-1);
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
  }
 });
 const menuImg=$('#menuVisual');let swap=0;
 $$('.menu-nav a').forEach((a,i)=>{
  a.style.setProperty('--i',i);
  const choose=()=>{const id=++swap;menuImg.style.opacity='0';setTimeout(()=>{if(id!==swap)return;menuImg.src=a.dataset.menuImage;menuImg.style.opacity='1';},200);};
  a.addEventListener('pointerenter',choose);a.addEventListener('focus',choose);a.addEventListener('click',closePanel);
 });
 // Dates stay synchronized. Invalid values produce visible feedback.
 const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 const next=s=>{const d=new Date(s+'T12:00:00');d.setDate(d.getDate()+1);return iso(d);};
 const today=iso(new Date());let arrival=next(today),departure=next(arrival);
 const forms=$$('[data-novaresa-form]');
 forms.forEach((f,i)=>{const error=document.createElement('p');error.className='form-error';error.id='date-error-'+i;error.setAttribute('role','alert');f.append(error);$$('input',f).forEach(el=>el.setAttribute('aria-describedby',error.id));});
 function syncDates(){forms.forEach(f=>{const a=$('[name=arrival]',f),d=$('[name=departure]',f);a.min=today;a.value=arrival;d.min=next(arrival);d.value=departure;});}
 syncDates();
 forms.forEach(f=>{
  $('[name=arrival]',f).addEventListener('change',e=>{if(!e.target.value)return;arrival=e.target.value;if(departure<=arrival)departure=next(arrival);syncDates();});
  $('[name=departure]',f).addEventListener('change',e=>{if(!e.target.value)return;departure=e.target.value;syncDates();});
  f.addEventListener('invalid',()=>{$('.form-error',f).textContent='Vérifiez vos dates : le départ doit suivre l’arrivée.';},true);
  f.addEventListener('input',()=>{$('.form-error',f).textContent='';});
  f.addEventListener('submit',e=>{
   e.preventDefault();const a=$('[name=arrival]',f).value,d=$('[name=departure]',f).value;
   if(!a||!d||a<today||d<=a){$('.form-error',f).textContent='Choisissez une arrivée à partir d’aujourd’hui et un départ après l’arrivée.';return;}
   const url=new URL('https://www.novaresa.net/firm.php');url.searchParams.set('id_firm','88');url.searchParams.set('date_from',a);url.searchParams.set('date_to',d);
   window.open(url.href,'_blank','noopener');
  });
 });
 // Reveals are progressive enhancement; photos are never hidden while loading.
 const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target);}}),{threshold:.04,rootMargin:'0px 0px -20px 0px'});
 $$('.reveal,.image-reveal').forEach(el=>{if(reduced.matches)el.classList.add('visible');else observer.observe(el);});
 // Single owner for all animated transforms. Values are measured before writes.
 const media=$$('.interactive-media').map(el=>({el,img:$('img',el),x:0,y:0,z:1,mx:0,my:0,hover:false})).filter(o=>o.img);
 media.forEach(o=>{
  o.el.addEventListener('pointerenter',()=>{if(fine.matches)o.hover=true;});
  o.el.addEventListener('pointermove',e=>{if(!fine.matches)return;const r=o.el.getBoundingClientRect();o.mx=(e.clientX-r.left)/r.width-.5;o.my=(e.clientY-r.top)/r.height-.5;});
  o.el.addEventListener('pointerleave',()=>{o.hover=false;o.mx=o.my=0;});
 });
 const floats=$$('[data-parallax]').map(el=>({el,y:0}));
 const journey=$('.journey'),track=$('#journeyTrack'),jProgress=$('.journey-progress i');
 const cards=$$('.journey-card');let pinned=false,maxX=0,start=0,currentX=0,desiredX=0,vh=innerHeight;
 function measure(){
  vh=innerHeight;pinned=innerWidth>900&&innerHeight>680&&!reduced.matches;
  maxX=Math.max(0,track.scrollWidth-innerWidth);journey.style.height=pinned?(vh+maxX)+'px':'';
  journey.classList.toggle('unpinned',!pinned);
  if(!pinned){track.style.transform='';currentX=0;}else track.scrollLeft=0;
  start=journey.getBoundingClientRect().top+scrollY;
 }
 function goPanel(direction){
  const panelWidth=cards[0].offsetWidth+parseFloat(getComputedStyle(track).gap||0);
  if(pinned){const pos=clamp(scrollY-start,0,maxX);window.scrollTo({top:start+clamp(pos+direction*panelWidth,0,maxX),behavior:reduced.matches?'instant':'smooth'});}
  else track.scrollBy({left:direction*panelWidth,behavior:reduced.matches?'instant':'smooth'});
 }
 $$('[data-journey-step]').forEach(b=>b.addEventListener('click',()=>goPanel(Number(b.dataset.journeyStep))));
 track.addEventListener('keydown',e=>{if(e.target!==track)return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();goPanel(e.key==='ArrowRight'?1:-1);}});
 $$('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const target=$(a.getAttribute('href'));if(!target)return;e.preventDefault();closePanel();target.scrollIntoView({behavior:reduced.matches?'instant':'smooth'});}));
 let oldY=scrollY,headerAnchor=scrollY,last=performance.now(),raf=0,heroY=0;
 const tones=$$('[data-header-tone]'),progress=$('.scroll-progress i');
 function frame(now){
  const y=scrollY,dt=Math.min(now-last,50);last=now;const ease=1-Math.exp(-dt/115);
  const rects=media.map(o=>o.el.getBoundingClientRect()),fRects=floats.map(o=>o.el.getBoundingClientRect());
  const maxScroll=document.documentElement.scrollHeight-vh;
  const probe=header.offsetHeight*.6;
  let tone='light';for(const s of tones){const r=s.getBoundingClientRect();if(r.top<=probe&&r.bottom>probe){tone=s.dataset.headerTone;break;}}
  header.classList.toggle('tone-light',tone==='light');header.classList.toggle('tone-dark',tone==='dark');header.classList.toggle('scrolled',y>36);header.classList.toggle('at-top',y<30);
  if((y-oldY)*(oldY-headerAnchor)<0)headerAnchor=oldY;
  if(Math.abs(y-headerAnchor)>35){header.classList.toggle('header-hidden',y>headerAnchor&&y>400);headerAnchor=y;}
  if(y<220)header.classList.remove('header-hidden');oldY=y;
  body.classList.toggle('show-mobile-book',y>hero.offsetHeight-100);
  progress.style.transform=`scaleX(${maxScroll?y/maxScroll:0})`;
  if(pinned){
   desiredX=clamp(y-start,0,maxX);currentX+=(desiredX-currentX)*ease;
   if(Math.abs(desiredX-currentX)<.05)currentX=desiredX;
   track.style.transform=`translate3d(${-currentX}px,0,0)`;jProgress.style.transform=`scaleX(${maxX?currentX/maxX:0})`;
  }
  if(!reduced.matches){
   heroY+=(clamp(y,0,vh)*.16-heroY)*ease;video.style.setProperty('--hero-y',heroY+'px');
   media.forEach((o,i)=>{
    const r=rects[i];if(r.bottom< -150||r.top>vh+150||r.right< -150||r.left>innerWidth+150)return;
    const isCard=o.img.hasAttribute('data-card-parallax');
    const travel=clamp((vh*.5-(r.top+r.height*.5))*.12,-r.height*.085,r.height*.085);
    const tx=isCard?clamp((innerWidth*.5-(r.left+r.width*.5))*.045,-r.width*.06,r.width*.06):0;
    const x=tx+(o.hover?o.mx*-16:0),yy=travel+(o.hover?o.my*-12:0),zoom=o.hover?1.035:1;
    o.x+=(x-o.x)*ease;o.y+=(yy-o.y)*ease;o.z+=(zoom-o.z)*ease;
    o.img.style.setProperty('--px',o.x.toFixed(2)+'px');o.img.style.setProperty('--py',o.y.toFixed(2)+'px');o.img.style.setProperty('--zoom',o.z.toFixed(4));
   });
   floats.forEach((o,i)=>{const r=fRects[i];if(r.bottom<0||r.top>vh)return;const target=clamp((r.top+r.height*.5-vh*.5)*Number(o.el.dataset.parallax),-36,36);o.y+=(target-o.y)*ease;o.el.style.setProperty('--float-y',o.y.toFixed(2)+'px');});
  }
  raf=requestAnimationFrame(frame);
 }
 const ro=new ResizeObserver(measure);ro.observe(document.body);ro.observe(track);addEventListener('resize',measure,{passive:true});
 document.fonts?.ready.then(measure);addEventListener('load',measure,{once:true});measure();raf=requestAnimationFrame(frame);
 addEventListener('pagehide',()=>cancelAnimationFrame(raf));addEventListener('pageshow',e=>{if(e.persisted){cancelAnimationFrame(raf);last=performance.now();measure();raf=requestAnimationFrame(frame);}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelAnimationFrame(raf);else{cancelAnimationFrame(raf);last=performance.now();raf=requestAnimationFrame(frame);}});
 reduced.addEventListener('change',()=>location.reload());
})();
