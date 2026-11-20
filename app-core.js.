/* ===== SUPABASE-DATEN (nur der publishable Schlüssel, niemals der secret Schlüssel!) ===== */
const SUPABASE_URL='https://mmedmmslmjszrnrkedii.supabase.co';
const SUPABASE_ANON_KEY='sb_publishable_O5CD6YHMSj12Nk0PW7kEjA_AWA4B1vY';

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
