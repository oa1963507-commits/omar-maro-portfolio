/* Home-screen installation guidance for OMAR MARO, with safe fallbacks.
   No tracking, no artificial 'installed' claims, no browser-specific forced prompts. */
(()=>{
'use strict';
let deferredPrompt=null;
let installed=false;
const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const isIOS=()=>/iPad|iPhone|iPod/i.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1;
const mobile=()=>window.matchMedia('(max-width: 920px)').matches;
const getLang=()=>document.documentElement.lang==='en'?'en':'ar';
const strings={
 ar:{
  button:'إضافة الموقع للشاشة الرئيسية ＋',heading:'اختصار OMAR MARO على الشاشة الرئيسية',
  ios:'افتح الموقع في Safari، واضغط زر المشاركة، وبعدها «إضافة إلى الشاشة الرئيسية» ثم «إضافة».',
  android:'افتح الموقع في Chrome، واضغط قائمة الثلاث نقاط ⋮، ثم «إضافة إلى الشاشة الرئيسية» أو «تثبيت التطبيق».',
  installed:'تم تثبيت الاختصار على جهازك.',
  fallback:'استخدم الخطوات المناسبة لمتصفحك لإضافة اختصار الموقع.'
 },
 en:{
  button:'Add to Home Screen ＋',heading:'OMAR MARO on your home screen',
  ios:'Open in Safari, tap Share, then Add to Home Screen and Add.',
  android:'Open in Chrome, tap the three-dot menu ⋮, then Add to Home screen or Install app.',
  installed:'The shortcut was added to your device.',
  fallback:'Use your browser menu to add a shortcut to your home screen.'
 }
};
function update(){
 const button=document.getElementById('mm-install-trigger');
 const guide=document.getElementById('mm-install-guide');
 if(!button||!guide)return;
 const s=strings[getLang()];
 button.textContent=s.button;
 button.hidden=installed||standalone();
 const heading=guide.querySelector('strong'),desc=guide.querySelector('p');
 if(heading)heading.textContent=s.heading;
 if(desc)desc.textContent=isIOS()?s.ios:s.android;
}
async function requestInstall(){
 if(installed||standalone())return;
 const guide=document.getElementById('mm-install-guide');
 if(deferredPrompt){
   const prompt=deferredPrompt;
   deferredPrompt=null;
   guide.hidden=true;
   try{
     await prompt.prompt();
     const choice=await prompt.userChoice;
     if(choice?.outcome==='accepted'){
       installed=true;
       update();
     }
   }catch{
     guide.hidden=false;
   }
 }else{
   guide.hidden=!guide.hidden;
   if(!guide.hidden)guide.scrollIntoView({block:'nearest',behavior:'smooth'});
 }
}
function init(){
 const nav=document.getElementById('mobile-nav');
 if(!nav||document.getElementById('mm-install-trigger'))return;
 const button=document.createElement('button');
 button.type='button';button.className='mm-install-button';button.id='mm-install-trigger';
 const guide=document.createElement('div');
 guide.id='mm-install-guide';guide.className='mm-install-guide';guide.hidden=true;guide.setAttribute('role','status');
 const heading=document.createElement('strong'),p=document.createElement('p');
 guide.append(heading,p);nav.append(button,guide);
 button.addEventListener('click',requestInstall);
 window.addEventListener('om-language-change',update);
 update();
}
window.addEventListener('beforeinstallprompt',event=>{
 if(!mobile()||standalone())return;
 event.preventDefault();deferredPrompt=event;
 update();
});
window.addEventListener('appinstalled',()=>{installed=true;deferredPrompt=null;update()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
if('serviceWorker' in navigator&&window.isSecureContext){
 window.addEventListener('load',()=>{
   navigator.serviceWorker.register('./service-worker.js',{scope:'./',updateViaCache:'none'}).catch(()=>{});
 },{once:true});
}
})();
