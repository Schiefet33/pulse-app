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
