/* OMAR MARO editable website fields. Values are text and vetted URLs only. */
(function(root){
'use strict';
const sections=[
 ['header','الهيدر والقائمة','.topbar'],
 ['home','الواجهة الرئيسية','#home'],
 ['proof','شريط المعلومات','.proof-band'],
 ['work','معرض المشاريع','#work'],
 ['statement','قسم الرسالة','.statement-section'],
 ['services','الخدمات','#services'],
 ['process','مراحل العمل','#process'],
 ['about','نبذة عني والسيرة','#about'],
 ['contact','التواصل وطلب مشروع','#contact'],
 ['footer','الفوتر','.footer']
];
const blocked='#projects-grid,#hero-featured,#project-view,#project-view-content,#image-lightbox,.site-cms-buttons,.mm-orbit,script,style,noscript,svg,[contenteditable]';
const cleanText=(s,max=2200)=>String(s??'').slice(0,max);
const validColor=s=>/^#[0-9a-f]{6}$/i.test(String(s||''))?s:'';
function validURL(value,type){
 const s=String(value||'').trim();
 if(!s||/[\u0000-\u001f<>"'\\]/.test(s)||s.startsWith('//'))return '';
 if(type==='src'){
   if(/^assets\/[a-zA-Z0-9_./-]+$/.test(s)&&!s.includes('..'))return s;
   try{const u=new URL(s);return u.protocol==='https:'?u.href:''}catch{return ''}
 }
 if(/^#[a-z0-9_-]+$/i.test(s))return s;
 if(/^(?:mailto:[^\s@]+@[^\s@]+|tel:\+?[0-9 ()-]{5,})$/i.test(s))return s;
 if(/^(?:projects\/[a-z0-9-]+\/?|tools\/manage-projects\.html)$/i.test(s))return s;
 try{const u=new URL(s);return u.protocol==='https:'?u.href:''}catch{return ''}
}
function normalize(raw){
 const v=raw&&typeof raw==='object'?raw:{},text={},attrs={},buttons=[],theme={},sectionsHidden=[],seo={};
 if(v.text&&typeof v.text==='object'){
   for(const [key,value] of Object.entries(v.text).slice(0,1800)){
     if(!/^(header|home|proof|work|statement|services|process|about|contact|footer)\.text\.\d{1,4}$/.test(key))continue;
     const ar=cleanText(value?.ar||''),en=cleanText(value?.en||'');
     if(ar||en)text[key]={ar,en};
   }
 }
 if(v.attrs&&typeof v.attrs==='object'){
   for(const [key,value] of Object.entries(v.attrs).slice(0,500)){
     if(!/^(header|home|proof|work|statement|services|process|about|contact|footer)\.attr\.\d{1,4}$/.test(key))continue;
     const type=value?.type;
     const url=validURL(value?.url,type);
     if((type==='src'||type==='href')&&url)attrs[key]={type,url};
   }
 }
 if(Array.isArray(v.buttons)){
   for(const entry of v.buttons.slice(0,90)){
     const section=sections.some(x=>x[0]===entry?.section)?entry.section:'';
     const href=validURL(entry?.href,'href'),ar=cleanText(entry?.ar,90),en=cleanText(entry?.en,90);
     if(!section||!href||(!ar&&!en))continue;
     buttons.push({id:/^[a-z0-9-]{5,75}$/i.test(entry.id||'')?entry.id:'btn-'+(buttons.length+1),section,href,ar,en,variant:entry.variant==='outline'?'outline':'primary'});
   }
 }
 for(const key of ['accent','azure','bg','ink']){const c=validColor(v.theme?.[key]);if(c)theme[key]=c}
 if(Array.isArray(v.hiddenSections))for(const k of v.hiddenSections)if(['proof','statement','services','process','about','contact'].includes(k)&&!sectionsHidden.includes(k))sectionsHidden.push(k);
 if(typeof v.seo?.title==='string')seo.title=cleanText(v.seo.title,90);
 if(typeof v.seo?.description==='string')seo.description=cleanText(v.seo.description,200);
 return {text,attrs,buttons,theme,hiddenSections:sectionsHidden,seo,visual:{effects:v.visual?.effects==='off'?'off':'on'}};
}
function collect(doc){
 const out=[];
 for(const [id,label,selector] of sections){
  const section=doc.querySelector(selector);if(!section)continue;
  const tree=doc.createTreeWalker(section,4);let node,i=0;
  while((node=tree.nextNode())){
   if(!node.nodeValue.trim()||node.parentElement?.closest(blocked))continue;
   out.push({key:id+'.text.'+(++i),section:id,sectionLabel:label,type:'text',node,value:node.nodeValue.trim(),label:node.parentElement?.tagName.toLowerCase()||'نص'});
  }
  let n=0;
  for(const el of section.querySelectorAll('a[href],img[src]')){
   if(el.closest(blocked))continue;
   const type=el.tagName==='IMG'?'src':'href';
   out.push({key:id+'.attr.'+(++n),section:id,sectionLabel:label,type,element:el,value:el.getAttribute(type)||'',label:el.getAttribute('alt')||el.textContent.trim().slice(0,85)||el.tagName});
  }
 }
 return out;
}
function apply(raw,doc=document){
 const data=normalize(raw),lang=doc.documentElement.lang==='en'?'en':'ar';
 doc.documentElement.dataset.mmEffects=data.visual.effects;
 for(const item of collect(doc)){
  if(item.type==='text'){
   const value=data.text[item.key]?.[lang];
   if(value){const original=item.node.nodeValue;item.node.nodeValue=(original.match(/^\s*/)||[''])[0]+value+(original.match(/\s*$/)||[''])[0]}
  }else{
   const value=data.attrs[item.key];if(value?.type===item.type)item.element.setAttribute(item.type,value.url);
   if(value?.type==='href'&&/^https:\/\//.test(value.url)){item.element.rel='noopener noreferrer';}
  }
 }
 for(const [key,value] of Object.entries(data.theme))doc.documentElement.style.setProperty('--'+key,value);
 for(const [id,,selector] of sections){
  const el=doc.querySelector(selector);
  if(el&&['proof','statement','services','process','about','contact'].includes(id))el.style.display=data.hiddenSections.includes(id)?'none':'';
 }
 doc.querySelectorAll('.site-cms-buttons').forEach(e=>e.remove());
 for(const [id,,selector] of sections){
  const subset=data.buttons.filter(b=>b.section===id);if(!subset.length)continue;
  const section=doc.querySelector(selector);if(!section)continue;
  const host=id==='header'?section.querySelector('.topbar-actions'):id==='footer'?section.querySelector('.footer-bottom nav'):id==='home'?section.querySelector('.hero-actions'):id==='contact'?section.querySelector('.contact-copy'):section;
  if(!host)continue;
  const bar=doc.createElement('div');bar.className='site-cms-buttons';bar.dataset.section=id;
  for(const item of subset){const a=doc.createElement('a');a.className='site-cms-button '+item.variant;a.href=item.href;a.textContent=(lang==='en'?item.en||item.ar:item.ar||item.en);if(/^https:\/\//.test(item.href)){a.target='_blank';a.rel='noopener noreferrer'}bar.append(a)}
  host.append(bar);
 }
 if(data.seo.title)doc.title=data.seo.title;
 if(data.seo.description){const meta=doc.querySelector('meta[name="description"]');if(meta)meta.content=data.seo.description}
}
root.OMSiteCMS={sections,collect,normalize,apply,validURL};
})(typeof globalThis!=='undefined'?globalThis:this);
