/**
 * File Viewer Controllers
 */

import { state, elements } from './state.js';
import { updateBreadcrumbs } from './navigation.js';
import { renderImageViewer } from './viewers/imageViewer.js';
import { renderPDFViewer, renderTextViewer, renderVideoViewer, renderAudioViewer, renderPanelViewer } from './viewers/documentViewers.js';
import { renderExhibitionViewer, destroyExhibitionViewer } from './viewers/exhibitionViewer.js';
import { renderGameViewer, destroyGameViewer } from './viewers/gameViewer.js';

export function openFile(item, index) {
  state.currentIndex = index;
  state.currentFile = item;
  state.currentView = 'viewer';
  elements.browserView.classList.add('hidden');
  elements.contentViewer.classList.remove('hidden');

  switch (item.type) {
    case 'image':
      renderImageViewer(item, openFile);
      break;
    case 'document':
      renderPDFViewer(item);
      break;
    case 'panel':
      renderPanelViewer(item);
      break;
    case 'text':
      renderTextViewer(item);
      break;
    case 'video':
      renderVideoViewer(item);
      break;
    case 'audio':
      renderAudioViewer(item);
      break;
    case 'exhibition':
      renderExhibitionViewer(item);
      break;
    case 'game':
      renderGameViewer(item);
      break;
    default:
      elements.viewerContent.innerHTML = '<div class="empty-state"><div class="empty-state-icon">❌</div><div>Nepodporovaný typ souboru</div></div>';
  }

  updateBreadcrumbs();
}

export function closeViewer() {
  destroyExhibitionViewer();
  destroyGameViewer();

  elements.contentViewer.classList.add('hidden');
  elements.browserView.classList.remove('hidden');
  state.currentIndex = -1;
  state.currentFile = null;

  // Restore previous view
  if (state.currentCategoryPath.length > 0) {
    state.currentView = 'category';
  } else if (state.searchQuery) {
    state.currentView = 'search';
  } else {
    state.currentView = 'home';
  }

  updateBreadcrumbs();
}
