import re, json, zlib, struct, base64, sys, os

def chunk(t, d):
    return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t+d) & 0xffffffff)

_cache = {}
def png(rgb):
    if rgb in _cache: return _cache[rgb]
    r,g,b = rgb
    data = (b'\x89PNG\r\n\x1a\n'
            + chunk(b'IHDR', struct.pack('>IIBBBBB',1,1,8,2,0,0,0))
            + chunk(b'IDAT', zlib.compress(bytes([0,r,g,b]),9))
            + chunk(b'IEND', b''))
    u = 'data:image/png;base64,' + base64.b64encode(data).decode()
    _cache[rgb] = u
    return u

NAMED = {'white':(255,255,255),'black':(0,0,0),'red':(255,0,0)}

def parse_color(v):
    v = v.strip().lower()
    m = re.fullmatch(r'#([0-9a-f]{3})', v)
    if m: return tuple(int(c*2,16) for c in m.group(1))
    m = re.fullmatch(r'#([0-9a-f]{6})', v)
    if m: h=m.group(1); return tuple(int(h[i:i+2],16) for i in (0,2,4))
    m = re.fullmatch(r'rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[,/]\s*([\d.]+)\s*)?\)', v)
    if m:
        a = float(m.group(4)) if m.group(4) else 1.0
        # Near-opaque surfaces (>=90%) are, to the eye, solid: the burgundy
        # nav bar rgba(42,7,18,.94) and the booking panel rgba(248,247,245,.96)
        # read as flat colour. Force-dark still recolours them, and a translucent
        # colour cannot be repainted from a flat PNG, so they used to leak. Treat
        # them as solid here so they get locked like any other surface. Genuinely
        # see-through colours (below 90%) are left alone — flattening those would
        # wipe out a deliberate blend.
        if a < 0.9: return None
        return tuple(int(float(m.group(i))) for i in (1,2,3))
    return NAMED.get(v)

def strip_comments(css):
    return re.sub(r'/\*.*?\*/', '', css, flags=re.S)

def iter_rules(css):
    """Yield (selector, declaration_block) for top-level and @media rules,
    skipping print and prefers-color-scheme blocks."""
    css = strip_comments(css)
    i, n = 0, len(css)
    while i < n:
        j = css.find('{', i)
        if j < 0: break
        prelude = css[i:j].strip()
        # find matching close brace
        depth, k = 1, j+1
        while k < n and depth:
            if css[k] == '{': depth += 1
            elif css[k] == '}': depth -= 1
            k += 1
        body = css[j+1:k-1]
        if prelude.startswith('@'):
            if prelude.startswith('@media') and 'print' not in prelude and 'prefers-color-scheme' not in prelude:
                yield from iter_rules(body)
        else:
            yield prelude, body
        i = k

def decls(body):
    out = {}
    for part in body.split(';'):
        if ':' not in part: continue
        p, v = part.split(':', 1)
        p = p.strip().lower()
        if p and '{' not in p:
            out[p] = v.strip()
    return out

def bg_color(d):
    """Return (rgb, has_image) for a declaration dict."""
    has_img = False
    rgb = None
    if 'url(' in d.get('background-image', '') or 'gradient' in d.get('background-image', ''):
        has_img = True
    for prop in ('background', 'background-color'):
        if prop not in d: continue
        v = d[prop]
        if 'url(' in v or 'gradient' in v:
            has_img = True
            continue
        c = parse_color(v) if prop == 'background-color' else None
        if prop == 'background':
            # The shorthand can carry position/size/repeat keywords around the
            # colour, and an rgb()/rgba() colour contains internal spaces
            # (e.g. `rgba(42, 7, 18, .94)`), so a naive whitespace split would
            # shatter it into unparseable tokens. Pull a full colour function
            # out first, then fall back to hex / named single tokens.
            fn = re.search(r'rgba?\([^)]*\)', v)
            if fn:
                c = parse_color(fn.group(0))
            if not c:
                for t in v.split():
                    c = parse_color(t)
                    if c: break
        if c: rgb = c
    return rgb, has_img

def prefix(sel, guard):
    sel = sel.strip()
    if not sel or sel.startswith('@') or sel.startswith('%'): return None
    if '::' in sel or re.search(r':(before|after)\b', sel): return None
    parts = []
    for s in sel.split(','):
        s = s.strip()
        if not s: continue
        if s.startswith('html'):
            s = 'html' + guard + s[4:]
        elif s.startswith(':root'):
            s = 'html' + guard + s[5:]
        else:
            s = 'html' + guard + ' ' + s
        parts.append(s)
    return ',\n'.join(parts) if parts else None

def resolve_vars(css_files):
    vars_ = {}
    for f in css_files:
        css = strip_comments(open(f, encoding='utf-8').read())
        for sel, body in iter_rules(css):
            if ':root' in sel or 'html' == sel.strip():
                for p, v in decls(body).items():
                    if p.startswith('--'):
                        vars_[p] = v.strip()
    return vars_

def deref(v, vars_, depth=0):
    if depth > 4 or 'var(' not in v: return v
    def sub(m):
        name = m.group(1).strip()
        fallback = (m.group(2) or '').strip().lstrip(',').strip()
        return vars_.get(name, fallback)
    v = re.sub(r'var\(\s*(--[\w-]+)\s*(,[^()]*)?\)', sub, v)
    return deref(v, vars_, depth+1)

# ---------------- build ----------------
BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'css') + os.sep
SOURCES = [BASE+'custom.css', BASE+'booking-modern.css', BASE+'admin-crm.css']
GUARD = '.jas-paint-lock'

vars_ = resolve_vars(SOURCES + [BASE+'style.css'])

surfaces, inks = [], []
seen_s, seen_i = set(), set()

# Any selector that anywhere in the stylesheets carries a real background
# image or gradient is left alone: repainting it with a flat colour would
# wipe out that image, and a background can be declared in one rule while
# the image arrives from another.
image_selectors = set()
for f in SOURCES:
    for sel, body in iter_rules(open(f, encoding='utf-8').read()):
        d = {k: deref(v, vars_) for k, v in decls(body).items()}
        joined = ' '.join([d.get('background', ''), d.get('background-image', '')])
        if 'url(' in joined or 'gradient' in joined:
            for part in sel.split(','):
                image_selectors.add(part.strip())

for f in SOURCES:
    css = open(f, encoding='utf-8').read()
    for sel, body in iter_rules(css):
        d = decls(body)
        d = {k: deref(v, vars_) for k, v in d.items()}
        rgb, has_img = bg_color(d)
        if any(part.strip() in image_selectors for part in sel.split(',')):
            has_img = True
        # These elements get a background image assigned at runtime from
        # application settings (hero, services, contact, page banners), so
        # they must never receive a generated flat repaint.
        if re.search(r'data-site-background|\.page-title\b|\.jas-hero\b|banner', sel):
            has_img = True
        # A rule that positions or sizes a background is describing an image
        # slot even when the image itself is declared elsewhere.
        if any(k in d for k in ('background-size', 'background-position', 'background-repeat', 'background-attachment')):
            has_img = True
        p = prefix(sel, GUARD)
        if not p: continue
        if rgb and not has_img and p not in seen_s:
            seen_s.add(p)
            surfaces.append((p, rgb))
        # Text paint only where the element has no painted background of its own,
        # otherwise the two uses of background-image would collide.
        col = parse_color(d.get('color', '')) if 'color' in d else None
        if not col or rgb or has_img:
            continue
        # A selector that paints a surface anywhere must never also be
        # clipped to its own text: that would erase the surface.
        if p in seen_s or p in seen_i:
            continue
        # Form controls break under background-clip:text, and page-level
        # shells would clip every descendant's text to one colour.
        if re.search(r'\b(input|textarea|select|option|progress|html|body)\b', p.split(GUARD)[-1]):
            continue
        seen_i.add(p)
        inks.append((p, col))

inks = [(p, c) for p, c in inks if p not in seen_s]

def hexof(rgb): return '#%02x%02x%02x' % rgb

def varname(rgb): return '--jas-paint-%02x%02x%02x' % rgb

out = []
out.append("""/* ============================================================
   JAS Premium - forced-dark paint lock (GENERATED)
   assets/css/color-lock-generated.css

   Generated from custom.css, booking-modern.css and admin-crm.css by
   tools/build-color-lock.py. Do not hand-edit: re-run the script after
   changing any of those three stylesheets.

   WHY THIS EXISTS
   `color-scheme: only light` stops Chrome's Auto Dark Theme and any
   Android WebView that allows algorithmic darkening. It does NOT stop
   Samsung Internet's Force Dark, nor a WebView pinned to the legacy
   user-agent-darkening strategy. Those engines recolour computed CSS
   colours at paint time, and a page cannot detect or refuse it.

   They do not recolour image content. So every solid surface below is
   repainted with a 1x1 PNG of the exact colour the stylesheet already
   declares, and body text is painted through `background-clip: text`
   from the same kind of image. The colours are identical to the light
   design, so nothing changes visually anywhere - this only removes the
   browser's opportunity to substitute its own colours.

   The `.jas-paint-lock` class is set by assets/js/color-lock.js on
   Android and on Samsung Internet, before first paint.
   ============================================================ */
""")

used = sorted({rgb for _, rgb in surfaces} | {rgb for _, rgb in inks})
out.append('/* 1x1 PNG of every colour the site paints, hoisted so each\n   image is defined once instead of once per rule. */\n:root {\n'
           + '\n'.join('  %s: url(%s);' % (varname(c), png(c)) for c in used)
           + '\n}\n')

out.append('''/* ---------- inheritance guard ----------
   `-webkit-text-fill-color` inherits, so a painted element would make
   every descendant's text transparent too - and a descendant that paints
   in its own layer (anything positioned, transformed or floated) is not
   covered by the ancestor's clipped background, so its text would simply
   vanish. Giving every element its own value stops the inheritance. Each
   painted element re-declares transparent with !important below, so this
   never weakens the protection where it is actually applied. */
html.jas-paint-lock * {
  -webkit-text-fill-color: currentColor;
}
''')

out.append('/* ---------- surfaces (%d rules) ---------- */\n' % len(surfaces))
for p, rgb in surfaces:
    out.append('%s {\n  background-color: %s !important;\n  background-image: var(%s) !important;\n  background-repeat: repeat !important;\n  -webkit-text-fill-color: currentColor;\n}\n' % (p, hexof(rgb), varname(rgb)))

out.append('\n/* ---------- text (%d rules) ----------\n'
           '   Wrapped in @supports so that a browser without\n'
           '   background-clip:text keeps ordinary coloured text. */\n'
           '@supports ((-webkit-background-clip: text) or (background-clip: text)) {\n' % len(inks))
for p, rgb in inks:
    body = '%s {\n  color: %s !important;\n  background-color: %s !important;\n  background-image: var(%s) !important;\n  background-repeat: repeat !important;\n  -webkit-background-clip: text !important;\n  background-clip: text !important;\n  -webkit-text-fill-color: transparent !important;\n}\n' % (p, hexof(rgb), hexof(rgb), varname(rgb))
    out.append('\n'.join('  ' + l if l else l for l in body.split('\n')))
out.append('}\n')

out.append('''
/* ---------- safety net ----------
   `-webkit-text-fill-color: transparent` inherits. Form controls and
   placeholders must never inherit it from a painted ancestor, or the
   visitor would be typing into an invisible field. */
html.jas-paint-lock input,
html.jas-paint-lock textarea,
html.jas-paint-lock select,
html.jas-paint-lock option,
html.jas-paint-lock button {
  -webkit-text-fill-color: currentColor !important;
  -webkit-background-clip: border-box !important;
  background-clip: border-box !important;
}

html.jas-paint-lock input::placeholder,
html.jas-paint-lock textarea::placeholder {
  -webkit-text-fill-color: currentColor !important;
  opacity: 1 !important;
}
''')

css = '\n'.join(out)
open(BASE+'color-lock-generated.css','w',encoding='utf-8').write(css)
print('surfaces:', len(surfaces), 'text:', len(inks), 'unique colors:', len(_cache), 'size KB:', round(len(css)/1024,1))
