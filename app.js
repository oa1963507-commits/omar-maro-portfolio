(() => {
  'use strict';
  const BEHANCE = 'https://www.behance.net/oa19635079ead';
  const WHATSAPP = '201128791108';
  const SEED = [{ id:'omar-maro-identity', title:'OMAR MARO — الهوية الشخصية', title_en:'OMAR MARO — PERSONAL BRAND', category:'branding', category_label:'الهوية البصرية', year:'2026', cover:'assets/omar-cover.jpg', images:['assets/omar-profile.jpg','assets/omar-cover.jpg'], description:'الهوية الشخصية لمصمم الجرافيك عمر مارو: شعار أحادي اللون قائم على حرف M، ومعالجة بصرية داكنة تستحضر أجواء استوديو التصميم. الصور أصلية ومقدمة من صاحب الهوية.',story:'علامة بسيطة ومميزة تجمع بين الحرف الأول من الاسم والتكوين الهندسي الدائري. الفكرة هي حضور بصري واضح، أبيض وأسود، يبرز وسط التفاصيل بدون ازدحام.',source:'original',url:'' }];
  let projects = [...SEED];
  let activeFilter = 'all';
  let focusBeforeDialog = null;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const escapeHTML = (s) => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  // Only pure Latin titles get the display face; mixed/Arabic titles retain Cairo.
  const isLatinTitle = value => /[A-Za-z]/.test(String(value ?? '')) && !/[\u0600-\u06FF]/.test(String(value ?? ''));
  const isEnglish = () => window.OMI18N?.lang === 'en';
  const t = (ar,en) => isEnglish()?en:ar;
  const displayTitle = p => (isEnglish() && p.title_en && p.title_en.trim() ? p.title_en : p.title);
  const displayCategory = p => isEnglish()?({branding:'Brand identity',social:'Social media & design',covers:'Book covers',print:'Print design',ai:'Creative AI visuals'}[p.category]||p.category_label):p.category_label;
  const originalIdentityDescription='The personal identity of graphic designer Omar Maro: a monochrome M-based mark and a dark creative-studio aesthetic. All visuals are original work provided by the designer.';
  const originalIdentityStory='A simple, recognizable symbol inspired by the first letter of the name and a circular geometric composition. Its goal is a clear black-and-white visual presence without clutter.';
  const displayDescription = p => isEnglish()?(p.description_en|| (p.id==='omar-maro-identity'?originalIdentityDescription:p.description)) : p.description;
  const displayStory = p => isEnglish()?(p.story_en||(p.id==='omar-maro-identity'?originalIdentityStory:p.story)) : p.story;
  function safeMediaUrl(s) {
    if (typeof s !== 'string') return '';
    const value = s.trim();
    if (/^(?:assets\/|https:\/\/)/i.test(value) && !/[\x00-\x1f<>"']/g.test(value)) return value;
    return '';
  }
  function safeExternal(s) { try {const u=new URL(s); return u.protocol === 'https:' ? u.href : '';} catch{return '';} }
  function normalizeModule(m) {
    if (!m || typeof m !== 'object') return null;
    if (m.type === 'image') { const url = safeMediaUrl(m.url); return url ? {type:'image',url} : null; }
    if (m.type === 'text') { const text=String(m.text||'').slice(0,7000); return text.trim()?{type:'text',text}:null; }
    if (m.type === 'embed') {
      const url=safeExternal(m.url);
      if (!url) return null;
      const hostname=new URL(url).hostname;
      if (!['player.vimeo.com','www.youtube.com','www.youtube-nocookie.com','youtube.com'].includes(hostname))return null;
      return {type:'embed',url};
    }
    return null;
  }
  function normalize(p) {
    if (!p || typeof p !== 'object' || !/^[a-z0-9-]{2,120}$/.test(String(p.id||''))) return null;
    return {id:p.id,title:String(p.title||'بدون عنوان'),title_en:String(p.title_en||p.title||''),category:['branding','social','covers','print','ai'].includes(p.category)?p.category:'social',category_label:String(p.category_label||'مشروع إبداعي'),year:String(p.year||''),cover:safeMediaUrl(p.cover),images:Array.isArray(p.images)?p.images.map(safeMediaUrl).filter(Boolean).slice(0,120):[],modules:Array.isArray(p.modules)?p.modules.map(normalizeModule).filter(Boolean).slice(0,120):[],description:String(p.description||''),description_en:String(p.description_en||''),story:String(p.story||''),story_en:String(p.story_en||''),source:String(p.source||''),url:safeExternal(p.url||'')};
  }
  // Prefer Behance's larger public CDN variants; retain lower-res URLs as fallbacks.
  function imageSources(raw, kind='module') {
    const src=safeMediaUrl(raw);
    if(!src)return [];
    const candidates=[];
    const add=s=>{if(s && !candidates.includes(s))candidates.push(s);};
    if (/\/projects\/(?:404|max_808|max_808_webp|original)\//i.test(src)) {
      add(src.replace(/\/projects\/(?:404|max_808|max_808_webp|original)\//i, kind==='card'?'/projects/max_808_webp/':'/projects/original/'));
      add(src.replace(/\/projects\/(?:404|max_808|max_808_webp|original)\//i,'/projects/max_808_webp/'));
      add(src.replace(/\/projects\/(?:404|max_808|max_808_webp|original)\//i,'/projects/max_808/'));
    } else if (/\/project_modules\/[a-z0-9_-]+\//i.test(src)) {
      add(src.replace(/\/project_modules\/[a-z0-9_-]+\//i,'/project_modules/source/'));
      add(src.replace(/\/project_modules\/[a-z0-9_-]+\//i,'/project_modules/fs/'));
      add(src.replace(/\/project_modules\/[a-z0-9_-]+\//i,'/project_modules/max_1200/'));
    }
    add(src);
    return candidates;
  }
  function qualityImage(raw, className, alt, kind='module', loading='lazy') {
    const choices=imageSources(raw,kind);
    if(!choices.length)return '';
    return `<img class="${className}" loading="${loading}" decoding="async" src="${escapeHTML(choices[0])}" data-fallbacks="${escapeHTML(choices.slice(1).join('|'))}" alt="${escapeHTML(alt)}">`;
  }
  function attachImageFallbacks(scope=document) {
    scope.querySelectorAll('img[data-fallbacks]').forEach(img=>{
      let choices=img.dataset.fallbacks.split('|').filter(Boolean);
      img.addEventListener('error',()=>{
        if(choices.length)img.src=choices.shift();
        else {
          img.classList.add('image-unavailable');
          const link=img.closest('a[data-full-image]');
          if(link)link.removeAttribute('href');
        }
      });
      img.addEventListener('load',()=>{
        const link=img.closest('a[data-full-image]');
        if(link)link.href=img.currentSrc||img.src;
      });
    });
  }
  const watch = (root=document) => {
    const els = root.querySelectorAll('.reveal:not(.show)');
    if(!('IntersectionObserver' in window)){els.forEach(el=>el.classList.add('show'));return;}
    const ob = new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('show');ob.unobserve(e.target);}})},{threshold:.1,rootMargin:'0px 0px 35px 0px'});
    els.forEach(el=>ob.observe(el));
  };

  function projectCard(p,index){
    const thumbnail=p.cover||p.images?.[0]||'';
    const im=thumbnail?qualityImage(thumbnail,'project-card-image',p.title,'card'):`<div class="project-image-fallback"><img src="assets/omar-mark.png" alt="" loading="lazy"><span>${escapeHTML(p.category_label)}</span></div>`;
    const number=String(index+1).padStart(2,'0');
    return `<a href="#project/${encodeURIComponent(p.id)}" class="project-card reveal" aria-label="شاهد مشروع ${escapeHTML(p.title)}"><div class="project-image"><span class="project-card-no">${number}</span>${im}<span class="project-view-link">عرض المشروع ↗</span></div><div class="project-info"><div><span class="project-category">${escapeHTML(p.category_label)}${p.year?' · '+escapeHTML(p.year):''}</span><h3 class="${isLatinTitle(p.title)?'is-latin':''}">${escapeHTML(p.title)}</h3></div><span class="project-arrow" aria-hidden="true">↗</span></div></a>`;
  }
  function renderFeaturedProjects(){
    const grid=$('#hero-featured');
    if(!grid)return;
    const selected=projects.filter(p=>p.cover||p.images?.length).slice(0,3);
    if(!selected.length){
      grid.innerHTML='<a href="#work" class="showcase-fallback"><img src="assets/omar-cover.jpg" alt="هوية OMAR MARO"></a>';
    } else {
      grid.innerHTML=selected.map((p,i)=>{
        const cover=p.cover||p.images?.[0]||'';
        const image=qualityImage(cover,'showcase-img',p.title,'card',i===0?'eager':'lazy');
        return `<a href="#project/${encodeURIComponent(p.id)}" class="showcase-card" aria-label="مشروع ${escapeHTML(p.title)}">${image}${i===0?'<span class="showcase-label">FEATURED</span>':''}<span class="showcase-caption${isLatinTitle(p.title)?' is-latin':''}">${escapeHTML(p.title)}</span></a>`;
      }).join('');
    }
    attachImageFallbacks(grid);
    const count=$('#metric-projects'), images=$('#metric-images');
    if(count)count.textContent=String(projects.length).padStart(2,'0');
    if(images)images.textContent=String(projects.reduce((n,p)=>n+(p.images?.length||0),0)).padStart(2,'0');
  }
  function renderProjects(){
    const shown = projects.filter(p=>activeFilter === 'all' || p.category === activeFilter);
    $('#total-projects').textContent=String(projects.length).padStart(2,'0');
    $('#projects-grid').innerHTML=shown.length?shown.map((p,i)=>projectCard(p,i)).join(''):`<div class="empty-state"><strong>مفيش مشاريع في القسم ده حاليًا.</strong><p>شوف باقي الأعمال أو تصفّح صفحة Behance.</p><a href="${BEHANCE}" class="underlink" target="_blank" rel="noopener noreferrer">افتح Behance ↗</a></div>`;
    attachImageFallbacks($('#projects-grid'));
    watch($('#projects-grid'));
  }
  $$('.filter').forEach(btn=>btn.addEventListener('click',()=>{
    activeFilter=btn.dataset.filter;
    $$('.filter').forEach(b=>{const a=b===btn;b.classList.toggle('active',a);b.setAttribute('aria-pressed',String(a));});
    renderProjects();
  }));
  function renderDetail(p){
    const images=(p.images||[]).filter(Boolean);
    const hasModules=Array.isArray(p.modules)&&p.modules.length>0;
    const ordered=hasModules?p.modules:images.map(url=>({type:'image',url}));
    const imageTotal=ordered.filter(m=>m.type==='image').length;
    let imageNo=0;
    const gallery=ordered.map(m=>{
      if(m.type==='image'){
        imageNo++;
        const full=imageSources(m.url,'module')[0];
        return `<figure class="case-media"><a data-full-image href="${escapeHTML(full)}" target="_blank" rel="noopener noreferrer" title="فتح الصورة بدقتها الأصلية">${qualityImage(m.url,'case-full-image',`${p.title} — صورة ${imageNo}`,'module')}</a><figcaption>${String(imageNo).padStart(2,'0')} / ${String(imageTotal).padStart(2,'0')} · افتح الصورة بأعلى دقة متاحة ↗</figcaption></figure>`;
      }
      if(m.type==='text')return `<div class="case-text-module">${escapeHTML(m.text)}</div>`;
      if(m.type==='embed')return `<div class="case-embedded-video"><iframe loading="lazy" src="${escapeHTML(m.url)}" title="فيديو من مشروع ${escapeHTML(p.title)}" referrerpolicy="strict-origin-when-cross-origin" allow="fullscreen; picture-in-picture" allowfullscreen></iframe></div>`;
      return '';
    }).join('');
    const behanceID=(p.source==='behance'&&p.url?.startsWith('https://')) ? p.url.match(/^https:\/\/(?:www\.)?behance\.net\/gallery\/(\d{3,18})(?:\/|$)/)?.[1] : null;
    const url=p.url?`<a href="${escapeHTML(p.url)}" target="_blank" rel="noopener noreferrer" class="case-cta">المشروع الأصلي على Behance <span>↗</span></a>`:`<a href="${BEHANCE}" target="_blank" rel="noopener noreferrer" class="case-cta">شوف باقي أعمالي <span>↗</span></a>`;
    const summary=ordered.length?`<div class="case-quality-note">${imageTotal} صورة مستوردة${hasModules?' + محتوى المشروع المتاح':''} · بدون قص · لو فيه أجزاء ناقصة راجع المشروع الأصلي</div>`:p.source==='behance'?`<div class="case-quality-note case-quality-pending">صور هذا المشروع الداخلية لم تُستورد بعد. المعروض غلاف فقط، وتقدر تفتح المشروع الأصلي من الزر أدناه.</div>`:'';
    const preview=!ordered.length && behanceID?`<div class="case-official-preview"><p>معاينة Behance الرسمية</p><iframe loading="lazy" title="معاينة مشروع ${escapeHTML(p.title)}" src="https://www.behance.net/embed/project/${behanceID}?ilo0=1" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe><small>قد تكون المعاينة مختصرة؛ لعرض كل المحتوى افتح المشروع الأصلي.</small></div>`:'';
    const originalLink=p.source==='behance' && p.url ? `<a class="case-cta case-origin-link" href="${escapeHTML(p.url)}" target="_blank" rel="noopener noreferrer">شاهد المشروع الأصلي كاملًا على Behance ↗</a>` : '';
    const hero=p.cover?qualityImage(p.cover,'case-hero-img',`غلاف ${p.title}`,'detail','eager'):'';
    return `<div class="case-container"><header class="case-overview"><p class="case-eyebrow">${escapeHTML(p.category_label)}${p.year?' / '+escapeHTML(p.year):''}</p><h2 class="case-title${isLatinTitle(p.title)?' is-latin':''}">${escapeHTML(p.title)}</h2>${p.description?`<p class="case-desc">${escapeHTML(p.description)}</p>`:''}${summary}${originalLink}</header>${!ordered.length?hero:''}${preview}${p.story?`<div class="case-section"><span>THE IDEA / الفكرة</span><p>${escapeHTML(p.story)}</p></div>`:''}${gallery?`<div class="case-gallery">${gallery}</div>`:''}<div class="case-next"><span class="mono" style="font-size:11px;color:#999">THANKS FOR WATCHING ✳</span>${url}</div></div>`;
  }
  function openProject(id){
    const p=projects.find(x=>x.id===id);
    if(!p){window.location.hash='#work';return;}
    const layer=$('#project-view'); focusBeforeDialog=document.activeElement;
    $('#project-view-content').innerHTML=renderDetail(p);attachImageFallbacks($('#project-view-content'));layer.hidden=false;
    document.body.classList.add('locked');layer.scrollTop=0;
    layer.querySelector('.close-project').focus();
    document.title=`${p.title} — OMAR MARO`;
  }
  function closeProject(){ const layer=$('#project-view');if(layer.hidden)return;layer.hidden=true;document.body.classList.remove('locked');document.title='OMAR MARO — Creative Portfolio'; if(focusBeforeDialog instanceof HTMLElement && focusBeforeDialog.isConnected)focusBeforeDialog.focus();}
  function route(){ const hash=decodeURIComponent(location.hash.replace(/^#/,''));if(hash.startsWith('project/'))openProject(hash.slice(8));else closeProject(); }
  window.addEventListener('hashchange',route);
  window.addEventListener('keydown',(e)=>{const layer=$('#project-view');if(e.key==='Escape' && !layer.hidden)location.hash='#work';if(e.key==='Tab' && !layer.hidden){const links=[...layer.querySelectorAll('a,button,[tabindex]:not([tabindex="-1"])')].filter(el=>!el.disabled);if(!links.length)return;const first=links[0],last=links[links.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
  const menuBtn=$('#menu-toggle'), menu=$('#mobile-nav');
  menuBtn.addEventListener('click',()=>{const open=menu.hidden; menu.hidden=!open;menuBtn.setAttribute('aria-expanded',String(open));menuBtn.setAttribute('aria-label',open?'إغلاق القائمة':'فتح القائمة');});
  $$('#mobile-nav a').forEach(a=>a.addEventListener('click',()=>{menu.hidden=true;menuBtn.setAttribute('aria-expanded','false');}));
  $('#brief-form').addEventListener('submit',e=>{e.preventDefault();const name=$('#client-name').value.trim(),type=$('#project-type').value,idea=$('#project-description').value.trim();if(!name||!type||!idea)return;const msg=`أهلًا عمر، أنا ${name}.\n\nنوع المشروع: ${type}\n\nتفاصيل الفكرة:\n${idea}\n\n(تم إرسال التفاصيل من موقع Omar Maro)`;window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`,'_blank','noopener,noreferrer');});
  function updateProgress(){const d=document.documentElement;let x=(d.scrollTop/(d.scrollHeight-d.clientHeight))*100;$('#progress').style.width=`${Math.max(0,Math.min(100,x||0))}%`;}
  window.addEventListener('scroll',updateProgress,{passive:true});
  $('#year').textContent=new Date().getFullYear();
  async function loadProjects(){
    // Behance catalog and owner-authored presentation settings are separate.
    // Visibility/order/deletion survive all future automatic Behance imports.
    try{
      const [catalogResponse,settingsResponse]=await Promise.all([
        fetch('data/projects.json',{cache:'no-store'}),
        fetch('data/site-controls.json',{cache:'no-store'})
      ]);
      if(!catalogResponse.ok)throw Error('catalog request failed');
      const records=await catalogResponse.json();
      const settings=settingsResponse.ok?await settingsResponse.json():{};
      if(Array.isArray(records)){
        const cleaned=records.map(normalize).filter(Boolean);
        const controls=window.OMPortfolioControls;
        const visible=controls?controls.applyControls(cleaned,settings):cleaned;
        projects=visible.map(normalize).filter(Boolean);
      }
    }catch(e){ /* Local offline preview retains original seed. */ }
    renderFeaturedProjects();renderProjects();route();
  }
  updateProgress();watch();loadProjects();
})();