import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, writeBatch } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';
import { getMemberWeeklyHours } from './utils.js';
import { auth, db } from "./firebase-config.js";

// ── Data ──
let members = [], editingIndex = null, deletingIndex = null, currentFilter = 'all';

// ── Ruoli Discord ──
const BRACCIO_ROLES = ['🔫main', '🔫・trial b.a®', '🔫・braccio armato®', 'gestore braccio'];
const INFORMATIVA_ROLES = ['informativa', 'gestore informativa', 'ceo', 'co ceo'];
const GESTORI_ROLES = ['gestore braccio', 'gestore informativa', 'ceo', 'co ceo'];

// ── DOM ──
const tbody = document.getElementById('membersBody');
const searchInput = document.getElementById('searchInput');
const modal = document.getElementById('modal');
const deleteModal = document.getElementById('deleteModal');
const toast = document.getElementById('toast');
const filterBtns = document.querySelectorAll('.filter-btn');

// ── Helpers ──
const esc = s => Object.assign(document.createElement('div'), { textContent: s }).innerHTML;
const lower = arr => (arr || []).map(r => r.toLowerCase());
const hasAny = (roles, list) => lower(roles).some(r => list.includes(r));

const logs = await getMemberWeeklyHours()

function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2200);
}

function getLoginStatus(dateStr) {
    if (!dateStr) return { text: 'Mai', cls: 'offline', dot: 'gray' };
    const d = new Date(dateStr);
    const diffH = (Date.now() - d) / 3600000;
    const formatted = d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
        + ' ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    if (diffH < 1) return { text: 'Online', cls: 'online', dot: 'green' };
    if (diffH < 24) return { text: formatted, cls: 'recent', dot: 'yellow' };
    return { text: formatted, cls: 'offline', dot: 'gray' };
}

function getHoursDisplay(hours) {
    const h = parseFloat(hours) || 0;
    return { text: h > 0 ? h + 'h' : '—', cls: h >= 200 ? 'high' : h >= 50 ? 'mid' : 'low' };
}

// ── Role Detection ──
function detectRole(roles) {
    const l = lower(roles);
    if (l.includes('ceo')) return 'ceo';
    if (l.includes('co ceo')) return 'coceo';
    const gb = l.includes('gestore braccio'), gi = l.includes('gestore informativa');
    if (gb && gi) return 'gestore_both';
    if (gb) return 'gestore_braccio';
    if (gi) return 'gestore_informativa';
    const hb = l.some(r => ['🔫・trial b.a®', '🔫・braccio armato®', '🔫main'].includes(r));
    const hi = l.includes('informativa');
    if (hb && hi) return 'both';
    if (hb) return 'braccio';
    if (hi) return 'informativa';
    return 'ospite';
}

const ROLE_LABELS = {
    ceo: 'CEO', coceo: 'CO-CEO',
    gestore_braccio: 'Gestore Braccio', gestore_informativa: 'Gestore Info', gestore_both: 'Gestore Braccio + Info',
    both: 'Braccio + Info', braccio: 'Braccio', informativa: 'Informativa', ospite: 'Ospite'
};

// ── Filter logic (usa roles raw) ──
function matchesFilter(m) {
    if (currentFilter === 'all') return true;
    if (currentFilter === 'braccio') return hasAny(m.roles, BRACCIO_ROLES);
    if (currentFilter === 'informativa') return hasAny(m.roles, INFORMATIVA_ROLES);
    if (currentFilter === 'gestori') return hasAny(m.roles, GESTORI_ROLES);
    if (currentFilter === 'ospiti') return m.role === 'ospite';
    return true;
}

// ── Render ──
function render() {
    const query = searchInput.value.toLowerCase().trim();
    const filtered = members.filter(m => {
        if (!matchesFilter(m)) return false;
        if (query && !m.name.toLowerCase().includes(query) && !m.discordId.includes(query)) return false;
        return true;
    });

    // Stats — contano dai ruoli Discord reali
    document.getElementById('statTotal').textContent = members.length;
    document.getElementById('statBraccio').textContent = members.filter(m => hasAny(m.roles, BRACCIO_ROLES)).length;
    document.getElementById('statInfo').textContent = members.filter(m => hasAny(m.roles, INFORMATIVA_ROLES)).length;
    const el = id => document.getElementById(id);
    if (el('statOspiti')) el('statOspiti').textContent = members.filter(m => m.role === 'ospite').length;
    if (el('statGestori')) el('statGestori').textContent = members.filter(m => hasAny(m.roles, GESTORI_ROLES)).length;

    if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><p>🔍</p><p>Nessun membro trovato</p></div></td></tr>`;
        document.getElementById('memberCount').textContent = '';
        return;
    }

    tbody.innerHTML = filtered.map(m => {
        const i = members.indexOf(m);
        const login = getLoginStatus(m.lastLogin);
        const hrs = getHoursDisplay(m.hours);
        return `
      <tr class="${m.role === 'ospite' ? 'row-ospite' : ''}">
        <td><span class="member-name">${esc(m.name)}</span></td>
        <td><span class="discord-id" onclick="copyId('${m.discordId}')" title="Clicca per copiare">${m.discordId}</span></td>
        <td><span class="role-badge ${m.role ? m.role : 'ospite'}">${(ROLE_LABELS[m.role] || m.role) ? ROLE_LABELS[m.role] || m.role : '-'}</span></td>
        <td>
          <select class="wl-select" onchange="updateWl(${i}, this.value)">
            <option value="si" ${m.wl === 'si' ? 'selected' : ''}>✓ Sì</option>
            <option value="no" ${m.wl === 'no' ? 'selected' : ''}>✗ No</option>
            <option value="pending" ${m.wl === 'pending' ? 'selected' : ''}>⏳ In attesa</option>
          </select>
        </td>
        <td><span class="hours-played ${hrs.cls}"><span class="hours-icon">🕐</span>${logs.filter(entry => (entry.steamName || entry.discordID) === m.steamName).length /* - */}</span></td>
        <td><span class="last-login ${login.cls}"><span class="online-dot ${login.dot}"></span>${logs
                .filter(entry => (entry.steamName || entry.discordID) === m.steamName)
                .reduce((max, entry) => Math.max(max, entry.timestamp), 0) ? new Date(logs
                    .filter(entry => (entry.steamName || entry.discordID) === m.name)
                    .reduce((max, entry) => Math.max(max, entry.timestamp), 0) * 1000) : 'Mai'}</span></td>
        <td><div class="action-btns">
          <button class="btn-edit" onclick="editMember(${i})" title="Modifica">✏️</button>
          <button class="btn-delete" onclick="confirmDelete(${i})" title="Rimuovi">🗑️</button>
        </div></td>
      </tr>`;
    }).join('');

    document.getElementById('memberCount').textContent = `${filtered.length} di ${members.length} membri`;
}

// ── Actions ──
window.updateWl = async (index, value) => {
    members[index].wl = value;
    await updateDoc(doc(db, 'members', members[index].discordId), { wl: value });
    showToast(`WL aggiornata per ${members[index].name}`);
};

window.copyId = id => { navigator.clipboard.writeText(id); showToast('ID Discord copiato!'); };

window.editMember = index => {
    editingIndex = index;
    const m = members[index];
    document.getElementById('modalTitle').textContent = 'Modifica Membro';
    document.getElementById('mName').value = m.name;
    document.getElementById('mSteamName').value = m.steamName || '';
    document.getElementById('mDiscordId').value = m.discordId;
    document.getElementById('mRole').value = m.role;
    document.getElementById('mWl').value = m.wl;
    document.getElementById('mHours').value = m.hours || '';
    document.getElementById('mLastLogin').value = m.lastLogin || '';
    modal.classList.add('open');
};

window.confirmDelete = index => {
    deletingIndex = index;
    document.getElementById('deleteName').textContent = members[index].name;
    deleteModal.classList.add('open');
};

async function deleteMember() {
    if (deletingIndex === null) return;
    const m = members[deletingIndex];
    await deleteDoc(doc(db, 'members', m.discordId));
    members.splice(deletingIndex, 1);
    deletingIndex = null;
    deleteModal.classList.remove('open');
    render();
    showToast(`🗑️ ${m.name} rimosso`);
}

// ── Filters ──
filterBtns.forEach(btn => btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    render();
}));

searchInput.addEventListener('input', render);

// ── Modal Add/Edit ──
document.getElementById('addMemberBtn').addEventListener('click', () => {
    editingIndex = null;
    document.getElementById('modalTitle').textContent = 'Aggiungi Membro';
    ['mName', 'mSteamName', 'mDiscordId', 'mHours', 'mLastLogin'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('mRole').value = 'braccio';
    document.getElementById('mWl').value = 'no';
    modal.classList.add('open');
});

const closeModal = () => modal.classList.remove('open');
document.getElementById('modalCancel').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

document.getElementById('modalSave').addEventListener('click', async () => {
    const name = document.getElementById('mName').value.trim();
    const steamName = document.getElementById('mSteamName').value.trim();
    const discordId = document.getElementById('mDiscordId').value.trim();
    if (!name || !discordId) return showToast('⚠️ Nome e ID Discord sono obbligatori');

    const member = {
        name, steamName, discordId,
        role: document.getElementById('mRole').value,
        wl: document.getElementById('mWl').value,
        hours: parseFloat(document.getElementById('mHours').value) || 0,
        lastLogin: document.getElementById('mLastLogin').value
    };

    if (editingIndex !== null) { members[editingIndex] = member; showToast(`✓ ${name} aggiornato`); }
    else { members.push(member); showToast(`✓ ${name} aggiunto`); }

    await setDoc(doc(db, 'members', discordId), member, { merge: true });
    closeModal();
    render();
});

// ── Modal Delete ──
document.getElementById('deleteConfirmBtn').addEventListener('click', deleteMember);
const closeDeleteModal = () => { deletingIndex = null; deleteModal.classList.remove('open'); };
document.getElementById('deleteCancelBtn').addEventListener('click', closeDeleteModal);
deleteModal.addEventListener('click', e => { if (e.target === deleteModal) closeDeleteModal(); });

// ── Keyboard ──
document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (modal.classList.contains('open')) closeModal();
    if (deleteModal.classList.contains('open')) closeDeleteModal();
});

// ── Load from Firestore ──
async function loadMembers() {
    try {
        const snapshot = await getDocs(collection(db, 'members'));
        members = snapshot.docs.map(d => {
            const data = d.data();
            return {
                name: data.name || data.username || 'Sconosciuto',
                discordId: data.discordId || d.id,
                username: data.username || '',
                role: detectRole(data.roles),
                roles: data.roles || [],
                wl: data.wl || 'no',
                hours: parseFloat(data.hours) || 0,
                lastLogin: data.lastLogin || ''
            };
        });
        render();
        showToast(`✓ Caricati ${members.length} membri da Firestore`);
    } catch (err) {
        console.error('Errore Firestore:', err);
        showToast('❌ Errore nel caricamento da Firestore');
    }
}

loadMembers();