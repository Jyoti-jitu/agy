// Application State
let allUpdates = [];
let selectedUpdates = new Set();
let currentModalUpdates = [];

// DOM Elements
const searchInput = document.getElementById('search-input');
const typeFilter = document.getElementById('type-filter');
const refreshBtn = document.getElementById('refresh-btn');
const refreshSpinner = document.getElementById('refresh-spinner');
const refreshIcon = document.getElementById('refresh-icon');
const loadingState = document.getElementById('loading-state');
const feedContainer = document.getElementById('feed-container');
const emptyState = document.getElementById('empty-state');

// Theme Switch & CSV Export Elements
const themeCheckbox = document.getElementById('checkbox-theme');
const exportCsvBtn = document.getElementById('export-csv-btn');

// Floating Bar Elements
const floatingBar = document.getElementById('floating-bar');
const selectedCount = document.getElementById('selected-count');
const clearSelectionBtn = document.getElementById('clear-selection-btn');
const tweetSelectedBtn = document.getElementById('tweet-selected-btn');

// Composer Modal Elements
const composerModal = document.getElementById('composer-modal');
const closeModalBtn = document.getElementById('close-modal');
const previewBadgeContainer = document.getElementById('preview-badge-container');
const previewDate = document.getElementById('preview-date');
const previewText = document.getElementById('preview-text');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCounter = document.getElementById('char-counter');
const cancelTweetBtn = document.getElementById('cancel-tweet-btn');
const sendTweetBtn = document.getElementById('send-tweet-btn');

// Toast Container
const toastContainer = document.getElementById('toast-container');

// Initial Setup
document.addEventListener('DOMContentLoaded', () => {
  // Theme initialization from localStorage
  const savedTheme = localStorage.getItem('theme') || 'dark';
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
    if (themeCheckbox) themeCheckbox.checked = true;
  }

  fetchReleases(false);
  
  // Event Listeners
  refreshBtn.addEventListener('click', () => fetchReleases(true));
  searchInput.addEventListener('input', filterAndRenderFeed);
  typeFilter.addEventListener('change', filterAndRenderFeed);
  
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', exportToCSV);
  }

  if (themeCheckbox) {
    themeCheckbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        document.body.classList.add('light-theme');
        localStorage.setItem('theme', 'light');
      } else {
        document.body.classList.remove('light-theme');
        localStorage.setItem('theme', 'dark');
      }
    });
  }
  
  // Multi-select Actions
  clearSelectionBtn.addEventListener('click', clearAllSelections);
  tweetSelectedBtn.addEventListener('click', () => {
    const selectedList = allUpdates.filter(u => selectedUpdates.has(u.id));
    openComposer(selectedList);
  });
  
  // Modal Actions
  closeModalBtn.addEventListener('click', closeComposer);
  cancelTweetBtn.addEventListener('click', closeComposer);
  tweetTextarea.addEventListener('input', updateCharCount);
  sendTweetBtn.addEventListener('click', triggerTweet);
  
  // Close modal when clicking outside modal content
  composerModal.addEventListener('click', (e) => {
    if (e.target === composerModal) {
      closeComposer();
    }
  });
});

// Toast Helper
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  // Icon based on type
  const icon = type === 'success' ? 
    `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>` :
    `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`;
    
  toast.innerHTML = `${icon}<span>${message}</span>`;
  toastContainer.appendChild(toast);
  
  // Trigger entry animation
  setTimeout(() => toast.classList.add('active'), 10);
  
  // Remove toast after 3.5 seconds
  setTimeout(() => {
    toast.classList.remove('active');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Fetch Releases from Backend
async function fetchReleases(forceRefresh = false) {
  toggleLoadingState(true);
  
  try {
    const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
    const response = await fetch(url);
    const result = await response.json();
    
    if (result.success) {
      allUpdates = result.data;
      clearAllSelections();
      filterAndRenderFeed();
      
      const sourceInfo = result.source === 'network' ? 'Freshly fetched' : 'Loaded from cache';
      showToast(`${sourceInfo} ${allUpdates.length} release updates successfully.`, 'success');
    } else {
      showToast(`Failed to parse updates: ${result.error}`, 'error');
      showEmptyState();
    }
  } catch (err) {
    showToast(`Network error: ${err.message}`, 'error');
    showEmptyState();
  } finally {
    toggleLoadingState(false);
  }
}

// Show/Hide loaders
function toggleLoadingState(isLoading) {
  if (isLoading) {
    loadingState.style.display = 'flex';
    feedContainer.style.display = 'none';
    emptyState.style.display = 'none';
    
    refreshBtn.disabled = true;
    refreshSpinner.style.display = 'inline-block';
    refreshIcon.style.display = 'none';
  } else {
    loadingState.style.display = 'none';
    
    refreshBtn.disabled = false;
    refreshSpinner.style.display = 'none';
    refreshIcon.style.display = 'inline-block';
  }
}

// Filter and Render updates into the DOM
function filterAndRenderFeed() {
  const query = searchInput.value.toLowerCase().trim();
  const filterType = typeFilter.value;
  
  const filtered = allUpdates.filter(update => {
    const matchesSearch = 
      update.content_text.toLowerCase().includes(query) || 
      update.type.toLowerCase().includes(query) || 
      update.date.toLowerCase().includes(query);
      
    const matchesType = 
      filterType === 'all' || 
      update.type.toLowerCase() === filterType;
      
    return matchesSearch && matchesType;
  });
  
  renderFeed(filtered);
}

// Render feed list HTML
function renderFeed(updates) {
  if (updates.length === 0) {
    showEmptyState();
    return;
  }
  
  emptyState.style.display = 'none';
  feedContainer.style.display = 'flex';
  feedContainer.innerHTML = '';
  
  updates.forEach(update => {
    const card = document.createElement('div');
    const isSelected = selectedUpdates.has(update.id);
    card.className = `update-card ${isSelected ? 'selected' : ''}`;
    card.dataset.id = update.id;
    
    // Determine badge class
    const typeLower = update.type.toLowerCase();
    let badgeClass = 'badge-default';
    if (['feature', 'issue', 'deprecation', 'notice', 'resolved'].includes(typeLower)) {
      badgeClass = `badge-${typeLower}`;
    }
    
    card.innerHTML = `
      <div class="card-header-meta">
        <div class="select-checkbox-wrapper">
          <input type="checkbox" class="update-select-checkbox" data-id="${update.id}" ${isSelected ? 'checked' : ''}>
        </div>
        <span class="badge ${badgeClass}">${update.type}</span>
        <span class="update-date">${update.date}</span>
      </div>
      <div class="card-body">
        ${update.content_html}
      </div>
      <div class="card-footer">
        <a href="${update.link}" target="_blank" rel="noopener noreferrer" class="original-link">
          <!-- View original Icon -->
          <svg class="original-link-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>View on Google Docs</span>
        </a>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn btn-secondary copy-single-btn" data-id="${update.id}" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; border-color: var(--panel-border);">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 2px;">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            Copy
          </button>
          <button class="btn btn-primary tweet-single-btn" data-id="${update.id}" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; background: var(--panel-hover-border); color: var(--text-primary);">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            Tweet
          </button>
        </div>
      </div>
    `;
    
    // Checkbox select event listener
    const checkbox = card.querySelector('.update-select-checkbox');
    checkbox.addEventListener('change', (e) => {
      toggleSelect(update.id, e.target.checked);
    });
    
    // Click card to toggle selection (if clicking not on links, buttons or checkboxes)
    card.addEventListener('click', (e) => {
      if (e.target.tagName !== 'A' && 
          e.target.tagName !== 'BUTTON' && 
          e.target.tagName !== 'INPUT' && 
          !e.target.closest('a') && 
          !e.target.closest('button') &&
          !e.target.closest('.copy-single-btn')) {
        const check = card.querySelector('.update-select-checkbox');
        check.checked = !check.checked;
        toggleSelect(update.id, check.checked);
      }
    });
    
    // Single Copy Trigger
    const copyBtn = card.querySelector('.copy-single-btn');
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const copyText = `BigQuery Release Update (${update.date})\n[${update.type}] ${update.content_text}\nSource: ${update.link}`;
      navigator.clipboard.writeText(copyText).then(() => {
        showToast('Copied to clipboard!', 'success');
      }).catch(err => {
        showToast('Failed to copy to clipboard', 'error');
      });
    });
    
    // Single Tweet Composer Trigger
    const tweetBtn = card.querySelector('.tweet-single-btn');
    tweetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openComposer([update]);
    });
    
    feedContainer.appendChild(card);
  });
}

function showEmptyState() {
  feedContainer.style.display = 'none';
  emptyState.style.display = 'block';
}

// Manage multi-selections
function toggleSelect(id, isChecked) {
  const card = document.querySelector(`.update-card[data-id="${id}"]`);
  
  if (isChecked) {
    selectedUpdates.add(id);
    if (card) card.classList.add('selected');
  } else {
    selectedUpdates.delete(id);
    if (card) card.classList.remove('selected');
  }
  
  updateFloatingBar();
}

function clearAllSelections() {
  selectedUpdates.clear();
  document.querySelectorAll('.update-card').forEach(card => {
    card.classList.remove('selected');
    const checkbox = card.querySelector('.update-select-checkbox');
    if (checkbox) checkbox.checked = false;
  });
  updateFloatingBar();
}

function updateFloatingBar() {
  const count = selectedUpdates.size;
  selectedCount.textContent = count;
  
  if (count > 0) {
    floatingBar.classList.add('active');
  } else {
    floatingBar.classList.remove('active');
  }
}

// Date formatter helpers
function formatShortDate(dateStr) {
  const parts = dateStr.split(',');
  if (parts.length > 0) {
    return parts[0].trim();
  }
  return dateStr;
}

// Generate the Tweet Draft Content
function generateTweetDraft(updatesList) {
  if (updatesList.length === 0) return '';
  
  if (updatesList.length === 1) {
    const update = updatesList[0];
    const header = `BigQuery Update (${formatShortDate(update.date)}):\n[${update.type}] `;
    const link = `\n\nRead details: ${update.link}`;
    
    const maxContentLen = 280 - (header.length + link.length);
    let content = update.content_text;
    
    if (content.length > maxContentLen) {
      content = content.slice(0, maxContentLen - 3) + '...';
    }
    
    return header + content + link;
  } else {
    // Multi-select Tweet text
    const header = `Latest BigQuery Updates:\n`;
    const link = `\n\nDocs: https://docs.cloud.google.com/bigquery/docs/release-notes`;
    
    let available = 280 - (header.length + link.length);
    let itemsText = '';
    
    for (const update of updatesList) {
      if (available <= 20) break;
      const bullet = `• [${update.type}] ${update.content_text}\n`;
      let textToAdd = bullet;
      
      if (bullet.length > available) {
        textToAdd = bullet.slice(0, available - 5) + '...\n';
      }
      
      itemsText += textToAdd;
      available -= textToAdd.length;
    }
    
    return header + itemsText.trim() + link;
  }
}

// Composer Modal handling
function openComposer(updates) {
  currentModalUpdates = updates;
  
  // Modal Preview Setup
  if (updates.length === 1) {
    const update = updates[0];
    const typeLower = update.type.toLowerCase();
    let badgeClass = 'badge-default';
    if (['feature', 'issue', 'deprecation', 'notice', 'resolved'].includes(typeLower)) {
      badgeClass = `badge-${typeLower}`;
    }
    
    previewBadgeContainer.innerHTML = `<span class="badge ${badgeClass}">${update.type}</span>`;
    previewDate.textContent = update.date;
    previewText.textContent = update.content_text;
  } else {
    previewBadgeContainer.innerHTML = `<span class="badge badge-default">Multiple (${updates.length})</span>`;
    previewDate.textContent = "Various Dates";
    previewText.textContent = updates.map(u => `• [${u.type}] ${u.content_text.slice(0, 80)}...`).join('\n');
  }
  
  // Set draft content
  const draft = generateTweetDraft(updates);
  tweetTextarea.value = draft;
  
  updateCharCount();
  
  composerModal.classList.add('active');
  tweetTextarea.focus();
}

function closeComposer() {
  composerModal.classList.remove('active');
  currentModalUpdates = [];
}

function updateCharCount() {
  const len = tweetTextarea.value.length;
  charCounter.textContent = `${len} / 280`;
  
  charCounter.className = 'char-counter';
  if (len > 240 && len <= 280) {
    charCounter.classList.add('warning');
  } else if (len > 280) {
    charCounter.classList.add('danger');
  }
  
  // Disable share button if empty or length limit exceeded
  sendTweetBtn.disabled = len === 0 || len > 280;
  if (sendTweetBtn.disabled) {
    sendTweetBtn.style.opacity = 0.5;
    sendTweetBtn.style.cursor = 'not-allowed';
  } else {
    sendTweetBtn.style.opacity = 1;
    sendTweetBtn.style.cursor = 'pointer';
  }
}

function triggerTweet() {
  const tweetText = tweetTextarea.value;
  if (!tweetText || tweetText.length > 280) {
    showToast('Invalid tweet content or length limit exceeded!', 'error');
    return;
  }
  
  const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
  window.open(twitterIntentUrl, '_blank', 'width=550,height=420');
  
  closeComposer();
  showToast('Opened Twitter sharing intent window!', 'success');
}

// Export Filtered Release Notes to CSV
function exportToCSV() {
  const query = searchInput.value.toLowerCase().trim();
  const filterType = typeFilter.value;
  
  const filtered = allUpdates.filter(update => {
    const matchesSearch = 
      update.content_text.toLowerCase().includes(query) || 
      update.type.toLowerCase().includes(query) || 
      update.date.toLowerCase().includes(query);
      
    const matchesType = 
      filterType === 'all' || 
      update.type.toLowerCase() === filterType;
      
    return matchesSearch && matchesType;
  });
  
  if (filtered.length === 0) {
    showToast('No updates to export!', 'error');
    return;
  }
  
  const escapeCSV = (text) => {
    if (!text) return '""';
    return '"' + text.replace(/"/g, '""') + '"';
  };
  
  let csvContent = 'ID,Date,Type,Link,Content\n';
  filtered.forEach(u => {
    csvContent += `${escapeCSV(u.id)},${escapeCSV(u.date)},${escapeCSV(u.type)},${escapeCSV(u.link)},${escapeCSV(u.content_text)}\n`;
  });
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  const today = new Date().toISOString().slice(0, 10);
  link.setAttribute('href', url);
  link.setAttribute('download', `bigquery_release_notes_${today}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showToast(`Exported ${filtered.length} updates to CSV!`, 'success');
}
