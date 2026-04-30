(function () {
  var html = document.documentElement;
  // langLabel: update ALL instances (original + sticky clone)
  function getLangLabels() {
    return document.querySelectorAll('.lang-switcher .lang-label');
  }
  var currentLang = localStorage.getItem('siteLang') || 'en';

  // ── Fetch both JSON files in parallel ────────────────────────────────
  Promise.all([
    fetch('assets/data/index.json').then(function (r) { return r.json(); }),
    fetch('assets/data/nav.json').then(function (r) { return r.json(); }),
    fetch('assets/data/categoryServices.json').then(function (r) { return r.json(); })
  ]).then(function (results) {
    var pageData = results[0];
    var navData = results[1];
    var categoryServData = results[2];

    // Flatten pageData into a dot-notation lookup map
    // e.g. { "mainSection.title": {en:"...", ar:"..."}, ... }
    var translations = {};

    function flattenSection(obj, prefix) {
      Object.keys(obj).forEach(function (rawKey) {
        var val = obj[rawKey];

        // Keys like "title-en" → strip suffix, collect both langs
        var langMatch = rawKey.match(/^(.+)-(en|ar)$/);
        if (langMatch) {
          var cleanKey = prefix + '.' + langMatch[1];
          var lang = langMatch[2];
          if (!translations[cleanKey]) translations[cleanKey] = {};
          translations[cleanKey][lang] = val;
          return;
        }

        // Arrays (ourServices.items, openingHours.days)
        if (Array.isArray(val)) {
          val.forEach(function (item) {
            var itemKey = item.key;
            if (!itemKey) return;
            Object.keys(item).forEach(function (ik) {
              if (ik === 'key') return;
              var im = ik.match(/^(.+)-(en|ar)$/);
              if (im) {
                // Include the rawKey (e.g. "items", "days") in the path
                var fk = prefix + '.' + rawKey + '.' + itemKey + '.' + im[1];
                if (!translations[fk]) translations[fk] = {};
                translations[fk][im[2]] = item[ik];
              }
            });
          });
          return;
        }

        // Nested object — recurse
        if (typeof val === 'object' && val !== null) {
          flattenSection(val, prefix + '.' + rawKey);
          return;
        }
      });
    }

    // Process pageData sections
    Object.keys(pageData).forEach(function (section) {
      flattenSection(pageData[section], section);
    });

    // Process navData: keys are already "home", "services" etc.
    ['en', 'ar'].forEach(function (lang) {
      Object.keys(navData[lang]).forEach(function (key) {
        var fk = 'nav.' + key;
        if (!translations[fk]) translations[fk] = {};
        translations[fk][lang] = navData[lang][key];
      });
    });

    // Process categoryServices: flatten category name-en/name-ar into
    // "categoryServices.categories.<key>.name" translation entries
    // where key = sku of first service (unique identifier)
    if (categoryServData && categoryServData.categories) {
      categoryServData.categories.forEach(function (cat) {
        // Use the first service's sku as the key, fallback to slugified name
        var key = (cat.services && cat.services[0] && cat.services[0].sku)
          ? cat.services[0].sku
          : (cat['name-en'] || '').toLowerCase().replace(/\s+/g, '_');

        ['en', 'ar'].forEach(function (lang) {
          var nameKey = 'categoryServices.categories.' + key + '.name';
          if (!translations[nameKey]) translations[nameKey] = {};
          translations[nameKey][lang] = cat['name-' + lang] || cat['name-en'];
        });

        // Also flatten individual service names within the category
        if (cat.services) {
          cat.services.forEach(function (service) {
            if (!service.sku) return;
            ['en', 'ar'].forEach(function (lang) {
              var sKey = 'categoryServices.services.' + service.sku + '.name';
              if (!translations[sKey]) translations[sKey] = {};
              translations[sKey][lang] = service['name-' + lang] || service['name-en'] || cat['name-' + lang];
            });
          });
        }
      });

      // Also expose top-level title/description/button from categoryServices
      // (so data-i18n="categoryServices.title" etc. work)
      ['title', 'description', 'button', 'bookNow'].forEach(function (field) {
        ['en', 'ar'].forEach(function (lang) {
          var val = categoryServData[field + '-' + lang];
          if (val) {
            var fk = 'categoryServices.' + field;
            if (!translations[fk]) translations[fk] = {};
            translations[fk][lang] = val;
          }
        });
      });
    }

    // ── Core apply function ───────────────────────────────────────────
    function applyLang(lang, isInitial) {
      // On manual switch: brief fade for smooth UX
      // On initial load: skip fade entirely — body is already hidden by anti-flash style
      if (!isInitial) {
        document.body.classList.add('lang-transitioning');
      }
 
      function doApply() {
        // Direction + lang attribute
        html.setAttribute('lang', lang);
        html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
 
        // Translate every keyed element
        var els = document.querySelectorAll('[data-i18n]');
        els.forEach(function (el) {
          var key = el.getAttribute('data-i18n');
          var data = translations[key];
          if (!data || !data[lang]) return;
          var text = data[lang];
          if (text.indexOf('<') !== -1) {
            el.innerHTML = text;
          } else {
            el.textContent = text;
          }
        });
 
        // Update ALL lang switcher labels (original + sticky clone)
        if (translations['nav.langSwitcherLabel']) {
          getLangLabels().forEach(function (el) {
            el.textContent = translations['nav.langSwitcherLabel'][lang] || '';
          });
        }
 
        localStorage.setItem('siteLang', lang);
        currentLang = lang;
        document.body.classList.remove('lang-transitioning');
 
        // Remove the anti-flash style so the page becomes visible
        var antiFlash = document.getElementById('anti-flash');
        if (antiFlash) antiFlash.parentNode.removeChild(antiFlash);
 
        // Notify dynamic renderers (e.g. services.js) about the language change
        document.dispatchEvent(new CustomEvent('langChanged', { detail: { lang: lang } }));
      }
 
      if (isInitial) {
        doApply();
      } else {
        setTimeout(doApply, 150);
      }
    }
 
    // Initial render — synchronous, no flash
    applyLang(currentLang, true);

    // Use event delegation on document so both the original navbar
    // and the sticky cloned navbar are covered by a single listener.
    document.addEventListener('click', function (e) {
      var anchor = e.target.closest('.lang-switcher');
      if (!anchor) return;
      e.preventDefault();
      applyLang(currentLang === 'en' ? 'ar' : 'en');
      // Close mobile menu if open
      document.querySelectorAll('.rd-navbar-nav-wrap.active').forEach(function (wrap) {
        wrap.classList.remove('active');
      });
      document.querySelectorAll('.rd-navbar-toggle.active').forEach(function (btn) {
        btn.classList.remove('active');
      });
      document.querySelectorAll('.rd-navbar-wrap.active').forEach(function (btn) {
        btn.classList.remove('active');
      });

      document.querySelectorAll('.page-content.active.modalView').forEach(function (btn) {
        btn.classList.remove('active', 'modalView');
      });


    });

  }).catch(function (err) {
    console.error('[i18n] Failed to load translation files:', err);
  });
})();