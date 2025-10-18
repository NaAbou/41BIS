import {signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js'
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
      console.log(m)
     // console.log(`[${m.timestamp}] ${m.author}: ${m.content}`);
    });
  });

    // Dati di esempio
    const allTransactions = [
      { 
        time: '14:32', 
        names: ['Marco Rossi'], 
        amount: 50000, 
        date: new Date('2025-10-18'),
        day: 18
      },
      { 
        time: '13:15', 
        names: ['Laura Bianchi', 'Giuseppe Verdi'], 
        amount: 75000, 
        date: new Date('2025-10-18'),
        day: 18
      },
      { 
        time: '12:45', 
        names: ['Anna Ferrari', 'Paolo Romano', 'Maria Colombo', 'Luca Gallo'], 
        amount: 100000, 
        date: new Date('2025-10-18'),
        day: 18
      },
      { 
        time: '11:20', 
        names: ['Stefano Neri'], 
        amount: 25000, 
        date: new Date('2025-10-18'),
        day: 18
      },
      { 
        time: '16:45', 
        names: ['Giovanni Russo'], 
        amount: 30000, 
        date: new Date('2025-10-17'),
        day: 17
      },
      { 
        time: '09:30', 
        names: ['Elena Ricci', 'Andrea Marino'], 
        amount: 65000, 
        date: new Date('2025-10-17'),
        day: 17
      }
    ];

    let currentMode = 'day';
    let currentDay = 18;
    let currentWeek = 42;
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
        updatePeriodLabel();
        renderTransactions();
      });
    });

    // Navigazione periodi
    document.getElementById('prevPeriod').addEventListener('click', () => {
      if (currentMode === 'day') {
        currentDay--;
      } else {
        currentWeek--;
      }
      updatePeriodLabel();
      renderTransactions();
    });

    document.getElementById('nextPeriod').addEventListener('click', () => {
      if (currentMode === 'day') {
        currentDay++;
      } else {
        currentWeek++;
      }
      updatePeriodLabel();
      renderTransactions();
    });

    function updatePeriodLabel() {
      const label = document.getElementById('periodLabel');
      if (currentMode === 'day') {
        const date = new Date(2025, 9, currentDay);
        label.textContent = `${date.getDate()} Ottobre 2025`;
      } else {
        label.textContent = `Settimana ${currentWeek} - 2025`;
      }
    }

    function renderTransactions() {
      const list = document.getElementById('transactionList');
      
      let filtered = allTransactions.filter(t => {
        // Filtro per periodo
        const periodMatch = currentMode === 'day' 
          ? t.day === currentDay 
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