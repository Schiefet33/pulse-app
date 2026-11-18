const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const KEY='pulse-v01-data';
let state=JSON.parse(localStorage.getItem(KEY)||'{"workouts":[],"goal":"Allgemeine Leistungssteigerung","photos":[] }');
let photoFilter='Alle';
function save(){localStorage.setItem(KEY,JSON.stringify(state));render();}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200);}
function showView(name){
  const nextView = $('#' + name + 'View');
  const nextTab = $(`.tab[data-view="${name}"]`);

  if(!nextView) return;

  $$('.view').forEach(v =>
    v.classList.toggle('active', v === nextView)
  );

  $$('.tab').forEach(b =>
    b.classList.toggle('active', b === nextTab)
  );

  if(nextTab && !window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    nextTab.animate([
      { transform: 'translateY(2px) scale(.94)' },
      { transform: 'translateY(-3px) scale(1.08)' },
      { transform: 'translateY(-2px) scale(1)' }
    ], {
      duration: 420,
      easing: 'cubic-bezier(.16,1,.3,1)'
    });
  }

  window.scrollTo({top: 0, behavior: 'smooth'});
}

$$('.tab').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
$$('[data-go]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.go)));
$('#settingsBtn').onclick=()=>showView('settings');
$$('[data-kind]').forEach(b=>b.onclick=()=>{$$('#workoutForm select option').forEach(o=>o.selected=o.value===b.dataset.kind);$$('[data-kind]').forEach(x=>x.classList.toggle('selected',x===b));$('#runFields').style.display=b.dataset.kind==='Laufen'?'grid':'none';});
$('#date').value=new Date().toISOString().slice(0,10);
$('#kind').onchange=()=>$('#runFields').style.display=$('#kind').value==='Laufen'?'grid':'none';
$('#workoutForm').addEventListener('submit',e=>{e.preventDefault();const w={id:Date.now(),kind:$('#kind').value,date:$('#date').value,duration:Number($('#duration').value),distance:$('#kind').value==='Laufen'?Number($('#distance').value||0):0,pace:$('#pace').value,notes:$('#notes').value};state.workouts.unshift(w);e.target.reset();$('#date').value=new Date().toISOString().slice(0,10);$('#runFields').style.display='grid';save();toast('Training gespeichert');});
function paceToSec(s){if(!s||!s.includes(':'))return null;let [m,sec]=s.split(':').map(Number);return m*60+sec;}
function coachReply(q){
 const runs=state.workouts.filter(w=>w.kind==='Laufen'), lifts=state.workouts.filter(w=>w.kind==='Krafttraining'), km=runs.reduce((a,w)=>a+w.distance,0);
 const low=q.toLowerCase();
 if(low.includes('woche')||low.includes('analyse'))return `Du hast ${state.workouts.length} Einheiten gespeichert, davon ${runs.length} Läufe und ${lifts.length} Krafteinheiten. Erfasste Laufdistanz insgesamt: ${km.toFixed(1).replace('.',',')} km. Für eine aussagekräftige Wochenanalyse brauche ich regelmäßige Einträge mit Datum, Distanz und Dauer.`;
 if(low.includes('heute')||low.includes('train'))return state.workouts.length?`Dein letztes gespeichertes Training war ${state.workouts[0].kind} am ${state.workouts[0].date}. Wenn du dich erholt fühlst, kannst du heute eine moderate Einheit planen. Bei Schmerzen, Krankheit oder ungewöhnlicher Erschöpfung lieber pausieren. Ich kenne deine aktuelle Erholung noch nicht.`:'Noch sind keine Trainingsdaten gespeichert. Erfasse zuerst ein paar Einheiten, damit ich sinnvollere Vorschläge machen kann.';
 if(low.includes('lauf')||low.includes('pace'))return `Für bessere Laufleistungen kombiniere lockere Läufe, eine gezielte Qualitätseinheit und einen längeren Lauf – passend zu deinem aktuellen Umfang. Steigere die Belastung nicht sprunghaft. Dein eingestelltes Ziel ist: ${state.goal}.`;
 if(low.includes('ziel'))return `Dein aktuelles Ziel lautet: ${state.goal}. Wir können daraus einen Plan machen, sobald wir deine aktuelle Referenzzeit, verfügbare Trainingstage und deinen Wochenumfang kennen.`;
 return `Ich kann deine lokal gespeicherten Trainingsdaten zusammenfassen und allgemeine Trainingsideen geben. Deine Frage war: „${q}“. Für präzise, personalisierte KI-Antworten muss später ein Cloud-KI-Dienst sicher angebunden werden.`;
}
function addMessage(text,who){const d=document.createElement('div');d.className='bubble '+who;d.textContent=text;$('#chatBox').append(d);$('#chatBox').scrollTop=$('#chatBox').scrollHeight;}
$('#chatForm').addEventListener('submit',e=>{e.preventDefault();const q=$('#chatInput').value.trim();if(!q)return;addMessage(q,'user');$('#chatInput').value='';setTimeout(()=>addMessage(coachReply(q),'ai'),250);});
$$('[data-prompt]').forEach(b=>b.onclick=()=>{$('#chatInput').value=b.dataset.prompt;$('#chatForm').requestSubmit();});
$('#photoPicker').addEventListener('change',e=>{[...e.target.files].forEach(file=>{const url=URL.createObjectURL(file);state.photos.push({id:Date.now()+Math.random(),name:file.name,url,category:'Sonstiges'});});renderPhotos();toast('Fotos für diese Sitzung hinzugefügt');});
$$('[data-filter]').forEach(b=>b.onclick=()=>{photoFilter=b.dataset.filter;$$('[data-filter]').forEach(x=>x.classList.toggle('selected',x===b));renderPhotos();});
function renderPhotos(){const grid=$('#photoGrid');grid.innerHTML='';const photos=state.photos.filter(p=>photoFilter==='Alle'||p.category===photoFilter);if(!photos.length){grid.innerHTML='<div class="empty-state">Keine Bilder in dieser Kategorie.</div>';return;}photos.forEach(p=>{const tile=document.createElement('div');tile.className='photo-tile';const img=document.createElement('img');img.src=p.url;img.alt=p.name;const del=document.createElement('button');del.textContent='×';del.onclick=()=>{state.photos=state.photos.filter(x=>x.id!==p.id);renderPhotos();};tile.append(img,del);grid.append(tile);});}
function render(){const runs=state.workouts.filter(w=>w.kind==='Laufen');const km=runs.reduce((a,w)=>a+w.distance,0);$('#weekKm').textContent=km.toFixed(1).replace('.',',')+' km';$('#workoutCount').textContent=state.workouts.length;$('#strengthCount').textContent=state.workouts.filter(w=>w.kind==='Krafttraining').length;$('#photoCount').textContent=state.photos.length;$('#historyTotal').textContent=state.workouts.length+' Einheiten';const recent=state.workouts.slice(0,3);$('#recentList').innerHTML=recent.length?recent.map(w=>`<div class="activity-row"><div><strong>${w.kind}</strong><span class="muted">${w.date} · ${w.duration} Min.</span></div><b>${w.kind==='Laufen'?w.distance+' km':'Kraft'}</b></div>`).join(''):'Noch keine Trainings gespeichert.';$('#historyList').innerHTML=state.workouts.length?state.workouts.map(w=>`<div class="activity-row"><div><strong>${w.kind}</strong><span class="muted">${w.date} · ${w.duration} Min. ${w.notes?'· '+escapeHtml(w.notes):''}</span></div><b>${w.kind==='Laufen'?w.distance+' km':'Kraft'}</b></div>`).join(''):'Deine Einheiten erscheinen hier.';$('#dailyAdvice').textContent=state.workouts.length?`Du hast ${state.workouts.length} Einheiten erfasst. Dein Ziel ist „${state.goal}“. Öffne PULSE AI für eine erste Auswertung deiner Trainingshistorie.`:'Starte mit einem Ziel: Erfasse deine Trainingseinheiten und PULSE hilft dir, Muster und nächste Schritte zu erkennen.';$('#goal').value=state.goal;renderPhotos();}
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
$('#saveGoal').onclick=()=>{state.goal=$('#goal').value;save();toast('Trainingsziel gespeichert');};
$('#exportBtn').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='pulse-daten.json';a.click();URL.revokeObjectURL(a.href);};
$('#resetBtn').onclick=()=>{if(confirm('Wirklich alle lokal gespeicherten PULSE-Daten löschen?')){state={workouts:[],goal:'Allgemeine Leistungssteigerung',photos:[]};save();toast('Daten gelöscht');}};
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));

/* PULSE AVATAR SYSTEM */

state.avatar = state.avatar || {
  skin: '#f1c7a5',
  hair: 'Kurz',
  shirt: '#83c8ff',
  name: ''
};

function renderAvatar() {
  const a = state.avatar;
  const preview = $('#avatarPreview');

  if (!preview) return;

  preview.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:20px">
      <div style="font-size:13px;color:#9baaba">${escapeHtml(a.name || 'Dein Läufer')}</div>
      <div style="width:64px;height:64px;border-radius:50%;background:${a.skin};position:relative;border:3px solid rgba(255,255,255,.2)">
        <span style="position:absolute;top:-13px;left:50%;transform:translateX(-50%);font-size:17px;color:#20252c">●</span>
      </div>
      <div style="width:78px;height:82px;border-radius:20px 20px 12px 12px;background:${a.shirt};display:grid;place-items:center;color:#142333;font-weight:800">
        P
      </div>
      <div style="font-size:12px;color:#dce5ef">${escapeHtml(a.hair)} · PULSE Runner</div>
      <div style="font-size:28px">👟 👟</div>
    </div>
  `;

  $('#avatarName').value = a.name || '';

  $$('[data-skin]').forEach(b =>
    b.classList.toggle('selected', b.dataset.skin === a.skin)
  );

  $$('[data-hair]').forEach(b =>
    b.classList.toggle('selected', b.dataset.hair === a.hair)
  );

  $$('[data-shirt]').forEach(b =>
    b.classList.toggle('selected', b.dataset.shirt === a.shirt)
  );
}

$$('[data-skin]').forEach(b => {
  b.addEventListener('click', () => {
    state.avatar.skin = b.dataset.skin;
    renderAvatar();
  });
});

$$('[data-hair]').forEach(b => {
  b.addEventListener('click', () => {
    state.avatar.hair = b.dataset.hair;
    renderAvatar();
  });
});

$$('[data-shirt]').forEach(b => {
  b.addEventListener('click', () => {
    state.avatar.shirt = b.dataset.shirt;
    renderAvatar();
  });
});

$('#saveAvatar').addEventListener('click', () => {
  state.avatar.name = $('#avatarName').value.trim().slice(0,20);
  localStorage.setItem(KEY, JSON.stringify(state));
  renderAvatar();
  toast('Dein PULSE Avatar wurde gespeichert!');
});

renderAvatar();
render();
