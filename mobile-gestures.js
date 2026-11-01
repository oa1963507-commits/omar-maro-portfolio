/* OMAR MARO mobile touch behavior.
 * Cancel native two-finger page zoom while leaving one-finger scrolling,
 * horizontal project filters, buttons, and the lightbox Zoom control intact.
 * iOS Safari emits gesture* events; Chromium emits multi-touch events.
 */
(()=>{
  'use strict';
  const onMobile=()=>window.matchMedia('(max-width: 920px) and (pointer: coarse)').matches;
  if(!onMobile())return;

  function cancelIfPossible(event){
    if(event.cancelable)event.preventDefault();
  }
  function preventMultitouch(event){
    if(event.touches&&event.touches.length>1)cancelIfPossible(event);
  }
  // passive:false is required to cancel the browser's native pinch gesture.
  document.addEventListener('touchstart',preventMultitouch,{capture:true,passive:false});
  document.addEventListener('touchmove',preventMultitouch,{capture:true,passive:false});
  document.addEventListener('gesturestart',cancelIfPossible,{capture:true,passive:false});
  document.addEventListener('gesturechange',cancelIfPossible,{capture:true,passive:false});
})();
