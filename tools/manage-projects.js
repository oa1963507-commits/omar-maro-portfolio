/* Browser-only owner admin. A repository-scoped PAT lives in RAM only.
 * No localStorage, cookies, analytics, GitHub OAuth redirection, or token logging. */
(()=>{
'use strict';
const OWNER='oa1963507-commits',REPO='omar-maro-portfolio',BRANCH='main',CONFIG='data/site-controls.json';
const API=`https://api.github.com/repos/${OWNER}/${REPO}`;
const controls=globalThis.OMPortfolioControls;
const $=id=>document.getElementById(id);
let token='',sha='',catalog=[],settings=controls.normalizeControls({}),order=[],dirty=false,busy=false,editorId=null,noticeTimeout=null;
const mediaCategories=controls.categoryLabels;
function inform(msg,error=false){const el=$('message');el.hidden=false;el.className='message '+(error?'error':'ok');el.textContent=msg;clearTimeout(noticeTimeout);noticeTimeout=setTimeout(()=>el.hidden=true,9000);}
function lock(flag){busy=flag;$('publishBtn').disabled=flag;$('addButton').disabled=flag;$('saveProject').disabled=flag;$('connectBtn').disabled=flag;}
function apiHeaders(){return {'Accept':'application/vnd.github+json','Authorization':'Bearer '+token};}
async function api(path,opts={}){
 const response=await fetch(path.startsWith('https://')?path:API+path,{...opts,headers:{...apiHeaders(),...(opts.headers||{})},cache:'no-store'});
 if(!response.ok){const reason=await response.json().catch(()=>({}));let desc=reason?.message||'GitHub request failed';if(response.status===401)desc='المفتاح غير صحيح أو انتهت صلاحيته';if(response.status===403)desc='المفتاح مش عنده صلاحية كتابة على المستودع أو وصل لحد الطلبات';if(response.status===409)desc='في تعديل أحدث على GitHub. حدّث بيانات اللوحة الأول قبل الحفظ';if(response.status===422)desc='GitHub رفض الملف. تحقق من الصيغة والصلاحيات';throw Error(desc+' (HTTP '+response.status+')');}
 return response.json();
}
function textToBase64(text){const bytes=new TextEncoder().encode(text);let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(binary);}
function base64ToText(value){const bin=atob(value.replace(/\s/g,'')),bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);return new TextDecoder().decode(bytes);}
async function readRepoFile(path){const d=await api('/contents/'+path+'?ref='+BRANCH);return {sha:d.sha,value:JSON.parse(base64ToText(d.content))};}
async function load(){const [file,projects]=await Promise.all([readRepoFile(CONFIG),readRepoFile('data/projects.json')]);sha=file.sha;settings=controls.normalizeControls(file.value);catalog=projects.value;if(!Array.isArray(catalog))throw Error('ملف المشاريع الرئيسي غير صالح');
 const all=allProjects();order=[...new Set([...settings.order.filter(id=>all.some(p=>p.id===id)),...all.map(p=>p.id)])];dirty=false;render();}
function allProjects(){const m=new Map();for(const p of [...catalog,...settings.customProjects]){if(p?.id&&!m.has(p.id))m.set(p.id,p);}return [...m.values()];}
function orderedProjects(){const m=new Map(allProjects().map(p=>[p.id,p]));return order.map(id=>m.get(id)).filter(Boolean).concat([...m.values()].filter(p=>!order.includes(p.id)));}
function markDirty(){dirty=true;$('publishBtn').textContent='نشر التعديلات ●';}
function getRecord(p){const override=settings.overrides[p.id]||{};return {...p,...override};}
function labelFor(p){return p.source==='behance'?'متزامن مع Behance':p.source==='manual'?'مشروع مضاف يدويًا':'مشروع الهوية';}
function createAction(text,action,id,cls='',title=''){const b=document.createElement('button');b.type='button';b.textContent=text;b.dataset.action=action;b.dataset.id=id;if(cls)b.className=cls;if(title)b.title=title;return b;}
function render(){const all=orderedProjects(),removed=new Set(settings.excluded),hidden=new Set(settings.hidden);const visible=all.filter(p=>!removed.has(p.id)&&!hidden.has(p.id));
 $('countAll').textContent=String(all.length);$('countVisible').textContent=String(visible.length);$('countHidden').textContent=String(all.filter(p=>hidden.has(p.id)&&!removed.has(p.id)).length);$('countExcluded').textContent=String(all.filter(p=>removed.has(p.id)).length);
 const view=$('viewFilter').value,term=$('projectSearch').value.trim().toLowerCase();
 const featuredNames=settings.featured.map(id=>getRecord(all.find(p=>p.id===id)||{title:id}).title).filter(Boolean);
 $('featuredSummary').textContent='المشاريع المميزة ('+settings.featured.length+'/3): '+(featuredNames.join(' • ')||'لم يتم اختيار مشاريع مميزة بعد');const list=$('projectList');list.replaceChildren();
 const shown=all.filter(p=>{const isRemoved=removed.has(p.id),isHidden=hidden.has(p.id);if(view==='active'&&(isRemoved||isHidden))return false;if(view==='hidden'&&(!isHidden||isRemoved))return false;if(view==='featured'&&(!settings.featured.includes(p.id)||isRemoved))return false;if(view==='excluded'&&!isRemoved)return false;return !term||getRecord(p).title?.toLowerCase().includes(term);});
 if(!shown.length){const el=document.createElement('p');el.className='empty';el.textContent='مفيش مشاريع مطابقة للبحث ده.';list.append(el);return;}
 for(const p of shown){const state=removed.has(p.id)?'excluded':hidden.has(p.id)?'hidden':'active';const project=getRecord(p),item=document.createElement('div');item.className='item'+(state==='active'?'':' inactive');item.dataset.id=p.id;item.draggable=state==='active'&&!term&&view==='active';
 const handle=document.createElement('span');handle.className='handle';handle.textContent='⋮⋮';handle.title='اسحب المشروع لتغيير الترتيب';item.append(handle);
 const imgUrl=controls.cleanMedia(project.cover);if(imgUrl){const img=document.createElement('img');img.src=imgUrl;img.alt='';img.loading='lazy';item.append(img);}else{const fallback=document.createElement('div');fallback.className='no-photo';fallback.textContent='OM';item.append(fallback);}
 const copy=document.createElement('div');copy.className='item-copy';const title=document.createElement('b');title.textContent=project.title||p.id;const sub=document.createElement('small');sub.textContent=labelFor(p)+' · '+(state==='excluded'?'محذوف من الموقع':state==='hidden'?'مخفي':'ظاهر')+' · '+(project.category_label||mediaCategories[project.category]||'')+(settings.featured.includes(p.id)?' · ★ بالواجهة الرئيسية':'');copy.append(title,sub);item.append(copy);
 const actions=document.createElement('div');actions.className='item-actions';if(state==='excluded'){actions.append(createAction('استعادة','restore',p.id,'restore'));}else{actions.append(createAction('↑','up',p.id,'','انقل لأعلى'),createAction('↓','down',p.id,'','انقل لأسفل'),createAction('تعديل','edit',p.id),createAction('دراسة حالة','study',p.id),createAction(settings.featured.includes(p.id)?'★ مميز':'☆ تمييز','featured',p.id,settings.featured.includes(p.id)?'is-featured':''),createAction(state==='hidden'?'إظهار':'إخفاء','toggle',p.id),createAction('حذف','delete',p.id,'danger'));}item.append(actions);list.append(item);
 }
 $('publishBtn').textContent=dirty?'نشر التعديلات ●':'نشر التعديلات';}
function reorder(id,direction){const i=order.indexOf(id),j=i+direction;if(i<0||j<0||j>=order.length)return;[order[i],order[j]]=[order[j],order[i]];markDirty();render();}
function swapDrag(from,to){if(from===to)return;const x=order.indexOf(from),y=order.indexOf(to);if(x<0||y<0)return;order.splice(x,1);order.splice(y,0,from);markDirty();render();}
function deleteProject(id){const project=allProjects().find(p=>p.id===id);if(!project)return;if(!confirm('حذف «'+(project.title||id)+'» من الموقع؟\nالمشروع هيفضل موجود على Behance، وتقدر تستعيده من فلتر «المحذوفة».'))return;settings.excluded=[...new Set([...settings.excluded,id])];settings.hidden=settings.hidden.filter(x=>x!==id);markDirty();render();}
$('projectList').addEventListener('click',e=>{const b=e.target.closest('button[data-action]');if(!b||busy)return;const id=b.dataset.id;const state=b.dataset.action;
 if(state==='up')reorder(id,-1);else if(state==='down')reorder(id,1);else if(state==='featured'){
   if(settings.featured.includes(id))settings.featured=settings.featured.filter(x=>x!==id);
   else if(settings.featured.length>=3){inform('اختار 3 مشاريع مميزة كحد أقصى. ألغِ تمييز مشروع أولًا.',true);return;}
   else settings.featured.push(id);
   markDirty();render();
 }else if(state==='edit')openEdit(id);else if(state==='study'){openEdit(id);$('projectForm').elements.caseChallenge.focus();}else if(state==='toggle'){settings.hidden=settings.hidden.includes(id)?settings.hidden.filter(x=>x!==id):[...settings.hidden,id];markDirty();render();}else if(state==='delete')deleteProject(id);else if(state==='restore'){settings.excluded=settings.excluded.filter(x=>x!==id);markDirty();render();}
});
let dragID='';$('projectList').addEventListener('dragstart',e=>{const item=e.target.closest('.item[draggable="true"]');if(!item)return;e.dataTransfer.effectAllowed='move';dragID=item.dataset.id;item.classList.add('dragging');});
$('projectList').addEventListener('dragover',e=>{const item=e.target.closest('.item[draggable="true"]');if(item&&dragID){e.preventDefault();item.classList.add('drop-target');}});
$('projectList').addEventListener('dragleave',e=>{const item=e.target.closest('.item');if(item)item.classList.remove('drop-target');});
$('projectList').addEventListener('drop',e=>{e.preventDefault();const item=e.target.closest('.item');if(item&&dragID)swapDrag(dragID,item.dataset.id);dragID='';});
$('projectList').addEventListener('dragend',()=>{dragID='';document.querySelectorAll('.drop-target,.dragging').forEach(el=>el.classList.remove('drop-target','dragging'));});
$('projectSearch').addEventListener('input',render);$('viewFilter').addEventListener('change',render);
function openEdit(id=null){const p=id?allProjects().find(x=>x.id===id):null;if(id&&!p)return;editorId=id;const f=$('projectForm');f.reset();$('dialogTitle').textContent=p?'تعديل مشروع':'إضافة مشروع جديد';const item=p?getRecord(p):null;
 for(const key of ['title','category','year','url','cover','description'])f.elements[key].value=item?.[key]||'';
 const study=settings.caseStudies?.[id]||{};
 for(const [formKey,caseKey] of [['caseClient','client'],['caseRole','role'],['caseServices','services'],['caseDuration','duration'],['caseChallenge','challenge'],['caseApproach','approach'],['caseOutcome','outcome']]){
   f.elements[formKey].value=study[caseKey]||'';
 }
 const manual=!p||p.source==='manual';$('galleryFields').hidden=!manual;$('galleryFields').style.display=manual?'flex':'none';f.elements.images.value=manual?(item?.images||[]).join('\n'):'';
 $('projectDialog').showModal();}
$('addButton').addEventListener('click',()=>openEdit());$('closeDialog').addEventListener('click',()=>$('projectDialog').close());$('cancelForm').addEventListener('click',()=>$('projectDialog').close());
function readFile64(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]||'');r.onerror=()=>reject(Error('تعذّر قراءة الصورة'));r.readAsDataURL(file);});}
async function uploadFile(file,id){const suffix={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'}[file.type];if(!suffix)throw Error('صيغة الصورة غير مدعومة: '+file.name);if(file.size>8*1024*1024)throw Error('الصورة أكبر من 8MB: '+file.name);if(file.size===0)throw Error('الصورة فارغة: '+file.name);
 const safeId=id.replace(/[^a-z0-9-]/g,'').slice(0,120);const filename=crypto.randomUUID()+'.'+suffix;const path='assets/uploads/'+safeId+'/'+filename;const body={message:'Upload image for Omar Maro project '+safeId,content:await readFile64(file),branch:BRANCH};
 await api('/contents/'+path,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return path;}
function validHTTP(s){if(!s)return '';try{let u=new URL(s);return u.protocol==='https:'?u.href:'';}catch{return '';}}
$('projectForm').addEventListener('submit',async e=>{e.preventDefault();if(busy)return;const form=e.currentTarget,title=form.elements.title.value.trim();if(!title){inform('اكتب اسم المشروع',true);return;}
 const original=editorId?allProjects().find(x=>x.id===editorId):null;const manual=!original||original.source==='manual',id=editorId||('manual-'+crypto.randomUUID().replace(/-/g,''));
 const url=form.elements.url.value.trim(),coverValue=form.elements.cover.value.trim();if(url&&!validHTTP(url)){inform('رابط المشروع لازم يبدأ بـ HTTPS',true);return;}if(coverValue&&!controls.cleanMedia(coverValue)){inform('رابط الغلاف غير صحيح',true);return;}
 const imageLines=manual?form.elements.images.value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean):[];
 if(imageLines.some(s=>!controls.cleanMedia(s))){inform('أحد روابط الصور غير صحيح. استخدم روابط HTTPS أو ملفات من جهازك.',true);return;}
 const files=manual?[...form.elements.galleryFiles.files]:[],coverFile=manual?form.elements.coverFile.files[0]:null;
 if(files.length>40){inform('الحد الأقصى 40 صورة في المشروع الواحد',true);return;}
 lock(true);
 try{
   const images=[...imageLines];for(let i=0;i<files.length;i++){$('saveProject').textContent='رفع الصورة '+(i+1)+' / '+files.length;images.push(await uploadFile(files[i],id));}
   let cover=controls.cleanMedia(coverValue);if(coverFile){$('saveProject').textContent='رفع صورة الغلاف...';cover=await uploadFile(coverFile,id);}
   if(manual){const previous=original?.images||[];const finalImages=images.length?images:previous;const category=form.elements.category.value;
     const project=controls.cleanProject({id,source:'manual',title,category,year:form.elements.year.value,description:form.elements.description.value,cover:cover||original?.cover||finalImages[0]||'',url,images:finalImages});
     if(!project)throw Error('بيانات المشروع غير صالحة');
     settings.customProjects=editorId?settings.customProjects.map(p=>p.id===id?project:p):[project,...settings.customProjects];
     if(!order.includes(id))order.unshift(id);
   }else{
     const base=catalog.find(p=>p.id===id)||{};
     const current={...settings.overrides[id],title,category:form.elements.category.value,year:form.elements.year.value,description:form.elements.description.value,url:url||''};
     if(cover&&(cover!==base.cover || Boolean(settings.overrides[id]?.cover)))current.cover=cover;
     else delete current.cover;
     settings.overrides[id]=current;
   }
   settings.caseStudies=settings.caseStudies||{};
   const study={};
   for(const [formKey,caseKey] of [['caseClient','client'],['caseRole','role'],['caseServices','services'],['caseDuration','duration'],['caseChallenge','challenge'],['caseApproach','approach'],['caseOutcome','outcome']]){
     const value=form.elements[formKey].value.trim();
     if(value)study[caseKey]=value;
   }
   if(Object.keys(study).length)settings.caseStudies[id]=study;
   else delete settings.caseStudies[id];
   markDirty();$('projectDialog').close();render();inform('اتحفظ المشروع في لوحة الإدارة. اضغط «نشر التعديلات» عشان يظهر على الموقع.');
 }catch(err){inform('مشكلة أثناء حفظ المشروع: '+err.message,true);}finally{$('saveProject').textContent='حفظ المشروع في اللوحة';lock(false);}
});
async function publish(){if(busy)return;if(!dirty){inform('مفيش تغييرات جديدة للنشر.');return;}lock(true);
 try{
  const remote=await readRepoFile(CONFIG);if(remote.sha!==sha)throw Error('حدّث حد تاني إعدادات الموقع. اعمل تحديث للصفحة بدل الكتابة فوق تعديلاته.');
  settings.order=[...order];const clean=controls.normalizeControls(settings);const body={message:'Update Omar Maro project visibility, order and manual additions',content:textToBase64(JSON.stringify(clean,null,2)+'\n'),sha,branch:BRANCH};
  const out=await api('/contents/'+CONFIG,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  sha=out.content.sha;settings=clean;dirty=false;render();inform('تم نشر التغييرات على GitHub ✅ هتظهر على الموقع بعد اكتمال نشر GitHub Pages.');
 }catch(err){inform('تعذّر نشر التعديلات: '+err.message,true);}finally{lock(false);}
}
$('publishBtn').addEventListener('click',publish);
$('backupBtn').addEventListener('click',()=>{
  if(!token||!catalog.length){inform('ادخل لوحة الإدارة الأول',true);return;}
  const payload={exportedAt:new Date().toISOString(),repository:OWNER+'/'+REPO,siteControls:controls.normalizeControls({...settings,order}),catalog};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='omar-maro-projects-backup-'+new Date().toISOString().slice(0,10)+'.json';
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  inform('تم تنزيل نسخة احتياطية للمشاريع والإعدادات على جهازك.');
});
$('loginForm').addEventListener('submit',async e=>{e.preventDefault();if(busy)return;token=$('adminToken').value.trim();if(!token){inform('ادخل مفتاح GitHub',true);return;}$('adminToken').value='';lock(true);
 try{
  const user=await api('https://api.github.com/user');if(user.login!==OWNER)throw Error('المفتاح مرتبط بحساب '+user.login+' وليس حساب مالك هذا الموقع');await load();$('accountName').textContent=user.login;$('loginPanel').hidden=true;$('editor').hidden=false;inform('تم تسجيل الدخول إلى لوحة الإدارة.');
 }catch(err){token='';inform('تعذّر الاتصال: '+err.message,true);}finally{lock(false);}
});
$('disconnect').addEventListener('click',()=>{if(dirty&&!confirm('عندك تعديلات لم تنشر. هل تريد تسجيل الخروج وإلغاءها؟'))return;token='';sha='';catalog=[];settings=controls.normalizeControls({});order=[];dirty=false;$('editor').hidden=true;$('loginPanel').hidden=false;inform('اتقفلت جلسة الإدارة.');});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
})();