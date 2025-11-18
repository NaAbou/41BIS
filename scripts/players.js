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


const players = [];

let jsonPlayers;
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
        
        <!-- ✅ PUNTINA ROSSA CLASSICA -->
        <button class="pin-btn ${player.isPinned ? 'pinned' : ''}" 
                onclick="addDBPlayer('${player.discordID}','pinned')" 
                title="${player.isPinned ? 'Rimuovi pin' : 'Pinna player'}">
          <img class="pin-icon" src="../images/pin.png" />
        </button>
        
        <div class="avatar-wrapper">
          <img src="https://cdn.discordapp.com/avatars/${player.discordID}/${player.avatar}.png" 
               alt="${player.name}" 
               class="avatar"
               onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'">
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
            <svg class="info-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            <span class="info-text">${player.discordID}</span>
          </div>
          <div class="info-item">
            <svg class="info-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z"/>
            </svg>
            <span class="info-text">${player.steamHex}</span>
          </div>
        </div>

        <!-- ✅ BOTTONI: Profilo a sinistra, 41BIS discreto a destra -->
        <div class="action-buttons">
          <button class="view-profile-btn" onclick="viewProfile(${player.id})">
            Visualizza Profilo
          </button>
          <button class="bis-btn-icon" onclick="addDBPlayer('${player.discordID}','members')" title="Aggiungi a 41BIS">
            + 41Bis
          </button>
        </div>
      </div>
    </div>
  `;
}

function filterPlayers() {
  console.log('=== DEBUG FILTRO ===');
  console.log('searchTerm:', searchTerm);
  console.log('filterRole:', filterRole);
  console.log('Numero players:', players.length);
  console.log('Primo player:', players[0]);

  const result = players.filter(player => {
    // Converti tutti i valori in stringhe minuscole per il confronto
    const playerName = (player.name || '').toString().toLowerCase();
    const playerGameId = (player.gameId || '').toString().toLowerCase();

    const matchesSearch = searchTerm === '' ||
      playerName.includes(searchTerm) ||
      playerGameId.includes(searchTerm);

    const matchesRole = filterRole === 'all' || player.role === filterRole;

    console.log(`Player: ${player.name} | Name match: ${playerName.includes(searchTerm)} | Search: "${searchTerm}" | Name: "${playerName}"`);

    return matchesSearch && matchesRole;
  });

  console.log('Risultati filtrati:', result.length);
  console.log('===================');

  return result;
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


async function getPlayers(filteredPlayers) {
  const WORKER_URL = 'https://discord-proxy.nadrabu3.workers.dev';


  let docRef = doc(db, "players", "pinned")
  const dataPinned = (await getDoc(docRef)).data().pinned;

  docRef = doc(db, "players", "members")
  const dataMember = (await getDoc(docRef)).data().members 


  //const dbPlayer = data.find((user) => user.identifiers.find(id => id.startsWith("discord:")).split(":")[1] === discordID);

  try {
    const response = await fetch("https://servers-frontend.fivem.net/api/servers/single/3vk49z");
    const responseJSON = await response.json();

    jsonPlayers = responseJSON.Data.players
    const totalPlayers = jsonPlayers.length;
    console.log(`📥 Inizio caricamento di ${totalPlayers} players...`);
    let processedCount = 0;

    const allPlayers = [...dataMember, ...dataPinned, ...jsonPlayers]
    
    for (const user of allPlayers) {
      const startTime = Date.now();
      processedCount++;

      try {
        const discordIdentifier = user.identifiers.find(id => id.startsWith("discord:"));
        const steamIdentifier = user.identifiers.find(id => id.startsWith("steam:"));

        if (!discordIdentifier) {
          console.warn(`⚠️ [${processedCount}/${totalPlayers}] Player "${user.name}" senza Discord - SKIP`);
          continue;
        }

        const discordID = discordIdentifier.split(":")[1];
        const steamID = steamIdentifier ? steamIdentifier.split(":")[1] : null;

        console.log(`🔄 [${processedCount}/${totalPlayers}] Carico "${user.name}"... (ID: ${discordID})`);

        const discordResponse = await fetch(`${WORKER_URL}?discordID=${discordID}`);

        if (!discordResponse.ok) {
          const status = discordResponse.status;
          console.error(`❌ [${processedCount}/${totalPlayers}] Errore ${status} per "${user.name}"`);

          // Se è rate limit, aspetta 2 secondi
          if (status === 429) {
            console.warn('⏸️ RATE LIMIT!');
            await sleep(30000);
          }
          continue;
        }

        const discordUser = await discordResponse.json();

        // Controlla se viene dalla cache
        const cacheStatus = discordResponse.headers.get('X-Cache') || 'UNKNOWN';

        players.push({
          gameId: user.id,
          name: discordUser.username,
          avatar: discordUser.avatar,
          role: 'player',
          discordID: discordID,
          steamHex: steamID,
          lastLogin: '',
          hoursThisWeek: 0,
          status: jsonPlayers.some((user) => user.identifiers.some(id => id === `discord:${discordID}`)) ? 'active' : 'inactive',
          isPinned: dataPinned.some((user) => user.identifiers.some(id => id === `discord:${discordID}`))
        });

        const elapsed = Date.now() - startTime;
        console.log(`✅ [${processedCount}/${totalPlayers}] "${discordUser.username}" caricato in ${elapsed}ms [Cache: ${cacheStatus}]`);
      } catch (error) {
        console.error(`❌ [${processedCount}/${totalPlayers}] Errore su "${user.name}":`, error);
      }
    }

    console.log(`🎉 COMPLETATO! ${players.length}/${totalPlayers} players caricati con successo`);

    renderPlayers()
    return players;

  } catch (error) {
    console.error('❌ Errore generale:', error);
    return [];
  }
}

getPlayers().then(players => {
  console.log('📋 Lista finale:', players);
  // Aggiorna la tua UI qui
});


async function checkIfActive(discordID) {
  
}

async function addDBPlayer(discordID, docName) {
  const docRef = doc(db, "players", docName)

  const data = (await getDoc(docRef)).data()[docName]

  console.log(data)
  const dbPlayer = data.find((user) => user.identifiers.find(id => id.startsWith("discord:")).split(":")[1] === discordID); 
  console.log(players)
  if(dbPlayer != null && dbPlayer != undefined){
    data.splice(data.indexOf(dbPlayer))
    setDoc(docRef, { [docName] : [...data] })
    docName == "pinned"? players.find((user) => user.discordID === discordID).isPinned = false : players.find((user) => user.discordID === discordID).isMember = false
  }else{
    const player = jsonPlayers.find((user) => user.identifiers.find(id => id.startsWith("discord:")).split(":")[1] === discordID); 
    setDoc(docRef, { [docName]: [...data, player] })
    docName == "pinned"? players.find((user) => user.discordID === discordID).isPinned = true : players.find((user) => user.discordID === discordID).isMember = true
  }
  renderPlayers()
}


const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

window.addDBPlayer = addDBPlayer;