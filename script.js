'use strict';

var STORAGE_KEY = 'markdownNotes_v1';
var FIRST_LAUNCH_KEY = 'markdownNotes_firstLaunch';
var THEME_KEY = 'markdownNotes_theme';

// made by hanx https://hanx.pro
// last update/touched 26.08.2026
var state = {
  notes: [],
  activeNoteId: null,
  searchQuery: '',
  sortOrder: 'modified',
  viewMode: 'split',
  pendingDeleteId: null,
};

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function createNote(title, content) {
  var now = Date.now();
  return {
    id: generateId(),
    title: title || '',
    content: content || '',
    createdAt: now,
    modifiedAt: now,
    pinned: false,
  };
}

var dbPromise = null;

function openDatabase() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise(function (resolve) {
    if (!window.indexedDB) {
      resolve(null);
      return;
    }
    var req = indexedDB.open('markdownNotesDB', 1);
    req.onupgradeneeded = function (e) {
      var db = e.target.result;
      if (!db.objectStoreNames.contains('notes')) {
        var store = db.createObjectStore('notes', { keyPath: 'id' });
        store.createIndex('modifiedAt', 'modifiedAt', { unique: false });
      }
    };
    req.onsuccess = function (e) {
      resolve(e.target.result);
    };
    req.onerror = function () {
      resolve(null);
    };
  });
  return dbPromise;
}

function dbGetAllNotes() {
  return openDatabase().then(function (db) {
    if (!db) return null;
    return new Promise(function (resolve) {
      try {
        var tx = db.transaction('notes', 'readonly');
        var store = tx.objectStore('notes');
        var req = store.getAll();
        req.onsuccess = function () {
          resolve(req.result || []);
        };
        req.onerror = function () {
          resolve(null);
        };
      } catch (e) {
        resolve(null);
      }
    });
  });
}

function dbSaveNote(note) {
  saveToFallback();
  return openDatabase().then(function (db) {
    if (!db) return;
    try {
      var tx = db.transaction('notes', 'readwrite');
      tx.objectStore('notes').put(note);
    } catch (e) {}
  });
}

function dbDeleteNote(id) {
  saveToFallback();
  return openDatabase().then(function (db) {
    if (!db) return;
    try {
      var tx = db.transaction('notes', 'readwrite');
      tx.objectStore('notes').delete(id);
    } catch (e) {}
  });
}

function dbSaveAllNotes(notes) {
  saveToFallback();
  return openDatabase().then(function (db) {
    if (!db) return;
    try {
      var tx = db.transaction('notes', 'readwrite');
      var store = tx.objectStore('notes');
      for (var i = 0; i < notes.length; i++) {
        store.put(notes[i]);
      }
    } catch (e) {}
  });
}

function saveToFallback() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.notes));
  } catch (e) {}
}

function loadFromFallback() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return null;
}

var SAMPLE_CONTENT = [
  {
    title: 'Welcome to Markdown Notes',
    content: [
      '# Welcome to Markdown Notes',
      '',
      'This is your personal Markdown notes app. Everything is saved locally with fast IndexedDB persistence.',
      '',
      '## Features',
      '',
      '- **Create** notes with the "+ New" button',
      '- **Edit** notes with the Markdown editor on the left',
      '- **Preview** rendered Markdown on the right',
      '- **Search** notes by title or content',
      '- **Pin** important notes to keep them at the top',
      '- **Sort** by last modified, date created, or title A-Z',
      '',
      '## Keyboard Shortcuts',
      '',
      '- `Ctrl+S` — Save note',
      '- `Ctrl+N` — New note',
      '- `Escape` — Close modal / sidebar',
      '',
      '## Tips',
      '',
      '- Click **Preview** in the toolbar to cycle views: split, preview only, editor only.',
      '- Notes are auto-saved automatically as you type.',
      '- Drag the center divider to resize the editor and preview panes.',
    ].join('\n'),
  },
  {
    title: 'Markdown Syntax Reference',
    content: [
      '# Markdown Syntax Reference',
      '',
      '## Headings',
      '',
      'Use `#` for H1 through `######` for H6.',
      '',
      '## Text Formatting',
      '',
      '**Bold** — `**text**`',
      '*Italic* — `*text*`',
      '***Bold and italic*** — `***text***`',
      '',
      '## Lists',
      '',
      'Unordered:',
      '',
      '- Item one',
      '- Item two',
      '  - Nested item',
      '',
      'Ordered:',
      '',
      '1. First',
      '2. Second',
      '3. Third',
      '',
      '## Links',
      '',
      '[Visit hanx.lol](https://hanx.lol)',
      '',
      '## Inline Code',
      '',
      'Use `backticks` for inline code.',
      '',
      '## Code Block',
      '',
      '```javascript',
      'function greet(name) {',
      "  return 'Hello, ' + name + '!';",
      '}',
      '```',
      '',
      '## Blockquote',
      '',
      '> This is a blockquote.',
      '> It can span multiple lines.',
      '',
      '## Horizontal Rule',
      '',
      '---',
    ].join('\n'),
  },
];

function seedSampleNotes() {
  var notes = [];
  for (var i = 0; i < SAMPLE_CONTENT.length; i++) {
    var s = SAMPLE_CONTENT[i];
    var now = Date.now() - (SAMPLE_CONTENT.length - i) * 120000;
    notes.push({
      id: generateId(),
      title: s.title,
      content: s.content,
      createdAt: now,
      modifiedAt: now,
      pinned: i === 0,
    });
  }
  state.notes = notes;
  dbSaveAllNotes(notes);
  try {
    localStorage.setItem(FIRST_LAUNCH_KEY, 'done');
  } catch (e) {}
}

function byId(id) { return document.getElementById(id); }

var dom = {
  sidebar: byId('sidebar'),
  sidebarToggle: byId('sidebar-toggle'),
  sidebarBackdrop: byId('sidebar-backdrop'),
  notesList: byId('notes-list'),
  notesCount: byId('notes-count'),
  btnTheme: byId('btn-theme'),
  searchInput: byId('search-input'),
  sortSelect: byId('sort-select'),
  btnNewNote: byId('btn-new-note'),
  emptyState: byId('empty-state'),
  noteEditor: byId('note-editor'),
  btnNewNoteEmpty: byId('btn-new-note-empty'),
  noteTitleInput: byId('note-title-input'),
  saveIndicator: byId('save-indicator'),
  btnPin: byId('btn-pin'),
  btnDelete: byId('btn-delete'),
  btnToggleView: byId('btn-toggle-view'),
  editorPanels: byId('editor-panels'),
  markdownInput: byId('markdown-input'),
  previewOutput: byId('preview-output'),
  charCount: byId('char-count'),
  lastModified: byId('last-modified'),
  modalOverlay: byId('modal-overlay'),
  modalCancel: byId('modal-cancel'),
  modalConfirm: byId('modal-confirm'),
};

function getInitialTheme() {
  var saved = localStorage.getItem(THEME_KEY);
  if (saved === 'dark' || saved === 'light') return saved;
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  var metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', theme === 'dark' ? '#09090b' : '#fafafa');
  }
  if (dom.btnTheme) {
    dom.btnTheme.title = 'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' theme';
    dom.btnTheme.setAttribute('aria-label', 'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' theme');
    if (theme === 'dark') {
      dom.btnTheme.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
    } else {
      dom.btnTheme.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
    }
  }
}

function toggleTheme() {
  var current = document.documentElement.getAttribute('data-theme') || 'light';
  var next = current === 'dark' ? 'light' : 'dark';
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch (e) {}
  applyTheme(next);
}

var Markdown = (function () {

  function textNode(str) {
    return document.createTextNode(str);
  }

  function el(tag) {
    return document.createElement(tag);
  }

  function parseInline(raw) {
    var nodes = [];
    var i = 0;
    var buf = '';

    function flush() {
      if (buf.length > 0) {
        nodes.push(textNode(buf));
        buf = '';
      }
    }

    function appendChildren(parent, children) {
      for (var c = 0; c < children.length; c++) {
        parent.appendChild(children[c]);
      }
    }

    while (i < raw.length) {

      if (raw[i] === '`') {
        var j = i + 1;
        while (j < raw.length && raw[j] !== '`') j++;
        if (j < raw.length) {
          flush();
          var code = el('code');
          code.textContent = raw.slice(i + 1, j);
          nodes.push(code);
          i = j + 1;
          continue;
        }
      }

      if (i + 2 < raw.length &&
        raw[i] === '*' && raw[i + 1] === '*' && raw[i + 2] === '*') {
        var end3 = raw.indexOf('***', i + 3);
        if (end3 !== -1) {
          flush();
          var strong3 = el('strong');
          var em3 = el('em');
          appendChildren(em3, parseInline(raw.slice(i + 3, end3)));
          strong3.appendChild(em3);
          nodes.push(strong3);
          i = end3 + 3;
          continue;
        }
      }

      if (i + 1 < raw.length && raw[i] === '*' && raw[i + 1] === '*') {
        var end2 = raw.indexOf('**', i + 2);
        if (end2 !== -1) {
          flush();
          var strong2 = el('strong');
          appendChildren(strong2, parseInline(raw.slice(i + 2, end2)));
          nodes.push(strong2);
          i = end2 + 2;
          continue;
        }
      }

      if (raw[i] === '*' && raw[i + 1] !== '*') {
        var end1 = raw.indexOf('*', i + 1);
        if (end1 !== -1) {
          flush();
          var em1 = el('em');
          appendChildren(em1, parseInline(raw.slice(i + 1, end1)));
          nodes.push(em1);
          i = end1 + 1;
          continue;
        }
      }

      if (raw[i] === '[') {
        var closeBr = raw.indexOf(']', i + 1);
        if (closeBr !== -1 && raw[closeBr + 1] === '(') {
          var closePa = raw.indexOf(')', closeBr + 2);
          if (closePa !== -1) {
            flush();
            var linkText = raw.slice(i + 1, closeBr);
            var href = raw.slice(closeBr + 2, closePa).trim();
            var a = el('a');
            if (/^(https?:\/\/|mailto:|\/|#|\.\/)/.test(href) ||
              !/^[a-z][a-z0-9+\-.]*:/i.test(href)) {
              a.href = href;
              if (/^https?:\/\//.test(href)) {
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
              }
            } else {
              a.href = '#';
            }
            appendChildren(a, parseInline(linkText));
            nodes.push(a);
            i = closePa + 1;
            continue;
          }
        }
      }

      if (raw[i] === '\n') {
        flush();
        nodes.push(el('br'));
        i++;
        continue;
      }

      buf += raw[i];
      i++;
    }

    flush();
    return nodes;
  }

  function parse(markdown) {
    var fragment = document.createDocumentFragment();
    if (!markdown || !markdown.trim()) return fragment;

    var src = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    var lines = src.split('\n');
    var i = 0;

    function appendInline(parent, raw) {
      var nodes = parseInline(raw);
      for (var n = 0; n < nodes.length; n++) {
        parent.appendChild(nodes[n]);
      }
    }

    while (i < lines.length) {
      var line = lines[i];

      if (line.trim() === '') { i++; continue; }

      var fenceMatch = line.match(/^(`{3,}|~{3,})(.*)/);
      if (fenceMatch) {
        var fence = fenceMatch[1];
        var lang = fenceMatch[2].trim();
        var pre = el('pre');
        var code = el('code');
        if (lang) code.setAttribute('data-lang', lang);
        var codeLines = [];
        i++;
        while (i < lines.length && lines[i].slice(0, fence.length) !== fence) {
          codeLines.push(lines[i]);
          i++;
        }
        i++;
        code.textContent = codeLines.join('\n');
        pre.appendChild(code);
        fragment.appendChild(pre);
        continue;
      }

      var hMatch = line.match(/^(#{1,6})\s+(.*)/);
      if (hMatch) {
        var level = hMatch[1].length;
        var h = el('h' + level);
        appendInline(h, hMatch[2]);
        fragment.appendChild(h);
        i++;
        continue;
      }

      if (/^(\s*[-*_]){3,}\s*$/.test(line)) {
        fragment.appendChild(el('hr'));
        i++;
        continue;
      }

      if (/^>\s?/.test(line)) {
        var bq = el('blockquote');
        var bqLines = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) {
          bqLines.push(lines[i].replace(/^>\s?/, ''));
          i++;
        }
        bq.appendChild(parse(bqLines.join('\n')));
        fragment.appendChild(bq);
        continue;
      }

      if (/^\s*[-*+]\s+/.test(line)) {
        var ul = el('ul');
        while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
          var liU = el('li');
          appendInline(liU, lines[i].replace(/^\s*[-*+]\s+/, ''));
          ul.appendChild(liU);
          i++;
        }
        fragment.appendChild(ul);
        continue;
      }

      if (/^\d+\.\s+/.test(line)) {
        var ol = el('ol');
        while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
          var liO = el('li');
          appendInline(liO, lines[i].replace(/^\d+\.\s+/, ''));
          ol.appendChild(liO);
          i++;
        }
        fragment.appendChild(ol);
        continue;
      }

      var pLines = [];
      while (
        i < lines.length &&
        lines[i].trim() !== '' &&
        !/^#{1,6}\s/.test(lines[i]) &&
        !/^(`{3,}|~{3,})/.test(lines[i]) &&
        !/^\s*[-*+]\s+/.test(lines[i]) &&
        !/^\d+\.\s+/.test(lines[i]) &&
        !/^>\s?/.test(lines[i]) &&
        !/^(\s*[-*_]){3,}\s*$/.test(lines[i])
      ) {
        pLines.push(lines[i]);
        i++;
      }

      if (pLines.length > 0) {
        var p = el('p');
        appendInline(p, pLines.join('\n'));
        fragment.appendChild(p);
      }
    }

    return fragment;
  }

  return { parse: parse };
}());

function renderPreview() {
  var fragment = Markdown.parse(dom.markdownInput.value);
  while (dom.previewOutput.firstChild) {
    dom.previewOutput.removeChild(dom.previewOutput.firstChild);
  }
  dom.previewOutput.appendChild(fragment);
}

function renderNotesList() {
  var query = state.searchQuery.toLowerCase().trim();

  var filtered = state.notes.filter(function (note) {
    if (!query) return true;
    return (
      note.title.toLowerCase().indexOf(query) !== -1 ||
      note.content.toLowerCase().indexOf(query) !== -1
    );
  });

  filtered.sort(function (a, b) {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (state.sortOrder === 'modified') return b.modifiedAt - a.modifiedAt;
    if (state.sortOrder === 'created') return b.createdAt - a.createdAt;
    if (state.sortOrder === 'title') return a.title.localeCompare(b.title);
    return b.modifiedAt - a.modifiedAt;
  });

  while (dom.notesList.firstChild) {
    dom.notesList.removeChild(dom.notesList.firstChild);
  }

  if (filtered.length === 0) {
    var empty = document.createElement('li');
    empty.className = 'notes-list-empty';
    empty.textContent = query ? 'No notes match your search.' : 'No notes yet. Create one!';
    dom.notesList.appendChild(empty);
    dom.notesCount.textContent = '0 notes';
    return;
  }

  var hasPinned = filtered.some(function (n) { return n.pinned; });
  var hasUnpinned = filtered.some(function (n) { return !n.pinned; });
  var dividerShown = false;

  for (var idx = 0; idx < filtered.length; idx++) {
    var note = filtered[idx];

    if (hasPinned && hasUnpinned && !note.pinned && !dividerShown) {
      var div = document.createElement('li');
      div.className = 'note-item-divider';
      div.setAttribute('role', 'separator');
      dom.notesList.appendChild(div);
      dividerShown = true;
    }

    var li = document.createElement('li');
    li.className = 'note-item' + (note.id === state.activeNoteId ? ' active' : '');
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', note.id === state.activeNoteId ? 'true' : 'false');
    li.dataset.id = note.id;

    var titleEl = document.createElement('div');
    titleEl.className = 'note-item-title';
    titleEl.textContent = note.title.trim() || 'Untitled Note';

    var metaEl = document.createElement('div');
    metaEl.className = 'note-item-meta';

    if (note.pinned) {
      var badge = document.createElement('span');
      badge.className = 'note-pin-badge';
      badge.setAttribute('aria-label', 'Pinned');
      badge.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>';
      metaEl.appendChild(badge);
    }

    var dateEl = document.createElement('span');
    dateEl.className = 'note-item-date';
    dateEl.textContent = formatRelativeDate(note.modifiedAt);
    metaEl.appendChild(dateEl);

    var excerptEl = document.createElement('div');
    excerptEl.className = 'note-item-excerpt';
    var cleaned = note.content.replace(/[#*_`>~\-=]/g, '').replace(/\s+/g, ' ').trim();
    excerptEl.textContent = cleaned.length > 72 ? cleaned.slice(0, 72) + '...' : cleaned;

    li.appendChild(titleEl);
    li.appendChild(metaEl);
    li.appendChild(excerptEl);

    (function (noteId) {
      li.addEventListener('click', function () { selectNote(noteId); });
    }(note.id));

    dom.notesList.appendChild(li);
  }

  var n = filtered.length;
  dom.notesCount.textContent = n === 1 ? '1 note' : n + ' notes';
}

function formatRelativeDate(ts) {
  var diff = Date.now() - ts;
  var sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  var min = Math.floor(sec / 60);
  if (min < 60) return min + 'm ago';
  var hr = Math.floor(min / 60);
  if (hr < 24) return hr + 'h ago';
  var day = Math.floor(hr / 24);
  if (day < 7) return day + 'd ago';
  var d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function updateEditorFooter(note) {
  if (!note) {
    dom.charCount.textContent = '';
    dom.lastModified.textContent = '';
    return;
  }
  var chars = note.content.length;
  dom.charCount.textContent = chars + (chars === 1 ? ' char' : ' chars');
  dom.lastModified.textContent = 'Modified ' + formatRelativeDate(note.modifiedAt);
}

function getNoteById(id) {
  for (var i = 0; i < state.notes.length; i++) {
    if (state.notes[i].id === id) return state.notes[i];
  }
  return null;
}

function closeMobileSidebar() {
  dom.sidebar.classList.remove('open');
  if (dom.sidebarBackdrop) dom.sidebarBackdrop.classList.add('hidden');
  dom.sidebarToggle.setAttribute('aria-expanded', 'false');
}

function openMobileSidebar() {
  dom.sidebar.classList.add('open');
  if (dom.sidebarBackdrop) dom.sidebarBackdrop.classList.remove('hidden');
  dom.sidebarToggle.setAttribute('aria-expanded', 'true');
}

function selectNote(id) {
  flushSave();

  state.activeNoteId = id;
  var note = getNoteById(id);
  if (!note) return;

  dom.noteEditor.classList.remove('hidden');
  dom.emptyState.classList.add('hidden');

  dom.noteTitleInput.value = note.title;
  dom.markdownInput.value = note.content;

  updatePinButton(note.pinned);
  updateEditorFooter(note);
  renderPreview();
  renderNotesList();

  if (window.innerWidth <= 768) {
    closeMobileSidebar();
  }
}

function newNote() {
  flushSave();
  var note = createNote('', '');
  state.notes.unshift(note);
  dbSaveNote(note);
  state.activeNoteId = note.id;

  dom.noteEditor.classList.remove('hidden');
  dom.emptyState.classList.add('hidden');
  dom.noteTitleInput.value = '';
  dom.markdownInput.value = '';
  while (dom.previewOutput.firstChild) {
    dom.previewOutput.removeChild(dom.previewOutput.firstChild);
  }

  updatePinButton(false);
  updateEditorFooter(note);
  renderNotesList();

  if (window.innerWidth <= 768) {
    closeMobileSidebar();
  }

  dom.noteTitleInput.focus();
}

function deleteNote(id) {
  var remaining = [];
  for (var i = 0; i < state.notes.length; i++) {
    if (state.notes[i].id !== id) remaining.push(state.notes[i]);
  }
  state.notes = remaining;
  dbDeleteNote(id);

  if (state.activeNoteId === id) {
    state.activeNoteId = null;
    dom.noteEditor.classList.add('hidden');
    dom.emptyState.classList.remove('hidden');
    dom.noteTitleInput.value = '';
    dom.markdownInput.value = '';
    while (dom.previewOutput.firstChild) {
      dom.previewOutput.removeChild(dom.previewOutput.firstChild);
    }
  }

  renderNotesList();
}

function togglePin() {
  var note = getNoteById(state.activeNoteId);
  if (!note) return;
  note.pinned = !note.pinned;
  note.modifiedAt = Date.now();
  dbSaveNote(note);
  updatePinButton(note.pinned);
  updateEditorFooter(note);
  renderNotesList();
}

function updatePinButton(pinned) {
  dom.btnPin.setAttribute('aria-pressed', pinned ? 'true' : 'false');
  dom.btnPin.title = pinned ? 'Unpin note' : 'Pin note';
  if (pinned) {
    dom.btnPin.classList.add('pinned');
  } else {
    dom.btnPin.classList.remove('pinned');
  }
}

var saveDebounceTimer = null;

function scheduleAutoSave() {
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
  dom.saveIndicator.textContent = 'Unsaved';
  dom.saveIndicator.className = 'save-indicator saving';
  saveDebounceTimer = setTimeout(function () {
    flushSave();
    saveDebounceTimer = null;
  }, 300);
}

function flushSave() {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
    saveDebounceTimer = null;
  }
  var note = getNoteById(state.activeNoteId);
  if (!note) return;
  note.title = dom.noteTitleInput.value;
  note.content = dom.markdownInput.value;
  note.modifiedAt = Date.now();
  dbSaveNote(note);
  updateEditorFooter(note);
  renderNotesList();
  dom.saveIndicator.textContent = 'Saved';
  dom.saveIndicator.className = 'save-indicator saved';
  setTimeout(function () {
    if (dom.saveIndicator.textContent === 'Saved') {
      dom.saveIndicator.textContent = '';
      dom.saveIndicator.className = 'save-indicator';
    }
  }, 1500);
}

function cycleViewMode() {
  if (state.viewMode === 'split') {
    state.viewMode = 'preview';
    dom.editorPanels.classList.remove('view-editor-only');
    dom.editorPanels.classList.add('view-preview-only');
    dom.btnToggleView.textContent = 'Editor';
  } else if (state.viewMode === 'preview') {
    state.viewMode = 'editor';
    dom.editorPanels.classList.remove('view-preview-only');
    dom.editorPanels.classList.add('view-editor-only');
    dom.btnToggleView.textContent = 'Split';
  } else {
    state.viewMode = 'split';
    dom.editorPanels.classList.remove('view-editor-only', 'view-preview-only');
    dom.btnToggleView.textContent = 'Preview';
  }
}

function showDeleteModal(id) {
  state.pendingDeleteId = id;
  dom.modalOverlay.classList.remove('hidden');
  dom.modalConfirm.focus();
}

function hideDeleteModal() {
  state.pendingDeleteId = null;
  dom.modalOverlay.classList.add('hidden');
}

(function () {
  var divider = byId('pane-divider');
  var panels = byId('editor-panels');
  var dragging = false;
  var startX = 0;
  var startLeftW = 0;

  divider.addEventListener('mousedown', function (e) {
    if (window.innerWidth <= 768) return;
    e.preventDefault();
    dragging = true;
    startX = e.clientX;
    var pane = panels.querySelector('.pane-editor');
    startLeftW = pane ? pane.offsetWidth : panels.offsetWidth / 2;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', function (e) {
    if (!dragging) return;
    var totalW = panels.offsetWidth;
    var newLeft = startLeftW + (e.clientX - startX);
    if (newLeft < 140) newLeft = 140;
    if (newLeft > totalW - 140) newLeft = totalW - 140;
    var paneEditor = panels.querySelector('.pane-editor');
    var panePreview = panels.querySelector('.pane-preview');
    if (paneEditor && panePreview) {
      paneEditor.style.flex = 'none';
      paneEditor.style.width = newLeft + 'px';
      panePreview.style.flex = '1';
      panePreview.style.width = '';
    }
  });

  document.addEventListener('mouseup', function () {
    if (!dragging) return;
    dragging = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });
}());

dom.btnNewNote.addEventListener('click', newNote);
dom.btnNewNoteEmpty.addEventListener('click', newNote);

dom.noteTitleInput.addEventListener('input', scheduleAutoSave);

dom.markdownInput.addEventListener('input', function () {
  renderPreview();
  scheduleAutoSave();
});

dom.markdownInput.addEventListener('keydown', function (e) {
  if (e.key === 'Tab') {
    e.preventDefault();
    var start = dom.markdownInput.selectionStart;
    var end = dom.markdownInput.selectionEnd;
    var val = dom.markdownInput.value;
    dom.markdownInput.value = val.slice(0, start) + '  ' + val.slice(end);
    dom.markdownInput.selectionStart = start + 2;
    dom.markdownInput.selectionEnd = start + 2;
    renderPreview();
    scheduleAutoSave();
  }
});

dom.searchInput.addEventListener('input', function (e) {
  state.searchQuery = e.target.value;
  renderNotesList();
});

dom.sortSelect.addEventListener('change', function (e) {
  state.sortOrder = e.target.value;
  renderNotesList();
});

dom.btnPin.addEventListener('click', togglePin);

dom.btnDelete.addEventListener('click', function () {
  if (state.activeNoteId) showDeleteModal(state.activeNoteId);
});

dom.modalCancel.addEventListener('click', hideDeleteModal);

dom.modalConfirm.addEventListener('click', function () {
  if (state.pendingDeleteId) {
    deleteNote(state.pendingDeleteId);
    hideDeleteModal();
  }
});

dom.modalOverlay.addEventListener('click', function (e) {
  if (e.target === dom.modalOverlay) hideDeleteModal();
});

dom.btnToggleView.addEventListener('click', cycleViewMode);

if (dom.btnTheme) {
  dom.btnTheme.addEventListener('click', toggleTheme);
}

dom.sidebarToggle.addEventListener('click', function () {
  var isOpen = dom.sidebar.classList.contains('open');
  if (isOpen) {
    closeMobileSidebar();
  } else {
    openMobileSidebar();
  }
});

if (dom.sidebarBackdrop) {
  dom.sidebarBackdrop.addEventListener('click', closeMobileSidebar);
}

document.addEventListener('keydown', function (e) {
  var meta = e.ctrlKey || e.metaKey;

  if (meta && e.key === 's') {
    e.preventDefault();
    flushSave();
    return;
  }

  if (meta && e.key === 'n') {
    e.preventDefault();
    newNote();
    return;
  }

  if (e.key === 'Escape') {
    if (!dom.modalOverlay.classList.contains('hidden')) {
      hideDeleteModal();
    } else if (dom.sidebar.classList.contains('open')) {
      closeMobileSidebar();
    }
  }
});

function init() {
  applyTheme(getInitialTheme());

  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
      if (!localStorage.getItem(THEME_KEY)) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  var isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
  var shortcutHint = document.querySelector('.shortcut-hint');
  if (shortcutHint) {
    shortcutHint.textContent = isMac ? '⌘S to save' : 'Ctrl+S to save';
  }
  if (dom.btnNewNote) {
    dom.btnNewNote.title = isMac ? 'New Note (⌘N)' : 'New Note (Ctrl+N)';
  }

  // Load from IndexedDB, migrating localStorage notes if first run.
  dbGetAllNotes().then(function (storedNotes) {
    if (storedNotes && storedNotes.length > 0) {
      state.notes = storedNotes.filter(function (n) {
        if (n.title === 'Project Ideas' && n.content.indexOf('Command-line task manager') !== -1) {
          dbDeleteNote(n.id);
          return false;
        }
        return true;
      });
    } else {
      var fallback = loadFromFallback();
      if (fallback && fallback.length > 0) {
        state.notes = fallback.filter(function (n) {
          return !(n.title === 'Project Ideas' && n.content.indexOf('Command-line task manager') !== -1);
        });
        dbSaveAllNotes(state.notes);
      } else {
        seedSampleNotes();
      }
    }

    renderNotesList();

    if (state.notes.length > 0) {
      var best = state.notes.slice().sort(function (a, b) {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return b.modifiedAt - a.modifiedAt;
      })[0];
      selectNote(best.id);
    } else {
      dom.emptyState.classList.remove('hidden');
      dom.noteEditor.classList.add('hidden');
    }
  });
}

init();
