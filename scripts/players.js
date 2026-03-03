import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
import { doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';
import { auth } from "./firebase-config.js";
import { db } from "./firebase-config.js";

onAuthStateChanged(auth, (user) => {
  if (!user) window.location.href = "index.html";
});

// ─── Stato ───────────────────────────────────────────────────────────────────
const players = [];
const login_log = [];
let allFiveMPlayers = [];
let searchTerm = '';
let filterRole = 'all';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function getPlayerKey(player) {
  return (player.name || '').toLowerCase();
}

function formatLastLogin(date) {
  const now = new Date();
  const diffMs = now - new Date(date);
  const mins = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);

  if (mins < 60) return `${mins} minuti fa`;
  if (hours < 24) return `${hours} ore fa`;
  if (days === 1) return 'Ieri';
  if (days < 7) return `${days} giorni fa`;
  return new Date(date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getRoleName(role) {
  return { fazionato: 'Fazionato', pinnato: 'Pinnato', player: 'Player' }[role] ?? role;
}

function getStartOfWeek() {
  const d = new Date();
  const diff = d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1);
  return new Date(new Date(d.setDate(diff)).setHours(0, 0, 0, 0));
}

function removeDuplicates(list) {
  const seen = new Map();
  for (const p of list) {
    const key = getPlayerKey(p);
    if (key && !seen.has(key)) seen.set(key, p);
  }
  return [...seen.values()];
}

// ─── Card ─────────────────────────────────────────────────────────────────────
function createPlayerCard(player) {
  const statusText = player.status === 'active' ? 'Online' : 'offline';
  const bisButtonText = player.isMember ? '- 41Bis' : '+ 41Bis';
  const bisButtonClass = player.isMember ? 'bis-btn-icon active' : 'bis-btn-icon';
  const bisButtonTitle = player.isMember ? 'Rimuovi da 41BIS' : 'Aggiungi a 41BIS';

  const lastEntry = login_log.findLast(l => l.name === player.name);
  const weekSessions = login_log.filter(l => l.name === player.name).length;


  return `
    <div class="player-card">
      <div class="card-header ${player.role} ${statusText}">
        <div class="id-badge">ID: ${player.status === 'active' ? (player.id || '—') : '—'}</div>

        <button class="pin-btn ${player.isPinned ? 'pinned' : ''}"
                onclick="addDBPlayer('${player.name}','pinned')"
                title="${player.isPinned ? 'Rimuovi pin' : 'Pinna player'}">
          <img class="pin-icon" src="/41BIS/images/pin.png" onerror="this.src='../images/pin.png'"/>
        </button>

        <div class="avatar-wrapper">
          <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=random&color=fff&size=128&bold=true" alt="${player.name}" class="avatar" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
          <div class="avatar-placeholder" style="display:none">${(player.name?.[0] ?? '?').toUpperCase()}</div>
          <div class="status-indicator status-${player.status}"></div>
        </div>
      </div>

      <div class="card-body">
        <div class="player-name">${player.name}</div>
        <div class="player-role ${player.role}">${getRoleName(player.role)}</div>

        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-label">Ultimo Login</div>
            <div class="stat-value">${player.status === 'active' ? 'online' : lastEntry ? formatLastLogin(`${lastEntry.date}T${String(lastEntry.hour).padStart(2, '0')}:00`) : '—'}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Ore settimanali</div>
            <div class="stat-value">${weekSessions}</div>
          </div>
        </div>

        <div class="action-buttons">
          <button class="view-profile-btn" onclick="viewProfile(${player.id})">
            Visualizza Profilo
          </button>
          <button class="${bisButtonClass}"
                  onclick="addDBPlayer('${player.name}','members')"
                  title="${bisButtonTitle}">
            ${bisButtonText}
          </button>
        </div>
      </div>
    </div>
  `;
}

// ─── Filtraggio ───────────────────────────────────────────────────────────────
function filterPlayersByCategory(category) {
  return players.filter(p => {
    const matchesCategory =
      category === 'member' ? p.isMember :
        category === 'pinned' ? p.isPinned && !p.isMember :
          !p.isMember && !p.isPinned;

    if (!matchesCategory) return false;

    const name = (p.name || '').toLowerCase();
    const gameId = (p.gameId || '').toString().toLowerCase();
    const matchesSearch = !searchTerm || name.includes(searchTerm) || gameId.includes(searchTerm);

    const matchesRole =
      filterRole === 'all' ? true :
        filterRole === 'member' ? p.isMember :
          filterRole === 'pinned' ? p.isPinned :
            !p.isMember && !p.isPinned;

    return matchesSearch && matchesRole;
  });
}

// ─── Render ───────────────────────────────────────────────────────────────────
function renderSection(gridId, emptyId, countId, sectionId, items, showWhenEmpty) {
  const grid = document.getElementById(gridId);
  const empty = document.getElementById(emptyId);
  const count = document.getElementById(countId);
  const section = document.getElementById(sectionId);

  if (items.length > 0) {
    section.style.display = 'block';
    grid.style.display = 'grid';
    empty.style.display = 'none';
    grid.innerHTML = items.map(createPlayerCard).join('');
    count.textContent = items.length;
  } else if (showWhenEmpty) {
    section.style.display = 'block';
    grid.style.display = 'none';
    empty.style.display = 'block';
    count.textContent = '0';
  } else {
    section.style.display = 'none';
  }
}

function renderPlayers() {
  const members = filterPlayersByCategory('member');
  const pinned = filterPlayersByCategory('pinned');
  const regularPlayers = filterPlayersByCategory('player');
  const total = members.length + pinned.length + regularPlayers.length;

  document.getElementById('resultsCount').textContent =
    `${total} giocator${total !== 1 ? 'i' : 'e'} trovat${total !== 1 ? 'i' : 'o'}`;

  const emptyState = document.getElementById('emptyState');

  if (total === 0) {
    ['membersSection', 'pinnedSection', 'playersSection'].forEach(id => {
      document.getElementById(id).style.display = 'none';
    });
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  const showAll = filterRole === 'all';
  renderSection('membersGrid', 'membersEmpty', 'membersCount', 'membersSection', members, showAll || filterRole === 'member');
  renderSection('pinnedGrid', 'pinnedEmpty', 'pinnedCount', 'pinnedSection', pinned, showAll || filterRole === 'pinned');
  renderSection('playersGrid', 'playersEmpty', 'playersCount', 'playersSection', regularPlayers, showAll || filterRole === 'player');
}

// ─── Event Listeners ──────────────────────────────────────────────────────────
document.getElementById('searchInput').addEventListener('input', (e) => {
  searchTerm = e.target.value.toLowerCase();
  renderPlayers();
});

document.getElementById('roleFilter').addEventListener('change', (e) => {
  filterRole = e.target.value;
  renderPlayers();
});

// ─── Profilo ──────────────────────────────────────────────────────────────────
window.viewProfile = function (playerId) {
  const player = players.find(p => p.id === playerId);
  if (player) alert(`Apertura profilo di ${player.name}\nID: ${player.gameId}`);
};

// ─── Caricamento Players ──────────────────────────────────────────────────────
function buildPlayer(fivemPlayer, memberNames, pinnedNames, onlineNames) {
  const name = fivemPlayer.name ?? 'Sconosciuto';
  const isMember = memberNames.has(name.toLowerCase());
  const isPinned = pinnedNames.has(name.toLowerCase());

  return {
    id: fivemPlayer.id,
    name,
    role: isMember ? 'member' : isPinned ? 'pinned' : 'player',
    lastLogin: '',
    hoursThisWeek: 0,
    status: onlineNames.has(name.toLowerCase()) ? 'active' : 'inactive',
    isPinned,
    isMember,
  };
}

async function getPlayers() {
  try {
    console.log('🚀 Inizio caricamento players...');

    const [dataPinned, dataMembers] = await Promise.all([
      getDoc(doc(db, "players", "pinned")).then(d => d.data()?.pinned || []),
      getDoc(doc(db, "players", "members")).then(d => d.data()?.members || [])
    ]);

    console.log(`📌 ${dataPinned.length} pinnati, 🎖️ ${dataMembers.length} membri`);

    const response = await fetch("https://discord-proxy.nadrabu3.workers.dev?fivem=zyrbxy");
    const responseJSON = await response.json();
    allFiveMPlayers = responseJSON.Data.players;

    console.log(`🎮 ${allFiveMPlayers.length} players online su FiveM`);

    players.length = 0;

    const memberNames = new Set(dataMembers.map(p => (p.name ?? '').toLowerCase()));
    const pinnedNames = new Set(dataPinned.map(p => (p.name ?? '').toLowerCase()));
    const onlineNames = new Set(allFiveMPlayers.map(p => (p.name ?? '').toLowerCase()));

    // Fase 1 – Membri
    console.log('🎖️ Caricamento MEMBRI...');
    removeDuplicates(dataMembers).forEach(p => players.push(buildPlayer(p, memberNames, pinnedNames, onlineNames)));
    renderPlayers();

    // Fase 2 – Pinnati
    console.log('📌 Caricamento PINNATI...');
    removeDuplicates(dataPinned).forEach(p => players.push(buildPlayer(p, memberNames, pinnedNames, onlineNames)));
    renderPlayers();

    // Fase 3 – Player base
    console.log('👥 Caricamento PLAYER BASE...');
    const basePlayers = removeDuplicates(
      allFiveMPlayers.filter(p => {
        const key = (p.name ?? '').toLowerCase();
        return !memberNames.has(key) && !pinnedNames.has(key);
      })
    );

    for (const p of basePlayers) {
      players.push(buildPlayer(p, memberNames, pinnedNames, onlineNames));
    }

    console.log(players);
    renderPlayers();

    console.log(`🎉 COMPLETATO! ${players.length} players caricati`);
    return players;

  } catch (error) {
    console.error('❌ Errore generale:', error);
    const emptyState = document.getElementById('emptyState');
    if (emptyState) {
      emptyState.style.display = 'block';
      emptyState.innerHTML = `
        <div style="text-align:center;color:#ff6b6b;">
          <h3>❌ Errore nel caricamento</h3>
          <p>${error.message}</p>
          <button onclick="location.reload()" style="margin-top:20px;padding:10px 20px;">Riprova</button>
        </div>`;
    }
    return [];
  }
}

getPlayers().then(list => console.log('📋 Lista finale:', list));

// ─── Toggle Pinned / 41Bis ────────────────────────────────────────────────────
async function addDBPlayer(name, docName) {
  try {
    const docRef = doc(db, "players", docName);
    const docData = await getDoc(docRef);
    const data = docData.data()?.[docName] || [];

    const existing = data.find(u => (u.name ?? '').toLowerCase() === name.toLowerCase());

    if (existing) {
      data.splice(data.indexOf(existing), 1);
    } else {
      const fivemPlayer = allFiveMPlayers.find(u => (u.name ?? '').toLowerCase() === name.toLowerCase());
      if (!fivemPlayer) {
        console.warn(`⚠️ Player "${name}" non trovato su FiveM`);
        return;
      }
      data.push(fivemPlayer);
    }

    await setDoc(docRef, { [docName]: data });

    const playerInList = players.find(u => u.name.toLowerCase() === name.toLowerCase());
    if (playerInList) {
      if (docName === "pinned") playerInList.isPinned = !existing;
      else playerInList.isMember = !existing;
    }

    console.log(`${existing ? '🔓 Rimosso' : '🔒 Aggiunto'} "${name}" ${existing ? 'da' : 'a'} ${docName}`);
    renderPlayers();

  } catch (error) {
    console.error('❌ Errore in addDBPlayer:', error);
    alert('Errore durante l\'operazione. Riprova.');
  }
}

window.addDBPlayer = addDBPlayer;

// ─── Ore Settimanali ──────────────────────────────────────────────────────────
async function getTotalWeekHour() {
  const current = getStartOfWeek();
  const end = new Date();
  end.setDate(end.getDate() + 1);

  const temp = [];

  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];

    const hourFetches = Array.from({ length: 23 }, (_, i) => {
      const hour = i + 1;
      const hourStr = String(hour).padStart(2, '0');
      const url = `https://naabou.github.io/41BIS/login_log/${dateStr}/${hourStr}.json`;

      return fetch(url)
        .then(r => r.ok ? r.json() : [])
        .then(messages => messages.forEach(m => temp.push({ name: m.steamName, date: dateStr, hour })))
        .catch(() => { });
    });

    await Promise.all(hourFetches);
    current.setDate(current.getDate() + 1);
  }

  login_log.push(...temp);
  renderPlayers();
}

getTotalWeekHour();