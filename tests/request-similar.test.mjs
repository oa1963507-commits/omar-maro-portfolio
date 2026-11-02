import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {applyControls,normalizeControls}=require('../controls.js');
const read=p=>fs.readFile(new URL('../'+p,import.meta.url),'utf8');
const [app,html,css,seo,workflow,rawCatalog,rawSettings]=await Promise.all([
 read('app.js'),read('index.html'),read('request-similar.css'),
 read('scripts/build-seo.mjs'),read('.github/workflows/deploy-pages.yml'),
 read('data/projects.json'),read('data/site-controls.json')
]);
const visible=applyControls(JSON.parse(rawCatalog),normalizeControls(JSON.parse(rawSettings)));

test('every published homepage project shows Request similar design in its static card',()=>{
 const grid=html.slice(html.indexOf('<div id="projects-grid"'),html.indexOf('<div class="work-footer">'));
 const ids=[...grid.matchAll(/<article class="project-card" data-project-id="([a-z0-9-]+)">/g)].map(m=>m[1]);
 const ctas=[...grid.matchAll(/data-request-similar="([a-z0-9-]+)"/g)].map(m=>m[1]);
 assert.equal(ids.length,visible.length);
 assert.deepEqual(ctas,ids,'static cards should keep project IDs synchronized');
 for(const id of ids){
  assert.ok(grid.includes('href="?inspiration='+id+'#contact"'));
 }
 assert.match(grid,/عايز تصميم شبه ده/);
 assert.match(seo,/project-request-similar/);
});

test('client can request from dynamic gallery and in-project case study in Arabic or English',()=>{
 const card=app.slice(app.indexOf('  function projectCard('),app.indexOf('  function renderFeaturedProjects('));
 const detail=app.slice(app.indexOf('  function renderDetail('),app.indexOf("  document.addEventListener('click',async e=>"));
 assert.match(card,/data-request-similar="/);
 assert.match(card,/encodeURIComponent\(p\.id\)/);
 assert.match(card,/Request a similar design/);
 assert.match(detail,/const requestLink=/);
 assert.match(detail,/\$\{caseFacts\}\$\{originalLink\}\$\{requestLink\}/);
 assert.match(detail,/\$\{permanentLink\}\$\{shareLink\}\$\{requestLink\}/);
 assert.match(seo,/Request a similar design ↗/);
 const one=visible[0];
 const published=await read('projects/'+one.id+'/index.html');
 assert.ok(published.includes('?inspiration='+one.id+'#contact'));
 assert.match(published,/Request a similar design/);
});

test('inspired project title and URL are clearly shown, editable, removable and sent with the brief',()=>{
 for(const id of ['inspiration-project','inspiration-label','inspiration-name','inspiration-link','inspiration-clear','project-reference'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/id="inspiration-project"[^>]*hidden[^>]*role="status"/);
 assert.match(app,/function chooseInspiration\(project\)/);
 assert.match(app,/inspirationSelection=\{id:project\.id,title:project\.title,href\}/);
 assert.match(app,/\$\('#project-reference'\)\.value=href/);
 assert.match(app,/function resolveInspiration\(id,element\)/);
 assert.match(app,/new URLSearchParams\(location\.search\)\.get\('inspiration'\)/);
 assert.match(app,/function restoreInspirationFromLink\(\)/);
 assert.match(app,/closest\('a\[data-request-similar\]'\)/);
 assert.match(app,/event\.preventDefault\(\);\s*chooseInspiration\(project\)/);
 assert.match(app,/setBriefStep\(1\)/);
 assert.match(app,/history\.replaceState\(null,'',url\.href\)/);
 assert.match(app,/\$\('#contact'\)\?\.scrollIntoView/);
 assert.match(app,/url.searchParams.delete\('inspiration'\)/);
 assert.match(app,/if\(\$\('#project-reference'\)\.value===inspirationSelection\.href\)\$\('#project-reference'\)\.value=''/);
 assert.match(app,/المشروع المرجعي:/);
 assert.match(app,/Inspired by project:/);
 assert.match(app,/inspirationSelection\.title/);
 assert.match(app,/inspirationSelection\.href/);
 assert.match(app,/reference!==inspirationSelection\.href/);
 assert.match(app,/window\.open\(whatsappURL,'_blank','noopener,noreferrer'\)/);
 assert.match(css,/\.inspiration-project\[hidden\]\{display:none!important\}/);
 assert.match(css,/@media\(max-width:690px\)/);
});

test('styles and scripts are cache-busted; protected site configuration stays untouched',()=>{
 assert.match(html,/request-similar\.css\?v=request-similar-20261102/);
 assert.match(html,/app\.js\?v=request-similar-20261102/);
 assert.match(workflow,/tests\/request-similar\.test\.mjs/);
 assert.ok(!css.includes('object-fit:cover'));
 assert.ok(html.includes('id="language-toggle"'));
 assert.ok(html.includes('id="hero-featured"'));
});
