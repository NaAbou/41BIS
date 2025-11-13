import { signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js'
import { doc, updateDoc, arrayUnion, setDoc, collection, getDocs, query, orderBy, limit, where, getDoc } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';
import { auth } from "./firebase-config.js";
import { db } from "./firebase-config.js";

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
  }
});

//https://servers-frontend.fivem.net/api/servers/single/3vk49z
//https://discord.com/api/v9/users/${id}

//https://stackoverflow.com/questions/64933979/discord-get-user-by-id


// Dati giocatori aggiornati con tutti i campi richiesti
const players = [
  {
    id: 1,
    gameId: 'MR_2024',
    name: 'Marco Rossi',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marco',
    role: 'fazionato', // fazionato, pinnato, player
    discordID: '',
    steamHex: '',
    lastLogin: '2024-11-13T14:30:00',
    hoursThisWeek: 24.5,
    status: 'active'
  },
];

let searchTerm = '';
let filterRole = 'all';

// Funzione per formattare la data dell'ultimo login
function formatLastLogin(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return `${diffMins} minuti fa`;
  } else if (diffHours < 24) {
    return `${diffHours} ore fa`;
  } else if (diffDays === 1) {
    return 'Ieri';
  } else if (diffDays < 7) {
    return `${diffDays} giorni fa`;
  } else {
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}

// Funzione per ottenere il nome del ruolo in italiano
function getRoleName(role) {
  const roleNames = {
    'fazionato': 'Fazionato',
    'pinnato': 'Pinnato',
    'player': 'Player'
  };
  return roleNames[role] || role;
}

// Inizializza il filtro dei ruoli
function initializeRoleFilter() {
  const roleFilter = document.getElementById('roleFilter');
  const roles = [...new Set(players.map(p => p.role))];

  roles.forEach(role => {
    const option = document.createElement('option');
    option.value = role;
    option.textContent = getRoleName(role);
    roleFilter.appendChild(option);
  });
}

// Crea una card per il giocatore
function createPlayerCard(player) {
  const lastLoginFormatted = formatLastLogin(player.lastLogin);
  const hoursFormatted = player.hoursThisWeek.toFixed(1);
  const statusText = player.status === 'active' ? 'Online' : 'Offline';

  return `
    <div class="player-card">
      <div class="card-header ${player.role}">
        <div class="id-badge">ID: ${player.gameId}</div>
        <div class="online-badge ${player.status}">${statusText}</div>
        <div class="avatar-wrapper">
          <img src="${player.avatar}" alt="${player.name}" class="avatar">
          <div class="status-indicator status-${player.status}"></div>
        </div>
      </div>
      <div class="card-body">
        <div class="player-name">${player.name}</div>
        <div class="player-role ${player.role}">${getRoleName(player.role)}</div>

        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-label">Ultimo Login</div>
            <div class="stat-value">${lastLoginFormatted}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Ore Settimana</div>
            <div class="stat-value">${hoursFormatted}h</div>
          </div>
        </div>

        <div class="player-info">
          <div class="info-item">
            <svg class="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
            <span class="info-text">${player.email}</span>
          </div>
          <div class="info-item">
            <svg class="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
            <span class="info-text">${player.location}</span>
          </div>
        </div>

        <button class="view-profile-btn" onclick="viewProfile(${player.id})">Visualizza Profilo</button>
      </div>
    </div>
  `;
}

// Filtra i giocatori in base ai criteri di ricerca
function filterPlayers() {
  return players.filter(player => {
    const matchesSearch = searchTerm === '' ||
      player.name.toLowerCase().includes(searchTerm) ||
      player.gameId.toLowerCase().includes(searchTerm) ||
      player.email.toLowerCase().includes(searchTerm) ||
      player.location.toLowerCase().includes(searchTerm);

    const matchesRole = filterRole === 'all' || player.role === filterRole;

    return matchesSearch && matchesRole;
  });
}

// Renderizza le card dei giocatori
function renderPlayers() {
  const grid = document.getElementById('playersGrid');
  const emptyState = document.getElementById('emptyState');
  const resultsCount = document.getElementById('resultsCount');

  const filtered = filterPlayers();

  if (filtered.length === 0) {
    grid.style.display = 'none';
    emptyState.style.display = 'block';
  } else {
    grid.style.display = 'grid';
    emptyState.style.display = 'none';
    grid.innerHTML = filtered.map(createPlayerCard).join('');
  }

  const count = filtered.length;
  resultsCount.textContent = `${count} giocator${count !== 1 ? 'i' : 'e'} trovat${count !== 1 ? 'i' : 'o'}`;
}

// Funzione per visualizzare il profilo (da implementare)
window.viewProfile = function (playerId) {
  const player = players.find(p => p.id === playerId);
  if (player) {
    console.log('Visualizzazione profilo di:', player);
    alert(`Apertura profilo di ${player.name}\nID: ${player.gameId}`);
    // Qui puoi implementare la navigazione alla pagina del profilo
    // window.location.href = `profile.html?id=${playerId}`;
  }
}

// Event listeners
document.getElementById('searchInput').addEventListener('input', (e) => {
  searchTerm = e.target.value.toLowerCase();
  renderPlayers();
});

document.getElementById('roleFilter').addEventListener('change', (e) => {
  filterRole = e.target.value;
  renderPlayers();
});

// Inizializzazione
initializeRoleFilter();
renderPlayers();

// Aggiorna l'ultimo login ogni minuto (opzionale)
setInterval(() => {
  renderPlayers();
}, 60000); // 60000ms = 1 minuto



async function getPlayers() {
  var response = await fetch("https://servers-frontend.fivem.net/api/servers/single/3vk49z")

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const responseJSON = await response.json();

  responseJSON.Data.players.forEach(async (user) => {
    console.log(user)
    const discordID = user.identifiers.find(id => id.startsWith("discord:")).split(":")[1]; 
    const steamID = user.identifiers.find(id => id.startsWith("steam:")).split(":")[1]; 

    
    //const discordUSER = await fetch("https://discord.com/api/v9/users/" + discordID, )

    players.concat({
      gameId: user.id,
      name: '',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marco',
      role: 'player', // fazionato, pinnato, player
      discordID: discordID,
      steamHex: steamID,
      lastLogin: '2024-11-13T14:30:00',
      hoursThisWeek: 24.5,
      status: 'active'
    })
  })

  console.log('✅ Dati server ricevuti:', players)
}

getPlayers()