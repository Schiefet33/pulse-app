/* ===== SUPABASE-DATEN (nur der publishable Schlüssel, niemals der secret Schlüssel!) ===== */
const SUPABASE_URL='https://mmedmmslmjszrnrkedii.supabase.co';
const SUPABASE_ANON_KEY='sb_publishable_O5CD6YHMSj12Nk0PW7kEjA_AWA4B1vY';
/* ========================================================================================= */

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const DEFAULT_GOAL='Allgemeine Leistungssteigerung';
const DEFAULT_AVATAR={skin:'#f1c7a5',hair:'Kurz',shirt:'#83c8ff',name:''};
const DEFAULT_BODY={height:'',weight:''};
const CHAT_INTRO=$('#chatBox').innerHTML;

const isRecoveryLink=location.hash.includes('type=recovery');
let recoveryMode=isRecoveryLink;
const configured=SUPABASE_URL.startsWith('https://')&&SUPABASE_ANON_KEY.length>20;
const db=(configured&&window.supabase)?window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY):null;

function emptyState(){
  return {workouts:[],goal:DEFAULT_GOAL,photos:[],avatar:{...DEFAULT_AVATAR},body:{...DEFAULT_BODY},role:'user',email:'',userId:null};
}
let state=emptyState();
let photoFilter='Alle';

function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2400);}
function isAdmin(){return state.role==='admin'||state.role==='founder';}
function roleLabel(r){return r==='founder'?'Gründer':r==='admin'?'Admin':'Nutzer';}

/* ---------- Cloud: laden und speichern ---------- */

async function loadRemote(){
  const [p,w]=await Promise.all([
    db.from('profiles').select('role,height,weight,goal,avatar').eq('id',state.userId).single(),
    db.from('workouts').select('*').order('date',{ascending:false}).order('id',{ascending:false})
  ]);
  if(p.data){
    state.role=p.data.role||'user';
    state.goal=p.data.goal||DEFAULT_GOAL;
    state.body={height:p.data.height??'',weight:p.data.weight??''};
    state.avatar={...DEFAULT_AVATAR,...(p.data.avatar||{})};
  }
  if(w.data){
    state.workouts=w.data.map(r=>({id:r.id,kind:r.kind,date:r.date,duration:Number(r.duration),distance:Number(r.distance||0),pace:r.pace||'',notes:r.notes||''}));
  }
  if(p.error||w.error)toast('Daten konnten nicht vollständig geladen werden');
}

let profileTimer;
function saveProfile(){
  clearTimeout(profileTimer);
  profileTimer=setTimeout(async()=>{
    if(!db||!state.userId)return;
    const {error}=await db.from('profiles').update({
      height:state.body.height===''?null:Number(state.body.height),
      weight:state.body.weight===''?null:Number(state.body.weight),
      goal:state.goal,
      avatar:state.avatar
    }).eq('id',state.userId);
    if(error)toast('Speichern fehlgeschlagen');
  },500);
}

/* ---------- Anmeldung ---------- */

let authMode='login';
let currentUid=null;

function setMsg(text,kind){
  const m=$('#authMsg');
  m.textContent=text||'';
  m.classList.toggle('ok',kind==='ok');
}
function setBusy(b){$('#authSubmit').disabled=b;}

function setAuthMode(mode){
  authMode=mode;
  const recovery=mode==='recovery', forgot=mode==='forgot', register=mode==='register';
  $('#authTabs').hidden=recovery;
  $('#authEmailLabel').hidden=recovery;
  $('#authPwLabel').hidden=forgot;
  $('#authForgot').hidden=mode!=='login';
  $$('[data-auth]').forEach(b=>b.classList.toggle('selected',b.dataset.auth===(forgot?'login':mode)));
  $('#authPwText').textContent=recovery?'Neues Passwort (mind. 8 Zeichen)':register?'Passwort (mind. 8 Zeichen)':'Passwort';
  $('#authPassword').autocomplete=(register||recovery)?'new-password':'current-password';
  $('#authSubmit').textContent={login:'Anmelden',register:'Konto erstellen',forgot:'Link zum Zurücksetzen senden',recovery:'Neues Passwort speichern'}[mode];
  setMsg('');
}

function showAuthCard(mode){
  $('#authScreen').hidden=false;
  $('.app-shell').hidden=true;
  $('#authBoot').hidden=true;
  $('#authCard').hidden=false;
  $('#authPassword').value='';
  setAuthMode(mode);
}

function authError(err){
  const m=(err&&err.message)||'';
  if(m.includes('Invalid login credentials'))return 'E-Mail oder Passwort stimmt nicht.';
  if(m.includes('Email not confirmed'))return 'Bitte bestätige zuerst deine E-Mail-Adresse über den Link in der Nachricht.';
  if(m.includes('already registered'))return 'Für diese E-Mail gibt es schon ein Konto. Bitte melde dich an.';
  if(m.toLowerCase().includes('rate limit')||m.includes('seconds'))return 'Zu viele Versuche. Bitte warte kurz und probiere es erneut.';
  if(m.includes('Password should'))return 'Das Passwort ist zu schwach. Nimm mindestens 8 Zeichen.';
  return m||'Es ist ein Fehler aufgetreten.';
}

$$('[data-auth]').forEach(b=>b.addEventListener('click',()=>setAuthMode(b.dataset.auth)));
$('#authForgot').addEventListener('click',()=>setAuthMode('forgot'));

$('#authForm').addEventListener('submit',async e=>{
  e.preventDefault();
  if(!db)return;
  const email=$('#authEmail').value.trim();
  const pw=$('#authPassword').value;
  setMsg('');
  if(authMode!=='recovery'&&!email){setMsg('Bitte gib deine E-Mail-Adresse ein.');return;}
  if(authMode!=='forgot'&&!pw){setMsg('Bitte gib ein Passwort ein.');return;}
  if((authMode==='register'||authMode==='recovery')&&pw.length<8){setMsg('Das Passwort braucht mindestens 8 Zeichen.');return;}
  setBusy(true);
  try{
    const redirect=location.origin+location.pathname;
    if(authMode==='login'){
      const {error}=await db.auth.signInWithPassword({email,password:pw});
      if(error)setMsg(authError(error));
    }else if(authMode==='register'){
      const {data,error}=await db.auth.signUp({email,password:pw,options:{emailRedirectTo:redirect}});
      if(error)setMsg(authError(error));
      else if(!data.session)setMsg('Fast geschafft: Wir haben dir eine E-Mail zur Bestätigung geschickt. Öffne den Link darin und melde dich danach an.','ok');
    }else if(authMode==='forgot'){
      const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo:redirect});
      if(error)setMsg(authError(error));
      else setMsg('Falls ein Konto mit dieser E-Mail existiert, ist ein Link zum Zurücksetzen unterwegs.','ok');
    }else if(authMode==='recovery'){
      const {error}=await db.auth.updateUser({password:pw});
      if(error){setMsg(authError(error));}
      else{
        recoveryMode=false;
        history.replaceState(null,'',location.pathname);
        const {data}=await db.auth.getSession();
        if(data.session){currentUid=data.session.user.id;await startApp(data.session);}
        else showAuthCard('login');
      }
    }
  }finally{setBusy(false);}
});

async function startApp(session){
  state=emptyState();
  state.userId=session.user.id;
  state.email=session.user.email||'';
  await loadRemote();
  $('#authScreen').hidden=true;
  $('.app-shell').hidden=false;
  renderAll();
  showView('home');
}

async function handleAuth(event,session){
  if(event==='PASSWORD_RECOVERY')recoveryMode=true;
  if(recoveryMode){showAuthCard('recovery');return;}
  if(session&&session.user){
    if(currentUid===session.user.id)return;
    currentUid=session.user.id;
    await startApp(session);
  }else{
    currentUid=null;
    state=emptyState();
    $('#chatBox').innerHTML=CHAT_INTRO;
    showAuthCard('login');
  }
}

$('#logoutBtn').onclick=async()=>{if(db)await db.auth.signOut();};

/* ---------- Navigation ---------- */

function showView(name){
  const TAB_OF={avatar:'profile',body:'profile',photos:'profile',evolve:'profile',settings:'profile',admin:'profile'};
  const nextView=$('#'+name+'View');
  const nextTab=$(`.tab[data-view="${TAB_OF[name]||name}"]`);
  if(!nextView)return;
  if(name==='admin'){
    if(!isAdmin())return;
    loadAdmin();
  }

  $$('.view').forEach(v=>v.classList.toggle('active',v===nextView));
  $$('.tab').forEach(b=>b.classList.toggle('active',b===nextTab));

  if(nextTab&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    nextTab.animate([
      {transform:'translateY(2px) scale(.94)'},
      {transform:'translateY(-3px) scale(1.08)'},
      {transform:'translateY(-2px) scale(1)'}
    ],{duration:420,easing:'cubic-bezier(.16,1,.3,1)'});
  }
  window.scrollTo({top:0,behavior:'smooth'});
}

$$('.tab').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
$$('[data-go]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.go)));
$('#settingsBtn').onclick=()=>showView('settings');

/* ---------- Training ---------- */

$$('[data-kind]').forEach(b=>b.onclick=()=>{
  $$('#workoutForm select option').forEach(o=>o.selected=o.value===b.dataset.kind);
  $$('[data-kind]').forEach(x=>x.classList.toggle('selected',x===b));
  $('#runFields').style.display=b.dataset.kind==='Laufen'?'grid':'none';
});
$('#date').value=new Date().toISOString().slice(0,10);
$('#kind').onchange=()=>$('#runFields').style.display=$('#kind').value==='Laufen'?'grid':'none';

$('#workoutForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const kind=$('#kind').value;
  const row={
    kind,
    date:$('#date').value,
    duration:Number($('#duration').value),
    distance:kind==='Laufen'?Number($('#distance').value||0):0,
    pace:$('#pace').value||null,
    notes:$('#notes').value||null
  };
  const {data,error}=await db.from('workouts').insert(row).select().single();
  if(error||!data){toast('Training konnte nicht gespeichert werden');return;}
  state.workouts.unshift({id:data.id,kind:data.kind,date:data.date,duration:Number(data.duration),distance:Number(data.distance||0),pace:data.pace||'',notes:data.notes||''});
  e.target.reset();
  $('#date').value=new Date().toISOString().slice(0,10);
  $('#runFields').style.display='grid';
  render();
  toast('Training gespeichert');
});

/* ---------- Coach ---------- */

function coachReply(q){
  const runs=state.workouts.filter(w=>w.kind==='Laufen');
  const lifts=state.workouts.filter(w=>w.kind==='Krafttraining');
  const km=runs.reduce((a,w)=>a+w.distance,0);
  const low=q.toLowerCase();
  if(low.includes('woche')||low.includes('analyse'))return `Du hast ${state.workouts.length} Einheiten gespeichert, davon ${runs.length} Läufe und ${lifts.length} Krafteinheiten. Erfasste Laufdistanz insgesamt: ${km.toFixed(1).replace('.',',')} km. Für eine aussagekräftige Wochenanalyse brauche ich regelmäßige Einträge mit Datum, Distanz und Dauer.`;
  if(low.includes('heute')||low.includes('train'))return state.workouts.length?`Dein letztes gespeichertes Training war ${state.workouts[0].kind} am ${state.workouts[0].date}. Wenn du dich erholt fühlst, kannst du heute eine moderate Einheit planen. Bei Schmerzen, Krankheit oder ungewöhnlicher Erschöpfung lieber pausieren. Ich kenne deine aktuelle Erholung noch nicht.`:'Noch sind keine Trainingsdaten gespeichert. Erfasse zuerst ein paar Einheiten, damit ich sinnvollere Vorschläge machen kann.';
  if(low.includes('lauf')||low.includes('pace'))return `Für bessere Laufleistungen kombiniere lockere Läufe, eine gezielte Qualitätseinheit und einen längeren Lauf – passend zu deinem aktuellen Umfang. Steigere die Belastung nicht sprunghaft. Dein eingestelltes Ziel ist: ${state.goal}.`;
  if(low.includes('ziel'))return `Dein aktuelles Ziel lautet: ${state.goal}. Wir können daraus einen Plan machen, sobald wir deine aktuelle Referenzzeit, verfügbare Trainingstage und deinen Wochenumfang kennen.`;
  return `Ich kann deine gespeicherten Trainingsdaten zusammenfassen und allgemeine Trainingsideen geben. Deine Frage war: „${q}“. Für präzise, personalisierte KI-Antworten muss später ein Cloud-KI-Dienst sicher angebunden werden.`;
}

function addMessage(text,who){
  const d=document.createElement('div');
  d.className='bubble '+who;
  d.textContent=text;
  $('#chatBox').append(d);
  $('#chatBox').scrollTop=$('#chatBox').scrollHeight;
}
$('#chatForm').addEventListener('submit',e=>{
  e.preventDefault();
  const q=$('#chatInput').value.trim();
  if(!q)return;
  addMessage(q,'user');
  $('#chatInput').value='';
  setTimeout(()=>addMessage(coachReply(q),'ai'),250);
});
$$('[data-prompt]').forEach(b=>b.onclick=()=>{
  $('#chatInput').value=b.dataset.prompt;
  $('#chatForm').requestSubmit();
});

/* ---------- Fotos (nur in dieser Sitzung) ---------- */

$('#photoPicker').addEventListener('change',e=>{
  [...e.target.files].forEach(file=>{
    const url=URL.createObjectURL(file);
    state.photos.push({id:Date.now()+Math.random(),name:file.name,url,category:'Sonstiges'});
  });
  render();
  toast('Fotos für diese Sitzung hinzugefügt');
});
$$('[data-filter]').forEach(b=>b.onclick=()=>{
  photoFilter=b.dataset.filter;
  $$('[data-filter]').forEach(x=>x.classList.toggle('selected',x===b));
  renderPhotos();
});

function renderPhotos(){
  const grid=$('#photoGrid');
  grid.innerHTML='';
  const photos=state.photos.filter(p=>photoFilter==='Alle'||p.category===photoFilter);
  if(!photos.length){
    grid.innerHTML=state.photos.length?'<div class="empty-state">Keine Bilder in dieser Kategorie.</div>':'<div class="empty-state">Noch keine Bilder ausgewählt.</div>';
    return;
  }
  photos.forEach(p=>{
    const tile=document.createElement('div');
    tile.className='photo-tile';
    const img=document.createElement('img');
    img.src=p.url;
    img.alt=p.name;
    const del=document.createElement('button');
    del.textContent='×';
    del.onclick=()=>{state.photos=state.photos.filter(x=>x.id!==p.id);render();};
    tile.append(img,del);
    grid.append(tile);
  });
}

/* ---------- Anzeige ---------- */

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function activityRow(w,withNotes){
  const notes=withNotes&&w.notes?' · '+escapeHtml(w.notes):'';
  const right=w.kind==='Laufen'?escapeHtml(w.distance)+' km':'Kraft';
  return `<div class="activity-row"><div><strong>${escapeHtml(w.kind)}</strong><span class="muted">${escapeHtml(w.date)} · ${escapeHtml(w.duration)} Min.${notes}</span></div><b>${right}</b></div>`;
}

function render(){
  const runs=state.workouts.filter(w=>w.kind==='Laufen');
  const km=runs.reduce((a,w)=>a+w.distance,0);
  $('#weekKm').textContent=km.toFixed(1).replace('.',',')+' km';
  $('#workoutCount').textContent=state.workouts.length;
  $('#strengthCount').textContent=state.workouts.filter(w=>w.kind==='Krafttraining').length;
  $('#photoCount').textContent=state.photos.length;
  $('#historyTotal').textContent=state.workouts.length+' Einheiten';

  const recent=state.workouts.slice(0,3);
  $('#recentList').innerHTML=recent.length?recent.map(w=>activityRow(w,false)).join(''):'Noch keine Trainings gespeichert.';
  $('#historyList').innerHTML=state.workouts.length?state.workouts.map(w=>activityRow(w,true)).join(''):'Deine Einheiten erscheinen hier.';

  $('#dailyAdvice').textContent=state.workouts.length
    ?`Du hast ${state.workouts.length} Einheiten erfasst. Dein Ziel ist „${state.goal}“. Öffne PULSE AI für eine erste Auswertung deiner Trainingshistorie.`
    :'Starte mit einem Ziel: Erfasse deine Trainingseinheiten und PULSE hilft dir, Muster und nächste Schritte zu erkennen.';
  $('#goal').value=state.goal;
  $('#adminMenu').hidden=!isAdmin();
  $('#accountEmail').textContent=state.email;
  $('#accountRole').textContent=roleLabel(state.role);
  renderPhotos();
}

function renderAll(){
  render();
  renderAvatar();
  $('#avatarName').value=state.avatar.name||'';
  renderBody();
}

/* ---------- Einstellungen, Export, Löschen ---------- */

$('#saveGoal').onclick=()=>{state.goal=$('#goal').value;saveProfile();render();toast('Trainingsziel gespeichert');};

$('#exportBtn').onclick=()=>{
  const data={workouts:state.workouts,goal:state.goal,avatar:state.avatar,body:state.body};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='pulse-daten.json';
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
};

$('#resetBtn').onclick=async()=>{
  if(!confirm('Wirklich alle deine gespeicherten PULSE-Daten löschen? Das kann nicht rückgängig gemacht werden.'))return;
  const {error}=await db.from('workouts').delete().eq('user_id',state.userId);
  if(error){toast('Löschen fehlgeschlagen');return;}
  state.workouts=[];
  state.goal=DEFAULT_GOAL;
  state.avatar={...DEFAULT_AVATAR};
  state.body={...DEFAULT_BODY};
  saveProfile();
  renderAll();
  toast('Daten gelöscht');
};

/* ---------- Körperdaten & BMI ---------- */

function bmiInfo(h,w){
  if(!(h>=100&&h<=250&&w>=30&&w<=300))return null;
  const bmi=w/Math.pow(h/100,2);
  let label='Normalgewicht';
  if(bmi<18.5)label='Untergewicht';
  else if(bmi>=30)label='Adipositas';
  else if(bmi>=25)label='Übergewicht';
  return {bmi,label};
}

function renderBmi(h,w){
  const out=$('#bmiResult');
  const info=bmiInfo(h,w);
  if(!info){
    out.innerHTML='Gib Größe (100–250 cm) und Gewicht (30–300 kg) ein, dann berechne ich deinen BMI.';
    return;
  }
  out.innerHTML=`<div style="display:flex;align-items:baseline;gap:12px;padding:6px 0 4px"><strong style="font-size:38px;letter-spacing:-1.5px;color:var(--text)">${info.bmi.toFixed(1).replace('.',',')}</strong><span>BMI · ${info.label} (WHO, Erwachsene)</span></div>`;
}

function renderBody(){
  $('#bodyHeight').value=state.body.height;
  $('#bodyWeight').value=state.body.weight;
  renderBmi(Number(state.body.height),Number(state.body.weight));
}

['#bodyHeight','#bodyWeight'].forEach(sel=>{
  $(sel).addEventListener('input',()=>renderBmi(Number($('#bodyHeight').value),Number($('#bodyWeight').value)));
});

$('#saveBody').addEventListener('click',()=>{
  const h=Number($('#bodyHeight').value);
  const w=Number($('#bodyWeight').value);
  if(!bmiInfo(h,w)){toast('Bitte gültige Werte eingeben');return;}
  state.body={height:h,weight:w};
  saveProfile();
  renderBmi(h,w);
  toast('Körperdaten gespeichert');
});

/* ---------- Avatar ---------- */

function avatarSvg(a){
  const hc='#2b2118', dark='#142333';
  const cap=`<path d="M66 68C62 34 138 34 134 68C130 52 112 46 100 46C88 46 70 52 66 68Z" fill="${hc}"/>`;
  const modern=`<path d="M64 68C56 30 108 18 138 50C142 58 136 64 134 68C128 54 110 50 98 54C86 58 72 58 66 70Z" fill="${hc}"/>`;
  const hairFront={Kurz:cap,Modern:modern,Lang:cap,Glatze:''}[a.hair]??cap;
  const hairBack=a.hair==='Lang'
    ?`<path d="M64 62C56 92 58 120 72 128L82 96Z" fill="${hc}"/><path d="M136 62C144 92 142 120 128 128L118 96Z" fill="${hc}"/>`
    :'';
  const shoe=x=>`<ellipse cx="${x}" cy="271" rx="15" ry="8" fill="#f4f7fb"/><rect x="${x-14}" y="274" width="28" height="3" rx="1.5" fill="#83c8ff"/>`;
  return `
  <svg class="avatar-svg" viewBox="0 0 200 300" role="img" aria-label="Dein Avatar">
    <ellipse cx="100" cy="287" rx="42" ry="6" fill="#000" opacity=".25"/>
    ${hairBack}
    <g class="av-leg-l"><line x1="86" y1="218" x2="84" y2="262" stroke="${a.skin}" stroke-width="16" stroke-linecap="round"/>${shoe(80)}</g>
    <g class="av-leg-r"><line x1="114" y1="218" x2="116" y2="262" stroke="${a.skin}" stroke-width="16" stroke-linecap="round"/>${shoe(120)}</g>
    <rect x="70" y="186" width="60" height="36" rx="12" fill="#27384a"/>
    <rect x="68" y="112" width="64" height="84" rx="18" fill="${a.shirt}"/>
    <text x="100" y="164" text-anchor="middle" font-size="30" font-weight="800" fill="${dark}" font-family="Inter,sans-serif">P</text>
    <g class="av-arm-l"><line x1="72" y1="124" x2="54" y2="172" stroke="${a.skin}" stroke-width="14" stroke-linecap="round"/><line x1="72" y1="124" x2="64" y2="144" stroke="${a.shirt}" stroke-width="18" stroke-linecap="round"/></g>
    <g class="av-arm-r"><line x1="128" y1="124" x2="146" y2="172" stroke="${a.skin}" stroke-width="14" stroke-linecap="round"/><line x1="128" y1="124" x2="136" y2="144" stroke="${a.shirt}" stroke-width="18" stroke-linecap="round"/></g>
    <rect x="92" y="98" width="16" height="18" rx="6" fill="${a.skin}"/>
    <circle cx="66" cy="74" r="7" fill="${a.skin}"/><circle cx="134" cy="74" r="7" fill="${a.skin}"/>
    <circle cx="100" cy="70" r="34" fill="${a.skin}"/>
    ${hairFront}
    <circle cx="88" cy="72" r="5" fill="#fff"/><circle cx="112" cy="72" r="5" fill="#fff"/>
    <circle cx="88" cy="72" r="3" fill="#1b2430"/><circle cx="112" cy="72" r="3" fill="#1b2430"/>
    <path d="M90 86Q100 94 110 86" stroke="#1b2430" stroke-width="3" fill="none" stroke-linecap="round"/>
  </svg>`;
}

function renderAvatar(){
  const a=state.avatar;
  const preview=$('#avatarPreview');
  if(!preview)return;
  preview.innerHTML=`<div class="avatar-stage">${avatarSvg(a)}<div class="avatar-name">${escapeHtml(a.name||'Dein Läufer')} · ${escapeHtml(a.hair)}</div>
