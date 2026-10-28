/** Import a user-approved, local-browser capture of PUBLIC Behance project images.
 * Never executes HTML or JavaScript from the exported JSON; validates project identity
 * and CDN allowlist; keeps existing image galleries if new capture is incomplete. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const CATALOG_PATH=path.join(repoRoot,'data/projects.json');
const cdns=new Set(['mir-s3-cdn-cf.behance.net','mir-cdn.behance.net','mir-s3-cdn.behance.net']);
const idRx=/^\d{3,18}$/;

export function validateBrowserProject(raw,knownIDs){
  const id=String(raw?.id??'');
  if(!idRx.test(id)||!knownIDs.has(id))return null;
  const url=new URL(raw?.url||'https://invalid.example');
  if(url.protocol!=='https:'||url.hostname!=='www.behance.net'||url.pathname.split('/')[2]!==id||url.pathname.split('/')[1]!=='gallery')return null;
  const seen=new Set(),images=[];
  for(const item of Array.isArray(raw.images)?raw.images.slice(0,350):[]){
    try {
      const uri=new URL(item);
      if(uri.protocol!=='https:'||!cdns.has(uri.hostname)||!/^\/project_modules\/[\w-]+\/[^/]+\.(?:png|jpe?g|webp|gif)$/i.test(uri.pathname))continue;
      const filename=uri.pathname.split('/').pop().split('.')[0];
      if(!filename.includes(id))continue;
      const key=uri.pathname.split('/').slice(3).join('/');
      if(seen.has(key))continue;
      uri.search='';uri.hash='';seen.add(key);images.push(uri.href);
    }catch{}
  }
  const title=String(raw.title||'').replace(/[<>]/g,'').trim().slice(0,180);
  return {id,title,url:url.href,images};
}

export function mergeBrowserExport(catalog,input){
  if(!Array.isArray(catalog)||input?.format!=='omar-maro-behance-public-media-v1'||input?.profile!=='oa19635079ead'||!Array.isArray(input?.projects)) throw Error('Unexpected public project export format');
  const knownIDs=new Set(catalog.filter(p=>p.source==='behance').map(p=>String(p.behance_id)));
  const byId=new Map();
  for(const raw of input.projects){
    let valid;try{valid=validateBrowserProject(raw,knownIDs);}catch{valid=null;}
    if(valid&&(!byId.has(valid.id)||valid.images.length>byId.get(valid.id).images.length))byId.set(valid.id,valid);
  }
  let updated=0, retained=0;
  const merged=catalog.map(old=>{
    const incoming=byId.get(String(old.behance_id||''));
    if(!incoming||!incoming.images.length){retained++;return old;}
    const previous=old.modules?.filter(m=>m.type==='image')?.length||old.images?.length||0;
    if(incoming.images.length<previous){retained++;return old;}
    // Full scan is a best-effort, not a guarantee the Behance page had loaded fully.
    // Preserve existing ordered text/video modules if present.
    const oldModules=Array.isArray(old.modules)?old.modules:[];
    // Keep existing text/video in their original relative order. Replace the
    // existing image slots, then append any additional discovered images.
    let nextImage=0;
    const modules=oldModules.length ? oldModules.map(m => {
      if(m.type!=='image')return m;
      return {type:'image',url:incoming.images[nextImage++]||m.url};
    }) : [];
    modules.push(...incoming.images.slice(nextImage).map(url=>({type:'image',url})));
    const titleNeedsFix=old.title_source==='url-slug'||/^(?:مشروع Behance|Behance project) \d+/i.test(old.title||'');
    updated++;
    return {...old,
      title:titleNeedsFix&&incoming.title?incoming.title:old.title,
      title_source:titleNeedsFix&&incoming.title?'browser-public':old.title_source,
      cover:old.cover||incoming.images[0],
      images:incoming.images,
      modules,
      browser_public_scan:true,
      image_quality:'browser-visible-module-cdn',
      full_project_synced:old.full_project_synced||false,
    };
  });
  return {catalog:merged,summary:{known:knownIDs.size,captured:byId.size,withImages:[...byId.values()].filter(x=>x.images.length).length,updated,retained}};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const inputFile=process.argv[2];
  if(!inputFile)throw Error('Usage: node scripts/import-browser-export.mjs path/to/owner-export.json');
  const raw=await fs.readFile(CATALOG_PATH,'utf8');
  const input=JSON.parse(await fs.readFile(inputFile,'utf8'));
  const result=mergeBrowserExport(JSON.parse(raw),input);
  if(result.summary.updated)await fs.writeFile(CATALOG_PATH,JSON.stringify(result.catalog,null,2)+'\n');
  console.log('Imported public media URLs:',result.summary);
}