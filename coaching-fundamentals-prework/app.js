/* ============================================================
   Genio e-Learning engine  (app.js)
   Do NOT edit per-course content here — all content lives in course.js.
   This file is the reusable player: home menu, narrated slide player
   with a "finish the screen before you continue" gate, reveal panels,
   workbook prompts, per-module knowledge checks, and an optional
   completion certificate. Progress is saved in the learner's browser
   (localStorage) — no server, no tracking.
   ============================================================ */
const $=id=>document.getElementById(id);
const SET=Object.assign({gate:true,transcript:true},DATA.settings||{});
const WB=DATA.workbook||null;                 // {file, pages:{name:page}} or null
const CERT=DATA.certificate||null;            // certificate config or null
const KEY='genio_elearn_'+(DATA.build||'v1');
let P=JSON.parse(localStorage.getItem(KEY)||'{}');
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(P));}catch(e){/* storage blocked — course still works, just no resume */}};
let mi=0,si=0,showTr=SET.transcript,dwell=null,failTimer=null,safety=null;
/* ---------- optional narration languages: DATA.languages=[{code,label,dir}], slide fields audio_<code>, transcript_<code> ---------- */
const LANGS=(DATA.languages&&DATA.languages.length>1)?DATA.languages:null;
let LANG=LANGS?LANGS[0].code:'';
try{const v=localStorage.getItem('genio_lang');if(LANGS&&LANGS.some(l=>l.code===v))LANG=v;}catch(e){}
const LX=(s,f)=>(LANGS&&LANG!==LANGS[0].code&&s[f+'_'+LANG])||s[f];
const LDIR=()=>{const l=LANGS&&LANGS.find(x=>x.code===LANG);return (l&&l.dir)||'ltr';};
function renderLang(){
  if(!LANGS)return;
  const html=`<span class="langlbl">Narration</span>`+LANGS.map(l=>`<button class="langbtn${l.code===LANG?' on':''}" data-l="${l.code}" ${l.dir?`dir="${l.dir}"`:''}>${l.label}</button>`).join('');
  ['langSel','langHome'].forEach(id=>{const el=$(id);if(!el)return;el.classList.remove('hide');el.innerHTML=html;
    el.querySelectorAll('.langbtn').forEach(b=>b.onclick=()=>{LANG=b.dataset.l;try{localStorage.setItem('genio_lang',LANG);}catch(e){}
      renderLang(); if(!$('play').classList.contains('hide'))show();});});
}
const audio=new Audio(); audio.preload='auto';

/* ---------- one-time chrome from DATA.course ---------- */
function initChrome(){
  const c=DATA.course||{};
  document.title=c.title||'e-Learning';
  $('hTitle').textContent=c.title||'';
  $('hTag').textContent=c.subtitle||'e-Learning · Genio Talent Development';
  $('heroH').textContent=c.heroTitle||'Welcome to your e-Learning';
  $('heroP').innerHTML=(c.intro||[]).map(p=>`<p>${p}</p>`).join('')||`<p>${c.introText||''}</p>`;
  if(c.cover){$('cover').src=c.cover;$('cover').alt=c.title||'';}else{$('cover').classList.add('hide');}
  $('minCount').textContent=c.minutes||'';
  $('doneMsg').textContent=c.completeMessage||'You have finished every module. Well done.';
  $('foot').innerHTML=c.footer||'&copy; Genio Talent Development · www.genio-me.com';
  if(!CERT){$('certUI').classList.add('hide');}     // no certificate configured
}

/* ---------- progress helpers + gate ---------- */
const seen=()=>{const m=DATA.modules[mi];return (P[m.id]&&P[m.id].seen)||[];};
function markSeen(){const m=DATA.modules[mi];const s=new Set(seen());s.add(si);
  P[m.id]=Object.assign(P[m.id]||{},{seen:[...s]});save();gate();}
function gate(){const m=DATA.modules[mi];const done=!SET.gate||seen().includes(si);
  const last=si===m.slides.length-1;
  $('next').disabled=last||!done;
  $('toQuiz').disabled=!done;
  $('lock').classList.toggle('hide',done);
  if(!done)$('lock').innerHTML='<b>&#128274;</b> listen to finish this screen';}

function views(v){['home','play','quiz','done'].forEach(x=>$(x).classList.toggle('hide',x!==v));window.scrollTo(0,0);}

/* ---------- home / module menu ---------- */
function renderHome(){
  $('mCount').textContent=DATA.modules.length;
  $('sCount').textContent=DATA.modules.reduce((a,m)=>a+m.slides.length,0);
  $('mods').innerHTML=DATA.modules.map((m,i)=>{
    const p=P[m.id]||{}; const q=p.quiz;
    const at=(p.slide&&p.slide>0&&p.slide<m.slides.length)?p.slide+1:0;
    const st=(q!==undefined?`<span class="done">&#10003; Quiz ${q}/${m.quiz.length}</span>`
        :(at?`Resume at screen ${at}`:'Not started'))
        +(at?` &middot; <a href="#" class="restart" data-i="${i}">start over</a>`:'');
    return `<div class="card mod" data-i="${i}" tabindex="0" role="button"><div class="num">MODULE ${m.id}</div>
      <h3>${m.title}</h3><div class="sub">${m.sub||''}</div>
      <div class="st"><span>${st}</span><span>${m.slides.length} screens</span></div></div>`;}).join('');
  document.querySelectorAll('.mod').forEach(e=>{
    e.onclick=()=>openMod(+e.dataset.i);
    e.onkeydown=ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();openMod(+e.dataset.i);}};
  });
  document.querySelectorAll('.restart').forEach(e=>e.onclick=ev=>{
    ev.preventDefault(); ev.stopPropagation(); openMod(+e.dataset.i,true);});
}
function openMod(i,fresh){mi=i;const m=DATA.modules[i];
  let s=fresh?0:((P[m.id]||{}).slide||0);
  if(!(s>=0&&s<m.slides.length))s=0;                 // clamp stale/invalid index
  si=s; views('play'); show();}

/* ---------- slide player ---------- */
function show(){
  const m=DATA.modules[mi],s=m.slides[si];
  $('pTitle').textContent=`Module ${m.id} · ${m.title}`;
  $('slide').src=s.img; $('slide').alt=s.alt||`Module ${m.id}, screen ${si+1}`;
  const tx=LX(s,'transcript'), au=LX(s,'audio');
  $('trt').textContent=tx||''; $('trt').dir=LDIR();
  $('tr').classList.toggle('hide',!SET.transcript||!tx);
  $('ttog').classList.toggle('hide',!SET.transcript||!tx);
  $('pos').textContent=`Screen ${si+1} of ${m.slides.length}`;
  $('prog').style.width=((si+1)/m.slides.length*100)+'%';
  $('prev').disabled=si===0; $('next').disabled=si===m.slides.length-1;
  $('toQuiz').classList.toggle('hide',si!==m.slides.length-1);
  $('pp').classList.toggle('hide',!au);           // hide play button on silent screens
  audio.pause();
  if(au){ audio.src=au; }                    // attach narration
  else { audio.removeAttribute('src'); audio.load(); } // silent screen: no bogus empty src (which would resolve to the page URL and error)
  $('pp').innerHTML='&#9654;';
  renderPanel(s);
  renderWb(s);
  renderHero(s);
  if(dwell){clearTimeout(dwell);dwell=null;}
  if(failTimer){clearTimeout(failTimer);failTimer=null;}
  if(safety){clearTimeout(safety);safety=null;}
  gate();
  if(SET.gate && !seen().includes(si)){
    if(!au){dwell=setTimeout(markSeen,6000);}      // silent screen: short dwell then unlock
    // safety net: never trap a learner, whatever happens to the audio
    safety=setTimeout(()=>{ if(!seen().includes(si)){
        $('lock').innerHTML='<b>&#9432;</b> you can continue, or press play to hear this screen';
        markSeen(); } }, 60000);
  } else if(!SET.gate && !seen().includes(si)){ markSeen(); }
  P[m.id]=Object.assign(P[m.id]||{},{slide:si}); save();
  if(au) startAudio();                             // auto-play this screen's narration
}
function renderHero(s){
  const el=$('wbhero');
  if(!s.workbookHero||!WB){el.classList.add('hide');el.innerHTML='';return;}
  el.classList.remove('hide');
  el.innerHTML=`<p><b>Download your participant workbook first.</b> Several screens ask you to stop and write in it. Keep it open beside you, or print it.</p>
    <a class="dl" href="${WB.file}" download>⬇ Download workbook (PDF)</a>`;
}
function renderWb(s){
  const el=$('wb'); if(!s.wb||!WB){el.classList.add('hide');el.innerHTML='';return;}
  const names=s.wb.split(' → ');
  const pgs=names.map(n=>(WB.pages||{})[n]).filter(Boolean);
  const pg=pgs.length?(pgs.length>1?`p${Math.min(...pgs)}–${Math.max(...pgs)}`:`p${pgs[0]}`):'';
  el.classList.remove('hide');
  el.innerHTML=`<span>📓</span><span>Workbook activity: <b>${s.wb}</b></span>`
    +`<a class="dlsm" href="${WB.file}" download>PDF</a>`+(pg?`<span class="pg">${pg}</span>`:'');
}
/* Reveal panel — attached per-slide as s.panel.
   modes:  'define'          items:[{name, detail}]
           'driversBarriers' items:[{name, drivers:[..], barriers:[..]}]
           'questions'       items:[{name, questions:[..]}]              */
function renderPanel(s){
  const box=$('panel'), cfg=s.panel;
  if(!cfg){box.classList.add('hide');box.innerHTML='';return;}
  box.classList.remove('hide');
  const items=cfg.items||[];
  box.innerHTML=`<h4>${cfg.title||'Select an option to see the detail'}</h4><div class="segs">`+
    items.map((it,i)=>`<button class="seg" data-s="${i}">${it.name}</button>`).join('')+
    `</div><div class="pane" id="pane"><p class="hint">Select an option above to see the detail.</p></div>`;
  box.querySelectorAll('.seg').forEach(b=>b.onclick=()=>{
    box.querySelectorAll('.seg').forEach(x=>x.classList.remove('on')); b.classList.add('on');
    const it=items[+b.dataset.s];
    if(cfg.mode==='driversBarriers'){
      $('pane').innerHTML=`<h5>${it.name}</h5><div class="cols">
        <div class="dv"><h6>Motivators &amp; drivers</h6><ul>${(it.drivers||[]).map(x=>`<li>${x}</li>`).join('')}</ul></div>
        <div class="br"><h6>Barriers</h6><ul>${(it.barriers||[]).map(x=>`<li>${x}</li>`).join('')}</ul></div></div>`;
    } else if(cfg.mode==='questions'){
      $('pane').innerHTML=`<h5>${it.name}</h5><h6 style="font-size:11.5px;letter-spacing:1px;text-transform:uppercase;color:var(--mut);margin-bottom:6px">Questions to uncover their goals</h6><ul>${(it.questions||[]).map(x=>`<li>${x}</li>`).join('')}</ul>`;
    } else { /* define */
      $('pane').innerHTML=`<h5>${it.name}</h5><p style="font-size:14.5px;color:#33404f">${it.detail||''}</p>`;
    }
  });
}

/* ---------- audio with graceful fallback ---------- */
function startAudio(){
  if(!audio.src) return;
  if(audio.ended || (audio.duration && audio.currentTime>=audio.duration-0.05)) audio.currentTime=0;
  let p;
  try{ p=audio.play(); }catch(e){ audioFallback(); return; }
  if(failTimer)clearTimeout(failTimer);
  failTimer=setTimeout(()=>{ if(audio.paused||audio.currentTime===0) audioFallback(); },5000);
  if(p&&p.then){ p.then(()=>{ $('pp').innerHTML='&#10074;&#10074;'; }).catch(()=>{ audioFallback(); }); }
  else { $('pp').innerHTML='&#10074;&#10074;'; }
}
function audioFallback(){
  if(failTimer){clearTimeout(failTimer);failTimer=null;}
  $('lock').classList.remove('hide');
  $('lock').innerHTML='<b>&#9432;</b> audio unavailable: read the transcript below, then continue';
  markSeen();
}
$('pp').onclick=()=>{ if(audio.paused){ startAudio(); } else { audio.pause(); $('pp').innerHTML='&#9654;'; } };
audio.onerror=()=>{ const s=DATA.modules[mi]&&DATA.modules[mi].slides[si]; if(s&&s.audio) audioFallback(); };
audio.onplaying=()=>{ if(failTimer){clearTimeout(failTimer);failTimer=null;} $('pp').innerHTML='&#10074;&#10074;'; };
audio.onended=()=>{ if(failTimer){clearTimeout(failTimer);failTimer=null;} $('pp').innerHTML='&#9654;'; markSeen(); };

/* ---------- nav ---------- */
$('next').onclick=()=>{const m=DATA.modules[mi]; if(si<m.slides.length-1){si++;show();}};
$('prev').onclick=()=>{if(si>0){si--;show();}};
$('back').onclick=()=>{audio.pause();renderHome();views('home');};
$('ttog').onclick=()=>{showTr=!showTr;$('tr').classList.toggle('hide',!showTr);$('ttog').textContent=showTr?'Hide transcript':'Show transcript';};
document.addEventListener('keydown',e=>{ if($('play').classList.contains('hide'))return;
  if(e.key==='ArrowRight'&&!$('next').disabled)$('next').click();
  if(e.key==='ArrowLeft'&&!$('prev').disabled)$('prev').click();
  if(e.key===' '){const s=DATA.modules[mi].slides[si]; if(s.audio){e.preventDefault();$('pp').click();}}});

/* ---------- knowledge check ---------- */
$('toQuiz').onclick=()=>{audio.pause();renderQuiz();views('quiz');};
function renderQuiz(){
  const m=DATA.modules[mi]; $('qTitle').textContent=`Knowledge check: Module ${m.id}`;
  $('res').classList.add('hide'); $('res').innerHTML=''; $('submit').classList.remove('hide');
  $('qs').innerHTML=m.quiz.map((q,i)=>`<div class="q" data-q="${i}"><p>${i+1}. ${q.q}</p>
    ${q.a.map((a,j)=>`<div class="opt" data-o="${j}" tabindex="0" role="button">${a}</div>`).join('')}
    <div class="fb hide"></div></div>`).join('');
  $('qs').querySelectorAll('.q').forEach(qe=>qe.querySelectorAll('.opt').forEach(o=>{
    const pick=()=>{ if(qe.dataset.locked)return;
      qe.querySelectorAll('.opt').forEach(x=>x.classList.remove('sel')); o.classList.add('sel'); };
    o.onclick=pick;
    o.onkeydown=ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();pick();}};
  }));
}
$('submit').onclick=()=>{
  const m=DATA.modules[mi]; let sc=0,all=true;
  $('qs').querySelectorAll('.q').forEach(qe=>{
    const i=+qe.dataset.q,q=m.quiz[i],sel=qe.querySelector('.opt.sel');
    if(!sel){all=false;return;}
    qe.dataset.locked=1;
    qe.querySelectorAll('.opt').forEach((o,j)=>{ if(j===q.c)o.classList.add('ok');
      else if(o.classList.contains('sel'))o.classList.add('no'); });
    if(+sel.dataset.o===q.c)sc++;
    const fb=qe.querySelector('.fb'); fb.textContent=q.e||''; fb.classList.toggle('hide',!q.e);});
  if(!all){alert('Please answer every question before submitting.');
    $('qs').querySelectorAll('.q').forEach(q=>delete q.dataset.locked);return;}
  P[m.id]=Object.assign(P[m.id]||{},{quiz:sc}); save();
  $('submit').classList.add('hide');
  const last=mi===DATA.modules.length-1;
  const alldone=DATA.modules.every(x=>(P[x.id]||{}).quiz!==undefined);
  $('res').classList.remove('hide');
  $('res').innerHTML=`<div style="text-align:center;padding:22px 0"><div class="big" style="font-size:40px;color:var(--navy);font-weight:700">${sc} / ${m.quiz.length}</div>
    <p style="color:var(--mut);margin:8px 0 16px">${sc===m.quiz.length?'Full marks.':'Review the notes above, then carry on.'}</p>
    <button class="btn sec" id="retry">Retake</button>
    <button class="btn" id="cont">${alldone?'Finish':(last?'Back to modules':'Next module')} &rarr;</button></div>`;
  $('retry').onclick=()=>renderQuiz();
  $('cont').onclick=()=>{ if(alldone){views('done');}
    else if(!last){mi++;si=0;views('play');show();} else {renderHome();views('home');} };
};

/* ---------- certificate (optional) ---------- */
function certNo(name){
  let h=0; const s=(name||'')+'|'+(DATA.build||'');
  for(let i=0;i<s.length;i++){h=(h*31+s.charCodeAt(i))>>>0;}
  return (CERT.prefix||'GTD')+'-'+String(h%9000+1000);
}
function buildCert(name){
  const c=CERT, sg=c.signer||{};
  const d=new Date();
  const date=d.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
  const scores=DATA.modules.map(m=>(P[m.id]||{}).quiz||0).reduce((a,b)=>a+b,0);
  const total=DATA.modules.reduce((a,m)=>a+m.quiz.length,0);
  return `<div class="cert" id="certDoc">
   <div class="rule"></div><div class="rule2"></div>
   <div class="top">${sg.logo?`<img src="${sg.logo}" alt="Genio">`:''}
     <div class="brand"><h3>${c.brandName||'GENIO TALENT DEVELOPMENT'}</h3>
       <p>${c.brandTagline||'Pharmaceutical Specialised Training &amp; Consultancy'}</p>
       <span>${c.brandContact||'www.genio-me.com &nbsp;|&nbsp; New Cairo, Egypt'}</span></div></div>
   <hr>
   <h1>CERTIFICATE OF COMPLETION</h1>
   <div class="sub">${c.programmeLine||'Corporate Programme'}${c.org?` &nbsp;|&nbsp; ${c.org}`:''}</div>
   <div class="lead">This is to certify that</div>
   <div class="name">${name.replace(/[<>]/g,'')}</div>
   <div class="lead">has successfully completed all requirements of:</div>
   <div class="course">${c.course||''}</div>
   <div class="desc">${c.desc||''}</div>
   <div class="boxes">
     <div class="bx"><h4>${c.periodLabel||'COMPLETED'}</h4><b>${date}</b><span>Assessment ${scores}/${total}</span></div>
     <div class="bx mid"><h4>TRAINING HOURS</h4><b>${c.hours||''}</b><span>${c.hoursNote||''}</span></div>
     <div class="bx"><h4>DELIVERY FORMAT</h4><b>${c.format||''}</b><span>${c.formatNote||''}</span></div>
   </div>
   ${(c.modules&&c.modules.length)?`<div class="curtitle">Programme Curriculum &amp; Core Learning Areas</div>
   <div class="grid">${c.modules.map(m=>`<div class="cell"><h5>${m.n}</h5><ul>${(m.i||[]).map(x=>`<li>${x}</li>`).join('')}</ul></div>`).join('')}</div>`:''}
   <div class="sig">
     <div>${sg.signature?`<img class="s" src="${sg.signature}" alt="">`:''}
       <div class="who">${sg.name||''}</div>
       <div class="role">${sg.role||''}</div></div>
     ${sg.stamp?`<div class="stamp"><img src="${sg.stamp}" alt=""></div>`:'<div></div>'}
   </div>
   <div class="foot">Issued by ${c.brandName||'Genio Talent Development'} &nbsp;&middot;&nbsp; Certificate No: ${certNo(name)} &nbsp;&middot;&nbsp; Date of Issue: ${date}</div>
  </div>`;
}
/* ---------- optional completion reporting: DATA.report={url,key,table,course} ---------- */
const REP=DATA.report||null;
const PKEY=KEY+'_pending';
function getPending(){try{return JSON.parse(localStorage.getItem(PKEY)||'[]');}catch(e){return [];}}
function setPending(a){try{localStorage.setItem(PKEY,JSON.stringify(a));}catch(e){}}
function postResult(rec){
  return fetch(REP.url.replace(/\/$/,'')+'/rest/v1/'+(REP.table||'elearn_completions'),{method:'POST',
    headers:{'apikey':REP.key,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify(rec)})
    .then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return true;});
}
function flushPending(showMsg){
  if(!REP)return Promise.resolve();
  const list=getPending(); if(!list.length)return Promise.resolve();
  return Promise.all(list.map(rec=>postResult(rec).then(()=>null).catch(()=>rec))).then(left=>{
    left=left.filter(Boolean); setPending(left);
    if(showMsg&&$('repMsg')){$('repMsg').classList.remove('hide');
      $('repMsg').innerHTML=left.length?'&#9888; Your result could not be sent right now (no connection?). It will be sent automatically next time you open this course.'
        :'&#10003; Your result has been recorded with Genio Talent Development.';}
  });
}
if(REP&&$('emailBox'))$('emailBox').classList.remove('hide');
if($('makeCert')) $('makeCert').onclick=()=>{
  const n=($('learner').value||'').trim();
  if(n.length<3){alert('Please enter your full name as it should appear on the certificate.');$('learner').focus();return;}
  let em='';
  if(REP){em=($('learnerEmail').value||'').trim().toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)){alert('Please enter your work email address.');$('learnerEmail').focus();return;}}
  const notdone=DATA.modules.filter(x=>(P[x.id]||{}).quiz===undefined);
  if(notdone.length){alert('Finish every module and its knowledge check first.');return;}
  P.name=n; if(em)P.email=em; save();
  $('certWrap').innerHTML=buildCert(n);
  $('certWrap').classList.remove('hide'); $('certActions').classList.remove('hide');
  $('makeCert').classList.add('hide'); document.querySelectorAll('#certUI .namebox').forEach(x=>x.classList.add('hide'));
  if(REP){
    const scores={},max={};DATA.modules.forEach(m=>{scores[m.id]=(P[m.id]||{}).quiz||0;max[m.id]=m.quiz.length;});
    const tot=Object.values(scores).reduce((a,b)=>a+b,0), mx=Object.values(max).reduce((a,b)=>a+b,0);
    const rec={course:REP.course||DATA.course.title,build:DATA.build||'',name:n,email:em,scores:scores,max_scores:max,
      total:tot,max_total:mx,cert_no:certNo(n),narration:LANG||'en',client_time:new Date().toISOString()};
    setPending(getPending().concat([rec])); flushPending(true);
  }
  $('certWrap').scrollIntoView({behavior:'smooth'});
};
if($('printCert')) $('printCert').onclick=()=>window.print();
if($('editName')) $('editName').onclick=()=>{
  $('certWrap').classList.add('hide'); $('certActions').classList.add('hide');
  $('makeCert').classList.remove('hide'); document.querySelectorAll('#certUI .namebox').forEach(x=>{if(x.id!=='emailBox'||REP)x.classList.remove('hide');});
  $('learner').focus();
};

/* ---------- misc ---------- */
$('homeBtn').onclick=()=>{renderHome();views('home');};
$('reset').onclick=()=>{ if(confirm('Clear your progress and quiz scores?')){P={};save();renderHome();}};

/* ---------- boot ---------- */
initChrome();
if(CERT && P.name && $('learner'))$('learner').value=P.name;
if(P.email && $('learnerEmail'))$('learnerEmail').value=P.email;
flushPending(false);
renderHome();
renderLang();
