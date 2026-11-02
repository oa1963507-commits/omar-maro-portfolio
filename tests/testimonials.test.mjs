import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import Controls from '../controls.js';

const read=p=>fs.readFile(new URL('../'+p,import.meta.url),'utf8');
const [app,index,admin,manager,css,workflow,config,worker]=await Promise.all([
 read('app.js'),read('index.html'),read('tools/manage-projects.html'),
 read('tools/manage-projects.js'),read('testimonials.css'),
 read('.github/workflows/deploy-pages.yml'),read('data/site-controls.json'),
 read('service-worker.js')
]);
const renderSource=app.slice(app.indexOf('  function renderTestimonials()'),app.indexOf('  async function loadProjects()'));
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function simulate(stories,projects=[]){
 const section={hidden:true},grid={innerHTML:'old',replaceChildren(){this.innerHTML=''}};
 const fn=new Function('$','clientStories','projects','isEnglish','t','escapeHTML','projectHref',
   renderSource+'\nreturn renderTestimonials;')(
   sel=>sel==='#testimonials'?section:sel==='#testimonials-grid'?grid:null,
   stories,projects,()=>false,(ar,en)=>ar,escapeHTML,p=>'projects/'+encodeURIComponent(p.id)+'/'
 );
 fn();
 return {section,grid};
}
const sample={id:'review-real-001',brand:'Approved Brand',quote:'Great work on our project.',
 projectId:'behance-12345',image:'https://example.org/project.jpg',
 consent:true,imageConsent:true,approved:true};

test('testimonials default to empty and never seed fake customer feedback',()=>{
 const saved=JSON.parse(config);
 assert.ok(!saved.testimonials||saved.testimonials.length===0);
 assert.deepEqual(Controls.normalizeControls({}).testimonials,[]);
 const view=simulate([]);
 assert.equal(view.section.hidden,true);
 assert.equal(view.grid.innerHTML,'');
 assert.match(index,/id="testimonials"[^>]*hidden/);
});
test('consent and publication approval are both needed; image needs separate consent',()=>{
 const noConsent=Controls.normalizeControls({testimonials:[{...sample,consent:false}]}).testimonials;
 assert.equal(simulate(noConsent).section.hidden,true);
 const unapproved=Controls.normalizeControls({testimonials:[{...sample,approved:false}]}).testimonials;
 assert.equal(simulate(unapproved).section.hidden,true);
 const noPhoto=Controls.normalizeControls({testimonials:[{...sample,imageConsent:false}]}).testimonials;
 assert.equal(noPhoto[0].image,'');
 const visible=simulate(noPhoto);
 assert.equal(visible.section.hidden,false);
 assert.match(visible.grid.innerHTML,/Approved Brand/);
 assert.doesNotMatch(visible.grid.innerHTML,/<img /);
 const image=simulate(Controls.normalizeControls({testimonials:[sample]}).testimonials);
 assert.match(image.grid.innerHTML,/<img /);
});
test('unsafe inputs are escaped, unsafe media and duplicate IDs are removed',()=>{
 const clean=Controls.normalizeControls({testimonials:[
  {...sample,quote:'<script>evil()</script>',image:'javascript:alert(1)'},
  {...sample,brand:'Dup'},
  {...sample,id:'bad',brand:'Invalid'},
 ]}).testimonials;
 assert.equal(clean.length,1);
 assert.equal(clean[0].image,'');
 const result=simulate(clean).grid.innerHTML;
 assert.doesNotMatch(result,/<script>/);
 assert.match(result,/&lt;script&gt;/);
});
test('related project links are shown only for visible projects',()=>{
 const prepared=Controls.normalizeControls({testimonials:[sample]}).testimonials;
 const hidden=simulate(prepared);
 assert.doesNotMatch(hidden.grid.innerHTML,/class="testimonial-project"/);
 const shown=simulate(prepared,[{id:'behance-12345'}]);
 assert.match(shown.grid.innerHTML,/href="projects\/behance-12345\/"/);
});
test('admin lets owner edit, reorder, remove, approve and document separate image permission',()=>{
 for(const name of ['testimonialForm','testimonialsAdminList','testimonialProject','saveTestimonial','resetTestimonial'])
   assert.match(admin,new RegExp('id="'+name+'"'));
 for(const name of ['brand','brand_en','quote','quote_en','image','projectId','consent','imageConsent','approved','useProjectCover'])
   assert.match(admin,new RegExp('name="'+name+'"'));
 assert.match(manager,/function renderTestimonialAdmin\(\)/);
 assert.match(manager,/function resetTestimonialForm\(\)/);
 assert.match(manager,/if\(approved&&!consent\)/);
 assert.match(manager,/if\(image&&!imageConsent\)/);
 assert.match(manager,/controls\.cleanTestimonial/);
 assert.match(manager,/settings\.testimonials\.push\(item\)/);
 assert.match(manager,/records\.splice\(index,1\)/);
 assert.match(manager,/const clean=controls\.normalizeControls\(settings\)/);
 assert.match(manager,/textContent=review\.quote/);
 assert.match(admin,/موافقة منفصلة/);
 assert.match(css,/@media\(max-width:690px\)/);
});
test('testimonials are in bilingual site CMS and loaded as refreshed PWA assets',()=>{
 const cms=await read('site-cms.js');
 assert.match(cms,/\['testimonials','آراء العملاء وتجارب المشاريع','#testimonials'\]/);
 assert.match(index,/testimonials\.css\?v=testimonials-20261102/);
 assert.match(index,/app\.js\?v=client-stories-20261102/);
 assert.match(app,/renderTestimonials\(\);route\(\)/);
 assert.match(app,/renderTestimonials\(\);\s*const layer/);
 assert.match(worker,/BASE\+'testimonials\.css'/);
 assert.match(workflow,/tests\/testimonials\.test\.mjs/);
});
