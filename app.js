const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const KEY='pulse-v01-data';
const DEFAULT_GOAL='Allgemeine Leistungssteigerung';
const DEFAULT_AVATAR={skin:'#f1c7a5',hair:'Kurz',shirt:'#83c8ff',name:''};

function loadState(){
  let saved={};
  try{saved=JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(e){saved={};}
  return {
    workouts:Array.isArray(saved.workouts)?saved.workouts:[],
    goal:saved.goal||DEFAULT_GOAL,
    photos:[],
    avatar:{...DEFAULT_AVATAR,...(saved.avatar||{})}
  };
}

let state=loadState();
let photoFilter='Alle';

function persist(){
  try{
    localStorage.setItem(KEY,JSON.stringify({workouts:state.workouts,goal:state.goal,avatar:state.avatar}));
  }catch(e){}
}
function save(){persist();render();}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200);}

function showView(name){
  const TAB_OF={avatar:'profile',photos:'profile',evolve:'profile',settings:'profile'};
  const nextView=$('#'+name+'View');
  const nextTab=$(`.tab[data-view="${TAB_OF[name]||name}"]`);
  if(!nextView)return;

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

$$('[data-kind]').forEach(b=>b.onclick=()=>{
  $$('#workoutForm select option').forEach(o=>o.selected=o.value===b.dataset.kind);
  $$('[data-kind]').forEach(x=>x.classList.toggle('selected',x===b));
  $('#runFields').style.display=b.dataset.kind==='Laufen'?'grid':'none';
});
$('#date').value=new Date().toISOString().slice(0,10);
$('#kind').onchange=()=>$('#runFields').style.display=$('#kind').value==='Laufen'?'grid':'none';

$('#workoutForm').addEventListener('submit',e=>{
  e.preventDefault();
  const w={
    id:Date.now(),
    kind:$('#kind').value,
    date:$('#date').value,
    duration:Number($('#duration').value),
    distance:$('#kind').value==='Laufen'?Number($('#distance').value||0):0,
    pace:$('#pace').value,
    notes:$('#notes').value
  };
  state.workouts.unshift(w);
  e.target.reset();
  $('#date').value=new Date().toISOString().slice(0,10);
  $('#runFields').style.display='grid';
  save();
  toast('Training gespeichert');
});

function coachReply(q){
  const runs=state.workouts.filter(w=>w.kind==='Laufen');
  const lifts=state.workouts.filter(w=>w.kind==='Krafttraining');
  const km=runs.reduce((a,w)=>a+w.distance,0);
  const low=q.toLowerCase();
  if(low.includes('woche')||low.includes('analyse'))return `Du hast ${state.workouts.length} Einheiten gespeichert, davon ${runs.length} Läufe und ${lifts.length} Krafteinheiten. Erfasste Laufdistanz insgesamt: ${km.toFixed(1).replace('.',',')} km. Für eine aussagekräftige Wochenanalyse brauche ich regelmäßige Einträge mit Datum, Distanz und Dauer.`;
  if(low.includes('heute')||low.includes('train'))return state.workouts.length?`Dein letztes gespeichertes Training war ${state.workouts[0].kind} am ${state.workouts[0].date}. Wenn du dich erholt fühlst, kannst du heute eine moderate Einheit planen. Bei Schmerzen, Krankheit oder ungewöhnlicher Erschöpfung lieber pausieren. Ich kenne deine aktuelle Erholung noch nicht.`:'Noch sind keine Trainingsdaten gespeichert. Erfasse zuerst ein paar Einheiten, damit ich sinnvollere Vorschläge machen kann.';
  if(low.includes('lauf')||low.includes('pace'))return `Für bessere Laufleistungen kombiniere lockere Läufe, eine gezielte Qualitätseinheit und einen längeren Lauf – passend zu deinem aktuellen Umfang. Steigere die Belastung nicht sprunghaft. Dein eingestelltes Ziel ist: ${state.goal}.`;
  if(low.includes('ziel'))return `Dein aktuelles Ziel lautet: ${state.goal}. Wir können daraus einen Plan machen, sobald wir deine aktuelle Referenzzeit, verfügbare Trainingstage und deinen Wochenumfang kennen.`;
  return `Ich kann deine lokal gespeicherten Trainingsdaten zusammenfassen und allgemeine Trainingsideen geben. Deine Frage war: „${q}“. Für präzise, personalisierte KI-Antworten muss später ein Cloud-KI-Dienst sicher angebunden werden.`;
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
  renderPhotos();
}

$('#saveGoal').onclick=()=>{state.goal=$('#goal').value;save();toast('Trainingsziel gespeichert');};

$('#exportBtn').onclick=()=>{
  const data={workouts:state.workouts,goal:state.goal,avatar:state.avatar};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='pulse-daten.json';
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
};

$('#resetBtn').onclick=()=>{
  if(confirm('Wirklich alle lokal gespeicherten PULSE-Daten löschen?')){
    state={workouts:[],goal:DEFAULT_GOAL,photos:[],avatar:{...DEFAULT_AVATAR}};
    $('#avatarName').value='';
    save();
    renderAvatar();
    toast('Daten gelöscht');
  }
};

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}

/* PULSE AVATAR SYSTEM */

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
  persist();
  renderAvatar();
}

$$('[data-skin]').forEach(b=>b.addEventListener('click',()=>setAvatar('skin',b.dataset.skin)));
$$('[data-hair]').forEach(b=>b.addEventListener('click',()=>setAvatar('hair',b.dataset.hair)));
$$('[data-shirt]').forEach(b=>b.addEventListener('click',()=>setAvatar('shirt',b.dataset.shirt)));
$('#saveAvatar').addEventListener('click',()=>{
  setAvatar('name',$('#avatarName').value.trim().slice(0,20));
  toast('Dein PULSE Avatar wurde gespeichert!');
});

$('#avatarName').value=state.avatar.name||'';
renderAvatar();
render();
