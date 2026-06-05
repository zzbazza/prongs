/**
 * Game Viewer – dispatcher
 *
 * Loads game.json from content/games/<path>/ and dispatches by `kind`
 * to the matching game module under ./games/.
 */

import { elements } from '../state.js';
import { renderPexeso, destroyPexeso } from './games/pexeso.js';
import { renderPuzzle, destroyPuzzle } from './games/puzzle.js';
import { renderSeek, destroySeek } from './games/seek.js';

const GAMES_PATH = 'games';
let currentKind = null;

export async function renderGameViewer(item) {
  destroyGameViewer();

  elements.viewerContent.innerHTML = `
    <div class="empty-state">
      <div class="loading-spinner"></div>
      <div>Načítání hry…</div>
    </div>
  `;

  try {
    const res = await fetch(`/content/${GAMES_PATH}/${item.path}/game.json`);
    if (!res.ok) throw new Error(`Cannot load game.json for "${item.path}"`);
    const game = await res.json();

    currentKind = game.kind;
    switch (game.kind) {
      case 'pexeso':
        renderPexeso(game);
        break;
      case 'puzzle':
        renderPuzzle(game);
        break;
      case 'seek':
        renderSeek(game, item.path);
        break;
      default:
        throw new Error(`Unknown game kind: ${game.kind}`);
    }
  } catch (err) {
    console.error('Game load error:', err);
    elements.viewerContent.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">❌</div>
        <div>Chyba při načítání hry</div>
      </div>
    `;
  }
}

export function destroyGameViewer() {
  if (currentKind === 'pexeso') destroyPexeso();
  if (currentKind === 'puzzle') destroyPuzzle();
  if (currentKind === 'seek') destroySeek();
  currentKind = null;
}
