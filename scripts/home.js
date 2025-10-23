import { signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js'
import { doc, updateDoc, arrayUnion, setDoc, collection, getDocs, query, orderBy, limit, where, getDoc } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';
import { auth } from "./firebase-config.js";
import { db } from "./firebase-config.js";


let allTransactions = [];
let currentMode = 'day';
let searchDate = new Date();
let searchQuery = '';


document.getElementById('settingsNav').addEventListener('click', () => {
  document.location.href = "impostazioni.html";
  searchQuery = '';
  renderTransactions();
});

updatePeriodLabel();

fetch('https://naabou.github.io/41BIS/messages.json')
  .then(res => res.json())
  .then(messages => {
    messages.forEach(m => {
      estraiValore(m.author, m.content, m.timestamp)
    });
    storeTransactionsByDate(allTransactions).then(async () => {
      updateTotal();
      updatePeriodLabel();
      allTransactions = await loadTransactionsFromFirestore();
      renderTransactions();
    })
  });


document.getElementById('searchToggle').addEventListener('click', () => {
  const searchBar = document.getElementById('searchBar');
  searchBar.classList.toggle('hidden');
  if (!searchBar.classList.contains('hidden')) {
    document.getElementById('searchInput').focus();
  }
});

document.getElementById('searchInput').addEventListener('input', (e) => {
  searchQuery = e.target.value.toLowerCase();
  renderTransactions();
});

document.getElementById('clearSearch').addEventListener('click', () => {
  document.getElementById('searchInput').value = '';
  searchQuery = '';
  renderTransactions();
});

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


async function renderTransactions() {
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
          <div class="transaction-item" ${t.skip ? "style='opacity: 0.5'" : ""}>
            <div>
              <span class="transaction-time">${t.time}</span>
              <div class="transaction-names">
              ${namesHTML}
              </div>
              <div class="transaction-text" style="display: none">${t.content}</div>
              </div>
              <span class="transaction-amount">$ ${t.amount.toLocaleString()} ${t.dirty ? "💴" : "💵"}</span>
              <button class="transaction-skip" id="skipButton" ${t.skip ? "style='background: rgba(97, 239, 68, 0.5)'" : "style='background: rgba(239, 68, 68, 0.5)'"}>${t.skip ? "✔" : "✕"}</button>
          </div>
        `;
  }).join('');


  document.querySelectorAll('.transaction-item').forEach((e) => {
    e.addEventListener('click', function () {
      const textElement = this.querySelector('.transaction-text');
      if (textElement.style.display === 'none') {
        textElement.style.display = '';
        this.style.paddingBottom = 75 + 'px';
      } else {
        textElement.style.display = 'none';
        this.style.paddingBottom = 20 + 'px';
      }
    });
  })

  console.log(document.querySelectorAll('transaction-skip'))
  document.querySelectorAll('.transaction-skip').forEach(elem => elem.addEventListener('click', async (e) => {
    e.stopPropagation()
    const content = e.currentTarget.parentElement.querySelectorAll('.transaction-text')[0].innerHTML
    const time = e.currentTarget.parentElement.querySelectorAll('.transaction-time')[0].innerHTML
    try {
      const snapshot = await getDocs(collection(db, "transactions"));

      let found = false;

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const items = Array.isArray(data.items) ? data.items : [];

        const index = items.findIndex(item => {
          return item && item.content === content && item.time === time;
        });

        if (index !== -1) {
          found = true;
          console.log("Trovato in doc:", docSnap.id, "index:", index, "item:", items[index]);
          items[index] = { ...items[index], skip: (items[index].skip ? false : true) };
          console.log("Trovato in doc:", docSnap.id, "index:", index, "item:", items[index]);
          await updateDoc(docSnap.ref, { items });
        }
      }

      if (!found) {
        console.log("Nessun elemento trovato per:", content, time);
      } else {
      }
    } catch (err) {
      console.error("Errore durante la ricerca/aggiornamento:", err);
    }
    allTransactions = await loadTransactionsFromFirestore()
    renderTransactions()
  }));

  const total = filtered.filter(t => t.dirty === true && t.skip !== true).reduce((sum, t) => sum + t.amount, 0);
  const cleanTotal = filtered.filter(t => t.dirty === false && t.skip !== true).reduce((sum, t) => sum + t.amount, 0);

  loadTransactionsFromFirestore().then((transactions) => allTransactions = transactions)
  console.log(total)
  updateTotals(total, cleanTotal);
  updateTotal();
}

function updateTotals(dirtMoney, cleanMoney) {
  document.querySelectorAll('.dirtBalance').forEach(el => {
    el.textContent = `$${dirtMoney.toLocaleString()} 💴`;
  });
  document.querySelectorAll('.balance').forEach(el => {
    el.textContent = `$${cleanMoney.toLocaleString()} 💵`;
  });
}

function estraiValore(author, text, time) {
  const regex = /([+-])?\s*(\d+(?:[.,]\d+)?)(?:\s*([kKmM])(?![a-zA-Z]))?/g;
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
      author: authorMatch.includes(author)? authorMatch : [author, ...authorMatch],
      amount: value,
      dirty: !(text.toLowerCase().includes("puliti") || text.toLowerCase().includes("pulito")),
      date: formattedTime,
      content: text,
    })
  })
  console.log(allTransactions)
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


async function updateTotal() {
  let total = 0;
  let dirtTotal = 0;

  const transactionsRef = collection(db, 'transactions');
  const snapshot = await getDocs(transactionsRef);

  snapshot.forEach((doc) => {
    const data = doc.data();

    if (data.items && Array.isArray(data.items)) {
      data.items.forEach(t => {
        if (t.skip) return
        if (!t.dirty) {
          total += t.amount
        } else {
          dirtTotal += t.amount
        }
      });
    }
  });


  document.querySelectorAll('.total')[0].textContent = "$" + total.toLocaleString() + " 💵";
  document.querySelectorAll('.dirtTotal')[0].textContent = "$" + dirtTotal.toLocaleString() + " 💴";
}


async function storeTransactionsByDate(transactions) {
  if (!transactions.length) return;

  const byDate = new Map();

  const transactionsRef = collection(db, 'transactions');
  const snapshot = await getDocs(transactionsRef);

  let latestDate = new Date("2002-12-11");

  snapshot.forEach((doc) => {
    const dateKey = new Date(doc.id);
    if (latestDate < dateKey)
      latestDate = dateKey;
  });
  latestDate.setHours(0, 0, 0)

  for (const t of transactions) {
    if (latestDate < t.date) {
      const dateKey = t.date.toISOString().split('T')[0];
      if (!byDate.has(dateKey)) byDate.set(dateKey, []);
      byDate.get(dateKey).push(
        {
          ...t,
        });
    }
  }

  for (const [dateKey, transForDate] of byDate.entries()) {
    const dateDocRef = doc(db, 'transactions', dateKey);

    try {
      const existingDoc = await getDoc(dateDocRef);

      if (existingDoc.exists()) {
        const existingData = existingDoc.data();
        const existingItems = existingData.items || [];
        const mergedItems = [...existingItems];

        for (const newTrans of transForDate) {
          const existingIndex = mergedItems.findIndex(
            item => item.content === newTrans.content &&
              item.time === newTrans.time
          );

          if (existingIndex >= 0) {
            const existing = mergedItems[existingIndex];
            mergedItems[existingIndex] = {
              ...newTrans,
              ...Object.fromEntries(
                Object.entries(existing).filter(([key, val]) => val === true)
              )
            };
          } else {
            mergedItems.push(newTrans);
          }
        }
        await updateDoc(dateDocRef, { items: mergedItems });
      } else {
        await setDoc(dateDocRef, { items: transForDate });
      }
      console.log(`✅ Stored ${transForDate.length} transactions for ${dateKey}`);
    } catch (error) {
      console.error(`❌ Error storing transactions for ${dateKey}:`, error);
    }
  }
}


async function loadTransactionsFromFirestore() {
  const transactions = [];

  try {
    const transactionsRef = collection(db, 'transactions');
    const snapshot = await getDocs(transactionsRef);

    snapshot.forEach((doc) => {
      const data = doc.data();

      if (data.items && Array.isArray(data.items)) {
        data.items.forEach(item => {
          transactions.push({
            time: item.time,
            author: item.author,
            amount: item.amount,
            dirty: item.dirty,
            skip: item.skip,
            date: item.date.toDate(),
            content: item.content
          });
        });
      }
    });
    console.log(`✅ Loaded ${transactions.length} transactions from Firestore`);

    console.log(transactions)
    return transactions
  } catch (error) {
    console.error('❌ Error loading from Firestore:', error);
    throw error;
  }
}


onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
  }
});
