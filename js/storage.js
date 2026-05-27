// === Photo compression utility ===
function compressPhoto(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var img = new Image();
      img.onload = function() {
        var canvas = document.createElement('canvas');
        var width = img.width;
        var height = img.height;
        var maxW = 800;
        if (width > maxW) {
          height = Math.round(height * (maxW / width));
          width = maxW;
        }
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext('2d');
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
var DB_NAME = 'loveDiary';
var DB_VERSION = 1;
var STORE_NAME = 'entries';

function openDB() {
  return new Promise(function(resolve, reject) {
    var request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = function(e) {
      var db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        var store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
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
      var tx = db.transaction(STORE_NAME, 'readwrite');
      var store = tx.objectStore(STORE_NAME);
      var request = store.add(entry);
      request.onsuccess = function(e) { resolve(e.target.result); };
      request.onerror = function(e) { reject(e.target.error); };
      tx.oncomplete = function() { db.close(); };
      tx.onabort = function() { db.close(); };
    });
  });
}

function getEntriesByDate(date) {
  return openDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(STORE_NAME, 'readonly');
      var store = tx.objectStore(STORE_NAME);
      var index = store.index('date');
      var request = index.getAll(date);
      request.onsuccess = function(e) {
        var results = e.target.result || [];
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
      var tx = db.transaction(STORE_NAME, 'readonly');
      var store = tx.objectStore(STORE_NAME);
      var request = store.getAll();
      request.onsuccess = function(e) { resolve(e.target.result || []); };
      request.onerror = function(e) { reject(e.target.error); };
      tx.oncomplete = function() { db.close(); };
    });
  });
}

function updateEntry(id, entry) {
  return openDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(STORE_NAME, 'readwrite');
      var store = tx.objectStore(STORE_NAME);
      var request = store.put(Object.assign({}, entry, { id: id }));
      request.onsuccess = function(e) { resolve(e.target.result); };
      request.onerror = function(e) { reject(e.target.error); };
      tx.oncomplete = function() { db.close(); };
      tx.onabort = function() { db.close(); };
    });
  });
}

function deleteEntry(id) {
  return openDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(STORE_NAME, 'readwrite');
      var store = tx.objectStore(STORE_NAME);
      var request = store.delete(id);
      request.onsuccess = function() { resolve(); };
      request.onerror = function(e) { reject(e.target.error); };
      tx.oncomplete = function() { db.close(); };
      tx.onabort = function() { db.close(); };
    });
  });
}

// === localStorage Settings ===
var SETTINGS_KEY = 'love-diary-settings';

function getSettings() {
  try {
    var raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : { startDate: '' };
  } catch (e) {
    return { startDate: '' };
  }
}

function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    // localStorage full — silently fail, caller should handle
  }
}
