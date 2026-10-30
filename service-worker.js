/* OMAR MARO offline shell; all Behance content and CMS settings stay network-first.
   Scoped to the GitHub Pages project path, with no offline claim for full galleries. */
const BASE='/omar-maro-portfolio/';
const CACHE='omar-maro-shell-v20261031-icon2';
const SHELL=[
 BASE,BASE+'index.html',
 BASE+'styles.css',BASE+'mobile.css',BASE+'minimal-3d.css',
 BASE+'intro.css',BASE+'intro.js',BASE+'app.js',
 BASE+'controls.js',BASE+'i18n.js',BASE+'lightbox.js',
 BASE+'site-cms.js',BASE+'minimal-3d.js',BASE+'install.js',
 BASE+'assets/omar-mark.png',BASE+'assets/pen-tool.svg',
 BASE+'assets/omar-icon-192.png',BASE+'assets/omar-icon-512.png',
 BASE+'assets/omar-icon-maskable-512.png',BASE+'assets/omar-apple-touch-180.png',
 BASE+'assets/omar-favicon-32.png',BASE+'manifest.webmanifest'
];
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  // A failed optional asset must not prevent service-worker installation.
  await Promise.allSettled(SHELL.map(p=>cache.add(new Request(p,{cache:'reload'}))));
  await self.skipWaiting();
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(x=>x.startsWith('omar-maro-shell-')&&x!==CACHE).map(x=>caches.delete(x)));
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET')return;
 const url=new URL(req.url);
 if(url.origin!==self.location.origin||!url.pathname.startsWith(BASE))return;
 // Never cache settings/catalog, admin, or case-study pages, since they can change.
 if(url.pathname.startsWith(BASE+'data/')||url.pathname.startsWith(BASE+'tools/')||url.pathname.startsWith(BASE+'projects/'))return;
 if(req.mode==='navigate'){
   const path=url.pathname;
   if(path!==BASE&&path!==BASE+'index.html')return;
   event.respondWith((async()=>{
    try{
     const online=await fetch(req);
     if(online.ok){const cache=await caches.open(CACHE);await cache.put(BASE,online.clone())}
     return online;
    }catch{
     const cache=await caches.open(CACHE);
     return await cache.match(BASE)||new Response('Offline. Reconnect to open OMAR MARO.',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}});
    }
   })());
   return;
 }
 if(!SHELL.includes(url.pathname))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try{
   const online=await fetch(req);
   if(online.ok)await cache.put(req,online.clone());
   return online;
  }catch{return await cache.match(req,{ignoreSearch:true})||Response.error()}
 })());
});
