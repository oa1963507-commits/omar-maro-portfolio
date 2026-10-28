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

test('project grid is uniform on desktop tablet and mobile with no bento spans',()=>{
 assert.ok(css.includes('grid-template-columns:repeat(3,minmax(0,1fr));gap:20px'));
 assert.ok(css.includes('@media(max-width:1120px) and (min-width:691px)'));
 assert.ok(css.includes('.projects-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}'));
 assert.ok(css.includes('.projects-grid{grid-template-columns:minmax(0,1fr);gap:16px}'));
 assert.ok(!css.includes('grid-auto-flow:dense'));
 assert.ok(!css.includes('.project-card:nth-child(8n+1)'));
 assert.ok(!css.includes('.project-card:nth-child(6n+1)'));
 assert.ok(css.includes('.project-image{display:flex;align-items:center;justify-content:center;flex:0 0 auto'));
 assert.ok(css.includes('aspect-ratio:4/3;padding:12px'));
 assert.ok(css.includes('height:112px'));
 assert.ok(css.includes('object-fit:contain'));
});
test('all project details share the same case overview and preserve full modules',()=>{
 assert.ok(script.includes('class="case-container"><header class="case-overview"'));
 assert.ok(script.includes("const ordered=hasModules?p.modules:images.map"));
 assert.ok(css.includes('.case-overview{'));
 assert.ok(css.includes('.case-gallery{width:100%;max-width:1080px'));
 assert.ok(css.includes('max-height:none;object-fit:contain'));
});

test('original Omar Maro logo replaces all standalone decorative OM letters',async()=>{
 const manager=await fs.readFile(new URL('../tools/manage-projects.html',import.meta.url),'utf8');
 const adminStyle=await fs.readFile(new URL('../tools/manage-projects.css',import.meta.url),'utf8');
 assert.ok(html.includes('class="service-logo-outline"'));
 assert.ok(html.includes('href="assets/omar-mark.png"'));
 assert.ok(html.includes('filter="url(#omar-real-logo-outline)"'));
 assert.ok(!html.includes('<span>OM</span>'));
 assert.ok(!css.includes('.service-art-brand span{'));
 assert.ok(css.includes('.service-logo-outline{'));
 assert.ok(script.includes('project-image-fallback"><img src="assets/omar-mark.png"'));
 assert.ok(!script.includes('>OM /'));
 assert.ok(manager.includes('<span class="mark"><img src="../assets/omar-mark.png"'));
 assert.ok(!manager.includes('>OM.</span>'));
 assert.ok(adminStyle.includes('.mark img{'));
});

test('CV-based About profile contains five real career entries and verified accomplishments',()=>{
 assert.ok(html.includes('id="about-heading"'));
 assert.equal((html.match(/class="career-card reveal"/g)||[]).length,5);
 for(const name of ['Infinity Marketing Agency','Coffee Moca','Print Alwan','موقع حصري الإخباري','شركة ارنج لماكينات الطباعة']){
   assert.ok(html.includes(name),'missing CV organization '+name);
 }
 for(const date of ['2021-08','2023-02','2023-11','2025-02','2025-06','2025-09','2025-10','2025-12']){
   assert.ok(html.includes('datetime="'+date+'"'),'missing CV month '+date);
 }
 assert.ok(html.includes('أكثر من 20 مشروعًا لأكثر من 8 أطباء'));
 assert.ok(html.includes('خبرة تتجاوز 6 سنوات'));
});
test('About section lists education, five CV skills and public professional links without publishing DOB',()=>{
 for(const skill of ['Adobe Photoshop','Adobe Illustrator','Branding Design','AI-powered design tools','Dayline design'])
   assert.ok(html.includes(skill));
 assert.ok(html.includes('جامعة عين شمس'));
 assert.ok(html.includes('Adoby ex'));
 assert.ok(html.includes('linkedin.com/in/omar-adel-63a729213'));
 assert.ok(html.includes('www.behance.net/oa19635079ead'));
 assert.ok(html.includes('mailto:oa456aa@gmail.com'));
 assert.ok(!html.includes('22/3/2001'),'date of birth must not be published');
 assert.ok(css.includes('.career-timeline{'));
 assert.ok(css.includes('.resume-columns{'));
 assert.ok(css.includes('.about-highlights{'));
 assert.ok(css.includes('@media(max-width:690px)'));
});

test('contact form remains usable and still sends via external WhatsApp link',()=>{
 assert.ok(html.includes('id="brief-form"'));
 for(const name of ['client-name','project-type','project-description'])assert.ok(html.includes(`id="${name}"`));
 assert.ok(script.includes("$('#brief-form').addEventListener('submit'"));
 assert.ok(script.includes('https://wa.me/'));
});
