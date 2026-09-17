/* ============================================================
   JAS Premium - forced-dark text paint
   assets/js/color-lock.js

   Surfaces are locked statically in color-lock-generated.css. Text
   cannot be: whether an element may be clipped to its own text depends
   on whether that element also paints a background, and two different
   selectors can hit the same element from different stylesheets. Doing
   it in CSS meant guessing at the cascade, and a guess that lost turned
   a filled button into an empty outline.

   So the text paint is decided per element, from the computed style:
   an element is painted only when it owns visible text directly and has
   no background of its own. Everything else is left exactly as it is.

   Painting means drawing the element's own text colour into a 1x1
   canvas image and showing the text through it with background-clip:
   text. Force-dark engines recolour CSS colours, not image content, so
   the text keeps the colour the design asked for.

   Runs only when color-lock's head script has set .jas-paint-lock
   (Android browsers and Samsung Internet).
   ============================================================ */
(function () {
  'use strict';

  var root = document.documentElement;
  if (!root.classList.contains('jas-paint-lock')) return;

  var canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  var ctx = canvas.getContext && canvas.getContext('2d');
  if (!ctx) return;

  var cache = Object.create(null);

  function imageFor(color) {
    if (cache[color]) return cache[color];
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    var url;
    try {
      url = 'url("' + canvas.toDataURL() + '")';
    } catch (e) {
      return null;
    }
    cache[color] = url;
    return url;
  }

  function isOpaque(color) {
    var m = /rgba?\(([^)]+)\)/.exec(color || '');
    if (!m) return false;
    var parts = m[1].split(',');
    return parts.length < 4 || parseFloat(parts[3]) > 0.9;
  }

  // Form controls are excluded here and reset in the generated stylesheet:
  // the two must agree, or a control ends up with a painted box and no
  // visible glyph. Buttons keep ordinary coloured text.
  var SKIP = /^(INPUT|TEXTAREA|SELECT|OPTION|OPTGROUP|BUTTON|IMG|SVG|CANVAS|VIDEO|AUDIO|IFRAME|SCRIPT|STYLE|NOSCRIPT|BR|HR)$/;

  function ownsText(el) {
    for (var n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3 && n.nodeValue && n.nodeValue.trim()) return true;
    }
    return false;
  }

  function paint(el) {
    if (el.getAttribute('data-jas-painted')) return;
    if (SKIP.test(el.tagName)) return;
    if (!ownsText(el)) return;

    var cs = window.getComputedStyle(el);
    // An element that paints its own background is already protected by
    // the generated stylesheet, and clipping it to text would erase that
    // background. Leave it alone.
    if (isOpaque(cs.backgroundColor)) return;
    if (cs.backgroundImage && cs.backgroundImage !== 'none') return;
    if (!isOpaque(cs.color)) return;

    var url = imageFor(cs.color);
    if (!url) return;

    el.style.backgroundImage = url;
    el.style.backgroundRepeat = 'repeat';
    el.style.webkitBackgroundClip = 'text';
    el.style.backgroundClip = 'text';
    el.style.webkitTextFillColor = 'transparent';
    el.setAttribute('data-jas-painted', '1');
  }

  function sweep(scope) {
    var nodes = (scope || document.body).querySelectorAll('*');
    for (var i = 0; i < nodes.length; i++) paint(nodes[i]);
    if (scope && scope.nodeType === 1) paint(scope);
  }

  function start() {
    if (!document.body) return;
    sweep(document.body);

    // The booking flow, the FAQ list and the vouchers grid all render
    // their content after load, so repaint whatever arrives later.
    if (window.MutationObserver) {
      var pending = null;
      var observer = new MutationObserver(function (records) {
        if (pending) return;
        pending = setTimeout(function () {
          pending = null;
          for (var i = 0; i < records.length; i++) {
            var added = records[i].addedNodes;
            for (var j = 0; j < added.length; j++) {
              if (added[j].nodeType === 1) sweep(added[j]);
            }
          }
        }, 60);
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
