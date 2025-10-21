import { signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js'
import { auth } from "./firebase-config.js";


const allTransactions = [
];



onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
  }
});

fetch('https://naabou.github.io/41BIS/messages.json')
  .then(res => res.json())
  .then(messages => {
    messages.forEach(m => {
      estraiValore(m.author, m.content, m.timestamp)
    });
    updatePeriodLabel();
    renderTransactions();
  });

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
  console.log(allTransactions)
  let filtered = allTransactions.filter(t => {
    // Filtro per periodo
    const tDate = new Date(t.date);

    const periodMatch = currentMode === 'day'
      ? tDate.setHours(0, 0, 0, 0) === searchDate.setHours(0, 0, 0, 0)
      : tDate >= getStartOfWeek(searchDate) && tDate <= getEndOfWeek(searchDate);

    // Filtro per ricerca
    const searchMatch = searchQuery === '' ||
      t.author.some(author => author.toLowerCase().includes(searchQuery));

    return periodMatch && searchMatch;
  });

  if (filtered.length === 0) {
    list.innerHTML = '<div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">Nessuna transazione trovata</div>';
    updateTotals(0, 0);
    return;
  }

  list.innerHTML = filtered.map(t => {
    let namesHTML = '';
    console.log(t)
    const displayNames = t.author.slice(0, 2);
    const remainingCount = t.author.length - 2;

    namesHTML = displayNames.map(author =>
      `<span class="transaction-name-badge">${author}</span>`
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
  const regex = /([+-])?\s*(\d+(?:[.,]\d+)?)(?:\s*([kKmM]))?/;
  const match = text.replace('.', '').match(regex);

  const authorMatch = [...text.matchAll(/@[^\p{L}\p{N}]*([\p{L}\p{N}._-]+)/gu)].map(m => m[1]);

  if (!match) {
    console.log("element refused due to match: " + text + "author: " + author + "time: " + time)
    return;
  }

  let [, operator, num, suffix] = match;
  let value = parseFloat(num.replace(',', '.'));

  if (suffix) {
    switch (suffix.toLowerCase()) {
      case 'k': value *= 1_000; break;
      case 'm': value *= 1_000_000; break;
      case 'b': value *= 1_000_000_000; break;
    }
  }

  if (value <= 2000){
    console.log("element refused due to suffix: " + text)
    return;
  } 

  if(operator) value = parseFloat(operator + value);

  

  const formattedTime = new Date(time)
  allTransactions.push({ time: `${formattedTime.getHours()}:${formattedTime.getMinutes()}`, author: [author, ...authorMatch], amount: value, date: formattedTime })
}

function getStartOfWeek(date) {
  const day = date.getDay(),
    diff = date.getDate() - day + (day == 0 ? -6 : 1);
  return new Date(new Date(date.setDate(diff)).setHours(0, 0, 0, 0));
}

function getEndOfWeek(date) {
  var lastday = date.getDate() - (date.getDay() - 1) + 6;
  return new Date((new Date(date.setDate(lastday))).setHours(23, 59, 59, 59));
}