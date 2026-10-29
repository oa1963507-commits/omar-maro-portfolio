(() => {
  'use strict';
  const BEHANCE = 'https://www.behance.net/oa19635079ead';
  const WHATSAPP = '201128791108';
  const SEED = [{ id:'omar-maro-identity', title:'OMAR MARO — الهوية الشخصية', title_en:'OMAR MARO — PERSONAL BRAND', category:'branding', category_label:'الهوية البصرية', year:'2026', cover:'assets/omar-cover.jpg', images:['assets/omar-profile.jpg','assets/omar-cover.jpg'], description:'الهوية الشخصية لمصمم الجرافيك عمر مارو: شعار أحادي اللون قائم على حرف M، ومعالجة بصرية داكنة تستحضر أجواء استوديو التصميم. الصور أصلية ومقدمة من صاحب الهوية.',story:'علامة بسيطة ومميزة تجمع بين الحرف الأول من الاسم والتكوين الهندسي الدائري. الفكرة هي حضور بصري واضح، أبيض وأسود، يبرز وسط التفاصيل بدون ازدحام.',source:'original',url:'' }];
  let projects = [...SEED];
  let featuredIDs=[];
  let caseStudies={};
  let activeFilter = 'all';
  let focusBeforeDialog = null;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const escapeHTML = (s) => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  // Only pure Latin titles get the display face; mixed/Arabic titles retain Cairo.
  const isLatinTitle = value => /[A-Za-z]/.test(String(value ?? '')) && !/[\u0600-\u06FF]/.test(String(value ?? ''));
  const projectHref = p => 'projects/'+encodeURIComponent(p.id)+'/';
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
    return `<img class="${className}" loading="${loading}" fetchpriority="${loading==='eager'?'high':'low'}" decoding="async" src="${escapeHTML(choices[0])}" data-fallbacks="${escapeHTML(choices.slice(1).join('|'))}" alt="${escapeHTML(alt)}">`;
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
    const title=displayTitle(p),category=displayCategory(p);
    const thumbnail=p.cover||p.images?.[0]||'';
    const im=thumbnail?qualityImage(thumbnail,'project-card-image',title,'card'):`<div class="project-image-fallback"><img src="assets/omar-mark.png" alt="" loading="lazy"><span>${escapeHTML(category)}</span></div>`;
    const number=String(index+1).padStart(2,'0');
    return `<a href="${projectHref(p)}" class="project-card reveal" aria-label="${escapeHTML(t('شاهد مشروع ','View project '))}${escapeHTML(title)}"><div class="project-image"><span class="project-card-no">${number}</span>${im}<span class="project-view-link">${escapeHTML(t('عرض المشروع ↗','View project ↗'))}</span></div><div class="project-info"><div><span class="project-category">${escapeHTML(category)}${p.year?' · '+escapeHTML(p.year):''}</span><h3 class="${isLatinTitle(title)?'is-latin':''}">${escapeHTML(title)}</h3></div><span class="project-arrow" aria-hidden="true">↗</span></div></a>`;
  }
  function renderFeaturedProjects(){
    const grid=$('#hero-featured');
    if(!grid)return;
    const selected=projects.filter(p=>p.cover||p.images?.length);
    const explicit=featuredIDs.map(id=>selected.find(p=>p.id===id)).filter(Boolean);
    const featured=explicit.length?explicit.slice(0,3):selected.slice(0,3);
    if(!featured.length){
      grid.innerHTML='<a href="#work" class="showcase-fallback"><img src="assets/omar-cover.jpg" alt="هوية OMAR MARO"></a>';
    } else {
      grid.innerHTML=featured.map((p,i)=>{
        const title=displayTitle(p);
        const cover=p.cover||p.images?.[0]||'';
        const image=qualityImage(cover,'showcase-img',title,'card',i===0?'eager':'lazy');
        return `<a href="${projectHref(p)}" class="showcase-card" aria-label="${escapeHTML(t('مشروع ','Project '))}${escapeHTML(title)}">${image}${i===0?'<span class="showcase-label">FEATURED</span>':''}<span class="showcase-caption${isLatinTitle(title)?' is-latin':''}">${escapeHTML(title)}</span></a>`;
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
    $('#projects-grid').innerHTML=shown.length?shown.map((p,i)=>projectCard(p,i)).join(''):`<div class="empty-state"><strong>${escapeHTML(t("مفيش مشاريع في القسم ده حاليًا.","No projects in this category yet."))}</strong><p>${escapeHTML(t("شوف باقي الأعمال أو تصفّح صفحة Behance.","Browse more work or visit my Behance profile."))}</p><a href="${BEHANCE}" class="underlink" target="_blank" rel="noopener noreferrer">${escapeHTML(t("افتح Behance ↗","Open Behance ↗"))}</a></div>`;
    attachImageFallbacks($('#projects-grid'));
    watch($('#projects-grid'));
  }
  // Preserve full-screen in-page navigation while exposing crawlable public URLs.
  document.addEventListener('click',e=>{
    const anchor=e.target.closest('a.project-card,a.showcase-card');
    if(!anchor||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||anchor.target)return;
    const path=new URL(anchor.href,location.href).pathname;
    const id=decodeURIComponent(path.match(/\/projects\/([a-z0-9-]+)\/?$/)?.[1]||'');
    if(!projects.some(p=>p.id===id))return;
    e.preventDefault();
    location.hash='#project/'+encodeURIComponent(id);
  });
  $('.filter').forEach(btn=>btn.addEventListener('click',()=>{
    activeFilter=btn.dataset.filter;
    $$('.filter').forEach(b=>{const a=b===btn;b.classList.toggle('active',a);b.setAttribute('aria-pressed',String(a));});
    renderProjects();
  }));
  function renderDetail(p){
    const title=displayTitle(p),category=displayCategory(p),description=displayDescription(p),story=displayStory(p);
    const study=caseStudies[p.id]||{};
    const metaItems=[['client','العميل','Client'],['role','دوري','My role'],['services','الخدمات','Services'],['duration','المدة','Duration']]
      .filter(([key])=>typeof study[key]==='string'&&study[key].trim())
      .map(([key,ar,en])=>'<div class="case-fact"><span>'+escapeHTML(t(ar,en))+'</span><strong>'+escapeHTML(study[key])+'</strong></div>').join('');
    const caseFacts=metaItems?'<div class="case-facts">'+metaItems+'</div>':'';
    const caseSections=[['challenge','التحدي','The challenge'],['approach','الفكرة والتنفيذ','The process'],['outcome','النتيجة','The outcome']]
      .filter(([key])=>typeof study[key]==='string'&&study[key].trim())
      .map(([key,ar,en])=>'<section class="case-study-block"><span>'+escapeHTML(t(ar,en))+'</span><p>'+escapeHTML(study[key])+'</p></section>').join('');
    const permanentLink='<a class="case-permalink" href="projects/'+encodeURIComponent(p.id)+'/">'+escapeHTML(t('رابط دائم للمشروع ↗','Project permalink ↗'))+'</a>';
    const images=(p.images||[]).filter(Boolean);
    const hasModules=Array.isArray(p.modules)&&p.modules.length>0;
    const ordered=hasModules?p.modules:images.map(url=>({type:'image',url}));
    const imageTotal=ordered.filter(m=>m.type==='image').length;
    let imageNo=0;
    const gallery=ordered.map(m=>{
      if(m.type==='image'){
        imageNo++;
        const full=imageSources(m.url,'module')[0];
        return `<figure class="case-media"><a data-full-image href="${escapeHTML(full)}" target="_blank" rel="noopener noreferrer" title="${escapeHTML(t('فتح الصورة بدقتها الأصلية','Open full-resolution image'))}">${qualityImage(m.url,'case-full-image',`${title} — ${t('صورة','Image')} ${imageNo}`,'module')}</a><figcaption>${String(imageNo).padStart(2,'0')} / ${String(imageTotal).padStart(2,'0')} · ${escapeHTML(t('افتح الصورة بأعلى دقة متاحة ↗','Open highest available resolution ↗'))}</figcaption></figure>`;
      }
      if(m.type==='text')return `<div class="case-text-module">${escapeHTML(m.text)}</div>`;
      if(m.type==='embed')return `<div class="case-embedded-video"><iframe loading="lazy" src="${escapeHTML(m.url)}" title="${escapeHTML(t('فيديو من مشروع ','Video from project '))}${escapeHTML(title)}" referrerpolicy="strict-origin-when-cross-origin" allow="fullscreen; picture-in-picture" allowfullscreen></iframe></div>`;
      return '';
    }).join('');
    const behanceID=(p.source==='behance'&&p.url?.startsWith('https://')) ? p.url.match(/^https:\/\/(?:www\.)?behance\.net\/gallery\/(\d{3,18})(?:\/|$)/)?.[1] : null;
    const url=p.url?`<a href="${escapeHTML(p.url)}" target="_blank" rel="noopener noreferrer" class="case-cta">${escapeHTML(t('المشروع الأصلي على Behance','Original project on Behance'))} <span>↗</span></a>`:`<a href="${BEHANCE}" target="_blank" rel="noopener noreferrer" class="case-cta">${escapeHTML(t('شوف باقي أعمالي','Explore more of my work'))} <span>↗</span></a>`;
    const summary=ordered.length?`<div class="case-quality-note">${imageTotal} ${t('صورة مستوردة','imported images')}${hasModules?t(' + محتوى المشروع المتاح',' + available project content'):''} · ${t('بدون قص · لو فيه أجزاء ناقصة راجع المشروع الأصلي','uncropped · see the original project for any missing content')}</div>`:p.source==='behance'?`<div class="case-quality-note case-quality-pending">${t('صور هذا المشروع الداخلية لم تُستورد بعد. المعروض غلاف فقط، وتقدر تفتح المشروع الأصلي من الزر أدناه.','The full project images are not imported yet. Only the cover is shown; view the original project below.')}</div>`:'';
    const preview=!ordered.length && behanceID?`<div class="case-official-preview"><p>${t('معاينة Behance الرسمية','Official Behance preview')}</p><iframe loading="lazy" title="${t('معاينة مشروع ','Project preview: ')}${escapeHTML(title)}" src="https://www.behance.net/embed/project/${behanceID}?ilo0=1" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe><small>${t('قد تكون المعاينة مختصرة؛ لعرض كل المحتوى افتح المشروع الأصلي.','This preview may be limited; visit Behance for the full project.')}</small></div>`:'';
    const originalLink=p.source==='behance' && p.url ? `<a class="case-cta case-origin-link" href="${escapeHTML(p.url)}" target="_blank" rel="noopener noreferrer">${t('شاهد المشروع الأصلي كاملًا على Behance ↗','View complete original project on Behance ↗')}</a>` : '';
    const hero=p.cover?qualityImage(p.cover,'case-hero-img',`${t('غلاف','Cover')} ${title}`,'detail','eager'):'';
    return `<div class="case-container"><header class="case-overview"><p class="case-eyebrow">${escapeHTML(category)}${p.year?' / '+escapeHTML(p.year):''}</p><h2 class="case-title${isLatinTitle(title)?' is-latin':''}">${escapeHTML(title)}</h2>${description?`<p class="case-desc">${escapeHTML(description)}</p>`:''}${summary}${caseFacts}${originalLink}</header>${caseSections?'<div class="case-study-details">'+caseSections+'</div>':''}${!ordered.length?hero:''}${preview}${story?`<div class="case-section"><span>${t('THE IDEA / الفكرة','THE IDEA')}</span><p>${escapeHTML(story)}</p></div>`:''}${gallery?`<div class="case-gallery">${gallery}</div>`:''}<div class="case-next"><span class="mono" style="font-size:11px;color:#999">THANKS FOR WATCHING <img class="pen-tool-icon" src="assets/pen-tool.svg?v=bezier-1" width="14" height="14" alt="" aria-hidden="true" loading="lazy"></span>${url}${permanentLink}</div></div>`;
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
  menuBtn.addEventListener('click',()=>{const open=menu.hidden; menu.hidden=!open;menuBtn.setAttribute('aria-expanded',String(open));menuBtn.setAttribute('aria-label',open?t('إغلاق القائمة','Close menu'):t('فتح القائمة','Open menu'));});
  $$('#mobile-nav a').forEach(a=>a.addEventListener('click',()=>{menu.hidden=true;menuBtn.setAttribute('aria-expanded','false');}));

  // Attachments remain in this browser tab until explicitly shared by the visitor.
  // GitHub Pages cannot upload files into a WhatsApp chat via wa.me.
  const projectFiles=$('#project-files');
  const attachmentList=$('#attachment-list');
  const attachmentFeedback=$('#attachment-feedback');
  const shareProjectFiles=$('#share-project-files');
  const picker=$('.attachment-picker');
  const selectedProjectFiles=[];
  const maxAttachmentCount=6;
  const maxAttachmentBytes=20*1024*1024;
  const maxAttachmentTotalBytes=50*1024*1024;
  const fileSizeLabel=bytes=>bytes>=1024*1024?(bytes/(1024*1024)).toFixed(1)+' MB':Math.max(1,Math.ceil(bytes/1024))+' KB';
  const canShareProjectFiles=()=>{
    if(!selectedProjectFiles.length||typeof navigator.share!=='function'||typeof navigator.canShare!=='function')return false;
    try{return navigator.canShare({files:selectedProjectFiles});}catch{return false;}
  };
  function attachmentStatus(ar,en,error=false){
    attachmentFeedback.textContent=t(ar,en);
    attachmentFeedback.classList.toggle('is-error',error);
  }
  function redrawProjectFiles(){
    attachmentList.replaceChildren();
    selectedProjectFiles.forEach((file,index)=>{
      const item=document.createElement('li');
      item.className='attachment-item';
      const glyph=document.createElement('span');glyph.className='attachment-item-icon';glyph.textContent='▤';glyph.setAttribute('aria-hidden','true');
      const details=document.createElement('span');details.className='attachment-info';
      const name=document.createElement('span');name.className='attachment-name';name.textContent=file.name;name.dir='auto';
      const size=document.createElement('span');size.className='attachment-size';size.textContent=fileSizeLabel(file.size);
      details.append(name,size);
      const remove=document.createElement('button');remove.type='button';remove.className='attachment-remove';
      remove.textContent='×';remove.setAttribute('aria-label',t('حذف الملف ','Remove file ')+file.name);
      remove.addEventListener('click',()=>{
        selectedProjectFiles.splice(index,1);
        redrawProjectFiles();
      });
      item.append(glyph,details,remove);attachmentList.append(item);
    });
    shareProjectFiles.hidden=!canShareProjectFiles();
    if(!selectedProjectFiles.length){
      attachmentStatus('','');
    }else if(!shareProjectFiles.hidden){
      attachmentStatus('الملفات جاهزة للمشاركة. افتح واتساب للتفاصيل ثم استخدم زر مشاركة الملفات واختر المحادثة الصحيحة.','Files are ready to share. Open WhatsApp for your brief, then use Share files and select the correct conversation.');
    }else{
      attachmentStatus('الملفات اختيرت على جهازك فقط. بعد فتح واتساب، أرفقها يدويًا في نفس المحادثة.','Files are selected only on your device. After opening WhatsApp, attach them manually in the same chat.');
    }
  }
  function addProjectFiles(list){
    const rejected=[];
    for(const file of Array.from(list||[])){
      if(!(file instanceof File))continue;
      if(selectedProjectFiles.some(existing=>existing.name===file.name&&existing.size===file.size&&existing.lastModified===file.lastModified))continue;
      if(selectedProjectFiles.length>=maxAttachmentCount){
        rejected.push(t('الحد الأقصى 6 ملفات.','Maximum 6 files.'));break;
      }
      if(file.size>maxAttachmentBytes){
        rejected.push(t('الملف أكبر من 20 ميجابايت: ','File exceeds 20 MB: ')+file.name);continue;
      }
      if(selectedProjectFiles.reduce((sum,x)=>sum+x.size,0)+file.size>maxAttachmentTotalBytes){
        rejected.push(t('إجمالي الملفات لا يمكن أن يتجاوز 50 ميجابايت.','Combined files cannot exceed 50 MB.'));break;
      }
      selectedProjectFiles.push(file);
    }
    projectFiles.value='';
    redrawProjectFiles();
    if(rejected.length)attachmentStatus(rejected.join(' '),rejected.join(' '),true);
  }
  projectFiles.addEventListener('change',()=>addProjectFiles(projectFiles.files));
  for(const eventName of ['dragenter','dragover']){
    picker.addEventListener(eventName,e=>{e.preventDefault();picker.classList.add('is-dragging');});
  }
  picker.addEventListener('dragleave',e=>{if(!picker.contains(e.relatedTarget))picker.classList.remove('is-dragging');});
  picker.addEventListener('drop',e=>{
    e.preventDefault();picker.classList.remove('is-dragging');
    addProjectFiles(e.dataTransfer?.files);
  });
  shareProjectFiles.addEventListener('click',async()=>{
    if(!canShareProjectFiles()){
      attachmentStatus('المشاركة المباشرة غير متاحة على الجهاز ده. افتح محادثة واتساب وأرفق الملفات يدويًا.','Direct file sharing is unavailable on this device. Open the WhatsApp chat and attach files manually.',true);
      return;
    }
    try{
      await navigator.share({
        files:[...selectedProjectFiles],
        title:'OMAR MARO — Project references',
        text:t('ملفات مرجعية لمشروع تصميم. اختر محادثة عمر مارو على واتساب قبل الإرسال.','Reference files for a design project. Select Omar Maro’s WhatsApp chat before sending.')
      });
      attachmentStatus('تمت المشاركة من جهازك. راجع المحادثة المختارة للتأكد من وصول الملفات.','Device sharing completed. Check the selected conversation to confirm delivery.');
    }catch(error){
      if(error?.name==='AbortError')attachmentStatus('تم إلغاء المشاركة، والملفات ما زالت مختارة.','Sharing cancelled; your files are still selected.');
      else attachmentStatus('تعذرت المشاركة المباشرة. أرفق الملفات من داخل واتساب يدويًا.','Direct sharing failed. Please attach the files manually in WhatsApp.',true);
    }
  });
  const stepOne=$('#brief-step-one'),stepTwo=$('#brief-step-two');
  function setBriefStep(step){
    const isFirst=step===1;
    stepOne.hidden=!isFirst;stepTwo.hidden=isFirst;
    $('#brief-stage-one').classList.toggle('is-current',isFirst);
    $('#brief-stage-two').classList.toggle('is-current',!isFirst);
    if(!isFirst)stepTwo.querySelector('select, input, textarea')?.focus();
  }
  $('#brief-next').addEventListener('click',()=>{
    const items=['#client-name','#project-type','#client-email'].map(sel=>$(sel));
    for(const el of items){if(!el.checkValidity()){el.reportValidity();el.focus();return;}}
    setBriefStep(2);
  });
  $('#brief-back').addEventListener('click',()=>setBriefStep(1));
  $('#brief-form').addEventListener('submit',e=>{
    e.preventDefault();
    const name=$('#client-name').value.trim(),type=$('#project-type').value,idea=$('#project-description').value.trim();
    if(!name||!type||!idea)return;
    let msg=isEnglish()?'Hi Omar, my name is '+name+'.\n\nProject type: '+type+'\n\nProject brief:\n'+idea+'\n\n(Sent via Omar Maro\'s portfolio website)':'أهلًا عمر، أنا '+name+'.\n\nنوع المشروع: '+type+'\n\nتفاصيل الفكرة:\n'+idea+'\n\n(تم إرسال التفاصيل من موقع Omar Maro)';
    const email=$('#client-email').value.trim();
    const budget=$('#project-budget'),deadline=$('#project-deadline').value;
    const budgetLabel=budget.value?budget.options[budget.selectedIndex]?.textContent.trim():'';
    if(email)msg+=t('\n\nالبريد الإلكتروني: ','\n\nEmail: ')+email;
    if(budgetLabel)msg+=t('\n\nالميزانية المتوقعة: ','\n\nExpected budget: ')+budgetLabel;
    if(deadline)msg+=t('\n\nالموعد المطلوب: ','\n\nRequested date: ')+deadline;
    if(selectedProjectFiles.length){
      const names=selectedProjectFiles.map(file=>'• '+file.name).join('\n');
      msg+=t('\n\nعندي ملفات مرجعية، وسأرسلها منفصلة داخل المحادثة:\n','\n\nI have reference files that I will share separately in the chat:\n')+names;
    }
    window.open('https://wa.me/'+WHATSAPP+'?text='+encodeURIComponent(msg),'_blank','noopener,noreferrer');
    if(selectedProjectFiles.length){
      attachmentStatus('فتحت رسالة واتساب، لكن الملفات لم تُرسل بعد. استخدم مشاركة الملفات أو أرفقها داخل المحادثة.','Your WhatsApp message opened, but the files have NOT been sent. Use Share files or attach them manually in the chat.');
    }
  });

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
      const normalizedSettings=window.OMPortfolioControls?.normalizeControls(settings)||settings;
      featuredIDs=Array.isArray(normalizedSettings.featured)?normalizedSettings.featured:[];
      caseStudies=normalizedSettings.caseStudies||{};
      if(Array.isArray(records)){
        const cleaned=records.map(normalize).filter(Boolean);
        const controls=window.OMPortfolioControls;
        const visible=controls?controls.applyControls(cleaned,settings):cleaned;
        projects=visible.map(normalize).filter(Boolean);
      }
    }catch(e){ /* Local offline preview retains original seed. */ }
    renderFeaturedProjects();renderProjects();route();
  }
  window.addEventListener('om-language-change',()=>{
    redrawProjectFiles();
    renderFeaturedProjects();
    renderProjects();
    const layer=$('#project-view');
    if(layer && !layer.hidden){
      const id=decodeURIComponent(location.hash.replace(/^#project\//,''));
      const p=projects.find(v=>v.id===id);
      if(p){
        const y=layer.scrollTop;
        $('#project-view-content').innerHTML=renderDetail(p);
        attachImageFallbacks($('#project-view-content'));
        layer.scrollTop=y;
      }
    }
    menuBtn.setAttribute('aria-label',menu.hidden?t('فتح القائمة','Open menu'):t('إغلاق القائمة','Close menu'));
  });
  updateProgress();watch();loadProjects();
})();