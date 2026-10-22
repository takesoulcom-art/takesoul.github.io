// 관리자(2/4) — 글쓰기·수정·삭제 · 이미지 업로드/썸네일 · Tags 편집 · 편집 중 이탈 확인
// app.js 의 ADM 에 renderEdit(글 편집 화면) · modal.tags / modal.imgview 를 등록한다

const imgList=s=>[...String(s||'').matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)];
const imgsOf=b=>imgList(b).map(m=>m[2]);
const purge=async(c,keep)=>{for(const p of new Set(c))if(!keep.has(p))await del(p).catch(()=>{})};
const WX=['☀️','🌞','☁️','🌤️','🌥️','🌦️','🌧️','🌩️','🌪️','🌨️','🌀','🌈','☔','❄️'];
async function shrink(file){
  const MAX=800,keep={blob:file,name:file.name};
  if(/gif|svg/.test(file.type))return keep;
  let src;try{src=await createImageBitmap(file,{imageOrientation:'from-image'})}catch(e){throw new Error('이미지를 열 수 없습니다: '+file.name)}
  if(src.width<=MAX){if(src.close)src.close();return keep}
  const png=file.type=='image/png',H=Math.round(src.height*MAX/src.width);
  const blob=await toBlob(resize(src,MAX,H,png?'':'#fff',0),png?'image/png':'image/jpeg',.88);if(!blob)throw new Error('이미지 변환 실패: '+file.name);
  return {blob,name:file.name.replace(/\.[^.]+$/,'')+(png?'.png':'.jpg')};
}
function insertTok(ta,tok){
  const v=ta.value,pos=ta.dataset.t?ta.selectionStart:v.length;
  const pre=pos>0&&v[pos-1]!='\n'?'\n':'',post=pos<v.length&&v[pos]!='\n'?'\n':'';
  ta.setRangeText(pre+tok+post,pos,pos,'end');ta.dataset.t=1;
  fire(ta);renderThumbs();
}
function rmTok(i){
  const ta=$('#e-body');if(!ta)return;const m=imgList(ta.value)[i];if(!m)return;
  let a=m.index,b=a+m[0].length;if(ta.value[b]=='\n')b++;else if(a>0&&ta.value[a-1]=='\n')a--;
  ta.setRangeText('',a,b,'end');fire(ta);renderThumbs();
}
function renderThumbs(){
  const ta=$('#e-body'),box=$('#thumbs');if(!ta||!box)return;
  const L=imgList(ta.value),key=JSON.stringify([L.map(m=>m[0]),S.upl]);
  if(box.dataset.k===key)return;box.dataset.k=key;
  $('#thc').textContent=`첨부된 이미지 (${L.length})`;
  box.innerHTML=L.map((m,i)=>`<div class="th" data-a="thumb" data-p="${esc(m[2])}"><button type="button" class="x" data-a="thx" data-i="${i}" aria-label="이미지 삭제">✕</button><img src="${esc(S.blob[m[2]]||m[2])}" data-p="${esc(m[2])}" alt=""><span>${esc(m[1])}</span></div>`).join('')
    +(S.upl?`<div class="th up"><span>업로드 중… (${S.upl.i}/${S.upl.n})</span><div class="pbar"><i></i></div></div>`:'');
  const pb=box.querySelector('.pbar i');if(pb)pb.style.width=S.upl.pct+'%';
}
async function addFiles(list){
  const ta=$('#e-body'),say=t=>{const m=$('#dzmsg');if(m)m.textContent=t||''};if(!ta)return;
  if(S.upBusy){say('이전 업로드가 끝난 뒤 다시 시도해 주세요.');return}
  const fs=[...list].filter(isImg);
  if(!fs.length){say('이미지 파일만 올릴 수 있습니다.');return}
  S.upBusy=1;say('');
  for(let i=0;i<fs.length;i++){
    S.upl={i:i+1,n:fs.length,pct:10};renderThumbs();
    try{
      let f=fs[i];if(!f.name||f.name=='image.png')f=new File([f],'paste-'+Date.now()+'.png',{type:f.type});
      const r=await shrink(f);S.upl.pct=45;renderThumbs();
      const yr=($('#e-date').value||today()).slice(0,4),p=`img/${yr}/${Date.now()}-${r.name.replace(/[^\w.\-]/g,'_')}`;
      S.up.push(p);
      await putBlob(p,r.blob);S.upl.pct=100;
      insertTok(ta,`![${r.name.replace(/\.[^.]+$/,'').replace(/[\[\]()]/g,'')}](${p})`);
    }catch(e){say('업로드 실패: '+e.message)}
  }
  S.upl=null;S.upBusy=0;renderThumbs();
}
// 파일을 놓았을 때 브라우저가 페이지를 떠나지 않게 막는 기본 처리(hasFiles·preventDefault)는 방문자도 필요해서 app.js 에 있다. 여기선 글 편집 화면의 업로드 영역 동작만 처리
document.addEventListener('dragover',e=>{if(!hasFiles(e)||S.mode!='edit')return;const z=$('#dz');if(z)z.classList.toggle('over',!!e.target.closest('#dz'))});
document.addEventListener('dragleave',e=>{const z=$('#dz');if(z&&e.target.closest&&e.target.closest('#dz'))z.classList.remove('over')});
document.addEventListener('drop',e=>{if(!hasFiles(e)||S.mode!='edit')return;const z=$('#dz');if(z)z.classList.remove('over');addFiles(e.dataTransfer.files)});
document.addEventListener('paste',e=>{if(S.mode!='edit'||S.modal)return;const fs=[...(e.clipboardData?e.clipboardData.files:[])].filter(isImg);if(!fs.length)return;e.preventDefault();addFiles(fs)});
document.addEventListener('focusin',e=>{if(e.target.id=='e-body')e.target.dataset.t=1});
const parseTags=s=>s.split(',').map(s=>s.trim().replace(/^#/,'')).filter(Boolean);
const readForm=()=>{const g=i=>$('#'+i);return {date:g('e-date').value,title:g('e-title').value,body:g('e-body').value,weather:g('e-wx').value.trim(),tags:parseTags(g('e-tags').value),hidden:g('e-hid').checked}};
const syncDraft=()=>Object.assign(S.draft,readForm());
const today=()=>{const d=new Date();return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate())};
const fld=d=>JSON.stringify([d.date,d.weather||'',d.title,d.body,(d.tags||[]).join(','),!!d.hidden]);
const dirty=()=>{if(S.mode!='edit'||!$('#e-body'))return false;syncDraft();return fld(S.draft)!=S.snap};
const leave=()=>!dirty()||confirm('저장하지 않은 내용이 있습니다. 나갈까요?');
window.addEventListener('beforeunload',e=>{if(dirty()){e.preventDefault();e.returnValue=''}});
function toggleWx(b){const i=$('#e-wx'),w=b.dataset.w;
  i.value=i.value.includes(w)?i.value.replace(w,''):i.value+w;b.classList.toggle('on',i.value.includes(w));fire(i)}
const startEdit=d=>{S.up.forEach(p=>Q.set(p,{d:1}));S.snap=fld(d);S.draft=d;S.up=[];S.mode='edit';S.pl=false;renderArt();renderCal()};
const mvt=(i,d)=>{const L=tagList(true).map(x=>x[0]);const j=i+d;if(j<0||j>=L.length)return;[L[i],L[j]]=[L[j],L[i]];S.tags.order=L;renderModal()};

// ── app.js 와 연결 ──
ADM.renderEdit=a=>{
  const d=S.draft;
  a.innerHTML=`<div class="ed">
    <input id="e-date" type="date" value="${d.date}">
    <input id="e-wx" placeholder="날씨 (선택) - 아래 이모지를 눌러 추가/해제, 직접 입력도 가능" value="${esc(d.weather||'')}">
    <div class="wx">${WX.map(w=>`<button type="button" class="${(d.weather||'').includes(w)?'on':''}" data-w="${w}" aria-label="날씨 ${w}">${w}</button>`).join('')}</div>
    <input id="e-title" placeholder="제목" value="${esc(d.title)}">
    <input id="e-tags" placeholder="Tags (쉼표로 구분, 예: 일상, 생각)" value="${esc((d.tags||[]).join(', '))}">
    <textarea id="e-body" placeholder="본문 … (커서 위치에 이미지 삽입)">${esc(d.body)}</textarea>
    <div class="dz" id="dz" data-a="pick" role="button" tabindex="0"><div>이미지를 여기로 끌어다 놓거나 클릭해서 선택</div><small>Ctrl+V 붙여넣기 가능 · 여러 장 동시 선택 가능 · 가로 800px 초과 시 자동 축소</small></div>
    <input type="file" id="e-img" accept="image/*" multiple class="hide">
    <div id="dzmsg" role="status"></div>
    <div class="thh"><span id="thc"></span><span>썸네일 클릭 = 크게 보기</span></div>
    <div class="thumbs" id="thumbs"></div>
    <label><input type="checkbox" id="e-hid" style="width:auto" ${d.hidden?'checked':''}> 숨김</label>
    <div class="bar"><button data-a="save">[저장]</button><button data-a="cancel">[취소]</button></div></div>`;
  renderThumbs();
};
ADM.leave=leave;
ADM.modal={
  tags:()=>'<div class="meta">체크한 Tags는 숨김</div>'+tagList(true).map(([t,n],i)=>`<div class="row"><input type="checkbox" data-a="thide" data-v="${esc(t)}" ${S.tags.hidden.includes(t)?'checked':''}># ${esc(t)} (${n}) <button data-a="tup" data-v="${i}">↑</button><button data-a="tdn" data-v="${i}">↓</button></div>`).join('')+'<div class="bar"><button data-a="tdone">[저장]</button><button data-a="tcancel">[취소]</button></div>',
  imgview:()=>{const v=S.view||{};return `<div class="bar top"><button data-a="imgdel">[삭제]</button></div><img class="big" src="${esc(S.blob[v.p]||v.p)}" data-p="${esc(v.p)}" alt=""><div class="cap"><span>${esc(v.name)}</span><button data-a="mclose">[취소]</button></div>`}
};

// ── 이벤트 처리기 (이 파일의 data-a 동작만 처리) ──
document.addEventListener('click',async e=>{
  const t=e.target;
  const wx=t.closest('[data-w]');if(wx){toggleWx(wx);return}
  const el=t.closest('[data-a]');if(!el)return;
  const a=el.dataset.a,v=el.dataset.v;
  if(a=='new')startEdit({date:today(),title:'',body:'',tags:[],hidden:false});
  else if(a=='edit'){const f=S.full[S.pid];if(!f||f._x)return;startEdit({...f})}
  else if(a=='pick')clickEl('#e-img');
  else if(a=='thx'){rmTok(+el.dataset.i)}
  else if(a=='thumb'){const L=imgList($('#e-body').value),i=$$('#thumbs .th[data-p]').indexOf(el);
    if(L[i]){S.vi=i;S.view={p:L[i][2],name:L[i][1]};S.modal='imgview';renderModal()}}
  else if(a=='imgdel'){rmTok(S.vi);closeModal()}
  else if(a=='cancel'){if(!leave())return;await busy(()=>purge(S.up,new Set(imgsOf((S.full[S.draft.id]||{}).body))));S.up=[];S.mode='view';renderArt()}
  else if(a=='save'){if(S.upBusy){const m=$('#dzmsg');if(m)m.textContent='이미지 업로드가 끝난 뒤 저장해 주세요.';return}
    const f=readForm(),d={...S.draft,...f,title:f.title.trim()};
    if(!d.title||!d.date||!d.tags.length){toast('날짜, 제목, Tags는 필수입니다.',1);return}
    let base=null;
    if(!d.id){base=await loadIdx();const pre=d.date.replace(/-/g,''),n=Math.max(0,...base.filter(x=>x.id.startsWith(pre)).map(x=>+x.id.slice(8)))+1;d.id=pre+p2(n)}
    const m={id:d.id,date:d.date,title:d.title,tags:d.tags,hidden:d.hidden},old=(S.full[d.id]||{}).body||'';
    let na=null;const q0=qSnap(),pf=S.full[d.id];
    try{
      await saveJSON(postPath(d.id),{...m,weather:d.weather||'',body:d.body});
      {const arr=[...(base||await loadIdx())],i=arr.findIndex(x=>x.id==d.id);i<0?arr.push(m):arr[i]={...m,...(arr[i].v!=null?{v:arr[i].v}:{})};await saveJSON('data/index.json',arr);na=arr} // 글 파일의 v 가 index 항목에 들어가므로 항상 갱신
      S.full[d.id]={...m,weather:d.weather||'',body:d.body};
      await purge([...imgsOf(old),...S.up],new Set(imgsOf(d.body)));
      toast('GitHub에 저장 중…');await flush('글 저장: '+d.title);if(na)S.posts=na;
    }catch(e){qRestore(q0);if(pf)S.full[d.id]=pf;else delete S.full[d.id];toast('저장 실패: '+e.message,1);return}
    S.up=[];showPost(d);render();
  }
  else if(a=='delpost'){if(!confirm('이 글을 삭제할까요?'))return;
    const id=S.pid,fp=await loadPost(id),gone=imgsOf(fp&&fp.body);
    const q0=qSnap();
    try{const arr=(await loadIdx()).filter(x=>x.id!=id);await saveJSON('data/index.json',arr);
      await del(postPath(id));await purge(gone,new Set());await flush('글 삭제: '+id);S.posts=arr;delete S.full[id]}catch(e){qRestore(q0);toast('삭제 실패: '+e.message,1);return}
    pick({});render()}
  else if(a=='tedit'){S.modal='tags';renderModal()}
  else if(a=='tcancel'){S.tags=await load('data/tags.json',{order:[],hidden:[]});S.modal=null;render()}
  else if(a=='tdone'){const q0=qSnap();try{await saveTags();await flush('태그 저장')}catch(e){qRestore(q0);toast('저장 실패: '+e.message,1);return}S.modal=null;render()}
  else if(a=='tup')mvt(+v,-1);
  else if(a=='tdn')mvt(+v,1);
  else if(a=='thide'){const h=S.tags.hidden;e.target.checked?h.push(v):S.tags.hidden=h.filter(x=>x!=v)}
});
document.addEventListener('change',async e=>{
  const t=e.target;
  if(t.id=='e-img'){const fs=[...t.files];t.value='';addFiles(fs)}
});
document.addEventListener('input',e=>{
  const t=e.target;
  if(t.id=='e-body')renderThumbs();
});
document.addEventListener('keydown',e=>{
  const t=e.target;
  if((e.key=='Enter'||e.key==' ')&&t.id=='dz'){e.preventDefault();clickEl('#e-img')}
});
