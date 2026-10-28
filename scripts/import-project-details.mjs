/**
 * Hydrate a PUBLIC Behance project catalog with full-resolution project modules.
 * Uses an ordinary read of public pages, falling back to a headless browser if
 * content is rendered in JavaScript. Does not log in or bypass access controls.
 * A failed read NEVER deletes previous modules or overwrites correct titles.
 */
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

const CATALOG = new URL('../data/projects.json', import.meta.url);
const MODULE = /https?:\/\/[^\s"'<>\\]+?\.behance\.net\/project_modules\/(?:[a-z0-9_]+)\/[^\s"'<>\\?]+?\.(?:jpe?g|png|webp|gif)(?:\?[^\s"'<>\\]*)?/gi;
const MAX_MODULES = 80;
const MIN_MODULES = 1;
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export function originalModuleUrl(raw) {
  if (typeof raw !== 'string') return '';
  try {
    const u = new URL(raw.replaceAll('\\/','/').replaceAll('&amp;', '&'));
    if (u.protocol !== 'https:' || !/(^|\.)behance\.net$/.test(u.hostname)) return '';
    if (!/^\/project_modules\/[\w-]+\/[^/]+\.(?:jpe?g|png|webp|gif)$/i.test(u.pathname)) return '';
    u.pathname = u.pathname.replace(/^\/project_modules\/[^/]+\//i, '/project_modules/source/');
    u.search = '';
    return u.href;
  } catch { return ''; }
}

export function moduleUrlsFromHtml(html) {
  const normalized = String(html).replace(/\\\//g, '/').replace(/\\u0026/gi, '&').replace(/&amp;/gi, '&');
  const seen = new Set();
  const urls=[];
  for (const match of normalized.matchAll(MODULE)) {
    const u = originalModuleUrl(match[0]);
    if (u && !seen.has(u)) {seen.add(u);urls.push(u);}
    if (urls.length >= MAX_MODULES) break;
  }
  return urls;
}

function cleanedTitle(value) {
  if (typeof value !== 'string') return '';
  const title = value.replace(/\s*(?:\:\:)?\s*Behance\s*$/i,'').replace(/\s+/g, ' ').trim();
  return title.length >= 2 && title.length < 180 ? title : '';
}
export function preserveProject(old, incoming) {
  if (!incoming || !Array.isArray(incoming.images) || incoming.images.length < MIN_MODULES) return old;
  return {
    ...old,
    title: (/^\?+$/.test(old.title?.trim() ?? '') && incoming.title) ? incoming.title : old.title,
    images: incoming.images.slice(0,MAX_MODULES),
    full_project_synced: true,
    image_quality: 'source',
  };
}

const projectUrl = p => {
  try {const u = new URL(p.url);
    return u.protocol === 'https:' && u.hostname === 'www.behance.net' && new RegExp('^/gallery/' + String(p.behance_id || p.id.replace('behance-','')) + '/').test(u.pathname) ? u.href : '';
  } catch {return '';}
};

async function fetchHtml(url) {
  const res=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 (compatible; OmarMaroPortfolio/1.0; +https://github.com/oa1963507-commits/omar-maro-portfolio)','accept':'text/html'},signal:AbortSignal.timeout(13000)});
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html=await res.text();
  if(html.length > 12_000_000) throw Error('Page too large');
  return html;
}

async function browserProject(browser, url) {
  const context=await browser.newContext({viewport:{width:1440,height:900}, deviceScaleFactor:1});
  const page=await context.newPage();
  try {
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:22000});
    await page.waitForTimeout(1000);
    // Behance loads some project modules only when they approach the viewport.
    for (let i=0; i<24; i++) {
      const y = await page.evaluate(() => window.scrollY + innerHeight);
      const full = await page.evaluate(() => document.documentElement.scrollHeight);
      if(y >= full - 40) break;
      await page.evaluate(() => window.scrollBy(0, Math.max(800, window.innerHeight * 0.88)));
      await page.waitForTimeout(140);
    }
    await page.waitForTimeout(700);
    const result=await page.evaluate(() => {
      const selector='img[src*="project_modules"],img[srcset*="project_modules"],source[srcset*="project_modules"]';
      const els = [...document.querySelectorAll(selector)];
      const out=[];
      for (const el of els) {
        const src = el.getAttribute('srcset') || el.getAttribute('data-src') || el.getAttribute('src') || el.currentSrc;
        if (!src) continue;
        const img = String(src).match(/https:\/\/[^\s,]+?\.behance\.net\/project_modules\/[^\s,]+/i);
        if (img) out.push(img[0]);
      }
      return {title:document.querySelector('h1')?.textContent?.trim() || document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '',modules:out};
    });
    const seen=new Set();
    let images=[];
    for (const src of result.modules) {
      const original=originalModuleUrl(src);
      if(original && !seen.has(original)){seen.add(original);images.push(original);}
    }
    // Some pages carry the complete media list in serialized page state.
    if (!images.length) images=moduleUrlsFromHtml(await page.content());
    return {title:cleanedTitle(result.title),images:images.slice(0,MAX_MODULES)};
  } finally {await context.close();}
}

export async function hydrateCatalog({catalogPath=CATALOG, browserFactory, loadHtml=fetchHtml}={}) {
  const oldText=await fs.readFile(catalogPath,'utf8');
  const current=JSON.parse(oldText);
  if (!Array.isArray(current)) throw Error('Catalog must be an array');
  const projects=current.filter(p=>p.source==='behance' && projectUrl(p));
  let browser=null;let attempted=0;let hydrated=0;let retained=0;const errors=[];
  const next=[];
  try {
    for(const project of current){
      if(!projects.includes(project)) {next.push(project);continue;}
      attempted++;
      let extracted={images:[],title:''};
      try {
        const html=await loadHtml(project.url);
        extracted={images:moduleUrlsFromHtml(html),title:cleanedTitle((html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)/i)||[])[1] || '')};
      } catch (error) {errors.push(`${project.id}: HTML ${error.message}`);}
      // Prefer a DOM-ordered, scrolled browser reading over metadata thumbnails.
      // Keep the HTML images as a fallback when the public page blocks automation.
      {
        try {
          if(!browser){
            if(browserFactory)browser=await browserFactory();
            else {const {chromium}=await import('playwright'); browser=await chromium.launch({headless:true});}
          }
          const browserResult=await browserProject(browser,project.url);
          if (browserResult.images.length >= extracted.images.length && browserResult.images.length) {
            extracted={...browserResult,title:browserResult.title || extracted.title};
          }
        } catch (error) {errors.push(`${project.id}: browser ${error.message}`);}
      }
      if (extracted.images.length) {
        next.push(preserveProject(project,extracted));hydrated++;
      } else {next.push(project);retained++;}
      console.log(`${project.id}: ${extracted.images.length} project images ${extracted.images.length?'found':'(previous gallery preserved)'}`);
      await delay(400);
    }
  } finally {if(browser)await browser.close();}
  const updated=JSON.stringify(next,null,2)+'\n';
  if(updated!==oldText)await fs.writeFile(catalogPath,updated,'utf8');
  console.log(`Full project sync: ${hydrated}/${attempted} projects fetched. ${retained} retained without new modules.`);
  if(errors.length) console.warn(errors.join('\n'));
  // Don't report a misleading successful full import if nothing was hydrated.
  if(attempted && !hydrated && !projects.some(p=>Array.isArray(p.images)&&p.images.length)) process.exitCode=1;
  return {attempted,hydrated,retained};
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fileURLToPath(pathToFileURL(process.argv[1]))) {
  hydrateCatalog().catch(err=>{console.error(err.stack||err.message);process.exitCode=1;});
}