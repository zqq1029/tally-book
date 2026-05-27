(function() {
  'use strict';

  var allEntries = [];

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

  function loadEntries() {
    return getAllEntries().then(function(entries) {
      allEntries = entries;
      return entries;
    });
  }

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
    if (entryData.photos && entryData.photos.length > 0) {
      var estimated = estimateStorageUsage() + entryData.photos.reduce(function(s, p) { return s + p.length; }, 0);
      if (estimated > 50 * 1024 * 1024) {
        alert('存储空间可能不足（超过 50MB），建议清理一些旧照片后再添加。');
      }
    }
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
    // nothing needed
  }

  function estimateStorageUsage() {
    var total = allEntries.reduce(function(sum, entry) {
      var textSize = (entry.content || '').length * 2;
      var photoSize = (entry.photos || []).reduce(function(s, p) { return s + p.length; }, 0);
      return sum + textSize + photoSize;
    }, 0);
    return total;
  }

  function showConfirm(message, onConfirm) {
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

  function setupEditorEvents() {
    document.getElementById('mood-selector').addEventListener('click', function(e) {
      var btn = e.target.closest('.mood-btn');
      if (!btn) return;
      document.querySelectorAll('#mood-selector .mood-btn').forEach(function(b) {
        b.classList.remove('selected');
      });
      btn.classList.add('selected');
      Diary.setSelectedMood(btn.dataset.mood);
    });

    document.getElementById('photo-input').addEventListener('change', function(e) {
      if (e.target.files.length > 0) {
        Diary.handlePhotoAdd(e.target.files);
        e.target.value = '';
      }
    });

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

  function setupOverlayClose() {
    document.querySelectorAll('.modal-overlay').forEach(function(overlay) {
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) overlay.classList.remove('active');
      });
    });
  }

  function init() {
    setupEditorEvents();
    setupSettingsEvents();
    setupPhotoViewerEvents();
    setupCalendarNav();
    setupKeyboard();
    setupOverlayClose();

    var settings = getSettings();
    if (!settings.startDate) {
      setTimeout(function() { openSettings(); }, 500);
    }

    updateDayCounter();

    var now = new Date();
    loadEntries().then(function() {
      Calendar.renderCalendar(now.getFullYear(), now.getMonth(), allEntries, onDayClick);
      loadDiaryForDate(Calendar.getSelectedDate());
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
