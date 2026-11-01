/* OMAR MARO intro — show on every full page entry, including deep links.
   Loaded in <head> to prepare the overlay before the portfolio paints.
   The brand intro stays seven seconds, without a skip button; reduced-motion
   visitors see the static design for the same duration. */
(()=>{
 'use strict';
 const root=document.documentElement;
 root.classList.add('mm-intro-pending');

 let active=false;
 let autoClose=0;
 let safetyClose=0;
 let removeLater=0;
 const held=new Set();

 function restorePage(){
   held.forEach(el=>{el.inert=false;});
   held.clear();
 }
 function endIntro(){
   if(!active)return;
   active=false;
   window.clearTimeout(autoClose);
   window.clearTimeout(safetyClose);
   root.classList.add('mm-intro-leaving');
   restorePage();
   const intro=document.getElementById('site-intro');
   if(intro)intro.setAttribute('aria-hidden','true');
   window.clearTimeout(removeLater);
   removeLater=window.setTimeout(()=>{
     root.classList.remove('mm-intro-pending','mm-intro-leaving');
     // Keep the hidden element in the DOM to support browser back-forward cache.
   },430);
 }
 function startIntro(){
   const overlay=document.getElementById('site-intro');
   if(!overlay){
     root.classList.remove('mm-intro-pending','mm-intro-leaving');
     restorePage();
     return;
   }
   window.clearTimeout(autoClose);
   window.clearTimeout(safetyClose);
   window.clearTimeout(removeLater);
   active=true;
   root.classList.remove('mm-intro-leaving');
   root.classList.add('mm-intro-pending');
   overlay.setAttribute('aria-hidden','false');
   const label=document.getElementById('mm-intro-caption');
   let language='ar';
   try{language=localStorage.getItem('omar-maro-language')==='en'?'en':'ar'}catch{}
   if(label)label.textContent=language==='en'?'From an idea to an impression.':'من الفكرة للأثر.';
   overlay.setAttribute('aria-label',language==='en'?'Portfolio introduction':'مقدمة الموقع');
   document.querySelectorAll('body > :not(#site-intro):not(script)').forEach(el=>{
     if(!el.inert){held.add(el);el.inert=true;}
   });
   autoClose=window.setTimeout(endIntro,7000);
   // Emergency-only guard in case a browser throttles the normal timer.
   safetyClose=window.setTimeout(endIntro,11000);
 }
 if(document.readyState==='loading'){
   document.addEventListener('DOMContentLoaded',startIntro,{once:true});
 }else{
   startIntro();
 }
 window.addEventListener('pagehide',()=>{
   window.clearTimeout(autoClose);
   window.clearTimeout(safetyClose);
   window.clearTimeout(removeLater);
   active=false;
   restorePage();
   root.classList.remove('mm-intro-pending','mm-intro-leaving');
   document.getElementById('site-intro')?.setAttribute('aria-hidden','true');
 });
 window.addEventListener('pageshow',event=>{
   if(event.persisted)startIntro();
 });
})();
