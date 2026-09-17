(function () {
  // Support both the original .html URLs and Cloudflare's clean URLs
  // (for example /vouchers -> vouchers.html). This keeps page-specific
  // loading working regardless of which URL format the host serves.
  const pathname = window.location.pathname.replace(/\/+$/, '');
  const lastPathPart = pathname.split("/").pop() || 'index.html';
  const currentPage = lastPathPart.indexOf('.') === -1
    ? lastPathPart + '.html'
    : lastPathPart;

  // Booking selections are transient. Never leave service/voucher/date/time
  // selections behind in localStorage when the visitor leaves the booking flow.
  const BOOKING_LOCAL_KEYS = [
    'salonBookingDraft',
    'bookingServiceSku',
    'bookingVoucher',
    'service',
    'selectedDates'
  ];

  function clearBookingStorage() {
    BOOKING_LOCAL_KEYS.forEach(function (key) {
      try { localStorage.removeItem(key); } catch (e) { }
    });
    try { sessionStorage.removeItem('bookingHandoff'); } catch (e) { }
  }

  // The booking page owns its state. Any other page is a clean entry point.
  if (currentPage !== 'booking.html') {
    clearBookingStorage();
  }


  // Shared sticky navigation state. The header stays pinned while scrolling and
  // becomes slightly more compact after the first scroll.
  function updateLuxuryNav() {
    document.body.classList.toggle('jas-nav-scrolled', window.scrollY > 24);
  }
  window.addEventListener('scroll', updateLuxuryNav, { passive: true });
  updateLuxuryNav();

  // When navigating from another page (for example vouchers.html) to
  // index.html#contacts, some of the shared page fragments load after the
  // browser performs its initial hash jump. Re-apply the hash position after
  // the page has finished loading so it cannot fall back to the top.
  function restoreHashNavigation() {
    if (currentPage !== 'index.html' || window.location.hash !== '#contacts') return;

    function scrollToContact() {
      var target = document.getElementById('contacts');
      if (!target) return;
      var header = document.querySelector('.jas-home-header, .jas-nav-shell');
      var offset = header ? Math.max(header.getBoundingClientRect().height, 0) + 16 : 16;
      var top = target.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
    }

    // Run after the initial DOM/hash restoration and again after dynamic
    // content (translations, vouchers, branding, images) has settled.
    requestAnimationFrame(function () {
      requestAnimationFrame(scrollToContact);
    });
    setTimeout(scrollToContact, 150);
    setTimeout(scrollToContact, 500);
    setTimeout(scrollToContact, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restoreHashNavigation, { once: true });
  } else {
    restoreHashNavigation();
  }
  window.addEventListener('load', restoreHashNavigation, { once: true });

  async function loadVouchers() {
    const container = document.getElementById('vouchers-grid');
    if (!container) return;

    try {
      if (!window.salonDatabase || typeof window.salonDatabase.getVouchers !== 'function') {
        throw new Error('Supabase voucher catalogue is not available.');
      }

      const allVouchers = await window.salonDatabase.getVouchers();

      // The homepage is a featured preview: show only the first 6 vouchers.
      // The dedicated vouchers page continues to show the complete catalogue.
      const rows = currentPage === 'index.html'
        ? allVouchers.slice(0, 6)
        : allVouchers;
      let mainCurrency = 'USD';
      try {
        if (window.getApplicationSettings) {
          const settings = await window.getApplicationSettings();
          mainCurrency = String((settings && settings.display_currency) || 'USD').toUpperCase();
        }
      } catch (e) { }

      container.innerHTML = rows.map(v => {
        const titleEn = v.title_en || v.title || 'Voucher';
        const titleAr = v.title_ar || titleEn;
        const image = window.salonDatabase.getVoucherImageUrl(v.image_path || v.image || '');
        const payload = JSON.stringify({
          id: v.id,
          sku: v.sku || ('V-' + String(v.id).padStart(3, '0')),
          title: titleEn,
          titleEn: titleEn,
          titleAr: titleAr,
          image: image,
          durationMinutes: Number(v.duration_minutes || 30),
          price: v.price_usd == null || v.price_usd === '' ? null : Number(v.price_usd),
          priceQar: v.price_qar == null || v.price_qar === '' ? null : Number(v.price_qar),
          discountType: v.discount_type === 'fixed' ? 'fixed' : 'percentage',
          discountValue: v.discount_value == null ? 0 : Number(v.discount_value),
          active: v.active !== false
        }).replace(/"/g, '&quot;');

        return `
    <a href="booking.html"
       class="voucher-card"
       data-voucher='${payload}'
       aria-label="Book ${String(titleEn).replace(/"/g, '&quot;')}">
        ${image
            ? `<img src="${image}" alt="${String(titleEn).replace(/"/g, '&quot;')}">`
            : '<div class="voucher-card-placeholder">Voucher</div>'}
        <div class="overlay">
            <span data-i18n="voucher.select">Select</span>
        </div>
    </a>`;

      }).join('');

      container.querySelectorAll('[data-voucher]').forEach(card => {
        card.addEventListener('click', function () {
          try {
            const voucher = JSON.parse(card.getAttribute('data-voucher'));
            // Pass the voucher only for this navigation. It is not
            // persisted in localStorage.
            sessionStorage.setItem('bookingHandoff', JSON.stringify({
              type: 'voucher',
              voucher: voucher
            }));
          } catch (e) {
            console.error('Could not prepare voucher booking:', e);
          }
        });
      });
    } catch (err) {
      console.error('[Vouchers] Could not load vouchers from Supabase:', err);
      container.innerHTML = '';
    }
  }

  fetch("seo-head.html")
    .then(response => response.text())
    .then(data => {
      var temp = document.createElement('div');
      temp.innerHTML = data;
      Array.from(temp.childNodes).forEach(function (node) {
        document.head.appendChild(node.cloneNode(true));
      });
      if (window.getApplicationSettings && window.applyApplicationBranding) {
        window.getApplicationSettings().then(function (settings) {
          window.applyApplicationBranding(settings);
        }).catch(function () { });
      }
    })
    .catch(error => console.error("Error loading seo head:", error));

  fetch("site-footer.html")
    .then(response => response.text())
    .then(data => {
      document.getElementById("footer-placeholder").innerHTML = data;
      if (window.getApplicationSettings && window.applySocialLinks) {
        window.getApplicationSettings().then(function (settings) {
          // The footer fragment is inserted after application-settings.js has
          // already run once. Re-apply branding now so the CRM-managed footer
          // logo is populated into the newly inserted DOM.
          if (window.applyApplicationBranding) window.applyApplicationBranding(settings);
          if (window.applyWebsiteImages) window.applyWebsiteImages(settings);
          if (window.applyLandscapeImages) window.applyLandscapeImages(settings);
          window.applySocialLinks(settings.__social || {});
        }).catch(function () { });
      }
    })
    .catch(error => console.error("Error loading footer:", error));

  {
    // Shared luxury navigation on every page — including the home page. The same
    // header markup, logo, mobile menu and sticky behavior are used site-wide,
    // so site-header.html is the single source of truth for the navigation.
    fetch("site-header.html")
      .then(response => response.text())
      .then(data => {
        document.getElementById("page-header").innerHTML = data;

        if (window.getApplicationSettings && window.applyApplicationBranding) {
          window.getApplicationSettings().then(function (settings) {
            window.applyApplicationBranding(settings);
          }).catch(function () { });
        }

        // Highlight the current page.
        document.querySelectorAll('.jas-desktop-nav [data-nav-page]').forEach(function (link) {
          link.classList.toggle('is-active', link.getAttribute('data-nav-page') === currentPage);
        });

        // Shared mobile menu behavior.
        var toggle = document.querySelector('#page-header .jas-menu-toggle');
        var menu = document.querySelector('#page-header .jas-mobile-menu');
        if (toggle && menu) {
          toggle.addEventListener('click', function () {
            var open = document.body.classList.toggle('jas-menu-open');
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            menu.setAttribute('aria-hidden', open ? 'false' : 'true');
          });
          menu.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function () {
              document.body.classList.remove('jas-menu-open');
              toggle.setAttribute('aria-expanded', 'false');
              menu.setAttribute('aria-hidden', 'true');
            });
          });
        }

        document.dispatchEvent(new CustomEvent('navbarLoaded'));
      })
      .catch(error => console.error("Error loading shared site header:", error));
  }

  if (currentPage === "index.html" || currentPage === "vouchers.html") {
    loadVouchers();
  }
})();

