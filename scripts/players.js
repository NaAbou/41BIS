import { signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js'
import { doc, updateDoc, arrayUnion, setDoc, collection, getDocs, query, orderBy, limit, where, getDoc } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';
import { auth } from "./firebase-config.js";
import { db } from "./firebase-config.js";


let allTransactions = [];
let currentMode = 'day';
let searchDate = new Date();
let searchQuery = '';


onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
  }
});

const players = [
  {
    id: 1,
    name: 'Marco Rossi',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marco',
    role: 'Attaccante',
    email: 'marco.rossi@email.com',
    joinDate: '2024-01-15',
    location: 'Milano',
    rating: 4.5,
    status: 'active'
  },
  {
    id: 2,
    name: 'Giulia Bianchi',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Giulia',
    role: 'Difensore',
    email: 'giulia.bianchi@email.com',
    joinDate: '2024-02-20',
    location: 'Roma',
    rating: 4.8,
    status: 'active'
  },
  {
    id: 3,
    name: 'Luca Verdi',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Luca',
    role: 'Centrocampista',
    email: 'luca.verdi@email.com',
    joinDate: '2024-03-10',
    location: 'Napoli',
    rating: 4.2,
    status: 'inactive'
  },
  {
    id: 4,
    name: 'Sofia Russo',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sofia',
    role: 'Portiere',
    email: 'sofia.russo@email.com',
    joinDate: '2024-01-05',
    location: 'Torino',
    rating: 4.9,
    status: 'active'
  },
  {
    id: 5,
    name: 'Alessandro Ferrari',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alessandro',
    role: 'Attaccante',
    email: 'alessandro.ferrari@email.com',
    joinDate: '2024-04-12',
    location: 'Firenze',
    rating: 4.6,
    status: 'active'
  },
  {
    id: 6,
    name: 'Elena Marino',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena',
    role: 'Centrocampista',
    email: 'elena.marino@email.com',
    joinDate: '2024-02-28',
    location: 'Bologna',
    rating: 4.3,
    status: 'active'
  }
];

let searchTerm = '';
let filterRole = 'all';

function initializeRoleFilter() {
  const roleFilter = document.getElementById('roleFilter');
  const roles = [...new Set(players.map(p => p.role))];

  roles.forEach(role => {
    const option = document.createElement('option');
    option.value = role;
    option.textContent = role;
    roleFilter.appendChild(option);
  });
}

function createStarIcon(filled) {
  return `
                <svg class="star ${filled ? 'filled' : ''}" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
                </svg>
            `;
}

function createPlayerCard(player) {
  const stars = Array.from({ length: 5 }, (_, i) => createStarIcon(i < Math.floor(player.rating))).join('');
  const date = new Date(player.joinDate).toLocaleDateString('it-IT');

  return `
                <div class="player-card">
                    <div class="card-header">
                        <div class="avatar-wrapper">
                            <img src="${player.avatar}" alt="${player.name}" class="avatar">
                            <div class="status-indicator status-${player.status}"></div>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="player-name">${player.name}</div>
                        <div class="player-role">${player.role}</div>
                        
                        <div class="rating">
                            ${stars}
                            <span class="rating-value">${player.rating}</span>
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
                            <div class="info-item">
                                <svg class="info-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                </svg>
                                <span class="info-text">Iscritto: ${date}</span>
                            </div>
                        </div>

                        <button class="view-profile-btn">Visualizza Profilo</button>
                    </div>
                </div>
            `;
}

function filterPlayers() {
  return players.filter(player => {
    const matchesSearch = searchTerm === '' ||
      player.name.toLowerCase().includes(searchTerm) ||
      player.email.toLowerCase().includes(searchTerm) ||
      player.location.toLowerCase().includes(searchTerm);

    const matchesRole = filterRole === 'all' || player.role === filterRole;

    return matchesSearch && matchesRole;
  });
}

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
  }v

  const count = filtered.length;
  resultsCount.textContent = `${count} giocator${count !== 1 ? 'i' : 'e'} trovat${count !== 1 ? 'i' : 'o'}`;
}

document.getElementById('searchInput').addEventListener('input', (e) => {
  searchTerm = e.target.value.toLowerCase();
  renderPlayers();
});

document.getElementById('roleFilter').addEventListener('change', (e) => {
  filterRole = e.target.value;
  renderPlayers();
});

initializeRoleFilter();
renderPlayers();






















