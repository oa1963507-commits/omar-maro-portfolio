import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const read=path=>fs.readFile(new URL('../'+path,import.meta.url),'utf8');
const [app,html,css,mobile,workflow]=await Promise.all([
  read('app.js'),read('index.html'),read('project-actions.css'),
  read('mobile.css'),read('.github/workflows/deploy-pages.yml')
]);
const cardSection=app.slice(app.indexOf('  function projectCard('),app.indexOf('  function renderFeaturedProjects()'));
function renderCard(liked=false){
 const src=cardSection+'\nreturn projectCard({id:"sample-branding",title:"Creative branding",title_en:"Creative branding",category_label:"Branding",year:"2026",category:"branding",cover:"assets/omar-cover.jpg"},2);';
 const build=new Function('displayTitle','displayCategory','qualityImage','escapeHTML','t','likedProjects','isLatinTitle','shareIcon','likeIcon','projectHref',src);
 return build(
  p=>p.title,p=>p.category_label,(src)=>'<img src="'+src+'" alt="Creative branding">',
  x=>String(x).replaceAll('&','&amp;').replaceAll('"','&quot;'),
  (ar)=>ar,new Set(liked?['sample-branding']:[]),
  ()=>true,'<svg aria-hidden="true"></svg>','<svg aria-hidden="true"></svg>',
  p=>'projects/'+encodeURIComponent(p.id)+'/'
 );
}
test('project card contains distinct view, share, and like actions with valid structure',()=>{
 const card=renderCard();
 assert.match(card,/^<article class="project-card reveal">/);
 assert.match(card,/class="project-card-visual"/);
 assert.match(card,/class="project-info-main"/);
 assert.match(card,/class="project-card-actions"/);
 assert.match(card,/class="project-arrow"/);
 assert.match(card,/data-card-share="sample-branding"/);
 assert.match(card,/data-card-like="sample-branding"/);
 assert.match(card,/aria-pressed="false"/);
 assert.equal((card.match(/<button\b/g)||[]).length,2);
 assert.equal((card.match(/<a\b/g)||[]).length,3);
 for(const match of card.matchAll(/<a\b[\s\S]*?<\/a>/g))assert.doesNotMatch(match[0],/<button\b/,'buttons must not be nested inside links');
 assert.match(card,/href="projects\/sample-branding\/"/);
});
test('liked cards render a pressed, filled heart state; like is private to visitor browser',()=>{
 const liked=renderCard(true);
 assert.match(liked,/class="project-action project-like-action is-liked"/);
 assert.match(liked,/aria-pressed="true"/);
 assert.match(app,/localStorage\.getItem\(likeStorageKey\)/);
 assert.match(app,/localStorage\.setItem\(likeStorageKey/);
 assert.match(app,/likedProjects\.delete\(id\)/);
 assert.match(app,/button\.setAttribute\('aria-pressed',String\(liked\)\)/);
 assert.match(app,/تم حفظ إعجابك على هذا الجهاز/);
 assert.doesNotMatch(app,/globalLikeCount|serverLikeCount/);
});
test('sharing uses each project permalink and supports share sheets, clipboard and fallback',()=>{
 assert.match(app,/new URL\(projectHref\(project\),new URL\('\.\/',location\.href\)\)\.href/);
 assert.match(app,/navigator\.share\(\{title:displayTitle\(project\),url\}\)/);
 assert.match(app,/err\?\.name==='AbortError'/);
 assert.match(app,/navigator\.clipboard\.writeText\(url\)/);
 assert.match(app,/window\.prompt\(t\('انسخ رابط المشروع:'/);
 assert.match(app,/a\.project-card-visual,a\.project-info-main,a\.project-arrow,a\.showcase-card/);
 assert.match(app,/document\.addEventListener\('click',async event/);
});
test('actions are accessible, bilingual, mobile-ready, and preserve original gallery',()=>{
 assert.match(html,/project-actions\.css\?v=actions-20261101/);
 assert.match(html,/app\.js\?v=project-actions-20261101/);
 assert.match(html,/id="projects-grid"/);
 assert.match(html,/id="hero-featured"/);
 assert.match(css,/\.project-card-actions\{/);
 assert.match(css,/\.project-action\.is-liked svg\{fill:currentColor/);
 assert.match(css,/@media\(max-width:690px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/role|focus-visible/);
 assert.match(app,/aria-label="\$\{shareLabel\}"/);
 assert.match(app,/aria-pressed="\$\{liked\}"/);
 assert.match(app,/setAttribute\('aria-live','polite'\)/);
 assert.match(mobile,/\.project-info\{height:auto/);
 assert.match(workflow,/tests\/project-card-actions\.test\.mjs/);
});
