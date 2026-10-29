/* Omar Maro fullscreen case-study gallery. No external dependencies. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const box=$('image-lightbox'),img=$('lightbox-image'),count=$('lightbox-count');
const gallery=$('project-view-content'),scroll=$('lightbox-scroll'),origin=$('lightbox-original');
const zoomButton=$('lightbox-zoom'),prev=$('lightbox-prev'),next=$('lightbox-next');
if(!box||!gallery)return;
let list=[],index=0,zoom=false,focusedBefore=null,startX=null;
const isEN=()=>document.documentElement.lang==='en';
function update(){
 const item=list[index];
 if(!item)return;
 zoom=false;
 scroll.classList.remove('zoomed');
 img.removeAttribute('srcset');
 img.src=item.url;
 img.alt=item.alt||'Project image';
 origin.href=item.url;
 count.textContent=(index+1)+' / '+list.length;
 prev.disabled=list.length<2;
 next.disabled=list.length<2;
 zoomButton.textContent=isEN()?'Zoom +':'تكبير +';
 scroll.scrollTop=0;scroll.scrollLeft=0;
}
function open(link){
 const anchors=[...gallery.querySelectorAll('a[data-full-image]')];
 list=anchors.map(a=>({url:a.href,alt:a.querySelector('img')?.alt||''})).filter(item=>item.url.startsWith('https://')||item.url.startsWith(location.origin+'/'));
 index=anchors.indexOf(link);
 if(index<0||!list.length)return;
 focusedBefore=document.activeElement;
 box.hidden=false;
 box.setAttribute('aria-hidden','false');
 document.body.classList.add('lightbox-open');
 update();$('lightbox-close').focus();
}
function close(){
 if(box.hidden)return;
 box.hidden=true;box.setAttribute('aria-hidden','true');
 document.body.classList.remove('lightbox-open');
 img.removeAttribute('src');
 list=[];zoom=false;startX=null;
 if(focusedBefore?.isConnected)focusedBefore.focus();
}
function move(d){
 if(!list.length)return;
 index=(index+d+list.length)%list.length;
 update();
}
function toggleZoom(){
 zoom=!zoom;scroll.classList.toggle('zoomed',zoom);
 zoomButton.textContent=zoom?(isEN()?'Fit image':'ملاءمة الصورة'):(isEN()?'Zoom +':'تكبير +');
}
gallery.addEventListener('click',event=>{
 const a=event.target.closest('a[data-full-image]');
 if(!a||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button!==0)return;
 event.preventDefault();open(a);
});
$('lightbox-close').addEventListener('click',close);
prev.addEventListener('click',()=>move(-1));
next.addEventListener('click',()=>move(1));
zoomButton.addEventListener('click',toggleZoom);
img.addEventListener('click',toggleZoom);
scroll.addEventListener('touchstart',e=>{startX=e.touches.length===1?e.touches[0].clientX:null},{passive:true});
scroll.addEventListener('touchend',e=>{
 if(startX===null||zoom||e.changedTouches.length!==1)return;
 const dx=e.changedTouches[0].clientX-startX;startX=null;
 if(Math.abs(dx)>58)move(dx<0?1:-1);
},{passive:true});
window.addEventListener('om-language-change',()=>{if(!box.hidden)zoomButton.textContent=zoom?(isEN()?'Fit image':'ملاءمة الصورة'):(isEN()?'Zoom +':'تكبير +');});
document.addEventListener('keydown',e=>{
 if(box.hidden)return;
 if(['Escape','ArrowRight','ArrowLeft','Tab','+','=','-'].includes(e.key)){
   if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();return;}
   if(e.key==='ArrowRight'){e.preventDefault();e.stopImmediatePropagation();move(1);return;}
   if(e.key==='ArrowLeft'){e.preventDefault();e.stopImmediatePropagation();move(-1);return;}
   if(e.key==='+'||e.key==='='||e.key==='-'){e.preventDefault();e.stopImmediatePropagation();if(zoom===(e.key==='-'))toggleZoom();return;}
   if(e.key==='Tab'){
     const focusable=[...box.querySelectorAll('button:not(:disabled),a[href]')].filter(x=>x.offsetParent!==null);
     if(!focusable.length)return;
     const at=focusable.indexOf(document.activeElement);
     if(e.shiftKey&&(at<=0)){e.preventDefault();focusable[focusable.length-1].focus();}
     else if(!e.shiftKey&&(at===focusable.length-1)){e.preventDefault();focusable[0].focus();}
     e.stopImmediatePropagation();
   }
 }
},true);
})();
