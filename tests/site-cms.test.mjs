import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
await import('../site-cms.js');
const cms=globalThis.OMSiteCMS;
const get=path=>fs.readFile(new URL('../'+path,import.meta.url),'utf8');
test('site editor supports all public sections including header and footer',()=>{
 assert.equal(cms.sections.length,10);
 assert.ok(cms.sections.some(x=>x[0]==='contact'));
 assert.ok(cms.sections.some(x=>x[0]==='header'));
});
test('owner text in Arabic and English remains plain text',()=>{
 const result=cms.normalize({text:{'home.text.3':{ar:'<script>alert(1)</script>',en:'Home'},'bad':{ar:'x'}}});
 assert.equal(result.text['home.text.3'].ar,'<script>alert(1)</script>');
 assert.ok(!result.text.bad);
});
test('dangerous links, HTML and non HTTPS image sources are never accepted',()=>{
 for(const bad of ['javascript:alert(1)','data:text/html,x','//example.net','http://example.com','../secret','<svg>']){
  assert.equal(cms.validURL(bad,'href'),'');
  assert.equal(cms.validURL(bad,'src'),'');
 }
 assert.equal(cms.validURL('#contact','href'),'#contact');
 assert.equal(cms.validURL('assets/uploads/site-media/photo.png','src'),'assets/uploads/site-media/photo.png');
});
test('custom buttons honor allowed sections and safe URLs',()=>{
 const x=cms.normalize({buttons:[
  {id:'btn-12345',section:'services',ar:'احجز الآن',en:'Book now',href:'#contact',variant:'outline'},
  {id:'bad',section:'services',ar:'bad',href:'javascript:alert(1)'},
  {section:'unknown',ar:'bad',href:'#contact'}
 ]});
 assert.equal(x.buttons.length,1);
 assert.equal(x.buttons[0].variant,'outline');
});
test('existing project data and Google verification remain untouched',async()=>{
 const index=await get('index.html');
 const admin=await get('tools/manage-projects.html');
 const controls=await get('controls.js');
 const build=await get('scripts/build-seo.mjs');
 assert.ok(index.includes('src="site-cms.js?'));
 assert.ok(admin.includes('id="site-management-panel"'));
 assert.ok(admin.includes('id="cmsButtonForm"'));
 assert.ok(admin.includes('name="title_en"'));
 assert.ok(controls.includes('siteContent:'));
 assert.ok(build.includes('ownerSEO'));
 assert.equal((await get('googleeac26c4cf98df9fc.html')).trim(),'google-site-verification: googleeac26c4cf98df9fc.html');
});
