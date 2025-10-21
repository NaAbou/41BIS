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
    updateTotal();
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
  allTransactions.sort
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
  }).sort((a, b) => a.date - b.date);

  if (filtered.length === 0) {
    list.innerHTML = '<div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">Nessuna transazione trovata</div>';
    updateTotals(0, 0);
    return;
  }

  list.innerHTML = filtered.map(t => {
    let namesHTML = '';

    namesHTML = t.author.map(author =>
      `<span class="transaction-name-badge">${author}</span>`
    ).join('');

    return `
          <div class="transaction-item">
            <div>
              <span class="transaction-time">${t.time}</span>
              <div class="transaction-names">
                ${namesHTML}
              </div>
            </div>
            <span class="transaction-amount">$ ${t.amount.toLocaleString()} ${t.dirty ? "💴" : "💵"}</span>
          </div>
        `;
  }).join('');

  const total = filtered.filter(t => t.dirty === true).reduce((sum, t) => sum + t.amount, 0);
  const cleanTotal = filtered.filter(t => t.dirty === false).reduce((sum, t) => sum + t.amount, 0);
  updateTotals(total, cleanTotal);
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
  const regex = /([+-])?\s*(\d+(?:[.,]\d+)?)(?:\s*([kKmM]))?/g;
  const match = text.replace('.', '').match(regex);
  console.log("text: " + text + " match: " + match)

  const authorMatch = [...text.matchAll(/@[^\p{L}\p{N}]*([\p{L}\p{N}._-]+)/gu)].map(m => m[1]);

  if (!match) {
    console.log("element refused due to match: " + text + "author: " + author + "time: " + time)
    return;
  }

  match.forEach((element) => {
    const str = String(element)
    let value = 0;
    value = parseFloat(str.replace(',', '.').match(/\d+(\.\d+)?/));
    console.log("element: " + element + " value: " + value)

    if (str.toLowerCase().includes("k")) {
      value *= 1_000
    } else if (str.toLowerCase().includes("m")) {
      value *= 1_000_000
    }

    if (value <= 2000) {
      console.log("element refused due to suffix: " + str)
      return;
    }

    if (str.includes("-")) value = -1 * value;

    console.log("completed with value: " + value + "made by: " + [author, ...authorMatch])
    const formattedTime = new Date(time)
    allTransactions.push({
      time: `${formattedTime.getHours().toString().padStart(2, '0')}:${formattedTime.getMinutes().toString().padStart(2, '0')}`,
      author: [author, ...authorMatch],
      amount: value,
      dirty: !(text.toLowerCase().includes("puliti") || text.toLowerCase().includes("pulito")),
      date: formattedTime
    })
  })
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


function updateTotal() {
  let total = 0;
  let dirtTotal = 0;
  allTransactions.forEach((i) => {
    if (!i.dirty) {
      total += i.amount
    } else {
      dirtTotal += i.amount
    }
  })
  document.querySelectorAll('.total')[0].textContent = "$" + total.toLocaleString() + " 💵";
  document.querySelectorAll('.dirtTotal')[0].textContent = "$" + dirtTotal.toLocaleString() + " 💴";
}