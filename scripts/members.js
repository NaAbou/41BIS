// ══════════════════════════════════════
//  41 BIS IMPERO — Members Controller
// ══════════════════════════════════════

// ── Data Store ──
let members = JSON.parse(localStorage.getItem('41bis_members') || '[]');
let editingIndex = null;
let currentFilter = 'all';

// ── Demo data if empty ──
if (members.length === 0) {
    members = [
        { name: 'MOZIN', discordId: '384729103847291038', role: 'braccio', wl: 'si', lastLogin: '2025-02-17T22:30' },
        { name: 'DarkViper', discordId: '529183746102938471', role: 'informativa', wl: 'no', lastLogin: '2025-02-18T01:15' },
        { name: 'LupoNero', discordId: '738291047382910473', role: 'both', wl: 'pending', lastLogin: '2025-02-16T18:45' },
        { name: 'ShadowX', discordId: '192837465019283746', role: 'braccio', wl: 'si', lastLogin: '2025-02-18T10:00' },
        { name: 'Raptor', discordId: '647382910583729104', role: 'informativa', wl: 'si', lastLogin: '2025-02-15T14:20' },
    ];
    save();
}

// ── DOM refs ──
const tbody = document.getElementById('membersBody');
const searchInput = document.getElementById('searchInput');
const modal = document.getElementById('modal');
const toast = document.getElementById('toast');
const filterBtns = document.querySelectorAll('.filter-btn');

// ══════════════════════════════════════
//  RENDER
// ══════════════════════════════════════
function render() {
    const query = searchInput.value.toLowerCase().trim();

    // Apply filters
    const filtered = members.filter(m => {
        if (currentFilter === 'braccio' && m.role !== 'braccio' && m.role !== 'both') return false;
        if (currentFilter === 'informativa' && m.role !== 'informativa' && m.role !== 'both') return false;
        if (query && !m.name.toLowerCase().includes(query) && !m.discordId.includes(query)) return false;
        return true;
    });

    // Update stats
    document.getElementById('statTotal').textContent = members.length;
    document.getElementById('statBraccio').textContent = members.filter(m => m.role === 'braccio' || m.role === 'both').length;
    document.getElementById('statInfo').textContent = members.filter(m => m.role === 'informativa' || m.role === 'both').length;

    // Empty state
    if (filtered.length === 0) {
        tbody.innerHTML = `
      <tr><td colspan="5">
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
        const roleLabel = m.role === 'both' ? 'Braccio + Info' : capitalize(m.role);
        const roleClass = m.role;

        return `
      <tr ondblclick="editMember(${realIndex})" title="Doppio click per modificare">
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
          <span class="last-login ${login.cls}">
            <span class="online-dot ${login.dot}"></span>
            ${login.text}
          </span>
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

function esc(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function save() {
    localStorage.setItem('41bis_members', JSON.stringify(members));
}

function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2200);
}

// ══════════════════════════════════════
//  ACTIONS
// ══════════════════════════════════════
function updateWl(index, value) {
    members[index].wl = value;
    save();
    showToast(`WL aggiornata per ${members[index].name}`);
}

function copyId(id) {
    navigator.clipboard.writeText(id);
    showToast('ID Discord copiato!');
}

function editMember(index) {
    editingIndex = index;
    const m = members[index];
    document.getElementById('modalTitle').textContent = 'Modifica Membro';
    document.getElementById('mName').value = m.name;
    document.getElementById('mDiscordId').value = m.discordId;
    document.getElementById('mRole').value = m.role;
    document.getElementById('mWl').value = m.wl;
    document.getElementById('mLastLogin').value = m.lastLogin || '';
    modal.classList.add('open');
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
//  MODAL
// ══════════════════════════════════════
document.getElementById('addMemberBtn').addEventListener('click', () => {
    editingIndex = null;
    document.getElementById('modalTitle').textContent = 'Aggiungi Membro';
    document.getElementById('mName').value = '';
    document.getElementById('mDiscordId').value = '';
    document.getElementById('mRole').value = 'braccio';
    document.getElementById('mWl').value = 'no';
    document.getElementById('mLastLogin').value = '';
    modal.classList.add('open');
});

document.getElementById('modalCancel').addEventListener('click', () => modal.classList.remove('open'));
modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });

document.getElementById('modalSave').addEventListener('click', () => {
    const name = document.getElementById('mName').value.trim();
    const discordId = document.getElementById('mDiscordId').value.trim();
    const role = document.getElementById('mRole').value;
    const wl = document.getElementById('mWl').value;
    const lastLogin = document.getElementById('mLastLogin').value;

    if (!name || !discordId) {
        showToast('⚠️ Nome e ID Discord sono obbligatori');
        return;
    }

    const member = { name, discordId, role, wl, lastLogin };

    if (editingIndex !== null) {
        members[editingIndex] = member;
        showToast(`✓ ${name} aggiornato`);
    } else {
        members.push(member);
        showToast(`✓ ${name} aggiunto`);
    }

    save();
    modal.classList.remove('open');
    render();
});

// ══════════════════════════════════════
//  DISCORD DATA LOADER API
// ══════════════════════════════════════
/**
 * Carica membri da dati Discord.
 * Passa un array di oggetti:
 *   [{ name, discordId, roles: ['braccio','informativa',...], lastLogin, wl }]
 *
 * Solo i membri con ruolo 'braccio' o 'informativa' vengono aggiunti.
 */
window.loadDiscordMembers = function (data) {
    const validRoles = ['braccio', 'informativa'];

    const filtered = data.filter(u =>
        u.roles && u.roles.some(r => validRoles.includes(r.toLowerCase()))
    );

    members = filtered.map(u => {
        const hasBraccio = u.roles.some(r => r.toLowerCase() === 'braccio');
        const hasInfo = u.roles.some(r => r.toLowerCase() === 'informativa');

        let role = 'braccio';
        if (hasBraccio && hasInfo) role = 'both';
        else if (hasInfo) role = 'informativa';

        return {
            name: u.name || u.username || 'Sconosciuto',
            discordId: u.discordId || u.id || '',
            role,
            wl: u.wl || 'no',
            lastLogin: u.lastLogin || ''
        };
    });

    save();
    render();
    showToast(`✓ Caricati ${members.length} membri da Discord`);
};

// ── Keyboard shortcut: Escape chiude modal ──
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('open')) {
        modal.classList.remove('open');
    }
});

// ══════════════════════════════════════
//  INIT
// ══════════════════════════════════════
render();