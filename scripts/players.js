import { signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js'
import { doc, updateDoc, arrayUnion, setDoc, collection, getDocs, query, orderBy, limit, where, getDoc } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';
import { auth } from "./firebase-config.js";
import { db } from "./firebase-config.js";

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
  }
});

const players = [];
let allFiveMPlayers = [];
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

// Crea una card per il giocatore
function createPlayerCard(player) {
  const lastLoginFormatted = formatLastLogin(player.lastLogin);
  const hoursFormatted = player.hoursThisWeek.toFixed(1);
  const statusText = player.status === 'active' ? 'Online' : 'Offline';

  return `
    <div class="player-card">
      <div class="card-header ${player.role}">
        <div class="id-badge">ID: ${player.gameId}</div>
        
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

// ✅ Filtra players per categoria e search/role filter
function filterPlayersByCategory(category) {
  return players.filter(player => {
    // Filtra per categoria
    let matchesCategory = false;
    if (category === 'member') {
      matchesCategory = player.isMember;
    } else if (category === 'pinned') {
      matchesCategory = player.isPinned && !player.isMember;
    } else if (category === 'player') {
      matchesCategory = !player.isMember && !player.isPinned;
    }

    if (!matchesCategory) return false;

    // Filtra per search term
    const playerName = (player.name || '').toString().toLowerCase();
    const playerGameId = (player.gameId || '').toString().toLowerCase();
    const matchesSearch = searchTerm === '' ||
      playerName.includes(searchTerm) ||
      playerGameId.includes(searchTerm);

    // Filtra per role filter
    let matchesRole = true;
    if (filterRole === 'member') {
      matchesRole = player.isMember;
    } else if (filterRole === 'pinned') {
      matchesRole = player.isPinned;
    } else if (filterRole === 'player') {
      matchesRole = !player.isMember && !player.isPinned;
    }

    return matchesSearch && matchesRole;
  });
}

// ✅ Renderizza le card dei giocatori nelle 3 sezioni
function renderPlayers() {
  // Sezione Membri
  const membersGrid = document.getElementById('membersGrid');
  const membersEmpty = document.getElementById('membersEmpty');
  const membersCount = document.getElementById('membersCount');
  const membersSection = document.getElementById('membersSection');

  // Sezione Pinnati
  const pinnedGrid = document.getElementById('pinnedGrid');
  const pinnedEmpty = document.getElementById('pinnedEmpty');
  const pinnedCount = document.getElementById('pinnedCount');
  const pinnedSection = document.getElementById('pinnedSection');

  // Sezione Players
  const playersGrid = document.getElementById('playersGrid');
  const playersEmpty = document.getElementById('playersEmpty');
  const playersCount = document.getElementById('playersCount');
  const playersSection = document.getElementById('playersSection');

  // Empty state globale
  const emptyState = document.getElementById('emptyState');
  const resultsCount = document.getElementById('resultsCount');

  // Filtra players per categoria
  const members = filterPlayersByCategory('member');
  const pinned = filterPlayersByCategory('pinned');
  const regularPlayers = filterPlayersByCategory('player');

  const totalFiltered = members.length + pinned.length + regularPlayers.length;

  // Aggiorna contatore globale
  resultsCount.textContent = `${totalFiltered} giocator${totalFiltered !== 1 ? 'i' : 'e'} trovat${totalFiltered !== 1 ? 'i' : 'o'}`;

  // Se nessun player trovato, mostra empty state globale
  if (totalFiltered === 0) {
    membersSection.style.display = 'none';
    pinnedSection.style.display = 'none';
    playersSection.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  } else {
    emptyState.style.display = 'none';
  }

  // ✅ Renderizza Membri
  if (members.length > 0) {
    membersSection.style.display = 'block';
    membersGrid.style.display = 'grid';
    membersEmpty.style.display = 'none';
    membersGrid.innerHTML = members.map(createPlayerCard).join('');
    membersCount.textContent = members.length;
  } else {
    if (filterRole === 'all' || filterRole === 'member') {
      membersSection.style.display = 'block';
      membersGrid.style.display = 'none';
      membersEmpty.style.display = 'block';
      membersCount.textContent = '0';
    } else {
      membersSection.style.display = 'none';
    }
  }

  // ✅ Renderizza Pinnati
  if (pinned.length > 0) {
    pinnedSection.style.display = 'block';
    pinnedGrid.style.display = 'grid';
    pinnedEmpty.style.display = 'none';
    pinnedGrid.innerHTML = pinned.map(createPlayerCard).join('');
    pinnedCount.textContent = pinned.length;
  } else {
    if (filterRole === 'all' || filterRole === 'pinned') {
      pinnedSection.style.display = 'block';
      pinnedGrid.style.display = 'none';
      pinnedEmpty.style.display = 'block';
      pinnedCount.textContent = '0';
    } else {
      pinnedSection.style.display = 'none';
    }
  }

  // ✅ Renderizza Players
  if (regularPlayers.length > 0) {
    playersSection.style.display = 'block';
    playersGrid.style.display = 'grid';
    playersEmpty.style.display = 'none';
    playersGrid.innerHTML = regularPlayers.map(createPlayerCard).join('');
    playersCount.textContent = regularPlayers.length;
  } else {
    if (filterRole === 'all' || filterRole === 'player') {
      playersSection.style.display = 'block';
      playersGrid.style.display = 'none';
      playersEmpty.style.display = 'block';
      playersCount.textContent = '0';
    } else {
      playersSection.style.display = 'none';
    }
  }
}

// Funzione per visualizzare il profilo
window.viewProfile = function (playerId) {
  const player = players.find(p => p.id === playerId);
  if (player) {
    console.log('Visualizzazione profilo di:', player);
    alert(`Apertura profilo di ${player.name}\nID: ${player.gameId}`);
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

// ✅ Rimuove duplicati basandosi su discordID
function removeDuplicates(playersList) {
  const uniqueMap = new Map();

  for (const player of playersList) {
    const discordIdentifier = player.identifiers?.find(id => id.startsWith("discord:"));
    if (!discordIdentifier) continue;

    const discordID = discordIdentifier.split(":")[1];

    if (!uniqueMap.has(discordID)) {
      uniqueMap.set(discordID, player);
    }
  }

  return Array.from(uniqueMap.values());
}

// ✅ Fetch con retry automatico
async function fetchWithRetry(url, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url);

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : baseDelay * Math.pow(2, attempt);

        console.warn(`⏸️ Rate limit! Riprovo tra ${delay / 1000}s... (Tentativo ${attempt + 1}/${maxRetries})`);
        await sleep(delay);
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;

    } catch (error) {
      const isLastAttempt = attempt === maxRetries - 1;

      if (isLastAttempt) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      console.warn(`⚠️ Errore: ${error.message}. Riprovo tra ${delay / 1000}s...`);
      await sleep(delay);
    }
  }
}

async function fetchDiscordDataSequential(users) {
  const WORKER_URL = 'https://discord-proxy.nadrabu3.workers.dev';
  const results = [];

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    console.log(`🔄 Carico player ${i + 1}/${users.length}...`);

    try {
      const discordIdentifier = user.identifiers.find(id => id.startsWith("discord:"));
      const steamIdentifier = user.identifiers.find(id => id.startsWith("steam:"));

      if (!discordIdentifier) {
        console.warn(`⚠️ Player "${user.name}" senza Discord - SKIP`);
        continue;
      }

      const discordID = discordIdentifier.split(":")[1];
      const steamID = steamIdentifier ? steamIdentifier.split(":")[1] : null;

      const startTime = Date.now();
      const response = await fetchWithRetry(`${WORKER_URL}?discordID=${discordID}`);
      const discordUser = await response.json();

      const elapsed = Date.now() - startTime;
      const cacheStatus = response.headers.get('X-Cache') || 'UNKNOWN';

      console.log(`✅ "${discordUser.username}" caricato in ${elapsed}ms [Cache: ${cacheStatus}]`);

      results.push({
        user,
        discordID,
        steamID,
        discordUser
      });

    } catch (error) {
      console.error(`❌ Errore nel player ${user.name}:`, error.message);
    }
  }

  return results;
}

async function getPlayers() {
  try {
    console.log('🚀 Inizio caricamento players...');

    const docRefPinned = doc(db, "players", "pinned");
    const docRefMembers = doc(db, "players", "members");

    const [dataPinned, dataMembers] = await Promise.all([
      getDoc(docRefPinned).then(doc => doc.data()?.pinned || []),
      getDoc(docRefMembers).then(doc => doc.data()?.members || [])
    ]);

    console.log(`📌 ${dataPinned.length} pinnati, 🎖️ ${dataMembers.length} membri`);

    const response = await fetch("https://servers-frontend.fivem.net/api/servers/single/3vk49z");
    const responseJSON = await response.json();
    allFiveMPlayers = responseJSON.Data.players;

    console.log(`🎮 ${allFiveMPlayers.length} players online su FiveM`);

    const combinedPlayers = [...dataMembers, ...dataPinned, ...allFiveMPlayers];
    const uniquePlayers = removeDuplicates(combinedPlayers);

    console.log(`🔄 ${combinedPlayers.length} players totali → ${uniquePlayers.length} unici (${combinedPlayers.length - uniquePlayers.length} duplicati rimossi)`);

    const discordDataResults = await fetchDiscordDataSequential(uniquePlayers);
    // Crea Set per lookup veloce
    const onlineDiscordIDs = new Set(
      allFiveMPlayers
        .map(u => u.identifiers.find(id => id.startsWith("discord:")))
        .filter(Boolean)
        .map(id => id.split(":")[1])
    );

    const pinnedDiscordIDs = new Set(
      dataPinned
        .map(u => u.identifiers.find(id => id.startsWith("discord:")))
        .filter(Boolean)
        .map(id => id.split(":")[1])
    );

    const memberDiscordIDs = new Set(
      dataMembers
        .map(u => u.identifiers.find(id => id.startsWith("discord:")))
        .filter(Boolean)
        .map(id => id.split(":")[1])
    );

    players.length = 0;

    for (const result of discordDataResults) {
      players.push({
        id: players.length + 1,
        gameId: result.user.id,
        name: result.discordUser.username,
        avatar: result.discordUser.avatar,
        role: 'player',
        discordID: result.discordID,
        steamHex: result.steamID,
        lastLogin: '',
        hoursThisWeek: 0,
        status: onlineDiscordIDs.has(result.discordID) ? 'active' : 'inactive',
        isPinned: pinnedDiscordIDs.has(result.discordID),
        isMember: memberDiscordIDs.has(result.discordID) // ✅ Aggiunto
      });
    }

    console.log(`🎉 COMPLETATO! ${players.length} players caricati con successo`);
    renderPlayers();

    return players;

  } catch (error) {
    console.error('❌ Errore generale:', error);
    const emptyState = document.getElementById('emptyState');
    if (emptyState) {
      emptyState.style.display = 'block';
      emptyState.innerHTML = `
        <div style="text-align: center; color: #ff6b6b;">
          <h3>❌ Errore nel caricamento</h3>
          <p>${error.message}</p>
          <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px;">
            Riprova
          </button>
        </div>
      `;
    }
    return [];
  }
}

getPlayers().then(players => {
  console.log('📋 Lista finale:', players);
});

async function addDBPlayer(discordID, docName) {
  try {
    const docRef = doc(db, "players", docName);
    const docData = await getDoc(docRef);
    const data = docData.data()?.[docName] || [];

    const dbPlayer = data.find((user) =>
      user.identifiers?.find(id => id.startsWith("discord:"))?.split(":")[1] === discordID
    );

    if (dbPlayer) {
      const index = data.indexOf(dbPlayer);
      data.splice(index, 1);
      await setDoc(docRef, { [docName]: data });

      const playerInList = players.find((user) => user.discordID === discordID);
      if (playerInList) {
        if (docName === "pinned") {
          playerInList.isPinned = false;
        } else {
          playerInList.isMember = false;
        }
      }
      console.log(`🔓 Player ${discordID} rimosso da ${docName}`);
    } else {
      const fivemPlayer = allFiveMPlayers.find((user) =>
        user.identifiers?.find(id => id.startsWith("discord:"))?.split(":")[1] === discordID
      );

      if (fivemPlayer) {
        await setDoc(docRef, { [docName]: [...data, fivemPlayer] });

        const playerInList = players.find((user) => user.discordID === discordID);
        if (playerInList) {
          if (docName === "pinned") {
            playerInList.isPinned = true;
          } else {
            playerInList.isMember = true;
          }
        }
        console.log(`🔒 Player ${discordID} aggiunto a ${docName}`);
      } else {
        console.warn(`⚠️ Player ${discordID} non trovato su FiveM`);
      }
    }

    renderPlayers();
  } catch (error) {
    console.error('❌ Errore in addDBPlayer:', error);
    alert('Errore durante l\'operazione. Riprova.');
  }
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

window.addDBPlayer = addDBPlayer;