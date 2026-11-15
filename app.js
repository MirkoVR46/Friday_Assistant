const $ = s => document.querySelector(s);

const views = ['assistant', 'control', 'memory', 'settings'];

const API_URL = 'https://friday-ai.75df7rfy97.workers.dev';

let conversation = [];
let memories = [];

const TOKEN_KEY = 'friday_access_token';

const categoryNames = {
    preferenze: '⭐ PREFERENZE',
    interessi: '❤️ INTERESSI',
    abitudini: '🔄 ABITUDINI',
    obiettivi: '🎯 OBIETTIVI',
    veicoli: '🏍️ VEICOLI',
    personale: '📌 PERSONALE',
    generale: '🗂️ GENERALE',
    importata: '📥 IMPORTATA'
};

function getCategoryName(category) {
    const key = String(category || 'generale').toLowerCase();
    return categoryNames[key] || '🗂️ ' + key.toUpperCase();
}

function getToken() {
    let token = sessionStorage.getItem(TOKEN_KEY);

    if (!token) {
        token = prompt('Inserisci la password di accesso a FRIDAY:');

        if (!token) {
            throw new Error('Accesso annullato.');
        }

        token = token.trim();
        sessionStorage.setItem(TOKEN_KEY, token);
    }

    return token;
}

async function api(path, options = {}) {
    const token = getToken();

    const response = await fetch(API_URL + path, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token,
            ...(options.headers || {})
        }
    });

    const data = await response.json();

    if (response.status === 401) {
        sessionStorage.removeItem(TOKEN_KEY);
    }

    if (!response.ok) {
        throw new Error(data.error || 'Errore di comunicazione.');
    }

    return data;
}

// NAVIGAZIONE

function showView(name) {
    views.forEach(v =>
        $('#' + v).classList.toggle('visible', v === name)
    );

    document.querySelectorAll('.nav').forEach(b =>
        b.classList.toggle('active', b.dataset.view === name)
    );

    $('#pageTitle').textContent = ({
        assistant: 'Assistant Mode',
        control: 'Control Center',
        memory: 'Memoria',
        settings: 'Impostazioni'
    })[name];

    if (name === 'memory') {
        loadMemories();
    }
}

document.querySelectorAll('.nav').forEach(b =>
    b.addEventListener('click', () => showView(b.dataset.view))
);

document.querySelectorAll('[data-goto]').forEach(b =>
    b.addEventListener('click', () => showView(b.dataset.goto))
);

$('#startChat').onclick = () => {
    $('#chatPanel').scrollIntoView({ behavior: 'smooth' });
    $('#messageInput').focus();
};

// OROLOGIO

function updateClock() {
    const d = new Date();

    $('#clock').textContent = d.toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

updateClock();
setInterval(updateClock, 15000);

// VOCE

function speak(text) {
    if (!('speechSynthesis' in window)) {
        alert('La sintesi vocale non è supportata da questo browser.');
        return;
    }

    speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'it-IT';
    u.rate = 1;

    const voices = speechSynthesis.getVoices();
    const v = voices.find(x => x.lang.toLowerCase().startsWith('it'));

    if (v) u.voice = v;

    speechSynthesis.speak(u);
}

// CHAT

function addMessage(who, text) {
    const el = document.createElement('div');
    el.className = 'message ' + who;

    const b = document.createElement('b');
    b.textContent = who === 'user' ? 'TU' : 'FRIDAY';

    const p = document.createElement('p');
    p.textContent = text;

    el.append(b, p);

    $('#messages').append(el);
    $('#messages').scrollTop = $('#messages').scrollHeight;
}

async function loadConversation() {
    try {
        const data = await api('/chat');

        $('#messages').innerHTML = '';
        conversation = [];

        (data.messages || []).forEach(item => {
            const who = item.role === 'assistant' ? 'friday' : 'user';

            addMessage(who, item.content);

            conversation.push({
                role: item.role,
                content: item.content
            });
        });

    } catch (error) {
        console.error('Caricamento conversazione:', error);
    }
}

async function sendMessage(message) {
    const input = $('#messageInput');
    const submitButton = $('#chatForm').querySelector('[type="submit"]');

    submitButton.disabled = true;
    input.disabled = true;

    const loading = document.createElement('div');
    loading.className = 'message friday';
    loading.innerHTML = '<b>FRIDAY</b><p>Sto elaborando la tua richiesta...</p>';

    $('#messages').append(loading);

    try {
        const data = await api('/chat', {
            method: 'POST',
            body: JSON.stringify({ message })
        });

        if (!data.answer) {
            throw new Error('Il server non ha restituito una risposta valida.');
        }

        loading.remove();

        addMessage('friday', data.answer);

        conversation.push(
            { role: 'user', content: message },
            { role: 'assistant', content: data.answer }
        );

        // AGGIORNA LA MEMORIA DOPO OGNI RISPOSTA
        await loadMemories();

    } catch (error) {
        loading.remove();

        addMessage(
            'friday',
            'Non riesco a completare la richiesta. ' +
            error.message +
            ' Riprova tra qualche istante.'
        );

        console.error('Errore FRIDAY:', error);

    } finally {
        submitButton.disabled = false;
        input.disabled = false;
        input.focus();
    }
}

$('#chatForm').addEventListener('submit', async e => {
    e.preventDefault();

    const val = $('#messageInput').value.trim();

    if (!val) return;

    addMessage('user', val);

    $('#messageInput').value = '';

    await sendMessage(val);
});

// CHATGPT

function openGPT() {
    window.open('https://chatgpt.com/', '_blank', 'noopener');
}

$('#openChatGPT').onclick = openGPT;
$('#openChatGPT2').onclick = openGPT;

// MICROFONO

$('#testVoice').onclick = () =>
    speak('Ciao, sono FRIDAY. Sistema vocale pronto.');

const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

$('#micBtn').onclick = () => {
    if (!SpeechRecognition) {
        alert('Il riconoscimento vocale non è disponibile in questo browser. Prova Chrome o Edge.');
        return;
    }

    const r = new SpeechRecognition();

    r.lang = 'it-IT';
    r.interimResults = false;

    r.onresult = e => {
        $('#messageInput').value = e.results[0][0].transcript;
    };

    r.onerror = () =>
        alert('Microfono non disponibile o permesso negato.');

    r.start();
};

// MEMORIA CONDIVISA

async function loadMemories() {
    try {
        const data = await api('/memory');

        memories = data.memories || [];

        renderNotes();

    } catch (error) {
        console.error('Caricamento memoria:', error);

        $('#memoryList').textContent =
            'Impossibile caricare la memoria: ' + error.message;
    }
}

function renderNotes() {
    const box = $('#memoryList');

    box.innerHTML = '';

    memories.forEach(n => {
        const row = document.createElement('div');
        row.className = 'memory-item';

        const contentBox = document.createElement('div');
        contentBox.className = 'memory-content';

        const category = document.createElement('strong');
        category.className = 'memory-category';
        category.textContent = getCategoryName(n.category);

        const span = document.createElement('span');
        span.className = 'memory-text';
        span.textContent = n.content;

        const del = document.createElement('button');
        del.textContent = 'Elimina';

        del.onclick = async () => {
            if (!confirm('Vuoi eliminare questo ricordo?')) return;

            try {
                await api('/memory', {
                    method: 'DELETE',
                    body: JSON.stringify({ id: n.id })
                });

                await loadMemories();

            } catch (error) {
                alert('Errore: ' + error.message);
            }
        };

        contentBox.append(category, span);
        row.append(contentBox, del);
        box.append(row);
    });

    if (!box.children.length) {
        box.textContent = 'Nessun ricordo salvato.';
    }
}

// AGGIUNTA MANUALE

$('#memoryForm').addEventListener('submit', async e => {
    e.preventDefault();

    const val = $('#memoryInput').value.trim();

    if (!val) return;

    try {
        await api('/memory', {
            method: 'POST',
            body: JSON.stringify({
                category: 'generale',
                content: val
            })
        });

        $('#memoryInput').value = '';

        await loadMemories();

    } catch (error) {
        alert('Impossibile salvare il ricordo: ' + error.message);
    }
});

// ESPORTAZIONE

$('#exportMemory').onclick = () => {
    const blob = new Blob(
        [JSON.stringify(memories, null, 2)],
        { type: 'application/json' }
    );

    const a = document.createElement('a');

    a.href = URL.createObjectURL(blob);
    a.download = 'friday-memoria.json';
    a.click();

    URL.revokeObjectURL(a.href);
};

// IMPORTAZIONE

$('#importMemory').onchange = async e => {
    const f = e.target.files[0];

    if (!f) return;

    try {
        const data = JSON.parse(await f.text());

        if (!Array.isArray(data)) {
            throw Error('Formato non valido');
        }

        for (const item of data) {
            const content = typeof item === 'string'
                ? item
                : item.content;

            if (typeof content !== 'string' || !content.trim()) {
                continue;
            }

            const category = typeof item === 'object' && item.category
                ? item.category
                : 'importata';

            await api('/memory', {
                method: 'POST',
                body: JSON.stringify({
                    category,
                    content: content.trim()
                })
            });
        }

        await loadMemories();

        alert('Memoria importata correttamente.');

    } catch (error) {
        alert('Errore durante l’importazione: ' + error.message);
    }

    e.target.value = '';
};

// GESTIONE DATI

$('#clearData').onclick = async () => {
    alert(
        'La memoria condivisa è archiviata su Cloudflare D1. ' +
        'Per evitare cancellazioni accidentali, utilizza il pulsante Elimina sui singoli ricordi.'
    );
};

// AVVIO

loadConversation();
loadMemories();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
}
