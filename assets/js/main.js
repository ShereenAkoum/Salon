 (function () {
      var lang = localStorage.getItem('siteLang') || 'en';
      var html = document.documentElement;
      html.setAttribute('lang', lang);
      html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
      // Hide body until translation.js has finished applying translations
      document.write('<style id="anti-flash">body{opacity:0!important;}</style>');
    })();