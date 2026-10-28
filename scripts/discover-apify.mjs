/**
 * Optional second public-source discovery for Omar Maro's Behance profile.
 * Reads only public projects, never uses Behance credentials, and keeps
 * the APIFY_TOKEN in a GitHub Actions secret (not in URLs or logs).
 */
const PROFILE_USERNAME = 'oa19635079ead';
const ACTOR = 'https://api.apify.com/v2/actors/datagleaner~behance-scraper/run-sync-get-dataset-items';

export function parseApifyProjectIndex(items, username=PROFILE_USERNAME) {
  if (!Array.isArray(items)) throw Error('Apify returned no dataset array');
  const results=[];
  const seen = new Set();
  for (const item of items) {
    if (!item || item.type!=='project') continue;
    const owners=[item.ownerUsername,...(Array.isArray(item.owners)?item.owners.map(o=>o?.username):[])].filter(Boolean);
    if (!owners.some(o=>String(o).toLowerCase()===username.toLowerCase())) continue;
    const id=String(item.id??'');
    if (!/^\d{3,18}$/.test(id))continue;
    let url;
    try {
      url=new URL(item.url);
      if (url.protocol!=='https:' || !['www.behance.net','behance.net'].includes(url.hostname) || !new RegExp(`^/gallery/${id}(?:/|$)`).test(url.pathname))continue;
    }catch{continue;}
    if(seen.has(id))continue;
    seen.add(id);
    const cover=item.coverOriginalUrl||item.coverImageUrl||item.coverWebpUrl||'';
    results.push({id,url:url.href,title:String(item.title||'').trim().slice(0,180),cover:String(cover)});
  }
  // Never silently count other creators, profiles, or errors as imported.
  if(items.some(i=>i?.type==='project') && !results.length)throw Error('Apify returned no projects owned by expected Behance username');
  return results;
}

export async function discoverApifyProjects({token,username=PROFILE_USERNAME,fetchImpl=fetch}={}) {
  if(!token||String(token).trim().length<12)throw Error('APIFY_TOKEN unavailable');
  const input={
    searchQueries:[],creatorSearchQueries:[],projectUrls:[],
    profileUrls:[`https://www.behance.net/${username}`],
    includeProfileProjects:true,
    maxProjectsPerProfile:100,
    maxItems:110,
    requestDelaySeconds:1,
    proxyConfiguration:{useApifyProxy:false}
  };
  const res=await fetchImpl(ACTOR,{
    method:'POST',
    headers:{Authorization:`Bearer ${token}`,Accept:'application/json','Content-Type':'application/json'},
    body:JSON.stringify(input),
    signal:AbortSignal.timeout(295000)
  });
  if(!res.ok)throw Error(`Apify discovery HTTP ${res.status}`);
  const data=await res.json();
  return parseApifyProjectIndex(data,username);
}