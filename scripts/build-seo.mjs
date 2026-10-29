import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
const {applyControls,normalizeControls}=require('../controls.js');
const site='https://oa1963507-commits.github.io/omar-maro-portfolio/';
const read=async name=>JSON.parse(await fs.readFile(path.join(root,name),'utf8'));
const htmlEscape=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const safeUrl=u=>{
 const val=String(u||'').trim();
 if(val.startsWith('assets/')&&!val.includes('..'))return site+val;
 try{const parsed=new URL(val);return parsed.protocol==='https:'?parsed.href:'';}catch{return '';}
};
const asText=s=>String(s||'').replace(/\s+/g,' ').trim();
const trimmed=s=>asText(s).slice(0,220);
const [catalog,rawSettings]=await Promise.all([read('data/projects.json'),read('data/site-controls.json')]);
const settings=normalizeControls(rawSettings);
const projects=applyControls(catalog,settings);
const outDir=path.join(root,'projects');
await fs.mkdir(outDir,{recursive:true});

const dates=[];
for(const p of projects){
 if(!/^[a-z0-9-]{2,120}$/.test(p.id))continue;
 const title=String(p.title||'Untitled project');
 const desc=trimmed(p.description||('A graphic design project by Omar Maro. '+(p.category_label||'')))||'Graphic design by Omar Maro.';
 const url=site+'projects/'+encodeURIComponent(p.id)+'/';
 const rawImages=(Array.isArray(p.modules)&&p.modules.length?p.modules.filter(m=>m.type==='image').map(m=>m.url):(p.images||[]));
 const images=[...new Set(rawImages.map(safeUrl).filter(Boolean))].slice(0,120);
 const cover=safeUrl(p.cover)||images[0]||site+'assets/omar-cover.jpg';
 const study=settings.caseStudies[p.id]||{};
 const isArabic=/[\u0600-\u06ff]/.test(title);
 const lang=isArabic?'ar':'en',dir=isArabic?'rtl':'ltr';
 const facts=[['client','Client / العميل'],['role','Role / الدور'],['services','Services / الخدمات'],['duration','Duration / المدة']]
   .filter(([key])=>study[key]).map(([key,label])=>'<div class="fact"><span>'+htmlEscape(label)+'</span><strong>'+htmlEscape(study[key])+'</strong></div>').join('');
 const sections=[['challenge','The challenge / التحدي'],['approach','The process / التنفيذ'],['outcome','The outcome / النتيجة']]
   .filter(([key])=>study[key]).map(([key,label])=>'<section class="story"><h2>'+htmlEscape(label)+'</h2><p>'+htmlEscape(study[key])+'</p></section>').join('');
 const story=p.story?'<section class="story"><h2>Concept / الفكرة</h2><p>'+htmlEscape(p.story)+'</p></section>':'';
 const modules=(Array.isArray(p.modules)&&p.modules.length?p.modules:images.map(url=>({type:'image',url})));
 const body=modules.map((m,i)=>{
   if(m.type==='image'){
     const src=safeUrl(m.url);
     return src?'<figure><a href="'+htmlEscape(src)+'" target="_blank" rel="noopener noreferrer"><img loading="lazy" decoding="async" src="'+htmlEscape(src)+'" alt="'+htmlEscape(title+' — image '+(i+1))+'"></a></figure>':'';
   }
   if(m.type==='text')return '<div class="module-text">'+htmlEscape(m.text||'')+'</div>';
   if(m.type==='embed'){const embed=safeUrl(m.url);return embed&&/^https:\/\/(?:www\.youtube\.com|youtube\.com|www\.youtube-nocookie\.com|player\.vimeo\.com)\//.test(embed)?'<a class="button" href="'+htmlEscape(embed)+'" target="_blank" rel="noopener noreferrer">Watch project video ↗</a>':'';}
   return '';
 }).join('');
 const jsonLd={'@context':'https://schema.org','@type':'CreativeWork',name:title,description:desc,url,creator:{'@type':'Person',name:'Omar Adel',alternateName:'Omar Maro',url:site},image:images.slice(0,8),genre:String(p.category_label||p.category||'Graphic design')};
 const source=String(p.url||'').startsWith('https://')?'<a class="button secondary" href="'+htmlEscape(p.url)+'" target="_blank" rel="noopener noreferrer">Original work on Behance ↗</a>':'';
 const document=`<!doctype html>
<html lang="${lang}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${htmlEscape(title)} | OMAR MARO</title>
<meta name="description" content="${htmlEscape(desc)}">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article"><meta property="og:title" content="${htmlEscape(title)} | OMAR MARO">
<meta property="og:description" content="${htmlEscape(desc)}"><meta property="og:url" content="${url}">
<meta property="og:image" content="${htmlEscape(cover)}"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${site}assets/omar-mark.png">
<link rel="preconnect" href="https://mir-s3-cdn-cf.behance.net">
<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g,'\\u003c')}</script>
<style>
:root{color-scheme:dark;font-family:system-ui,Tahoma,Arial,sans-serif;background:#070c16;color:#edf5ff}
*{box-sizing:border-box}body{margin:0;line-height:1.8;background:radial-gradient(circle at 20% 0,#142b48 0,transparent 38%),#070c16}a{color:inherit;text-decoration:none}
header{position:sticky;top:0;z-index:10;background:#0c1727ef;border-bottom:1px solid #345477;padding:14px max(5vw,20px);display:flex;align-items:center;justify-content:space-between;gap:20px;backdrop-filter:blur(20px)}header img{height:36px;width:36px;object-fit:contain}header a{display:inline-flex;align-items:center;gap:12px}
main{width:min(1080px,calc(100% - 32px));margin:50px auto 85px}.tag{color:#8ac3ff;font-size:12px;font-weight:700;text-transform:uppercase}
h1{font-size:clamp(30px,5vw,66px);line-height:1.2;letter-spacing:-.025em;overflow-wrap:anywhere}
.intro{padding:clamp(20px,4vw,42px);border:1px solid #365275;border-radius:23px;background:#0e1b2b;margin-bottom:30px}.intro p{color:#b6cde6;max-width:850px}
.facts{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:25px 0}.fact,.story{border:1px solid #304c6e;background:#0b1829;border-radius:14px;padding:20px}.fact span{display:block;color:#8ac3ff;font-size:12px}.fact strong{display:block;margin-top:5px;font-size:15px}
.story{margin:15px 0 22px}.story h2{color:#8ac3ff;font-size:18px}.story p,.module-text{white-space:pre-wrap;overflow-wrap:anywhere;color:#c9d9ea}
figure{padding:0;margin:0 0 20px;border-radius:15px;border:1px solid #2d425b;overflow:hidden;background:#0e1928;text-align:center}
figure img{display:block;width:100%;height:auto;object-fit:contain}.button{display:inline-flex;border-radius:99px;padding:11px 19px;background:#6aafff;color:#071523;font-weight:700;margin:10px 10px 10px 0}.button.secondary{border:1px solid #6aafff;background:transparent;color:#b6d7ff}.module-text{padding:20px;border:1px solid #304c6e;border-radius:14px;margin-bottom:18px}
footer{border-top:1px solid #345477;text-align:center;color:#94a9c3;font-size:12px;padding:30px}
@media(max-width:650px){main{margin:24px auto 55px}.facts{grid-template-columns:1fr}header{padding:12px 16px}}
</style></head>
<body><header><a href="${site}#work"><img src="${site}assets/omar-mark.png" width="36" height="36" alt="OMAR MARO"><strong>OMAR MARO</strong></a><a href="${site}#work">Portfolio ↗</a></header>
<main><section class="intro"><span class="tag">${htmlEscape(p.category_label||p.category||'Portfolio')}${p.year?' · '+htmlEscape(p.year):''}</span><h1>${htmlEscape(title)}</h1><p>${htmlEscape(desc)}</p>${facts?'<div class="facts">'+facts+'</div>':''}
<a class="button" href="${site}#project/${encodeURIComponent(p.id)}">View interactive case study ↗</a>${source}</section>
${sections}${story}${body||'<p>Project gallery is available from the original source link where provided.</p>'}
<a class="button" href="${site}#work">More projects ↗</a></main>
<footer>© OMAR MARO · Graphic designer · <a href="${site}">Portfolio</a></footer></body></html>`;
 const dirpath=path.join(outDir,p.id);
 await fs.mkdir(dirpath,{recursive:true});
 await fs.writeFile(path.join(dirpath,'index.html'),document);
 dates.push(url);
}
const sitemap=['<?xml version="1.0" encoding="UTF-8"?>','<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',...new Set([site,...dates].map(u=>'<url><loc>'+htmlEscape(u)+'</loc></url>')),'</urlset>'].join('\n');
await fs.writeFile(path.join(root,'sitemap.xml'),sitemap+'\n');
await fs.writeFile(path.join(root,'robots.txt'),'User-agent: *\nAllow: /\nSitemap: '+site+'sitemap.xml\n');
console.log('SEO generated',dates.length,'public project pages; existing hidden/excluded projects omitted.');
