// takesoul 방문자 번들 — 방문자가 받는 유일한 JS (index.html 이 불러옴)
// 상태(S) · 데이터 로드/버전/캐시 · 달력/태그/글/목록 렌더 · 음악 플레이어+캐시+미디어세션 · 디자인(톤) 적용 · 로그인 입구
// 관리자 기능은 js/admin/*.js (로그인한 관리자에게만 로드). 구조 설명: docs/ARCHITECTURE.md

// gate = 관리자 코드의 SHA-256 해시(코드 자체는 저장하지 않음). 코드를 바꾸면 이 값 교체
const CFG={owner:'takesoulcom-art',repo:'takesoul.github.io',branch:'',gate:'eb58deb26c6708ffd17ef704ea31045c177fccba638f133d70545847a708ac88'};

const O=CFG.owner||location.hostname.split('.')[0];

const R=CFG.repo||location.pathname.split('/')[1]||O+'.github.io';

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];

// 글 내용을 HTML 에 넣을 때는 반드시 esc 사용(XSS 방지)
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const p2=n=>String(n).padStart(2,'0');

const dOf=ds=>new Date(ds+'T00:00');

const uid=()=>Date.now().toString(36);

const revoke=u=>{if(u)URL.revokeObjectURL(u)};

const S={posts:[],tags:{order:[],hidden:[]},music:{albums:[]},y:0,m:0,date:null,tag:null,pid:null,mode:'view',key:GK,admin:!!GK,cur:-1,playing:false,draft:null};

const au=$('#au');

const sv=p=>`<svg viewBox="0 0 16 16" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="${p}"/></svg>`;

const IC={play:sv('M4 2.5v11l9-5.5z'),pause:sv('M4 2.5h3v11H4zM9 2.5h3v11H9z'),next:sv('M3 2.5v11l7-5.5zM11 2.5h2.2v11H11z')};

IC.prev=sv('M13 2.5v11l-7-5.5zM5 2.5H2.8v11H5z');
IC.eq=sv('M2 8h3v6H2zM6.5 3h3v11h-3zM11 6h3v8h-3z');

IC.list=sv('M2 3h12v1.6H2zM2 7.2h12v1.6H2zM2 11.4h12v1.6H2z');

IC.x='<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" fill="none" stroke="currentColor" stroke-width="1"/></svg>';

const GH=`https://api.github.com/repos/${O}/${R}`,BR=CFG.branch||undefined;

const ghHead=(accept,key)=>({Authorization:'Bearer '+(key||S.key),Accept:accept||'application/vnd.github+json'});

const api=(p,o={})=>fetch(`${GH}/contents/${p}`+(CFG.branch&&!o.method?`?ref=${CFG.branch}`:''),{...o,headers:ghHead(),cache:'no-store'});

const ghRaw=p=>fetch(`${GH}/contents/${p}`,{headers:ghHead('application/vnd.github.raw+json'),cache:'no-store'});

const ghRepo=key=>fetch(GH,{headers:ghHead(0,key)});

async function ghBlob(p){try{const r=await ghRaw(p);if(r.ok)return S.blob[p]=URL.createObjectURL(await r.blob())}catch(e){}return ''}

const keyClear=()=>{try{delete sessionStorage.gk;delete localStorage.gk}catch(x){}};

const keySave=(k,keep)=>{keyClear();try{(keep?localStorage:sessionStorage).gk=k}catch(x){}};

// ── 관리자 모듈 연결 ───────────────────────────────────────────────────────
// 방문자는 이 파일(app.js)만 받는다. 관리자 키가 있거나 로그인에 성공했을 때만 css/admin.css 와 js/admin/*.js 를 불러온다.
// 관리자 파일은 이 파일과 같은 전역 범위를 쓰는 일반 스크립트이며, 아래 ADM 에 자기 기능(화면 조각)을 등록한다.
//   ADM.renderEdit(a)  글 편집 화면          (post.js)     ADM.modal.tags / .imgview  Tags 편집 · 이미지 크게 보기 (post.js)
//   ADM.auth(kr)       메뉴 팝업의 관리자 화면 (design.js)     ADM.uiClose()      메뉴를 닫을 때 디자인 임시본 정리 (design.js)
//   ADM.music.reg / .edit  음악 관리 화면 (music.js)         ADM.hideN()        파일명 숨기기 대상 수 (music.js)
//   ADM.m.dirty/clear/reset  음악 편집 임시 상태 처리 (music.js)   ADM.leave()   글 편집 중 나가기 확인 (post.js)
// 방문자 코드는 관리자 파일의 함수를 직접 부르지 않고 반드시 ADM 을 통해(없으면 건너뜀) 부른다.
const ADM={};
const canLeave=()=>!ADM.leave||ADM.leave(); // 편집 중이 아니거나 관리자 파일이 없으면 true
const AV=(()=>{try{return new URL(document.currentScript.src).search}catch(e){return ''}})(); // app.js 의 ?v= 값을 관리자 파일에도 그대로 붙임
let admP=null;
const loadAdmin=()=>admP||(admP=(async()=>{
  const add=(el)=>document.head.appendChild(el);
  const css=document.createElement('link');css.rel='stylesheet';css.href='css/admin.css'+AV;
  const done=[new Promise((ok,no)=>{css.onload=ok;css.onerror=()=>no(new Error('css/admin.css'))})];add(css);
  for(const f of ['core','post','music','design'])done.push(new Promise((ok,no)=>{
    const s=document.createElement('script');s.src='js/admin/'+f+'.js'+AV;s.async=false; // async=false: 내려받기는 동시에, 실행은 이 순서대로
    s.onload=ok;s.onerror=()=>no(new Error('js/admin/'+f+'.js'));add(s)}));
  await Promise.all(done);
})().catch(e=>{admP=null;throw e}));

// 모달 단계 ↔ 브라우저 뒤로가기: 모달/단계가 깊어질 때마다 히스토리 항목을 쌓고, 뒤로가기(스와이프·Backspace)는 페이지 이동 대신 한 단계 전으로 돌아간다
const H={d:0,skip:0};

const dp=()=>!S.modal?0:S.modal!='music'?1:S.mv=='list'?2:S.mv=='reg'?(AL().length?3:2):S.mv=='edit'?(S.ef=='list'?3:2):1;

function hSync(){
  const t=dp(),c=H.d;if(t==c)return;H.d=t;
  if(t>c){for(let i=c;i<t;i++)history.pushState({m:i+1},'')}
  else{H.skip=1;history.go(t-c);setTimeout(()=>{H.skip=0},700)}
}

function modalBack(){
  if(S.modal!='music'||S.mv=='play'){closeModal();return}
  if(S.mv=='edit'){
    if(ADM.m&&ADM.m.dirty()&&!confirm('저장하지 않은 변경이 사라집니다. 이전 단계로 돌아갈까요?')){renderModal();return}
    const tl=S.ef=='list';viewReset();if(tl){S.mv='list';S.lm=true}renderModal();return;
  }
  if(S.mv=='reg'){if(ADM.m)ADM.m.clear();if(AL().length){S.mv='list';S.lm=true}else S.mv='play';renderModal();return}
  S.mv='play';S.lm=false;renderModal();
}

function hPop(){
  if(H.skip){H.skip=0;return true}
  if(H.d>0&&S.modal){H.d--;modalBack();return true}
  H.d=0;return false;
}

document.addEventListener('keydown',e=>{
  if(e.key!='Backspace'||!S.modal||e.ctrlKey||e.metaKey||e.altKey)return;
  const t=e.target,tg=t&&t.tagName;if(tg=='INPUT'||tg=='TEXTAREA'||tg=='SELECT'||(t&&t.isContentEditable))return;
  e.preventDefault();history.back();
});

const postPath=id=>`data/${id.slice(0,4)}/${id}.json`;

// ── JSON 버전 관리 ──
// data/ver.json = {index,tags,music,design,base}. 글 본문 버전은 index.json 항목의 v (없으면 base). 값은 yyyymmddhhmmss(UTC) 숫자
const VP='data/ver.json',VK={'data/index.json':'index','data/tags.json':'tags','data/music.json':'music','data/design.json':'design'};

// 방문자: ver.json 을 no-cache 로 확인(변경 없으면 304). 3초 안에 못 받으면 직전 사본, 사본도 없으면 null(→ 예전 ?t= 방식)
const DCN='data-v1',VL='verjson';

async function verGet(){
  let j=null;
  try{
    const ac=new AbortController(),t=setTimeout(()=>ac.abort(),3000);
    try{
      const r=await fetch(VP,{cache:'no-cache',signal:ac.signal});
      if(r.status==404){try{delete localStorage[VL]}catch(e){}return null}
      if(r.ok)j=await r.json();
    }finally{clearTimeout(t)}
  }catch(e){}
  if(j&&typeof j=='object'){try{localStorage[VL]=JSON.stringify(j)}catch(e){}return j}
  try{const s=JSON.parse(localStorage[VL]);if(s&&typeof s=='object')return s}catch(e){}
  return null;
}

const vBad=(j,v)=>!!j&&typeof j=='object'&&!Array.isArray(j)&&j.v!=null&&String(j.v)!=String(v); // 내부 v 가 있는 파일만 자기 검증

async function vfetch(u,o){try{const r=await fetch(u,o);if(r.status==404)return {nf:1};if(!r.ok)return null;return {j:await r.json()}}catch(e){return null}}

async function dcPut(c,f,key,j){ // 저장하고, 같은 파일의 이전 버전은 지움
  try{
    await c.put(key,new Response(JSON.stringify(j),{headers:{'Content-Type':'application/json'}}));
    const me=new URL(key,location.href).href;
    for(const k of await c.keys(f,{ignoreSearch:true}))if(k.url!=me)await c.delete(k);
  }catch(e){}
}

async function vload(f,v,d){ // 받아 둔 버전이면 요청 없이 Cache Storage 에서, 아니면 f?v=v 로 받기
  const key=f+'?v='+v;let c=null;
  try{c=await caches.open(DCN)}catch(e){}
  if(c){try{const r=await c.match(key);if(r){const j=await r.json();if(!vBad(j,v))return j;await c.delete(key)}}catch(e){}}
  let x=await vfetch(key);
  if(!x||x.nf)return d;
  if(vBad(x.j,v)){const y=await vfetch(key+'&t='+Date.now(),{cache:'no-store'});if(y&&y.j!==undefined)x=y} // CDN 지연: 한 번만 다시 받기
  if(c&&!vBad(x.j,v))dcPut(c,f,key,x.j);
  return x.j;
}

async function dcClean(){ // 삭제된 글과 이전 버전 정리 (목록을 못 읽었으면 건드리지 않음)
  try{
    if(!S.ver||!S.posts.length)return;
    const keep=new Set(),add=(f,v)=>{if(v!=null)keep.add(new URL(f+'?v='+v,location.href).href)};
    for(const f in VK)add(f,S.ver[VK[f]]);
    S.posts.forEach(p=>add(postPath(p.id),p.v!=null?p.v:S.ver.base));
    const c=await caches.open(DCN);
    for(const k of await c.keys())if(!keep.has(k.url))await c.delete(k);
  }catch(e){}
}

// 관리자: GitHub API 로 최신본 직접 읽기(배포 지연 없음) / 방문자: 버전 v 가 있으면 ?v= + Cache Storage, 없으면 ?t= 로 캐시 회피. 실패하면 기본값 d
const load=async(f,d,v)=>{
  if(S.admin){try{const r=await ghRaw(f);if(r.ok)return JSON.parse(await r.text());if(r.status==404)return d}catch(e){}}
  else if(v!=null)return vload(f,v,d);
  try{const r=await fetch(f+'?t='+Date.now());return r.ok?await r.json():d}catch(e){return d}
};

const reload=async()=>{
  S.full={};S.ver=S.admin?null:await verGet();
  const V=f=>S.ver?S.ver[VK[f]]:undefined;
  [S.posts,S.tags,S.music,S.dz]=await Promise.all([load('data/index.json',[],V('data/index.json')),load('data/tags.json',{order:[],hidden:[]},V('data/tags.json')),load('data/music.json',[],V('data/music.json')),load('data/design.json',{},V('data/design.json'))]);
  dInit();S.music=mNorm(S.music,S.dz);mcClean().then(mPreTop);if(!S.admin)dcClean();
};

let toastT;
const toast=(t,err)=>{const el=$('#toast');el.textContent=t;el.className='on'+(err?' err':'');clearTimeout(toastT);toastT=setTimeout(()=>{el.className=''},err?6000:3000)};

const newest=(a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id);

const vis=()=>S.posts.filter(p=>!p.hidden).sort(newest);

const list=()=>S.admin?[...S.posts].sort(newest):vis();

function tagList(all){
  const c={};vis().forEach(p=>(p.tags||[]).forEach(t=>c[t]=(c[t]||0)+1));
  S.posts.forEach(p=>(p.tags||[]).forEach(t=>c[t]=c[t]||0));
  let names=Object.keys(c).sort((a,b)=>c[b]-c[a]);
  if(!S.admin)names=names.filter(t=>c[t]>0);
  const o=S.tags.order.filter(t=>names.includes(t));
  names=[...o,...names.filter(t=>!o.includes(t))];
  return names.filter(t=>all||!S.tags.hidden.includes(t)).map(t=>[t,c[t]]);
}

const uiLum=h=>{const n=parseInt(hex6(h).slice(1),16);return [n>>16&255,n>>8&255,n&255].map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0)};

const setNorm=(o,dl,lg)=>{o=o&&typeof o=='object'?o:{};
  const tones=(Array.isArray(o.tones)?o.tones:[]).filter(t=>t&&typeof t.id=='string'&&/^[\w-]+$/.test(t.id)&&!BI.test(t.id)&&typeof t.name=='string'&&HX.test(t.bg)&&HX.test(t.pbg)&&HX.test(t.fc)).slice(0,5)
    .map(t=>({id:t.id,name:t.name.slice(0,12),bg:hex6(t.bg),pbg:hex6(t.pbg),fc:hex6(t.fc),logo:typeof t.logo=='string'&&/^img\/logo\/[\w.\-]+$/.test(t.logo)?t.logo:''}));
  const want=o.tone||o.default;return {tone:BI.test(want)||tones.some(t=>t.id==want)?want:'note',tones,fs:/^[ls]$/.test(o.fs)?o.fs:'n',hs:o.hs=='h'?'h':'v',ln:[0,5,6,7].includes(o.ln)?o.ln:dl,li:o.li!==undefined?(o.li?1:0):(lg?1:0),lq:o.lq!==undefined?(o.lq?1:0):(lg?1:0)}};

const dNorm=o=>{o=o&&typeof o=='object'?o:{};const lg=o.ly===1||o.ly===true;return {desk:setNorm(o.desk||o,7,lg),mob:setNorm(o.mob||o.desk||o,5,lg),ft:typeof o.ft=='string'?o.ft.replace(/[\r\n]+/g,' ').slice(0,200):'',mt:typeof o.mt=='string'?o.mt.replace(/[\r\n]+/g,' ').trim().slice(0,30):''}};

const serSet=D=>({tone:D.tone,tones:D.tones.map(t=>({id:t.id,name:t.name,bg:t.bg,pbg:t.pbg,fc:t.fc,logo:t.logo||''})),fs:D.fs,hs:D.hs,ln:D.ln,li:D.li?1:0,lq:D.lq?1:0});

const dSer=D=>({desk:serSet(D.desk),mob:serSet(D.mob),ft:String(D.ft||'').trim(),mt:String(D.mt||'').trim()});

S.dz=dNorm(uiDesign());
S.dw=null;
S.em=null;
S.lv=false;

const dView=()=>S.dw||S.dz;

function renderFooter(){const f=$('#foot');if(f)f.textContent=dView().ft||''}

renderFooter();

const curMode=()=>S.admin&&S.em?S.em:uiMode();

const dS=()=>dView()[curMode()];

const curId=()=>uiPick(dS());

const toneT=id=>dS().tones.find(t=>t.id==id);

const dApply=()=>{uiApply(dS(),curId());renderFooter();const r=document.documentElement,D=dS();r.setAttribute('data-li',D.li?'1':'0');r.setAttribute('data-lq',D.lq?'1':'0')};

const dApplyAll=()=>{dApply();setLogo()};

const dCache=()=>{try{localStorage.uidesign=JSON.stringify(dSer(S.dz))}catch(e){}};

function dInit(){S.dz=dNorm(S.dz);S.dw=null;dCache();dApplyAll()}

try{const mq=matchMedia(uiQ),f=()=>{if(!S.em){dApplyAll();renderCal()}};if(mq.addEventListener)mq.addEventListener('change',f);else if(mq.addListener)mq.addListener(f)}catch(e){}

function renderCal(){
  const n=dS().ln||0;if(!n||S.pl)S.lv=false; // 허용 상태: 달력+본문 / 달력+글목록 / 최근글+본문 (최근글+글목록 동시 표시 불가)
  // 좌측 List = 본문 영역에 글 목록(표) / 우측 Recent = 달력 자리를 최근 글 목록으로 교체(Back 으로 복귀)
  $('#calbar').innerHTML=`<button class="lb ${S.pl?'on':''}" data-a="plist">List</button>`+(n?`<button class="lb" data-a="${S.lv?'back':'recent'}">${S.lv?'Back':'Recent'}</button>`:'');
  $('#cal').className='cal'+(S.lv?' rl':'');
  if(S.lv){
    $('#calh').innerHTML=`<div class="ch lt"><span>Recent</span></div>`;
    $('#cal').innerHTML=list().slice(0,n).map(p=>`<div class="ri ${p.id==S.pid?'on':''}" data-a="open" data-v="${esc(p.id)}"><small>${esc(p.date)}</small><span>${esc(p.title||'(제목 없음)')}${p.hidden?' · 숨김':''}</span></div>`).join('')||'<div class="ri e">아직 작성된 글이 없습니다.</div>';
    return;
  }
  const has=new Set(vis().map(p=>p.date));
  const hid=new Set(S.admin?S.posts.filter(p=>p.hidden&&!has.has(p.date)).map(p=>p.date):[]);
  $('#calh').innerHTML=`<div class="ch"><button data-a="prev" aria-label="이전 달">‹</button><span><button data-a="py">${S.y}</button><button data-a="pm">${p2(S.m+1)}</button></span>
  <button data-a="next" aria-label="다음 달">›</button></div>`;
  const first=new Date(S.y,S.m,1).getDay(),n2=new Date(S.y,S.m+1,0).getDate();
  let h=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(w=>`<div class="w">${w}</div>`).join('');
  for(let i=0;i<first;i++)h+='<div></div>';
  for(let d=1;d<=n2;d++){
    const ds=`${S.y}-${p2(S.m+1)}-${p2(d)}`;
    const on=has.has(ds)||hid.has(ds);
    h+=`<div class="d ${on?'has':''} ${hid.has(ds)?'hid':''} ${S.date==ds?'sel':''}" ${on?`data-a="day" data-v="${ds}"`:''}><span>${d}</span></div>`;
  }
  $('#cal').innerHTML=h;
}

function renderTags(){
  let h=`<h4><span>Tags</span>${S.admin?'<button data-a="tedit">[수정]</button>':''}</h4>`;
  h+='<div class="tl">'+tagList(false).map(([t,n])=>`<div class="tag ${S.tag==t?'on':''}" data-a="tag" data-v="${esc(t)}"># ${esc(t)} (${n})</div>`).join('')+'</div>';
  $('#tags').innerHTML=h;
}

S.blob={};
S.up=[];
S.full={};

async function loadPost(id){if(S.full[id])return S.full[id];const it=S.posts.find(x=>x.id==id),v=S.ver?(it&&it.v!=null?it.v:S.ver.base):undefined,p=await load(postPath(id),null,v);return S.full[id]=p||{body:'글 파일을 찾을 수 없습니다. 배포 중이면 잠시 후 새로고침해 주세요.',_x:1}}

function imgFail(i){
  if(!i.isConnected)return;
  if(i.closest('#mbox')&&!i.classList.contains('big')){i.replaceWith('♬');return}
  const s=document.createElement('span');Object.assign(s.dataset,i.dataset);
  s.className=(i.className+' imgx').trim();s.textContent='[이미지를 불러오지 못했어요]';s.title=i.dataset.p||'';s.style.cssText='opacity:.6;font-size:.85em';
  i.replaceWith(s);
}

async function imgFix(i){if(!S.admin||i.dataset.f)return;i.dataset.f=1;let u=null;try{u=await ghBlob(i.dataset.p)}catch(e){}if(u)i.src=u;else imgFail(i)}

document.addEventListener('error',e=>{const i=e.target;if(!i||i.tagName!='IMG'||!i.dataset.p)return;if(S.admin&&!i.dataset.f)imgFix(i);else if(S.admin||i.closest('#mbox'))imgFail(i)},true);

function body(t){
  const parts=String(t).split(/(!\[[^\]]*\]\([^)]+\))/),last=parts.length-1;
  return parts.map((x,i)=>{
    const m=x.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if(m)return `<img src="${esc(S.blob[m[2]]||m[2])}" data-p="${esc(m[2])}" alt="${esc(m[1])}">`;
    if(i>0)x=x.replace(/^\n/,'');if(i<last)x=x.replace(/\n$/,'');
    return x?`<div class="tx">${esc(x)}</div>`:'';
  }).join('');
}

const PS=15;

// 글 목록(표): 작성일 · 숨김(관리자만) · tags · 제목. 페이지당 PS 건. S.lp = 현재 페이지(1부터)
function pgNums(c,t){const w=5;let s=Math.max(1,c-2),e=Math.min(t,s+w-1);s=Math.max(1,e-w+1);const r=[];for(let i=s;i<=e;i++)r.push(i);return r}

function listHTML(L,tag){
  const A=S.admin,tp=Math.max(1,Math.ceil(L.length/PS));
  S.lp=Math.min(Math.max(1,S.lp||1),tp);
  const rows=L.slice((S.lp-1)*PS,S.lp*PS),nc=2+(A?1:0)+(tag?0:1);
  const acts=A?'<div class="act"><button data-a="new">[글쓰기]</button></div>':'';
  let h=`<div class="lh"><span class="meta">List · ${L.length}건</span>${tag?`<span class="meta"># ${esc(tag)}</span>`:''}</div>${acts}<table class="ptb"><colgroup><col class="c-d">${A?'<col class="c-h">':''}${tag?'':'<col class="c-t">'}<col></colgroup>`
    +`<thead><tr><th>작성일</th>${A?'<th>숨김</th>':''}${tag?'':'<th>tags</th>'}<th>제목</th></tr></thead><tbody>`
    +(rows.map(p=>`<tr class="r ${p.id==S.pid?'on':''}" data-a="open" data-v="${esc(p.id)}"><td class="dt">${esc(p.date)}</td>${A?`<td class="${p.hidden?'hy':''}">${p.hidden?'y':'n'}</td>`:''}${tag?'':`<td>${esc((p.tags||[]).join(', '))}</td>`}<td>${esc(p.title||'(제목 없음)')}</td></tr>`).join('')||`<tr><td class="e" colspan="${nc}">${tag?'글이 없습니다.':'아직 작성된 글이 없습니다.'}</td></tr>`)
    +'</tbody></table>';
  if(tp>1){
    h+=`<div class="pgn"><button data-a="pg" data-v="${S.lp-1}" ${S.lp<=1?'disabled':''} aria-label="이전 페이지">‹</button>`
      +pgNums(S.lp,tp).map(i=>`<button class="${i==S.lp?'on':''}" data-a="pg" data-v="${i}" ${i==S.lp?'aria-current="page"':''}>${i}</button>`).join('')
      +`<button data-a="pg" data-v="${S.lp+1}" ${S.lp>=tp?'disabled':''} aria-label="다음 페이지">›</button></div>`;
  }
  return h;
}

// 본문 영역이 글 목록(List / tags 목록 / 같은 날 여러 글 목록)을 보여 주는 중인가 — 이때 Recent 를 누르면 목록 대신 직전 본문(S.bp)으로 되돌려 목록이 두 곳에 뜨지 않게 함
const artIsList=()=>S.mode=='view'&&(S.pl||(!S.pid&&(S.tag||(S.date&&list().filter(x=>x.date==S.date).length>1))));

function renderArt(){
  const a=$('#art');
  const acts=S.admin?`<div class="act">${S.mode=='view'&&S.pid?'<button data-a="edit">[수정]</button><button data-a="delpost">[삭제]</button>':''}${S.mode=='view'?'<button data-a="new">[글쓰기]</button>':''}</div>`:'';
  if(S.mode=='edit'){ADM.renderEdit(a);return} // 글 편집 화면: js/admin/post.js
  if(S.pl){a.innerHTML=listHTML(list());return}
  let posts=S.tag?list().filter(p=>(p.tags||[]).includes(S.tag)):null;
  if(S.tag&&!S.pid){a.innerHTML=listHTML(posts,S.tag);return}
  let p=S.posts.find(x=>x.id==S.pid);
  if(!p){
    const day=S.date?list().filter(x=>x.date==S.date):list();
    if(day.length>1&&S.date){
      a.innerHTML=`<div class="meta">${esc(S.date)}</div>${acts}<div class="plist" style="margin-top:16px">`+day.map(x=>`<div data-a="open" data-v="${esc(x.id)}">${esc(x.title)}</div>`).join('')+'</div>';return;
    }
    p=day[0];
  }
  if(!p){a.innerHTML='<div class="meta">아직 작성된 글이 없습니다.</div>'+acts;return}
  S.pid=p.id;S.bp=p.id;setHash(p.id);
  const fp=S.full[p.id];
  if(!fp){a.innerHTML='<div class="meta">불러오는 중…</div>';loadPost(p.id).then(()=>{if(S.pid==p.id&&S.mode=='view')renderArt()});return}
  p={...p,body:fp.body,weather:fp.weather};track(p);
  const dt=dOf(p.date);
  a.innerHTML=`<div class="meta pd">${dt.getFullYear()}년 ${dt.getMonth()+1}월 ${dt.getDate()}일${p.weather?', '+esc(p.weather):''}${p.hidden?' · 숨김':''}</div>`+
    acts+
    `<h2>${esc(p.title)}</h2><div class="body">${body(p.body)}</div>`;
}

function renderMusic(full){
  msSync();
  const m=$('#music'),ct=curT(),top=aTop(),t=ct||(top&&top.tracks[0]);
  if(!t)m.innerHTML=S.admin?'<button data-a="mtoggle">음악 관리</button>':'';
  else m.innerHTML=`<button data-a="mtoggle">♬ ${esc(t.name)}</button><button data-a="play" aria-label="${S.playing?'정지':'재생'}">${S.playing?IC.pause:IC.play}</button><button data-a="nextm" aria-label="다음곡">${IC.next}</button>`;
  if(S.modal=='music'){if(full)renderModal();else mLive()}
}

// 재생 상태만 바뀔 때: 모달을 다시 그리지 않고 곡 목록 표시·재생 버튼만 부분 갱신 (스크롤·입력 포커스·입력값 유지)
function mLive(){
  const b=$('#mbox');if(!b)return;
  if(b.dataset.sig!==mSig()){renderModal();return} // 화면 구성이 달라지는 변화(컨트롤 표시 여부·헤더 구성 등)는 다시 그림
  const edit=S.admin&&S.mv=='edit'&&albBy(S.alb),list=S.mv=='list',reg=S.admin&&S.mv=='reg',play=!(list||reg||edit);
  // 헤더 미니 컨트롤러·재생 중인 곡 (목록·관리·다른 앨범 화면)
  const mc=b.querySelector('.pl-mini');if(mc){const h=mMiniIn();if(mc.innerHTML!==h)mc.innerHTML=h}
  const np=b.querySelector('.pl-np'),t0=curT();if(np&&t0){const x=mNowTxt();if(np.textContent!==x)np.textContent=x}
  if(list||reg||edit)return;
  $$('#mbox .pl-row').forEach((r,i)=>{
    const on=S.cur>=0&&S.pa==r.dataset.id&&+r.dataset.v==S.cur;
    r.classList.toggle('on',on);
    const n=r.querySelector('.pl-n');if(n)n.innerHTML=on&&S.playing?IC.eq:String(i+1);
  });
  if(!play)return;
  const t=document.createElement('div');t.innerHTML=mPlayHTML();
  for(const q of ['.pl-cover','.pl-t','.pl-lyr','.pl-c [data-a="play"]']){
    const a=b.querySelector(q),n=t.querySelector(q);
    if(!a||!n){if(!a!==!n){renderModal();return}continue}
    if(a.className!==n.className)a.className=n.className;
    if(a.innerHTML!==n.innerHTML)a.innerHTML=n.innerHTML;
    if(n.getAttribute('aria-label'))a.setAttribute('aria-label',n.getAttribute('aria-label'));
  }
  const key=S.pa+':'+S.cur;
  if(S.cur>=0&&S.sk!==key){S.sk=key;const on=b.querySelector('.pl-list .pl-row.on');if(on)on.scrollIntoView({block:'nearest'})}
  updProg();
}

// 데이터: S.music={albums:[{year,name,cover,tracks:[{name,file,cover}]}]} (년도 오름차순). 옛 형식(곡 배열)은 mNorm 이 2026 앨범으로 자동 변환
// 음악 팝업 화면(S.mv): play(재생) · list(앨범 목록) · reg(년도 선택/생성, 관리자) · edit(앨범 편집, 관리자). 편집 변경(S.pend 신규 곡·S.mw 순서/삭제·S.mt 앨범명·S.ac 앨범 커버)은 [저장] 전까지 임시 상태이며 팝업을 닫으면 버려짐
// 정렬: 년도 있는 앨범(년도 오름차순) → 년도 없는 앨범(제목 오름차순)
const aSort=(a,b)=>a.year==null&&b.year==null?String(a.name).localeCompare(String(b.name),'ko'):a.year==null?1:b.year==null?-1:a.year-b.year;

// 가사: 최대 2줄, 줄당 80자. 비어 있으면 lyric 키 자체를 두지 않음 (기존 곡 데이터는 수정 없이 그대로 호환)
const lyN=s=>String(s||'').replace(/\r/g,'').split('\n').map(x=>x.trim().slice(0,120)).filter(Boolean).slice(0,2).join('\n');

const lyH=(x,on)=>on&&x.lyric?`<span class="pl-ly">${esc(x.lyric)}</span>`:'';

const aDef=y=>y==null?'제목 없음':y+' 즐겨들은 노래';

function mNorm(raw,dz){
  let A;
  if(Array.isArray(raw))A=[{year:2026,name:String((dz&&dz.mt)||''),cover:'',tracks:raw}];
  else A=raw&&Array.isArray(raw.albums)?raw.albums:[];
  const seenY=new Set(),seenI=new Set(),out=[];
  A.forEach((a,n)=>{
    if(!a)return;
    const none=a.year==null||a.year==='',y=none?null:+a.year; // year:null → 년도 없는 앨범
    if(!none&&(!(y>=1900&&y<=2100)||seenY.has(y)))return;
    if(!none)seenY.add(y);
    let id=String(a.id||'').replace(/[^\w-]/g,'')||(none?'n'+n:'y'+y); // 옛 데이터(id 없음)는 'y년도' 로 고정
    while(seenI.has(id))id+='x';seenI.add(id);
    out.push({id,year:y,name:String(a.name||'').replace(/[\r\n]+/g,' ').trim().slice(0,30)||aDef(y),cover:String(a.cover||''),
      tracks:(Array.isArray(a.tracks)?a.tracks:[]).filter(t=>t&&t.file&&t.name).map(t=>{const l=lyN(t.lyric);if(l)t.lyric=l;else delete t.lyric;return t})});
  });
  return {albums:out.sort(aSort)};
}

const AL=()=>S.music.albums,ALs=()=>[...AL()].sort(aSort),albBy=id=>AL().find(a=>a.id==id);

const aLb=a=>a.year!=null?a.year+'년':aNm(a); // 커밋 메시지·확인창용 이름

const aTtl=a=>esc(aNm(a))+(a.year!=null?`<span class="yr">(${a.year})</span>`:''); // 앨범 제목 + (년도)

const aNm=a=>a.name||aDef(a.year);

const aPick=l=>{for(let i=l.length-1;i>=0;i--)if(l[i].year!=null)return l[i];return l[0]}; // 기본 앨범: 가장 최근 년도, 년도 있는 앨범이 없으면 첫 앨범

const aTop=()=>aPick(ALs().filter(a=>a.tracks.length)),aTopAdm=()=>aPick(ALs());

const aVis=a=>S.admin||a.tracks.length>0;

const aList=()=>{const L=ALs().filter(aVis);return [...L.filter(a=>a.year!=null).sort((a,b)=>b.year-a.year),...L.filter(a=>a.year==null)]};

const vAlb=()=>{let a=albBy(S.alb);if(a&&!aVis(a))a=null;return a||(S.admin?aTopAdm():aTop())};

const curA=()=>S.cur>=0?albBy(S.pa):null;

const curT=()=>{const a=curA();return a&&a.tracks[S.cur]};

const mAct=()=>{const v=vAlb();return S.cur>=0&&!!v&&S.pa==v.id};

const mIsPlay=()=>!(S.mv=='list'||(S.admin&&(S.mv=='reg'||S.mv=='edit')));

S.mv='play';
S.alb=null;
S.pa=null;
S.lm=false;

// 팝업을 닫을 때 음악 화면을 '재생'으로 되돌린다. 관리자 편집 중이던 임시 상태(곡 추가·순서·커버 등)의 정리는 music.js(ADM.m.reset)가 맡는다
const viewReset=()=>ADM.m?ADM.m.reset():(S.mv='play',false);

function mOpen(){const pa=curA(),top=S.admin?aTopAdm():aTop(),a=pa||top;S.alb=a?a.id:null;S.mv='play';S.lm=false;S.modal='music';renderModal()}

const mChecked=()=>$$('.mck:checked').map(c=>c.dataset.k);

const mCheck=ks=>$$('.mck').forEach(c=>{c.checked=ks.includes(c.dataset.k)});

const mCov=c=>c?`<img src="${esc(S.blob[c]||c)}" data-p="${esc(c)}" alt="" loading="lazy">`:'♬';

const mX=`<button class="pl-x" data-a="mclose" aria-label="닫기">${IC.x}</button>`;

function musicHTML(){return S.mv=='list'?mListHTML():S.admin&&ADM.music&&ADM.music[S.mv]?ADM.music[S.mv]():mPlayHTML()} // reg·edit 화면은 music.js 가 ADM.music 에 등록

// ── 헤더 ──────────────────────────────────────────────────────────────
// 1열: [좌측] [우측: 앨범제목(년도) 또는 미니 컨트롤러] [닫기]   2열(재생 중인 곡이 있고 다른 화면일 때): 곡 번호. 제목 (오른쪽 정렬)
const mMiniIn=()=>`<button data-a="prevm" aria-label="이전곡">${IC.prev}</button><button data-a="play" aria-label="${S.playing?'일시정지':'재생'}">${S.playing?IC.pause:IC.play}</button><button data-a="nextm" aria-label="다음곡">${IC.next}</button>`;

const mMini=()=>curT()?`<span class="pl-mini">${mMiniIn()}</span>`:'';

const mNowTxt=()=>{const t=curT();return t?t.name:''};

const mNow=()=>curT()?`<div class="pl-r2"><button class="pl-np" data-a="gonow" aria-label="재생 중인 앨범으로 이동">${esc(mNowTxt())}</button></div>`:'';

const mHead=(left,right,o)=>{o=o||{};return `<div class="pl-h pl-hw"><div class="pl-r1">${left}${o.sp===false?'':'<span class="pl-sp"></span>'}${right||''}${mX}</div>${o.now?mNow():''}</div>`};

// 화면 구성이 바뀌는 조건(mLive 가 부분 갱신 대신 전체를 다시 그릴지 판단)
const mSig=()=>{const v=vAlb();return [S.mv,v&&v.id,S.pa,S.cur>=0?1:0,mAct()?1:0,S.admin?1:0,S.ke||''].join('|')};

function mPlayHTML(){
  const A=S.admin,al=vAlb(),T=al?al.tracks:[];
  const act=mAct(),ci=act?S.cur:-1,tr=ci>=0?T[ci]:null;
  const ttl=al?aTtl(al):'';
  // 이 앨범이 재생 중: 우측에 앨범제목(년도)만 / 다른 앨범을 보는 중: 우측에 미니 컨트롤러 + 2열에 재생 중인 곡
  const left=`<button class="pl-ed lt" data-a="mlist" aria-label="앨범 목록">${IC.list}<span class="pl-ht pl-lb">앨범 목록</span></button>`;
  let h;
  if(tr&&al)h=mHead(left,`<span class="pl-ht pl-rt">${ttl}</span>`,{sp:false});
  else h=mHead(left,mMini(),{now:true});
  if(T.length){
    // 아직 재생한 적 없으면(ci<0) 컨트롤 없이 앨범 이미지만, 한 번이라도 재생했으면(ci>=0) 컨트롤 표시
    const hasPlayed=ci>=0;
    h+=`<div class="pl-top"><div class="pl-cover">${mCov(tr?(tr.cover||al.cover):al.cover)}</div>`
      +(tr?`<div class="pl-t">${esc(tr.name)}</div><div class="pl-lyr">${tr.lyric?`<span class="pl-ly">${esc(tr.lyric)}</span>`:''}</div>`:`<div class="pl-t">${ttl}</div><div class="pl-lyr"></div>`)
      +`</div>`;
    if(hasPlayed){
      h+=`<div class="pl-bar"><input type="range" id="pl-seek" class="seek" min="0" max="1000" step="1" value="0" aria-label="재생 위치"><span class="pl-time" id="pl-time">0:00 / 0:00</span></div>`
        +`<div class="pl-c"><button data-a="prevm" aria-label="이전곡">${IC.prev}</button><button data-a="play" aria-label="${S.playing?'정지':'재생'}">${S.playing?IC.pause:IC.play}</button><button data-a="nextm" aria-label="다음곡">${IC.next}</button></div>`;
    }
    h+='<div class="pl-list">'+T.map((x,i)=>`<div class="pl-row ${i==ci?'on':''}" data-a="song" data-v="${i}" data-id="${al.id}"><span class="pl-n">${i==ci&&S.playing?IC.eq:i+1}</span><span class="pl-th">${mCov(x.cover||al.cover)}</span><span class="pl-tt"><span class="pl-nm">${esc(x.name)}</span></span></div>`).join('')+'</div>';
  }
  else if(A)h+=`${al?`<div class="pl-t">${ttl}</div>`:''}<p class="pl-empty">${al?'등록된 곡이 없습니다. 아래 [관리]에서 이 년도를 선택해 곡을 추가하세요.':'등록된 앨범이 없습니다. 아래 [관리]에서 년도를 만들어 주세요.'}</p>`;
  if(A)h+='<div class="bar"><button data-a="mreg">[관리]</button></div>';
  return h;
}

function mListHTML(){
  const A=S.admin,L=aList(),va=vAlb(),pa=curA(),hid=pa?pa.id:(va&&va.id); // 강조: 재생 곡이 있으면(일시정지 포함) 그 앨범, 없으면 직전에 보던 앨범
  let h=mHead(`<button class="pl-ed lt" data-a="mback" aria-label="뒤로"><span class="pl-ar">←</span><span class="pl-ht pl-lb">${S.lm?'앨범 관리':'앨범 목록'}</span></button>`,mMini(),{now:true});
  const cell=a=>`<div class="al ${a.tracks.length?'':'em'} ${hid==a.id?'on':''}" data-a="goalb" data-v="${esc(a.id)}">${A?`<input type="checkbox" class="ack" data-id="${esc(a.id)}" aria-label="${esc(aLb(a))} 선택">`:''}<span class="al-c">${mCov(a.cover)}</span><span class="al-n">${esc(aNm(a))}</span>${(a.year!=null||A)?`<span class="al-y">${a.year!=null?`(${a.year})`:''}${A?`<small>${a.tracks.length}곡</small>`:''}</span>`:''}</div>`;
  const LY=L.filter(a=>a.year!=null),LN=L.filter(a=>a.year==null); // 년도 없는 앨범은 다음 행(별도 그리드)부터
  h+='<div class="mbd">';
  if(L.length)h+=(LY.length?'<div class="al-g">'+LY.map(cell).join('')+'</div>':'')+(LN.length?'<div class="al-g">'+LN.map(cell).join('')+'</div>':'');
  else h+='<p class="pl-empty">등록된 앨범이 없습니다.</p>';
  h+='</div>';
  if(A)h+='<div class="bar bl"><button data-a="rgnew">[앨범 생성]</button><span>'+(S.lm&&ADM.hideN&&ADM.hideN()?'<button data-a="mhide" title="음악 파일명을 무작위 값으로 변경">[파일명 숨기기]</button>':'')+'<button data-a="adel">[삭제]</button><button data-a="mback">[닫기]</button></span></div>';
  return h;
}

const fmt=s=>isFinite(s)?Math.floor(s/60)+':'+p2(Math.floor(s%60)):'0:00';

function updProg(){
  const sk=$('#pl-seek');if(!sk)return;
  const d=au.duration,t=au.currentTime||0,ok=mAct()&&isFinite(d)&&d>0;
  if(!(Date.now()-(S.seekT||0)<400)){const v=ok?Math.round(t/d*1000):0;sk.value=v;sk.style.setProperty('--p',v/10+'%')}
  $('#pl-time').textContent=fmt(ok?t:0)+' / '+(ok?fmt(d):'0:00');
}

['timeupdate','loadedmetadata','durationchange'].forEach(ev=>au.addEventListener(ev,updProg));

function onSeek(sk){
  const d=au.duration;S.seekT=Date.now();sk.style.setProperty('--p',sk.value/10+'%');
  if(mAct()&&isFinite(d)&&d>0){au.currentTime=sk.value/1000*d;$('#pl-time').textContent=fmt(au.currentTime)+' / '+fmt(d)}
}

const render=()=>{renderCal();renderTags();renderArt();renderMusic();renderModal()};

// ── 음악 재생·캐시 (Cache API) ──────────────────────────────────────────
// 재생: 곡을 누르면 기다리지 않고 바로 재생한다 (iOS Safari 는 클릭 직후가 아닌 play() 를 자동재생으로 보고 거절하기 때문).
//   ① 메모리(mUrls)에 올려 둔 파일 → 즉시  ② 캐시에 받아 둔 곡(오디오 요소가 이미 한 번 재생된 뒤) → 캐시에서 읽어 재생  ③ 그 외 → 원래 주소로 스트리밍
// 저장: 재생이 10초 이어지면 현재 곡 → 다음 곡 순서로 하나씩 받아 Cache Storage 에 저장한다 (낮은 우선순위, 저속 회선·데이터 절약 모드는 제외).
//   곡이 바뀌면 현재 곡·다음 곡이 아닌 진행 중 다운로드는 취소한다. 파일명이 업로드마다 무작위 값이라(경로 = 내용) 버전 키는 필요 없다.
const MC={name:'music-v1',max:300e6,meta:'mc-meta',wait:10};

const mcOK=()=>'caches' in window;

const mcKey=f=>new URL(encodeURI(f),location.href).href;

const mcMeta=()=>{try{return JSON.parse(localStorage.getItem(MC.meta)||'{}')||{}}catch(e){return {}}};

const mcSave=m=>{try{localStorage.setItem(MC.meta,JSON.stringify(m))}catch(e){}};

const mcNet=()=>{const c=navigator.connection;return !(c&&(c.saveData||/^(slow-2g|2g|3g)$/.test(c.effectiveType||'')))}; // Safari 는 이 API 가 없어 항상 true

let mcP=0,mTok=0,mArm=0,mGo=0,mUnl=0,mBusy=0,mWant=0; // mArm: 10초 대기 중인 곡, mGo: 10초가 지나 받기가 허용된 곡, mWant: 받는 중에 들어온 재실행 요청

const mDl=new Map(),mUrls=new Map(); // mDl: 진행 중 다운로드(파일 → AbortController), mUrls: 메모리에 올린 blob: 주소(파일 → 주소)

async function mcGet(f){
  if(!mcOK())return null;
  try{
    const c=await caches.open(MC.name),r=await c.match(mcKey(f)),m=mcMeta();
    if(!r){if(m[f]){delete m[f];mcSave(m)}return null} // 브라우저가 지운 경우 기록도 정리
    const b=await r.blob();m[f]={s:b.size,t:Date.now()};mcSave(m);return b;
  }catch(e){return null}
}

async function mcPut(f,b){
  if(!mcOK())return;
  try{
    const c=await caches.open(MC.name);
    await c.put(mcKey(f),new Response(b,{headers:{'Content-Type':b.type||'audio/mpeg'}}));
    const m=mcMeta();m[f]={s:b.size,t:Date.now()};mcSave(m);
    if(!mcP&&navigator.storage&&navigator.storage.persist){mcP=1;navigator.storage.persist().catch(()=>{})}
    mcTrim(c);
  }catch(e){}
}

async function mcTrim(c){ // 용량 한도 초과 시 오래 안 들은 곡부터 삭제 (재생 중·받는 중인 곡은 제외)
  try{
    const m=mcMeta(),ks=Object.keys(m);let tot=ks.reduce((n,k)=>n+(m[k].s||0),0);
    if(tot<=MC.max)return;
    ks.sort((a,b)=>(m[a].t||0)-(m[b].t||0));
    for(const k of ks){if(tot<=MC.max)break;if(mUrls.has(k)||mDl.has(k))continue;await c.delete(mcKey(k));tot-=m[k].s||0;delete m[k]}
    mcSave(m);
  }catch(e){}
}

async function mcDel(f){try{const c=await caches.open(MC.name);await c.delete(mcKey(f));const m=mcMeta();delete m[f];mcSave(m)}catch(e){}}

async function mcClean(){ // music.json 에 없는 곡(삭제·파일명 변경)은 캐시에서 제거
  if(!mcOK())return;
  try{
    const keep=new Set();AL().forEach(a=>a.tracks.forEach(t=>keep.add(mcKey(t.file))));
    if(!keep.size)return; // music.json 을 못 읽은 경우(오프라인 등)에 캐시를 통째로 지우지 않도록
    const c=await caches.open(MC.name),m=mcMeta();
    for(const r of await c.keys())if(!keep.has(r.url))await c.delete(r);
    Object.keys(m).forEach(f=>{if(!keep.has(mcKey(f)))delete m[f]});mcSave(m);
  }catch(e){}
}

async function mLoad(f){ // 캐시에 있는 곡을 메모리(blob: 주소)로 올림. 없으면 null (네트워크는 쓰지 않음)
  if(mUrls.has(f))return mUrls.get(f);
  const b=await mcGet(f);if(!b)return null;
  if(!mUrls.has(f))mUrls.set(f,URL.createObjectURL(b));
  return mUrls.get(f);
}

async function mDownload(f){ // 곡 전체를 낮은 우선순위로 받아 캐시에 저장 (취소 가능). 실패·취소면 null
  if(!mcOK()||mDl.has(f))return null;
  const ac=new AbortController();mDl.set(f,ac);
  try{
    const r=await fetch(encodeURI(f),{cache:'no-store',priority:'low',signal:ac.signal});
    if(!r.ok)throw new Error('HTTP '+r.status);
    const b=await r.blob();await mcPut(f,b);return b;
  }catch(e){return null}finally{mDl.delete(f)}
}

async function mDlRun(){ // 현재 곡 → 다음 곡 순서로 하나씩 받기 (동시에 두 곡을 받지 않음)
  if(mBusy){mWant=1;return} // 이미 받는 중이면 버리지 않고 표시만 해 두었다가, 끝난 뒤 최신 곡 기준으로 다시 확인
  mBusy=1;
  try{
    do{
      mWant=0;const tok=mTok,tried=new Set();
      while(tok==mTok&&mGo==tok&&mcNet()){
        const al=albBy(S.pa),t=al&&al.tracks[S.cur];if(!t)break;
        const n=al.tracks[(S.cur+1)%al.tracks.length],nf=n&&n.file,m=mcMeta();
        const f=[t.file,nf].find(x=>x&&!tried.has(x)&&!S.blob[x]&&!m[x]);
        if(!f)break;
        tried.add(f);
        const b=await mDownload(f);
        if(!b)break; // 실패·취소 → 이번 확인에서는 더 시도하지 않음
        if(f==nf&&tok==mTok&&!mUrls.has(f))mUrls.set(f,URL.createObjectURL(b)); // 다음 곡은 메모리에 올려 전환을 즉시로
      }
    }while(mWant&&mGo==mTok); // 받는 동안 곡이 바뀌어 10초가 지난 경우 → 새 곡 기준으로 이어서
  }finally{mBusy=0}
}

const mRel=keep=>{for(const [f,u] of mUrls)if(!keep.includes(f)){URL.revokeObjectURL(u);mUrls.delete(f)}};

const mCut=keep=>mDl.forEach((ac,f)=>{if(!keep.includes(f))ac.abort()});

function mStop(){mSwT=Date.now();mTok++;mArm=0;mGo=0;mCut([]);au.pause();au.removeAttribute('src');mRel([])}

function mAfter(al,f){ // 곡이 시작된 뒤: 지난 곡 정리, 불필요한 다운로드 취소, 다음 곡이 캐시에 있으면 메모리로
  const n=al.tracks[(S.cur+1)%al.tracks.length],nf=n&&n.file;
  mRel([f,nf]);mCut([f,nf]);
  if(nf&&nf!=f&&!S.blob[nf]&&!mUrls.has(nf)&&mcMeta()[nf])mLoad(nf);
}

function mPlay(tok){ // play() 가 거절되면(iOS 자동재생 차단 등) '재생 중'으로 두지 않고 알린다
  const p=au.play();
  if(p&&p.catch)p.catch(e=>{if(tok!=mTok||(e&&e.name=='AbortError'))return;S.playing=false;renderMusic();toast('재생이 차단됐어요. 재생 버튼을 한 번 더 눌러 주세요.',1)});
}

async function mPreTop(){ // 접속 직후: 맨 위 앨범 1번 곡이 캐시에 있으면 메모리에 올려 첫 클릭부터 즉시 재생
  const tp=aTop(),t=tp&&tp.tracks[0];
  if(t&&!S.blob[t.file]&&mcMeta()[t.file])await mLoad(t.file);
}

au.addEventListener('playing',()=>{mUnl=1});

au.addEventListener('timeupdate',()=>{if(mArm&&mArm==mTok&&au.currentTime>=MC.wait){mArm=0;if(mcOK()&&mcNet()){mGo=mTok;mDlRun()}}});

function playIdx(i,y){
  const al=albBy(y==null?S.pa:y);if(!al||!al.tracks.length)return;
  S.pa=al.id;S.cur=(i+al.tracks.length)%al.tracks.length;
  const f=al.tracks[S.cur].file,tok=++mTok,ready=S.blob[f]||mUrls.get(f);
  S.playing=true;mArm=0;mGo=0;mSwT=Date.now();
  const go=u=>{if(tok!=mTok)return;au.src=u;mPlay(tok);mArm=S.blob[f]?0:tok;mAfter(al,f);msMeta();renderMusic()};
  if(ready)go(ready);
  else if(mUnl&&mcMeta()[f]){mSwT=Date.now();au.pause();renderMusic();mLoad(f).then(u=>go(u||encodeURI(f)))} // 캐시본(읽기 실패 시 스트리밍)
  else go(encodeURI(f)); // 클릭 안에서 바로 스트리밍 → iOS 도 허용
}

au.onended=()=>playIdx(S.cur+1);

au.onerror=async()=>{const t=curT(),f=t&&t.file;
  if(f&&mUrls.has(f)&&au.src==mUrls.get(f)){ // 캐시본 재생 실패 → 캐시를 버리고 기존 방식(스트리밍)으로
    URL.revokeObjectURL(mUrls.get(f));mUrls.delete(f);mcDel(f);au.src=encodeURI(f);mPlay(mTok);return}
  if(S.admin&&f&&!S.blob[f]){const u=await ghBlob(f);if(u){au.src=u;mPlay(mTok);return}}
  S.playing=false;renderMusic()};

// ── Media Session API: 블루투스 이어폰·차량·잠금화면·알림창 컨트롤 ──────────────────────────
// ① 재생/일시정지/이전곡/다음곡/seekto 핸들러  ② 곡이 시작될 때(playIdx 의 go) 제목·앨범·커버 표시  ③ playbackState·positionState 동기화
// ④ <audio> 의 pause/play 이벤트(이어폰 분리·통화 인터럽트·블루투스 키 등 앱 밖에서 일어난 변화)를 받아 S.playing 을 실제 상태에 맞춤
// seekbackward/seekforward 는 등록하지 않음: 등록하면 iOS·일부 기기가 이전곡/다음곡 대신 10초 건너뛰기 버튼을 보여 줌
const MSN_OK='mediaSession' in navigator&&typeof MediaMetadata!='undefined';

let MSK='',mSwT=0; // MSK: 마지막으로 설정한 메타데이터 키 / mSwT: 곡 전환·정지처럼 코드가 직접 일으킨 pause 시각(그 직후 pause 이벤트는 무시)

function msMeta(){
  if(!MSN_OK)return;
  const a=curA(),t=curT();if(!a||!t)return;
  const cv=t.cover||a.cover||'',key=[a.id,t.file,t.name,cv,a.name].join('|');
  if(key==MSK)return;MSK=key;
  const abs=p=>/^(blob:|https?:)/.test(p)?p:new URL(encodeURI(p),location.href).href;
  const art=cv?[{src:abs(S.blob[cv]||cv),sizes:'320x320',type:'image/jpeg'}]:[{src:abs('apple-touch-icon.png'),sizes:'180x180',type:'image/png'}];
  try{navigator.mediaSession.metadata=new MediaMetadata({title:t.name,artist:document.title||'',album:aNm(a),artwork:art})}catch(e){}
}

function msSync(){
  if(!MSN_OK)return;
  const t=curT();
  if(!t){if(MSK){MSK='';try{navigator.mediaSession.metadata=null}catch(e){}}try{navigator.mediaSession.playbackState='none'}catch(e){}return}
  msMeta();
  try{navigator.mediaSession.playbackState=S.playing?'playing':'paused'}catch(e){}
}

function msPos(){
  if(!MSN_OK||!navigator.mediaSession.setPositionState)return;
  const d=au.duration;
  try{
    if(!(isFinite(d)&&d>0)){navigator.mediaSession.setPositionState();return}
    navigator.mediaSession.setPositionState({duration:d,playbackRate:au.playbackRate||1,position:Math.min(Math.max(au.currentTime||0,0),d)});
  }catch(e){}
}

function msTop(){const tp=aTop();if(tp)playIdx(0,tp.id)}

function msInit(){
  if(!MSN_OK)return;
  const on=(n,f)=>{try{navigator.mediaSession.setActionHandler(n,f)}catch(e){}};
  on('play',()=>{if(curT()){if(!au.getAttribute('src'))playIdx(S.cur);else{S.playing=true;mPlay(mTok);renderMusic()}}else msTop()});
  on('pause',()=>{if(!curT())return;au.pause();S.playing=false;renderMusic()});
  on('previoustrack',()=>{if(!curT()){msTop();return}if(au.currentTime>3)au.currentTime=0;else playIdx(S.cur-1)});
  on('nexttrack',()=>{if(curT())playIdx(S.cur+1);else msTop()});
  on('seekto',d=>{
    const dur=au.duration;if(!curT()||!(isFinite(dur)&&dur>0))return;
    const t=Math.min(Math.max(+d.seekTime||0,0),dur);
    if(d.fastSeek&&au.fastSeek)au.fastSeek(t);else au.currentTime=t;
    msPos();updProg();
  });
}

msInit();

['loadedmetadata','durationchange','seeked','play','pause','ratechange','emptied'].forEach(ev=>au.addEventListener(ev,msPos));

au.addEventListener('pause',()=>{ // 앱 밖(이어폰 분리·통화·블루투스 키)에서 멈춘 경우 UI 의 재생 상태를 맞춤
  if(au.ended||Date.now()-mSwT<400||!au.getAttribute('src')||!curT())return;
  if(S.playing){S.playing=false;renderMusic()}
});

au.addEventListener('play',()=>{ // 앱 밖에서 다시 재생된 경우
  if(!curT()||!au.getAttribute('src'))return;
  if(!S.playing){S.playing=true;renderMusic()}
});

function renderModal(){
  hSync();
  const w=$('#modal'),b=$('#mbox'),k=S.modal;
  w.style.display=k?'flex':'none';if(!k){if(ADM.uiClose)ADM.uiClose();if(viewReset())toast('저장하지 않은 음악 변경을 취소했습니다.');return}
  b.className=k=='music'?'mp':k=='auth'?'st':'';
  let h='';
  if(k=='auth'){
    const kr=`<div class="row2" id="krow"><span>관리자 모드</span><button data-a="${S.admin?'logout':'kinput'}">${S.admin?'[로그아웃]':'[입력]'}</button></div>`;
    h=S.admin&&ADM.auth?ADM.auth(kr):`${kr}<div class="bar"><button data-a="mclose">[취소]</button></div>`}
  else if(k=='y'){const ys=list().map(p=>+String(p.date).slice(0,4)).filter(n=>n>=1900&&n<=2100),cy=new Date().getFullYear(),y1=Math.max(cy,S.y,...ys),y0=Math.min(S.y,...(ys.length?ys:[cy])),a=[];for(let y=y0;y<=y1;y++)a.push(y);
    h=`<div class="pk">${a.map(y=>`<button class="${y==S.y?'on':''}" data-a="sy" data-v="${y}">${y}</button>`).join('')}</div>`}
  else if(k=='m')h=`<div class="pk">${[...Array(12)].map((_,i)=>`<button class="${i==S.m?'on':''}" data-a="sm" data-v="${i}">${i+1}</button>`).join('')}</div>`;
  else if(ADM.modal&&ADM.modal[k])h=ADM.modal[k](); // 글 Tags 편집 · 이미지 크게 보기: js/admin/post.js
  else if(k=='music')h=musicHTML();
  const ck=k=='music'?mChecked():[];
  b.innerHTML=h;if(k=='music')b.dataset.sig=mSig();else delete b.dataset.sig;b.classList.toggle('wide',k=='imgview');b.classList.toggle('mpf',k=='music'&&mIsPlay());
  if(k=='music'){mCheck(ck);updProg();if(b.classList.contains('mpf')){const on=b.querySelector('.pl-list .pl-row.on');if(on)on.scrollIntoView({block:'nearest'})}}
  const f=b.querySelector('input:not([type=checkbox]):not([type=file]):not([type=range]):not([data-ui]):not(#m-title):not(#m-year):not(#m-rtitle)');if(f)f.focus();
}

{const hd=$('header');if(window.ResizeObserver)new ResizeObserver(()=>document.documentElement.style.setProperty('--hh',hd.offsetHeight+'px')).observe(hd)}

const toTop=()=>{$('#art').scrollTop=0;window.scrollTo(0,0)};

window.addEventListener('scroll',()=>{const b=$('#totop');if(b)b.classList.toggle('on',(window.scrollY||document.documentElement.scrollTop)>300)},{passive:true});

try{localStorage.removeItem('draft')}catch(e){}

const setHash=id=>{if(location.hash.slice(1)==id)return;(S.hs?history.pushState:history.replaceState).call(history,null,'','#'+id);S.hs=1};

window.addEventListener('popstate',()=>{if(hPop())return;const p=postByHash();if(!p||(S.mode=='edit'&&!canLeave()))return;showPost(p);render();toTop()});

const setYM=(y,m)=>{const d=new Date(y,m,1);S.y=d.getFullYear();S.m=d.getMonth()};

const setYMOf=ds=>{const d=ds?dOf(ds):new Date();setYM(d.getFullYear(),d.getMonth())};

const postByHash=()=>S.posts.find(x=>x.id==location.hash.slice(1)&&(S.admin||!x.hidden));

// 디자인(S.dw 임시본)은 [저장]을 눌러야 반영되고, 메뉴를 닫으면 임시본·미리보기는 버려짐(uiClose)
function showPost(p){Object.assign(S,{tag:null,pl:false,pid:p?p.id:null,date:p?p.date:null,mode:'view',modal:null});setYMOf(p&&p.date)}

const closeModal=()=>{S.modal=null;renderModal()};

const go=(y,m)=>{setYM(y,m);S.modal=null;renderCal();renderModal()};

const pick=(o)=>Object.assign(S,{date:null,tag:null,pid:null,pl:false,mode:'view'},o);
document.addEventListener('click',async e=>{
  const t=e.target;
  if(t.id=='modal'){closeModal();return}
  if(t.classList&&(t.classList.contains('mck')||t.classList.contains('ack')))return;
  const el=t.closest('[data-a]');if(!el)return;
  const a=el.dataset.a,v=el.dataset.v;
  if(['day','tag','open','home','plist'].includes(a)&&S.mode=='edit'&&!canLeave()){e.preventDefault();return}
  if(a=='menu'){S.modal='auth';renderModal()}
  else if(a=='logout'){keyClear();location.reload()}
  else if(a=='py'||a=='pm'){S.modal=a[1];renderModal()}
  else if(a=='sy')go(+v,S.m);
  else if(a=='sm')go(S.y,+v);
  else if(a=='home'){e.preventDefault();showPost(vis()[0]);render();toTop()}else if(a=='totop')toTop();
  else if(a=='prev')go(S.y,S.m-1);
  else if(a=='next')go(S.y,S.m+1);
  else if(a=='day'){pick({date:v});S.pid=null;render();toTop()}
  // 최근 글 목록이 떠 있었다면 달력으로 되돌림(본문의 태그 글 목록과 중복 출력 방지)
  else if(a=='tag'){pick({tag:v});S.lv=false;S.lp=1;render();toTop()}
  else if(a=='recent'){if(artIsList()){const p=S.posts.find(x=>x.id==S.bp&&(S.admin||!x.hidden));showPost(p||null);S.lv=true;renderArt();renderCal();renderTags();toTop()}else{S.lv=true;renderCal()}}
  else if(a=='plist'){S.mode='view';S.pl=true;S.lv=false;S.tag=null;const ix=S.pid?list().findIndex(p=>p.id==S.pid):-1;S.lp=ix<0?1:Math.floor(ix/PS)+1;renderArt();renderCal();renderTags();toTop()}
  else if(a=='pg'){S.lp=+v;renderArt();toTop()}
  else if(a=='back'){S.lv=false;renderCal()}
  else if(a=='open'){if(!(S.tag&&!S.pid&&el.closest('#art')))S.tag=null;S.pid=v;S.mode='view';S.pl=false;const p=S.posts.find(x=>x.id==S.pid);if(p){S.date=p.date;setYMOf(p.date)}renderArt();renderCal();renderTags();toTop()}
  else if(a=='kinput')keyRow('pw','관리자 코드');
  else if(a=='mclose')closeModal();
  else if(a=='mback'){S.mv='play';S.lm=false;renderModal()}
  else if(a=='gonow'){const al=albBy(S.pa);if(al){S.alb=al.id;S.mv='play';S.lm=false;renderModal()}}
  else if(a=='mlist'){S.mv='list';S.lm=false;renderModal()}
  else if(a=='goalb'){S.alb=v;if(S.lm&&S.admin&&ADM.m){ADM.m.clear();S.mt=null;S.mte=false;S.ef='list';S.mv='edit'}else{S.mv='play';S.lm=false}renderModal()}
  else if(a=='mtoggle'){if(S.modal=='music')closeModal();else mOpen()}
  else if(a=='play'||a=='nextm'||a=='prevm'){
    // 모달 헤더·메인의 컨트롤은 항상 "지금 재생 중인 곡" 기준 (다른 앨범을 보고 있어도 재생 중인 곡을 제어)
    if(curT()){
      if(a=='play'){if(S.playing){au.pause();S.playing=false;renderMusic()}else if(!au.getAttribute('src'))playIdx(S.cur);else{mPlay(mTok);S.playing=true;renderMusic()}}
      else if(a=='nextm')playIdx(S.cur+1);
      else{if(au.currentTime>3)au.currentTime=0;else playIdx(S.cur-1)}
    }else{const tp=aTop();if(tp)playIdx(0,tp.id)}
  }
  else if(a=='song')playIdx(+v,el.dataset.id);
  else if(a=='authok')authStep();
});
document.addEventListener('input',e=>{
  const t=e.target;
  if(t.id=='pl-seek')onSeek(t);
});

// 파일을 페이지 위에 놓았을 때 브라우저가 그 파일을 열며 사이트를 떠나지 않게 막는다(방문자 실수 방지). 글 편집 화면의 업로드 처리는 js/admin/post.js
const hasFiles=e=>e.dataTransfer&&[...e.dataTransfer.types].includes('Files');
document.addEventListener('dragover',e=>{if(!hasFiles(e))return;e.preventDefault();if(S.mode!='edit')e.dataTransfer.dropEffect='none'});
document.addEventListener('drop',e=>{if(hasFiles(e))e.preventDefault()});
// 모달이 떠 있을 때, 스크롤할 내용이 없는 곳(커버·헤더·빈 배경)을 드래그해도 뒤의 본문이 따라 스크롤되지 않게 막음.
// 스크롤할 내용이 있는 영역(곡 목록·앨범 목록·긴 설정창)은 그대로 스크롤되고, 입력창·재생 위치 슬라이더는 건드리지 않음
document.addEventListener('touchmove',e=>{
  if(!S.modal||!e.cancelable)return;
  const t=e.target;if(!t||!t.closest||!t.closest('#modal'))return;
  if(t.closest('input[type=range],textarea,select'))return;
  for(let n=t;n&&n.id!='modal';n=n.parentElement){
    const o=getComputedStyle(n).overflowY;
    if((o=='auto'||o=='scroll')&&n.scrollHeight>n.clientHeight+1)return;
  }
  e.preventDefault();
},{passive:false});

const msg=t=>{let m=$('#amsg');if(!m){m=document.createElement('span');m.id='amsg';m.style.color='var(--logo)';$('#mbox').appendChild(m)}m.textContent=t};

const keyRow=(id,ph)=>{$('#krow').innerHTML=`<span>관리자 모드</span><input id="${id}" type="password" placeholder="${ph}" autocomplete="off"><button data-a="authok">[확인]</button>`;$('#'+id).focus()};

const sha=async t=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t)))].map(b=>b.toString(16).padStart(2,'0')).join('');

async function authStep(){
  const pw=$('#pw'),gk=$('#gk');
  if(pw){
    if(await sha(pw.value.trim())!==CFG.gate){msg('코드가 맞지 않습니다.');return}
    keyRow('gk','GitHub 키(토큰)');
    $('#krow').insertAdjacentHTML('afterend','<label class="row2"><span></span><span><input type="checkbox" id="keep">이 기기에서는 유지</span></label>');
  }else if(gk){
    const k=gk.value.replace(/\s/g,'');
    if(!k){msg('키를 입력하세요.');return}
    msg('확인 중… ('+O+'/'+R+')');
    try{
      const r=await ghRepo(k);
      if(!r.ok){msg(`실패(${r.status}): 저장소 ${O}/${R} 또는 키 권한을 확인하세요. 주소가 다르면 코드 상단 CFG에 owner/repo를 적으세요.`);return}
      const j=await r.json();
      if(j.permissions&&j.permissions.push===false){msg('이 키에는 쓰기 권한이 없습니다. (Contents: Read and write 필요)');return}
      msg('관리자 도구를 불러오는 중…');
      try{await loadAdmin()}catch(e){msg('관리자 도구를 불러오지 못했습니다. 새로고침한 뒤 다시 시도해 주세요.');return} // 로그인에 성공한 직후에만 관리자 CSS·JS 를 받는다
      S.key=k;keySave(k,$('#keep')&&$('#keep').checked);S.admin=true;closeModal();gaOff();await reload();render();
    }catch(err){msg('오류: '+err.message)}
  }
}

document.addEventListener('keydown',e=>{
  const t=e.target;
  if(e.key=='Escape'&&S.modal)closeModal();
  if(e.key=='Enter'&&t.tagName=='INPUT'&&!['checkbox','radio','range','file','button'].includes(t.type)&&t.closest('#mbox')){e.preventDefault();authStep()} // 음악 앨범 입력칸의 Enter 는 js/admin/music.js 가 처리
});

function setLogo(opt){
  const i=$('#logoimg'),L=$('#logo a'),id=curId(),T=toneT(id);
  const def=T?(uiLum(T.bg)<.2?'logod.gif':'logo.gif'):({white:'logo.gif',dark:'logod.gif',note:'logon.gif'}[id]||'logo.gif');
  const cus=T&&!opt&&(T.pend?T.pend.url:(T.logo?(S.blob[T.logo]||T.logo):''));
  delete L.dataset.t;i.style.display='';i.classList.toggle('uc',!!cus);
  i.onerror=cus?()=>setLogo(1):()=>{if(!i.src.endsWith('/logo.gif'))i.src='logo.gif';else{i.style.display='none';L.dataset.t='TAKESOUL'}};
  i.src=cus||def;
}

setLogo();

const track=p=>{if(S.lt!=p.id){S.lt=p.id;if(!S.admin)try{gtag('event','view_post',{post_id:p.id,post_title:p.title})}catch(e){}}};

(async()=>{
  if(S.admin){
    try{const r=await ghRepo(S.key);
      if(r.status==401){keyClear();S.key='';S.admin=false;toast('저장된 키가 만료되어 로그아웃되었습니다.',1)}}catch(e){}
    if(S.admin)try{await loadAdmin()}catch(e){S.admin=false;toast('관리자 도구를 불러오지 못해 방문자 화면으로 열었습니다. 새로고침해 보세요.',1)} // 키가 유효할 때만 관리자 CSS·JS 를 받는다
  }
  await reload();
  showPost(postByHash()||vis()[0]);
  render();
})();
