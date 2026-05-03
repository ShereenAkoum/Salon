(function () {
  var config = null;
  var selectedDate = null;
  var selectedTime = null;

  // ── Helpers ─────────────────────────────────────────────────────────────
  function getLang() {
    return document.documentElement.getAttribute('lang') || localStorage.getItem('siteLang') || 'en';
  }

  // Returns array of Date objects: today + next 3 months worth of days
  function getDateRange() {
    var dates = [];
    var now   = new Date();
    var end   = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
    var cur   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    while (cur <= end) {
      dates.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  }

  // Group dates by month → { "2026-5": [Date, Date, ...], ... }
  function groupByMonth(dates) {
    var groups = {};
    var order  = [];
    dates.forEach(function (d) {
      var key = d.getFullYear() + '-' + d.getMonth();
      if (!groups[key]) { groups[key] = []; order.push(key); }
      groups[key].push(d);
    });
    return { groups: groups, order: order };
  }

  function isClosed(date) {
    return (config.closedDays || []).indexOf(date.getDay()) !== -1;
  }

  function isToday(date) {
    var now = new Date();
    return date.getDate()  === now.getDate()  &&
           date.getMonth() === now.getMonth() &&
           date.getFullYear() === now.getFullYear();
  }

  // ── Render ───────────────────────────────────────────────────────────────
  function render(lang) {
    if (!config) return;

    var months   = config.months[lang]   || config.months['en'];
    var days     = config.days[lang]     || config.days['en'];
    var slots    = config.timeSlots;

    // Static text
    var backEl = document.getElementById('step2-back');
    if (backEl) backEl.textContent = config['back-' + lang] || config['back-en'];

    var titleEl = document.getElementById('step2-title');
    if (titleEl) titleEl.textContent = config['title-' + lang] || config['title-en'];

    var descEl = document.getElementById('step2-desc');
    if (descEl) descEl.textContent = config['description-' + lang] || config['description-en'];

    // Build date range
    var dateRange = getDateRange();
    var grouped   = groupByMonth(dateRange);

    var container = document.getElementById('date-picker-container');
    if (!container) return;
    container.innerHTML = '';

    grouped.order.forEach(function (monthKey) {
      var monthDates = grouped.groups[monthKey];
      var sample     = monthDates[0];
      var monthName  = months[sample.getMonth()];
      var year       = sample.getFullYear();

      // Month heading
      var heading = document.createElement('h3');
      heading.className   = 'date-picker-month-heading';
      heading.textContent = monthName + ' ' + year;
      container.appendChild(heading);

      // Tabs wrapper
      var tabsWrap = document.createElement('div');
      tabsWrap.className = 'rd-material-tabs date-picker';
      tabsWrap.setAttribute('data-items', '2');
      tabsWrap.setAttribute('data-xs-items', '3');
      tabsWrap.setAttribute('data-sm-items', '4');
      tabsWrap.setAttribute('data-md-items', '5');
      tabsWrap.setAttribute('data-margin', '15');
      tabsWrap.setAttribute('data-stage-padding', '0');
      tabsWrap.setAttribute('data-sm-stage-padding', '30');

      // ── Date list ──
      var tabList = document.createElement('div');
      tabList.className = 'rd-material-tabs__list';
      var ul = document.createElement('ul');

      // ── Time panels ──
      var tabContent = document.createElement('div');
      tabContent.className = 'rd-material-tabs__container';

      monthDates.forEach(function (date, idx) {
        var closed = isClosed(date);
        var today  = isToday(date);

        // Date tab
        var li = document.createElement('li');
        var a  = document.createElement('a');
        a.className = 'date-picker-date' + (closed ? ' disabled' : '') + (today ? ' today' : '');
        a.href      = '#';

        var numDiv  = document.createElement('div');
        numDiv.className   = 'date-picker-date-number';
        numDiv.textContent = date.getDate();

        var dayDiv  = document.createElement('div');
        dayDiv.className   = 'date-picker-date-text';
        dayDiv.textContent = days[date.getDay()];

        a.appendChild(numDiv);
        a.appendChild(dayDiv);
        li.appendChild(a);
        ul.appendChild(li);

        // Time panel for this date
        var panel = document.createElement('div');
        var slotUl = document.createElement('ul');
        slotUl.className = 'date-picker-list animated fadeIn';

        slots.forEach(function (slot) {
          var slotLi = document.createElement('li');
          // Randomly disable ~40% of slots to simulate availability
          // In production replace with real availability data
          if (closed || Math.random() < 0.4) slotLi.className = 'disabled';

          var slotA = document.createElement('a');
          slotA.textContent = slot;

          if (!slotLi.className.includes('disabled')) {
            slotA.addEventListener('click', function (e) {
              e.preventDefault();
              // Deselect previous
              slotUl.querySelectorAll('li').forEach(function (el) {
                el.classList.remove('active');
              });
              slotLi.classList.add('active');
              selectedTime = slot;
              selectedDate = date.toISOString().split('T')[0];

              // Persist for step-3
              localStorage.setItem('selectedDate', selectedDate);
              localStorage.setItem('selectedTime', selectedTime);

              // Navigate to next step after short delay
              setTimeout(function () {
                window.location.href = 'step-3.html';
              }, 300);
            });
          }

          slotLi.appendChild(slotA);
          slotUl.appendChild(slotLi);
        });

        panel.appendChild(slotUl);
        tabContent.appendChild(panel);
      });

      tabList.appendChild(ul);
      tabsWrap.appendChild(tabList);
      tabsWrap.appendChild(tabContent);
      container.appendChild(tabsWrap);
    });

    // Re-init the RD Material Tabs plugin if available
    if (window.jQuery && jQuery.fn.RDMaterialTabs) {
      jQuery('.rd-material-tabs').RDMaterialTabs();
    }
  }

  // ── Init ─────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    fetch('assets/data/step2.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        config = data;
        render(getLang());
      })
      .catch(function (err) { console.error('Error loading step2.json:', err); });
  });

  // Re-render on language change
  document.addEventListener('langChanged', function (e) {
    render(e.detail.lang);
  });
})();
