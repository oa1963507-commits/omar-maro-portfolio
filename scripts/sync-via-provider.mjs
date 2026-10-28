/**
 * Public Behance portfolio synchronization through an authenticated third-party
 * JSON provider (Scrappa). No Behance login, password, or private project access.
 *
 * Configure SCRAPPA_API_KEY as a GitHub Actions repository secret, NEVER in JS,
 * public Pages content, or git history. Missing/invalid credentials fail clearly.
 *
 * Credit efficiency: one public profile lookup per run; fetch a project's full
 * ordered modules only if it is new, incomplete, or hasn't been checked in 7 days.
 * Preserves old projects and images on partial failure.
 */
import fs from 'node:fs/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';

export const USERNAME = 'oa19635079ead';
const API = 'https://scrappa.co/api/behance';
const CATALOG = new URL('../data/projects.json', import.meta.url);
const REPORT = new URL('../data/sync-status.json', import.meta.url);
const MAX_MODULES = 120;
const REFRESH_MILLIS = 7 * 24 * 60 * 60 * 1000;
const LABELS = {branding:'هويات بصرية',social:'سوشيال ميديا وتصميمات',covers:'أغلفة كتب',print:'مطبوعات وتغليف',ai:'تصميمات AI'};
const ALLOWED_CDNS = new Set(['mir-s3-cdn-cf.behance.net','mir-cdn.behance.net','mir-s3-cdn.behance.net']);
const VALID_MEDIA = /\.(?:png|jpe?g|webp|gif)(?:$|[?#])/i;

export function validGalleryUrl(raw, expectedID) {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' || !['www.behance.net','behance.net'].includes(u.hostname)) return '';
    if (!new RegExp(`^/gallery/${String(expectedID)}(?:/|$)`).test(u.pathname)) return '';
    u.hash='';return u.href;
  } catch { return ''; }
}
export function validImageUrl(raw) {
  try {
    const u=new URL(raw);
    if(u.protocol!=='https:' || !ALLOWED_CDNS.has(u.hostname) || !VALID_MEDIA.test(u.pathname))return '';
    u.hash='';return u.href;
  }catch{return '';}
}
function validEmbed(raw){
  try{const u=new URL(raw);if(u.protocol!=='https:')return '';
    if(['player.vimeo.com','www.youtube-nocookie.com','www.youtube.com','youtube.com'].includes(u.hostname))return u.href;
  }catch{}return '';
}
function cleanText(value,max=2000){return String(value??'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim().slice(0,max);}
function projectCategory(text=''){
  const s=text.toLowerCase();
  if(/book cover|غلاف|أغلفة/.test(s))return 'covers';
  if(/brand|identity|logo|هوية|شعار/.test(s))return 'branding';
  if(/business card|print|packag|كارت|طباعة|مطبوعات/.test(s))return 'print';
  if(/\bai\b|artificial intelligence|ذكاء اصطناعي/.test(s))return 'ai';
  return 'social';
}
const getDate=(raw)=>{const d=new Date(raw);return Number.isFinite(d.getTime())?d:null;};
const projectId=(raw)=>{const id=String(raw??'');return /^\d{3,18}$/.test(id)?id:'';};

export function parseProfile(payload, expectedUsername=USERNAME){
  if(!payload || payload.success!==true || !payload.data || String(payload.data.username||'').toLowerCase()!==expectedUsername.toLowerCase()){
    throw Error('Provider returned an unexpected Behance profile');
  }
  if(!Array.isArray(payload.data.projects))throw Error('Provider profile has no projects array');
  const entries=[];
  const seen=new Set();
  for(const p of payload.data.projects){
    const id=projectId(p.id), url=validGalleryUrl(p.url,id);
    if(!id||!url||seen.has(id))continue;
    seen.add(id);
    entries.push({id,url,title:cleanText(p.title,180),cover:validImageUrl(p.cover_url||p.cover)});
  }
  if(payload.data.projects.length && !entries.length)throw Error('No verified public gallery URLs in provider response');
  return entries;
}
export function parseProject(payload,expectedID,profileUsername=USERNAME){
  const d=payload?.data;
  if(payload?.success!==true) {
    throw Error('Provider project response failed: '+String(payload?.error?.code||'unknown').slice(0,80));
  }
  if(!d || typeof d!=='object')throw Error('Provider project response has no data object');
  if(String(d.id)!==String(expectedID))throw Error('Provider project ID mismatch; returned='+String(d.id).slice(0,24));
  if(!Array.isArray(d.modules)){
    const keys=Object.keys(d).filter(k=>/^(modules|images|blocks|assets|sections|gallery|id)$/i.test(k)).join(',');
    throw Error('Provider project has no modules array; media_fields='+String(keys||'none'));
  }
  const owners=Array.isArray(d.owners)?d.owners:[];
  if(owners.length && !owners.some(o=>String(o.username||'').toLowerCase()===profileUsername.toLowerCase())){
    throw Error('Project ownership did not match the selected Behance profile');
  }
  const modules=[];
  const indexed=d.modules.map((m,i)=>({m,index:i})).sort((a,b)=>(Number(a.m.position)||a.index+1)-(Number(b.m.position)||b.index+1));
  for(const {m} of indexed){
    if(modules.length>=MAX_MODULES)break;
    if(m.type==='image'){
      const url=validImageUrl(m.url);
      if(url)modules.push({type:'image',url});
    }else if(m.type==='text'){
      const text=cleanText(m.text?.plain||m.text||m.plain,7000);
      if(text)modules.push({type:'text',text});
    }else if(m.type==='video'||m.type==='embed'){
      const url=validEmbed(m.url);
      if(url)modules.push({type:'embed',url});
    }
  }
  if(!modules.length)throw Error('Provider returned no supported project modules');
  const images=modules.filter(m=>m.type==='image').map(m=>m.url);
  const description=cleanText(d.description?.plain||d.description_plain||d.description||'',1600);
  return {
    id:String(expectedID),
    title:cleanText(d.title,180),
    url:validGalleryUrl(d.url,expectedID),
    cover:validImageUrl(d.cover_url),
    description,images,modules,
  };
}
function newProject(entry){
  const category=projectCategory(entry.title);
  return {id:`behance-${entry.id}`,title:entry.title||`Behance project ${entry.id}`,title_en:'',category,category_label:LABELS[category],year:'',cover:entry.cover,images:[],description:'',story:'',source:'behance',url:entry.url,behance_id:entry.id};
}
export function mergeDetail(existing,entry,detail,now){
  const title=detail.title && !/^[?\s]+$/.test(detail.title)?detail.title:existing.title;
  return {
    ...existing,
    title: /^[?\s]+$/.test(String(existing.title||'').trim())||!existing.title ? title : existing.title,
    cover:detail.cover||entry.cover||existing.cover,
    url:detail.url||entry.url||existing.url,
    description:detail.description||existing.description||'',
    images:detail.images.length?detail.images:existing.images||[],
    modules:detail.modules,
    full_project_synced:true,
    image_quality:'provider-original-CDN-variants',
    provider_checked_at:now.toISOString(),
  };
}
async function getJSON(path,key,fetchImpl){
  const r=await fetchImpl(`${API}${path}`,{headers:{'x-api-key':key,accept:'application/json'},signal:AbortSignal.timeout(35000)});
  if(!r.ok)throw Error(`Provider HTTP ${r.status}`);
  const body=await r.json();
  if(body?.success!==true)throw Error(`Provider error ${body?.error?.code||'unknown'}`);
  return body;
}

export async function synchronizeProvider({key=process.env.SCRAPPA_API_KEY,fetchImpl=fetch,now=new Date(),catalogPath=CATALOG,reportPath=REPORT,refreshMillis=REFRESH_MILLIS}={}){
  if(!key||String(key).trim().length<10)throw Error('SCRAPPA_API_KEY is missing. Add it in GitHub Settings > Secrets and variables > Actions. Never paste the token into chat.');
  const raw=await fs.readFile(catalogPath,'utf8');
  const catalog=JSON.parse(raw);
  if(!Array.isArray(catalog))throw Error('Invalid project catalog');
  const profile=parseProfile(await getJSON(`/user?username=${encodeURIComponent(USERNAME)}`,key,fetchImpl));
  const byId=new Map(catalog.map(p=>[p.id,p]));
  const events=[];
  let requested=1,imported=0,skipped=0,failed=0;
  for(const entry of profile){
    const catalogID=`behance-${entry.id}`;
    const old=byId.get(catalogID)||newProject(entry);
    const freshAt=getDate(old.provider_checked_at);
    const complete=old.full_project_synced && Array.isArray(old.modules) && old.modules.length>0;
    if(complete && freshAt && now.getTime()-freshAt.getTime()<refreshMillis){
      // Still update metadata if the profile changed without charging for details.
      const damaged=/^[?\s]+$/.test(String(old.title||'').trim());
      byId.set(catalogID,{...old,title:damaged && entry.title && !/^[?\s]+$/.test(entry.title)?entry.title:old.title,url:entry.url,cover:entry.cover||old.cover});
      events.push({id:catalogID,status:'cached',module_count:old.modules.length,image_count:old.images?.length||0});
      skipped++;continue;
    }
    try{
      const detail=parseProject(await getJSON(`/project?id=${encodeURIComponent(entry.id)}`,key,fetchImpl),entry.id);
      requested++;
      const next=mergeDetail(old,entry,detail,now);
      byId.set(catalogID,next);
      events.push({id:catalogID,status:'imported',module_count:next.modules.length,image_count:next.images.length});
      imported++;
    }catch(err){
      // Only old verified data is used; no placeholder or invented image content.
      const damaged=/^[?\s]+$/.test(String(old.title||'').trim());
      byId.set(catalogID,{...old,title:damaged && entry.title && !/^[?\s]+$/.test(entry.title)?entry.title:old.title,cover:entry.cover||old.cover});
      events.push({id:catalogID,status:'unavailable',error:err.message,module_count:old.modules?.length||0,image_count:old.images?.length||0});
      failed++;
    }
  }
  const merged=[...byId.values()];
  const newRaw=JSON.stringify(merged,null,2)+'\n';
  if(newRaw!==raw)await fs.writeFile(catalogPath,newRaw,'utf8');
  const report={checked_at:now.toISOString(),provider:'scrappa-independent-third-party',profile:USERNAME,profile_projects:profile.length,requests_attempted:requested+failed,imported,skipped,failed,with_modules:merged.filter(x=>x.source==='behance'&&x.modules?.length).length,projects:events};
  await fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
  console.log(`Behance provider: ${profile.length} projects; ${imported} full imports, ${skipped} cached, ${failed} incomplete; catalog has ${report.with_modules} with full modules.`);
  if(failed && !imported && !skipped)process.exitCode=1;
  return report;
}
if(process.argv[1] && fileURLToPath(import.meta.url)===fileURLToPath(pathToFileURL(process.argv[1]))){
  synchronizeProvider().catch(err=>{console.error(err.message);process.exitCode=1;});
}