import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(join(root,p),'utf8');
const catalog=JSON.parse(read('data/projects.json'));
const controls=JSON.parse(read('data/site-controls.json'));
const html=read('index.html');
const admin=read('tools/manage-projects.html');
const excluded=new Set([...(controls.hidden||[]),...(controls.excluded||[])]);
const visible=[...catalog,...(controls.customProjects||[])].filter(p=>!excluded.has(p.id));
const sitemap=read('sitemap.xml');

test('all visible projects retain static gallery and crawlable case studies',()=>{
 assert.equal((html.match(/class="project-card"/g)||[]).length,visible.length);
 for(const p of visible){
  const relative='projects/'+p.id+'/';
  assert.ok(html.includes('href="'+relative+'"'),relative+' is missing in fallback gallery');
  assert.ok(existsSync(join(root,relative,'index.html')),relative+' case-study page missing');
  const page=read(relative+'index.html');
  assert.ok(page.includes('rel="canonical"')&&page.includes('CreativeWork'),relative+' lacks SEO metadata');
  assert.ok(sitemap.includes(relative),relative+' missing from sitemap');
 }
});
test('hidden and excluded work is never indexed in sitemap',()=>{
 for(const id of excluded)assert.ok(!sitemap.includes('projects/'+id+'/'));
});
test('scripts parse without a gallery startup crash',()=>{
 for(const f of ['app.js','i18n.js','controls.js','lightbox.js','tools/manage-projects.js'])
  assert.doesNotThrow(()=>new Function(read(f)),f);
 assert.ok(read('app.js').includes("$$('.filter').forEach"),'Gallery filter must iterate all buttons');
});
test('new controls exist and project contact keeps its WhatsApp workflow',()=>{
 for(const id of ['portfolio-search-input','client-phone','project-reference','project-priority','brief-submit-status'])
  assert.ok(html.includes('id="'+id+'"'),id+' missing');
 for(const id of ['backupBtn','featuredSummary'])assert.ok(admin.includes('id="'+id+'"'),id+' missing');
 assert.ok(read('app.js').includes('wa.me/'),'WhatsApp flow missing');
});
