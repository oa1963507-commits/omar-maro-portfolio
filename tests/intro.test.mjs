import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
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
 assert.match(html,/id="mm-intro-skip"/);
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
test('intro is accessible, skippable, brief and only shown once per tab',()=>{
 assert.match(js,/sessionStorage\.getItem\('omar-maro-intro-seen-v1'\)/);
 assert.match(js,/sessionStorage\.setItem\('omar-maro-intro-seen-v1','yes'\)/);
 assert.match(js,/location\.hash/);
 assert.match(js,/prefers-reduced-motion: reduce/);
 assert.match(js,/get\('intro'\)==='1'/);
 assert.match(js,/skip\?\.addEventListener\('click',endIntro/);
 assert.match(js,/event\.key==='Escape'/);
 assert.match(js,/window\.setTimeout\(endIntro,reduced\?350:2300\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css, /:focus-visible/);
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
