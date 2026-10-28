import test from 'node:test';
import assert from 'node:assert/strict';
import {originalModuleUrl,moduleUrlsFromHtml,preserveProject} from '../scripts/import-project-details.mjs';

test('full source replaces project image thumbnails but keeps hash',()=>{
  assert.equal(originalModuleUrl('https://mir-s3-cdn-cf.behance.net/project_modules/max_1200/abc123.png'), 'https://mir-s3-cdn-cf.behance.net/project_modules/source/abc123.png');
  assert.equal(originalModuleUrl('https://other-site.com/project_modules/max_1200/abc.png'),'');
});
test('collects all distinct project modules preserving order, without cover images',()=>{
  const html='<img src="https://mir-s3-cdn-cf.behance.net/projects/404/thumb.jpg"><img src="https://mir-s3-cdn-cf.behance.net/project_modules/max_1200/first.png"><img src="https://mir-s3-cdn-cf.behance.net/project_modules/fs/second.jpg"><img src="https://mir-s3-cdn-cf.behance.net/project_modules/max_158/first.png">';
  assert.deepEqual(moduleUrlsFromHtml(html), ['https://mir-s3-cdn-cf.behance.net/project_modules/source/first.png','https://mir-s3-cdn-cf.behance.net/project_modules/source/second.jpg']);
});
test('does not wipe previous images on failed load',()=>{
  const old={title:'Original',images:['https://test.com/old.jpg'],story:'hello'};
  assert.deepEqual(preserveProject(old,{title:'new',images:[]}),old);
});
test('replaces broken placeholder title only when a new real one is available',()=>{
  const old={title:'????',images:[]};
  assert.equal(preserveProject(old,{title:'عنوان المشروع',images:['https://test.com/1.jpg']}).title,'عنوان المشروع');
});

import {checkImageUrl, extractImageVariants, extractMetadataTitle} from '../scripts/import-project-details.mjs';
test('decodes serialized Behance module URLs and excludes related project thumbnails',()=>{
 const s=String.raw`{\"x\":\"https:\/\/mir-s3-cdn-cf.behance.net\/project_modules\/fs\/def254950791.abc.png\", \"r\":\"https://mir-s3-cdn-cf.behance.net/projects/404/another.png\"}`;
 assert.deepEqual(moduleUrlsFromHtml(s,'254950791'),['https://mir-s3-cdn-cf.behance.net/project_modules/source/def254950791.abc.png']);
});
test('fails safe for unrelated image providers',()=>{
 assert.equal(originalModuleUrl('https://behance.net.evil.com/project_modules/source/1.jpg'),'');
 assert.deepEqual(extractImageVariants('https://evil.com/project_modules/source/1.jpg'),[]);
});
test('checks CDN source then falls back to known working fs image',async()=>{
 const attempts=[];
 const out=await checkImageUrl('https://mir-s3-cdn-cf.behance.net/project_modules/max_1200/abc.png',async (url)=>{
  attempts.push(url);
  return {ok:url.includes('/fs/'),headers:{get:()=> 'image/png'}};
 });
 assert.equal(out.url,'https://mir-s3-cdn-cf.behance.net/project_modules/fs/abc.png');
 assert.equal(out.verified,true);
 assert.equal(attempts.length,2);
});
test('Behance title from meta tag handles Arabic unicode',()=>{
 assert.equal(extractMetadataTitle('<meta property="og:title" content="تصميم كتاب :: Behance">'),'تصميم كتاب');
});
import {createPublicBrowser} from '../scripts/import-project-details.mjs';

test('awaits chromium.launch before using newContext, and returns a real Browser',async()=>{
  const fakeBrowser={newContext:async()=>({}),close:async()=>{}};
  const launched=await createPublicBrowser({
    playwrightLoader:async()=>({chromium:{launch:async options=>{
      assert.equal(options.headless,true);
      return fakeBrowser;
    }}})
  });
  assert.equal(launched,fakeBrowser);
  assert.equal(typeof launched.newContext,'function');
});

test('rejects a Promise-shaped or malformed browser result',async()=>{
  await assert.rejects(
    ()=>createPublicBrowser({browserFactory:async()=>({close:async()=>{}})}),
    /Browser instance/
  );
});
