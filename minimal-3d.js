/* Lightweight, progressively enhanced 3D pointer response.
   No library, canvas, canvas screenshots, assets, storage, or network calls. */
(()=>{
 'use strict';
 const root=document.documentElement;
 if(!root.dataset.mmEffects)root.dataset.mmEffects='on';
 const finePointer=window.matchMedia('(hover: hover) and (pointer: fine)');
 const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
 const selector='.showcase-card,.project-card,.service-card,.process-card,.about-highlight';
 let active=null,lastX=0,lastY=0,frame=0;
 const available=()=>finePointer.matches&&!reducedMotion.matches&&root.dataset.mmEffects!=='off';
 function reset(){
  if(frame){cancelAnimationFrame(frame);frame=0}
  if(!active)return;
  active.classList.remove('mm-moving');
  active.style.setProperty('--mm-rx','0deg');
  active.style.setProperty('--mm-ry','0deg');
  active.style.setProperty('--mm-cx','50%');
  active.style.setProperty('--mm-cy','35%');
  active=null;
 }
 function tick(){
  frame=0;
  if(!active||!available()){reset();return}
  const rect=active.getBoundingClientRect();
  if(!rect.width||!rect.height)return;
  const xp=Math.max(0,Math.min(1,(lastX-rect.left)/rect.width));
  const yp=Math.max(0,Math.min(1,(lastY-rect.top)/rect.height));
  const amount=active.classList.contains('project-card')?2.15:2.7;
  active.style.setProperty('--mm-rx',((.5-yp)*2*amount).toFixed(2)+'deg');
  active.style.setProperty('--mm-ry',((xp-.5)*2*amount).toFixed(2)+'deg');
  active.style.setProperty('--mm-cx',(xp*100).toFixed(0)+'%');
  active.style.setProperty('--mm-cy',(yp*100).toFixed(0)+'%');
  active.classList.add('mm-moving');
 }
 function nearest(target){return target instanceof Element?target.closest(selector):null}
 document.addEventListener('pointerover',event=>{
  if(event.pointerType!=='mouse'||!available())return;
  const candidate=nearest(event.target);
  if(candidate===active)return;
  reset();
  if(!candidate)return;
  active=candidate;
  active.classList.add('mm-tilt');
  lastX=event.clientX;lastY=event.clientY;
  frame=requestAnimationFrame(tick);
 },{passive:true});
 document.addEventListener('pointermove',event=>{
  if(event.pointerType!=='mouse'||!available()||!active)return;
  const next=nearest(event.target);
  if(next!==active){reset();return}
  lastX=event.clientX;lastY=event.clientY;
  if(!frame)frame=requestAnimationFrame(tick);
 },{passive:true});
 document.addEventListener('pointerout',event=>{
  if(active&&!active.contains(event.relatedTarget)&&active.contains(event.target))reset();
 },{passive:true});
 window.addEventListener('blur',reset);
 for(const mq of [finePointer,reducedMotion])mq.addEventListener?.('change',reset);
 const change=new MutationObserver(()=>{if(root.dataset.mmEffects==='off')reset()});
 change.observe(root,{attributes:true,attributeFilter:['data-mm-effects']});
})();
