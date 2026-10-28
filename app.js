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
  function safeMediaUrl(s) {
    if (typeof s !== 'string') return '';
    const value = s.trim();
    if (/^(?:assets\/|https:\/\/)/i.test(value) && !/[\x00-\x1f<>"']/g.test(value)) return value;
    return '';
  }
  function safeExternal(s) { try {const u=new URL(s); return u.protocol === 'https:' ? u.href : '';} catch{return '';} }
  function normalize(p) {
    if (!p || typeof p !== 'object' || !/^[a-z0-9-]{2,120}$/.test(String(p.id||''))) return null;
    return {id:p.id,title:String(p.title||'بدون عنوان'),title_en:String(p.title_en||p.title||''),category:['branding','social','covers','print','ai'].includes(p.category)?p.category:'social',category_label:String(p.category_label||'مشروع إبداعي'),year:String(p.year||''),cover:safeMediaUrl(p.cover),images:Array.isArray(p.images)?p.images.map(safeMediaUrl).filter(Boolean).slice(0,30):[],description:String(p.description||''),story:String(p.story||''),source:String(p.source||''),url:safeExternal(p.url||'')};
  }
  const watch = (root=document) => {
    const els = root.querySelectorAll('.reveal:not(.show)');
    if(!('IntersectionObserver' in window)){els.forEach(el=>el.classList.add('show'));return;}
    const ob = new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('show');ob.unobserve(e.target);}})},{threshold:.1,rootMargin:'0px 0px 35px 0px'});
    els.forEach(el=>ob.observe(el));
  };
  function projectCard(p){
    const im=p.cover?`<img loading="lazy" src="${escapeHTML(p.cover)}" alt="${escapeHTML(p.title)}">`:`<div class="project-image-fallback">OM / ${escapeHTML(p.category_label)}</div>`;
    return `<a href="#project/${encodeURIComponent(p.id)}" class="project-card reveal"><div class="project-image">${im}<span class="project-view-link">عرض دراسة الحالة ↗</span></div><div class="project-info"><div><span class="project-category">${escapeHTML(p.category_label)} · ${escapeHTML(p.year)}</span><h3>${escapeHTML(p.title)}</h3></div><span class="project-arrow">↗</span></div></a>`;
  }
  function renderProjects(){
    const shown = projects.filter(p=>activeFilter === 'all' || p.category === activeFilter);
    $('#total-projects').textContent=String(projects.length).padStart(2,'0');
    $('#projects-grid').innerHTML=shown.length? shown.map(projectCard).join('') : `<div class="empty-state"><strong>قريبًا في القسم ده.</strong><p>مشاريع التصنيف ده هتظهر لما نضيفها لمصدر الموقع. لحد وقتها تقدر تشوف باقي الأعمال على Behance.</p><a href="${BEHANCE}" class="underlink" target="_blank" rel="noopener noreferrer">افتح Behance ↗</a></div>`;
    watch($('#projects-grid'));
  }
  $$('.filter').forEach(btn=>btn.addEventListener('click',()=>{
    activeFilter=btn.dataset.filter;
    $$('.filter').forEach(b=>{const a=b===btn;b.classList.toggle('active',a);b.setAttribute('aria-pressed',String(a));});
    renderProjects();
  }));
  function renderDetail(p){
    const gallery = (p.images||[]).map(im=>`<img src="${escapeHTML(im)}" alt="صور مشروع ${escapeHTML(p.title)}" loading="lazy">`).join('');
    const behanceID=(p.source==='behance'&&p.url?.startsWith('https://')) ? p.url.match(/^https:\/\/(?:www\.)?behance\.net\/gallery\/(\d{3,18})(?:\/|$)/)?.[1] : null;
    const behanceEmbed=behanceID?`<div class="case-behance"><div class="case-embed-heading"><span>FULL PROJECT / المشروع الكامل</span><p>عرض المشروع الأصلي من Behance داخل صفحة خاصة به على الموقع.</p></div><iframe loading="lazy" title="مشروع ${escapeHTML(p.title)} على Behance" src="https://www.behance.net/embed/project/${behanceID}?ilo0=1" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe><p class="case-embed-note">إذا لم يظهر العرض المدمج، افتح المشروع من الزر بالأسفل.</p></div>`:'';
    const url=p.url?`<a href="${escapeHTML(p.url)}" target="_blank" rel="noopener noreferrer" class="case-cta">المشروع على Behance <span>↗</span></a>`:`<a href="${BEHANCE}" target="_blank" rel="noopener noreferrer" class="case-cta">شوف باقي أعمالي <span>↗</span></a>`;
    return `<div class="case-container"><p class="case-eyebrow">${escapeHTML(p.category_label)} / ${escapeHTML(p.year)}</p><h2 class="case-title">${escapeHTML(p.title)}</h2><p class="case-desc">${escapeHTML(p.description)}</p>${p.cover?`<img class="case-hero-img" src="${escapeHTML(p.cover)}" alt="غلاف مشروع ${escapeHTML(p.title)}">`:''}<div class="case-section"><span>THE IDEA / الفكرة</span><p>${escapeHTML(p.story || p.description || 'كل مشروع له قصته وطريقته في العرض.')}</p></div>${gallery?`<div class="case-gallery">${gallery}</div>`:''}${behanceEmbed}<div class="case-next"><span class="mono" style="font-size:11px;color:#999">THANKS FOR WATCHING ✳</span>${url}</div></div>`;
  }
  function openProject(id){
    const p=projects.find(x=>x.id===id);
    if(!p){window.location.hash='#work';return;}
    const layer=$('#project-view'); focusBeforeDialog=document.activeElement;
    $('#project-view-content').innerHTML=renderDetail(p);layer.hidden=false;
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
    // Static site: data/projects.json is the authoritative catalog. Updated automatically by your configured sync pipeline.
    try{ const r=await fetch('data/projects.json',{cache:'no-store'});if(!r.ok)throw Error('catalog request failed');const j=await r.json();if(Array.isArray(j)){const clean=j.map(normalize).filter(Boolean);if(clean.length)projects=clean;}}
    catch(e){ /* Local file:// preview keeps bundled seed without network dependency. */ }
    renderProjects();route();
  }
  updateProgress();watch();loadProjects();
})();