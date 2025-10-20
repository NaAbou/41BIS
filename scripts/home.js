import { signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js'
import { auth } from "./firebase-config.js";


onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
  }
});

fetch('https://naabou.github.io/41BIS/messages.json')
  .then(res => res.json())
  .then(messages => {
    messages.forEach(m => {
      console.log(m.content)
      const value = estraiValore(m.author, m.content, m.timestamp)
      console.log("the value is: " + value)

    });
  });

const allTransactions = [
  {
    time: '14:32',
    names: ['Marco Rossi'],
    amount: 50000,
    date: new Date('2025-10-18'),
  },
];

let currentMode = 'day';
let searchDate = new Date();
let searchQuery = '';

// Toggle ricerca
document.getElementById('searchToggle').addEventListener('click', () => {
  const searchBar = document.getElementById('searchBar');
  searchBar.classList.toggle('hidden');
  if (!searchBar.classList.contains('hidden')) {
    document.getElementById('searchInput').focus();
  }
});

// Ricerca
document.getElementById('searchInput').addEventListener('input', (e) => {
  searchQuery = e.target.value.toLowerCase();
  renderTransactions();
});

// Pulisci ricerca
document.getElementById('clearSearch').addEventListener('click', () => {
  document.getElementById('searchInput').value = '';
  searchQuery = '';
  renderTransactions();
});

// Toggle modalità
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentMode = btn.dataset.mode;
    searchDate = new Date();
    updatePeriodLabel();
    renderTransactions();
  });
});

// Navigazione periodi
document.getElementById('prevPeriod').addEventListener('click', () => {
  if (currentMode === 'day') {
    searchDate.setDate(searchDate.getDate() - 1);
  } else {
    searchDate.setDate(searchDate.getDate() - 7)
  }
  updatePeriodLabel();
  renderTransactions();
});

document.getElementById('nextPeriod').addEventListener('click', () => {
  if (currentMode === 'day') {
    searchDate.setDate(searchDate.getDate() + 1);
  } else {
    searchDate.setDate(searchDate.getDate() + 7);
  }
  updatePeriodLabel();
  renderTransactions();
});

function updatePeriodLabel() {
  const label = document.getElementById('periodLabel');
  if (currentMode === 'day') {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    label.textContent = searchDate.toLocaleDateString('it-IT', options);
  } else {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    label.textContent = `${getStartOfWeek(searchDate).toLocaleDateString('it-IT', options)} - ${getEndOfWeek(searchDate).toLocaleDateString('it-IT', options)}`;
  }
}

function renderTransactions() {
  const list = document.getElementById('transactionList');

  let filtered = allTransactions.filter(t => {
    // Filtro per periodo
    const periodMatch = currentMode === 'day'
      ? Date(t.date) === searchDate
      : Math.floor((t.day - 1) / 7) === currentWeek - 42;

    // Filtro per ricerca
    const searchMatch = searchQuery === '' ||
      t.names.some(name => name.toLowerCase().includes(searchQuery));

    return periodMatch && searchMatch;
  });

  if (filtered.length === 0) {
    list.innerHTML = '<div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">Nessuna transazione trovata</div>';
    updateTotals(0, 0);
    return;
  }

  list.innerHTML = filtered.map(t => {
    let namesHTML = '';
    const displayNames = t.names.slice(0, 2);
    const remainingCount = t.names.length - 2;

    namesHTML = displayNames.map(name =>
      `<span class="transaction-name-badge">${name}</span>`
    ).join('');

    if (remainingCount > 0) {
      namesHTML += `<span class="names-count">+${remainingCount}</span>`;
    }

    return `
          <div class="transaction-item">
            <div>
              <span class="transaction-time">${t.time}</span>
              <div class="transaction-names">
                ${namesHTML}
              </div>
            </div>
            <span class="transaction-amount">$${t.amount.toLocaleString()} 💴</span>
          </div>
        `;
  }).join('');

  const total = filtered.reduce((sum, t) => sum + t.amount, 0);
  updateTotals(total, 0);
}

function updateTotals(dirtMoney, cleanMoney) {
  document.querySelectorAll('.dirtBalance').forEach(el => {
    el.textContent = `$${dirtMoney.toLocaleString()} 💴`;
  });
  document.querySelectorAll('.balance').forEach(el => {
    el.textContent = `$${cleanMoney.toLocaleString()} 💵`;
  });
}

// Inizializza
updatePeriodLabel();
renderTransactions();



function estraiValore(author, text, time) {
  const regex = /([+-])\s*(\d+(?:[.,]\d+)?)\s*([kKmMbB])/;
  const match = text.match(regex);

  console.log(match)
  if (!match) return null;

  let [, operator, num, suffix] = match;
  let value = parseFloat(num.replace(',', '.'));

  console.log("sono arrivato qua")
  if (suffix) {
    switch (suffix.toLowerCase()) {
      case 'k': value *= 1_000; break;
      case 'm': value *= 1_000_000; break;
      case 'b': value *= 1_000_000_000; break;
    }
  }

  if (value <= 999) return null;


  return {
    date: time,
    names: [author, ],
    amount: value,
  }


  console.log("sono arrivato qua2")
  // Se la parola è "soldi", prendi quella dopo
  /*if (word.toLowerCase() === 'soldi' && nextWord) {
    word = nextWord;
  }*/


  console.log("sono arrivato qua3")
  return [value, word]

}

function getStartOfWeek(date) {
  const day = date.getDay(),
    diff = date.getDate() - day + (day == 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

function getEndOfWeek(date) {
  var lastday = date.getDate() - (date.getDay() - 1) + 6;
  return new Date(date.setDate(lastday));
}