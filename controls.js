/* OMAR MARO portfolio presentation controls.
 * Public presentation data only; no credentials, authentication, or storage. */
(function(root){
  'use strict';
  const validId = s => typeof s==='string' && /^[a-z0-9-]{2,120}$/.test(s);
  const categories = new Set(['branding','social','covers','print','ai']);
  const categoryLabels={branding:'هويات بصرية',social:'سوشيال ميديا',covers:'أغلفة كتب',print:'مطبوعات',ai:'تصميمات AI'};
  const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
  function cleanMedia(s){
    if(typeof s!=='string'||/[\u0000-\u001f<>"']/g.test(s))return '';
    if(/^assets\/[a-zA-Z0-9_.\/-]+$/.test(s)&&!s.includes('..'))return s;
    try{let u=new URL(s);return u.protocol==='https:'?u.href:'';}catch{return '';}
  }
  function cleanLink(s){try{const u=new URL(s);return u.protocol==='https:'?u.href:'';}catch{return '';}}
  function cleanText(s,max){return String(s??'').trim().slice(0,max);}
  function cleanIDs(items){return [...new Set((Array.isArray(items)?items:[]).filter(validId))].slice(0,1000);}
  function cleanProject(p){
    if(!p||!validId(p.id)||!p.id.startsWith('manual-'))return null;
    const title=cleanText(p.title,160);
    if(!title)return null;
    const category=categories.has(p.category)?p.category:'social';
    const images=(Array.isArray(p.images)?p.images:[]).slice(0,120).map(cleanMedia).filter(Boolean);
    const cover=cleanMedia(p.cover)||images[0]||'';
    return {id:p.id,source:'manual',title,title_en:cleanText(p.title_en,160),category,category_label:categoryLabels[category],year:cleanText(p.year,12),description:cleanText(p.description,1500),cover,images,modules:images.map(url=>({type:'image',url})),url:cleanLink(p.url||'')};
  }
  function cleanCaseStudy(value){
    const v=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
    const result={};
    for(const [key,max] of [['client',100],['role',120],['services',180],['duration',80],['challenge',1400],['approach',1400],['outcome',1400]]){
      const val=cleanText(v[key],max);
      if(val)result[key]=val;
    }
    return result;
  }
  // Testimonials are opt-in. Neither the review nor the image becomes
  // public without separate explicit owner attestations of client consent.
  function cleanTestimonial(v){
    if(!v||typeof v!=='object'||Array.isArray(v))return null;
    const id=cleanText(v.id,100);
    if(!/^review-[a-z0-9-]{3,93}$/.test(id))return null;
    const brand=cleanText(v.brand,100),quote=cleanText(v.quote,800);
    if(!brand||!quote)return null;
    const consent=v.consent===true,approved=v.approved===true;
    const imageConsent=v.imageConsent===true;
    const image=cleanMedia(v.image||'');
    const projectId=validId(v.projectId)?v.projectId:'';
    return {id,brand,brand_en:cleanText(v.brand_en,100),
      quote,quote_en:cleanText(v.quote_en,800),
      projectId,image:imageConsent?image:'',imageConsent,
      consent,approved};
  }
  function normalizeControls(v){
    const raw=v && typeof v==='object' && !Array.isArray(v)?v:{};
    const order=cleanIDs(raw.order), hidden=cleanIDs(raw.hidden), excluded=cleanIDs(raw.excluded);
    const overrides={};
    if(raw.overrides&&typeof raw.overrides==='object'&&!Array.isArray(raw.overrides)){
      for(const [id,r] of Object.entries(raw.overrides).slice(0,1000)){
        if(!validId(id)||!r||typeof r!=='object'||Array.isArray(r))continue;
        const edit={};
        if(typeof r.title==='string')edit.title=cleanText(r.title,160);
        if(typeof r.title_en==='string')edit.title_en=cleanText(r.title_en,160);
        if(typeof r.category==='string'&&categories.has(r.category)){edit.category=r.category;edit.category_label=categoryLabels[r.category];}
        if(typeof r.cover==='string')edit.cover=cleanMedia(r.cover);
        if(typeof r.description==='string')edit.description=cleanText(r.description,1500);
        if(typeof r.year==='string')edit.year=cleanText(r.year,12);
        if(typeof r.url==='string')edit.url=cleanLink(r.url);
        if(Object.keys(edit).length)overrides[id]=edit;
      }
    }
    const featured=cleanIDs(raw.featured).slice(0,3);
    const caseStudies={};
    if(raw.caseStudies&&typeof raw.caseStudies==='object'&&!Array.isArray(raw.caseStudies)){
      for(const [id,v] of Object.entries(raw.caseStudies).slice(0,1000)){
        if(!validId(id))continue;
        const clean=cleanCaseStudy(v);
        if(Object.keys(clean).length)caseStudies[id]=clean;
      }
    }
    const testimonials=[],testimonialIDs=new Set();
    for(const item of (Array.isArray(raw.testimonials)?raw.testimonials:[]).slice(0,80)){
      const clean=cleanTestimonial(item);
      if(clean&&!testimonialIDs.has(clean.id)){testimonialIDs.add(clean.id);testimonials.push(clean);}
    }
    const customProjects=[];
    const seen=new Set();
    for(const p of (Array.isArray(raw.customProjects)?raw.customProjects:[]).slice(0,500)){
      const cleaned=cleanProject(p);
      if(cleaned&&!seen.has(cleaned.id)){seen.add(cleaned.id);customProjects.push(cleaned);}
    }
    return {version:1,order,hidden,excluded,overrides,customProjects,featured,caseStudies,testimonials,siteContent:root.OMSiteCMS?root.OMSiteCMS.normalize(raw.siteContent):raw.siteContent||{}};
  }
  function applyControls(source, config){
    const c=normalizeControls(config);
    const excluded=new Set(c.excluded),hidden=new Set(c.hidden),items=[],seen=new Set();
    for(const item of [...(Array.isArray(source)?source:[]),...c.customProjects]){
      if(!item||!validId(item.id)||seen.has(item.id)||excluded.has(item.id)||hidden.has(item.id))continue;
      seen.add(item.id);
      const override=own(c.overrides,item.id)?c.overrides[item.id]:null;
      items.push(override?{...item,...override}:item);
    }
    const positions=new Map(c.order.map((id,i)=>[id,i]));
    // New projects not in a saved order appear first, without changing previously pinned order.
    return items.map((p,index)=>({p,index})).sort((a,b)=>{
      const aPos=positions.has(a.p.id)?positions.get(a.p.id):Number.MAX_SAFE_INTEGER;
      const bPos=positions.has(b.p.id)?positions.get(b.p.id):Number.MAX_SAFE_INTEGER;
      return aPos===bPos?a.index-b.index:aPos-bPos;
    }).map(x=>x.p);
  }
  const api={normalizeControls,applyControls,cleanMedia,cleanProject,cleanTestimonial,categoryLabels};
  root.OMPortfolioControls=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);