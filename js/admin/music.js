// 관리자(3/4) — 앨범/곡 편집 · 곡·커버 업로드(mp3 내장 커버 추출) · 파일명 무작위화 · 앨범 삭제
// 방문자도 쓰는 재생·목록 화면(mPlayHTML 등)은 app.js 에 있고, 여기엔 관리 화면(mRegHTML·mEditHTML)과 저장 로직만 있다

// ── 음악 편집 임시 상태 (관리자 전용; app.js 는 ADM.m 을 통해서만 사용) ──
const eA=()=>S.mv=='edit'?albBy(S.alb):null;

const mnN=(s,a)=>String(s||'').replace(/[\r\n]+/g,' ').trim().slice(0,30)||aDef(a.year);

const newPend=()=>({items:[]}); // items: [{f:File, title, lyric, cv:{file,url}|null}] — 곡마다 파일·제목·커버를 한 줄로 관리

const pqFree=()=>{(S.pend.items||[]).forEach(it=>{if(it.cv)revoke(it.cv.url)})};

S.tm={};
S.ke=null;
S.pend=newPend();
S.mw=null;
S.mt=null;
S.mte=false;
S.ac=null;
S.ry='';
S.rt='';
S.rn=false;
S.ef='play';

const mTkDirty=()=>{const a=eA();return !!a&&Object.keys(S.tm).some(f=>{const t=a.tracks.find(x=>x.file==f),q=S.tm[f];return !!t&&(!!q.cv||!!q.cvx||(q.ly!==undefined&&lyN(q.ly)!==(t.lyric||'')))})};

const mMusicDirty=()=>{const a=eA();return !!S.pend.items.length||!!(a&&S.mw&&(S.mw.length!=a.tracks.length||S.mw.some((x,i)=>x!==a.tracks[i])))};

const mNameDirty=()=>{const a=eA();return !!a&&S.mt!=null&&mnN(S.mt,a)!==aNm(a)};

const mCovDirty=()=>!!S.ac;

const mDirty=()=>mMusicDirty()||mNameDirty()||mCovDirty()||mTkDirty();

function mClear(){Object.values(S.tm).forEach(q=>{if(q.cv)revoke(q.cv.url)});S.tm={};S.ke=null;S.mw=null;pqFree();S.pend=newPend();if(S.ac)revoke(S.ac.url);S.ac=null}

function mReset(){const d=mDirty();mClear();S.mt=null;S.mte=false;S.mv='play';return d}

const MUSIC_MAX=30e6; // 곡당 상한 (GitHub blob 100MB / Pages 약 1GB 고려)
function mRegHTML(){
  const acu=S.ac?S.ac.url:'';
  return mHead('<b class="pl-ht pl-lb">앨범 생성</b>',mMini(),{now:true})+`<div class="mbd"><div class="pl-hint">커버 · 년도 · 제목을 입력해 주세요</div>`
    +`<div class="rg-t">앨범 커버 (선택)</div><div class="ac"><button class="pl-cover ac-b" data-a="pickacover" aria-label="앨범 커버 ${acu?'변경':'업로드'}">${acu?`<img src="${esc(acu)}" alt="">`:'앨범 커버<br>업로드'}</button></div>`
    +`<div class="rg-t">년도 (숫자 4자리)</div><div class="rg-f"><div class="rg-y"><input id="m-year" inputmode="numeric" maxlength="4" placeholder="예: 2025" autocomplete="off" aria-label="년도 입력" value="${esc(S.ry)}"${S.rn?' disabled':''}><label class="rg-n"><input type="checkbox" id="m-ynone"${S.rn?' checked':''}>없음</label></div></div>`
    +`<div class="rg-t">앨범 제목 (비우면 '년도 즐겨들은 노래', 년도 없음이면 '제목 없음')</div><div class="rg-f"><input id="m-rtitle" maxlength="30" placeholder="예: 2025 즐겨들은 노래" autocomplete="off" aria-label="앨범 제목" value="${esc(S.rt)}"></div>`
    +`<div class="pl-hint">이미 있는 년도를 입력하면 새로 만들지 않고 그 앨범 편집 화면으로 이동해요.</div>`
    +`</div><div class="bar"><button data-a="rgadd">[생성]</button><button data-a="rgcancel">[취소]</button></div>`
    +`<input type="file" id="m-acover" accept="image/*" class="hide">`;
}
function mEditHTML(){
  const al=albBy(S.alb);
  if(!al){S.mv='play';return mPlayHTML()}
  const P=S.pend,W=S.mw||al.tracks,PI=P.items,N=W.length+PI.length;
  const nm=S.mt!=null?S.mt:aNm(al);
  // 앨범 이름은 항상 입력칸으로 열려 있음
  const titleInput=`<input id="m-title" class="pl-ti" value="${esc(nm)}" maxlength="30" autocomplete="off" aria-label="앨범 이름">`;
  let h=mHead(titleInput,mMini(),{sp:false,now:true});
  const acu=S.ac?S.ac.url:'';
  h+=`<div class="mbd"><div class="ac"><button class="pl-cover ac-b" data-a="pickacover" aria-label="앨범 커버 ${acu||al.cover?'변경':'업로드'}">${acu?`<img src="${esc(acu)}" alt="">`:al.cover?mCov(al.cover):'앨범 커버<br>업로드'}</button><div class="pl-s">${acu||al.cover?'앨범 커버 · 이미지를 누르면 변경':'앨범 커버 이미지를 올려 주세요'}${S.ac?' · [저장]을 눌러야 반영돼요':''}</div></div>`;
  if(W.length)h+=`<div class="mtl"><span><button data-a="mup" aria-label="위로">▲</button><button data-a="mdn" aria-label="아래로">▼</button></span><span><button data-a="mdel">[삭제]</button></span></div>`;
  if(W.length)h+='<div class="pl-list">'+W.map((x,i)=>{
    const ed=S.ke==x.file,num=i+1,ck=`<input type="checkbox" class="mck" data-k="${esc(x.file)}" aria-label="${esc(x.name)} 선택">`;
    // 곡 행을 누르면 바로 그 곡의 수정(kerow)이 열림 (커버·가사 입력칸)
    if(!ed)return `<div class="pl-row" data-a="kerow" data-v="${al.tracks.indexOf(x)}" data-id="${al.id}">${ck}<span class="pl-n">${num}</span><span class="pl-th">${mCov(x.cover||al.cover)}</span><span class="pl-tt"><span class="pl-nm">${esc(x.name)}</span></span></div>`;
    const q=S.tm[x.file]||{},ly=q.ly!==undefined?q.ly:(x.lyric||''),cvu=q.cv?`<img src="${esc(q.cv.url)}" alt="">`:q.cvx?mCov(al.cover):mCov(x.cover||al.cover);
    return `<div class="pl-row ke" data-a="kerow" data-v="${al.tracks.indexOf(x)}" data-id="${al.id}">${ck}<span class="pl-n">${num}</span><button class="pl-th" data-a="kecover" aria-label="곡 커버 변경">${cvu}</button><span class="pl-tt"><span class="pl-nm">${esc(x.name)}</span><textarea class="pq-ly" id="ke-ly" rows="2" maxlength="250" placeholder="가사 (최대 2줄, 비우면 삭제)" aria-label="가사">${esc(ly)}</textarea><span class="ke-b"><button data-a="kecover">[커버 변경]</button><button data-a="kecvx">[커버 제거]</button><button data-a="keclose">[닫기]</button></span></span></div>`;
  }).join('')+'</div>';
  else if(!PI.length)h+='<p class="pl-empty">등록된 곡이 없습니다. 아래에서 음악 파일을 골라 [저장]하면 등록돼요.</p>';
  const sz=n=>n>=1e6?(n/1e6).toFixed(1)+'MB':Math.max(1,Math.round(n/1e3))+'KB';
  h+=`<div class="pl-add pq"><div class="pq-t">곡 추가${PI.length?` · ${PI.length}곡 대기 중`:''}</div>`
    +PI.map((it,i)=>`<div class="pq-r"><button class="pl-cv" data-a="pqcover" data-v="${i}" aria-label="곡 커버 변경">${it.cv?`<img src="${esc(it.cv.url)}" alt="">`:'커버<br>(선택)'}</button><div class="pq-b"><input class="pq-in" data-pq="${i}" value="${esc(it.title)}" maxlength="60" autocomplete="off" aria-label="곡 제목"><div class="pl-hint">${esc(it.f.name)} · ${sz(it.f.size)}</div><textarea class="pq-ly" data-pql="${i}" rows="2" maxlength="250" placeholder="가사 (선택, 최대 2줄)" aria-label="가사">${esc(it.lyric||'')}</textarea></div><button class="pq-x" data-a="pqdel" data-v="${i}" aria-label="제거">×</button></div>`).join('')
    +`<button class="pl-pick" data-a="pickmusic">[+ 음악 파일 선택]</button><div class="pl-hint">${PI.length?'제목과 커버를 곡마다 바꿀 수 있어요. [저장]을 누르면 한 번에 등록돼요.':'mp3 · m4a 파일을 여러 개 한꺼번에 고를 수 있어요. mp3에 들어 있는 커버는 자동으로 채워져요. 곡당 '+MUSIC_MAX/1e6+'MB까지 올릴 수 있어요.'}</div></div>`
    +`</div><div class="bar bl"><button data-a="malbum">[앨범 관리]</button><span><button data-a="msave">[저장${mDirty()?' ●':''}]</button><button data-a="mcancel">[취소]</button></span></div>`
    +`<input type="file" id="m-kcover" accept="image/*" class="hide"><input type="file" id="m-up" accept=".mp3,.m4a,audio/mpeg,audio/mp4" multiple class="hide"><input type="file" id="m-cover" accept="image/*" class="hide"><input type="file" id="m-acover" accept="image/*" class="hide">`;
  return h;
}
function onTitle(t){S.mt=t.value;const b=$('[data-a="msave"]');if(b)b.textContent='[저장'+(mDirty()?' ●':'')+']'}
const rnd=()=>{const a=new Uint8Array(12);crypto.getRandomValues(a);return [...a].map(b=>b.toString(16).padStart(2,'0')).join('')};
const mExt=n=>((String(n).match(/\.(mp3|m4a)$/i)||[])[1]||'mp3').toLowerCase();
const rndOK=f=>/^music\/[0-9a-f]{24}\.(mp3|m4a)$/.test(f);
const mHideN=()=>AL().reduce((n,a)=>n+a.tracks.filter(t=>!rndOK(t.file)).length,0);
// 이미 올린 곡의 파일명을 무작위 값으로 변경 (파일 재업로드 없이 git tree 에서 경로만 이동)
async function mHide(){
  if(S.lock)return;const n=mHideN();
  if(!n){toast('모든 곡의 파일명이 이미 무작위 값이에요.');return}
  if(!confirm(`음악 파일 ${n}개의 파일명을 무작위 값으로 바꿉니다.\n방문자 화면에는 1분쯤 뒤 반영되며, 그 사이 이미 열려 있는 페이지에서는 일부 곡이 재생되지 않을 수 있어요. 진행할까요?`))return;
  S.lock=1;const q0=qSnap(),undo=[];
  try{
    AL().forEach(a=>a.tracks.forEach(t=>{
      if(rndOK(t.file))return;
      const np=`music/${rnd()}.${mExt(t.file)}`;
      Q.set(np,{mv:t.file});Q.set(t.file,{d:1});if(S.blob[t.file])S.blob[np]=S.blob[t.file];
      undo.push([t,t.file]);t.file=np;
    }));
    await saveMusic();
    toast('GitHub에 저장 중…');
    await flush('음악 파일명 변경');
    mStop();S.cur=-1;S.playing=false;
    mcClean();S.lock=0;renderMusic(1);toast(`${n}곡의 파일명을 바꿨습니다. 방문자 화면에는 1분쯤 뒤 반영돼요.`);
  }catch(err){
    undo.forEach(([t,f])=>{t.file=f});qRestore(q0);S.lock=0;renderModal();toast('파일명 변경 실패: '+err.message,1)}
}
const COVER_PX=320; // 화면 표시는 최대 약 105px(CSS) → 3배 해상도 화면에서도 충분한 크기
async function putCover(src){
  // 화면의 object-fit:cover 와 같게 중앙 정사각형으로 크롭 후 최대 COVER_PX 로 저장 (원본이 작으면 확대하지 않음)
  let bmp;try{bmp=await createImageBitmap(src,{imageOrientation:'from-image'})}catch(e){bmp=await createImageBitmap(src)}
  const s=Math.min(bmp.width,bmp.height),sx=(bmp.width-s)/2,sy=(bmp.height-s)/2,out=Math.max(1,Math.min(COVER_PX,s));
  const cv=mkCanvas(out,out),cx=cv.getContext('2d');cx.fillStyle='#fff';cx.fillRect(0,0,out,out);cx.imageSmoothingQuality='high';
  cx.drawImage(bmp,sx,sy,s,s,0,0,out,out);if(bmp.close)bmp.close();
  const bl=await toBlob(cv,'image/jpeg',.86);if(!bl)throw new Error('커버 이미지 변환 실패');
  const p='music/cover/'+uid()+Math.random().toString(36).slice(2,6)+'.jpg';
  await putBlob(p,bl);return p;
}
async function embCover(f){
  if(!/\.mp3$/i.test(f.name))return null;
  try{
    const h=new Uint8Array(await f.slice(0,10).arrayBuffer());
    if(h[0]!=73||h[1]!=68||h[2]!=51)return null;
    const ver=h[3],size=(h[6]<<21)|(h[7]<<14)|(h[8]<<7)|h[9];
    const b=new Uint8Array(await f.slice(0,10+size).arrayBuffer());
    let o=10;
    if(h[5]&0x40)o+=ver==4?((b[10]<<21)|(b[11]<<14)|(b[12]<<7)|b[13]):(((b[10]<<24)|(b[11]<<16)|(b[12]<<8)|b[13])+4);
    const v2=ver==2,hl=v2?6:10;
    while(o+hl<=b.length){
      const id=String.fromCharCode(...b.slice(o,o+(v2?3:4)));
      if(!/^[A-Z0-9]+$/.test(id))break;
      const fs=v2?((b[o+3]<<16)|(b[o+4]<<8)|b[o+5]):ver==4?((b[o+4]<<21)|(b[o+5]<<14)|(b[o+6]<<7)|b[o+7]):(((b[o+4]<<24)|(b[o+5]<<16)|(b[o+6]<<8)|b[o+7])>>>0);
      const d=o+hl;if(fs<=0||d+fs>b.length)break;
      if(id=='APIC'||id=='PIC'){
        const enc=b[d];let i=d+1;
        if(v2)i+=3;else{while(i<d+fs&&b[i]!=0)i++;i++}
        i++;
        if(enc==0||enc==3){while(i<d+fs&&b[i]!=0)i++;i++}else{while(i+1<d+fs&&!(b[i]==0&&b[i+1]==0))i+=2;i+=2}
        const data=b.slice(i,d+fs);
        if(data.length>100)return new Blob([data],{type:data[0]==0xFF?'image/jpeg':data[0]==0x89?'image/png':'application/octet-stream'});
      }
      o=d+fs;
    }
  }catch(e){}
  return null;
}
async function msave(){
  if(S.lock)return;
  const al=eA();if(!al)return;
  if(!mDirty()){toast('변경한 내용이 없습니다.');return}
  const P=S.pend,y=al.id,snap={name:al.name,cover:al.cover,tracks:al.tracks,tf:al.tracks.map(t=>[t,t.lyric,t.cover])},W=(S.mw||al.tracks).slice();
  const cf=(S.cur>=0&&S.pa==y&&al.tracks[S.cur])?al.tracks[S.cur].file:null;
  const md=mMusicDirty(),nd=mNameDirty(),cd=mCovDirty();
  S.lock=1;let up=0,done=false;const q0=qSnap(),covFail=[];
  try{
    let ncv=null;
    if(cd){msg('앨범 커버 업로드 중…');ncv=await putCover(S.ac.file)}
    if(P.items.length){
      msg('업로드 준비 중…');
      for(const it of P.items){
        const f=it.f;
        msg(`준비 중 (${up+1}/${P.items.length}) ${f.name}`+(f.size>25e6?' - 큰 파일이라 오래 걸려요':''));
        const p=`music/${rnd()}.${mExt(f.name)}`; // 실제 파일명은 무작위 값 (곡 제목은 music.json 의 name 에만 남음)
        try{await putBlob(p,f)}catch(e){throw new Error(f.name+': '+e.message)}
        let cv=null;
        if(it.cv){try{cv=await putCover(it.cv.file)}catch(e){covFail.push(f.name)}}
        const e={name:String(it.title||'').trim().slice(0,60)||f.name.replace(/\.[^.]+$/,''),file:p};if(cv)e.cover=cv;const ly=lyN(it.lyric);if(ly)e.lyric=ly;
        const i=W.findIndex(m=>m.file==p);if(i<0)W.push(e);else{if(W[i].cover&&!cv)e.cover=W[i].cover;W[i]=e}
        up++;
      }
    }
    const oldCov=[]; // 기존 곡 가사·커버 수정 반영
    for(const f in S.tm){
      const q=S.tm[f],t=W.find(x=>x.file==f);if(!t)continue;
      if(q.ly!==undefined){const l=lyN(q.ly);if(l)t.lyric=l;else delete t.lyric}
      if(q.cv){msg('곡 커버 업로드 중…');const nc=await putCover(q.cv.file);if(t.cover)oldCov.push(t.cover);t.cover=nc}
      else if(q.cvx&&t.cover){oldCov.push(t.cover);delete t.cover}
    }
    al.tracks=W;if(nd)al.name=mnN(S.mt,al);if(ncv)al.cover=ncv;
    await saveMusic();
    const keepF=new Set(),keepC=new Set();
    AL().forEach(a=>{a.tracks.forEach(m=>{keepF.add(m.file);if(m.cover)keepC.add(m.cover)});if(a.cover)keepC.add(a.cover)});
    for(const x of snap.tracks){if(W.includes(x))continue;if(!keepF.has(x.file))await del(x.file).catch(()=>{});if(x.cover&&!keepC.has(x.cover))await del(x.cover).catch(()=>{})}
    if(ncv&&snap.cover&&!keepC.has(snap.cover))await del(snap.cover).catch(()=>{});
    for(const c of oldCov)if(!keepC.has(c))await del(c).catch(()=>{});
    msg('GitHub에 저장 중…');
    await flush('음악 저장: '+aLb(al)+' 앨범',(i,n)=>msg(`저장 준비 중 (${i}/${n})`));done=true;
    if(S.pa==y&&S.cur>=0){if(cf&&!W.some(m=>m.file==cf)||!cf){mStop();S.cur=-1;S.playing=false}else S.cur=W.findIndex(m=>m.file==cf)}
    mReset();S.alb=y;S.lock=0;mcClean();renderMusic(1);toast(covFail.length?'저장했지만 커버 읽기 실패: '+covFail.join(', ')+' (커버 없이 등록했어요)':'저장했습니다. 방문자 화면에는 1분쯤 뒤 반영돼요.',covFail.length?1:0);
  }catch(err){
    if(!done){al.tracks=snap.tracks;al.name=snap.name;al.cover=snap.cover;snap.tf.forEach(([t,l,c])=>{if(l===undefined)delete t.lyric;else t.lyric=l;if(c===undefined)delete t.cover;else t.cover=c});qRestore(q0)}
    S.lock=0;if(done)renderMusic(1);else renderModal();msg('저장 실패: '+err.message)}
}
async function rgAdd(){
  if(S.lock)return;
  const i=$('#m-year'),s=i?i.value.trim():'',tt=$('#m-rtitle'),tv=tt?tt.value:'',yn=$('#m-ynone'),none=!!(yn&&yn.checked);
  S.ry=s;S.rt=tv;S.rn=none;
  if(!none&&(!/^\d{4}$/.test(s)||+s<1900||+s>2100)){msg('년도는 1900~2100 사이 숫자 4자리로 입력하세요. (년도가 없으면 [없음]을 체크하세요)');return}
  const y=none?null:+s,ex=none?null:AL().find(a=>a.year===y);
  if(ex){S.alb=ex.id;mClear();S.mt=null;S.mte=false;S.ef='list';S.mv='edit';renderModal();toast(y+'년 앨범이 이미 있어 그 앨범으로 이동했어요.');return}
  S.lock=1;const old=S.music.albums,q0=qSnap();
  try{
    msg('앨범 생성 중…');
    let cv='';if(S.ac){cv=await putCover(S.ac.file)}
    const nm=String(tv).replace(/[\r\n]+/g,' ').trim().slice(0,30)||aDef(y),id=y!=null?'y'+y:'n'+rnd().slice(0,10);
    S.music.albums=[...old,{id,year:y,name:nm,cover:cv,tracks:[]}].sort(aSort);
    await saveMusic();
    await flush('앨범 생성: '+(y!=null?y+'년':nm));
    S.alb=id;mClear();S.mt=null;S.mte=false;S.ef='list';S.mv='edit';S.ry='';S.rt='';S.rn=false;S.lock=0;renderModal();toast((y!=null?y+'년 ':'')+'앨범을 만들었어요. 곡을 등록해 주세요.');
  }catch(err){S.music.albums=old;qRestore(q0);S.lock=0;msg('저장 실패: '+err.message)}
}
async function adel(){
  if(S.lock)return;
  const ys=$$('.ack:checked').map(c=>c.dataset.id);
  if(!ys.length){msg('삭제할 앨범을 먼저 체크하세요.');return}
  const gone=AL().filter(a=>ys.includes(a.id)),nt=gone.reduce((n,a)=>n+a.tracks.length,0);
  if(!confirm(`선택한 ${gone.length}개 앨범(${gone.map(aLb).join(', ')})과 수록곡 ${nt}개를 삭제할까요?\n삭제하면 되돌릴 수 없어요.`))return;
  S.lock=1;const old=S.music.albums,q0=qSnap();
  try{
    S.music.albums=old.filter(a=>!ys.includes(a.id));
    await saveMusic();
    const keepF=new Set(),keepC=new Set();
    AL().forEach(a=>{a.tracks.forEach(m=>{keepF.add(m.file);if(m.cover)keepC.add(m.cover)});if(a.cover)keepC.add(a.cover)});
    for(const a of gone){
      for(const x of a.tracks){if(!keepF.has(x.file))await del(x.file);if(x.cover&&!keepC.has(x.cover))await del(x.cover)}
      if(a.cover&&!keepC.has(a.cover))await del(a.cover);
    }
    msg('GitHub에 저장 중…');
    await flush('앨범 삭제: '+gone.map(aLb).join(', '));
    if(S.cur>=0&&ys.includes(S.pa)){mStop();S.cur=-1;S.playing=false}
    if(ys.includes(S.alb))S.alb=null;
    S.lock=0;mcClean();renderMusic(1);toast('앨범을 삭제했습니다.');
  }catch(err){S.music.albums=old;qRestore(q0);S.lock=0;renderModal();msg('삭제 실패: '+err.message)}
}
const mvm=d=>{
  const ks=mChecked(),al=eA();if(!al)return;const W=(S.mw||al.tracks).slice(),on=W.map(x=>ks.includes(x.file));
  if(!on.some(Boolean)){msg(ks.length?'저장 전 신규 곡은 순서를 바꿀 수 없어요.':'옮길 곡을 먼저 체크하세요.');return}
  if(d<0){for(let i=1;i<W.length;i++)if(on[i]&&!on[i-1]){[W[i],W[i-1]]=[W[i-1],W[i]];[on[i],on[i-1]]=[on[i-1],on[i]]}}
  else{for(let i=W.length-2;i>=0;i--)if(on[i]&&!on[i+1]){[W[i],W[i+1]]=[W[i+1],W[i]];[on[i],on[i+1]]=[on[i+1],on[i]]}}
  S.mw=W;renderModal()};

// ── app.js 와 연결 ──
ADM.music={reg:mRegHTML,edit:mEditHTML};
ADM.hideN=mHideN;
ADM.m={dirty:mDirty,clear:mClear,reset:mReset};

// ── 이벤트 처리기 (이 파일의 data-a 동작만 처리) ──
document.addEventListener('click',async e=>{
  const t=e.target;
  if(t.classList&&(t.classList.contains('mck')||t.classList.contains('ack')))return;
  const el=t.closest('[data-a]');if(!el)return;
  const a=el.dataset.a,v=el.dataset.v;
  if(a=='mcancel'){const d=mReset();renderModal();if(d)toast('저장하지 않은 변경을 취소했습니다.')}
  else if(a=='mreg'&&S.admin){const va=vAlb();if(va){S.alb=va.id;mClear();S.mt=null;S.mte=false;S.ef='play';S.mv='edit'}else{S.mv='reg';S.ry='';S.rt='';S.rn=false;mClear()}renderModal()}
  else if(a=='malbum'&&S.admin){if(mDirty()&&!confirm('저장하지 않은 변경이 사라집니다. 앨범 관리로 이동할까요?'))return;mReset();S.mv='list';S.lm=true;renderModal()}
  else if(a=='mhide'&&S.admin)await mHide();
  else if(a=='rgnew'&&S.admin){mClear();S.ry='';S.rt='';S.rn=false;S.mv='reg';renderModal()}
  else if(a=='rgcancel'&&S.admin){mClear();S.mv=AL().length?'list':'play';S.lm=AL().length>0;renderModal()}
  else if(a=='rgadd'&&S.admin)rgAdd();
  else if(a=='adel'&&S.admin)adel();
  else if(a=='pickacover'&&S.admin)clickEl('#m-acover');
  else if(a=='kerow'&&S.admin){ // 관리 상태: 곡을 누르면 재생이 아니라 그 곡의 수정(커버·가사)이 열림
    const al=eA(),x=al&&al.tracks[+v];if(!x||S.ke==x.file)return;
    S.ke=x.file;renderModal();const ta=$('#ke-ly');if(ta){ta.focus();ta.scrollIntoView({block:'nearest'})}}
  else if(a=='mdel'){const ks=mChecked();if(!ks.length){msg('삭제할 곡을 먼저 체크하세요.');return}
    S.mw=(S.mw||(eA()||{tracks:[]}).tracks).filter(x=>!ks.includes(x.file));renderModal()}
  else if(a=='mup')mvm(-1);
  else if(a=='mdn')mvm(1);
  else if(a=='pickmusic')clickEl('#m-up');
  else if(a=='pqcover'){S.pqi=+v;clickEl('#m-cover')}
  else if(a=='keclose'){S.ke=null;renderModal()}
  else if(a=='kecover')clickEl('#m-kcover');
  else if(a=='kecvx'){const q=S.tm[S.ke]||(S.tm[S.ke]={});if(q.cv)revoke(q.cv.url);delete q.cv;q.cvx=true;renderModal()}
  else if(a=='pqdel'){const it=S.pend.items[+v];if(it){if(it.cv)revoke(it.cv.url);S.pend.items.splice(+v,1);renderModal()}}
  else if(a=='msave')msave();
});
document.addEventListener('change',async e=>{
  const t=e.target;
  if(t.id=='m-up'){
    const all=[...t.files],good=all.filter(f=>/\.(mp3|m4a)$/i.test(f.name));t.value='';
    const I=S.pend.items;let dup=0,over=0;const big=[];
    for(const f of good){
      if(f.size>MUSIC_MAX){big.push(f.name);continue}
      if(I.some(x=>x.f.name==f.name&&x.f.size==f.size)){dup++;continue}
      if(I.length>=30){over++;continue}
      const it={f,title:f.name.replace(/\.[^.]+$/,''),cv:null};I.push(it);
      embCover(f).then(b=>{if(!b||it.cv||!S.pend.items.includes(it))return;it.cv={file:b,url:URL.createObjectURL(b)};
        const bt=$(`[data-a="pqcover"][data-v="${S.pend.items.indexOf(it)}"]`);if(bt)bt.innerHTML=`<img src="${it.cv.url}" alt="">`}).catch(()=>{});
    }
    renderModal();
    const ex=all.length-good.length;
    if(ex||dup||over||big.length)msg([big.length?`곡당 ${MUSIC_MAX/1e6}MB를 넘는 파일은 제외했어요: ${big.slice(0,3).join(', ')}${big.length>3?' 외 '+(big.length-3)+'개':''}`:'',ex?`mp3 · m4a 파일만 올릴 수 있어요 (제외 ${ex}개)`:'',dup?`이미 선택한 파일 ${dup}개는 건너뛰었어요`:'',over?`한 번에 최대 30곡까지만 담을 수 있어요 (제외 ${over}개)`:''].filter(Boolean).join(' · '));
  }
  else if(t.id=='m-ynone'){S.rn=t.checked;const yi=$('#m-year');if(yi){yi.disabled=t.checked;if(!t.checked)yi.focus()}}
  else if(t.id=='m-acover'){
    const f=t.files[0];t.value='';if(!f)return;
    if(!isImg(f)){msg('이미지 파일을 골라 주세요.');return}
    if(S.mv=='reg'){const yi=$('#m-year'),ti=$('#m-rtitle'),yn=$('#m-ynone');if(yi)S.ry=yi.value;if(ti)S.rt=ti.value;if(yn)S.rn=yn.checked}
    if(S.ac)revoke(S.ac.url);
    S.ac={file:f,url:URL.createObjectURL(f)};renderModal();
  }
  else if(t.id=='m-kcover'){
    const f=t.files[0];t.value='';if(!f||!S.ke)return;
    if(!isImg(f)){msg('이미지 파일을 골라 주세요.');return}
    const q=S.tm[S.ke]||(S.tm[S.ke]={});if(q.cv)revoke(q.cv.url);
    q.cv={file:f,url:URL.createObjectURL(f)};delete q.cvx;renderModal();
  }
  else if(t.id=='m-cover'){
    const f=t.files[0];t.value='';if(!f)return;
    if(!isImg(f)){msg('이미지 파일을 골라 주세요.');return}
    const it=S.pend.items[S.pqi];if(!it)return;
    if(it.cv)revoke(it.cv.url);
    it.cv={file:f,url:URL.createObjectURL(f)};renderModal();
  }
});
document.addEventListener('input',e=>{
  const t=e.target;
  if(t.id=='m-title')onTitle(t);
  else if(t.id=='ke-ly'&&S.ke){const q=S.tm[S.ke]||(S.tm[S.ke]={});q.ly=t.value;const b=$('[data-a="msave"]');if(b)b.textContent='[저장'+(mDirty()?' ●':'')+']'}
  else if(t.dataset&&t.dataset.pql!=null){const it=S.pend.items[+t.dataset.pql];if(it)it.lyric=t.value}
  else if(t.dataset&&t.dataset.pq!=null){const it=S.pend.items[+t.dataset.pq];if(it){it.title=t.value;const b=$('[data-a="msave"]');if(b)b.textContent='[저장'+(mDirty()?' ●':'')+']'}}
});
document.addEventListener('keydown',e=>{
  const t=e.target;
  if(e.key=='Enter'&&t.tagName=='INPUT'&&!['checkbox','radio','range','file','button'].includes(t.type)&&t.closest('#mbox')){if(t.id=='m-title')t.blur();else if(t.id=='m-year'||t.id=='m-rtitle')rgAdd()}
});
