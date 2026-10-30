/* OMAR MARO intro — progressive enhancement, first entry per tab.
   Loaded in <head> so the overlay is ready before content paints.
   The portfolio remains usable when JS is disabled or reduced motion is set. */
(()=>{
 'use strict';
 const root=document.documentElement;
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;
 const preview=new URLSearchParams(location.search).get('intro')==='1';
 let seen=false;
 try{seen=sessionStorage.getItem('omar-maro-intro-seen-v1')==='yes'}catch{}
 if(!preview&&(seen||location.hash||reduced))return;
 root.classList.add('mm-intro-pending');
 let finished=false,autoClose=0,removeLater=0;
 const held=[];
 function endIntro(){
   if(finished)return;
   finished=true;
   window.clearTimeout(autoClose);
   try{sessionStorage.setItem('omar-maro-intro-seen-v1','yes')}catch{}
   root.classList.add('mm-intro-leaving');
   for(const el of held)el.inert=false;
   held.length=0;
   const intro=document.getElementById('site-intro');
   if(intro)intro.setAttribute('aria-hidden','true');
   removeLater=window.setTimeout(()=>{
     root.classList.remove('mm-intro-pending','mm-intro-leaving');
     intro?.remove();
   },reduced?30:430);
 }
 function init(){
   const overlay=document.getElementById('site-intro');
   if(!overlay){endIntro();return}
   const skip=document.getElementById('mm-intro-skip');
   const label=document.getElementById('mm-intro-caption');
   let language='ar';
   try{language=localStorage.getItem('omar-maro-language')==='en'?'en':'ar'}catch{}
   if(skip)skip.textContent=language==='en'?'Skip intro ↗':'تخطي الانترو ↗';
   if(label)label.textContent=language==='en'?'From an idea to an impression.':'من الفكرة للأثر.';
   overlay.setAttribute('aria-label',language==='en'?'Portfolio introduction':'مقدمة الموقع');
   document.querySelectorAll('body > :not(#site-intro):not(script)').forEach(el=>{
     if(!el.inert){held.push(el);el.inert=true}
   });
   skip?.addEventListener('click',endIntro,{once:true});
   document.addEventListener('keydown',event=>{
     if(!finished&&(event.key==='Escape'||event.key==='Enter'&&document.activeElement===skip)){
       event.preventDefault();endIntro();
     }
   });
   skip?.focus({preventScroll:true});
   autoClose=window.setTimeout(endIntro,reduced?350:2300);
   // Safety fallback even if animation fails or the document never loads fully.
   window.setTimeout(endIntro,5000);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
 window.addEventListener('pagehide',()=>{endIntro();window.clearTimeout(autoClose);window.clearTimeout(removeLater);root.classList.remove('mm-intro-pending','mm-intro-leaving')},{once:true});
 window.addEventListener('pageshow',event=>{if(event.persisted&&root.classList.contains('mm-intro-pending')){endIntro();root.classList.remove('mm-intro-pending','mm-intro-leaving');document.getElementById('site-intro')?.remove()}},{once:false});
})();
