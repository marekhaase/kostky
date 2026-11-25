// ============================================================
// KOSTKY DO HROBA – jednoduchý zápisník skóre
// ============================================================

/* -------- Stav -------- */
const state = {
  players: [],           // [{id, name, score, rounds: []}]
  history: [],           // [{playerId, name, score, ts}]
  settings: {
    winScore: 10000,
    minScore: 500,
    playerCount: 0
  },
  winner: null,
  currentPlayerIdx: 0
};

/* -------- DOM cache (lazy, načtou se v init) -------- */
let scoreboardBody, winnerBanner, winnerName, winnerScore;
let settingsModal, setWin, setMin, setPlayers, settingsCancel, settingsSave, confirmNote;
let themeBtn, manualScoreInput, addPlayerBtn, currentPlayerEl, manualAddBtn, settingsBtn;

function cacheDOM() {
  scoreboardBody = document.querySelector('#scoreboard tbody');
  winnerBanner = document.querySelector('#winnerBanner');
  winnerName = document.querySelector('#winnerName');
  winnerScore = document.querySelector('#winnerScore');
  settingsModal = document.querySelector('#settingsModal');
  setWin = document.querySelector('#setWin');
  setMin = document.querySelector('#setMin');
  setPlayers = document.querySelector('#setPlayers');
  settingsCancel = document.querySelector('#settingsCancel');
  settingsSave = document.querySelector('#settingsSave');
  confirmNote = document.querySelector('#confirmNote');
  themeBtn = document.querySelector('#themeBtn');
  manualScoreInput = document.querySelector('#manualScore');
  addPlayerBtn = document.querySelector('#addPlayerBtn');
  currentPlayerEl = document.querySelector('#currentPlayer');
  manualAddBtn = document.querySelector('#manualAddBtn');
  settingsBtn = document.querySelector('#settingsBtn');
}

/* -------- Utility -------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt = n => n.toLocaleString('cs-CZ');
const now = () => Date.now();

function load() {
  try {
    const raw = localStorage.getItem('kostky_state_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      Object.assign(state, parsed);
      state.players = state.players.map(p => ({
        id: p.id,
        name: p.name,
        score: p.score ?? 0,
        rounds: p.rounds ?? []
      }));
      if (state.currentPlayerIdx >= state.players.length) {
        state.currentPlayerIdx = 0;
      }
    }
  } catch {}
  applyTheme();
  renderAll();
}

function save() {
  try {
    localStorage.setItem('kostky_state_v1', JSON.stringify(state));
  } catch {}
}

function applyTheme() {
  const dark = document.documentElement.dataset.theme === 'dark' ||
    (!document.documentElement.dataset.theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (themeBtn) {
    themeBtn.textContent = dark ? 'Světlý' : 'Tmavý';
    themeBtn.setAttribute('aria-label', dark ? 'Přepnout na světlý' : 'Přepnout na tmavý');
  }
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme;
  const next = current === 'dark' ? 'light' : current === 'light' ? '' : 'dark';
  if (next) document.documentElement.dataset.theme = next;
  else document.documentElement.removeAttribute('data-theme');
  applyTheme();
}

/* -------- Hráči -------- */
function addPlayer(name) {
  const id = 'p' + Date.now() + Math.random().toString(36).slice(2,5);
  const p = { id, name: name || `Hráč ${state.players.length+1}`, score: 0, rounds: [] };
  state.players.push(p);
  if (state.players.length === 1) state.currentPlayerIdx = 0;
  renderAll();
  save();
}

function removePlayer(idx) {
  state.players.splice(idx, 1);
  if (state.currentPlayerIdx >= state.players.length) {
    state.currentPlayerIdx = Math.max(0, state.players.length - 1);
  }
  renderAll();
  save();
}

function renamePlayer(idx, name) {
  const p = state.players[idx];
  if (p) { p.name = name.trim() || `Hráč ${idx+1}`; renderAll(); save(); }
}

function getCurrentPlayer() {
  if (state.players.length === 0) return null;
  return state.players[state.currentPlayerIdx];
}

function advancePlayer() {
  if (state.players.length <= 1) return;
  state.currentPlayerIdx = (state.currentPlayerIdx + 1) % state.players.length;
}

/* -------- Ruční kolo -------- */
let isAdding = false;

function addManualRound(playerId, score) {
  if (isAdding) return;
  isAdding = true;

  const p = state.players.find(x => x.id === playerId);
  if (!p) { isAdding = false; return; }

  const remainingToWin = state.settings.winScore - p.score;
  const isLastStretch = remainingToWin < 500;

  let validScore = 0;
  if (score === remainingToWin) {
    validScore = score; // Přesná trefa výhry
  } else if (score > remainingToWin) {
    validScore = 0; // Přehodeno (víc než zbývá)
  } else if (isLastStretch) {
    validScore = score; // Zbývá < 500, minimál 500 neplatí
  } else if (score >= state.settings.minScore) {
    validScore = score; // Běžný hod nad minimál
  } else {
    validScore = 0; // Pod minimál
  }

  const round = { score: validScore, ts: now() };
  p.rounds.push(round);
  p.score += validScore;

  state.history.unshift({ playerId: p.id, name: p.name, score: validScore, ts: now() });

  checkWinner();
  if (manualScoreInput) manualScoreInput.value = '';
  advancePlayer();
  if (manualScoreInput) manualScoreInput.focus();
  renderAll();
  save();

  setTimeout(() => { isAdding = false; }, 150);
}

function undoLast() {
  if (state.history.length === 0) return;
  const last = state.history.shift();
  const p = state.players.find(x => x.id === last.playerId);
  if (p) {
    p.rounds.pop();
    p.score -= last.score;
    if (p.score < 0) p.score = 0;
  }
  state.currentPlayerIdx = state.players.findIndex(x => x.id === last.playerId);
  if (state.currentPlayerIdx < 0) state.currentPlayerIdx = 0;
  checkWinner();
  renderAll();
  save();
}

function checkWinner() {
  state.winner = state.players.find(p => p.score >= state.settings.winScore) || null;
  if (state.winner) {
    if (winnerName) winnerName.textContent = state.winner.name;
    if (winnerScore) winnerScore.textContent = fmt(state.winner.score);
    if (winnerBanner) winnerBanner.hidden = false;
    if (manualAddBtn) manualAddBtn.disabled = true;
    if (addPlayerBtn) addPlayerBtn.disabled = true;
    if (manualScoreInput) manualScoreInput.disabled = true;
  } else {
    if (winnerBanner) winnerBanner.hidden = true;
    if (manualAddBtn) manualAddBtn.disabled = state.players.length === 0;
    if (addPlayerBtn) addPlayerBtn.disabled = false;
    if (manualScoreInput) manualScoreInput.disabled = false;
  }
}

/* -------- Render -------- */
function renderAll() {
  // Scoreboard
  const sorted = [...state.players].map((p, i) => ({...p, origIdx: state.players.indexOf(p)}))
    .sort((a,b) => b.score - a.score);

  if (scoreboardBody) {
    scoreboardBody.innerHTML = sorted.map((p, rank) => `
      <tr${p.score >= state.settings.winScore ? ' style="background:var(--good-soft)"' : ''}>
        <td class="rank">${rank+1}.</td>
        <td>
          <span class="pname${p.origIdx === state.currentPlayerIdx ? ' current' : ''}">${p.name}</span>
          <input type="text" value="${p.name}" style="display:none;">
          <button class="ghost" style="margin-left:8px; padding:2px 8px; font-size:12px;" data-remove="${p.origIdx}" title="Odebrat">Odstranit</button>
        </td>
        <td class="num">${p.rounds.length}</td>
        <td><span class="total num">${fmt(p.score)}</span></td>
        <td class="num">${p.score >= state.settings.winScore ? '0' : fmt(state.settings.winScore - p.score)}</td>
      </tr>
    `).join('');

    // Eventy na jména a odebrání
    scoreboardBody.querySelectorAll('tr').forEach((tr, rank) => {
      const p = sorted[rank];
      const nameSpan = tr.querySelector('.pname');
      const input = tr.querySelector('input');
      nameSpan.addEventListener('click', () => {
        nameSpan.style.display = 'none';
        input.style.display = 'inline-block';
        input.focus();
        input.select();
      });
      input.addEventListener('blur', () => {
        input.style.display = 'none';
        nameSpan.style.display = '';
        renamePlayer(p.origIdx, input.value);
      });
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') input.blur();
        if (e.key === 'Escape') { input.style.display = 'none'; nameSpan.style.display = ''; }
      });
      tr.querySelector('[data-remove]').addEventListener('click', () => removePlayer(p.origIdx));
    });
  }

  // Aktuální hráč
  const cp = getCurrentPlayer();
  if (currentPlayerEl) {
    currentPlayerEl.value = cp ? `Na řadě: ${cp.name}` : 'Žádní hráči';
  }
  if (manualAddBtn) manualAddBtn.disabled = state.players.length === 0 || state.winner !== null;

  checkWinner();
}

/* -------- Modal -------- */
function openSettings() {
  if (!settingsModal) return;
  if (setWin) setWin.value = state.settings.winScore;
  if (setMin) setMin.value = state.settings.minScore;
  if (confirmNote) confirmNote.hidden = (state.players.length===0 && state.history.length===0);
  settingsModal.hidden = false;
  if (setWin) setWin.focus();
}

function closeSettings() {
  if (settingsModal) settingsModal.hidden = true;
}

function saveSettings() {
  const win = clamp(+setWin.value, 1000, 100000);
  const min = clamp(+setMin.value, 0, 5000);
  const needsRestart = (win !== state.settings.winScore || min !== state.settings.minScore) &&
    (state.players.length > 0 || state.history.length > 0);

  if (needsRestart && !confirm('Restart hry vymaže veškeré skóre a historii. Pokračovat?')) return;

  state.settings.winScore = win;
  state.settings.minScore = min;

  if (needsRestart) {
    state.players = [];
    state.history = [];
    state.currentPlayerIdx = 0;
    state.winner = null;
  }
  closeSettings();
  renderAll();
  save();
}

/* -------- Klávesnice -------- */
function onKey(e) {
  // Escape v modale
  if (settingsModal && settingsModal.hidden === false) {
    if (e.key === 'Escape') closeSettings();
    return;
  }

  // Enter v poli Body -> přidat kolo
  if (e.key === 'Enter' && e.target === manualScoreInput) {
    e.preventDefault();
    const cp = getCurrentPlayer();
    if (cp) {
      const score = parseInt(manualScoreInput.value, 10) || 0;
      addManualRound(cp.id, score);
    }
    return;
  }

  // Globální zkratky: fungují vždy, KROME když editujeme libovolné textové pole
  const active = document.activeElement;
  const isEditing = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);

  if (!isEditing) {
    switch (e.key) {
      case ',':
        e.preventDefault(); openSettings();
        break;
    }
  }
}

/* -------- Inicializace -------- */
function init() {
  cacheDOM();
  load();

  if (addPlayerBtn) addPlayerBtn.onclick = () => addPlayer('');
  if (manualAddBtn) manualAddBtn.onclick = (e) => {
    e.preventDefault();
    const cp = getCurrentPlayer();
    if (cp) {
      const score = parseInt(manualScoreInput?.value, 10) || 0;
      addManualRound(cp.id, score);
    }
  };

  if (themeBtn) themeBtn.onclick = toggleTheme;
  if (settingsBtn) settingsBtn.onclick = openSettings;

  if (settingsCancel) settingsCancel.onclick = closeSettings;
  if (settingsSave) settingsSave.onclick = saveSettings;
  if (settingsModal) settingsModal.onclick = e => { if (e.target === settingsModal) closeSettings(); };

  document.addEventListener('keydown', onKey);

  if (state.players.length === 0 && state.history.length === 0) {
    setTimeout(openSettings, 300);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}