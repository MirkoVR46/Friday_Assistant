const $ = s => document.querySelector(s);
const views = ['assistant','control','memory','settings'];
function showView(name){views.forEach(v=>$('#'+v).classList.toggle('visible',v===name));document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.view===name));$('#pageTitle').textContent=({assistant:'Assistant Mode',control:'Control Center',memory:'Memoria',settings:'Impostazioni'})[name];}
document.querySelectorAll('.nav').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
document.querySelectorAll('[data-goto]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.goto)));
$('#startChat').onclick=()=>{$('#chatPanel').scrollIntoView({behavior:'smooth'});$('#messageInput').focus()};
function updateClock(){const d=new Date();$('#clock').textContent=d.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});}
updateClock();setInterval(updateClock,15000);
function speak(text){if(!('speechSynthesis'in window)){alert('La sintesi vocale non è supportata da questo browser.');return;}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='it-IT';u.rate=1;const voices=speechSynthesis.getVoices();const v=voices.find(x=>x.lang.toLowerCase().startsWith('it'));if(v)u.voice=v;speechSynthesis.speak(u);}
function addMessage(who,text){const el=document.createElement('div');el.className='message '+who;const b=document.createElement('b');b.textContent=who==='user'?'TU':'FRIDAY';const p=document.createElement('p');p.textContent=text;el.append(b,p);$('#messages').append(el);$('#messages').scrollTop=$('#messages').scrollHeight;}
$('#chatForm').addEventListener('submit',e=>{e.preventDefault();const val=$('#messageInput').value.trim();if(!val)return;addMessage('user',val);$('#messageInput').value='';const reply='Ho ricevuto il tuo messaggio. In questa versione dimostrativa non sono ancora collegata a un motore di intelligenza artificiale. Puoi aprire ChatGPT per continuare la conversazione.';setTimeout(()=>addMessage('friday',reply),350);});
function openGPT(){window.open('https://chatgpt.com/','_blank','noopener');}
$('#openChatGPT').onclick=openGPT;$('#openChatGPT2').onclick=openGPT;
$('#testVoice').onclick=()=>speak('Ciao, sono FRIDAY. Sistema vocale pronto.');
const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
$('#micBtn').onclick=()=>{if(!SpeechRecognition){alert('Il riconoscimento vocale non è disponibile in questo browser. Prova Chrome o Edge.');return;}const r=new SpeechRecognition();r.lang='it-IT';r.interimResults=false;r.onresult=e=>{$('#messageInput').value=e.results[0][0].transcript;};r.onerror=()=>alert('Microfono non disponibile o permesso negato.');r.start();};
const KEY='friday_memory_v1';
function getNotes(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}}
function saveNotes(notes){localStorage.setItem(KEY,JSON.stringify(notes));renderNotes();}
function renderNotes(){const box=$('#memoryList');box.innerHTML='';getNotes().forEach((n,i)=>{const row=document.createElement('div');row.className='memory-item';const span=document.createElement('span');span.textContent=n;const del=document.createElement('button');del.textContent='Elimina';del.onclick=()=>{const a=getNotes();a.splice(i,1);saveNotes(a)};row.append(span,del);box.append(row);});if(!box.children.length)box.textContent='Nessuna nota salvata.';}
$('#memoryForm').addEventListener('submit',e=>{e.preventDefault();const val=$('#memoryInput').value.trim();if(!val)return;const a=getNotes();a.unshift(val);saveNotes(a);$('#memoryInput').value='';});
$('#exportMemory').onclick=()=>{const blob=new Blob([JSON.stringify(getNotes(),null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='friday-memoria.json';a.click();URL.revokeObjectURL(a.href);};
$('#importMemory').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const data=JSON.parse(await f.text());if(!Array.isArray(data)||!data.every(x=>typeof x==='string'))throw Error();saveNotes(data.concat(getNotes()));alert('Memoria importata.');}catch{alert('File non valido.');}e.target.value='';};
$('#clearData').onclick=()=>{if(confirm('Vuoi cancellare tutte le note locali di FRIDAY su questo browser?')){localStorage.removeItem(KEY);renderNotes();}};
renderNotes();
if('serviceWorker'in navigator && location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});
