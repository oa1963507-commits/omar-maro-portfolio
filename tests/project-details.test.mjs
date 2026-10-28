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