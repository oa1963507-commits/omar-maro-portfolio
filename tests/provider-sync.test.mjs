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


test('catalog merges 28 verified public URLs without repeating the initial first projects',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'omar-profile28-'));
 try{
  const catalog=path.join(dir,'projects.json'),report=path.join(dir,'report.json');
  await fs.writeFile(catalog,'[]\n');
  const ids=[id,...Array.from({length:27},(_,i)=>String(300000000+i))];
  const discovery=ids.map(i=>({id:i,url:`https://www.behance.net/gallery/${i}/My-Design`,title:`Design ${i}`,cover:cdn}));
  let detailCalls=0;
  const fetchImpl=async (url)=>{
   if(url.includes('/user?'))return {ok:true,json:async()=>profile};
   detailCalls++;
   const projectID=new URL(url).searchParams.get('id');
   return {ok:true,json:async()=>({success:true,data:{id:Number(projectID),title:'Project',url:`https://www.behance.net/gallery/${projectID}/My-Design`,owners:[{username:user}],modules:[{position:1,type:'image',url:cdn}]}})};
  };
  const result=await synchronizeProvider({key:'scrappa-test-key',knownProjects:discovery.map(x=>x.url),fetchImpl,catalogPath:catalog,reportPath:report,now:new Date('2026-10-28T20:00:00Z')});
  assert.equal(result.catalog_projects,28);
  assert.equal(result.missing_from_minimum,0);
  assert.equal(result.added_from_known,27);
  assert.equal(detailCalls,28);
  const saved=JSON.parse(await fs.readFile(catalog,'utf8'));
  assert.equal(new Set(saved.map(x=>x.id)).size,28);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});

test('preserves owner browser images against truncated provider refresh',()=>{
 const originalImages=Array.from({length:12},(_,i)=>`https://mir-s3-cdn-cf.behance.net/project_modules/disp/module${i}254950791.png`);
 const old={title:'Project',images:originalImages,modules:originalImages.map(url=>({type:'image',url})),image_quality:'browser-visible-module-cdn'};
 const parsed=parseProject(detail,id);
 const merged=mergeDetail(old,parseProfile(profile)[0],parsed,new Date('2026-10-29T00:00:00Z'));
 assert.equal(merged.images.length,12);
 assert.equal(merged.modules.length,12);
 assert.equal(merged.image_quality,'browser-visible-module-cdn');
});
test('backs off failed project details to avoid consuming monthly free API credits',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'omar-free-backoff-'));
 try{
  const catalog=path.join(dir,'projects.json'),report=path.join(dir,'report.json');
  await fs.writeFile(catalog,JSON.stringify([{id:'behance-'+id,behance_id:id,source:'behance',title:'Example',url,images:[],modules:[],provider_retry_at:'2026-11-15T00:00:00Z'}])+'\n');
  let calls=0;
  const fetchImpl=async(u)=>{calls++;return {ok:true,json:async()=>profile};};
  const result=await synchronizeProvider({key:'test-key-valid',knownProjects:[],fetchImpl,catalogPath:catalog,reportPath:report,now:new Date('2026-10-29T00:00:00Z')});
  assert.equal(result.skipped,1);
  assert.equal(result.failed,0);
  assert.equal(calls,1);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});

test('discovers a newly published Behance project on the next scheduled profile check',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'omar-auto-publish-'));
 try {
  const catalog=path.join(dir,'projects.json'),report=path.join(dir,'report.json');
  await fs.writeFile(catalog,JSON.stringify([{id:'behance-'+id,behance_id:id,source:'behance',title:'Existing',url,cover:cdn,images:[cdn],modules:[{type:'image',url:cdn}],full_project_synced:true,provider_checked_at:'2026-10-28T00:00:00Z'}])+'\n');
  const newID='300012345',newUrl='https://www.behance.net/gallery/300012345/New-Brand';
  let requested=0;
  const fetchImpl=async(request)=>{
   requested++;
   if(request.includes('/user?'))return {ok:true,json:async()=>({success:true,data:{username:user,projects:[
      {id:Number(newID),title:'New Brand',url:newUrl,cover_url:cdn},
      {id:Number(id),title:'Existing',url,cover_url:cdn}
   ]}})};
   const projectID=new URL(request).searchParams.get('id');
   return {ok:true,json:async()=>({success:true,data:{
       id:Number(projectID),title:'New Brand',url:newUrl,cover_url:cdn,
       owners:[{username:user}],modules:[{type:'image',url:cdn,position:1}]
   }})};
  };
  const result=await synchronizeProvider({key:'valid-test-key',knownProjects:[],fetchImpl,catalogPath:catalog,reportPath:report,now:new Date('2026-10-29T00:00:00Z')});
  assert.equal(result.imported,1);
  assert.equal(result.skipped,1);
  assert.equal(requested,2);
  const saved=JSON.parse(await fs.readFile(catalog,'utf8'));
  assert.equal(saved.filter(x=>x.source==='behance').length,2);
  const fresh=saved.find(x=>x.behance_id===newID);
  assert.equal(fresh.title,'New Brand');
  assert.equal(fresh.images.length,1);
  assert.equal(fresh.modules.length,1);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
