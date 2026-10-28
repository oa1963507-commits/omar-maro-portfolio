import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeBrowserExport,validateBrowserProject} from '../scripts/import-browser-export.mjs';
const id='230185763';
const url=`https://www.behance.net/gallery/${id}/omars-portfolio`;
const image=n=>`https://mir-s3-cdn-cf.behance.net/project_modules/disp/a${n}${id}.abcde.jpg`;
const original={id:'behance-'+id,source:'behance',behance_id:id,title:'omars portfolio',title_source:'url-slug',images:[],modules:[],cover:'',url};
const data=projects=>({format:'omar-maro-behance-public-media-v1',profile:'oa19635079ead',projects});
test('accepts only known project IDs and allowed image hosts',()=>{
 const valid=validateBrowserProject({id,url,title:'Omar Portfolio',images:[image(1),image(2),'https://evil.test/project_modules/disp/file.jpg']},new Set([id]));
 assert.equal(valid.images.length,2);
 assert.equal(validateBrowserProject({id:'not-known',url,images:[]},new Set([id])),null);
});
test('imports multi-image public gallery without losing previous unrelated data',()=>{
 const other={id:'omar-maro-identity',source:'original',title:'Omar'};
 const r=mergeBrowserExport([other,original],data([{id,url,title:'Portfolio OMAR',images:[image(1),image(2),image(1)]}]));
 assert.equal(r.catalog.length,2);
 assert.equal(r.catalog[1].images.length,2);
 assert.equal(r.catalog[1].title,'Portfolio OMAR');
 assert.equal(r.catalog[0],other);
 assert.equal(r.summary.updated,1);
});
test('does not replace existing 15-image gallery with truncated capture',()=>{
 const prior={...original,images:Array.from({length:15},(_,i)=>image(i)),modules:Array.from({length:15},(_,i)=>({type:'image',url:image(i)}))};
 const r=mergeBrowserExport([prior],data([{id,url,images:[image(1)]}]));
 assert.deepEqual(r.catalog[0],prior);
 assert.equal(r.summary.updated,0);
});
test('rejects unrelated projects and exported text as executable content',()=>{
 const r=mergeBrowserExport([original],data([{id:'999999999',url:'https://www.behance.net/gallery/999999999/test',images:[image(1)]},{id,url,title:'<script>alert(1)</script>',images:[image(1)]}]));
 assert.equal(r.catalog[0].images.length,1);
 assert.ok(!r.catalog[0].title.includes('<'));
});

test('preserves existing text module position between images',()=>{
 const prior={...original,images:[image(1),image(2)],modules:[{type:'image',url:image(1)},{type:'text',text:'Design process'},{type:'image',url:image(2)}]};
 const r=mergeBrowserExport([prior],data([{id,url,images:[image(3),image(4),image(5)]}]));
 assert.deepEqual(r.catalog[0].modules.map(x=>x.type),['image','text','image','image']);
 assert.equal(r.catalog[0].modules[1].text,'Design process');
});