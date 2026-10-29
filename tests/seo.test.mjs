import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {normalizeControls,applyControls}=require('../controls.js');
const get=relative=>fs.readFile(new URL('../'+relative,import.meta.url),'utf8');
const [catalog,rawConfig,home,sitemap,robots]=await Promise.all([
get('data/projects.json').then(JSON.parse),get('data/site-controls.json').then(JSON.parse),
get('index.html'),get('sitemap.xml'),get('robots.txt')
]);
const config=normalizeControls(rawConfig),visible=applyControls(catalog,config);
test('generated project pages include only visible owner-approved work',async()=>{
const urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
assert.equal(urls.length,visible.length+1);
for(const p of visible){
 const content=await get('projects/'+p.id+'/index.html');
 assert.ok(content.includes('<link rel="canonical"'));
 assert.ok(content.includes('application/ld+json'));
 assert.ok(content.includes('og:image'));
 assert.ok(content.includes('loading="lazy"')||!p.images?.length);
 assert.ok(urls.includes('https://oa1963507-commits.github.io/omar-maro-portfolio/projects/'+p.id+'/'));
}
for(const id of config.excluded)assert.ok(!urls.some(url=>url.endsWith('/projects/'+id+'/')));
for(const id of config.hidden)assert.ok(!urls.some(url=>url.endsWith('/projects/'+id+'/')));
});
test('homepage social metadata and robots expose stable crawlable canonical URLs',()=>{
assert.ok(home.includes('rel="canonical"'));
assert.ok(home.includes('https://oa1963507-commits.github.io/omar-maro-portfolio/assets/omar-cover.jpg'));
assert.ok(home.includes('"@type":"Person"'));
assert.ok(robots.includes('sitemap.xml'));
assert.ok(sitemap.includes('www.sitemaps.org/schemas/sitemap/0.9'));
});
test('saved featured and case study settings are optional and validated',()=>{
assert.ok(Array.isArray(config.featured));
assert.ok(config.featured.length<=3);
assert.ok(config.caseStudies&&typeof config.caseStudies==='object');
});
