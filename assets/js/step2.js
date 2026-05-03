(function () {
  var config = null;

  function getLang() {
    return document.documentElement.getAttribute('lang') || localStorage.getItem('siteLang') || 'en';
  }

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

  function groupByMonth(dates) {
    var groups = {}, order = [];
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
    return date.getDate() === now.getDate() &&
           date.getMonth() === now.getMonth() &&
           date.getFullYear() === now.getFullYear();
  }

  /**
   * Deterministic availability: uses the date's day-of-year + slot index as a
   * pseudo-random seed so availability never changes between renders.
   */
  function isSlotAvailable(date, slotIndex) {
    var seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate() + slotIndex * 37;
    return (seed % 10) >= 4; // ~60% available, stable per date+slot
  }

  // ── Render ───────────────────────────────────────────────────────────────
  function render(lang) {
    if (!config) return;

    var months = config.months[lang] || config.months['en'];
    var days   = config.days[lang]   || config.days['en'];
    var slots  = config.timeSlots;

    var backEl = document.getElementById('step2-back');
    if (backEl) backEl.textContent = config['back-' + lang] || config['back-en'];

    var titleEl = document.getElementById('step2-title');
    if (titleEl) titleEl.textContent = config['title-' + lang] || config['title-en'];

    var descEl = document.getElementById('step2-desc');
    if (descEl) descEl.textContent = config['description-' + lang] || config['description-en'];

    var dateRange = getDateRange();
    var grouped   = groupByMonth(dateRange);

    var container = document.getElementById('date-picker-container');
    if (!container) return;
    container.innerHTML = ''; // full wipe — no stale handlers

    grouped.order.forEach(function (monthKey) {
      var monthDates = grouped.groups[monthKey];
      var sample     = monthDates[0];
      var monthName  = months[sample.getMonth()];
      var year       = sample.getFullYear();
      var monthLabel = monthName + ' ' + year;

      var heading = document.createElement('h3');
      heading.className   = 'date-picker-month-heading';
      heading.textContent = monthLabel;
      container.appendChild(heading);

      var tabsWrap = document.createElement('div');
      tabsWrap.className = 'rd-material-tabs date-picker';
      tabsWrap.setAttribute('data-items', '2');
      tabsWrap.setAttribute('data-xs-items', '3');
      tabsWrap.setAttribute('data-sm-items', '4');
      tabsWrap.setAttribute('data-md-items', '5');
      tabsWrap.setAttribute('data-margin', '15');
      tabsWrap.setAttribute('data-stage-padding', '0');
      tabsWrap.setAttribute('data-sm-stage-padding', '30');

      var tabList    = document.createElement('div');
      tabList.className = 'rd-material-tabs__list';
      var ul         = document.createElement('ul');

      var tabContent = document.createElement('div');
      tabContent.className = 'rd-material-tabs__container';

      monthDates.forEach(function (date) {
        var closed  = isClosed(date);
        var today   = isToday(date);

        // Use ISO date string (YYYY-MM-DD) as the canonical key — never ambiguous
        var isoKey  = date.toISOString().split('T')[0];
        var dayNum  = String(date.getDate());
        var dayName = days[date.getDay()];

        // Date tab
        var li = document.createElement('li');
        var a  = document.createElement('a');
        a.className   = 'date-picker-date' + (closed ? ' disabled' : '') + (today ? ' today' : '');
        a.href        = '#';
        a.dataset.isoKey = isoKey; // stamp tab too for refreshUI

        var numDiv         = document.createElement('div');
        numDiv.className   = 'date-picker-date-number';
        numDiv.textContent = dayNum;

        var dayDiv         = document.createElement('div');
        dayDiv.className   = 'date-picker-date-text';
        dayDiv.textContent = dayName;

        a.appendChild(numDiv);
        a.appendChild(dayDiv);
        li.appendChild(a);
        ul.appendChild(li);

        // Time panel — keyed by ISO date, not reconstructed string
        var panel           = document.createElement('div');
        panel.dataset.isoKey    = isoKey;
        panel.dataset.monthLabel = monthLabel;
        panel.dataset.dayNum    = dayNum;
        panel.dataset.dayName   = dayName;

        var slotUl       = document.createElement('ul');
        slotUl.className = 'date-picker-list animated fadeIn';

        slots.forEach(function (slot, slotIndex) {
          var slotLi = document.createElement('li');
          var slotA  = document.createElement('a');
          slotA.textContent = slot;

          var available = !closed && isSlotAvailable(date, slotIndex);
          if (!available) {
            slotLi.className = 'disabled';
          } else {
            // Capture isoKey, slot, monthLabel, dayNum, dayName in closure
            (function (capturedIso, capturedSlot, capturedMonth, capturedDayNum, capturedDayName, capturedSlotLi, capturedSlotUl) {
              slotA.addEventListener('click', function (e) {
                e.preventDefault();

                // Clear active in this panel only
                capturedSlotUl.querySelectorAll('li').forEach(function (el) {
                  el.classList.remove('active');
                });

                if (typeof toggleDateSlot === 'function') {
                  // Pass ISO key as the unique date identifier
                  toggleDateSlot(capturedSlot, capturedIso, capturedDayNum, capturedDayName, capturedMonth);
                }

                // Re-check selection and mark active
                var selections = typeof getSelections === 'function' ? getSelections() : [];
                var isSelected = selections.some(function (s) {
                  return s.isoKey === capturedIso && s.time === capturedSlot;
                });
                if (isSelected) capturedSlotLi.classList.add('active');
              });
            })(isoKey, slot, monthLabel, dayNum, dayName, slotLi, slotUl);
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

    if (window.jQuery && jQuery.fn.RDMaterialTabs) {
      jQuery('.rd-material-tabs').RDMaterialTabs();
    }

    if (typeof onDatePickerReady === 'function') {
      onDatePickerReady();
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    fetch('assets/data/step2.json')
      .then(function (r) { return r.json(); })
      .then(function (data) { config = data; render(getLang()); })
      .catch(function (err) { console.error('Error loading step2.json:', err); });
  });

  document.addEventListener('langChanged', function (e) {
    render(e.detail.lang);
  });
})();