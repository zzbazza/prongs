/**
 * Virtual Exhibition Viewer
 */

import { state, elements } from '../state.js';
import { escapeHtml } from '../utils.js';

const EXHIBITIONS_PATH = 'exhibitions';

let exhibition = null;   // { title, description, steps[] }
let basePath = '';       // config base: exhibitions/<name>/
let currentStepIndex = 0;
let currentImageIndex = 0;
let stepStartTime = null;
let animFrameId = null;
let tracks = [];         // [{ el, config: { path, start, volume, volumeChanges } }]
let paused = false;
let pausedElapsed = 0;
let currentImageObj = null;
let resizeHandler = null;

// --- Load ---

async function loadExhibition(item) {
  basePath = `${EXHIBITIONS_PATH}/${item.path}/`;

  const mainRes = await fetch(`/content/${basePath}exhibition.json`);
  if (!mainRes.ok) throw new Error(`Cannot load exhibition.json for "${item.path}"`);
  const mainConfig = await mainRes.json();

  const steps = await Promise.all(
    mainConfig.steps.map(async (stepFile) => {
      const res = await fetch(`/content/${basePath}${stepFile}`);
      if (!res.ok) throw new Error(`Cannot load step "${stepFile}"`);
      return res.json();
    })
  );

  exhibition = { ...mainConfig, steps };
}

// --- Render shell ---

function renderLayout() {
  elements.viewerContent.innerHTML = `
    <div class="exhibition-viewer">
      <div class="exhibition-image-area">
        <img id="exh-image" class="exhibition-image" src="" alt="" />
        <div id="exh-note-overlay" class="exhibition-note-overlay"></div>
      </div>
      <div class="exhibition-footer">
        <div class="exhibition-step-title" id="exh-step-title"></div>
        <div class="exhibition-progress-bar">
          <div class="exhibition-progress-fill" id="exh-progress-fill"></div>
          <div class="exhibition-progress-markers" id="exh-progress-markers"></div>
          <span class="exhibition-progress-time" id="exh-progress-time"></span>
        </div>
        <div class="exhibition-nav">
          <button id="exh-prev" class="exh-nav-btn">‹ Předchozí</button>
          <div class="exhibition-center-controls">
            <button id="exh-pause" class="exh-pause-btn" aria-label="Pauza">⏸</button>
            <span class="exhibition-step-counter" id="exh-step-counter"></span>
          </div>
          <button id="exh-next" class="exh-nav-btn">Další ›</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('exh-prev').addEventListener('click', prevStep);
  document.getElementById('exh-next').addEventListener('click', nextStep);
  document.getElementById('exh-pause').addEventListener('click', togglePause);

  const bar = elements.viewerContent.querySelector('.exhibition-progress-bar');
  bar.addEventListener('click', (e) => {
    const rect = bar.getBoundingClientRect();
    const fraction = (e.clientX - rect.left) / rect.width;
    seekStep(fraction);
  });

  const overlay = document.getElementById('exh-note-overlay');
  overlay.addEventListener('click', onOverlayClick);

  resizeHandler = () => positionNoteOverlay();
  window.addEventListener('resize', resizeHandler);

  if (state.editMode) renderEditorPanel();
}

// --- Step playback ---

function stepDuration(step) {
  return step.images.reduce((sum, img) => sum + img.duration, 0);
}

function startStep(index) {
  stopTick();
  stopAllTracks();

  currentStepIndex = index;
  currentImageIndex = 0;

  const step = exhibition.steps[index];
  const total = stepDuration(step);

  document.getElementById('exh-step-title').textContent = step.title || '';
  document.getElementById('exh-step-counter').textContent =
    `${index + 1} / ${exhibition.steps.length}`;
  document.getElementById('exh-prev').disabled = index === 0;
  document.getElementById('exh-next').disabled = index === exhibition.steps.length - 1;
  document.getElementById('exh-progress-fill').style.width = '0%';
  document.getElementById('exh-progress-time').textContent = `0 / ${total}s`;
  renderMarkers(step, total);

  setImage(step.images[0]);

  loadTracks(step);

  stepStartTime = performance.now();
  paused = false;
  updatePauseButton();
  refreshEditorJSON();
  animFrameId = requestAnimationFrame(tick);
}

function tick(now) {
  const fill = document.getElementById('exh-progress-fill');
  if (!fill) return; // viewer closed

  const step = exhibition.steps[currentStepIndex];
  const total = stepDuration(step);
  const elapsed = (now - stepStartTime) / 1000;
  const progress = Math.min(elapsed / total, 1);

  fill.style.width = `${progress * 100}%`;
  document.getElementById('exh-progress-time').textContent =
    `${Math.min(Math.floor(elapsed), total)} / ${total}s`;

  let imgIndex = step.images.length - 1;
  let accum = 0;
  for (let i = 0; i < step.images.length; i++) {
    accum += step.images[i].duration;
    if (elapsed < accum) { imgIndex = i; break; }
  }
  if (imgIndex !== currentImageIndex) {
    currentImageIndex = imgIndex;
    setImage(step.images[imgIndex]);
  }

  tickTracks(elapsed);

  if (progress < 1) {
    animFrameId = requestAnimationFrame(tick);
  } else {
    animFrameId = null;
    if (currentStepIndex < exhibition.steps.length - 1) {
      startStep(currentStepIndex + 1);
    }
  }
}

function seekStep(fraction) {
  if (!exhibition) return;
  const step = exhibition.steps[currentStepIndex];
  const total = stepDuration(step);
  const clamped = Math.max(0, Math.min(fraction, 1));
  const elapsed = clamped * total;

  stepStartTime = performance.now() - elapsed * 1000;

  syncTracksOnSeek(elapsed);

  if (paused) {
    pausedElapsed = elapsed;
    renderFrameAt(elapsed);
  } else if (!animFrameId) {
    animFrameId = requestAnimationFrame(tick);
  }
}

function togglePause() {
  if (!exhibition) return;
  if (paused) {
    stepStartTime = performance.now() - pausedElapsed * 1000;
    paused = false;
    resumeAllTracks(pausedElapsed);
    if (!animFrameId) animFrameId = requestAnimationFrame(tick);
  } else {
    pausedElapsed = (performance.now() - stepStartTime) / 1000;
    paused = true;
    stopTick();
    pauseAllTracks();
  }
  updatePauseButton();
}

function updatePauseButton() {
  const btn = document.getElementById('exh-pause');
  if (!btn) return;
  btn.textContent = paused ? '▶' : '⏸';
  btn.setAttribute('aria-label', paused ? 'Přehrát' : 'Pauza');
}

function renderFrameAt(elapsed) {
  const step = exhibition.steps[currentStepIndex];
  const total = stepDuration(step);
  const progress = Math.min(elapsed / total, 1);
  const fill = document.getElementById('exh-progress-fill');
  if (fill) fill.style.width = `${progress * 100}%`;
  const time = document.getElementById('exh-progress-time');
  if (time) time.textContent = `${Math.min(Math.floor(elapsed), total)} / ${total}s`;

  let imgIndex = step.images.length - 1;
  let accum = 0;
  for (let i = 0; i < step.images.length; i++) {
    accum += step.images[i].duration;
    if (elapsed < accum) { imgIndex = i; break; }
  }
  if (imgIndex !== currentImageIndex) {
    currentImageIndex = imgIndex;
    setImage(step.images[imgIndex]);
  }
}

function renderMarkers(step, total) {
  const container = document.getElementById('exh-progress-markers');
  if (!container) return;
  let accum = 0;
  const marks = [];
  for (let i = 0; i < step.images.length - 1; i++) {
    accum += step.images[i].duration;
    const pct = (accum / total) * 100;
    marks.push(`<span class="exhibition-progress-marker" style="left: ${pct}%"></span>`);
  }
  container.innerHTML = marks.join('');
}

function setImage(image) {
  currentImageObj = image;
  const img = document.getElementById('exh-image');
  if (!img) return;
  img.onload = () => {
    positionNoteOverlay();
    renderNotes(image.notes || []);
  };
  img.src = resolveMediaPath(image.path);
  // Hide existing notes immediately while new image loads
  const overlay = document.getElementById('exh-note-overlay');
  if (overlay) overlay.innerHTML = '';
}

// Media paths are always absolute relative to content/. A leading slash
// is stripped to keep the URL well-formed.
function resolveMediaPath(p) {
  return `/content/${p.replace(/^\/+/, '')}`;
}

// --- Notes overlay ---

function positionNoteOverlay() {
  const img = document.getElementById('exh-image');
  const overlay = document.getElementById('exh-note-overlay');
  if (!img || !overlay) return;
  const area = img.parentElement;
  const cw = area.clientWidth, ch = area.clientHeight;
  const iw = img.naturalWidth, ih = img.naturalHeight;
  if (!iw || !ih) return;
  const ratio = Math.min(cw / iw, ch / ih);
  const w = iw * ratio, h = ih * ratio;
  overlay.style.left = `${(cw - w) / 2}px`;
  overlay.style.top = `${(ch - h) / 2}px`;
  overlay.style.width = `${w}px`;
  overlay.style.height = `${h}px`;
}

function renderNotes(notes) {
  const overlay = document.getElementById('exh-note-overlay');
  if (!overlay) return;
  overlay.classList.toggle('edit-mode', state.editMode);
  overlay.innerHTML = notes.map((n, i) => `
    <div class="exh-note-marker" data-index="${i}" style="left: ${n.x * 100}%; top: ${n.y * 100}%">
      <button type="button" class="exh-note-icon" aria-label="Otevřít poznámku">?</button>
      <div class="exh-note-bubble">
        <div class="exh-note-text">${escapeHtml(n.text)}</div>
        ${state.editMode ? `
          <div class="exh-note-edit-actions">
            <button type="button" class="exh-note-edit-btn" data-action="edit">Upravit</button>
            <button type="button" class="exh-note-edit-btn" data-action="delete">Smazat</button>
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');
}

function onOverlayClick(e) {
  const overlay = e.currentTarget;
  const marker = e.target.closest('.exh-note-marker');

  if (marker) {
    const idx = parseInt(marker.dataset.index, 10);
    const action = e.target.dataset.action;

    if (state.editMode && action === 'edit') {
      const newText = prompt('Text poznámky:', currentImageObj.notes[idx].text);
      if (newText != null) {
        currentImageObj.notes[idx].text = newText;
        renderNotes(currentImageObj.notes);
        refreshEditorJSON();
      }
      return;
    }
    if (state.editMode && action === 'delete') {
      currentImageObj.notes.splice(idx, 1);
      if (currentImageObj.notes.length === 0) delete currentImageObj.notes;
      renderNotes(currentImageObj.notes || []);
      refreshEditorJSON();
      return;
    }

    if (e.target.closest('.exh-note-icon')) {
      marker.classList.toggle('open');
    }
    return;
  }

  if (state.editMode && e.target === overlay) {
    const rect = overlay.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const text = prompt('Text poznámky:');
    if (!text) return;
    if (!currentImageObj.notes) currentImageObj.notes = [];
    currentImageObj.notes.push({ x: +x.toFixed(4), y: +y.toFixed(4), text });
    renderNotes(currentImageObj.notes);
    refreshEditorJSON();
  }
}

// --- Editor panel (edit mode only) ---

function renderEditorPanel() {
  const root = elements.viewerContent.querySelector('.exhibition-viewer');
  if (!root || document.getElementById('exh-editor')) return;
  const div = document.createElement('div');
  div.id = 'exh-editor';
  div.className = 'exhibition-editor';
  div.innerHTML = `
    <button id="exh-editor-toggle" type="button" class="exh-editor-toggle">JSON</button>
    <div id="exh-editor-panel" class="exh-editor-panel hidden">
      <div class="exh-editor-header">JSON aktuálního kroku</div>
      <textarea id="exh-editor-json" readonly spellcheck="false"></textarea>
      <button id="exh-editor-copy" type="button" class="exh-editor-btn">Kopírovat</button>
    </div>
  `;
  root.appendChild(div);
  document.getElementById('exh-editor-toggle').addEventListener('click', () => {
    document.getElementById('exh-editor-panel').classList.toggle('hidden');
    refreshEditorJSON();
  });
  document.getElementById('exh-editor-copy').addEventListener('click', async () => {
    const ta = document.getElementById('exh-editor-json');
    try {
      await navigator.clipboard.writeText(ta.value);
    } catch (_) {
      ta.select();
      document.execCommand('copy');
    }
  });
}

function refreshEditorJSON() {
  const ta = document.getElementById('exh-editor-json');
  if (!ta || !exhibition) return;
  ta.value = JSON.stringify(exhibition.steps[currentStepIndex], null, 2);
}

function prevStep() {
  if (currentStepIndex > 0) startStep(currentStepIndex - 1);
}

function nextStep() {
  if (currentStepIndex < exhibition.steps.length - 1) {
    startStep(currentStepIndex + 1);
  }
}

// --- Audio tracks ---
//
// step.audio can be:
//   - undefined / null         → no audio
//   - "filename.mp3"           → single track at start=0, volume=1
//   - [ { path, start?, volume?, volumeChanges? }, ... ]
//
// All times are seconds since the step started. `volumeChanges` must be
// sorted ascending by `time`. Each entry can be either:
//   - { time, volume }                                 → instant snap to volume
//   - { time, endVolume, duration?, startVolume? }     → linear ramp from
//       startVolume (default = current volume) to endVolume over `duration`
//       seconds starting at `time`. duration of 0 (or omitted) snaps.

function loadTracks(step) {
  if (!step.audio) return;
  const list = Array.isArray(step.audio)
    ? step.audio
    : [{ path: step.audio, start: 0, volume: 1 }];

  tracks = list.map(cfg => {
    const el = new Audio(resolveMediaPath(cfg.path));
    el.preload = 'auto';
    el.volume = effectiveVolume(cfg, 0);
    return { el, config: cfg };
  });
}

function effectiveVolume(cfg, elapsed) {
  let vol = cfg.volume ?? 1;
  if (Array.isArray(cfg.volumeChanges)) {
    for (const ch of cfg.volumeChanges) {
      if (ch.time > elapsed) break;
      const target = ch.endVolume ?? ch.volume ?? 0;
      const start = ch.startVolume ?? vol;
      const duration = ch.duration ?? 0;
      if (duration > 0 && elapsed < ch.time + duration) {
        const t = (elapsed - ch.time) / duration;
        vol = start + (target - start) * t;
      } else {
        vol = target;
      }
    }
  }
  return Math.max(0, Math.min(1, vol));
}

function tickTracks(elapsed) {
  for (const t of tracks) {
    const start = t.config.start ?? 0;
    t.el.volume = effectiveVolume(t.config, elapsed);

    if (elapsed >= start && t.el.paused && !paused) {
      const trackTime = elapsed - start;
      if (Math.abs(t.el.currentTime - trackTime) > 0.3) {
        try { t.el.currentTime = trackTime; } catch (_) {}
      }
      t.el.play().catch(() => {});
    }
  }
}

function syncTracksOnSeek(elapsed) {
  for (const t of tracks) {
    const start = t.config.start ?? 0;
    if (elapsed < start) {
      t.el.pause();
      try { t.el.currentTime = 0; } catch (_) {}
    } else {
      try { t.el.currentTime = elapsed - start; } catch (_) {}
      if (paused) t.el.pause();
      else t.el.play().catch(() => {});
    }
    t.el.volume = effectiveVolume(t.config, elapsed);
  }
}

function pauseAllTracks() {
  for (const t of tracks) t.el.pause();
}

function resumeAllTracks(elapsed) {
  for (const t of tracks) {
    const start = t.config.start ?? 0;
    if (elapsed >= start) {
      try { t.el.currentTime = elapsed - start; } catch (_) {}
      t.el.play().catch(() => {});
    }
    t.el.volume = effectiveVolume(t.config, elapsed);
  }
}

function stopAllTracks() {
  for (const t of tracks) {
    t.el.pause();
    t.el.src = '';
  }
  tracks = [];
}

// --- Cleanup ---

function stopTick() {
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
}

export function destroyExhibitionViewer() {
  stopTick();
  stopAllTracks();
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
    resizeHandler = null;
  }
  exhibition = null;
  currentImageObj = null;
}

// --- Entry point ---

export async function renderExhibitionViewer(item) {
  destroyExhibitionViewer();

  elements.viewerContent.innerHTML = `
    <div class="empty-state">
      <div class="loading-spinner"></div>
      <div>Načítání expozice…</div>
    </div>
  `;

  try {
    await loadExhibition(item);
    renderLayout();
    startStep(0);
  } catch (err) {
    console.error('Exhibition load error:', err);
    elements.viewerContent.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">❌</div>
        <div>Chyba při načítání expozice</div>
      </div>
    `;
  }
}
