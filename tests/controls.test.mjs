import test from 'node:test';
import assert from 'node:assert/strict';
import Controls from '../controls.js';
const p=(id,title)=>({id,title,source:'behance',images:['https://mir-s3-cdn-cf.behance.net/project_modules/hd/image.jpg']});
test('orders projects and preserves new automatic imports',()=>{
 const list=[p('behance-1','A'),p('behance-2','B'),p('behance-3','New')];
 const result=Controls.applyControls(list,{order:['behance-2','behance-1']});
 assert.deepEqual(result.map(x=>x.id),['behance-2','behance-1','behance-3']);
});
test('hidden and deleted projects remain suppressed after source sync adds them back',()=>{
 const cfg={hidden:['behance-1'],excluded:['behance-2']};
 assert.deepEqual(Controls.applyControls([p('behance-1','A'),p('behance-2','B'),p('behance-3','C')],cfg).map(x=>x.id),['behance-3']);
});
test('editable cover and title survive source updates',()=>{
 const cfg={overrides:{'behance-1':{title:'My new title',cover:'https://example.org/cover.jpg',category:'covers'}}};
 const result=Controls.applyControls([p('behance-1','Overwritten by Behance')],cfg);
 assert.equal(result[0].title,'My new title');assert.equal(result[0].category,'covers');
});
test('custom projects have real gallery and support hide/show',()=>{
 const custom={id:'manual-test123',title:'Design A',category:'branding',images:['https://example.org/1.jpg','https://example.org/2.jpg'],cover:'https://example.org/1.jpg'};
 assert.equal(Controls.applyControls([], {customProjects:[custom]})[0].modules.length,2);
 assert.equal(Controls.applyControls([], {customProjects:[custom],hidden:['manual-test123']}).length,0);
});
test('normalization rejects unsafe URL schemes and duplicate project IDs',()=>{
 const c=Controls.normalizeControls({order:['behance-1','behance-1'],customProjects:[{id:'manual-safe',title:'Safe',images:['javascript:alert(1)','https://example.org/x.jpg']},{id:'manual-safe',title:'Double'}],overrides:{'behance-1':{cover:'javascript:alert(1)'}}});
 assert.deepEqual(c.order,['behance-1']);assert.equal(c.customProjects.length,1);assert.equal(c.customProjects[0].images.length,1);assert.equal(c.overrides['behance-1'].cover,'');
});
test('explicit featured selections are capped and owner order is preserved',()=>{
 const cfg=Controls.normalizeControls({featured:['behance-2','behance-1','behance-3','behance-4','behance-2']});
 assert.deepEqual(cfg.featured,['behance-2','behance-1','behance-3']);
});
test('Case Study sanitization retains real details but trims unsafe overflow',()=>{
 const cfg=Controls.normalizeControls({caseStudies:{'behance-1':{
 client:'  A client  ',role:'Designer',services:'Identity / Print',
 duration:'3 weeks',challenge:'x'.repeat(1600),approach:'Research / sketches',outcome:'Delivered visual identity'
 },'bad/id':{client:'Unwanted'}}});
 assert.equal(cfg.caseStudies['behance-1'].client,'A client');
 assert.equal(cfg.caseStudies['behance-1'].challenge.length,1400);
 assert.equal(cfg.caseStudies['behance-1'].outcome,'Delivered visual identity');
 assert.ok(!cfg.caseStudies['bad/id']);
});
