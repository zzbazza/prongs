/**
 * API and Data Loading Functions
 */

import { state } from './state.js';
import { setLoading } from './utils.js';

// Load all categories and items from API
export async function loadAllData() {
  setLoading(true);
  try {
    // Load categories
    const catResponse = await fetch('/api/categories');
    const catData = await catResponse.json();
    state.allCategories = catData.categories;
    state.currentCategories = catData.categories;
    state.isLegacy = catData.isLegacy || false;

    // Load all items
    const itemsResponse = await fetch('/api/items');
    const itemsData = await itemsResponse.json();
    state.allItems = itemsData.items;
  } catch (error) {
    console.error('Error loading data:', error);
    alert('Chyba při načítání obsahu');
  } finally {
    setLoading(false);
  }
}

// Get category title from path
export function getCategoryTitle(categoryPath) {
  if (!categoryPath || categoryPath.length === 0) return '';

  let categories = state.allCategories;
  let title = '';

  for (let i = 0; i < categoryPath.length; i++) {
    const catId = categoryPath[i];
    const found = categories.find(c => c.id === catId);
    if (found) {
      if (i === categoryPath.length - 1) {
        title = found.title;
      }
      categories = found.subcategories || [];
    } else {
      return categoryPath[categoryPath.length - 1];
    }
  }

  return title;
}

// Get all category titles from path
export function getCategoryTitles(categoryPath) {
  if (!categoryPath || categoryPath.length === 0) return [];

  let categories = state.allCategories;
  const titles = [];

  for (let i = 0; i < categoryPath.length; i++) {
    const catId = categoryPath[i];
    const found = categories.find(c => c.id === catId);
    if (found) {
      titles.push({
        id: catId,
        title: found.title,
        level: i,
        icon: found.icon,
        icon_path: found.icon_path,
        filter: found.filter
      });
      categories = found.subcategories || [];
    } else {
      titles.push({ id: catId, title: catId, level: i });
    }
  }

  return titles;
}
