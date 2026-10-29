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
 for(const name of ['Infinity Marketing Agency','Coffee Moca','Print Alwan','موقع حصري الإخباري','شركة أريج لماكينات الطباعة']){
   assert.ok(html.includes(name),'missing CV organization '+name);
 }
 for(const date of ['2021-08','2023-02','2023-11','2025-02','2025-06','2025-09','2025-10','2025-12']){
   assert.ok(html.includes('datetime="'+date+'"'),'missing CV month '+date);
 }
 assert.ok(html.includes('أكثر من 20 مشروعًا لأكثر من 8 أطباء'));
 assert.ok(html.includes('خبرة تتجاوز 6 سنوات'));
});
test('CV names, dates, and credentials are reproduced faithfully in Arabic and English',async()=>{
 const locale=await fs.readFile(new URL('../i18n.js',import.meta.url),'utf8');
 assert.ok(html.includes('شركة أريج لماكينات الطباعة'));
 assert.ok(!html.includes('شركة ارنج'));
 assert.ok(!locale.includes('Orange Printing Machines Company'));
 assert.ok(!locale.includes('شركة ارنج لماكينات الطباعة'));
 assert.ok(locale.includes('Areej Printing Machines Company'));
 assert.ok(html.includes('موقع حصري الإخباري'));
 assert.ok(html.includes('Infinity Marketing Agency'));
 assert.ok(html.includes('Coffee Moca'));
 assert.ok(html.includes('Print Alwan'));
 assert.ok(html.includes('tel:+201128791108'));
 assert.ok(html.includes('01128791108'));
 assert.ok(html.includes('mailto:oa456aa@gmail.com'));
 assert.ok(html.includes('linkedin.com/in/omar-adel-63a729213'));
 assert.ok(html.includes('www.behance.net/oa19635079ead'));
 assert.ok(html.includes('Dayline design'));
 assert.ok(html.includes('Adoby ex'));
 assert.ok(html.includes('التخصص غير مذكور في السيرة الذاتية'));
 assert.ok(html.includes('دون توضيح نوع الدراسة أو المؤهل'));
 assert.ok(!html.includes('22/3/2001'),'birth date remains private');
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

test('brand palette is blue across portfolio, logo outline, admin and sync tools',async()=>{
 const admin=await fs.readFile(new URL('../tools/manage-projects.css',import.meta.url),'utf8');
 const sync=await fs.readFile(new URL('../tools/auto-sync.html',import.meta.url),'utf8');
 assert.ok(css.includes('--accent:#6aafff'));
 assert.ok(css.includes('--azure:#3ac7ff'));
 assert.ok(css.includes('--bg:#070c16'));
 assert.ok(css.includes('linear-gradient(90deg,var(--azure),var(--accent))'));
 assert.ok(html.includes('flood-color="#82c0ff"'));
 assert.ok(admin.includes('background:#67abff'));
 assert.ok(sync.includes('#70b5ff'));
 assert.ok(!css.includes('#b8ff62'));
 assert.ok(!css.includes('#3af4a8'));
 assert.ok(!html.includes('flood-color="#9aecad"'));
 assert.ok(!admin.includes('#73cda1'));
 assert.ok(!sync.includes('#77d6a5'));
});

test('English typography uses Plus Jakarta Sans display and Inter UI without replacing Arabic Cairo',async()=>{
 const editorHTML=await fs.readFile(new URL('../tools/manage-projects.html',import.meta.url),'utf8');
 const editorCSS=await fs.readFile(new URL('../tools/manage-projects.css',import.meta.url),'utf8');
 const syncHTML=await fs.readFile(new URL('../tools/auto-sync.html',import.meta.url),'utf8');
 assert.ok(html.includes('family=Cairo:wght@'));
 assert.ok(html.includes('family=Inter:wght@'));
 assert.ok(html.includes('family=Plus+Jakarta+Sans:wght@'));
 assert.ok(!html.includes('Space+Grotesk'));
 assert.ok(css.includes("--font-ar:'Cairo'"));
 assert.ok(css.includes("--font-en:'Inter'"));
 assert.ok(css.includes("--font-display:'Plus Jakarta Sans'"));
 assert.ok(css.includes('.brand>span{font-family:var(--font-display)'));
 assert.ok(css.includes('.project-info h3.is-latin,.case-title.is-latin,.showcase-caption.is-latin'));
 assert.ok(script.includes('const isLatinTitle'));
 assert.ok(script.includes('isLatinTitle(title)'));
 assert.ok(script.includes('const displayTitle ='));
 assert.ok(editorHTML.includes("font-src https://fonts.gstatic.com"));
 assert.ok(editorHTML.includes("style-src 'self' https://fonts.googleapis.com"));
 assert.ok(editorCSS.includes("--font-display:'Plus Jakarta Sans'"));
 assert.ok(syncHTML.includes('family=Inter:wght@'));
 assert.ok(syncHTML.includes('family=Plus+Jakarta+Sans:wght@'));
});

test('Arabic and English are selectable from a persistent, accessible header control',async()=>{
 const locale=await fs.readFile(new URL('../i18n.js',import.meta.url),'utf8');
 assert.ok(html.includes('id="language-toggle"'));
 assert.ok(html.includes('id="language-toggle-project"'));
 assert.ok(html.includes('class="lang-ar"'));
 assert.ok(html.includes('class="lang-en"'));
 assert.ok(html.indexOf('src="i18n.js"')<html.indexOf('src="app.js"'));
 assert.ok(locale.includes("document.documentElement.lang=lang"));
 assert.ok(locale.includes("document.documentElement.dir=lang==='en'?'ltr':'rtl'"));
 assert.ok(locale.includes("localStorage.setItem(storageKey,next)"));
 assert.ok(locale.includes("window.dispatchEvent(new CustomEvent('om-language-change'"));
 assert.ok(css.includes('.language-toggle{'));
 assert.ok(css.includes('.project-language-toggle{'));
 assert.ok(locale.includes("'#language-toggle,#language-toggle-project'"));
 assert.ok(css.includes('html[lang="en"] .hero h1'));
 assert.ok(css.includes('@media(max-width:920px){.language-toggle'));
});
test('every original Arabic static text on the public site has an English translation',async()=>{
 const locale=await fs.readFile(new URL('../i18n.js',import.meta.url),'utf8');
 const match=locale.match(/const dictionary=new Map\((\[[\s\S]*?\])\);\n  const attributes=/);
 assert.ok(match,'translated text dictionary missing');
 const dictionary=new Map(JSON.parse(match[1]));
 const texts=[...html.matchAll(/>([^<>]+)</g)].map(m=>m[1].trim()).filter(Boolean);
 const unmatched=[...new Set(texts.filter(text=>/[\u0600-\u06FF]/.test(text)&&!dictionary.has(text)))];
 assert.deepEqual(unmatched,[]);
});
test('Behance project views and WhatsApp inquiries react to the selected language',()=>{
 for(const part of ['const displayTitle =','const displayCategory =','const displayDescription =','const displayStory =',"window.addEventListener('om-language-change'","Project brief:","View complete original project on Behance","View project ↗"]){
   assert.ok(script.includes(part),'missing bilingual feature: '+part);
 }
 assert.ok(script.includes('title_en:String(p.title_en'));
 assert.ok(script.includes('description_en:String(p.description_en'));
 assert.ok(script.includes('story_en:String(p.story_en'));
});

test('Arabic and English headings use solid, readable text with no hollow outline styling',()=>{
 assert.ok(html.includes('class="heading-highlight">تتشاف.</span>'));
 assert.ok(html.includes('>أثر.</h1>'));
 assert.ok(css.includes('.heading-highlight{color:var(--accent);font-weight:900'));
 assert.ok(!html.includes('class="heading-outline"'));
 assert.ok(!css.includes('-webkit-text-stroke'));
 assert.ok(!html.includes('تتـشــاف.'));
 assert.ok(!html.includes('أثــــر.'));
});
test('every ornamental star is replaced with the blue Pen Tool icon across public sections and case studies',async()=>{
 const icon=await fs.readFile(new URL('../assets/pen-tool.svg',import.meta.url),'utf8');
 assert.ok(icon.includes('viewBox="68 76 516 460"'));
 assert.ok(icon.includes('fill="#6aafff"'));
 assert.ok(icon.includes('<path'));
 assert.ok(icon.includes('M430,88'),'Bezier handle and top node missing');
 assert.ok(icon.includes('M286,204'),'nib silhouette missing');
 assert.ok(icon.includes('M424,458'),'nib base missing');
 assert.ok(!icon.includes('M32 9 11 31'),'old generic glyph must not return');

 assert.ok(html.includes('src="assets/pen-tool.svg?v=bezier-1"'));
 assert.equal(html.split('src="assets/pen-tool.svg?v=bezier-1"').length-1,16);
 assert.ok(css.includes(".statement-section::before{content:''"));
 assert.ok(css.includes(".contact-shell::before{content:''"));
 assert.ok(css.includes("mask:url('assets/pen-tool.svg?v=bezier-1')"));
 assert.ok(css.includes(".pen-tool-icon{"));
 assert.ok(script.includes('THANKS FOR WATCHING <img class="pen-tool-icon"'));
 assert.ok(!html.includes('✳'));
 assert.ok(!css.includes("content:'✳'"));
 assert.ok(!script.includes('✳'));
});

test('project inquiry offers accessible multi-file picker with selection, removal and blue dropzone',()=>{
 for(const id of ['project-files','attachment-list','share-project-files','attachment-feedback'])
   assert.ok(html.includes('id="'+id+'"'),'missing attachment control '+id);
 assert.ok(html.includes('type="file" multiple'));
 assert.ok(html.includes('class="attachment-dropzone"'));
 assert.ok(html.includes('aria-live="polite"'));
 for(const cl of ['.attachment-dropzone{','.attachment-list{','.attachment-item{','.attachment-remove{','.attachment-share{'])
   assert.ok(css.includes(cl),'missing attachment styling '+cl);
 assert.ok(script.includes("const selectedProjectFiles=[]"));
 assert.ok(script.includes('maxAttachmentCount=6'));
 assert.ok(script.includes('maxAttachmentBytes=20*1024*1024'));
 assert.ok(script.includes('maxAttachmentTotalBytes=50*1024*1024'));
 assert.ok(script.includes("projectFiles.addEventListener('change'"));
 assert.ok(script.includes("picker.addEventListener('drop'"));
 assert.ok(script.includes("remove.addEventListener('click'"));
});
test('WhatsApp attachment workflow is honest: native share when available, manual fallback otherwise',()=>{
 assert.ok(script.includes("typeof navigator.canShare!=='function'"));
 assert.ok(script.includes("await navigator.share({"));
 assert.ok(script.includes("files:[...selectedProjectFiles]"));
 assert.ok(script.includes("window.open('https://wa.me/'+WHATSAPP"));
 assert.ok(script.includes('files have NOT been sent'));
 assert.ok(script.includes("redrawProjectFiles();\n    renderFeaturedProjects();"));
 assert.ok(!script.includes("fetch('/upload"));
 assert.ok(html.includes('الملفات لا تُرفق تلقائيًا بالرابط'));
});

test('fullscreen gallery supports original image links, zoom, arrows, swipe and keyboard',async()=>{
 const overlay=await fs.readFile(new URL('../lightbox.js',import.meta.url),'utf8');
 for(const id of ['image-lightbox','lightbox-image','lightbox-prev','lightbox-next','lightbox-close','lightbox-zoom'])
   assert.ok(html.includes('id="'+id+'"'));
 assert.ok(overlay.includes("a[data-full-image]"));
 assert.ok(overlay.includes("gallery.addEventListener('click'"));
 assert.ok(overlay.includes("scroll.addEventListener('touchstart'"));
 assert.ok(overlay.includes("scroll.addEventListener('touchend'"));
 assert.ok(overlay.includes("document.addEventListener('keydown'"));
 assert.ok(css.includes('.image-lightbox[hidden]{display:none}'));
 assert.ok(css.includes('.lightbox-scroll.zoomed img'));
});
test('owner can pin featured projects and author real case-study details',async()=>{
 const manager=await fs.readFile(new URL('../tools/manage-projects.js',import.meta.url),'utf8');
 const admin=await fs.readFile(new URL('../tools/manage-projects.html',import.meta.url),'utf8');
 assert.ok(controls.includes('cleanCaseStudy'));
 assert.ok(controls.includes('featured,caseStudies'));
 assert.ok(manager.includes("settings.featured.push(id)"));
 assert.ok(manager.includes('settings.caseStudies[id]=study'));
 for(const field of ['caseClient','caseRole','caseServices','caseDuration','caseChallenge','caseApproach','caseOutcome'])
  assert.ok(admin.includes('name="'+field+'"'));
 assert.ok(script.includes('featuredIDs.map'));
 assert.ok(script.includes('caseStudies[p.id]'));
 assert.ok(script.includes('class="case-facts"'));
 assert.ok(script.includes('class="case-study-details"'));
});
test('two-step client brief collects optional budget deadline and references safely',()=>{
 for(const id of ['brief-step-one','brief-step-two','brief-next','brief-back','client-email','project-budget','project-deadline'])
  assert.ok(html.includes('id="'+id+'"'));
 assert.ok(script.includes('function setBriefStep(step)'));
 assert.ok(script.includes("$('#brief-next').addEventListener('click'"));
 assert.ok(script.includes("$('#project-budget')"));
 assert.ok(script.includes("$('#project-deadline')"));
 assert.ok(script.includes('navigator.share'));
 assert.ok(css.includes('.brief-step[hidden]{display:none}'));
});

test('contact form remains usable and still sends via external WhatsApp link',()=>{
 assert.ok(html.includes('id="brief-form"'));
 for(const name of ['client-name','project-type','project-description'])assert.ok(html.includes(`id="${name}"`));
 assert.ok(script.includes("$('#brief-form').addEventListener('submit'"));
 assert.ok(script.includes('https://wa.me/'));
});
