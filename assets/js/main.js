(function () {
  var lang = localStorage.getItem('siteLang') || 'en';
  var html = document.documentElement;
  html.setAttribute('lang', lang);
  html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  // Hide body until translation.js has finished applying translations

  const currentPage = window.location.pathname.split("/").pop();

  fetch("footer.html")
    .then(response => response.text())
    .then(data => {
      document.getElementById("footer-placeholder").innerHTML = data;
    })
    .catch(error => console.error("Error loading footer:", error));
  if (currentPage !== "index.html") {
    {
      fetch("rdNavBar.html")
        .then(response => response.text())
        .then(data => {
          document.getElementById("rdNavBar").innerHTML = data;

          // ✅ Set active class based on current page
          document.querySelectorAll('#rdNavBar .rd-navbar-nav a').forEach(function (link) {
            link.parentElement.classList.remove('active');
            if (link.getAttribute('href') === currentPage) {
              link.parentElement.classList.add('active');
            }
          });

          // ✅ Reinitialize RD Navbar plugin on the newly injected element
          var $nav = $('.rd-navbar');
          if ($nav.length && typeof $nav.RDNavbar === 'function') {
            $nav.RDNavbar();
          }

          // ✅ Notify translation.js
          document.dispatchEvent(new CustomEvent('navbarLoaded'));
        })
        .catch(error => console.error("Error loading navbar:", error));
    }
  }
  document.write('<style id="anti-flash">body{opacity:0!important;}</style>');
})();