/**
 * Statistics module — renders expense statistics with Chart.js charts.
 * Supports day / week / month / year views with navigation.
 * Exposes global `Statistics` object via IIFE pattern.
 */
var Statistics = (function () {
  'use strict';

  var CHART_COLORS = [
    '#4CAF50', '#FF9800', '#2196F3', '#E91E63', '#9C27B0',
    '#00BCD4', '#FF5722', '#795548', '#607D8B', '#CDDC39'
  ];

  // ── Internal state ───────────────────────────────────────────

  var currentPeriod = 'day';
  var currentOffset = 0;
  var currentChart = null;

  // ── Date range helpers ───────────────────────────────────────

  function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function formatDate(d) {
    var y = d.getFullYear();
    var m = ('0' + (d.getMonth() + 1)).slice(-2);
    var day = ('0' + d.getDate()).slice(-2);
    return y + '-' + m + '-' + day;
  }

  function getDayRange(offset) {
    var now = new Date();
    var target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    var start = startOfDay(target);
    var end = new Date(start);
    end.setDate(end.getDate() + 1);
    return {
      start: start,
      end: end,
      label: formatDate(target),
      prevLabel: (function () {
        var prev = new Date(target);
        prev.setDate(prev.getDate() - 1);
        return formatDate(prev);
      })()
    };
  }

  function getWeekRange(offset) {
    var now = new Date();
    var dayOfWeek = now.getDay() || 7; // Mon=1 ... Sun=7
    var monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1 + offset * 7);
    var sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 7);
    var prevMonday = new Date(monday);
    prevMonday.setDate(prevMonday.getDate() - 7);
    return {
      start: startOfDay(monday),
      end: startOfDay(sunday),
      label: formatDate(monday) + ' ~ ' + formatDate(new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() - 1)),
      prevStart: startOfDay(prevMonday),
      prevEnd: startOfDay(monday)
    };
  }

  function getMonthRange(offset) {
    var now = new Date();
    var year = now.getFullYear();
    var month = now.getMonth() + offset;
    var start = new Date(year, month, 1);
    var end = new Date(year, month + 1, 1);
    var prevStart = new Date(year, month - 1, 1);
    var prevEnd = new Date(year, month, 1);
    var label = start.getFullYear() + '-' + ('0' + (start.getMonth() + 1)).slice(-2);
    return {
      start: start,
      end: end,
      label: label,
      days: new Date(year, month + 1, 0).getDate(),
      prevStart: prevStart,
      prevEnd: prevEnd
    };
  }

  function getYearRange(offset) {
    var now = new Date();
    var year = now.getFullYear() + offset;
    var start = new Date(year, 0, 1);
    var end = new Date(year + 1, 0, 1);
    return {
      start: start,
      end: end,
      label: '' + year,
      year: year,
      prevStart: new Date(year - 1, 0, 1),
      prevEnd: new Date(year, 0, 1)
    };
  }

  // ── Expense filtering / grouping ─────────────────────────────

  function filterByRange(expenses, start, end) {
    var startTime = start.getTime();
    var endTime = end.getTime();
    return expenses.filter(function (e) {
      var t = new Date(e.date).getTime();
      return t >= startTime && t < endTime;
    });
  }

  function groupByCategory(expenses) {
    var map = {};
    for (var i = 0; i < expenses.length; i++) {
      var cat = expenses[i].category || '其他';
      if (!map[cat]) map[cat] = 0;
      map[cat] += expenses[i].amount;
    }
    var result = [];
    for (var key in map) {
      if (map.hasOwnProperty(key)) {
        result.push({ category: key, amount: map[key] });
      }
    }
    result.sort(function (a, b) { return b.amount - a.amount; });
    return result;
  }

  function groupByDate(expenses) {
    var map = {};
    for (var i = 0; i < expenses.length; i++) {
      var d = expenses[i].date;
      if (!map[d]) map[d] = 0;
      map[d] += expenses[i].amount;
    }
    return map;
  }

  function totalAmount(expenses) {
    var sum = 0;
    for (var i = 0; i < expenses.length; i++) {
      sum += expenses[i].amount;
    }
    return sum;
  }

  // ── Chart helpers ────────────────────────────────────────────

  function destroyChart() {
    if (currentChart) {
      currentChart.destroy();
      currentChart = null;
    }
  }

  function createDoughnut(canvasId, labels, data) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    destroyChart();
    currentChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: CHART_COLORS.slice(0, labels.length),
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, padding: 8 } }
        }
      }
    });
  }

  function createBar(canvasId, labels, data, labelText) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    destroyChart();
    currentChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: labelText || '支出',
          data: data,
          backgroundColor: '#4CAF50',
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }

  function createLine(canvasId, labels, data, labelText) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    destroyChart();
    currentChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: labelText || '支出趋势',
          data: data,
          borderColor: '#4CAF50',
          backgroundColor: 'rgba(76,175,80,0.15)',
          fill: true,
          tension: 0.3,
          pointRadius: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }

  // ── HTML rendering ───────────────────────────────────────────

  function getCategoryIcon(catName) {
    var cats = typeof Config !== 'undefined' ? Config.getAllCategories() : [];
    for (var i = 0; i < cats.length; i++) {
      if (cats[i].name === catName) return cats[i].icon;
    }
    return '📌';
  }

  function renderCategoryBreakdown(container, categoryData, total) {
    if (!container) return;
    var html = '';
    for (var i = 0; i < categoryData.length; i++) {
      var item = categoryData[i];
      var pct = total > 0 ? ((item.amount / total) * 100).toFixed(1) : '0.0';
      var icon = getCategoryIcon(item.category);
      html += '<div class="category-row">'
        + '<span class="category-icon">' + icon + '</span>'
        + '<span class="category-name">' + item.category + '</span>'
        + '<span class="category-amount">¥' + item.amount.toFixed(2) + '</span>'
        + '<span class="category-pct">' + pct + '%</span>'
        + '</div>';
    }
    container.innerHTML = html;
  }

  function percentChange(current, prev) {
    if (prev <= 0) return current > 0 ? '+100%' : '0%';
    var diff = ((current - prev) / prev * 100).toFixed(1);
    if (diff > 0) return '+' + diff + '%';
    return diff + '%';
  }

  function navHTML() {
    return '<div class="stats-nav">'
      + '<button class="stats-nav-btn" id="stats-prev">◀</button>'
      + '<span class="stats-nav-label" id="stats-nav-label"></span>'
      + '<button class="stats-nav-btn" id="stats-next">▶</button>'
      + '</div>';
  }

  // ── View renderers ───────────────────────────────────────────

  function renderDayView(allExpenses) {
    var range = getDayRange(currentOffset);
    var current = filterByRange(allExpenses, range.start, range.end);
    var prevRange = getDayRange(currentOffset - 1);
    var prev = filterByRange(allExpenses, prevRange.start, prevRange.end);
    var total = totalAmount(current);
    var prevTotal = totalAmount(prev);
    var change = percentChange(total, prevTotal);
    var catData = groupByCategory(current);

    var container = document.getElementById('stats-content');
    container.innerHTML = navHTML()
      + '<div class="stats-summary">'
      + '<span class="stats-total">¥' + total.toFixed(2) + '</span>'
      + '<span class="stats-change">' + change + '</span>'
      + '</div>'
      + '<div class="stats-chart-wrapper"><canvas id="stats-chart"></canvas></div>'
      + '<div class="category-breakdown"></div>';

    document.getElementById('stats-nav-label').textContent = range.label;
    bindNav();
    createDoughnut('stats-chart', catData.map(function (c) { return c.category; }), catData.map(function (c) { return c.amount; }));
    renderCategoryBreakdown(container.querySelector('.category-breakdown'), catData, total);
  }

  function renderWeekView(allExpenses) {
    var range = getWeekRange(currentOffset);
    var current = filterByRange(allExpenses, range.start, range.end);
    var prev = filterByRange(allExpenses, range.prevStart, range.prevEnd);
    var total = totalAmount(current);
    var prevTotal = totalAmount(prev);
    var change = percentChange(total, prevTotal);
    var catData = groupByCategory(current);

    var container = document.getElementById('stats-content');
    container.innerHTML = navHTML()
      + '<div class="stats-summary">'
      + '<span class="stats-total">¥' + total.toFixed(2) + '</span>'
      + '<span class="stats-change">' + change + '</span>'
      + '</div>'
      + '<div class="stats-chart-wrapper"><canvas id="stats-chart"></canvas></div>'
      + '<div class="category-breakdown"></div>';

    document.getElementById('stats-nav-label').textContent = range.label;
    bindNav();
    createDoughnut('stats-chart', catData.map(function (c) { return c.category; }), catData.map(function (c) { return c.amount; }));
    renderCategoryBreakdown(container.querySelector('.category-breakdown'), catData, total);
  }

  function renderMonthView(allExpenses) {
    var range = getMonthRange(currentOffset);
    var current = filterByRange(allExpenses, range.start, range.end);
    var prev = filterByRange(allExpenses, range.prevStart, range.prevEnd);
    var total = totalAmount(current);
    var prevTotal = totalAmount(prev);
    var change = percentChange(total, prevTotal);
    var catData = groupByCategory(current);
    var dateData = groupByDate(current);

    // Build daily bar chart data
    var dayLabels = [];
    var dayValues = [];
    for (var d = 1; d <= range.days; d++) {
      var dateStr = range.start.getFullYear() + '-'
        + ('0' + (range.start.getMonth() + 1)).slice(-2) + '-'
        + ('0' + d).slice(-2);
      dayLabels.push('' + d);
      dayValues.push(dateData[dateStr] || 0);
    }

    var container = document.getElementById('stats-content');
    container.innerHTML = navHTML()
      + '<div class="stats-summary">'
      + '<span class="stats-total">¥' + total.toFixed(2) + '</span>'
      + '<span class="stats-change">' + change + '</span>'
      + '</div>'
      + '<div class="stats-chart-wrapper"><canvas id="stats-chart"></canvas></div>'
      + '<div class="stats-chart-wrapper"><canvas id="stats-chart-daily"></canvas></div>'
      + '<div class="category-breakdown"></div>';

    document.getElementById('stats-nav-label').textContent = range.label;
    bindNav();

    // Create both charts manually (no destroyChart calls)
    var catLabels = catData.map(function (c) { return c.category; });
    var catValues = catData.map(function (c) { return c.amount; });
    var doughnutCanvas = document.getElementById('stats-chart');
    var doughnutChart = null;
    if (doughnutCanvas) {
      doughnutChart = new Chart(doughnutCanvas, {
        type: 'doughnut',
        data: {
          labels: catLabels,
          datasets: [{ data: catValues, backgroundColor: CHART_COLORS.slice(0, catLabels.length), borderWidth: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 8 } } } }
      });
    }

    var barCanvas = document.getElementById('stats-chart-daily');
    var barChart = null;
    if (barCanvas) {
      barChart = new Chart(barCanvas, {
        type: 'bar',
        data: {
          labels: dayLabels,
          datasets: [{ label: '每日支出', data: dayValues, backgroundColor: '#4CAF50', borderRadius: 4 }]
        },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
      });
    }

    currentChart = doughnutChart;
    if (currentChart) currentChart._secondaryChart = barChart;

    renderCategoryBreakdown(container.querySelector('.category-breakdown'), catData, total);
  }

  function renderYearView(allExpenses) {
    var range = getYearRange(currentOffset);
    var current = filterByRange(allExpenses, range.start, range.end);
    var prev = filterByRange(allExpenses, range.prevStart, range.prevEnd);
    var total = totalAmount(current);
    var prevTotal = totalAmount(prev);
    var change = percentChange(total, prevTotal);

    // Monthly breakdown
    var monthLabels = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
    var monthValues = [];
    for (var m = 0; m < 12; m++) {
      var mStart = new Date(range.year, m, 1);
      var mEnd = new Date(range.year, m + 1, 1);
      var mExpenses = filterByRange(current, mStart, mEnd);
      monthValues.push(totalAmount(mExpenses));
    }

    var container = document.getElementById('stats-content');
    container.innerHTML = navHTML()
      + '<div class="stats-summary">'
      + '<span class="stats-total">¥' + total.toFixed(2) + '</span>'
      + '<span class="stats-change">' + change + '</span>'
      + '</div>'
      + '<div class="stats-chart-wrapper"><canvas id="stats-chart"></canvas></div>'
      + '<div class="stats-chart-wrapper"><canvas id="stats-chart-bar"></canvas></div>';

    document.getElementById('stats-nav-label').textContent = range.label;
    bindNav();

    // Create both charts manually (no destroyChart calls)
    var lineCanvas = document.getElementById('stats-chart');
    var lineChart = null;
    if (lineCanvas) {
      lineChart = new Chart(lineCanvas, {
        type: 'line',
        data: {
          labels: monthLabels,
          datasets: [{ label: '月度趋势', data: monthValues, borderColor: '#4CAF50', backgroundColor: 'rgba(76,175,80,0.15)', fill: true, tension: 0.3, pointRadius: 3 }]
        },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
      });
    }

    var barCanvas2 = document.getElementById('stats-chart-bar');
    var barChart = null;
    if (barCanvas2) {
      barChart = new Chart(barCanvas2, {
        type: 'bar',
        data: {
          labels: monthLabels,
          datasets: [{ label: '月度支出', data: monthValues, backgroundColor: '#4CAF50', borderRadius: 4 }]
        },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
      });
    }

    currentChart = lineChart;
    if (currentChart) currentChart._secondaryChart = barChart;
  }

  // ── Navigation binding ───────────────────────────────────────

  var pendingAllExpenses = null;

  function bindNav() {
    var prevBtn = document.getElementById('stats-prev');
    var nextBtn = document.getElementById('stats-next');
    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        currentOffset--;
        refresh(pendingAllExpenses);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        currentOffset++;
        refresh(pendingAllExpenses);
      });
    }
  }

  // ── Public API ───────────────────────────────────────────────

  function destroyAll() {
    if (currentChart) {
      if (currentChart._secondaryChart) {
        currentChart._secondaryChart.destroy();
      }
      currentChart.destroy();
      currentChart = null;
    }
  }

  function refresh(allExpenses) {
    if (!allExpenses) return;
    pendingAllExpenses = allExpenses;
    destroyAll();

    switch (currentPeriod) {
      case 'day':   renderDayView(allExpenses);   break;
      case 'week':  renderWeekView(allExpenses);  break;
      case 'month': renderMonthView(allExpenses); break;
      case 'year':  renderYearView(allExpenses);  break;
      default:      renderDayView(allExpenses);
    }
  }

  function switchPeriod(period, allExpenses) {
    currentPeriod = period;
    currentOffset = 0;
    refresh(allExpenses);
  }

  return {
    refresh: refresh,
    switchPeriod: switchPeriod
  };
})();
