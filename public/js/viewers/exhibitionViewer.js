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
let imageStartInStep = 0; // cumulative duration of images before current one
let stepStartTime = null;
let animFrameId = null;
let tracks = [];         // step-scoped tracks
let globalTracks = [];   // exhibition-scoped tracks (continuous across steps)
let paused = false;
let pausedElapsed = 0;
let currentImageObj = null;
let resizeHandler = null;
let currentEditTool = 'note';   // 'note' | 'rectangle' | 'arrow'
let dragState = null;            // { tool, startX, startY, currX, currY, previewEl }

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
        <div id="exh-text-content" class="exhibition-text-content hidden"></div>
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
            <span class="exhibition-time-info" id="exh-time-info"></span>
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
  overlay.addEventListener('pointerdown', onOverlayPointerDown);
  overlay.addEventListener('pointermove', onOverlayPointerMove);
  overlay.addEventListener('pointerup', onOverlayPointerUp);
  overlay.addEventListener('pointercancel', onOverlayPointerUp);

  resizeHandler = () => positionNoteOverlay();
  window.addEventListener('resize', resizeHandler);

  if (state.editMode) renderEditorPanel();
}

// --- Step playback ---

function isTextStep(step) {
  return step && step.type === 'text';
}

function stepDuration(step) {
  if (isTextStep(step)) return Number(step.duration) || 0;
  return (step.images || []).reduce((sum, img) => sum + img.duration, 0);
}

function showTextStep(step) {
  const textEl = document.getElementById('exh-text-content');
  const imgEl = document.getElementById('exh-image');
  const overlay = document.getElementById('exh-note-overlay');
  if (imgEl) imgEl.style.display = 'none';
  if (overlay) overlay.style.display = 'none';
  if (!textEl) return;
  textEl.classList.remove('hidden');
  const heading = step.title ? `<div class="exhibition-text-heading">${escapeHtml(step.title)}</div>` : '';
  const body = step.text
    ? `<div class="exhibition-text-body">${escapeHtml(step.text)}</div>`
    : '';
  textEl.innerHTML = heading + body;
}

function hideTextStep() {
  const textEl = document.getElementById('exh-text-content');
  const imgEl = document.getElementById('exh-image');
  const overlay = document.getElementById('exh-note-overlay');
  if (textEl) { textEl.classList.add('hidden'); textEl.innerHTML = ''; }
  if (imgEl) imgEl.style.display = '';
  if (overlay) overlay.style.display = '';
}

function exhibitionTotalDuration() {
  return exhibition.steps.reduce((sum, st) => sum + stepDuration(st), 0);
}

function priorStepsDuration() {
  let sum = 0;
  for (let i = 0; i < currentStepIndex; i++) sum += stepDuration(exhibition.steps[i]);
  return sum;
}

function formatMMSS(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

function updateTimeInfo(stepElapsed, stepTotal) {
  const el = document.getElementById('exh-time-info');
  if (!el) return;
  const total = exhibitionTotalDuration();
  const overall = priorStepsDuration() + stepElapsed;
  el.textContent =
    `Krok ${formatMMSS(Math.min(stepElapsed, stepTotal))} / ${formatMMSS(stepTotal)}` +
    `  ·  Celkem ${formatMMSS(Math.min(overall, total))} / ${formatMMSS(total)}`;
}

function startStep(index) {
  stopTick();
  stopAllTracks();

  currentStepIndex = index;
  currentImageIndex = 0;
  imageStartInStep = 0;

  const step = exhibition.steps[index];
  const total = stepDuration(step);

  document.getElementById('exh-step-title').textContent = step.title || '';
  document.getElementById('exh-step-counter').textContent =
    `${index + 1} / ${exhibition.steps.length}`;
  document.getElementById('exh-prev').disabled = index === 0;
  document.getElementById('exh-next').disabled = index === exhibition.steps.length - 1;
  document.getElementById('exh-progress-fill').style.width = '0%';
  document.getElementById('exh-progress-time').textContent = `0 / ${total}s`;
  updateTimeInfo(0, total);

  if (isTextStep(step)) {
    showTextStep(step);
    renderMarkers(null, 0);
  } else {
    hideTextStep();
    setImage(step.images[0]);
    renderMarkers(step, total);
  }

  loadTracks(step);

  stepStartTime = performance.now();
  paused = false;
  updatePauseButton();
  refreshEditorJSON();
  syncGlobalTracksOnSeek(priorStepsDuration());
  animFrameId = requestAnimationFrame(tick);
}

function tick(now) {
  const fill = document.getElementById('exh-progress-fill');
  if (!fill) return; // viewer closed

  const step = exhibition.steps[currentStepIndex];
  const total = stepDuration(step);
  const elapsed = (now - stepStartTime) / 1000;
  const progress = total > 0 ? Math.min(elapsed / total, 1) : 1;

  fill.style.width = `${progress * 100}%`;
  document.getElementById('exh-progress-time').textContent =
    `${Math.min(Math.floor(elapsed), total)} / ${total}s`;
  updateTimeInfo(elapsed, total);

  if (!isTextStep(step)) {
    let imgIndex = step.images.length - 1;
    let imgStart = 0;
    let accum = 0;
    for (let i = 0; i < step.images.length; i++) {
      if (elapsed < accum + step.images[i].duration) {
        imgIndex = i;
        imgStart = accum;
        break;
      }
      accum += step.images[i].duration;
      imgStart = accum;
    }
    if (imgIndex !== currentImageIndex) {
      currentImageIndex = imgIndex;
      imageStartInStep = imgStart;
      setImage(step.images[imgIndex]);
    }
    updateAnnotationVisibility(elapsed - imageStartInStep);
  }

  tickTracks(elapsed);
  if (globalTracks.length > 0) {
    tickGlobalTracks(priorStepsDuration() + elapsed);
  }

  if (progress < 1) {
    animFrameId = requestAnimationFrame(tick);
  } else {
    animFrameId = null;
    if (currentStepIndex < exhibition.steps.length - 1) {
      startStep(currentStepIndex + 1);
    } else if (globalTracks.length > 0 && !paused) {
      // Last step ended but global audio continues — keep ticking for envelopes.
      animFrameId = requestAnimationFrame(tick);
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
  syncGlobalTracksOnSeek(priorStepsDuration() + elapsed);

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
    resumeGlobalTracks(priorStepsDuration() + pausedElapsed);
    if (!animFrameId) animFrameId = requestAnimationFrame(tick);
  } else {
    pausedElapsed = (performance.now() - stepStartTime) / 1000;
    paused = true;
    stopTick();
    pauseAllTracks();
    pauseGlobalTracks();
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
  updateTimeInfo(elapsed, total);

  if (!isTextStep(step)) {
    let imgIndex = step.images.length - 1;
    let imgStart = 0;
    let accum = 0;
    for (let i = 0; i < step.images.length; i++) {
      if (elapsed < accum + step.images[i].duration) {
        imgIndex = i;
        imgStart = accum;
        break;
      }
      accum += step.images[i].duration;
      imgStart = accum;
    }
    if (imgIndex !== currentImageIndex) {
      currentImageIndex = imgIndex;
      imageStartInStep = imgStart;
      setImage(step.images[imgIndex]);
    }
    updateAnnotationVisibility(elapsed - imageStartInStep);
  }
}

function renderMarkers(step, total) {
  const container = document.getElementById('exh-progress-markers');
  if (!container) return;
  if (!step || !step.images || total <= 0) {
    container.innerHTML = '';
    return;
  }
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
  overlay.innerHTML = notes.map((n, i) => renderAnnotation(n, i)).join('');
  // Initial visibility based on time = 0 (image just appeared).
  updateAnnotationVisibility(0);
}

function sanitizeColor(v) {
  if (typeof v !== 'string') return null;
  // Allow letters, digits, #, %, ., ,, (, ), -, and spaces. Reject anything else
  // to prevent CSS escape into other declarations.
  if (!/^[\w#%.,()\s-]+$/.test(v.trim())) return null;
  return v.trim();
}

function renderAnnotation(n, i) {
  const type = n.type || 'note';
  const timing = `data-appear="${n.appearTime ?? 0}" data-duration="${n.duration ?? -1}" ` +
                 `data-fade-in="${n.fadeIn ?? 0}" data-fade-out="${n.fadeOut ?? 0}"`;
  const color = sanitizeColor(n.color);

  if (type === 'rectangle') {
    const styles = [
      `left: ${n.x * 100}%`,
      `top: ${n.y * 100}%`,
      `width: ${n.width * 100}%`,
      `height: ${n.height * 100}%`
    ];
    if (color) styles.push(`--exh-annot-color: ${color}`);
    if (typeof n.borderSize === 'number') styles.push(`--exh-annot-border: ${n.borderSize}px`);
    return `<div class="exh-note-shape exh-note-rect"
                 data-index="${i}" ${timing}
                 style="${styles.join('; ')}"></div>`;
  }

  if (type === 'image') {
    const styles = [
      `left: ${n.x * 100}%`,
      `top: ${n.y * 100}%`,
      `width: ${n.width * 100}%`,
      `height: ${n.height * 100}%`
    ];
    if (color) styles.push(`--exh-annot-color: ${color}`);
    if (typeof n.borderSize === 'number') styles.push(`--exh-annot-border: ${n.borderSize}px`);
    const src = escapeHtml(resolveMediaPath(n.src || ''));
    return `<div class="exh-note-shape exh-note-image"
                 data-index="${i}" ${timing}
                 style="${styles.join('; ')}">
      <img src="${src}" alt="" draggable="false"/>
    </div>`;
  }

  if (type === 'person') {
    const styles = [
      `left: ${n.x * 100}%`,
      `top: ${n.y * 100}%`,
      `width: ${n.width * 100}%`,
      `height: ${n.height * 100}%`
    ];
    if (color) styles.push(`--exh-annot-color: ${color}`);
    if (typeof n.borderSize === 'number') styles.push(`--exh-annot-border: ${n.borderSize}px`);
    const classes = ['exh-note-shape', 'exh-note-person'];
    if (n.showName === true) classes.push('show-name');
    return `<div class="${classes.join(' ')}"
                 data-index="${i}" ${timing}
                 style="${styles.join('; ')}">
      <span class="exh-note-person-label">${escapeHtml(n.name || '')}</span>
    </div>`;
  }

  if (type === 'arrow') {
    const strokeWidth = typeof n.width === 'number' ? n.width : 1.2;
    const svgStyle = color ? ` style="color: ${color}"` : '';
    return `<svg class="exh-note-shape exh-note-arrow"
                 data-index="${i}" ${timing}
                 viewBox="0 0 100 100" preserveAspectRatio="none"${svgStyle}>
      <defs>
        <marker id="arr-${i}" viewBox="0 0 10 10" refX="8" refY="5"
                markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"/>
        </marker>
      </defs>
      <line x1="${n.x1 * 100}" y1="${n.y1 * 100}"
            x2="${n.x2 * 100}" y2="${n.y2 * 100}"
            stroke="currentColor" stroke-width="${strokeWidth}"
            marker-end="url(#arr-${i})"
            vector-effect="non-scaling-stroke" stroke-linecap="round"/>
    </svg>`;
  }

  // Default: "note" (the original ? pin)
  const markerStyle = [`left: ${n.x * 100}%`, `top: ${n.y * 100}%`];
  if (color) markerStyle.push(`--exh-annot-color: ${color}`);
  const openClass = n.open === true ? ' open' : '';
  return `
    <div class="exh-note-marker exh-note-shape${openClass}"
         data-index="${i}" ${timing}
         style="${markerStyle.join('; ')}">
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
  `;
}

function computeAnnotationOpacity(appear, duration, fadeIn, fadeOut, t) {
  if (t < appear) return 0;
  if (duration >= 0 && t >= appear + duration) return 0;
  let op = 1;
  if (fadeIn > 0 && t < appear + fadeIn) {
    op = Math.min(op, (t - appear) / fadeIn);
  }
  if (fadeOut > 0 && duration >= 0) {
    const fadeStart = appear + duration - fadeOut;
    if (t >= fadeStart) op = Math.min(op, (appear + duration - t) / fadeOut);
  }
  return Math.max(0, Math.min(1, op));
}

function updateAnnotationVisibility(imageElapsed) {
  const overlay = document.getElementById('exh-note-overlay');
  if (!overlay) return;
  const shapes = overlay.querySelectorAll('.exh-note-shape');
  for (const el of shapes) {
    const appear = parseFloat(el.dataset.appear) || 0;
    const dur = parseFloat(el.dataset.duration);
    const fadeIn = parseFloat(el.dataset.fadeIn) || 0;
    const fadeOut = parseFloat(el.dataset.fadeOut) || 0;
    const hasDur = !isNaN(dur) && dur >= 0;
    const op = computeAnnotationOpacity(appear, hasDur ? dur : -1, fadeIn, fadeOut, imageElapsed);
    el.style.opacity = op;
    // display:none when fully transparent so clicks pass through and notes can't open.
    el.style.display = op > 0 ? '' : 'none';
  }
}

function onOverlayClick(e) {
  const overlay = e.currentTarget;

  const personEl = e.target.closest('.exh-note-person');
  if (personEl) {
    personEl.classList.toggle('open');
    return;
  }

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

  if (state.editMode && e.target === overlay && currentEditTool === 'note') {
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

// --- Drag-to-create for rectangles and arrows (edit mode) ---

function onOverlayPointerDown(e) {
  if (!state.editMode) return;
  if (currentEditTool === 'note') return;
  if (e.target.closest('.exh-note-marker, .exh-note-shape')) return;

  const overlay = document.getElementById('exh-note-overlay');
  if (!overlay) return;

  const rect = overlay.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;

  const previewEl = createDragPreview(currentEditTool);
  overlay.appendChild(previewEl);

  dragState = {
    tool: currentEditTool,
    startX: x, startY: y,
    currX: x, currY: y,
    previewEl
  };
  updateDragPreview();

  try { overlay.setPointerCapture(e.pointerId); } catch (_) {}
  e.preventDefault();
}

function onOverlayPointerMove(e) {
  if (!dragState) return;
  const overlay = document.getElementById('exh-note-overlay');
  if (!overlay) return;
  const rect = overlay.getBoundingClientRect();
  let x = (e.clientX - rect.left) / rect.width;
  let y = (e.clientY - rect.top) / rect.height;
  x = Math.max(0, Math.min(1, x));
  y = Math.max(0, Math.min(1, y));
  dragState.currX = x;
  dragState.currY = y;
  updateDragPreview();
}

function onOverlayPointerUp(e) {
  if (!dragState) return;
  const { tool, startX, startY, currX, currY, previewEl } = dragState;
  if (previewEl && previewEl.parentNode) previewEl.parentNode.removeChild(previewEl);
  dragState = null;

  // Min drag distance to avoid creating a shape on accidental click.
  const dx = currX - startX, dy = currY - startY;
  if (Math.sqrt(dx * dx + dy * dy) < 0.02 || !currentImageObj) return;

  if (!currentImageObj.notes) currentImageObj.notes = [];
  if (tool === 'rectangle') {
    const left = Math.min(startX, currX);
    const top = Math.min(startY, currY);
    currentImageObj.notes.push({
      type: 'rectangle',
      x: +left.toFixed(4),
      y: +top.toFixed(4),
      width: +Math.abs(currX - startX).toFixed(4),
      height: +Math.abs(currY - startY).toFixed(4)
    });
  } else if (tool === 'image') {
    const src = prompt('Cesta k obrázku (např. files/.../detail.jpg):');
    if (!src) return;
    const left = Math.min(startX, currX);
    const top = Math.min(startY, currY);
    currentImageObj.notes.push({
      type: 'image',
      src: src.trim(),
      x: +left.toFixed(4),
      y: +top.toFixed(4),
      width: +Math.abs(currX - startX).toFixed(4),
      height: +Math.abs(currY - startY).toFixed(4)
    });
  } else if (tool === 'person') {
    const name = prompt('Jméno osoby:');
    if (!name) return;
    const left = Math.min(startX, currX);
    const top = Math.min(startY, currY);
    currentImageObj.notes.push({
      type: 'person',
      name: name.trim(),
      x: +left.toFixed(4),
      y: +top.toFixed(4),
      width: +Math.abs(currX - startX).toFixed(4),
      height: +Math.abs(currY - startY).toFixed(4)
    });
  } else if (tool === 'arrow') {
    currentImageObj.notes.push({
      type: 'arrow',
      x1: +startX.toFixed(4),
      y1: +startY.toFixed(4),
      x2: +currX.toFixed(4),
      y2: +currY.toFixed(4)
    });
  }
  renderNotes(currentImageObj.notes);
  refreshEditorJSON();
}

function createDragPreview(tool) {
  if (tool === 'rectangle') {
    const el = document.createElement('div');
    el.className = 'exh-note-rect exh-note-preview';
    return el;
  }
  if (tool === 'image') {
    const el = document.createElement('div');
    el.className = 'exh-note-image exh-note-preview';
    return el;
  }
  if (tool === 'person') {
    const el = document.createElement('div');
    el.className = 'exh-note-person exh-note-preview';
    return el;
  }
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'exh-note-arrow exh-note-preview');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.innerHTML = `
    <defs>
      <marker id="arr-preview" viewBox="0 0 10 10" refX="8" refY="5"
              markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"/>
      </marker>
    </defs>
    <line stroke="currentColor" stroke-width="1.2" marker-end="url(#arr-preview)"
          vector-effect="non-scaling-stroke" stroke-linecap="round"/>
  `;
  return svg;
}

function updateDragPreview() {
  if (!dragState || !dragState.previewEl) return;
  const { tool, startX, startY, currX, currY, previewEl } = dragState;
  if (tool === 'rectangle' || tool === 'image' || tool === 'person') {
    const left = Math.min(startX, currX);
    const top = Math.min(startY, currY);
    const w = Math.abs(currX - startX);
    const h = Math.abs(currY - startY);
    previewEl.style.left = `${left * 100}%`;
    previewEl.style.top = `${top * 100}%`;
    previewEl.style.width = `${w * 100}%`;
    previewEl.style.height = `${h * 100}%`;
  } else if (tool === 'arrow') {
    const line = previewEl.querySelector('line');
    line.setAttribute('x1', startX * 100);
    line.setAttribute('y1', startY * 100);
    line.setAttribute('x2', currX * 100);
    line.setAttribute('y2', currY * 100);
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
    <div class="exh-edit-toolbar">
      <button type="button" data-tool="note" class="exh-tool-btn active">Poznámka</button>
      <button type="button" data-tool="rectangle" class="exh-tool-btn">Obdélník</button>
      <button type="button" data-tool="arrow" class="exh-tool-btn">Šipka</button>
      <button type="button" data-tool="image" class="exh-tool-btn">Obrázek</button>
      <button type="button" data-tool="person" class="exh-tool-btn">Osoba</button>
    </div>
    <button id="exh-editor-toggle" type="button" class="exh-editor-toggle">JSON</button>
    <div id="exh-editor-panel" class="exh-editor-panel hidden">
      <div class="exh-editor-header">JSON aktuálního kroku</div>
      <textarea id="exh-editor-json" readonly spellcheck="false"></textarea>
      <button id="exh-editor-copy" type="button" class="exh-editor-btn">Kopírovat</button>
    </div>
  `;
  root.appendChild(div);
  div.querySelectorAll('.exh-tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentEditTool = btn.dataset.tool;
      div.querySelectorAll('.exh-tool-btn').forEach(b =>
        b.classList.toggle('active', b === btn));
    });
  });
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
//
// Optional `once: true` on a track sets `loop = false` (the track plays a
// single time per pass through its `start` cue). Going back to the step or
// scrubbing back before the cue resets the played flag so the track replays
// when the cue is crossed again going forward.

function loadTracks(step) {
  if (!step.audio) return;
  const list = Array.isArray(step.audio)
    ? step.audio
    : [{ path: step.audio, start: 0, volume: 1 }];

  tracks = list.map(cfg => {
    const el = new Audio(resolveMediaPath(cfg.path));
    el.preload = 'auto';
    el.loop = cfg.once !== true;
    el.volume = effectiveVolume(cfg, 0);
    return { el, config: cfg, started: false };
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

    if (elapsed >= start && t.el.paused && !paused && !t.el.ended) {
      if (!t.started) {
        // First play of this track in this step instance: always from 0,
        // regardless of how late tick fires after startStep.
        try { t.el.currentTime = 0; } catch (_) {}
        t.started = true;
      } else {
        const trackTime = elapsed - start;
        if (Math.abs(t.el.currentTime - trackTime) > 0.3) {
          try { t.el.currentTime = trackTime; } catch (_) {}
        }
      }
      t.el.play().catch(() => {});
    }
  }
}

function syncTracksOnSeek(elapsed) {
  for (const t of tracks) {
    const start = t.config.start ?? 0;
    const dur = t.el.duration;
    const pastEnd = !t.el.loop && !isNaN(dur) && elapsed >= start + dur;

    if (elapsed < start) {
      // Seek-back across the start cue: reset so the track plays from 0
      // when elapsed crosses `start` again going forward.
      t.el.pause();
      try { t.el.currentTime = 0; } catch (_) {}
      t.started = false;
    } else if (pastEnd) {
      t.el.pause();
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
    if (elapsed >= start && !t.el.ended) {
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

// --- Global (exhibition-wide) tracks ---
//
// `exhibition.json` may carry an `audio` array using the same track schema as
// step audio (path/start/volume/volumeChanges). Times are seconds since the
// exhibition was first opened. Tracks play continuously across step navigation
// and only stop when the viewer is destroyed.

function loadGlobalTracks(exh) {
  stopGlobalTracks();
  if (!exh.audio) return;
  const list = Array.isArray(exh.audio)
    ? exh.audio
    : [{ path: exh.audio, start: 0, volume: 1 }];
  globalTracks = list.map(cfg => {
    const el = new Audio(resolveMediaPath(cfg.path));
    el.preload = 'auto';
    el.loop = cfg.once !== true;
    el.volume = effectiveVolume(cfg, 0);
    return { el, config: cfg, started: false };
  });
}

function tickGlobalTracks(elapsed) {
  for (const t of globalTracks) {
    const start = t.config.start ?? 0;
    t.el.volume = effectiveVolume(t.config, elapsed);
    if (elapsed >= start && t.el.paused && !paused && !t.el.ended) {
      if (!t.started) {
        try { t.el.currentTime = 0; } catch (_) {}
        t.started = true;
      } else {
        const trackTime = elapsed - start;
        if (Math.abs(t.el.currentTime - trackTime) > 0.3) {
          try { t.el.currentTime = trackTime; } catch (_) {}
        }
      }
      t.el.play().catch(() => {});
    }
  }
}

function syncGlobalTracksOnSeek(elapsed) {
  for (const t of globalTracks) {
    const start = t.config.start ?? 0;
    const dur = t.el.duration;
    if (elapsed < start) {
      t.el.pause();
      try { t.el.currentTime = 0; } catch (_) {}
      t.started = false;
    } else {
      let trackTime = elapsed - start;
      if (t.el.loop && !isNaN(dur) && dur > 0) trackTime = trackTime % dur;
      const pastEnd = !t.el.loop && !isNaN(dur) && trackTime >= dur;
      if (pastEnd) {
        t.el.pause();
      } else {
        try { t.el.currentTime = trackTime; } catch (_) {}
        if (paused) t.el.pause();
        else t.el.play().catch(() => {});
      }
    }
    t.el.volume = effectiveVolume(t.config, elapsed);
  }
}

function pauseGlobalTracks() {
  for (const t of globalTracks) t.el.pause();
}

function resumeGlobalTracks(elapsed) {
  for (const t of globalTracks) {
    const start = t.config.start ?? 0;
    if (elapsed >= start && !t.el.ended) {
      try { t.el.currentTime = elapsed - start; } catch (_) {}
      t.el.play().catch(() => {});
    }
    t.el.volume = effectiveVolume(t.config, elapsed);
  }
}

function stopGlobalTracks() {
  for (const t of globalTracks) {
    t.el.pause();
    t.el.src = '';
  }
  globalTracks = [];
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
  stopGlobalTracks();
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
    loadGlobalTracks(exhibition);
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
