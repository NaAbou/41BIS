import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, writeBatch } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';
import { auth } from "./firebase-config.js";
import { db } from "./firebase-config.js";

// ── Data Store ──
let members = [];
let editingIndex = null;
let deletingIndex = null;
let currentFilter = 'all';

// ── Ruoli mappati ──
const BRACCIO_ROLES = ['braccio', 'gestore braccio'];
const INFORMATIVA_ROLES = ['informativa', 'gestore informativa', 'ceo', 'coceo'];

// ── DOM refs ──
const tbody = document.getElementById('membersBody');
const searchInput = document.getElementById('searchInput');
const modal = document.getElementById('modal');
const deleteModal = document.getElementById('deleteModal');
const toast = document.getElementById('toast');
const filterBtns = document.querySelectorAll('.filter-btn');

// ══════════════════════════════════════
//  ROLE DETECTION
// ══════════════════════════════════════
function detectRole(roles) {
    const lower = (roles || []).map(r => r.toLowerCase());

    const isCeo = lower.includes('ceo');
    const isCoceo = lower.includes('coceo');
    const isGestoreBraccio = lower.includes('gestore braccio');
    const isGestoreInfo = lower.includes('gestore informativa');
    const hasBraccio = lower.includes('braccio');
    const hasInfo = lower.includes('informativa');

    if (isCeo) return 'ceo';
    if (isCoceo) return 'coceo';
    if (isGestoreBraccio && isGestoreInfo) return 'gestore_both';
    if (isGestoreBraccio) return 'gestore_braccio';
    if (isGestoreInfo) return 'gestore_informativa';
    if (hasBraccio && hasInfo) return 'both';
    if (hasBraccio) return 'braccio';
    if (hasInfo) return 'informativa';
    return 'ospite';
}

function getRoleLabel(role) {
    const labels = {
        'ceo': 'CEO',
        'coceo': 'Co-CEO',
        'gestore_braccio': 'Gestore Braccio',
        'gestore_informativa': 'Gestore Info',
        'gestore_both': 'Gestore Braccio + Info',
        'both': 'Braccio + Info',
        'braccio': 'Braccio',
        'informativa': 'Informativa',
        'ospite': 'Ospite'
    };
    return labels[role] || role;
}

// ══════════════════════════════════════
//  RENDER
// ══════════════════════════════════════
function render() {
    const query = searchInput.value.toLowerCase().trim();

    const filtered = members.filter(m => {
        if (currentFilter === 'braccio' && !['braccio', 'both', 'gestore_braccio', 'gestore_both'].includes(m.role)) return false;
        if (currentFilter === 'informativa' && !['informativa', 'both', 'gestore_informativa', 'gestore_both', 'ceo', 'coceo'].includes(m.role)) return false;
        if (currentFilter === 'gestori' && !['gestore_braccio', 'gestore_informativa', 'gestore_both', 'ceo', 'coceo'].includes(m.role)) return false;
        if (currentFilter === 'ospiti' && m.role !== 'ospite') return false;
        if (query && !m.name.toLowerCase().includes(query) && !m.discordId.includes(query)) return false;
        return true;
    });

    // Stats
    document.getElementById('statTotal').textContent = members.length;
    document.getElementById('statBraccio').textContent = members.filter(m => ['braccio', 'both', 'gestore_braccio', 'gestore_both'].includes(m.role)).length;
    document.getElementById('statInfo').textContent = members.filter(m => ['informativa', 'both', 'gestore_informativa', 'gestore_both', 'ceo', 'coceo'].includes(m.role)).length;
    const statOspiti = document.getElementById('statOspiti');
    if (statOspiti) statOspiti.textContent = members.filter(m => m.role === 'ospite').length;
    const statGestori = document.getElementById('statGestori');
    if (statGestori) statGestori.textContent = members.filter(m => ['gestore_braccio', 'gestore_informativa', 'gestore_both', 'ceo', 'coceo'].includes(m.role)).length;

    // Empty
    if (filtered.length === 0) {
        tbody.innerHTML = `
      <tr><td colspan="7">
        <div class="empty-state">
          <p>🔍</p>
          <p>Nessun membro trovato</p>
        </div>
      </td></tr>`;
        document.getElementById('memberCount').textContent = '';
        return;
    }

    // Build rows
    tbody.innerHTML = filtered.map(m => {
        const realIndex = members.indexOf(m);
        const login = getLoginStatus(m.lastLogin);
        const roleLabel = getRoleLabel(m.role);
        const roleClass = m.role;
        const hrs = getHoursDisplay(m.hours);
        const rowClass = m.role === 'ospite' ? 'row-ospite' : '';

        return `
      <tr class="${rowClass}">
        <td><span class="member-name">${esc(m.name)}</span></td>
        <td><span class="discord-id" onclick="copyId('${m.discordId}')" title="Clicca per copiare">${m.discordId}</span></td>
        <td><span class="role-badge ${roleClass}">${roleLabel}</span></td>
        <td>
          <select class="wl-select" onchange="updateWl(${realIndex}, this.value)">
            <option value="si"      ${m.wl === 'si' ? 'selected' : ''}>✓ Sì</option>
            <option value="no"      ${m.wl === 'no' ? 'selected' : ''}>✗ No</option>
            <option value="pending" ${m.wl === 'pending' ? 'selected' : ''}>⏳ In attesa</option>
          </select>
        </td>
        <td>
          <span class="hours-played ${hrs.cls}">
            <span class="hours-icon">🕐</span>
            ${hrs.text}
          </span>
        </td>
        <td>
          <span class="last-login ${login.cls}">
            <span class="online-dot ${login.dot}"></span>
            ${login.text}
          </span>
        </td>
        <td>
          <div class="action-btns">
            <button class="btn-edit" onclick="editMember(${realIndex})" title="Modifica">✏️</button>
            <button class="btn-delete" onclick="confirmDelete(${realIndex})" title="Rimuovi">🗑️</button>
          </div>
        </td>
      </tr>`;
    }).join('');

    document.getElementById('memberCount').textContent = `${filtered.length} di ${members.length} membri`;
}

// ══════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════
function getLoginStatus(dateStr) {
    if (!dateStr) return { text: 'Mai', cls: 'offline', dot: 'gray' };
    const d = new Date(dateStr);
    const now = new Date();
    const diffH = (now - d) / 3600000;
    const formatted = d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
        + ' ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

    if (diffH < 1) return { text: 'Online', cls: 'online', dot: 'green' };
    if (diffH < 24) return { text: formatted, cls: 'recent', dot: 'yellow' };
    return { text: formatted, cls: 'offline', dot: 'gray' };
}

function getHoursDisplay(hours) {
    const h = parseFloat(hours) || 0;
    const text = h > 0 ? h + 'h' : '—';
    let cls = 'low';
    if (h >= 200) cls = 'high';
    else if (h >= 50) cls = 'mid';
    return { text, cls };
}

function esc(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

async function save() {
    const batch = writeBatch(db);
    members.forEach(m => {
        const ref = doc(db, 'members', m.discordId);
        batch.set(ref, m, { merge: true });
    });
    await batch.commit();
}

function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2200);
}

// ══════════════════════════════════════
//  ACTIONS
// ══════════════════════════════════════
window.updateWl = async function (index, value) {
    members[index].wl = value;
    await updateDoc(doc(db, 'members', members[index].discordId), { wl: value });
    showToast(`WL aggiornata per ${members[index].name}`);
};

window.copyId = function (id) {
    navigator.clipboard.writeText(id);
    showToast('ID Discord copiato!');
};

window.editMember = function (index) {
    editingIndex = index;
    const m = members[index];
    document.getElementById('modalTitle').textContent = 'Modifica Membro';
    document.getElementById('mName').value = m.name;
    document.getElementById('mDiscordId').value = m.discordId;
    document.getElementById('mRole').value = m.role;
    document.getElementById('mWl').value = m.wl;
    document.getElementById('mHours').value = m.hours || '';
    document.getElementById('mLastLogin').value = m.lastLogin || '';
    modal.classList.add('open');
};

window.confirmDelete = function (index) {
    deletingIndex = index;
    document.getElementById('deleteName').textContent = members[index].name;
    deleteModal.classList.add('open');
};

async function deleteMember() {
    if (deletingIndex === null) return;
    const m = members[deletingIndex];
    const name = m.name;

    await deleteDoc(doc(db, 'members', m.discordId));

    members.splice(deletingIndex, 1);
    deletingIndex = null;
    deleteModal.classList.remove('open');
    render();
    showToast(`🗑️ ${name} rimosso`);
}

// ══════════════════════════════════════
//  FILTERS
// ══════════════════════════════════════
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        render();
    });
});

searchInput.addEventListener('input', render);

// ══════════════════════════════════════
//  MODAL — Add/Edit
// ══════════════════════════════════════
document.getElementById('addMemberBtn').addEventListener('click', () => {
    editingIndex = null;
    document.getElementById('modalTitle').textContent = 'Aggiungi Membro';
    document.getElementById('mName').value = '';
    document.getElementById('mDiscordId').value = '';
    document.getElementById('mRole').value = 'braccio';
    document.getElementById('mWl').value = 'no';
    document.getElementById('mHours').value = '';
    document.getElementById('mLastLogin').value = '';
    modal.classList.add('open');
});

document.getElementById('modalCancel').addEventListener('click', () => modal.classList.remove('open'));
modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });

document.getElementById('modalSave').addEventListener('click', async () => {
    const name = document.getElementById('mName').value.trim();
    const discordId = document.getElementById('mDiscordId').value.trim();
    const role = document.getElementById('mRole').value;
    const wl = document.getElementById('mWl').value;
    const hours = parseFloat(document.getElementById('mHours').value) || 0;
    const lastLogin = document.getElementById('mLastLogin').value;

    if (!name || !discordId) {
        showToast('⚠️ Nome e ID Discord sono obbligatori');
        return;
    }

    const member = { name, discordId, role, wl, hours, lastLogin };

    if (editingIndex !== null) {
        members[editingIndex] = member;
        showToast(`✓ ${name} aggiornato`);
    } else {
        members.push(member);
        showToast(`✓ ${name} aggiunto`);
    }

    await setDoc(doc(db, 'members', discordId), member, { merge: true });

    modal.classList.remove('open');
    render();
});

// ══════════════════════════════════════
//  MODAL — Delete confirm
// ══════════════════════════════════════
document.getElementById('deleteConfirmBtn').addEventListener('click', deleteMember);
document.getElementById('deleteCancelBtn').addEventListener('click', () => {
    deletingIndex = null;
    deleteModal.classList.remove('open');
});
deleteModal.addEventListener('click', e => {
    if (e.target === deleteModal) {
        deletingIndex = null;
        deleteModal.classList.remove('open');
    }
});

// ── Keyboard: Escape chiude modali ──
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        if (modal.classList.contains('open')) modal.classList.remove('open');
        if (deleteModal.classList.contains('open')) {
            deletingIndex = null;
            deleteModal.classList.remove('open');
        }
    }
});

// ══════════════════════════════════════
//  LOAD FROM FIRESTORE
// ══════════════════════════════════════
async function loadMembers() {
    try {
        const snapshot = await getDocs(collection(db, 'members'));
        members = snapshot.docs.map(d => {
            const data = d.data();
            const role = detectRole(data.roles);

            return {
                name: data.name || data.username || 'Sconosciuto',
                discordId: data.discordId || d.id,
                username: data.username || '',
                role,
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

// ══════════════════════════════════════
//  INIT
// ══════════════════════════════════════
loadMembers();