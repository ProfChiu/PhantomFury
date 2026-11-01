#!/usr/bin/env python3
"""fw_ui_checks.py — the interface assertions, learned the hard way.

`fw_live.py` proves the page runs and throws no errors. That is necessary and
nowhere near sufficient: every interface bug found by a player in the first real
project passed a green suite. Each function here exists because something
shipped broken while the tests said fine.

    from fw_ui_checks import UI
    ui = UI(p, check)            # p: fw_live.Page, check: your ok/FAIL printer
    ui.real_click(".answers .btn")
    ui.no_button_overlap()
    ui.inside_safe_area()
    ui.min_type_size()
    ui.bands_hold_their_pieces([".wilds", ".line", ".seats-row"])
    ui.type_steps_hold()
    ui.flights_land(move_js)

Why each one:

* **real_click** — `element.click()` calls the handler directly. It cannot see
  an overlay on top of the button, a mode that swallows the action, or a
  control the player cannot reach. A button that "works" in every test and does
  nothing in the browser is the result.
* **no_button_overlap** — a CSS rule written for one thing catches another
  wearing the same class. `.ghost` for a flying card caught `.btn.ghost`, the
  quiet secondary button, and stacked two answers on the same spot.
* **bands_hold_their_pieces** — a band 104px tall drawing 147px cards hangs its
  contents over whatever is below. A band must be taller than what it holds.
* **min_type_size** — the stage is scaled to the window, so authored pixels are
  not real pixels. 13px is the floor worth defending, and a book face with a
  small x-height is not readable at label sizes.
* **type_steps_hold** — a text-size control is a promise that the layout
  survives the largest step.
* **flights_land** — motion that never finishes leaves pieces invisible.

None of these know anything about a particular game.
"""


class UI(object):
    def __init__(self, page, check, root="#app", layer="#fx"):
        self.p = page
        self.check = check
        self.root = root
        self.layer = layer

    # ------------------------------------------------------------ pointing

    def box(self, sel):
        """The element's centre in viewport pixels, or None."""
        return self.p.eval(
            "(function(){var n=document.querySelector(%r); if(!n) return null;"
            "var r=n.getBoundingClientRect(); if(!r.width||!r.height) return null;"
            "return [r.left+r.width/2, r.top+r.height/2];})()" % sel)

    def topmost(self, sel, label=None):
        """Is this element the thing a click at its own centre would hit?"""
        hit = self.p.eval(
            "(function(){var n=document.querySelector(%r); if(!n) return 'missing';"
            "var r=n.getBoundingClientRect();"
            "var h=document.elementFromPoint(r.left+r.width/2, r.top+r.height/2);"
            "if(!h) return 'nothing there';"
            "return (h===n||n.contains(h)) ? true : 'covered by '+h.tagName+'.'+h.className;})()" % sel)
        self.check(hit is True, "%s is the topmost thing at its own centre%s" % (
            label or sel, "" if hit is True else " — %s" % hit))
        return hit is True

    def real_click(self, sel, label=None):
        """Click with the mouse, at the element's centre, like a player."""
        c = self.box(sel)
        if not c:
            self.check(False, "%s is on the page to be clicked" % (label or sel))
            return False
        self.p.page.mouse.click(c[0], c[1])
        return True

    def no_button_overlap(self, sel="button"):
        hits = self.p.eval("""(function(){
          var b = [].slice.call(document.querySelectorAll(%r + ' ' + %r)), out = [];
          for (var i=0;i<b.length;i++) for (var j=i+1;j<b.length;j++) {
            var x=b[i].getBoundingClientRect(), y=b[j].getBoundingClientRect();
            if (!x.width || !y.width) continue;
            if (x.left<y.right && y.left<x.right && x.top<y.bottom && y.top<x.bottom)
              out.push(b[i].textContent.slice(0,18)+' / '+b[j].textContent.slice(0,18));
          }
          return out;})()""" % (self.root, sel))
        self.check(not hits, "no two buttons share the same space%s" %
                   ("" if not hits else ": " + str(hits[:2])))
        return not hits

    # ------------------------------------------------------------- layout

    def inside_safe_area(self):
        """Nothing readable or clickable outside the title-safe frame."""
        out = self.p.eval("""(function(){
          var safe = document.getElementById('safe') || document.querySelector('.fw-safe');
          if (!safe) return 'no safe frame';
          var r = safe.getBoundingClientRect(), bad = [];
          [].forEach.call(document.querySelectorAll(%r + ' *'), function(n){
            if (!n.offsetParent && n.tagName !== 'BODY') return;
            var b = n.getBoundingClientRect();
            if (!b.width || !b.height) return;
            if (b.left < r.left - 1 || b.right > r.right + 1 ||
                b.top < r.top - 1 || b.bottom > r.bottom + 1) {
              var cs = getComputedStyle(n.parentNode || n);
              if (cs.overflow === 'hidden' || cs.overflowY === 'hidden') return;  // clipped on purpose
              bad.push((n.className||n.tagName)+'');
            }
          });
          return bad.slice(0, 4);})()""" % self.root)
        ok = out == [] or out == "no safe frame"
        self.check(ok, "nothing spills the title-safe area%s" %
                   ("" if ok else ": " + str(out)))
        return ok

    def bands_hold_their_pieces(self, bands, piece=".card img, .hb-counter"):
        """Each band is taller than what it draws inside it."""
        bad = self.p.eval("""(function(bands, piece){
          var out = [];
          bands.forEach(function(sel){
            var n = document.querySelector(sel); if (!n) return;
            var r = n.getBoundingClientRect();
            [].forEach.call(n.querySelectorAll(piece + ', .label, .tag, .head, .banner'), function(c){
              var cr = c.getBoundingClientRect();
              if (!cr.height) return;
              if (cr.bottom > r.bottom + 1 || cr.top < r.top - 1) out.push(sel);
            });
          });
          return out.filter(function(v,i,a){ return a.indexOf(v) === i; });})(%r, %r)"""
          % (bands, piece))
        self.check(not bad, "every band is taller than what it holds%s" %
                   ("" if not bad else ": " + str(bad)))
        return not bad

    # --------------------------------------------------------------- type

    def min_type_size(self, floor=13.0, book_faces=("Cormorant", "Garamond"), where="the page"):
        worst = self.p.eval("""(function(){
          var worst = null;
          [].forEach.call(document.querySelectorAll(%r + ' *'), function(n){
            if (!n.offsetParent) return;
            if (!n.textContent || !n.textContent.trim()) return;
            if (n.children.length && n.textContent.trim() === (n.children[0].textContent||'').trim()) return;
            var cs = getComputedStyle(n), px = parseFloat(cs.fontSize);
            if (!px) return;
            if (!worst || px < worst.px)
              worst = {px: px, face: cs.fontFamily, what: (n.className||n.tagName)+'',
                       text: n.textContent.trim().slice(0, 16)};
          });
          return worst;})()""" % self.root)
        if not worst:
            self.check(False, "%s has text to measure" % where)
            return False
        ok = worst["px"] >= floor
        self.check(ok, '%s sets nothing below %gpx (smallest %.1fpx on .%s: "%s")' %
                   (where, floor, worst["px"], worst["what"].split(" ")[0], worst["text"]))
        book = any(f.lower() in worst["face"].lower() for f in book_faces)
        self.check(not book or worst["px"] >= floor + 2,
                   "and the smallest type is not set in a book face (%s)" %
                   worst["face"].split(",")[0])
        return ok

    def type_steps_hold(self, ctl=".fw-typectl input, .typectl input", table=".table"):
        """Move the control through every step; the layout must survive each."""
        steps = self.p.eval("(function(){var r=document.querySelector(%r);"
                            "return r ? parseInt(r.max,10)+1 : 0;})()" % ctl)
        if not steps:
            self.check(False, "the page carries a text-size control")
            return False
        sizes = []
        for i in range(steps):
            self.p.eval("(function(){var r=document.querySelector(%r); r.value='%d';"
                        "r.dispatchEvent(new Event('input'));})()" % (ctl, i))
            self.p.wait(200)
            over = self.p.eval("(function(){var t=document.querySelector(%r);"
                               "return t ? [t.scrollHeight-t.clientHeight, t.scrollWidth-t.clientWidth] : [0,0];})()"
                               % table)
            # measure the page's own text, not the body's inherited size: a
            # multiplier that never reached the stylesheet leaves this flat
            px = self.p.eval("(function(){var t=0,n=0;[].forEach.call(document.querySelectorAll(%r + ' *'), function(e){if (n >= 20 || !e.offsetParent) return;if (!e.textContent || !e.textContent.trim()) return;t += parseFloat(getComputedStyle(e).fontSize) || 0; n += 1; });return n ? t / n : 0;})()" % self.root)
            sizes.append(round(px, 2))
            self.check(over[0] <= 0 and over[1] <= 0,
                       "step %d of %d: the layout holds (overflow %s)" % (i + 1, steps, over))
        rising = all(sizes[i] <= sizes[i + 1] for i in range(len(sizes) - 1)) and sizes[0] < sizes[-1]
        self.check(rising, "and the steps really change the type: %s" % sizes)
        return rising

    # ------------------------------------------------------------- motion

    def flights_land(self, move_js, bursts=8, settle_ms=700):
        """A move is drawn in flight, the flight lands, and nothing stays hidden."""
        hidden = ("[].filter.call(document.querySelectorAll(%r + ' [data-uid]'),"
                  "function(c){return c.style.visibility === 'hidden';}).length" % self.root)
        flyers = "document.querySelectorAll(%r + ' .fw-flyer, %s .flyer').length" % (self.layer, self.layer)
        self.p.eval(move_js)
        seen = self.p.eval(flyers)
        self.check(seen > 0, "a piece that changes place is drawn in flight")
        self.p.wait(settle_ms)
        self.check(self.p.eval(flyers) == 0, "the flight lands and clears itself")
        self.check(self.p.eval(hidden) == 0, "and leaves no piece hidden behind it")
        for _ in range(bursts):
            self.p.eval(move_js)
            self.p.wait(40)
        self.p.wait(settle_ms)
        ok = self.p.eval(hidden) == 0 and self.p.eval(flyers) == 0
        self.check(ok, "%d moves in a burst strand nothing" % bursts)
        return ok
