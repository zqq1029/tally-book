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

    var firstDay = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var daysInPrevMonth = new Date(year, month, 0).getDate();

    for (var i = firstDay - 1; i >= 0; i--) {
      var dayNum = daysInPrevMonth - i;
      var cell = createDayCell(dayNum, 'other-month', null);
      grid.appendChild(cell);
    }

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
