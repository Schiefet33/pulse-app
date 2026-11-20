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
  preview.innerHTML=`<div class="avatar-stage">${avatarSvg(a)}<div class="avatar-name">${escapeHtml(a.name||'Dein Läufer')} · ${escapeHtml(a.hair)}</div></div>`;
  $$('[data-skin]').forEach(b=>b.classList.toggle('selected',b.dataset.skin===a.skin));
  $$('[data-hair]').forEach(b=>b.classList.toggle('selected',b.dataset.hair===a.hair));
  $$('[data-shirt]').forEach(b=>b.classList.toggle('selected',b.dataset.shirt===a.shirt));
}

function setAvatar(key,value){
  state.avatar[key]=value;
  saveProfile();
  renderAvatar();
}

$$('[data-skin]').forEach(b=>b.addEventListener('click',()=>setAvatar('skin',b.dataset.skin)));
$$('[data-hair]').forEach(b=>b.addEventListener('click',()=>setAvatar('hair',b.dataset.hair)));
$$('[data-shirt]').forEach(b=>b.addEventListener('click',()=>setAvatar('shirt',b.dataset.shirt)));
$('#saveAvatar').addEventListener('click',()=>{
  setAvatar('name',$('#avatarName').value.trim().slice(0,20));
  toast('Dein PULSE Avatar wurde gespeichert!');
});

/* ---------- Admin ---------- */

async function loadAdmin(){
  const box=$('#adminList');
  box.textContent='Lade …';
  const {data,error}=await db.rpc('admin_list_users');
  if(error||!data){box.textContent='Kein Zugriff.';return;}
  $('#adminCount').textContent=data.length+' Nutzer';
  const founder=state.role==='founder';
  box.innerHTML=data.map(u=>{
    const canChange=founder&&u.role!=='founder';
    const next=u.role==='admin'?'user':'admin';
    const btn=canChange?`<button class="role-btn" data-uid="${escapeHtml(u.id)}" data-role="${next}">${u.role==='admin'?'Admin entziehen':'Zum Admin'}</button>`:'';
    return `<div class="activity-row"><div><strong>${escapeHtml(u.email||'–')}</strong><span class="muted">${roleLabel(u.role)} · seit ${escapeHtml(String(u.created_at).slice(0,10))}</span></div>${btn}</div>`;
  }).join('');
  $$('.role-btn').forEach(b=>b.addEventListener('click',async()=>{
    const label=b.dataset.role==='admin'?'zum Admin machen':'die Admin-Rechte entziehen';
    if(!confirm('Diesem Nutzer wirklich '+label+'?'))return;
    const {error:err}=await db.rpc('admin_set_role',{target:b.dataset.uid,new_role:b.dataset.role});
    if(err){toast('Änderung nicht erlaubt');return;}
    toast('Rolle geändert');
    loadAdmin();
  }));
}

/* ---------- Start ---------- */

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}

if(!db){
  $('#authBoot').textContent=configured
    ?'Die Verbindung zum Server konnte nicht geladen werden. Bitte prüfe deine Internetverbindung und lade die App neu.'
    :'PULSE ist noch nicht mit Supabase verbunden. Trage oben in app-core.js deine Project URL und den Publishable key ein.';
}else{
  db.auth.onAuthStateChange((event,session)=>{setTimeout(()=>handleAuth(event,session),0);});
  setTimeout(()=>{if(!$('#authBoot').hidden&&!currentUid)showAuthCard(recoveryMode?'recovery':'login');},4000);
}
