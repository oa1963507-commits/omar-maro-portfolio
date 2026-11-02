import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const read=path=>fs.readFile(new URL('../'+path,import.meta.url),'utf8');
const [html,css,oldMobile,actions,intro,sw,workflow]=await Promise.all([
 read('index.html'),read('mobile-polish.css'),read('mobile.css'),
 read('project-actions.css'),read('intro.js'),read('service-worker.js'),
 read('.github/workflows/deploy-pages.yml')
]);
test('mobile polish is last in stylesheet order and never changes desktop layout',()=>{
 const order=['styles.css','minimal-3d.css','intro.css','mobile.css','project-actions.css','mobile-polish.css'];
 let last=-1;
 for(const name of order){
  const found=html.indexOf('href="'+name);
  assert.ok(found>last,'stylesheet order: '+name);
  last=found;
 }
 assert.ok(css.startsWith('/* OMAR MARO — Mobile V2'));
 assert.ok(css.includes('@media (max-width:920px)'));
 assert.ok(css.includes('@media(max-width:690px)'));
 assert.ok(css.includes('@media(max-width:365px)'));
 assert.ok(css.includes('@media(display-mode:standalone) and (max-width:690px)'));
 assert.ok(!css.includes('!important'),'mobile visual refinement should not force overrides on existing layout');
 assert.ok(!css.includes('http://')&&!css.includes('https://'));
});
test('small-screen navigation, CTA, categories and artwork are stable',()=>{
 for(const marker of ['.topbar-inner','.menu-toggle','.mobile-nav','.hero-layout','.hero-buttons','.hero-showcase','.showcase-grid','.filters','.projects-grid','.project-image','.project-info','.project-info-main','.project-card-actions']){
  assert.ok(css.includes(marker),'missing mobile layout: '+marker);
 }
 assert.match(css,/\.hero-buttons\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/\.projects-grid\{grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/\.project-image\{aspect-ratio:4\/3/);
 assert.match(css,/\.filters\{display:flex;flex-wrap:nowrap;overflow-x:auto/);
 assert.match(css,/\.project-card-actions \.project-arrow,\.project-card-actions \.project-action\{width:44px;height:44px/);
 assert.match(css,/\.project-info-main\{min-height:62px/);
 assert.ok(!css.includes('object-fit:cover'),'must not crop original project art');
 assert.ok(html.includes('id="projects-grid"'));
 assert.ok(html.includes('data-card-like='));
 assert.ok(html.includes('data-card-share='));
});
test('contact, about and case study remain usable from phone widths',()=>{
 for(const selector of ['.about-grid','.about-profile-links','.about-art','.career-card','.contact-grid','.contact-form','.brief-two-cols','.attachment-dropzone','.case-container','.case-overview','.lightbox-stage','.lightbox-actions','.project-view-header']){
  assert.ok(css.includes(selector),selector);
 }
 assert.match(css,/\.contact-form :is\(input,select,textarea\)\{font-size:16px;min-height:48px\}/);
 assert.match(css,/\.brief-two-cols\{grid-template-columns:minmax\(0,1fr\)\}/);
 assert.match(css,/\.lightbox-stage\{grid-template-columns:38px minmax\(0,1fr\) 38px/);
 assert.match(css,/env\(safe-area-inset-bottom,0px\)/);
 assert.ok(oldMobile.includes('mm-install-button'));
 assert.ok(actions.includes('.project-action.is-liked'));
 assert.ok(html.includes('project-like-action'));
});
test('seven-second unskippable intro is preserved, adjusted only in mobile CSS',()=>{
 assert.match(intro,/window\.setTimeout\(endIntro,7000\)/);
 assert.doesNotMatch(intro,/mm-intro-skip|sessionStorage/);
 assert.doesNotMatch(html,/id="mm-intro-skip"/);
 assert.match(css,/\.site-intro\{padding:24px 18px\}/);
 assert.match(css,/\.mm-intro-title\{font-size:clamp\(35px,10\.2vw,65px\)/);
 assert.match(css,/@media\(max-width:920px\) and \(max-height:460px\) and \(orientation:landscape\)/);
});
test('mobile styles are cached for installable site and tested before publish',()=>{
 assert.match(sw,/omar-maro-shell-v20261102-request-similar/);
 assert.match(sw,/BASE\+'mobile-polish\.css'/);
 assert.match(workflow,/tests\/mobile-polish\.test\.mjs/);
});

test('RTL mobile viewport stays within screen width without breaking horizontal project filters',()=>{
 assert.match(html,/dir="rtl"/);
 assert.match(css,/Horizontal viewport guard/);
 const guard=css.slice(css.indexOf('/* Horizontal viewport guard'));
 assert.match(guard,/@media\(max-width:920px\)/);
 assert.match(guard,/html\{\s*inline-size:100%;\s*max-inline-size:100%;\s*overflow-x:hidden;[\s\S]*?overflow-x:clip;/);
 assert.match(guard,/body\{\s*inline-size:100%;\s*max-inline-size:100%;\s*overflow-x:hidden;[\s\S]*?overflow-x:clip;/);
 assert.match(guard,/\.hero::before\{\s*inset-inline:0;/);
 assert.match(guard,/\.hero-showcase \.showcase-halo\{\s*inset-inline:0;/);
 assert.match(guard,/\.hero-topline \.live-label\{\s*min-inline-size:0;/);
 assert.match(guard,/\.filters\{\s*max-inline-size:100%;\s*overflow-x:auto;/);
 assert.doesNotMatch(guard,/\.filters\{[^}]*overflow-x:hidden/);
 assert.match(html,/mobile-polish\.css\?v=overflow-fixed-20261102/);
 assert.match(sw,/omar-maro-shell-v20261102-request-similar/);
});
