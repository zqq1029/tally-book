# Love Diary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal web diary app for recording daily moments with girlfriend — photos, text, mood tracking, and a "days together" counter.

**Architecture:** Single-page vanilla HTML/CSS/JS app. IndexedDB for diary entries (with base64 photos), localStorage for settings. Modular JS files: storage (data layer), calendar (month grid), diary (cards + editor), app (wiring). Zero dependencies, opens via `index.html` directly.

**Tech Stack:** HTML5, CSS3, Vanilla JavaScript (ES6+), IndexedDB API, Canvas API (photo compression)

---

## File Map

| File | Responsibility |
|---|---|
| `index.html` | Page structure, modal skeletons |
| `css/style.css` | All styles, responsive design, animations |
| `js/storage.js` | IndexedDB CRUD, localStorage settings, photo compression |
| `js/calendar.js` | Month grid rendering, day selection, highlight logic |
| `js/diary.js` | Card list rendering, editor modal, photo viewer |
| `js/app.js` | Init, event wiring, day counter, top-level orchestration |

Interfaces:
- `storage.js` exposes: `openDB()`, `addEntry(entry)`, `getEntriesByDate(date)`, `getAllEntries()`, `updateEntry(id, entry)`, `deleteEntry(id)`, `getSettings()`, `saveSettings(settings)`
- `calendar.js` exposes: `renderCalendar(year, month, entries, onDayClick)`, `getSelectedDate()`, `setSelectedDate(date)`
- `diary.js` exposes: `renderDiaryList(date, entries, onEdit, onDelete, onAdd)`, `openEditor(date, entry, onSave, onCancel)`, `showPhotoViewer(photos)`
- `app.js` consumes all three modules

---

### Task 1: Set up directory structure and HTML skeleton

**Files:**
- Create: `index.html`
- Create: `css/style.css`
- Create: `js/storage.js`
- Create: `js/calendar.js`
- Create: `js/diary.js`
- Create: `js/app.js`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p e:/demo/css e:/demo/js
touch e:/demo/css/style.css e:/demo/js/storage.js e:/demo/js/calendar.js e:/demo/js/diary.js e:/demo/js/app.js
```

- [ ] **Step 2: Write index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>我们的日子</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <!-- Day Counter Header -->
  <header id="header">
    <div class="header-content">
      <span class="heart-icon"></span>
      <div id="day-counter">
        <span class="counter-label">我们已经在一起</span>
        <span class="counter-number" id="days-count">--</span>
        <span class="counter-label">天</span>
      </div>
      <button class="settings-btn" id="settings-btn" title="设置起始日期"></button>
    </div>
  </header>

  <!-- Calendar Section -->
  <section id="calendar-section">
    <div class="calendar-header">
      <button id="prev-month">&lt;</button>
      <span id="month-year-label">2026年5月</span>
      <button id="next-month">&gt;</button>
    </div>
    <div class="calendar-weekdays">
      <span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span>
    </div>
    <div class="calendar-grid" id="calendar-grid"></div>
  </section>

  <!-- Diary Section -->
  <section id="diary-section">
    <div class="diary-header">
      <h2 id="diary-date-label">5月28日</h2>
      <button id="add-entry-btn">+ 记录今天</button>
    </div>
    <div id="diary-list"></div>
    <div class="diary-empty" id="diary-empty">
      <p>这天还没有记录</p>
      <button id="add-entry-empty-btn">记录此刻的心情吧</button>
    </div>
  </section>

  <!-- Settings Modal -->
  <div class="modal-overlay" id="settings-modal">
    <div class="modal-content">
      <h3>设置起始日期</h3>
      <p>选择我们在一起的起始日期</p>
      <input type="date" id="start-date-input">
      <div class="modal-actions">
        <button class="btn-cancel" id="settings-cancel">取消</button>
        <button class="btn-save" id="settings-save">保存</button>
      </div>
    </div>
  </div>

  <!-- Editor Modal -->
  <div class="modal-overlay" id="editor-modal">
    <div class="modal-content modal-editor">
      <h3 id="editor-title">记录此刻</h3>
      <div class="mood-selector" id="mood-selector">
        <button class="mood-btn" data-mood="happy">&#x1F60A;</button>
        <button class="mood-btn" data-mood="love">&#x1F60D;</button>
        <button class="mood-btn" data-mood="excited">&#x1F606;</button>
        <button class="mood-btn" data-mood="normal">&#x1F642;</button>
        <button class="mood-btn" data-mood="sad">&#x1F622;</button>
        <button class="mood-btn" data-mood="miss">&#x1F97A;</button>
      </div>
      <textarea id="editor-content" placeholder="今天发生了什么..."></textarea>
      <div class="photo-upload-area">
        <div class="photo-previews" id="photo-previews"></div>
        <label class="add-photo-btn" id="add-photo-label">
          + 添加照片
          <input type="file" id="photo-input" accept="image/*" hidden multiple>
        </label>
      </div>
      <div class="modal-actions">
        <button class="btn-cancel" id="editor-cancel">取消</button>
        <button class="btn-save" id="editor-save">保存</button>
      </div>
    </div>
  </div>

  <!-- Photo Viewer Modal -->
  <div class="modal-overlay" id="photo-viewer">
    <div class="photo-viewer-content">
      <button class="photo-viewer-close" id="photo-viewer-close">&times;</button>
      <img id="photo-viewer-img" src="" alt="照片">
      <div class="photo-viewer-nav">
        <button id="photo-prev">&lt;</button>
        <span id="photo-index">1/4</span>
        <button id="photo-next">&gt;</button>
      </div>
    </div>
  </div>

  <script src="js/storage.js"></script>
  <script src="js/calendar.js"></script>
  <script src="js/diary.js"></script>
  <script src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 3: Verify HTML structure**

Open `index.html` in a browser. Verify all sections are visible as raw elements. No JS yet, so calendar grid and diary list will be empty. That's expected.

- [ ] **Step 4: Commit**

```bash
git add index.html css/style.css js/storage.js js/calendar.js js/diary.js js/app.js
git commit -m "feat: add HTML skeleton for love diary app"
```

---

### Task 2: Write CSS styles

**Files:**
- Modify: `css/style.css`

- [ ] **Step 1: Write complete stylesheet**

```css
/* === Reset & Base === */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --pink: #ff6b9d;
  --pink-light: #ffe0eb;
  --pink-lighter: #fff0f5;
  --text: #333;
  --text-light: #888;
  --bg: #fafafa;
  --white: #fff;
  --shadow: 0 2px 12px rgba(0,0,0,0.08);
  --radius: 12px;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: var(--bg);
  color: var(--text);
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
  padding-bottom: 40px;
  -webkit-tap-highlight-color: transparent;
}

/* === Header === */
#header {
  background: linear-gradient(135deg, var(--pink), #ff8e8e);
  color: white;
  padding: 28px 20px 24px;
  text-align: center;
  position: relative;
  border-radius: 0 0 24px 24px;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.heart-icon::before {
  content: "💕";
  font-size: 28px;
  animation: heartbeat 1.2s ease-in-out infinite;
}

@keyframes heartbeat {
  0%, 100% { transform: scale(1); }
  15% { transform: scale(1.2); }
  30% { transform: scale(1); }
  45% { transform: scale(1.15); }
  60% { transform: scale(1); }
}

#day-counter {
  cursor: pointer;
  user-select: none;
  transition: transform 0.2s;
}

#day-counter:hover { transform: scale(1.05); }

.counter-label { font-size: 14px; opacity: 0.9; display: block; }

.counter-number {
  font-size: 52px;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -1px;
}

.settings-btn {
  position: absolute;
  right: 16px;
  top: 16px;
  background: rgba(255,255,255,0.2);
  border: none;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
  transition: background 0.2s;
}

.settings-btn:hover { background: rgba(255,255,255,0.35); }

.settings-btn::before { content: "⚙"; }

/* === Calendar === */
#calendar-section {
  background: var(--white);
  margin: 16px;
  border-radius: var(--radius);
  padding: 16px;
  box-shadow: var(--shadow);
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.calendar-header button {
  background: var(--pink-lighter);
  border: none;
  color: var(--pink);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  font-weight: bold;
  transition: background 0.2s;
}

.calendar-header button:hover { background: var(--pink-light); }

#month-year-label {
  font-size: 16px;
  font-weight: 600;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  font-size: 12px;
  color: var(--text-light);
  margin-bottom: 8px;
  padding: 4px 0;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.calendar-day {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.15s;
  position: relative;
}

.calendar-day:hover { background: var(--pink-lighter); }

.calendar-day.today {
  color: var(--pink);
  font-weight: 700;
  border: 2px solid var(--pink);
}

.calendar-day.selected {
  background: var(--pink);
  color: white;
  font-weight: 600;
}

.calendar-day.selected.today { border-color: white; }

.calendar-day.other-month { color: #ccc; cursor: default; }

.calendar-day.future { color: #ddd; cursor: default; pointer-events: none; }

.calendar-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--pink);
  position: absolute;
  bottom: 6px;
}

.calendar-day.selected .calendar-dot { background: white; }

/* === Diary Section === */
#diary-section {
  margin: 0 16px 16px;
}

.diary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.diary-header h2 { font-size: 18px; font-weight: 600; }

#add-entry-btn {
  background: var(--pink);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  font-weight: 500;
  transition: opacity 0.2s;
}

#add-entry-btn:hover { opacity: 0.9; }

/* === Diary Cards === */
.diary-card {
  background: var(--white);
  border-radius: var(--radius);
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: var(--shadow);
  position: relative;
}

.diary-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.diary-mood { font-size: 28px; }

.diary-time {
  font-size: 12px;
  color: var(--text-light);
}

.diary-content {
  font-size: 15px;
  line-height: 1.6;
  margin-bottom: 10px;
  white-space: pre-wrap;
}

.diary-photos {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 6px;
  margin-bottom: 10px;
}

.diary-photo {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.15s;
}

.diary-photo:hover { transform: scale(1.03); }

.diary-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.diary-actions button {
  background: none;
  border: 1px solid #eee;
  padding: 4px 12px;
  border-radius: 14px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-light);
  transition: all 0.15s;
}

.diary-actions button:hover {
  background: var(--pink-lighter);
  color: var(--pink);
  border-color: var(--pink-light);
}

.diary-actions .btn-delete:hover {
  background: #fff0f0;
  color: #e74c3c;
  border-color: #ffcccc;
}

/* === Empty State === */
#diary-empty {
  text-align: center;
  padding: 48px 16px;
  color: var(--text-light);
  display: none;
}

#diary-empty p {
  font-size: 16px;
  margin-bottom: 16px;
}

#diary-empty button,
#add-entry-empty-btn {
  background: var(--pink-lighter);
  color: var(--pink);
  border: 2px dashed var(--pink-light);
  padding: 12px 24px;
  border-radius: 24px;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s;
}

#diary-empty button:hover { background: var(--pink-light); }

/* === Modal === */
.modal-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  z-index: 100;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-overlay.active { display: flex; }

.modal-content {
  background: var(--white);
  border-radius: 16px;
  padding: 24px;
  width: 100%;
  max-width: 420px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
}

.modal-content h3 {
  font-size: 18px;
  margin-bottom: 12px;
  text-align: center;
}

.modal-content p { color: var(--text-light); font-size: 14px; margin-bottom: 16px; text-align: center; }

/* === Settings Modal === */
#start-date-input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 15px;
  text-align: center;
}

/* === Editor Modal === */
.modal-editor { max-width: 440px; }

.mood-selector {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 16px;
}

.mood-btn {
  font-size: 32px;
  background: none;
  border: 3px solid transparent;
  border-radius: 50%;
  width: 52px;
  height: 52px;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.mood-btn:hover { background: var(--pink-lighter); transform: scale(1.1); }

.mood-btn.selected {
  border-color: var(--pink);
  background: var(--pink-lighter);
  transform: scale(1.15);
}

#editor-content {
  width: 100%;
  min-height: 100px;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 12px;
  font-size: 15px;
  font-family: inherit;
  resize: vertical;
  margin-bottom: 12px;
}

#editor-content:focus { outline: none; border-color: var(--pink); }

.photo-upload-area { margin-bottom: 16px; }

.photo-previews {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 8px;
}

.photo-preview-item {
  aspect-ratio: 1;
  position: relative;
  border-radius: 8px;
  overflow: hidden;
}

.photo-preview-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-preview-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 22px;
  height: 22px;
  background: rgba(0,0,0,0.5);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
}

.add-photo-btn {
  display: block;
  text-align: center;
  padding: 10px;
  border: 2px dashed #ddd;
  border-radius: 8px;
  color: var(--text-light);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.15s;
}

.add-photo-btn:hover { border-color: var(--pink); color: var(--pink); }

/* === Modal Actions === */
.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 16px;
}

.btn-cancel, .btn-save {
  padding: 10px 24px;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.15s;
}

.btn-cancel {
  background: #f0f0f0;
  border: none;
  color: var(--text);
}

.btn-cancel:hover { background: #e0e0e0; }

.btn-save {
  background: var(--pink);
  border: none;
  color: white;
}

.btn-save:hover { opacity: 0.9; }

/* === Photo Viewer === */
#photo-viewer .photo-viewer-content {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
}

#photo-viewer-img {
  max-width: 90vw;
  max-height: 80vh;
  object-fit: contain;
  border-radius: 8px;
}

.photo-viewer-close {
  position: absolute;
  top: -12px;
  right: -12px;
  width: 36px;
  height: 36px;
  background: var(--white);
  border: none;
  border-radius: 50%;
  font-size: 24px;
  cursor: pointer;
  box-shadow: var(--shadow);
  color: var(--text);
  z-index: 1;
}

.photo-viewer-nav {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 12px;
}

.photo-viewer-nav button {
  background: rgba(255,255,255,0.8);
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
}

.photo-viewer-nav span { color: white; font-size: 14px; }

/* === Confirm Dialog === */
.confirm-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 200;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.confirm-overlay.active { display: flex; }

.confirm-box {
  background: white;
  border-radius: 16px;
  padding: 24px;
  text-align: center;
  max-width: 320px;
  width: 100%;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
}

.confirm-box p { margin-bottom: 20px; font-size: 16px; }

.confirm-box .confirm-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

/* === Responsive === */
@media (min-width: 600px) {
  body { padding-top: 16px; }
  #header { border-radius: 24px; margin: 0 16px; }
}
```

- [ ] **Step 2: Verify styles**

Open `index.html` in a browser. Header gradient, calendar card, diary section should all be styled. Modals are hidden by default. Pink theme throughout.

- [ ] **Step 3: Commit**

```bash
git add css/style.css
git commit -m "feat: add complete stylesheet with pink theme"
```

---

### Task 3: Implement storage layer

**Files:**
- Modify: `js/storage.js`

- [ ] **Step 1: Write storage.js**

```javascript
// === Photo compression utility ===
function compressPhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const maxW = 800;
        if (width > maxW) {
          height = Math.round(height * (maxW / width));
          width = maxW;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// === IndexedDB ===
const DB_NAME = 'loveDiary';
const DB_VERSION = 1;
const STORE_NAME = 'entries';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = function(e) {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('date', 'date', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    request.onsuccess = function(e) { resolve(e.target.result); };
    request.onerror = function(e) { reject(e.target.error); };
  });
}

function addEntry(entry) {
  return openDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.add(entry);
      request.onsuccess = function(e) { resolve(e.target.result); };
      request.onerror = function(e) { reject(e.target.error); };
      tx.oncomplete = function() { db.close(); };
    });
  });
}

function getEntriesByDate(date) {
  return openDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('date');
      const request = index.getAll(date);
      request.onsuccess = function(e) {
        const results = e.target.result || [];
        results.sort(function(a, b) { return b.createdAt.localeCompare(a.createdAt); });
        resolve(results);
      };
      request.onerror = function(e) { reject(e.target.error); };
      tx.oncomplete = function() { db.close(); };
    });
  });
}

function getAllEntries() {
  return openDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = function(e) { resolve(e.target.result || []); };
      request.onerror = function(e) { reject(e.target.error); };
      tx.oncomplete = function() { db.close(); };
    });
  });
}

function updateEntry(id, entry) {
  return openDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(Object.assign({}, entry, { id: id }));
      request.onsuccess = function(e) { resolve(e.target.result); };
      request.onerror = function(e) { reject(e.target.error); };
      tx.oncomplete = function() { db.close(); };
    });
  });
}

function deleteEntry(id) {
  return openDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = function() { resolve(); };
      request.onerror = function(e) { reject(e.target.error); };
      tx.oncomplete = function() { db.close(); };
    });
  });
}

// === localStorage Settings ===
const SETTINGS_KEY = 'love-diary-settings';

function getSettings() {
  try {
    var raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : { startDate: '' };
  } catch (e) {
    return { startDate: '' };
  }
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
```

- [ ] **Step 2: Quick smoke test in browser console**

Open `index.html`, press F12 for DevTools console, run:

```javascript
// Test: this should return a Promise that resolves with undefined (no entries yet)
getAllEntries().then(entries => console.log('Entries:', entries, 'Count:', entries.length));
// Test: settings should work
saveSettings({ startDate: '2024-01-15' });
console.log('Settings:', getSettings());
// Expected: { startDate: '2024-01-15' }
```

- [ ] **Step 3: Commit**

```bash
git add js/storage.js
git commit -m "feat: add storage layer (IndexedDB + localStorage)"
```

---

### Task 4: Implement calendar component

**Files:**
- Modify: `js/calendar.js`

- [ ] **Step 1: Write calendar.js**

```javascript
var Calendar = (function() {
  var selectedDate = formatDate(new Date());
  var currentYear, currentMonth;
  var onDayClickCallback = null;

  function formatDate(date) {
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, '0');
    var d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  // Build a set of dates that have entries, for dot rendering
  function buildEntrySet(entries) {
    var set = {};
    (entries || []).forEach(function(e) { set[e.date] = true; });
    return set;
  }

  function isToday(year, month, day) {
    var now = new Date();
    return year === now.getFullYear() && month === now.getMonth() && day === now.getDate();
  }

  function isFuture(year, month, day) {
    var now = new Date();
    var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var cellDate = new Date(year, month, day);
    return cellDate > todayStart;
  }

  function renderCalendar(year, month, entries, onDayClick) {
    currentYear = year;
    currentMonth = month;
    onDayClickCallback = onDayClick;
    var grid = document.getElementById('calendar-grid');
    var label = document.getElementById('month-year-label');
    label.textContent = year + '年' + (month + 1) + '月';

    grid.innerHTML = '';
    var entrySet = buildEntrySet(entries);

    var firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var daysInPrevMonth = new Date(year, month, 0).getDate();

    // Previous month filler
    for (var i = firstDay - 1; i >= 0; i--) {
      var dayNum = daysInPrevMonth - i;
      var cell = createDayCell(dayNum, 'other-month', null);
      grid.appendChild(cell);
    }

    // Current month
    for (var day = 1; day <= daysInMonth; day++) {
      var classes = [];
      var dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
      var hasEntry = entrySet[dateStr];

      if (isToday(year, month, day)) classes.push('today');
      if (dateStr === selectedDate) classes.push('selected');
      if (isFuture(year, month, day)) classes.push('future');

      var cell = createDayCell(day, classes.join(' '), hasEntry ? dateStr : null);
      cell.addEventListener('click', function(ds, d, m, y) {
        return function() {
          if (isFuture(y, m, d)) return;
          selectedDate = ds;
          renderCalendar(y, m, entries, onDayClickCallback);
          if (onDayClickCallback) onDayClickCallback(ds);
        };
      }(dateStr, day, month, year));
      grid.appendChild(cell);
    }

    // Fill remaining cells
    var totalCells = firstDay + daysInMonth;
    var remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (var j = 1; j <= remaining; j++) {
      var cell = createDayCell(j, 'other-month', null);
      grid.appendChild(cell);
    }
  }

  function createDayCell(day, classes, entryDate) {
    var cell = document.createElement('div');
    cell.className = 'calendar-day' + (classes ? ' ' + classes : '');
    cell.textContent = day;
    if (entryDate) {
      var dot = document.createElement('div');
      dot.className = 'calendar-dot';
      cell.appendChild(dot);
    }
    return cell;
  }

  function getSelectedDate() { return selectedDate; }

  function setSelectedDate(dateStr) {
    selectedDate = dateStr;
  }

  function getCurrentPeriod() {
    return { year: currentYear, month: currentMonth };
  }

  return {
    renderCalendar: renderCalendar,
    getSelectedDate: getSelectedDate,
    setSelectedDate: setSelectedDate,
    formatDate: formatDate,
    getCurrentPeriod: getCurrentPeriod
  };
})();
```

- [ ] **Step 2: Smoke test in console**

```javascript
// Render current month with no entries
Calendar.renderCalendar(2026, 4, [], function(date) { console.log('Clicked:', date); });
console.log('Selected:', Calendar.getSelectedDate());
// Expected: today's date string
```

- [ ] **Step 3: Commit**

```bash
git add js/calendar.js
git commit -m "feat: add calendar month grid component"
```

---

### Task 5: Implement diary component (cards + editor)

**Files:**
- Modify: `js/diary.js`

- [ ] **Step 1: Write diary.js**

```javascript
var Diary = (function() {
  // === Constants ===
  var MOOD_LABELS = {
    happy: '😊',    // 😊
    love: '😍',     // 😍
    excited: '😆',  // 😆
    normal: '🙂',   // 🙂
    sad: '😢',      // 😢
    miss: '🥺'      // 🥺
  };

  var currentOnEdit = null;
  var currentOnDelete = null;
  var currentOnAdd = null;
  var currentOnSave = null;
  var currentOnCancel = null;
  var editingEntryId = null;
  var editingDate = null;
  var currentPhotos = []; // base64 strings for editor
  var selectedMood = 'happy';

  // === Helpers ===
  function formatDisplayDate(dateStr) {
    var parts = dateStr.split('-');
    return parseInt(parts[1]) + '月' + parseInt(parts[2]) + '日';
  }

  function formatTime(isoStr) {
    var d = new Date(isoStr);
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  // === Diary List ===
  function renderDiaryList(date, entries, onEdit, onDelete, onAdd) {
    currentOnEdit = onEdit;
    currentOnDelete = onDelete;
    currentOnAdd = onAdd;

    var list = document.getElementById('diary-list');
    var empty = document.getElementById('diary-empty');
    var label = document.getElementById('diary-date-label');
    var addBtn = document.getElementById('add-entry-btn');
    var emptyAddBtn = document.getElementById('add-entry-empty-btn');

    label.textContent = formatDisplayDate(date);
    list.innerHTML = '';

    // Wire add buttons
    addBtn.onclick = function() { if (onAdd) onAdd(date); };
    emptyAddBtn.onclick = function() { if (onAdd) onAdd(date); };

    if (!entries || entries.length === 0) {
      list.style.display = 'none';
      empty.style.display = 'block';
      // Only show empty add if date is not future
      var today = Calendar.formatDate(new Date());
      empty.style.display = date > today ? 'none' : 'block';
      return;
    }

    list.style.display = 'block';
    empty.style.display = 'none';

    entries.forEach(function(entry) {
      var card = document.createElement('div');
      card.className = 'diary-card';

      // Header: mood + time
      var header = document.createElement('div');
      header.className = 'diary-card-header';
      var moodSpan = document.createElement('span');
      moodSpan.className = 'diary-mood';
      moodSpan.textContent = MOOD_LABELS[entry.mood] || MOOD_LABELS.happy;
      var timeSpan = document.createElement('span');
      timeSpan.className = 'diary-time';
      timeSpan.textContent = formatTime(entry.createdAt);
      header.appendChild(moodSpan);
      header.appendChild(timeSpan);

      // Content
      var contentDiv = document.createElement('div');
      contentDiv.className = 'diary-content';
      contentDiv.textContent = entry.content;

      // Photos
      var photosDiv = document.createElement('div');
      photosDiv.className = 'diary-photos';
      if (entry.photos && entry.photos.length > 0) {
        entry.photos.forEach(function(photo, idx) {
          var img = document.createElement('img');
          img.className = 'diary-photo';
          img.src = photo;
          img.alt = '照片' + (idx + 1);
          img.addEventListener('click', function() {
            showPhotoViewer(entry.photos, idx);
          });
          photosDiv.appendChild(img);
        });
      }

      // Actions: edit + delete
      var actionsDiv = document.createElement('div');
      actionsDiv.className = 'diary-actions';
      var editBtn = document.createElement('button');
      editBtn.textContent = '编辑';
      editBtn.addEventListener('click', function() {
        if (onEdit) onEdit(entry);
      });
      var deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-delete';
      deleteBtn.textContent = '删除';
      deleteBtn.addEventListener('click', function() {
        if (onDelete) onDelete(entry);
      });
      actionsDiv.appendChild(editBtn);
      actionsDiv.appendChild(deleteBtn);

      card.appendChild(header);
      card.appendChild(contentDiv);
      card.appendChild(photosDiv);
      card.appendChild(actionsDiv);
      list.appendChild(card);
    });
  }

  // === Editor Modal ===
  function openEditor(date, entry, onSave, onCancel) {
    editingDate = date;
    editingEntryId = entry ? entry.id : null;
    currentOnSave = onSave;
    currentOnCancel = onCancel;

    var modal = document.getElementById('editor-modal');
    var title = document.getElementById('editor-title');
    var content = document.getElementById('editor-content');
    var moodSelector = document.getElementById('mood-selector');

    title.textContent = entry ? '编辑记录' : '记录此刻';
    content.value = entry ? entry.content : '';
    selectedMood = entry ? entry.mood : 'happy';
    currentPhotos = entry && entry.photos ? entry.photos.slice() : [];

    // Mood selection
    moodSelector.querySelectorAll('.mood-btn').forEach(function(btn) {
      btn.classList.toggle('selected', btn.dataset.mood === selectedMood);
    });

    renderPhotoPreviews();
    updateAddPhotoButton();
    modal.classList.add('active');
  }

  function closeEditor() {
    document.getElementById('editor-modal').classList.remove('active');
    if (currentOnCancel) currentOnCancel();
  }

  function handleEditorSave() {
    var content = document.getElementById('editor-content').value.trim();
    if (!content && currentPhotos.length === 0) {
      alert('请至少写点文字或者添加一张照片吧~');
      return;
    }
    var entry = {
      date: editingDate,
      content: content,
      mood: selectedMood,
      photos: currentPhotos.slice(),
      createdAt: new Date().toISOString()
    };
    if (currentOnSave) currentOnSave(editingEntryId, entry);
  }

  // === Photo previews in editor ===
  function renderPhotoPreviews() {
    var container = document.getElementById('photo-previews');
    container.innerHTML = '';
    currentPhotos.forEach(function(photo, idx) {
      var item = document.createElement('div');
      item.className = 'photo-preview-item';
      var img = document.createElement('img');
      img.src = photo;
      var removeBtn = document.createElement('button');
      removeBtn.className = 'photo-preview-remove';
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', function() {
        currentPhotos.splice(idx, 1);
        renderPhotoPreviews();
        updateAddPhotoButton();
      });
      item.appendChild(img);
      item.appendChild(removeBtn);
      container.appendChild(item);
    });
  }

  function updateAddPhotoButton() {
    var label = document.getElementById('add-photo-label');
    label.style.display = currentPhotos.length >= 4 ? 'none' : 'block';
  }

  function handlePhotoAdd(files) {
    var remaining = 4 - currentPhotos.length;
    var toProcess = Array.from(files).slice(0, remaining);
    if (toProcess.length === 0) return;
    var promises = toProcess.map(function(f) { return compressPhoto(f); });
    Promise.all(promises).then(function(results) {
      currentPhotos = currentPhotos.concat(results);
      renderPhotoPreviews();
      updateAddPhotoButton();
    }).catch(function(err) {
      console.error('Photo compression failed:', err);
      alert('照片处理失败，请重试');
    });
  }

  // === Photo Viewer ===
  var viewerPhotos = [];
  var viewerIndex = 0;

  function showPhotoViewer(photos, startIdx) {
    viewerPhotos = photos;
    viewerIndex = startIdx || 0;
    updateViewerImage();
    document.getElementById('photo-viewer').classList.add('active');
  }

  function updateViewerImage() {
    document.getElementById('photo-viewer-img').src = viewerPhotos[viewerIndex];
    document.getElementById('photo-index').textContent =
      (viewerIndex + 1) + '/' + viewerPhotos.length;
  }

  function viewerPrev() {
    viewerIndex = viewerIndex > 0 ? viewerIndex - 1 : viewerPhotos.length - 1;
    updateViewerImage();
  }

  function viewerNext() {
    viewerIndex = viewerIndex < viewerPhotos.length - 1 ? viewerIndex + 1 : 0;
    updateViewerImage();
  }

  function closeViewer() {
    document.getElementById('photo-viewer').classList.remove('active');
  }

  return {
    renderDiaryList: renderDiaryList,
    openEditor: openEditor,
    closeEditor: closeEditor,
    handleEditorSave: handleEditorSave,
    handlePhotoAdd: handlePhotoAdd,
    showPhotoViewer: showPhotoViewer,
    viewerPrev: viewerPrev,
    viewerNext: viewerNext,
    closeViewer: closeViewer,
    getSelectedMood: function() { return selectedMood; },
    setSelectedMood: function(m) { selectedMood = m; },
    getCurrentPhotos: function() { return currentPhotos; }
  };
})();
```

- [ ] **Step 2: Smoke test in console**

```javascript
// Test rendering empty diary list
Diary.renderDiaryList('2026-05-28', [], null, null, function(date) { console.log('Add for', date); });
// Empty state should show
```

- [ ] **Step 3: Commit**

```bash
git add js/diary.js
git commit -m "feat: add diary cards and editor modal component"
```

---

### Task 6: Implement main app (wiring)

**Files:**
- Modify: `js/app.js`

- [ ] **Step 1: Write app.js**

```javascript
(function() {
  'use strict';

  var allEntries = [];

  // === Day Counter ===
  function updateDayCounter() {
    var settings = getSettings();
    var counter = document.getElementById('days-count');
    if (!settings.startDate) {
      counter.textContent = '--';
      counter.title = '点击设置起始日期';
      return;
    }
    var start = new Date(settings.startDate + 'T00:00:00');
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var diff = Math.floor((today - start) / (1000 * 60 * 60 * 24));
    if (diff < 0) diff = 0;
    counter.textContent = diff;
  }

  // === Load entries ===
  function loadEntries() {
    return getAllEntries().then(function(entries) {
      allEntries = entries;
      return entries;
    });
  }

  // === Refresh UI ===
  function refreshAll() {
    updateDayCounter();
    var period = Calendar.getCurrentPeriod();
    var year = period.year || new Date().getFullYear();
    var month = period.month !== undefined ? period.month : new Date().getMonth();
    Calendar.renderCalendar(year, month, allEntries, onDayClick);
    loadDiaryForDate(Calendar.getSelectedDate());
  }

  function loadDiaryForDate(dateStr) {
    getEntriesByDate(dateStr).then(function(entries) {
      Diary.renderDiaryList(dateStr, entries, onEdit, onDelete, onAdd);
    });
  }

  // === Event Handlers ===
  function onDayClick(dateStr) {
    loadDiaryForDate(dateStr);
  }

  function onAdd(dateStr) {
    Diary.openEditor(dateStr, null, onSave, onCancel);
  }

  function onEdit(entry) {
    Diary.openEditor(entry.date, entry, onSave, onCancel);
  }

  function onDelete(entry) {
    showConfirm('确定要删除这条记录吗？删除后无法恢复。', function() {
      deleteEntry(entry.id).then(function() {
        return loadEntries();
      }).then(function() {
        refreshAll();
      });
    });
  }

  function onSave(editingId, entryData) {
    var promise = editingId
      ? updateEntry(editingId, entryData)
      : addEntry(entryData);
    promise.then(function() {
      Diary.closeEditor();
      return loadEntries();
    }).then(function() {
      refreshAll();
    });
  }

  function onCancel() {
    // nothing extra needed
  }

  // === Confirm Dialog ===
  function showConfirm(message, onConfirm) {
    // Remove existing confirm if any
    var existing = document.querySelector('.confirm-overlay');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.className = 'confirm-overlay active';
    var box = document.createElement('div');
    box.className = 'confirm-box';
    var p = document.createElement('p');
    p.textContent = message;
    var actions = document.createElement('div');
    actions.className = 'confirm-actions';
    var cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-cancel';
    cancelBtn.textContent = '取消';
    var okBtn = document.createElement('button');
    okBtn.className = 'btn-save';
    okBtn.textContent = '确定';
    okBtn.style.background = '#e74c3c';

    cancelBtn.addEventListener('click', function() { overlay.remove(); });
    okBtn.addEventListener('click', function() {
      overlay.remove();
      if (onConfirm) onConfirm();
    });

    actions.appendChild(cancelBtn);
    actions.appendChild(okBtn);
    box.appendChild(p);
    box.appendChild(actions);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.remove();
    });
  }

  // === Settings Modal ===
  function openSettings() {
    var modal = document.getElementById('settings-modal');
    var input = document.getElementById('start-date-input');
    var settings = getSettings();
    input.value = settings.startDate || '';
    modal.classList.add('active');
  }

  function closeSettings() {
    document.getElementById('settings-modal').classList.remove('active');
  }

  function saveSettingsHandler() {
    var input = document.getElementById('start-date-input');
    var dateVal = input.value;
    if (!dateVal) {
      alert('请选择一个日期');
      return;
    }
    var today = Calendar.formatDate(new Date());
    if (dateVal > today) {
      alert('起始日期不能晚于今天哦');
      return;
    }
    saveSettings({ startDate: dateVal });
    closeSettings();
    updateDayCounter();
  }

  // === Editor modal events (delegated) ===
  function setupEditorEvents() {
    // Mood selector
    document.getElementById('mood-selector').addEventListener('click', function(e) {
      var btn = e.target.closest('.mood-btn');
      if (!btn) return;
      document.querySelectorAll('#mood-selector .mood-btn').forEach(function(b) {
        b.classList.remove('selected');
      });
      btn.classList.add('selected');
      Diary.setSelectedMood(btn.dataset.mood);
    });

    // Photo input
    document.getElementById('photo-input').addEventListener('change', function(e) {
      if (e.target.files.length > 0) {
        Diary.handlePhotoAdd(e.target.files);
        e.target.value = '';
      }
    });

    // Save / Cancel
    document.getElementById('editor-save').addEventListener('click', Diary.handleEditorSave);
    document.getElementById('editor-cancel').addEventListener('click', Diary.closeEditor);
  }

  function setupSettingsEvents() {
    document.getElementById('settings-btn').addEventListener('click', openSettings);
    document.getElementById('day-counter').addEventListener('click', openSettings);
    document.getElementById('settings-save').addEventListener('click', saveSettingsHandler);
    document.getElementById('settings-cancel').addEventListener('click', closeSettings);
  }

  function setupPhotoViewerEvents() {
    document.getElementById('photo-viewer-close').addEventListener('click', function() {
      document.getElementById('photo-viewer').classList.remove('active');
    });
    document.getElementById('photo-viewer').addEventListener('click', function(e) {
      if (e.target === this) this.classList.remove('active');
    });
    document.getElementById('photo-prev').addEventListener('click', Diary.viewerPrev);
    document.getElementById('photo-next').addEventListener('click', Diary.viewerNext);
  }

  function setupCalendarNav() {
    document.getElementById('prev-month').addEventListener('click', function() {
      var period = Calendar.getCurrentPeriod();
      var m = period.month - 1;
      var y = period.year;
      if (m < 0) { m = 11; y--; }
      Calendar.renderCalendar(y, m, allEntries, onDayClick);
    });
    document.getElementById('next-month').addEventListener('click', function() {
      var period = Calendar.getCurrentPeriod();
      var m = period.month + 1;
      var y = period.year;
      if (m > 11) { m = 0; y++; }
      Calendar.renderCalendar(y, m, allEntries, onDayClick);
    });
  }

  // Close modals on ESC
  function setupKeyboard() {
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(function(m) {
          m.classList.remove('active');
        });
        var confirmOverlay = document.querySelector('.confirm-overlay');
        if (confirmOverlay) confirmOverlay.remove();
      }
    });
  }

  // Close modals on overlay click
  function setupOverlayClose() {
    document.querySelectorAll('.modal-overlay').forEach(function(overlay) {
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) overlay.classList.remove('active');
      });
    });
  }

  // === Init ===
  function init() {
    setupEditorEvents();
    setupSettingsEvents();
    setupPhotoViewerEvents();
    setupCalendarNav();
    setupKeyboard();
    setupOverlayClose();

    var settings = getSettings();
    if (!settings.startDate) {
      // First-time: show settings modal
      setTimeout(function() { openSettings(); }, 500);
    }

    updateDayCounter();

    var now = new Date();
    loadEntries().then(function() {
      Calendar.renderCalendar(now.getFullYear(), now.getMonth(), allEntries, onDayClick);
      loadDiaryForDate(Calendar.getSelectedDate());
    });
  }

  // Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
```

- [ ] **Step 2: Commit**

```bash
git add js/app.js
git commit -m "feat: add main app wiring (all components connected)"
```

---

### Task 7: End-to-end verification

**Files:** None (manual testing)

- [ ] **Step 1: Open index.html and test happy path**

1. Open `index.html` in Chrome/Edge
2. Settings modal should appear on first load — set a start date and save
3. Day counter should show the correct number of days
4. Click "记录今天" — editor modal opens
5. Select mood, write some text, add a photo, click save
6. Card appears in diary section with mood, text, photo thumbnail
7. Calendar shows a dot on today's date
8. Click the photo thumbnail — fullscreen viewer opens
9. Click "编辑" on a card — editor opens pre-filled, make changes, save
10. Click "删除" — confirm dialog appears, confirm, card is removed

- [ ] **Step 2: Test edge cases**

- [ ] Navigate to a past month with no entries — days should not have dots
- [ ] Navigate to a future month — future days should be non-clickable
- [ ] Select a day with no entries — empty state "这天还没有记录" shows
- [ ] Try to add a photo to a day beyond the 4-photo limit — button should be hidden
- [ ] Try to save with no text and no photo — alert "请至少写点文字或者添加一张照片吧~"
- [ ] Set start date in the future — alert "起始日期不能晚于今天哦"
- [ ] Press ESC to close modals
- [ ] Click overlay backdrop to close modals
- [ ] Test on mobile viewport (Chrome DevTools device toolbar, 375px width)

- [ ] **Step 3: Commit if any fixes were made**

```bash
git add -A
git commit -m "fix: edge case adjustments from verification pass"
```

---

### Task 8: Final polish

**Files:**
- Modify: `index.html`
- Modify: `css/style.css`
- Modify: `js/app.js`

- [ ] **Step 1: Add favicon to index.html `<head>`**

```html
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💕</text></svg>">
```

- [ ] **Step 2: Add storage usage warning in app.js**

Add after `handlePhotoAdd` in `app.js`:

```javascript
function estimateStorageUsage() {
  var total = allEntries.reduce(function(sum, entry) {
    var textSize = (entry.content || '').length * 2; // UTF-16
    var photoSize = (entry.photos || []).reduce(function(s, p) { return s + p.length; }, 0);
    return sum + textSize + photoSize;
  }, 0);
  return total;
}
```

And check in `onSave` before saving with photos:

```javascript
if (entryData.photos && entryData.photos.length > 0) {
  var estimated = estimateStorageUsage() + entryData.photos.reduce(function(s, p) { return s + p.length; }, 0);
  if (estimated > 50 * 1024 * 1024) {
    alert('存储空间可能不足（超过 50MB），建议清理一些旧照片后再添加。');
  }
}
```

- [ ] **Step 3: Verify final app**

Full run through all features on both desktop and mobile viewport.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: add favicon and storage usage warning"
```
