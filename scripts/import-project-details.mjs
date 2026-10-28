/**
 * Import the image modules of PUBLIC Behance projects in their original order.
 * No private APIs, credentials or login bypass. The existing project catalog is
 * never cleared when a project becomes inaccessible. Optional API provider:
 * SCRAPPA_API_KEY (only used if free public-page extraction fails).
 */
import fs from 'node:fs/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';

const CATALOG = new URL('../data/projects.json', import.meta.url);
const REPORT = new URL('../data/sync-status.json', import.meta.url);
const MAX_MODULES = 100;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const URL_RX = /https?:\/\/[^\s"'<>`\\]+?\.behance\.net\/project_modules\/[\w-]+\/[^\s"'<>`,?\\]+?\.(?:jpe?g|png|webp|gif)(?:\?[^\s"'<>`,\\]*)?/gi;
const KNOWN_BEHANCE_CDN = new Set(['mir-s3-cdn-cf.behance.net','mir-cdn.behance.net','mir-s3-cdn.behance.net']);

export function originalModuleUrl(raw) {
  if(typeof raw!=='string') return '';
  try {
    const u=new URL(raw.replaceAll('\\/','/').replaceAll('&amp;','&'));
    if(u.protocol!=='https:' || !KNOWN_BEHANCE_CDN.has(u.hostname)) return '';
    if(!/^\/project_modules\/[\w-]+\/[^/]+\.(?:jpe?g|png|webp|gif)$/i.test(u.pathname)) return '';
    u.pathname=u.pathname.replace(/^\/project_modules\/[\w-]+\//i,'/project_modules/source/');
    u.search='';u.hash='';return u.href;
  } catch {return '';}
}
function htmlDecode(value='') {
  return String(value)
    .replace(/\\u002[Ff]/g,'/').replace(/\\u003[Aa]/g,':')
    .replace(/\\u0026/g,'&').replace(/\\u003[Dd]/g,'=')
    .replace(/\\\//g,'/').replace(/&amp;/g,'&')
    .replace(/&#(\d+);/g,(_,n)=>{const code=Number(n);return code>0&&code<=0x10ffff?String.fromCodePoint(code):'';})
    .replace(/&quot;/g,'"');
}
function isForProject(url,projectId){
  if(!projectId)return true;
  try{return new URL(url).pathname.split('/').pop().split('.')[0].includes(String(projectId));}
  catch{return false;}
}
export function moduleUrlsFromHtml(html,projectId='') {
  const content=htmlDecode(html),seen=new Set(),all=[];
  for(const match of content.matchAll(URL_RX)){
    const url=originalModuleUrl(match[0]);
    if(!url||seen.has(url))continue;
    seen.add(url);all.push(url);
    if(all.length>=MAX_MODULES*3)break;
  }
  // Structured payloads can also contain "related projects" assets. If
  // filenames establish the requested project ID, use only those modules.
  const matching=all.filter(u=>isForProject(u,projectId));
  return (matching.length?matching:all).slice(0,MAX_MODULES);
}
export function extractImageVariants(source) {
  const canonical=originalModuleUrl(source);
  if(!canonical)return [];
  return ['source','fs','max_1200'].map(size=>canonical.replace('/project_modules/source/',`/project_modules/${size}/`));
}
export function extractMetadataTitle(html='') {
  const s=htmlDecode(html);
  const fromMeta=s.match(/<meta\s+[^>]*property=["']og:title["'][^>]*content=["']([^"']+)/i)?.[1]
    ||s.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]||'';
  const title=fromMeta.replace(/\s*(?:\:\:)?\s*Behance\s*$/i,'').replace(/\s+/g,' ').trim();
  return title.length>=2 && title.length<180 ? title : '';
}
export function preserveProject(old,incoming){
  if(!incoming || !Array.isArray(incoming.images) || !incoming.images.length)return old;
  const title=(/^\?+$/.test(old.title?.trim()??'') && incoming.title && !/^\?+$/.test(incoming.title)) ? incoming.title : old.title;
  return {
    ...old,title,
    images:incoming.images.slice(0,MAX_MODULES),
    full_project_synced:true,
    image_quality:incoming.verified?'verified-public-CDN':'public-CDN-source-with-browser-fallback',
    ...(incoming.description && !old.description ? {description:incoming.description} : {}),
  };
}
function safeProjectUrl(project){
  try{
    const url=new URL(project.url);const id=String(project.behance_id||project.id.replace(/^behance-/,''));
    if(url.protocol!=='https:'||url.hostname!=='www.behance.net'||!/^\d{3,18}$/.test(id))return '';
    return new RegExp(`^/gallery/${id}(?:/|$)`).test(url.pathname)?url.href:'';
  }catch{return '';}
}
async function readPage(url){
  const r=await fetch(url,{headers:{accept:'text/html,application/xhtml+xml', 'user-agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36'},signal:AbortSignal.timeout(17000)});
  if(!r.ok)throw Error(`HTTP ${r.status}`);
  const s=await r.text();if(s.length>12_000_000)throw Error('HTML response too large');return s;
}

// Launch must be awaited: chromium.launch() resolves to Browser, not a Browser immediately.
export async function createPublicBrowser({browserFactory, playwrightLoader = () => import('playwright')} = {}) {
  const browser = browserFactory
    ? await browserFactory()
    : await (await playwrightLoader()).chromium.launch({headless:true});
  if (!browser || typeof browser.newContext !== 'function' || typeof browser.close !== 'function') {
    throw new Error('Playwright did not return a Browser instance');
  }
  return browser;
}

async function browserProject(browser,url,projectId){
  const context=await browser.newContext({viewport:{width:1440,height:920},deviceScaleFactor:1,locale:'en-US'});
  const page=await context.newPage();
  const network=[];
  page.on('response',response=>{
    const u=response.url();
    if(u.includes('/project_modules/') && response.status()<400)network.push(u);
  });
  try{
    const pageResponse = await page.goto(url,{waitUntil:'domcontentloaded',timeout:18000});
    if (pageResponse && pageResponse.status() >= 400) {
      throw Error('Browser page HTTP ' + pageResponse.status());
    }
    await page.waitForTimeout(900);
    // Scroll through every lazy-loaded module, preserving its DOM order.
    let lastHeight=0,stalled=0;
    for(let n=0;n<45;n++){
      const state=await page.evaluate(()=>({top:window.scrollY,height:document.documentElement.scrollHeight,viewport:window.innerHeight}));
      const atEnd=state.top+state.viewport >= state.height-40;
      if(atEnd&&state.height===lastHeight)stalled++;else stalled=0;
      if(stalled>=3)break;
      lastHeight=state.height;
      await page.evaluate(()=>window.scrollBy(0,Math.max(900,window.innerHeight*.9)));
      await page.waitForTimeout(170);
    }
    await page.waitForTimeout(600);
    const dom=await page.evaluate(()=>{
      const modules=[];
      const selector='img, picture source, [data-src], [style*="project_modules"]';
      for(const el of document.querySelectorAll(selector)){
        const values=[el.getAttribute('data-src'),el.getAttribute('data-original'),el.getAttribute('src'),el.getAttribute('srcset'),el.getAttribute('data-srcset'),el.currentSrc,el.getAttribute('style')].filter(Boolean);
        for(const value of values){
          const match=String(value).match(/https?:\/\/[^\s,"'<>]+?\.behance\.net\/project_modules\/[\w-]+\/[^\s,"'<>]+?\.(?:jpe?g|png|webp|gif)/i);
          if(match){modules.push(match[0]);break;}
        }
      }
      return {title:document.querySelector('meta[property="og:title"]')?.content || document.querySelector('h1')?.textContent || '',modules};
    });
    const domModules=moduleUrlsFromHtml(dom.modules.join(' '),projectId);
    const htmlModules=moduleUrlsFromHtml(await page.content(),projectId);
    const netModules=moduleUrlsFromHtml(network.join(' '),projectId);
    // The DOM is the ordered project canvas; page state/network may add images
    // which are not yet reflected in the DOM (lazy-loading/virtualization).
    const final=[...new Set([...domModules,...htmlModules,...netModules])].slice(0,MAX_MODULES);
    return {images:final,title:extractMetadataTitle(`<title>${dom.title}</title>`)};
  }finally{await context.close();}
}

async function scrappaProject(project,key){
  const id=String(project.behance_id||project.id.replace('behance-',''));
  const api=`https://scrappa.co/api/behance/project?id=${encodeURIComponent(id)}`;
  const resp=await fetch(api,{headers:{'x-api-key':key,accept:'application/json'},signal:AbortSignal.timeout(25000)});
  if(!resp.ok)throw Error(`Partner provider HTTP ${resp.status}`);
  const body=await resp.json();const d=body.data;
  if(!body.success || !d || String(d.id)!==id || !Array.isArray(d.modules))throw Error('Partner provider returned invalid project');
  const images=d.modules.filter(m=>m.type==='image' && typeof m.url==='string').sort((a,b)=>(a.position||0)-(b.position||0)).map(m=>originalModuleUrl(m.url)).filter(Boolean);
  return {images:[...new Set(images)].slice(0,MAX_MODULES),title:typeof d.title==='string'?d.title:'',description:typeof d.description==='string'?d.description:'',verified:false};
}

// Prefer real HEAD validation; broken /source URLs must never be reported as
// successfully imported. If HEAD is unavailable, leave the responsive image
// fallback to the site but keep that uncertainty visible in status.
export async function checkImageUrl(url,head=fetch){
  const candidates=extractImageVariants(url);
  for(const candidate of candidates){
    try{
      const response=await head(candidate,{method:'HEAD',headers:{accept:'image/*'},signal:AbortSignal.timeout(3200)});
      if(response.ok && String(response.headers.get('content-type')||'').startsWith('image/')) return {url:candidate,verified:true};
    }catch{/* CDN may block HEAD; try next format */}
  }
  return {url:candidates[0]||'',verified:false};
}
export async function hydrateCatalog({catalogPath=CATALOG,reportPath=REPORT,loadHtml=readPage,browserFactory,checkImage=checkImageUrl,partnerKey=process.env.SCRAPPA_API_KEY||''}={}){
  const oldText=await fs.readFile(catalogPath,'utf8');const catalog=JSON.parse(oldText);
  if(!Array.isArray(catalog))throw Error('Invalid project catalog');
  let browser=null,attempted=0,imported=0;const items=[],updated=[];
  try{
    for(const p of catalog){
      const url=p.source==='behance' && safeProjectUrl(p);
      if(!url){updated.push(p);continue;}
      attempted++;
      const id=String(p.behance_id||p.id.replace('behance-',''));
      let extracted={images:[],title:''};const errors=[];
      try{
        const html=await loadHtml(url);
        extracted={title:extractMetadataTitle(html),images:moduleUrlsFromHtml(html,id)};
      }catch(e){errors.push('public HTML: '+e.message);}
      try{
        if(!browser){
          browser=await createPublicBrowser({browserFactory});
        }
        const viewed=await browserProject(browser,url,id);
        if(viewed.images.length>=extracted.images.length)extracted={...extracted,...viewed,title:viewed.title||extracted.title};
      }catch(e){errors.push('browser: '+e.message);}
      if(!extracted.images.length && partnerKey){
        try{extracted=await scrappaProject(p,partnerKey);}catch(e){errors.push('partner: '+e.message);}
      }
      if(extracted.images.length){
        // Probing 100 large images would slow scheduled GitHub jobs. Validate
        // a small sample; the site independently falls back per image on error.
        const selected=extracted.images.slice(0,MAX_MODULES);
        const chosen=[];let verified=0;
        for(let j=0;j<selected.length;j++){
          const link=selected[j];
          const result=j<2?await checkImage(link):{url:originalModuleUrl(link),verified:false};
          if(result.url){chosen.push(result.url);if(result.verified)verified++;}
        }
        extracted.images=[...new Set(chosen)];extracted.verified=verified===extracted.images.length && verified>0;
      }
      if(extracted.images.length){updated.push(preserveProject(p,extracted));imported++;}
      else updated.push(p);
      const previous=p.images?.length||0;
      items.push({id:p.id,title:p.title,status:extracted.images.length?'imported':previous?'retained-previous':'unavailable',image_count:extracted.images.length||previous,quality_verified:!!extracted.verified,...(errors.length?{errors}:{} )});
      console.log(`${p.id}: ${extracted.images.length} images, ${errors.join(' | ')||'public source readable'}`);
      await delay(250);
    }
  }finally{if(browser)await browser.close();}
  const nextText=JSON.stringify(updated,null,2)+'\n';if(nextText!==oldText)await fs.writeFile(catalogPath,nextText);
  const report={checked_at:new Date().toISOString(),attempted,imported,with_images:updated.filter(p=>p.source==='behance' && p.images?.length).length,projects:items};
  await fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
  console.log(`Behance full galleries: ${report.with_images}/${attempted} available; ${imported} projects refreshed.`);
  if(attempted && !report.with_images) process.exitCode=1;
  return report;
}

if(process.argv[1] && fileURLToPath(import.meta.url)===fileURLToPath(pathToFileURL(process.argv[1]))){
  hydrateCatalog().catch(e=>{console.error(e.stack||e.message);process.exitCode=1;});
}