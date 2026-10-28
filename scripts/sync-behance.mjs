/**
 * Behance project discovery from PUBLIC profile feeds.
 *
 * No account access, passwords, private projects or unpublished content.
 * Public feed endpoints are not guaranteed by Behance, so failure is reported
 * loudly without deleting or replacing the existing project catalog.
 *
 * Default username is the portfolio owner's known public Behance handle.
 * Optional BEHANCE_FEED_URL can point to another HTTPS RSS/Atom/JSON feed.
 */
import fs from 'node:fs/promises';
import { pathToFileURL, fileURLToPath } from 'node:url';

export const USERNAME = 'oa19635079ead';
export const PROFILE = `https://www.behance.net/${USERNAME}`;
const CATALOG = new URL('../data/projects.json', import.meta.url);
const CATEGORIES = new Set(['branding','social','covers','print','ai']);

export function decodeEntities(str='') {
  return String(str).replace(/&#(x[0-9a-f]+|\d+);|&([a-z]+);/gi, (m, num, named) => {
    if (num) {
      const n = num[0].toLowerCase()==='x' ? parseInt(num.slice(1),16) : parseInt(num,10);
      return Number.isFinite(n) && n>0 && n<=0x10ffff ? String.fromCodePoint(n) : m;
    }
    return ({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',mdash:'—',ndash:'–',hellip:'…'}[named.toLowerCase()] ?? m);
  });
}
function unwrap(s='') {return decodeEntities(String(s).replace(/^\s*<!\[CDATA\[/,'').replace(/\]\]>\s*$/,''));}
function plain(s='') {return unwrap(s).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();}
function tag(block,name) {
  const n = name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const match=block.match(new RegExp(`<${n}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${n}>`,'i'));
  return match ? unwrap(match[1]) : '';
}
function safeHttps(value) {
  try { const u=new URL(decodeEntities(String(value??'').trim()));
    return u.protocol==='https:' && !u.username && !u.password ? u.href : '';
  } catch {return '';}
}
export function projectIdFromUrl(value) {
  try {const u=new URL(value);if (!['behance.net','www.behance.net'].includes(u.hostname)) return '';
    const match=u.pathname.match(/^\/gallery\/(\d{3,18})(?:\/|$)/i);
    return match ? match[1] : '';
  } catch {return '';}
}
function findProjectUrl(...fragments) {
  for (const f of fragments) {
    const candidates=[String(f).trim(),...String(f).match(/https?:\/\/(?:www\.)?behance\.net\/gallery\/\d+\/[a-z0-9%+_.-]+/gi)||[]];
    for(const candidate of candidates){const url=safeHttps(candidate);if(projectIdFromUrl(url))return url;}
  }
  return '';
}
function bestImage(...fragments) {
  for (const s of fragments) {
    if (!s)continue;
    const text=String(s);
    const media=text.match(/<(?:media:thumbnail|media:content|enclosure)\b[^>]*?\burl\s*=\s*["']([^"']+)["'][^>]*>/i);
    if(media && safeHttps(media[1]))return safeHttps(media[1]);
    const img=text.match(/<img\b[^>]*?\b(?:src|data-src)\s*=\s*["']([^"']+)["']/i);
    if(img && safeHttps(img[1]))return safeHttps(img[1]);
    const raw=text.match(/https:\/\/[\w.-]*behance\.net\/[\w/.,%?=&+~-]+\.(?:jpg|jpeg|png|webp)/i);
    if(raw && safeHttps(raw[0]))return safeHttps(raw[0]);
  }
  return '';
}
function categoryGuess(title='',desc='') {
  const s=`${title} ${desc}`.toLowerCase();
  if(/book covers?|غلاف|اغلفة|أغلفة/.test(s))return 'covers';
  if(/brand|identity|logo|branding|هوية|شعار/.test(s))return 'branding';
  if(/business card|packag|print|stationery|طباعة|مطبوعات|كروت/.test(s))return 'print';
  if(/\bai\b|artificial intelligence|midjourney|ذكاء اصطناعي/.test(s))return 'ai';
  return 'social';
}
const LABELS={branding:'هويات بصرية',social:'سوشيال ميديا وتصميمات',covers:'أغلفة كتب',print:'مطبوعات وتغليف',ai:'تصميمات AI'};
function buildProject({title,url,description='',cover='',published=''}) {
  const external=safeHttps(url), id=projectIdFromUrl(external);
  if(!id)return null;
  const category=categoryGuess(title,description);
  const date=new Date(published);
  return {
    id:`behance-${id}`, title:plain(title).slice(0,180)||`Behance project ${id}`,
    title_en:'', category, category_label:LABELS[category],
    year:Number.isNaN(date.getTime())?'':String(date.getUTCFullYear()),
    cover:safeHttps(cover), images:[],
    description:plain(description).slice(0,700), story:'',
    source:'behance',url:external,behance_id:id,
  };
}
export function parseFeed(body, contentType='') {
  if (/json/i.test(contentType) || /^\s*[\[{]/.test(body)) {
    const payload=JSON.parse(body);
    const list=Array.isArray(payload)?payload:payload.projects;
    if(!Array.isArray(list)) throw Error('JSON feed must contain projects[]');
    return list.map(entry=>{
      // Restrict projects to Behance public gallery URLs, even if feed is external.
      const p=buildProject({title:entry.title,url:entry.url||entry.link,description:entry.description,cover:entry.cover||entry.image,published:entry.published||entry.date});
      if(!p)return null;
      p.images=(Array.isArray(entry.images)?entry.images:[]).map(safeHttps).filter(Boolean).slice(0,40);
      return p;
    }).filter(Boolean);
  }
  const sections=[...body.matchAll(/<(?:item|entry)\b[^>]*>([\s\S]*?)<\/(?:item|entry)>/gi)].map(x=>x[1]);
  if(!sections.length) throw Error('No RSS/Atom project entries were found');
  return sections.map(item=>{
    const atomLink=item.match(/<link\b[^>]*\bhref=["']([^"']+)["']/i)?.[1];
    const desc=tag(item,'content:encoded')||tag(item,'description')||tag(item,'summary')||'';
    const url=findProjectUrl(atomLink,tag(item,'link'),tag(item,'guid'),desc);
    return buildProject({title:tag(item,'title'),url,description:desc,cover:bestImage(item,desc),published:tag(item,'pubDate')||tag(item,'published')||tag(item,'updated')});
  }).filter(Boolean);
}

export function mergeCatalog(current, incoming) {
  const manual=current.filter(p=>p.source!=='behance');
  const previous=current.filter(p=>p.source==='behance');
  const map=new Map(previous.map(p=>[p.id,p]));
  for(const p of incoming) {
    const old=map.get(p.id);
    map.set(p.id,old?{
      ...old,...p,
      // Preserve a real Arabic title when a broken feed returns literal ???.
      title: /^\?+$/.test(String(p.title||'').trim()) && !/^\?+$/.test(String(old.title||'').trim()) ? old.title : p.title,
      cover:p.cover||old.cover,images:p.images.length?p.images:old.images,
      category:old.category||p.category,category_label:old.category_label||p.category_label,
      story:old.story||p.story,
    }:p);
  }
  // A partial RSS feed must NEVER delete projects already discovered.
  return [...manual,...map.values()].filter((p,i,list)=>list.findIndex(x=>x.id===p.id)===i);
}

async function getFeed(url) {
  const res=await fetch(url,{headers:{Accept:'application/rss+xml, application/atom+xml, application/xml, application/json, text/xml;q=0.9','User-Agent':'OmarMaroPortfolioSync/1.0'},signal:AbortSignal.timeout(22000)});
  if(!res.ok) throw Error(`HTTP ${res.status}`);
  const text=await res.text();
  if(text.length>5_000_000)throw Error('Feed too large');
  return parseFeed(text,res.headers.get('content-type')||'');
}
export async function synchronize({feedUrls,readFile=fs.readFile,writeFile=fs.writeFile}={}) {
  const candidates=feedUrls||[
    process.env.BEHANCE_FEED_URL,
    `https://www.behance.net/feeds/user?username=${encodeURIComponent(USERNAME)}`,
    `https://rsshub.app/behance/${encodeURIComponent(USERNAME)}/projects`,
  ].filter(Boolean);
  const errors=[];let imported=[];let selected='';
  for(const url of candidates){
    if(!safeHttps(url)){errors.push('Rejected non-HTTPS feed URL');continue;}
    try{const found=await getFeed(url);
      if(found.length<1){errors.push(`${new URL(url).hostname}: no validated Behance project URLs`);continue;}
      imported=found.slice(0,100);selected=url;break;
    }catch(err){errors.push(`${new URL(url).hostname}: ${err.message}`);}
  }
  if(!imported.length){
    throw Error(`No working Behance project feed. Existing site catalog left unchanged. Tried: ${errors.join('; ')}`);
  }
  const original=await readFile(CATALOG,'utf8');
  const current=JSON.parse(original);
  if(!Array.isArray(current))throw Error('projects.json must be an array');
  const merged=mergeCatalog(current,imported);
  const updated=JSON.stringify(merged,null,2)+'\n';
  if(updated!==original) await writeFile(CATALOG,updated,'utf8');
  console.log(`Behance sync: ${imported.length} projects from ${new URL(selected).hostname}; catalog has ${merged.length} projects; ${updated===original?'no changes':'updated'}.`);
  return merged;
}

if (process.argv[1] && fileURLToPath(import.meta.url)===fileURLToPath(pathToFileURL(process.argv[1]))) {
  synchronize().catch(err=>{console.error(err.message);process.exitCode=1;});
}