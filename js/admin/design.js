// 관리자(4/4) — 톤(색)·글자 크기·해시 정렬·가사 효과·최근 글·로고·하단 문구 편집, 디자인 저장
// 방문자에게 톤을 적용하는 코드(dApply·dInit·setLogo 등)는 app.js 에 있다. app.js 의 ADM 에 auth · uiClose 를 등록한다

const TN={white:'White',dark:'Dark',note:'Note'};
const MS={desk:'가로',mob:'세로'},MK=['desk','mob'];
const uiCR=(a,b)=>{const x=uiLum(a),y=uiLum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
const uiCS=k=>getComputedStyle(document.documentElement).getPropertyValue(k).trim();
const uiEff=k=>{const r=document.documentElement;return k=='bg'?uiCS('--bg'):k=='fc'?uiCS('--ink'):(r.dataset.tone=='note'||r.hasAttribute('data-ubody')?uiCS('--paper'):uiCS('--bg'))};
const dES=()=>dEdit()[curMode()];
const toneE=(id=curId())=>dES().tones.find(t=>t.id==id);
const dropPend=t=>{if(t.pend){revoke(t.pend.url);delete t.pend}};
const toneBad=t=>uiCR(t.fc,t.bg)<2||uiCR(t.fc,t.pbg)<2;
const dEdit=()=>{if(!S.dw)S.dw=dNorm(dSer(S.dz));return S.dw};
const dPend=D=>MK.some(m=>D[m].tones.some(t=>t.pend));
const dDirty=()=>!!S.dw&&(JSON.stringify(dSer(S.dw))!=JSON.stringify(dSer(S.dz))||dPend(S.dw));
function uiClose(){if(!S.dw&&!S.em)return;const d=dDirty();
  if(S.dw){MK.forEach(m=>S.dw[m].tones.forEach(dropPend));S.dw=null}
  S.em=null;dApplyAll();renderCal();if(d)toast('저장하지 않은 디자인 변경을 취소했습니다.')}
const uiWarn=()=>{const w=$('#uwarn'),t=toneT(curId());if(w)w.textContent=t&&toneBad(t)?'글자색과 배경색이 너무 비슷해 저장할 수 없어요. 색을 더 다르게 해 주세요.':''};
function uiSync(sk,ss){const t=toneT(curId());if(t)['bg','pbg','fc'].forEach(k=>{
  $$(`#mbox [data-ui="${k}"]`).forEach(el=>{if(k==sk&&el.dataset.ik==ss)return;el.value=hex6(t[k])})});uiWarn()}
function uiColor(k,raw,src){if(!S.admin)return;const t=toneE();if(!t)return;
  if(k=='name'){const n=String(raw).trim().slice(0,12);if(!n)return;t.name=n;const b=$(`#mbox [data-a="tone"][data-v="${t.id}"]`);if(b)b.textContent=n;return}
  if(k!='bg'&&k!='pbg'&&k!='fc')return;
  let v=String(raw).trim();if(v&&v[0]!='#')v='#'+v;if(!HX.test(v))return;
  t[k]=hex6(v);dApply();uiSync(k,src)}
async function uiLogo(f){
  if(!S.admin)return;const t=toneT(curId());if(!t){toast('기본 톤의 로고는 바꿀 수 없습니다. 새 톤을 만들어 주세요.',1);return}
  if(!isImg(f)){toast('이미지 파일을 골라 주세요.',1);return}
  try{
    const svg=f.type=='image/svg+xml',gif=f.type=='image/gif';let blob=f,ext=svg?'svg':gif?'gif':'png',note='';
    if(!((svg&&f.size<=5e5)||(gif&&f.size<=3e5))){
      let src;try{src=await createImageBitmap(f)}catch(e){throw new Error('이미지를 열 수 없습니다.')}
      const sc=Math.min(1,54/src.height,480/src.width),tw=Math.max(1,Math.round(src.width*sc)),th=Math.max(1,Math.round(src.height*sc));
      blob=await toBlob(resize(src,tw,th),'image/png');ext='png';if(!blob)throw new Error('이미지 변환 실패');if(gif)note=' (GIF가 커서 정지 이미지로 변환했습니다)';
    }
    if(blob.size>1.5e6)throw new Error('이미지가 너무 큽니다.');
    const tt=toneE(t.id);if(!tt)return;
    dropPend(tt);
    tt.pend={blob,url:URL.createObjectURL(blob),ext};
    setLogo();renderModal();toast('로고를 바꿨습니다. [저장]을 눌러야 모든 방문자에게 적용돼요.'+note);
  }catch(e){toast('로고 변경 실패: '+e.message,1)}
}
async function dSave(){
  if(!S.admin||S.lock)return;
  if(!S.dw||!dDirty()){toast('변경한 내용이 없습니다.');return}
  for(const m of MK){const bad=S.dw[m].tones.find(toneBad);if(bad){toast(`${MS[m]} 화면의 '${bad.name}' 톤은 글자색과 배경색이 너무 비슷해 저장할 수 없습니다.`,1);return}}
  S.lock=1;
  try{
    for(const m of MK)for(const t of S.dw[m].tones)if(t.pend){const p=`img/logo/${m}-${t.id}-${uid()}.${t.pend.ext}`;await putBlob(p,t.pend.blob,t.pend.url);t.logo=p;delete t.pend}
    await saveJSON('data/design.json',dSer(S.dw));
    const keep=new Set();MK.forEach(m=>S.dw[m].tones.forEach(t=>{if(t.logo)keep.add(t.logo)}));
    for(const m of MK)for(const o of S.dz[m].tones)if(o.logo&&!keep.has(o.logo)){keep.add(o.logo);await del(o.logo).catch(()=>{})}
    await flush('디자인 저장');
    S.dz=dNorm(dSer(S.dw));S.dw=null;dCache();dApplyAll();renderCal();renderModal();toast('디자인을 저장했습니다. 방문자 화면에는 1분쯤 뒤 반영돼요.');
  }catch(e){toast('저장 실패: '+e.message,1)}
  finally{S.lock=0}
}
function designTop(){
  if(!S.admin)return '';
  if(!S.em)S.em=uiMode();
  const m=curMode(),real=uiMode();
  return `<div class="dtab" role="tablist">${MK.map(k=>`<button role="tab" aria-selected="${k==m}" class="${k==m?'on':''}" data-a="dmode" data-v="${k}">${MS[k]}모드 설정${k==real?'<small>현재 기기</small>':''}</button>`).join('')}</div>`;
}
const toneBtns=()=>dS().tones.map(t=>`<button class="${t.id==curId()?'on':''}" data-a="tone" data-v="${esc(t.id)}">${esc(t.name)}</button>`).join('');
function designHTML(){
  if(!S.admin)return '';
  const D=dS(),id=curId(),t=toneT(id),m=curMode(),real=uiMode();
  const rw=(k,lb)=>{const v=hex6(t[k]);return `<div class="row2"><span>${lb}</span><input data-ui="${k}" data-ik="t" value="${v}" maxlength="7" spellcheck="false" autocomplete="off" aria-label="${lb} 코드 (예: #ffffff)"><input type="color" data-ui="${k}" data-ik="c" value="${v}" aria-label="${lb} 선택"></div>`};
  const op=(a,cur,L)=>L.map(([v,x])=>`<button class="${v==cur?'on':''}" data-a="${a}" data-v="${v}">${x}</button>`).join('');
  let h=`<div class="dpan"><div class="uh">${m==real?`지금 이 기기는 ${MS[real]} 화면이에요.`:`지금 ${MS[real]} 화면에서 ${MS[m]} 화면 디자인을 미리 보는 중이에요. 색·글자 크기·해시 정렬은 미리 보이지만 배치는 실제 ${MS[m]} 화면과 다를 수 있어요.`} 이 탭의 설정은 ${MS[m]} 화면에만 적용돼요.</div>`
    +`<div class="dh2">Tone</div>`
    +`<div class="row2 tn"><span>기본</span>${Object.keys(TN).map(k=>`<button class="${k==id?'on':''}" data-a="tone" data-v="${k}">${TN[k]}</button>`).join('')}</div>`
    +`<div class="row2 tn"><span>Custom</span>${toneBtns()}<button data-a="tnew">[+ 새 톤]</button>${t?'<button class="rt" data-a="tdelc">[삭제]</button>':''}</div>`;
  if(t)h+=`<div class="dsub"><div class="row2"><span>이름</span><input data-ui="name" data-ik="t" value="${esc(t.name)}" maxlength="12" autocomplete="off" aria-label="톤 이름"></div>`
    +rw('bg','배경 색')+rw('pbg','본문 배경')+rw('fc','글자 색')
    +`<div class="uh">색 코드는 #ffffff 형식으로 입력하거나 오른쪽 색상 선택기를 쓰세요.</div><div class="uw" id="uwarn" role="status">${toneBad(t)?'글자색과 배경색이 너무 비슷해 저장할 수 없어요. 색을 더 다르게 해 주세요.':''}</div>`
    +`<div class="row2"><span>로고</span><button data-a="ulogo">[변경]</button>${t.logo||t.pend?'<button data-a="ulogo0">[기본]</button>':''}<input type="file" id="u-logo" data-ui="logo" accept="image/*" class="hide"></div></div>`;
  else h+=`<div class="uh">White · Dark · Note는 고정이라 수정·삭제할 수 없어요. [+ 새 톤]을 누르면 지금 톤을 복사해 나만의 톤을 만들 수 있어요. (화면별 최대 5개)</div>`;
  return h+`<div class="ud"></div><div class="row2"><span>글자 크기</span>${op('ufs',D.fs,[['s','작게'],['n','기본'],['l','크게']])}</div>`
    +`<div class="row2"><span>해시 정렬</span>${op('uhs',D.hs,[['v','세로'],['h','가로']])}</div>`
    +`<div class="row2"><span>가사 효과</span><label class="lyc"><input type="checkbox" data-a="uli" ${D.li?'checked':''}>기울임</label><label class="lyc"><input type="checkbox" data-a="ulq" ${D.lq?'checked':''}>따옴표(")</label></div>`
    +`<div class="row2"><span>최근 글</span>${op('uln',D.ln,[[0,'끔'],[5,'5개'],[6,'6개'],[7,'7개']])}</div>`
    +`<div class="uh">최근 글: 달력 오른쪽 위 Recent 버튼으로 달력 ↔ 최근 글 목록(날짜·제목)을 바꿔 봐요. 끔이면 Recent 버튼이 사라져요. (왼쪽 List 는 전체 글 목록이며 항상 표시돼요.)</div></div>`;
}
const footRow=()=>`<div class="row2"><span>하단 문구</span><input data-ui="ft" data-ik="t" value="${esc(dView().ft||'')}" maxlength="200" placeholder="예: © 2026 takesoul" autocomplete="off" aria-label="하단 문구"></div><div class="uh">홈페이지 우측 하단에 표시돼요. 비우면 표시하지 않아요.</div>`;
function onDesignInput(t,k){if(k=='ft'){if(S.admin){dEdit().ft=t.value;renderFooter()}return}uiColor(k,t.value,t.dataset.ik)}
function onDesignChange(t,k){if(k=='name'){const o=toneT(curId());if(o&&!t.value.trim())t.value=o.name}else uiSync()}

// ── app.js 와 연결 ──
ADM.auth=kr=>`${designTop()}${designHTML()}<div class="dcom"><div class="dh">공통 설정<small>가로·세로 모두 적용</small></div>${footRow()}${kr}</div><div class="uh">디자인 변경은 [저장]을 눌러야 모든 방문자에게 적용돼요.</div><div class="bar"><button data-a="dsave">[저장${dDirty()?' ●':''}]</button><button data-a="mclose">[취소]</button></div>`;
ADM.uiClose=uiClose;

// ── 이벤트 처리기 (이 파일의 data-a 동작만 처리) ──
document.addEventListener('click',async e=>{
  const t=e.target;
  const el=t.closest('[data-a]');if(!el)return;
  const a=el.dataset.a,v=el.dataset.v;
  if(a=='tone'){if(!uiHas(dS(),v))return;dES().tone=v;dApplyAll();renderModal()}
  else if(a=='dmode'){if(v!='desk'&&v!='mob')return;S.em=v;dApplyAll();renderCal();renderModal()}
  else if(a=='tnew'){const D=dES();if(D.tones.length>=5){toast('톤은 화면별로 최대 5개까지 만들 수 있습니다.',1);return}
    let n=1;while(D.tones.some(x=>x.name=='내 톤 '+n))n++;const id='c'+uid();
    D.tones.push({id,name:'내 톤 '+n,bg:hex6(uiEff('bg')),pbg:hex6(uiEff('pbg')),fc:hex6(uiEff('fc')),logo:''});D.tone=id;dApplyAll();renderModal()}
  else if(a=='tdelc'){const D=dES(),t=toneE();if(!t||!confirm(`'${t.name}' 톤을 삭제할까요? (${MS[curMode()]} 화면 · [저장]을 눌러야 확정돼요)`))return;
    dropPend(t);D.tones=D.tones.filter(x=>x.id!=t.id);if(D.tone==t.id)D.tone='note';dApplyAll();renderModal()}
  else if(a=='uli'||a=='ulq'){dES()[a=='uli'?'li':'lq']=el.checked?1:0;dApply();renderModal()}
  else if(a=='ufs'||a=='uhs'){dES()[a=='ufs'?'fs':'hs']=v;dApply();renderModal()}
  else if(a=='uln'){dES().ln=+v;renderCal();renderModal()}
  else if(a=='ulogo')clickEl('#u-logo');
  else if(a=='ulogo0'){const t=toneE();if(t){dropPend(t);t.logo='';setLogo();renderModal()}}
  else if(a=='dsave')dSave();
});
document.addEventListener('change',async e=>{
  const t=e.target,k=t.dataset&&t.dataset.ui;
  if(t.id=='u-logo'){const f=t.files[0];t.value='';if(f)await uiLogo(f)}
  else if(k&&k!='ft'&&t.dataset.ik=='t')onDesignChange(t,k);
});
document.addEventListener('input',e=>{
  const t=e.target,k=t.dataset&&t.dataset.ui;
  if(k&&t.type!='file'&&k!='logo')onDesignInput(t,k);
});
