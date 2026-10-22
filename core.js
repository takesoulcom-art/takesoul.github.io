// 관리자 공통(1/4) — GitHub 커밋(flush) · 버전표(ver.json) 갱신 · 변경 대기열(Q) · 이미지 처리 공통 함수
// 로드 순서: app.js → core.js → post.js → music.js → design.js (모두 같은 전역 범위. app.js 의 S·$·esc·toast 등을 그대로 쓴다)

const isImg=f=>/^image\//.test(f.type);
const clickEl=s=>{const i=$(s);if(i)i.click()};
const fire=el=>el.dispatchEvent(new Event('input',{bubbles:true}));
const b64=s=>btoa(unescape(encodeURIComponent(s)));
// 변경 대기열: 파일 추가·수정·삭제는 여기에 쌓아 두었다가 flush() 한 번으로 커밋 1건에 반영한다 (GitHub 시간당 커밋 제한 대응)
// Q: 경로 → {b:Blob}(바이너리) | {t:string}(텍스트) | {d:1}(삭제). 삭제는 저장소에 실제로 있는 파일만 반영된다
const Q=new Map(),qSnap=()=>new Map(Q),qRestore=m=>{Q.clear();m.forEach((v,k)=>Q.set(k,v))};
async function del(p){Q.set(p,{d:1})}
const saveJSON=(p,o)=>{Q.set(p,{t:JSON.stringify(o,null,1)});return Promise.resolve()};
let BRN=null,FL=Promise.resolve();
async function ghj(path,o){
  const r=await fetch(GH+path,{...o,headers:{...ghHead(),'Content-Type':'application/json'},cache:'no-store'});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(j.message||('HTTP '+r.status));
  return j;
}
const flush=(msg,prog)=>FL=FL.catch(()=>{}).then(()=>flushNow(msg,prog));
async function flushNow(msg,prog){
  if(!Q.size)return;
  const items=[...Q],done=()=>items.forEach(([p,v])=>{if(Q.get(p)===v)Q.delete(p)});
  const br=BR||BRN||(BRN=(await ghj('')).default_branch);
  const head=(await ghj(`/git/ref/heads/${br}`)).object.sha;
  const cm=await ghj(`/git/commits/${head}`);
  const tr=await ghj(`/git/trees/${cm.tree.sha}?recursive=1`);
  const have=new Set((tr.tree||[]).filter(x=>x.type=='blob').map(x=>x.path)),shaOf={};(tr.tree||[]).forEach(x=>{if(x.type=='blob')shaOf[x.path]=x.sha});
  const vs=await verStamp(items,tr,shaOf); // 같은 커밋에 넣을 버전 계산 (최신 ver.json 기준)
  const adds=items.filter(([,v])=>!v.d),ents=[];let n=0;
  for(const [p,v] of adds){
    if(prog)prog(++n,adds.length,p);
    if(v.mv){const sh=shaOf[v.mv];if(!sh)throw new Error('원본 파일을 찾지 못했어요: '+v.mv);ents.push({path:p,mode:'100644',type:'blob',sha:sh});continue}
    const bl=await ghj('/git/blobs',{method:'POST',body:JSON.stringify({content:v.b?await b64blob(v.b):b64(vs.txt.has(p)?vs.txt.get(p):v.t),encoding:'base64'})});
    ents.push({path:p,mode:'100644',type:'blob',sha:bl.sha});
  }
  if(vs.ver){const bl=await ghj('/git/blobs',{method:'POST',body:JSON.stringify({content:b64(JSON.stringify(vs.ver,null,1)),encoding:'base64'})});ents.push({path:VP,mode:'100644',type:'blob',sha:bl.sha})}
  items.forEach(([p,v])=>{if(v.d&&(tr.truncated||have.has(p)))ents.push({path:p,mode:'100644',type:'blob',sha:null})});
  if(!ents.length){done();return}
  const nt=await ghj('/git/trees',{method:'POST',body:JSON.stringify({base_tree:cm.tree.sha,tree:ents})});
  const nc=await ghj('/git/commits',{method:'POST',body:JSON.stringify({message:msg||'update',tree:nt.sha,parents:[head]})});
  await ghj(`/git/refs/heads/${br}`,{method:'PATCH',body:JSON.stringify({sha:nc.sha})});
  done();
}
const savePosts=()=>saveJSON('data/index.json',S.posts);
const saveTags=()=>saveJSON('data/tags.json',S.tags);
const saveMusic=()=>saveJSON('data/music.json',{albums:[...S.music.albums].sort(aSort)});
const isPost=p=>/^data\/\d{4}\/[^/]+\.json$/.test(p);
const vNow=()=>+new Date().toISOString().slice(0,19).replace(/\D/g,'');
const vNext=prev=>Math.max(vNow(),(+prev||0)+1); // 항상 직전값보다 커서 같은 값이 다시 나오지 않음
async function verRead(tr,shaOf){ // 커밋 직전의 최신 ver.json (두 기기 동시 저장 대비). 없으면 {}
  const sh=shaOf[VP],dec=s=>JSON.parse(decodeURIComponent(escape(atob(s.replace(/\s/g,'')))));
  try{
    if(sh)return dec((await ghj('/git/blobs/'+sh)).content);
    if(!tr.truncated)return {};
    const r=await ghRaw(VP);if(r.ok)return JSON.parse(await r.text());
    if(r.status==404)return {};throw new Error('HTTP '+r.status);
  }catch(e){throw new Error('ver.json 을 읽지 못했어요: '+e.message)}
}
async function verStamp(items,tr,shaOf){ // 저장 대상에 새 버전을 정해 내부 v 로 넣고, 바뀐 항목만 ver.json 에 반영
  const txt=new Map(),L=items.filter(([p,v])=>!v.d&&v.t!=null&&(VK[p]||isPost(p)));
  if(!L.length)return {txt,ver:null};
  let vj=await verRead(tr,shaOf);
  if(!vj.base){const b=vNow();vj={index:b,tags:b,music:b,design:b,base:b}} // 최초 1회: 버전표 새로 만들기(마이그레이션, 기존 파일은 그대로)
  const ie=L.find(([p])=>p=='data/index.json'),idx=ie?JSON.parse(ie[1].t):null;
  for(const [p,v] of L){
    const k=VK[p];if(k=='index')continue;
    const o=JSON.parse(v.t);delete o.v;
    if(k){const nv=vNext(vj[k]);vj[k]=nv;txt.set(p,JSON.stringify({v:nv,...o},null,1));continue}
    const id=p.split('/').pop().slice(0,-5),it=idx&&idx.find(x=>x.id==id);
    if(!it)throw new Error('index.json 에서 글 항목을 찾지 못했어요: '+id);
    const nv=vNext(it.v!=null?it.v:vj.base);it.v=nv;txt.set(p,JSON.stringify({v:nv,...o},null,1));
  }
  if(ie){vj.index=vNext(vj.index);txt.set('data/index.json',JSON.stringify(idx,null,1))}
  return {txt,ver:vj};
}
const loadIdx=()=>load('data/index.json',S.posts);
const busy=async fn=>{try{await fn()}catch(e){toast('저장 실패: '+e.message,1)}};
const mkCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
const toBlob=(c,t,q)=>new Promise(r=>c.toBlob(r,t,q));
const b64blob=b=>new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result.split(',')[1]);f.readAsDataURL(b)});
async function putBlob(p,b,url){S.blob[p]=url||URL.createObjectURL(b);Q.set(p,{b})}
const draw=(src,w,h,bg)=>{const c=mkCanvas(w,h),x=c.getContext('2d');if(bg){x.fillStyle=bg;x.fillRect(0,0,w,h)}x.imageSmoothingQuality='high';x.drawImage(src,0,0,w,h);if(src.close)src.close();return c};
// hh=0 이면 너비 기준으로만 절반 축소(글 이미지) / 기본은 너비·높이 모두 목표의 2배 이상일 때만 단계 축소(로고)
function resize(src,tw,th,bg,hh=th){
  let cw=src.width,ch=src.height;
  while(cw/2>=tw&&ch/2>=hh){const nw=Math.floor(cw/2),nh=Math.floor(ch/2);src=draw(src,nw,nh);cw=nw;ch=nh}
  return draw(src,tw,th,bg);
}
