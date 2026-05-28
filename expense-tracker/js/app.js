/**
 * App — main application logic for the expense tracker.
 * Handles tab navigation, home page rendering, record modal,
 * swipe-to-delete, voice input, settings, and statistics.
 */
var App = (function () {
  'use strict';

  // ── State ─────────────────────────────────────────────────────
  var allExpenses = [];
  var editingId = null;
  var selectedCategory = null;
  var selectedPaymentMethod = null;
  var photos = []; // compressed base64 strings
  var currentVoiceResult = null;
  var selectedDate = null; // defaults to today on init

  // ── Helpers ───────────────────────────────────────────────────

  function getToday() {
    var d = new Date();
    var m = String(d.getMonth() + 1);
    var day = String(d.getDate());
    return d.getFullYear() + '-' + (m.length < 2 ? '0' + m : m) + '-' + (day.length < 2 ? '0' + day : day);
  }

  function formatAmount(n) {
    return '¥' + (n || 0).toFixed(2);
  }

  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return document.querySelectorAll(sel); }

  // ── Date Navigation Helpers ──────────────────────────────────

  function formatDateLabel(dateStr) {
    var parts = dateStr.split('-');
    var y = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    var d = parseInt(parts[2], 10);
    var today = getToday();
    var yesterday = shiftDate(today, -1);
    if (dateStr === today) return '今天';
    if (dateStr === yesterday) return '昨天';
    return m + '月' + d + '日';
  }

  function shiftDate(dateStr, days) {
    var parts = dateStr.split('-');
    var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    d.setDate(d.getDate() + days);
    var yy = d.getFullYear();
    var mm = String(d.getMonth() + 1);
    var dd = String(d.getDate());
    return yy + '-' + (mm.length < 2 ? '0' + mm : mm) + '-' + (dd.length < 2 ? '0' + dd : dd);
  }

  function isToday(dateStr) {
    return dateStr === getToday();
  }

  function updateDateDisplay() {
    var label = $('#date-label');
    var backBtn = $('#date-back-today');
    if (label) label.textContent = formatDateLabel(selectedDate);
    if (backBtn) {
      if (isToday(selectedDate)) {
        backBtn.classList.add('hidden');
      } else {
        backBtn.classList.remove('hidden');
      }
    }
    var totalLabel = $('#total-label');
    if (totalLabel) {
      totalLabel.textContent = isToday(selectedDate) ? '今日支出' : '当日支出';
    }
    var emptyMsg = $('#empty-message');
    if (emptyMsg) {
      emptyMsg.textContent = isToday(selectedDate) ? '今天还没有记账' : '该日没有记账';
    }
  }

  function initDateNav() {
    selectedDate = getToday();
    updateDateDisplay();

    $('#date-prev').addEventListener('click', function () {
      selectedDate = shiftDate(selectedDate, -1);
      updateDateDisplay();
      renderHome();
    });

    $('#date-next').addEventListener('click', function () {
      var next = shiftDate(selectedDate, 1);
      if (next > getToday()) return; // 不能超过今天
      selectedDate = next;
      updateDateDisplay();
      renderHome();
    });

    $('#date-back-today').addEventListener('click', function () {
      selectedDate = getToday();
      updateDateDisplay();
      renderHome();
    });

    // 点击日期标签打开原生日期选择器
    $('#date-label').addEventListener('click', function () {
      var picker = $('#date-picker-input');
      picker.value = selectedDate;
      picker.showPicker ? picker.showPicker() : picker.click();
    });

    $('#date-picker-input').addEventListener('change', function (e) {
      var val = e.target.value;
      if (!val) return;
      if (val > getToday()) val = getToday();
      selectedDate = val;
      updateDateDisplay();
      renderHome();
    });

    // 凌晨自动推进：每 30 秒检查一次
    setInterval(function () {
      var today = getToday();
      if (selectedDate < today) {
        selectedDate = today;
        updateDateDisplay();
        renderHome();
      }
    }, 30000);
  }

  // ── 0. Toast ────────────────────────────────────────────────

  function showToast(msg, duration) {
    var container = $('#toast-container');
    var el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    container.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('show'); });
    setTimeout(function () {
      el.classList.remove('show');
      setTimeout(function () { el.remove(); }, 300);
    }, duration || 1800);
  }

  // ── 1. Tab Switching (with direction-aware animation) ──────

  var pageOrder = ['home', 'stats', 'settings'];
  var currentPageId = 'home';

  function initTabs() {
    $$('.nav-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var page = btn.getAttribute('data-page');
        if (page === currentPageId) return;

        var fromIdx = pageOrder.indexOf(currentPageId);
        var toIdx = pageOrder.indexOf(page);
        var direction = toIdx > fromIdx ? 'left' : 'right';

        var oldPage = $('#page-' + currentPageId);
        var newPage = $('#page-' + page);
        if (!oldPage || !newPage) return;

        // Animate out
        oldPage.classList.remove('active', 'slide-in-left', 'slide-in-right');
        oldPage.classList.add(direction === 'left' ? 'slide-out-left' : 'slide-out-right');

        setTimeout(function () {
          oldPage.classList.remove('slide-out-left', 'slide-out-right');
          oldPage.style.display = 'none';

          // Animate in
          newPage.classList.add('active', direction === 'left' ? 'slide-in-right' : 'slide-in-left');
          setTimeout(function () {
            newPage.classList.remove('slide-in-right', 'slide-in-left');
          }, 250);
        }, 200);

        $$('.nav-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        currentPageId = page;

        if (page === 'home') renderHome();
        if (page === 'settings') renderSettings();
        if (page === 'stats') renderStats();
      });
    });
  }

  // ── 2. Home Page ──────────────────────────────────────────────

  function renderHome() {
    var date = selectedDate || getToday();
    Storage.getExpensesByDate(date).then(function (expenses) {
      var list = $('#expense-list');
      var empty = $('#empty-state');
      var totalEl = $('#today-total');
      list.innerHTML = '';

      if (expenses.length === 0) {
        empty.classList.remove('hidden');
        list.classList.add('hidden');
        totalEl.textContent = formatAmount(0);
        return;
      }

      empty.classList.add('hidden');
      list.classList.remove('hidden');

      var total = 0;
      var cats = Config.getAllCategories();

      expenses.forEach(function (exp) {
        total += exp.amount || 0;

        var catInfo = null;
        for (var i = 0; i < cats.length; i++) {
          if (cats[i].name === exp.category) { catInfo = cats[i]; break; }
        }

        var item = document.createElement('div');
        item.className = 'expense-item';
        item.setAttribute('data-id', exp.id);

        item.innerHTML =
          '<div class="item-icon">' + (catInfo ? catInfo.icon : '📌') + '</div>' +
          '<div class="item-info">' +
            '<div class="item-category">' + (exp.category || '其他') + ' · ' + (exp.paymentMethod || '') + '</div>' +
            '<div class="item-note">' + (exp.note || '') + '</div>' +
          '</div>' +
          '<div class="item-amount">-' + formatAmount(exp.amount) + '</div>';

        list.appendChild(item);

        // Swipe-to-delete
        setupSwipeDelete(item, exp.id);

        // Tap to edit (blocked if swipe is open)
        item.addEventListener('click', function (e) {
          if (item.style.transform === 'translateX(-80px)') {
            // Close the swipe instead of editing
            item.style.transition = 'transform 0.2s ease';
            item.style.transform = 'translateX(0px)';
            return;
          }
          if (e.target.closest('.delete-bg')) return;
          openModal(exp);
        });
      });

      totalEl.textContent = formatAmount(total);
    });
  }

  // ── 4. Swipe-to-Delete ───────────────────────────────────────

  function setupSwipeDelete(item, id) {
    var startX = 0, currentX = 0, swiping = false;
    var deleteBtn = null;

    function createDeleteBtn() {
      if (deleteBtn) return deleteBtn;
      deleteBtn = document.createElement('div');
      deleteBtn.className = 'delete-bg';
      deleteBtn.textContent = '删除';
      item.appendChild(deleteBtn);
      deleteBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        item.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
        item.style.transform = 'translateX(0)';
        item.style.opacity = '0';
        setTimeout(function () {
          Storage.deleteExpense(id).then(function () {
            refreshAllData().then(function () { renderHome(); });
            showToast('已删除');
          });
        }, 200);
      });
      return deleteBtn;
    }

    item.addEventListener('touchstart', function (e) {
      startX = e.touches[0].clientX;
      swiping = false;
    }, { passive: true });

    item.addEventListener('touchmove', function (e) {
      currentX = e.touches[0].clientX;
      var dx = startX - currentX;
      if (dx > 10) swiping = true;
      if (dx > 0) {
        var offset = Math.min(dx, 80);
        item.style.transform = 'translateX(' + (-offset) + 'px)';
        item.style.transition = 'none';
        createDeleteBtn();
      } else {
        item.style.transform = 'translateX(0px)';
      }
    }, { passive: true });

    item.addEventListener('touchend', function () {
      item.style.transition = 'transform 0.2s ease';
      var dx = startX - currentX;
      if (dx > 40) {
        item.style.transform = 'translateX(-80px)';
      } else {
        item.style.transform = 'translateX(0px)';
      }
    });

    // Close swipe on outside tap
    document.addEventListener('touchstart', function (e) {
      if (!item.contains(e.target) && item.style.transform === 'translateX(-80px)') {
        item.style.transition = 'transform 0.2s ease';
        item.style.transform = 'translateX(0px)';
      }
    });
  }

  // ── 3. Record Modal ──────────────────────────────────────────

  function initModal() {
    $('#fab-add').addEventListener('click', function () {
      openModal();
    });

    $('#record-cancel').addEventListener('click', function () {
      closeModal();
    });

    $('#record-save').addEventListener('click', function () {
      saveExpense();
    });

    // Mode switch
    $$('.mode-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        $$('.mode-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var mode = btn.getAttribute('data-mode');
        if (mode === 'manual') {
          $('#manual-mode').classList.remove('hidden');
          $('#voice-mode').classList.add('hidden');
        } else {
          $('#manual-mode').classList.add('hidden');
          $('#voice-mode').classList.remove('hidden');
        }
      });
    });

    // Photo input
    $('#photo-input').addEventListener('change', function (e) {
      var files = e.target.files;
      for (var i = 0; i < files.length; i++) {
        compressPhoto(files[i]);
      }
      e.target.value = '';
    });

    // Voice (press-and-hold)
    initVoice();
  }

  function openModal(expense) {
    var modal = $('#record-modal');
    modal.classList.add('open');

    if (expense) {
      editingId = expense.id;
      selectedCategory = expense.category || null;
      selectedPaymentMethod = expense.paymentMethod || null;
      photos = expense.photos ? expense.photos.slice() : [];
      $('#amount-input').value = expense.amount || '';
      $('#note-input').value = expense.note || '';
    } else {
      editingId = null;
      selectedCategory = null;
      selectedPaymentMethod = null;
      photos = [];
      $('#amount-input').value = '';
      $('#note-input').value = '';
    }

    renderCategoryGrid();
    renderPaymentMethods();
    renderPhotoPreviews();

    // Reset to manual mode
    $$('.mode-btn').forEach(function (b) { b.classList.remove('active'); });
    $$('.mode-btn')[0].classList.add('active');
    $('#manual-mode').classList.remove('hidden');
    $('#voice-mode').classList.add('hidden');
    $('#voice-result').classList.add('hidden');
    currentVoiceResult = null;
  }

  function closeModal() {
    var modal = $('#record-modal');
    modal.classList.add('closing');
    setTimeout(function () {
      modal.classList.remove('open', 'closing');
    }, 200);
    editingId = null;
  }

  function renderCategoryGrid() {
    var grid = $('#category-grid');
    var cats = Config.getAllCategories();
    grid.innerHTML = '';

    cats.forEach(function (cat) {
      var btn = document.createElement('button');
      btn.className = 'cat-btn' + (cat.name === selectedCategory ? ' active' : '');
      btn.innerHTML = '<span class="cat-icon">' + cat.icon + '</span><span>' + cat.name + '</span>';
      btn.addEventListener('click', function () {
        selectedCategory = cat.name;
        $$('.cat-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
      });
      grid.appendChild(btn);
    });
  }

  function renderPaymentMethods() {
    var container = $('#payment-methods');
    var methods = Config.getAllPaymentMethods();
    container.innerHTML = '';

    methods.forEach(function (pm) {
      var btn = document.createElement('button');
      btn.className = 'pay-label' + (pm.name === selectedPaymentMethod ? ' active' : '');
      btn.textContent = pm.icon + ' ' + pm.name;
      btn.addEventListener('click', function () {
        selectedPaymentMethod = pm.name;
        $$('.pay-label').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
      });
      container.appendChild(btn);
    });
  }

  function compressPhoto(file) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        var canvas = document.createElement('canvas');
        var maxW = 800;
        var w = img.width;
        var h = img.height;
        if (w > maxW) {
          h = Math.round(h * maxW / w);
          w = maxW;
        }
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        var dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        photos.push(dataUrl);
        renderPhotoPreviews();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function renderPhotoPreviews() {
    var container = $('#photo-previews');
    container.innerHTML = '';

    photos.forEach(function (src, idx) {
      var wrapper = document.createElement('div');
      wrapper.style.position = 'relative';
      wrapper.style.display = 'inline-block';

      var img = document.createElement('img');
      img.src = src;
      wrapper.appendChild(img);

      var del = document.createElement('button');
      del.textContent = '×';
      del.style.cssText = 'position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;border:none;background:#e74c3c;color:#fff;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;';
      del.addEventListener('click', function (e) {
        e.preventDefault();
        photos.splice(idx, 1);
        renderPhotoPreviews();
      });
      wrapper.appendChild(del);

      container.appendChild(wrapper);
    });
  }

  function saveExpense() {
    var amount = parseFloat($('#amount-input').value);
    if (!amount || amount <= 0) { alert('请输入有效金额'); return; }
    if (!selectedCategory) { alert('请选择分类'); return; }
    if (!selectedPaymentMethod) { alert('请选择支付方式'); return; }

    var expense = {
      date: selectedDate || getToday(),
      amount: amount,
      category: selectedCategory,
      paymentMethod: selectedPaymentMethod,
      note: $('#note-input').value.trim(),
      photos: photos.slice()
    };

    var promise;
    if (editingId) {
      promise = Storage.updateExpense(editingId, expense);
    } else {
      expense.createdAt = Date.now();
      promise = Storage.addExpense(expense);
    }

    promise.then(function () {
      var savedId = editingId;
      closeModal();
      refreshAllData().then(function () {
        renderHome();
        if (!savedId) {
          // New item: highlight last added
          var items = $$('.expense-item');
          if (items.length > 0) {
            var first = items[0];
            first.classList.add('highlight');
            first.addEventListener('animationend', function () {
              first.classList.remove('highlight');
            }, { once: true });
          }
        }
      });
      showToast('已保存');
    }).catch(function (err) {
      showToast('保存失败: ' + err.message);
    });
  }

  // ── 5. Voice Input (Press-and-Hold) ────────────────────────

  var recognition = null;
  var isRecording = false;
  var voiceHoldTimer = null;

  function initVoice() {
    var btn = $('#voice-btn');
    if (!btn) return;

    // Touch events (mobile)
    btn.addEventListener('touchstart', function (e) {
      e.preventDefault();
      startVoiceHold();
    }, { passive: false });

    btn.addEventListener('touchend', function (e) {
      e.preventDefault();
      stopVoiceHold();
    }, { passive: false });

    btn.addEventListener('touchcancel', function () {
      stopVoiceHold();
    });

    // Mouse events (desktop)
    btn.addEventListener('mousedown', function (e) {
      e.preventDefault();
      startVoiceHold();
    });

    btn.addEventListener('mouseup', function () {
      stopVoiceHold();
    });

    btn.addEventListener('mouseleave', function () {
      if (isRecording) stopVoiceHold();
    });
  }

  function startVoiceHold() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      showToast('您的浏览器不支持语音识别');
      return;
    }

    var btn = $('#voice-btn');
    btn.classList.add('recording');
    $('#voice-status').textContent = '正在聆听...';

    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = function () {
      isRecording = true;
    };

    recognition.onresult = function (e) {
      var transcript = '';
      for (var i = 0; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      $('#voice-transcript').textContent = transcript;

      // If final result, process immediately
      if (e.results[e.results.length - 1].isFinal) {
        processVoiceResult(transcript);
      }
    };

    recognition.onerror = function (e) {
      isRecording = false;
      btn.classList.remove('recording');
      if (e.error === 'no-speech') {
        $('#voice-status').textContent = '没有检测到语音';
      } else {
        $('#voice-status').textContent = '识别失败，请重试';
      }
      setTimeout(function () { $('#voice-status').textContent = '按住说话'; }, 2000);
    };

    recognition.onend = function () {
      isRecording = false;
      btn.classList.remove('recording');
      $('#voice-status').textContent = '按住说话';
    };

    recognition.start();
  }

  function stopVoiceHold() {
    if (recognition && isRecording) {
      recognition.stop();
    }
    var btn = $('#voice-btn');
    if (btn) btn.classList.remove('recording');
  }

  function processVoiceResult(transcript) {
    var parsed = VoiceParser.parse(transcript);

    if (parsed.amount && parsed.amount > 0) {
      // Auto-apply result directly
      if (parsed.amount) $('#amount-input').value = parsed.amount;
      if (parsed.category) selectedCategory = parsed.category;
      if (parsed.paymentMethod) selectedPaymentMethod = parsed.paymentMethod;
      if (parsed.note) $('#note-input').value = parsed.note;

      // Switch to manual mode to show filled values
      $$('.mode-btn').forEach(function (b) { b.classList.remove('active'); });
      $$('.mode-btn')[0].classList.add('active');
      $('#manual-mode').classList.remove('hidden');
      $('#voice-mode').classList.add('hidden');

      renderCategoryGrid();
      renderPaymentMethods();
      showToast('已识别: ¥' + parsed.amount.toFixed(2));
    } else {
      // Fallback: put transcript into note
      $('#note-input').value = transcript;
      $$('.mode-btn').forEach(function (b) { b.classList.remove('active'); });
      $$('.mode-btn')[0].classList.add('active');
      $('#manual-mode').classList.remove('hidden');
      $('#voice-mode').classList.add('hidden');
      showToast('未识别金额，已填入备注');
    }

    currentVoiceResult = null;
  }

  // ── 6. Settings ──────────────────────────────────────────────

  function renderSettings() {
    var cats = Config.getAllCategories();
    var methods = Config.getAllPaymentMethods();
    var config = Config.getConfig();
    var presetCatNames = {};
    var presetPmNames = {};
    config.categories.forEach(function (c) { presetCatNames[c.name] = true; });
    config.paymentMethods.forEach(function (p) { presetPmNames[p.name] = true; });

    // Category list
    var catList = $('#category-list');
    catList.innerHTML = '';
    cats.forEach(function (cat) {
      var tag = document.createElement('span');
      tag.className = 'tag';
      var isCustom = !presetCatNames[cat.name];
      tag.innerHTML = '<span class="tag-icon">' + cat.icon + '</span>' + cat.name;
      if (isCustom) {
        var del = document.createElement('button');
        del.className = 'tag-delete';
        del.textContent = '×';
        del.addEventListener('click', function () {
          Config.removeCustomCategory(cat.name);
          renderSettings();
        });
        tag.appendChild(del);
      }
      catList.appendChild(tag);
    });

    // Payment list
    var payList = $('#payment-list');
    payList.innerHTML = '';
    methods.forEach(function (pm) {
      var tag = document.createElement('span');
      tag.className = 'tag';
      var isCustom = !presetPmNames[pm.name];
      tag.innerHTML = '<span class="tag-icon">' + pm.icon + '</span>' + pm.name;
      if (isCustom) {
        var del = document.createElement('button');
        del.className = 'tag-delete';
        del.textContent = '×';
        del.addEventListener('click', function () {
          Config.removeCustomPaymentMethod(pm.name);
          renderSettings();
        });
        tag.appendChild(del);
      }
      payList.appendChild(tag);
    });
  }

  function initSettings() {
    // Add category
    $('#add-category-btn').addEventListener('click', function () {
      var name = prompt('请输入分类名称:');
      if (!name) return;
      var icon = prompt('请输入分类图标（如: 🎮）:', '📌');
      var kwStr = prompt('请输入关键词（逗号分隔，可留空）:', '');
      var keywords = kwStr ? kwStr.split(/[,，]/).map(function (s) { return s.trim(); }).filter(Boolean) : [];
      var ok = Config.addCustomCategory(name, icon || '📌', keywords);
      if (!ok) { alert('该分类名称已存在'); return; }
      renderSettings();
    });

    // Add payment method
    $('#add-payment-btn').addEventListener('click', function () {
      var name = prompt('请输入支付方式名称:');
      if (!name) return;
      var icon = prompt('请输入图标（如: 💳）:', '💳');
      var ok = Config.addCustomPaymentMethod(name, icon || '💳');
      if (!ok) { alert('该支付方式名称已存在'); return; }
      renderSettings();
    });

    // Export
    $('#export-btn').addEventListener('click', function () {
      Storage.exportData().then(function (data) {
        data.version = '1.0';
        data.exportDate = new Date().toISOString();
        var json = JSON.stringify(data, null, 2);
        var blob = new Blob([json], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'expense-tracker-' + getToday() + '.json';
        a.click();
        URL.revokeObjectURL(url);
      });
    });

    // Import
    $('#import-btn').addEventListener('click', function () {
      $('#import-file').click();
    });

    $('#import-file').addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (ev) {
        try {
          var data = JSON.parse(ev.target.result);
          Storage.importData(data).then(function (count) {
            alert('成功导入 ' + count + ' 条记录');
            refreshAllData().then(function () { renderHome(); renderSettings(); });
          });
        } catch (err) {
          alert('导入失败: 文件格式错误');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });

    // Clear data
    $('#clear-data-btn').addEventListener('click', function () {
      if (!confirm('确定要清空所有数据吗？此操作不可恢复！')) return;
      Storage.clearAll().then(function () {
        location.reload();
      });
    });
  }

  // ── 7. Statistics ─────────────────────────────────────────────

  var statsTabsInitialized = false;

  function initStatsTabs() {
    if (statsTabsInitialized) return;
    statsTabsInitialized = true;
    $$('.stats-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        $$('.stats-tab').forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        var period = tab.getAttribute('data-period');
        if (typeof Statistics !== 'undefined') {
          Statistics.switchPeriod(period, allExpenses);
        }
      });
    });
  }

  function renderStats() {
    if (typeof Statistics !== 'undefined') {
      Statistics.refresh(allExpenses);
    }
  }

  // ── 8. Initialization ────────────────────────────────────────

  function refreshAllData() {
    return Storage.getAllExpenses().then(function (expenses) {
      allExpenses = expenses;
    });
  }

  function init() {
    refreshAllData().then(function () {
      initDateNav();
      initTabs();
      initModal();
      initSettings();
      initStatsTabs();
      renderHome();
    });
  }

  // Auto-init
  document.addEventListener('DOMContentLoaded', init);

  return {};
})();
