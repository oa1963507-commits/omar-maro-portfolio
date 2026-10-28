import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {parseProfile,parseProject,mergeDetail,validImageUrl,synchronizeProvider,projectSlug} from '../scripts/sync-via-provider.mjs';
const id='254950791',user='oa19635079ead';
const url=`https://www.behance.net/gallery/${id}/drahmed-zakaria`;
const cdn='https://mir-s3-cdn-cf.behance.net/project_modules/disp/image254950791.png';
const profile={success:true,data:{username:user,projects:[{id:Number(id),title:'طبيب أحمد',cover_url:'https://mir-s3-cdn-cf.behance.net/projects/404/a.jpg',url}]}};
const detail={success:true,data:{id:Number(id),title:'طبيب أحمد',cover_url:'https://mir-s3-cdn-cf.behance.net/projects/808/a.jpg',url,owners:[{username:user}],description:{plain:'Brand design'},modules:[{position:3,type:'image',url:cdn},{position:2,type:'text',text:{plain:'مرحبا بكم'}},{position:1,type:'embed',url:'https://player.vimeo.com/video/123'}]}};
test('validates profile URL and identity, preserves Arabic',()=>{
 assert.equal(parseProfile(profile)[0].title,'طبيب أحمد');
 assert.throws(()=>parseProfile({...profile,data:{...profile.data,username:'other'}}));
 assert.throws(()=>parseProfile({...profile,data:{...profile.data,projects:[{id:254950791,url:'https://evil.test/gallery/254950791/a'}]}}));
});
test('reads ordered mixed project modules, not just cover',()=>{
 const p=parseProject(detail,id);
 assert.deepEqual(p.modules.map(x=>x.type),['embed','text','image']);
 assert.equal(p.images[0],cdn);
 assert.equal(p.modules[1].text,'مرحبا بكم');
 assert.equal(mergeDetail({title:'????',images:[]},parseProfile(profile)[0],p,new Date('2026-10-28')).title,'طبيب أحمد');
});
test('rejects unrelated image host, unexpected owner and project ID',()=>{
 assert.equal(validImageUrl('https://mir-s3-cdn-cf.behance.net.evil.test/project_modules/disp/a.jpg'),'');
 assert.throws(()=>parseProject(detail,'00000'));
 assert.throws(()=>parseProject({...detail,data:{...detail.data,owners:[{username:'other'}]}},id));
});
test('sync caches complete project modules to save API credits and preserves old data',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'omar-provider-'));
 try{
  const catalog=path.join(dir,'projects.json'),report=path.join(dir,'report.json');
  await fs.writeFile(catalog,JSON.stringify([{id:'omar-maro-identity',source:'original',title:'Original'}])+'\n');
  let calls=[];
  const fetchImpl=async(u)=>{calls.push(u);return {ok:true,json:async()=>u.includes('/user?')?profile:detail};};
  const args={key:'abcdefghijk',catalogPath:catalog,reportPath:report,fetchImpl,now:new Date('2026-10-28T10:00:00Z')};
  const first=await synchronizeProvider(args);
  assert.equal(first.imported,1);assert.equal(calls.length,2);
  assert.equal(first.with_modules,1);
  calls=[];
  const second=await synchronizeProvider({...args,now:new Date('2026-10-29T10:00:00Z')});
  assert.equal(second.imported,0);assert.equal(second.skipped,1);assert.equal(calls.length,1);
  const saved=JSON.parse(await fs.readFile(catalog,'utf8'));
  assert.equal(saved.length,2);
  assert.equal(saved[0].title,'Original');
  assert.equal(saved[1].modules.length,3);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('extracts only the verified slug for the expected Behance project',()=>{
 assert.equal(projectSlug(url,id),'drahmed-zakaria');
 assert.equal(projectSlug('https://www.behance.net/gallery/254950629/drsara',id),'');
 assert.equal(projectSlug('https://fake.test/gallery/254950791/unsafe',id),'');
});
test('retries an incomplete ID-only response with the public project slug',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'omar-provider-retry-'));
 try {
  const catalog=path.join(dir,'projects.json'),report=path.join(dir,'status.json');
  await fs.writeFile(catalog,'[]\n');
  const paths=[];
  const fetchImpl=async(request)=>{
   const pathName=new URL(request).pathname+new URL(request).search;
   paths.push(pathName);
   const response=pathName.includes('/user?')?profile:
      pathName.includes('&slug=')?detail:
      {success:true,data:{id:Number(id),title:'طبيب أحمد'}};
   return {ok:true,json:async()=>response};
  };
  const outcome=await synchronizeProvider({key:'abcdefghijk',fetchImpl,catalogPath:catalog,reportPath:report});
  assert.equal(outcome.imported,1);
  assert.equal(outcome.with_modules,1);
  assert.equal(paths.length,3);
  assert.match(paths[2],/slug=drahmed-zakaria/);
  const saved=JSON.parse(await fs.readFile(catalog,'utf8'));
  assert.equal(saved[0].modules.length,3);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
