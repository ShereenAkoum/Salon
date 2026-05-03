(function () {
  var lang = localStorage.getItem('siteLang') || 'en';
  var html = document.documentElement;
  html.setAttribute('lang', lang);
  html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  document.write('<style id="anti-flash">body{opacity:0!important;}</style>');

  const currentPage = window.location.pathname.split("/").pop() || 'index.html';

  fetch("metaHead.html")
    .then(response => response.text())
    .then(data => {
      var temp = document.createElement('div');
      temp.innerHTML = data;
      Array.from(temp.childNodes).forEach(function (node) {
        document.head.appendChild(node.cloneNode(true));
      });
    })
    .catch(error => console.error("Error loading metaHead:", error));

  fetch("footer.html")
    .then(response => response.text())
    .then(data => {
      document.getElementById("footer-placeholder").innerHTML = data;
    })
    .catch(error => console.error("Error loading footer:", error));

  if (currentPage !== "index.html") {

    // ✅ header first, then navbar
    fetch("header.html")
      .then(response => response.text())
      .then(data => {
        document.getElementById("page-header").innerHTML = data;

        return fetch("rdNavBar.html");
      })
      .then(response => response.text())
      .then(data => {
        document.getElementById("rdNavBar").innerHTML = data;

        // Set active nav link
        document.querySelectorAll('#rdNavBar .rd-navbar-nav a').forEach(function (link) {
          link.parentElement.classList.remove('active');
          if (link.getAttribute('href') === currentPage) {
            link.parentElement.classList.add('active');
          }
        });

        // Reinitialize RD Navbar plugin
        var $nav = $('.rd-navbar');
        if ($nav.length && typeof $nav.RDNavbar === 'function') {
          $nav.RDNavbar();
        }

        // Reinit perspective menu
        var nav = $('.rd-navbar-wrap');
        var perspective = $('#perspective');

        if (perspectiveMenu.length) {
          $('#perspective-open-menu').on('click', function () {
            nav.addClass('active');
            perspective.addClass('active modalView');
          });
          $('#perspective-content-overlay').on('click', function () {
            nav.removeClass('active');
            perspective.removeClass('active');
            setTimeout(function () {
              perspective.removeClass('modalView');
            }, 400);
          });
        }

        // ✅ Notify translation.js only after both are done
        document.dispatchEvent(new CustomEvent('navbarLoaded'));
      })
      .catch(error => console.error("Error loading header/navbar:", error));
  }
})();