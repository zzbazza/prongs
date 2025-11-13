/**
 * Text Size Controls
 */

import { state, elements } from '../state.js';

// Increase text size
export function increaseTextSize() {
  const currentIndex = state.textSizes.indexOf(state.textSize);
  if (currentIndex < state.textSizes.length - 1) {
    setTextSize(state.textSizes[currentIndex + 1]);
  }
}

// Decrease text size
export function decreaseTextSize() {
  const currentIndex = state.textSizes.indexOf(state.textSize);
  if (currentIndex > 0) {
    setTextSize(state.textSizes[currentIndex - 1]);
  }
}

// Set text size
export function setTextSize(size) {
  // Ensure size is valid
  if (!state.textSizes.includes(size)) {
    size = 'medium';
  }

  state.textSize = size;
  document.body.setAttribute('data-text-size', size);
  localStorage.setItem('textSize', size);

  // Update button states
  updateTextSizeButtons();
}

// Update text size button states
export function updateTextSizeButtons() {
  const currentIndex = state.textSizes.indexOf(state.textSize);

  // Disable decrease button if at minimum
  elements.textSizeDecrease.disabled = currentIndex === 0;
  elements.textSizeDecrease.style.opacity = currentIndex === 0 ? '0.3' : '1';

  // Disable increase button if at maximum
  elements.textSizeIncrease.disabled = currentIndex === state.textSizes.length - 1;
  elements.textSizeIncrease.style.opacity = currentIndex === state.textSizes.length - 1 ? '0.3' : '1';
}
