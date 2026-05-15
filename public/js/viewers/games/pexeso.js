/**
 * Pexeso (memory pairs)
 *
 * Game schema (content/games/<name>/game.json):
 *   {
 *     "title": "...",
 *     "kind": "pexeso",
 *     "gridSize": "4x4",          // "RxC", R*C must be even
 *     "pairs": ["files/...", ...] // ≥ R*C/2 image paths; extras randomly skipped
 *   }
 */

import { elements } from '../../state.js';
import { escapeHtml } from '../../utils.js';

const FLIP_BACK_DELAY_MS = 1000;

let game = null;
let cards = [];               // [{ pairId, image, state: 'down'|'up'|'matched' }]
let firstFlippedIndex = null;
let moves = 0;
let matched = 0;
let lockBoard = false;
let pendingTimer = null;

function parseGridSize(spec) {
  const m = String(spec || '4x4').match(/^(\d+)\s*[xX×]\s*(\d+)$/);
  if (!m) return { rows: 4, cols: 4 };
  return { rows: parseInt(m[1], 10), cols: parseInt(m[2], 10) };
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck(pairs, totalPairs) {
  if (!Array.isArray(pairs) || pairs.length < totalPairs) {
    throw new Error(`Pexeso needs ${totalPairs} pairs but got ${pairs?.length ?? 0}`);
  }
  const chosen = shuffle(pairs).slice(0, totalPairs);
  const deck = [];
  chosen.forEach((image, i) => {
    deck.push({ pairId: i, image, state: 'down' });
    deck.push({ pairId: i, image, state: 'down' });
  });
  return shuffle(deck);
}

function startGame() {
  const { rows, cols } = parseGridSize(game.gridSize);
  const total = rows * cols;
  if (total % 2 !== 0) {
    throw new Error(`Pexeso grid "${game.gridSize}" has odd cell count`);
  }
  cards = buildDeck(game.pairs, total / 2);
  firstFlippedIndex = null;
  moves = 0;
  matched = 0;
  lockBoard = false;
  if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null; }
  renderBoard();
}

function renderBoard() {
  const { rows, cols } = parseGridSize(game.gridSize);
  const totalPairs = cards.length / 2;

  elements.viewerContent.innerHTML = `
    <div class="pexeso-game">
      <div class="pexeso-header">
        <div class="pexeso-title">${escapeHtml(game.title || 'Pexeso')}</div>
        <div class="pexeso-stats">
          <span>Tahy: <strong id="pexeso-moves">0</strong></span>
          <span>Dvojice: <strong id="pexeso-matched">0</strong> / ${totalPairs}</span>
        </div>
        <button id="pexeso-restart" type="button" class="pexeso-btn">Restart</button>
      </div>
      <div class="pexeso-board-wrap">
        <div class="pexeso-board" id="pexeso-board"
             style="--pexeso-cols: ${cols};
                    --pexeso-rows: ${rows};
                    grid-template-columns: repeat(${cols}, 1fr);
                    grid-template-rows: repeat(${rows}, 1fr);">
          ${cards.map((c, i) => `
            <div class="pexeso-card" data-index="${i}">
              <div class="pexeso-card-inner">
                <div class="pexeso-card-face pexeso-card-back">?</div>
                <div class="pexeso-card-face pexeso-card-front">
                  <img src="/content/${c.image}" alt="" draggable="false" />
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      <div id="pexeso-overlay" class="pexeso-overlay hidden">
        <div class="pexeso-overlay-content">
          <div class="pexeso-overlay-title">Hotovo!</div>
          <div class="pexeso-overlay-stats">Tahů: <strong id="pexeso-final-moves">0</strong></div>
          <button id="pexeso-overlay-restart" type="button" class="pexeso-btn">Hrát znovu</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('pexeso-board').addEventListener('click', onBoardClick);
  document.getElementById('pexeso-restart').addEventListener('click', startGame);
  document.getElementById('pexeso-overlay-restart').addEventListener('click', startGame);
}

function onBoardClick(e) {
  if (lockBoard) return;
  const cardEl = e.target.closest('.pexeso-card');
  if (!cardEl) return;
  const index = parseInt(cardEl.dataset.index, 10);
  const card = cards[index];

  if (card.state !== 'down') return;
  if (firstFlippedIndex === index) return;

  flipCard(index, true);

  if (firstFlippedIndex == null) {
    firstFlippedIndex = index;
    return;
  }

  const a = firstFlippedIndex;
  const b = index;
  firstFlippedIndex = null;
  moves++;
  updateStats();

  if (cards[a].pairId === cards[b].pairId) {
    cards[a].state = 'matched';
    cards[b].state = 'matched';
    markMatched(a);
    markMatched(b);
    matched++;
    updateStats();
    if (matched === cards.length / 2) showWinOverlay();
  } else {
    lockBoard = true;
    pendingTimer = setTimeout(() => {
      flipCard(a, false);
      flipCard(b, false);
      lockBoard = false;
      pendingTimer = null;
    }, FLIP_BACK_DELAY_MS);
  }
}

function flipCard(index, up) {
  cards[index].state = up ? 'up' : 'down';
  const el = document.querySelector(`.pexeso-card[data-index="${index}"]`);
  if (el) el.classList.toggle('flipped', up);
}

function markMatched(index) {
  const el = document.querySelector(`.pexeso-card[data-index="${index}"]`);
  if (el) el.classList.add('matched');
}

function updateStats() {
  const m = document.getElementById('pexeso-moves');
  const ma = document.getElementById('pexeso-matched');
  if (m) m.textContent = moves;
  if (ma) ma.textContent = matched;
}

function showWinOverlay() {
  const o = document.getElementById('pexeso-overlay');
  if (!o) return;
  document.getElementById('pexeso-final-moves').textContent = moves;
  o.classList.remove('hidden');
}

export function renderPexeso(g) {
  game = g;
  try {
    startGame();
  } catch (err) {
    console.error(err);
    elements.viewerContent.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">❌</div>
        <div>${escapeHtml(err.message)}</div>
      </div>
    `;
  }
}

export function destroyPexeso() {
  if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null; }
  cards = [];
  firstFlippedIndex = null;
  moves = 0;
  matched = 0;
  lockBoard = false;
  game = null;
}
