var Diary = (function() {
  var MOOD_LABELS = {
    happy: '😊',
    love: '😍',
    excited: '😆',
    normal: '🙂',
    sad: '😢',
    miss: '🥺'
  };

  var currentOnEdit = null;
  var currentOnDelete = null;
  var currentOnAdd = null;
  var currentOnSave = null;
  var currentOnCancel = null;
  var editingEntryId = null;
  var editingDate = null;
  var currentPhotos = [];
  var selectedMood = 'happy';

  function formatDisplayDate(dateStr) {
    var parts = dateStr.split('-');
    return parseInt(parts[1]) + '月' + parseInt(parts[2]) + '日';
  }

  function formatTime(isoStr) {
    var d = new Date(isoStr);
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

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

    addBtn.onclick = function() { if (onAdd) onAdd(date); };
    emptyAddBtn.onclick = function() { if (onAdd) onAdd(date); };

    if (!entries || entries.length === 0) {
      list.style.display = 'none';
      empty.style.display = 'block';
      var today = Calendar.formatDate(new Date());
      empty.style.display = date > today ? 'none' : 'block';
      return;
    }

    list.style.display = 'block';
    empty.style.display = 'none';

    entries.forEach(function(entry) {
      var card = document.createElement('div');
      card.className = 'diary-card';

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

      var contentDiv = document.createElement('div');
      contentDiv.className = 'diary-content';
      contentDiv.textContent = entry.content;

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
