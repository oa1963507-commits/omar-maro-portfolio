import test from 'node:test';
import assert from 'node:assert/strict';
import {parseApifyProjectIndex,discoverApifyProjects} from '../scripts/discover-apify.mjs';

const username='oa19635079ead';
const project=(n,owner=username)=>({type:'project',id:n,url:`https://www.behance.net/gallery/${n}/Example`,ownerUsername:owner,title:`Project ${n}`,coverImageUrl:'https://mir-s3-cdn-cf.behance.net/projects/808/a.jpg'});

test('second provider validates owner, removes duplicates, and rejects impostor projects',()=>{
 const list=[{type:'profile',username},project(12345),project(12345),project(23456,'other'),project(34567),{...project(45678),url:'https://evil.test/gallery/45678/Fake'}];
 const result=parseApifyProjectIndex(list);
 assert.deepEqual(result.map(p=>p.id),['12345','34567']);
});
test('second provider explicitly requests more than default 12 projects, and uses auth header',async()=>{
 let captured;
 const result=await discoverApifyProjects({token:'test-apify-secret-value',fetchImpl:async (url,options)=>{
   captured={url,options};return {ok:true,json:async()=>Array.from({length:28},(_,i)=>project(10000+i))};
 }});
 assert.equal(result.length,28);
 assert.equal(captured.options.method,'POST');
 assert.equal(JSON.parse(captured.options.body).maxProjectsPerProfile,100);
 assert.equal(JSON.parse(captured.options.body).profileUrls[0],`https://www.behance.net/${username}`);
 assert.equal(captured.options.headers.Authorization,'Bearer test-apify-secret-value');
 assert.equal(captured.url.includes('test-apify-secret-value'),false);
});
test('handles invalid dataset without polluting catalog',()=>{
 assert.throws(()=>parseApifyProjectIndex({data:[]}));
 assert.throws(()=>parseApifyProjectIndex([project(12345,'somebodyelse')]));
});