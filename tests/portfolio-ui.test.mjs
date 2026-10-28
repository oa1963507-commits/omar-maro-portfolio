import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const [html,css,script,controls,siteSettings,catalog]=await Promise.all([
 fs.readFile(new URL('../index.html',import.meta.url),'utf8'),
 fs.readFile(new URL('../styles.css',import.meta.url),'utf8'),
 fs.readFile(new URL('../app.js',import.meta.url),'utf8'),
 fs.readFile(new URL('../controls.js',import.meta.url),'utf8'),
 fs.readFile(new URL('../data/site-controls.json',import.meta.url),'utf8').then(JSON.parse),
 fs.readFile(new URL('../data/projects.json',import.meta.url),'utf8').then(JSON.parse)
]);

test('all primary portfolio sections and essential dynamic anchors are present',()=>{
 for(const id of ['home','work','services','about','contact','process','projects-grid','total-projects','hero-featured','metric-projects','metric-images','project-view','project-view-content','menu-toggle','mobile-nav','brief-form','client-name','project-type','project-description','year','progress']){
  assert.ok(html.includes(`id="${id}"`),`missing accessible target: ${id}`);
 }
});

test('owner-specific controls load before public app script, and management remains reachable',()=>{
 const a=html.indexOf('src="controls.js"'),b=html.indexOf('src="app.js"');
 assert.ok(a>0 && b>a);
 assert.ok(html.includes('tools/manage-projects.html'));
 assert.ok(script.includes('OMPortfolioControls'));
 assert.ok(script.includes('data/site-controls.json'));
 assert.ok(controls.includes('applyControls'));
});

test('project list and hero are driven by owner-approved visible projects',()=>{
 assert.ok(script.includes('renderFeaturedProjects();renderProjects();route();'));
 assert.ok(script.includes("const selected=projects.filter"));
 assert.ok(script.includes("projects.filter(p=>activeFilter === 'all'"));
 assert.ok(script.includes('showcase-card'));
 assert.ok(script.includes('metric-projects'));
});

test('redesign keeps responsive layouts, accessible motion and uncropped case study images',()=>{
 assert.ok(css.includes('.projects-grid'));
 assert.ok(css.includes('.showcase-grid'));
 assert.ok(css.includes('.service-card-hero'));
 assert.ok(css.includes('@media(max-width:690px)'));
 assert.ok(css.includes('prefers-reduced-motion'));
 assert.ok(css.includes('object-fit:contain'));
 assert.ok(css.includes('.project-view[hidden]'));
});

test('existing imported project records and owner presentation choices remain intact',()=>{
 assert.ok(Array.isArray(catalog));
 const ids=catalog.filter(p=>p.source==='behance').map(p=>p.id);
 assert.ok(ids.length>=28);
 assert.equal(new Set(ids).size,ids.length);
 assert.ok(catalog.filter(p=>p.source==='behance').reduce((n,p)=>n+(p.images?.length||0),0)>=183);
 for(const k of ['order','hidden','excluded','overrides','customProjects']) assert.ok(Object.hasOwn(siteSettings,k));
});

test('contact form remains usable and still sends via external WhatsApp link',()=>{
 assert.ok(html.includes('id="brief-form"'));
 for(const name of ['client-name','project-type','project-description'])assert.ok(html.includes(`id="${name}"`));
 assert.ok(script.includes("$('#brief-form').addEventListener('submit'"));
 assert.ok(script.includes('https://wa.me/'));
});
