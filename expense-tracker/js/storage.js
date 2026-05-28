/**
 * Storage module — IndexedDB persistence for expense records.
 * Exposes global `Storage` object via IIFE pattern.
 */
var Storage = (function () {
  'use strict';

  var DB_NAME = 'ExpenseTracker';
  var DB_VERSION = 1;
  var STORE_NAME = 'expenses';

  // ── Private helpers ──────────────────────────────────────────

  function openDb() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          var store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
          store.createIndex('date', 'date', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
      req.onsuccess = function (e) { resolve(e.target.result); };
      req.onerror = function (e) { reject(e.target.error); };
    });
  }

  function runTransaction(mode, action) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE_NAME, mode);
        tx.onabort = function () { db.close(); reject(tx.error); };
        var result = action(tx);
        tx.oncomplete = function () { db.close(); resolve(result); };
      });
    });
  }

  // ── CRUD ─────────────────────────────────────────────────────

  function addExpense(expense) {
    var record = {
      date: expense.date,
      amount: expense.amount,
      category: expense.category,
      paymentMethod: expense.paymentMethod || '',
      note: expense.note || '',
      photos: expense.photos || [],
      createdAt: expense.createdAt || Date.now()
    };
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE_NAME, 'readwrite');
        var store = tx.objectStore(STORE_NAME);
        var req = store.add(record);
        var id;
        req.onsuccess = function () { id = req.result; };
        tx.onabort = function () { db.close(); reject(tx.error); };
        tx.oncomplete = function () { db.close(); resolve(id); };
      });
    });
  }

  function updateExpense(id, expense) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE_NAME, 'readwrite');
        var store = tx.objectStore(STORE_NAME);
        var getReq = store.get(id);
        getReq.onsuccess = function () {
          var existing = getReq.result;
          if (!existing) {
            tx.abort();
            reject(new Error('Expense not found: ' + id));
            return;
          }
          if (expense.date !== undefined) existing.date = expense.date;
          if (expense.amount !== undefined) existing.amount = expense.amount;
          if (expense.category !== undefined) existing.category = expense.category;
          if (expense.paymentMethod !== undefined) existing.paymentMethod = expense.paymentMethod;
          if (expense.note !== undefined) existing.note = expense.note;
          if (expense.photos !== undefined) existing.photos = expense.photos;
          store.put(existing);
        };
        tx.onabort = function () { db.close(); reject(tx.error); };
        tx.oncomplete = function () { db.close(); resolve(); };
      });
    });
  }

  function deleteExpense(id) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE_NAME, 'readwrite');
        var store = tx.objectStore(STORE_NAME);
        store.delete(id);
        tx.onabort = function () { db.close(); reject(tx.error); };
        tx.oncomplete = function () { db.close(); resolve(); };
      });
    });
  }

  function getExpensesByDate(date) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE_NAME, 'readonly');
        var store = tx.objectStore(STORE_NAME);
        var index = store.index('date');
        var req = index.getAll(date);
        var items;
        req.onsuccess = function () { items = req.result; };
        tx.onabort = function () { db.close(); reject(tx.error); };
        tx.oncomplete = function () {
          db.close();
          // Sort by createdAt descending (newest first)
          items.sort(function (a, b) { return b.createdAt - a.createdAt; });
          resolve(items);
        };
      });
    });
  }

  function getAllExpenses() {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE_NAME, 'readonly');
        var store = tx.objectStore(STORE_NAME);
        var req = store.getAll();
        var items;
        req.onsuccess = function () { items = req.result; };
        tx.onabort = function () { db.close(); reject(tx.error); };
        tx.oncomplete = function () { db.close(); resolve(items); };
      });
    });
  }

  function getExpensesInRange(startDate, endDate) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE_NAME, 'readonly');
        var store = tx.objectStore(STORE_NAME);
        var index = store.index('date');
        var range = IDBKeyRange.bound(startDate, endDate);
        var req = index.getAll(range);
        var items;
        req.onsuccess = function () { items = req.result; };
        tx.onabort = function () { db.close(); reject(tx.error); };
        tx.oncomplete = function () { db.close(); resolve(items); };
      });
    });
  }

  // ── Import / Export ──────────────────────────────────────────

  function exportData() {
    return getAllExpenses().then(function (expenses) {
      var config = null;
      if (typeof Config !== 'undefined' && Config.getConfig) {
        config = Config.getConfig();
      }
      return { expenses: expenses, config: config };
    });
  }

  function importData(data) {
    var records = data.expenses || [];
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE_NAME, 'readwrite');
        var store = tx.objectStore(STORE_NAME);
        // Clear existing data
        store.clear();
        // Add all records (without original ids to avoid key conflicts)
        for (var i = 0; i < records.length; i++) {
          var rec = records[i];
          delete rec.id;
          store.add(rec);
        }
        var count = records.length;
        tx.onabort = function () { db.close(); reject(tx.error); };
        tx.oncomplete = function () {
          db.close();
          // Restore config if present
          if (data.config && typeof Config !== 'undefined') {
            try {
              localStorage.setItem('expense-tracker-config', JSON.stringify(data.config));
            } catch (e) {
              console.error('Storage: failed to restore config', e);
            }
          }
          resolve(count);
        };
      });
    });
  }

  function clearAll() {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE_NAME, 'readwrite');
        var store = tx.objectStore(STORE_NAME);
        store.clear();
        tx.onabort = function () { db.close(); reject(tx.error); };
        tx.oncomplete = function () { db.close(); resolve(); };
      });
    });
  }

  // ── Public API ───────────────────────────────────────────────

  return {
    addExpense: addExpense,
    updateExpense: updateExpense,
    deleteExpense: deleteExpense,
    getExpensesByDate: getExpensesByDate,
    getAllExpenses: getAllExpenses,
    getExpensesInRange: getExpensesInRange,
    exportData: exportData,
    importData: importData,
    clearAll: clearAll
  };
})();
