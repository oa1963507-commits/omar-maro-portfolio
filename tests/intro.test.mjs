import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const read=path=>fs.readFile(new URL('../'+path,import.meta.url),'utf8');
const [html,css,js,app,settings]=await Promise.all([
 read('index.html'),read('intro.css'),read('intro.js'),read('app.js'),read('data/site-controls.json')
]);
test('brand intro is loaded before the page body and uses the approved original logo',()=>{
 assert.ok(html.indexOf('src="intro.js?v=')>0);
 assert.ok(html.indexOf('src="intro.js?v=')<html.indexOf('<body>'));
 assert.match(html,/href="intro\.css\?v=/);
 assert.match(html,/id="site-intro"/);
 assert.match(html,/role="dialog" aria-modal="true"/);
 assert.match(html,/id="mm-intro-title"/);
 assert.match(html,/src="assets\/omar-mark\.png" width="100"/);
 assert.doesNotMatch(html,/id="mm-intro-skip"/);
 assert.match(html,/id="mm-intro-caption"/);
 assert.ok(html.indexOf('id="site-intro"')<html.indexOf('id="home"'));
});
test('intro never blocks access when script is off and safely dismisses when it runs',()=>{
 assert.match(css,/\.site-intro\{display:none\}/);
 assert.match(css,/html\.mm-intro-pending \.site-intro/);
 assert.match(js,/document\.documentElement/);
 assert.match(js,/mm-intro-pending/);
 assert.match(js,/mm-intro-leaving/);
 assert.match(js,/window\.setTimeout\(endIntro/);
 assert.match(js,/classList\.remove\('mm-intro-pending','mm-intro-leaving'\)/);
 assert.match(js,/addEventListener\('pagehide'/);
 assert.match(js,/event\.persisted/);
});
test('intro stays for seven seconds on every full visit and has no skip controls',()=>{
 assert.doesNotMatch(js,/sessionStorage/);
 assert.doesNotMatch(js,/intro-seen-v1/);
 assert.doesNotMatch(js,/location\.hash/);
 assert.match(js,/window\.addEventListener\('pageshow'/);
 assert.match(js,/if\(event\.persisted\)startIntro\(\)/);
 assert.doesNotMatch(js,/mm-intro-skip/);
 assert.doesNotMatch(js,/event\.key==='Escape'/);
 assert.match(js,/window\.setTimeout\(endIntro,7000\)/);
 assert.match(js,/window\.setTimeout\(endIntro,11000\)/);
 assert.match(css,/mmIntroTrack 6\.65s linear/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.doesNotMatch(css,/\.mm-intro-skip/);
});
test('existing portfolio catalog, full gallery, admin and links remain intact',()=>{
 assert.match(html,/id="projects-grid"/);
 assert.match(html,/id="hero-featured"/);
 assert.match(html,/id="brief-form"/);
 assert.match(html,/id="language-toggle"/);
 assert.match(html,/facebook\.com\/omar\.maro\.38382/);
 assert.match(html,/instagram\.com\/_omar_maro_ds/);
 assert.match(app,/data\/site-controls\.json/);
 const parsed=JSON.parse(settings);
 assert.ok(Array.isArray(parsed.order));
});

test('intro opens despite existing session history and #work, closes after seven seconds, restarts on BFCache return',()=>{
 const activeClasses=new Set(),events={},windowEvents={},scheduled=new Map();
 let id=0;
 const overlay={attrs:{},setAttribute(k,v){this.attrs[k]=v}};
 const label={textContent:''};
 const main={inert:false};
 const root={classList:{
   add(...classes){classes.forEach(c=>activeClasses.add(c));},
   remove(...classes){classes.forEach(c=>activeClasses.delete(c));}
 }};
 const doc={
   documentElement:root,readyState:'loading',
   addEventListener(name,fn){events[name]=fn;},
   getElementById(id){return id==='site-intro'?overlay:id==='mm-intro-caption'?label:null},
   querySelectorAll(){return [main];}
 };
 const win={
   setTimeout(fn,ms){const key=++id;scheduled.set(key,{fn,ms});return key;},
   clearTimeout(key){scheduled.delete(key);},
   addEventListener(name,fn){windowEvents[name]=fn;}
 };
 vm.runInNewContext(js,{
   document:doc,window:win,location:{hash:'#work',search:''},
   localStorage:{getItem(){return 'ar';}},
   sessionStorage:{getItem(){return 'yes';}}
 });
 assert.ok(activeClasses.has('mm-intro-pending'),'intro must begin before body renders');
 events.DOMContentLoaded();
 assert.equal(overlay.attrs['aria-hidden'],'false');
 assert.equal(main.inert,true);
 assert.ok([...scheduled.values()].some(t=>t.ms===7000));
 assert.equal(label.textContent,'من الفكرة للأثر.');
 const normal=[...scheduled.values()].find(t=>t.ms===7000);
 normal.fn();
 assert.equal(overlay.attrs['aria-hidden'],'true');
 assert.equal(main.inert,false);
 const exit=[...scheduled.values()].find(t=>t.ms===430);
 exit.fn();
 assert.ok(!activeClasses.has('mm-intro-pending'));
 windowEvents.pageshow({persisted:true});
 assert.ok(activeClasses.has('mm-intro-pending'),'intro must replay after back-forward cache restore');
 assert.equal(overlay.attrs['aria-hidden'],'false');
 assert.ok([...scheduled.values()].some(t=>t.ms===7000));
 windowEvents.pagehide();
 assert.ok(!activeClasses.has('mm-intro-pending'));
 assert.equal(main.inert,false);
});
