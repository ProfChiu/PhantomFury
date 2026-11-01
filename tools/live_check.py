#!/usr/bin/env python3
"""live_check.py — open game/index.html in headless Chromium and play it.

Phantom Fury's board is an area graph (the real map scan with Zone tiles,
Location dots and Street chips over it), so the gestures are this game's own:
  1. opens the page with a fixed seed and checks the board rendered
  2. takes the first legal action that has a board gesture, by clicking it the
     way a player would (click a counter, then click where it goes), and
     checks the engine moved on
  3. finishes Setup with the Auto setup button, ends the Support Phase from
     the action list, and checks the phase advanced
  0. the title screen opens every visit: credits, Play / Learn to play /
     Load a saved game; the logo brings it back; How to play still works
  4. plays the whole lesson: Continue where the lesson shows, and a real
     gesture where it hands over the move — offering one wrong move first
     (through the lesson object the page itself uses), which must be refused
     while the lesson waits
  5. runs the interface assertions from fw_ui_checks (a real mouse click, no
     two chrome buttons sharing space, nothing outside the title-safe area,
     no type below 13px, the layout holding at every text-size step)
  6. does the placement check again at a LAPTOP size (1412 x 849): every
     counter must sit on its own Location at the scaled size too, after a
     rebuild, and a real click-move must land
  7. fails on ANY console error or page error
  8. the refinements a player asked for: a piece caught in flight when it
     changes place, the floating decision panel (pieces, their actions,
     END PHASE, Save in progress), the right panel's change feed naming
     the phase change, and mouse-wheel zoom on the map with a Reset
  9. the popup pass: the panels live behind large dock buttons (What
     changed, Pieces, Actions, Game log), one popup open at a time over
     a dimmed table, and text starting half again as large as the kit's
     base step
 10. the full-screen pass: the map owns the whole 1920 x 1080 stage,
     the game-menu buttons and the text slider ride in a menu bar across
     the top with the status line in a second bar under it, and the
     dock buttons stand in a vertical line on the right side
 11. the player's five fixes: the Zone tiles carry no number of their
     own (the map prints it), counters sit centred on their Location
     squares, the home view fits the playable grid (a bigger map), the
     overlay dots and street chips shrink back, and the turn-move
     panel collapses into a Decide button in the dock
 12. the menu strip pass: the menu and status bars are a permanent
     strip at the top of the stage (not floaters over the map) with
     the map in its own viewport below them, and the zoom cap runs
     past the board file's natural resolution
 13. the frame pass: the game is one framed box (the title-safe area)
     with the menu strip flush across its top; Decide is a popup like
     the others; zoom is four fixed levels (City / District / Zone /
     Close), Close being the scan at 1:1, and the map layer is not left
     as a cached raster at rest
 14. the margins pass: the owner's cropped board image (coordinates
     shifted by the crop recorded in the data), City exactly as wide
     as the map, the Turn / VP / Mission markers on their printed
     spaces and not clickable, waiting reinforcements in their reserve
     boxes and clickable, the hover card, and a drag let go off the map
     ending there

    python3 tools/live_check.py                 # pass/fail
    python3 tools/live_check.py --shot DIR      # also save screenshots there

Extend it as the game grows: a check here is the only proof a click works.
"""
import argparse
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(HERE, "fw", "test"))
from fw_live import Page  # noqa: E402
from fw_ui_checks import UI  # noqa: E402

# In a lesson beat that waits for the player: the move it wants, as a board
# gesture or a button, plus one legal move it does not want (offered through
# the lesson object to prove the refusal — the page only renders the moves
# the lesson asks for, so a wrong move cannot be clicked into existence).
LESSON_MOVE = """(function(){
  var A = window[%(ns)r + 'App'], G = window[%(ns)r], t = A.tutorial, s = A.session.state;
  function how(a) { var g = A.gestureOf(a, s); return g ? { g: g } : { loose: a.type }; }
  var want = (A.lessonFocus ? A.lessonFocus() : t.matches())[0];   // the move the guide rings
  var other = G.legalActions(s).filter(function (a) { return !t.wants(a); })[0];
  var wrong = null;
  if (other) { var i = t.i, r = t.offer(other); wrong = { ok: r.ok, why: r.why || '', stayed: t.i === i }; }
  return { want: want ? how(want) : null, wrong: wrong, i: t.i };
})()"""

FIRST_GESTURE = """(function(){
  var A = window[%(ns)r + 'App'], G = window[%(ns)r], s = A.session.state;
  var L = G.legalActions(s);
  for (var i = 0; i < L.length; i++) { var g = A.gestureOf(L[i], s); if (g) return { action: L[i], g: g }; }
  return null;
})()"""

# Every counter on the board must sit on its own Location (or Street
# Section): expected centre from the board data, actual centre from the DOM.
PLACED = """(function(){
  var A = window[%(ns)r + 'App'], G = window[%(ns)r], B = G.board;
  var br = document.getElementById('board-world').getBoundingClientRect();
  var C = B.meta.imageCrop || { x: 0, y: 0, w: B.meta.boardSize[0], h: B.meta.boardSize[1] };
  var k = parseFloat((document.querySelector('.fw-stage') || {dataset:{}}).dataset.scale || '1');
  var bad = 0, n = 0;
  A.project(A.session.state).units.forEach(function (u) {
    if (!u.pos) return;
    var el = document.querySelector(".pf-unit[data-uid='" + u.uid + "']");
    if (!el) return;
    var xy;
    if (u.pos.street != null) xy = B.streets[u.pos.street - 1].centre;
    else {
      var loc = null;
      B.zones[u.pos.zone - 1].locations.forEach(function (l) { if (l.id === u.pos.loc) loc = l; });
      xy = loc ? [loc.x, loc.y] : B.zones[u.pos.zone - 1].centre;
    }
    var ex = br.left + (xy[0] - C.x) / C.w * br.width, ey = br.top + (xy[1] - C.y) / C.h * br.height;
    var r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    n += 1;
    if (Math.abs(cx - ex) > 46 * k || Math.abs(cy - ey) > 46 * k) bad += 1;
  });
  return [bad, n, k];})()"""


def main(argv):
    ap = argparse.ArgumentParser()
    ap.add_argument("--shot")
    a = ap.parse_args(argv)
    pj = json.load(open(os.path.join(HERE, "project.json")))
    ns = pj["namespace"]
    app = ns + "App"
    problems = []

    def check(cond, msg):
        print(("  ok   " if cond else "  FAIL ") + msg)
        if not cond:
            problems.append(msg)

    def on_board(p, sel):
        """Click a map element the way a player does: if a panel covers it
        (the lesson panel, the dock), pan the map to bring it out first."""
        p.eval("""(function(){var el=document.querySelector(%r); if(!el) return;
          var r=el.getBoundingClientRect(), cx=r.left+r.width/2, cy=r.top+r.height/2;
          var top=document.elementFromPoint(cx,cy); if(top && el.contains(top)) return;
          var b=document.getElementById('board').getBoundingClientRect();
          var k=parseFloat(document.querySelector('.fw-stage').dataset.scale||'1');
          %s.panBy((b.left+b.width*0.35-cx)/k, (b.top+b.height*0.45-cy)/k);})()""" % (sel, app))
        p.wait(150)
        p.click(sel)

    def bubble_clear(p, where):
        """The guide's bubble never covers the ring it points at."""
        r = p.eval("""(function(){var s=document.getElementById('lesson-spot'), t=document.getElementById('tutor');
          if (s.hidden || s.classList.contains('none') || t.hidden) return null;
          var a=s.getBoundingClientRect(), b=t.getBoundingClientRect();
          var ox=Math.min(a.right,b.right)-Math.max(a.left,b.left), oy=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
          return ox > 2 && oy > 2 ? [Math.round(ox), Math.round(oy)] : 0;})()""")
        if r is not None:
            check(r == 0, "%s: the bubble stays off the ring%s" % (where, "" if r == 0 else " (overlap %s)" % (r,)))

    # Ch 4-6 close on an after-action report: every decision, what to remember, what's next
    def debrief_at_finish(p, ch, n):
        if p.eval("document.getElementById('btn-continue').textContent") != "Finish":
            return
        p.wait(1800)
        db = p.eval("[document.querySelectorAll('#beat-debrief .db-row').length, document.querySelectorAll('#beat-debrief .db-take li').length,"
                    " document.querySelector('#beat-debrief .db-next') ? 1 : 0,"
                    " (function(){var b=document.getElementById('tutor-body'); return b.scrollHeight - b.clientHeight;})()]")
        check(db[0] >= n and db[1] >= 3 and db[2] == 1 and db[3] <= 2,
              "chapter %s closes on a debrief, all in view: %d decisions, %d takeaways, the next chapter (overflow %dpx)" % (ch, db[0], db[1], db[3]))
        if a.shot:
            p.screenshot(os.path.join(a.shot, "debrief-%s.png" % ch))

    def gesture(p, how):
        """Make a move the way a player does: click, then click."""
        if how.get("loose"):
            # the lesson puts its button in the guide's bubble; a match, the Decide panel
            if p.eval("!!%s.tutorial" % app):
                # the button must show without scrolling the bubble (owner, 2026-10-19:
                # it hid under the dice report and only "Leave lesson" was in view)
                seen = p.eval("""(function(){var b=document.querySelector('#lesson-acts button'),
                  r=b.getBoundingClientRect(), x=r.left+r.width/2, y=r.top+r.height/2,
                  e=document.elementFromPoint(x,y); return !!e && (e===b || b.contains(e));})()""")
                check(seen, "the lesson's button is in view without scrolling")
            if p.eval("!!%s.tutorial" % app):
                p.click("#lesson-acts button", wait=300)
            else:
                if p.eval("document.getElementById('decision-panel').hidden"):
                    p.click("#dock-decisions", wait=300)
                p.click("#decision-panel .decision-actions button", wait=300)
            return
        g = how["g"]
        if g.get("street") is not None and "uid" not in g:
            on_board(p, "[data-street='%s']" % g["street"])
        else:
            # A reserve piece lives in the Pieces popup now: open it the
            # way a player does (picking the piece closes it again, and
            # the second half of the gesture lands on the board).
            # (A reserve also stands in its box on the map's margin; the
            # Pieces popup is the path that is on screen at any zoom.)
            in_pools = p.eval("!document.querySelector(\"#board .pf-unit:not(.in-box)[data-uid='%s']\") && "
                              "!!document.querySelector(\"#pools .pf-unit[data-uid='%s']\")" % (g["uid"], g["uid"]))
            in_tray = p.eval("!!document.querySelector(\"#reserve-tray:not([hidden]) .pf-unit[data-uid='%s']\")" % g["uid"])
            if in_tray:
                # the reserve tray is the player's path now (no popup to open)
                p.click("#reserve-tray .pf-unit[data-uid='%s']" % g["uid"])
            elif in_pools:
                if p.eval("document.getElementById('popup-pieces').hidden"):
                    p.click("#dock-pieces", wait=300)
                p.click("#pools .pf-unit[data-uid='%s']" % g["uid"])
            else:
                on_board(p, "#board .pf-unit[data-uid='%s']" % g["uid"])
            if g.get("target"):
                on_board(p, "#board .pf-unit[data-uid='%s']" % g["target"])
            elif g.get("to"):
                to = g["to"]
                if to.get("street") is not None:
                    on_board(p, "[data-street='%s']" % to["street"])
                else:
                    on_board(p, "[data-loc='%s:%s']" % (to["zone"], to["loc"]))
            elif g.get("zone") is not None:
                loc = p.eval("%s.entryLoc(%s.session.state, %d)" % (ns, app, g["zone"]))
                on_board(p, "[data-loc='%s:%s']" % (g["zone"], loc))
        p.wait(300)

    with Page() as p:
        p.open(os.path.join(HERE, "game", "index.html"), "seed=live-check")

        # ---- 0. the title screen, every visit: credits and three ways in
        # (Play, Learn to play, Load a saved game); nothing else is clickable.
        TS = "document.getElementById('title-screen')"
        check(p.eval("!%s.hidden" % TS), "the page opens on the title screen")
        name = p.eval("document.getElementById('ts-name').textContent") or ""
        orig = p.eval("document.getElementById('ts-orig-text').textContent") or ""
        check(name == "Phantom Fury" and "Laurent Closier" in orig and "Nuts!" in orig,
              "which names the game and credits its designer and publisher")
        ui0 = UI(p, check, root="body")
        for sel, lab in (("#btn-title-play", "Play"), ("#btn-title-learn", "Learn to play"),
                         ("#btn-title-load", "Load a saved game")):
            ui0.topmost(sel, lab)
        check(p.eval("document.getElementById('btn-title-load').disabled"),
              "Load is greyed while there is no saved game")
        ui0.real_click("#btn-title-learn", "Learn to play")
        p.wait(250)
        check(p.eval("%s.hidden && !document.getElementById('chapters').hidden" % TS),
              "Learn to play opens the chapters")
        ui0.real_click("#btn-chapters-close", "Close")
        p.wait(150)
        RD = "document.getElementById('ready')"
        check(p.eval("!%s.hidden" % RD), "closing the chapters without one asks Ready to play?")
        p.page.keyboard.press("Escape")
        p.wait(150)
        ui0.real_click("#btn-title", "the logo")
        p.wait(150)
        check(p.eval("!%s.hidden" % TS), "the menu's logo brings the title screen back")
        ui0.real_click("#btn-title-play", "Play")
        p.wait(300)
        check(p.eval("%s.hidden" % TS), "Play clears it to the table")
        check(p.eval("!%s.hidden" % RD), "and a fresh table asks Ready to play?")
        for sel, lab in (("#btn-ready-setup", "Set up my company"), ("#btn-ready-auto", "Auto setup"),
                         ("#btn-ready-learn", "Learn to play first"), ("#btn-ready-title", "Title screen")):
            ui0.topmost(sel, lab)
        ui0.real_click("#btn-ready-setup", "Set up my company")
        p.wait(250)
        check(p.eval("%s.hidden && !document.getElementById('reserve-tray').hidden && "
                     "document.querySelectorAll(\"#reserve-tray .pf-unit[data-pool='setup']\").length > 0" % RD),
              "Set up my company leaves the reserve tray out, with the drawn squads in it")
        # the play guide: the phases with Setup lit, and the setup checklist
        check(p.eval("(document.querySelector('#phase-track li.now')||{}).dataset.phase") == "setup"
              and p.eval("document.querySelectorAll('#phase-track li').length") == 7,
              "the status card lights Setup among the seven phases")
        cnt = p.eval("[...document.querySelectorAll('#guide-steps .count')].map(function(n){return n.textContent})")
        check(cnt == ["0/9", "0/4"], "and counts the setup: squads %s, CAATs %s" % tuple(cnt or ["?", "?"]))
        p.click("#btn-new", wait=400)
        p.page.keyboard.press("Escape")
        p.wait(150)
        check(p.eval("%s.hidden" % RD), "New match asks again; Escape dismisses it")
        p.click("#btn-save", wait=300)
        p.page.reload()
        p.wait(500)
        check(p.eval("!%s.hidden && !document.getElementById('btn-title-load').disabled" % TS),
              "after a save, the title screen comes back on reload with Load ready")
        ui0.real_click("#btn-title-load", "Load a saved game")
        p.wait(400)
        check(p.eval("%s.hidden" % TS) and "Loaded" in (p.eval("document.getElementById('why').textContent") or ""),
              "Load a saved game restores it")
        # How to play still opens the primer from the menu
        ui0.real_click("#btn-primer", "How to play")
        p.wait(250)
        steps = p.eval("document.querySelectorAll('#primer-turn li').length")
        check(steps >= 2 and p.eval("document.querySelectorAll('#primer-terms dt').length") >= 1,
              "How to play tells a turn in %d steps and explains the table's words" % steps)
        ui0.real_click("#btn-primer-close", "Close")
        p.wait(200)
        # back to the seeded table the rest of the drive expects
        p.eval("localStorage.removeItem('fw:phantomfury:slot:1')")
        p.page.reload()
        p.wait(500)
        ui0.real_click("#btn-title-play", "Play")
        p.wait(300)
        check(p.eval("%s.hidden" % TS), "Play on a fresh page keeps the table it set up")
        check(p.eval("!%s.hidden" % RD), "and asks Ready to play?")
        p.page.keyboard.press("Escape")
        p.wait(150)

        n = p.eval("document.querySelectorAll('#board .pf-unit').length")
        zones = p.eval("document.querySelectorAll('#board .pf-zone').length")
        check(n > 0 and zones == 61, "the board rendered %d counters over %d Zone tiles" % (n, zones))

        # ---- animation, caught in the act: apply the first placement
        # through the page's own perform() and the piece must be drawn in
        # flight, with the arrived piece flagged as changed. (The click
        # driven gesture below then takes the next one.) The reserves
        # live in the Pieces popup now, so open it first — the piece
        # flies out of the open window onto the board.
        p.click("#dock-pieces", wait=300)
        fly = p.eval("(function(){ var A = %s, G = %s;"
                     " var a = G.legalActions(A.session.state).filter(function(x){ return A.gestureOf(x); })[0];"
                     " A.perform(a);"
                     " return [document.querySelectorAll('.fw-flyer').length,"
                     "         document.querySelectorAll('.pf-unit.state-changed').length]; })()" % (app, ns))
        check(fly[0] >= 1, "a piece that changes place is drawn in flight")
        check(fly[1] >= 1, "and the piece that arrived is flagged as changed")
        p.wait(900)
        check(p.eval("document.querySelectorAll('.fw-flyer').length") == 0,
              "and the flight lands, leaving no copy or hidden piece behind")
        p.click("#popup-pieces .popup-close", wait=200)

        before = p.eval(app + ".session.history.length")
        first = p.eval(FIRST_GESTURE % {"ns": ns})
        check(first is not None, "there is a legal action with a board gesture")
        if first:
            gesture(p, first)
            after = p.eval(app + ".session.history.length")
            check(after > before, "clicking %s applied it (history %d -> %d)" % (first["action"].get("type"), before, after))

        # ---- finish Setup the way a player in a hurry would, then end the
        # Support Phase from the status card. Auto setup rides in the top
        # menu bar; the Actions panel was retired (owner, 2026-10-31): air
        # support is in Decide, End phase on the card.
        p.click("#btn-auto", wait=400)
        check(p.eval(app + ".session.state.phase") == "support",
              "Auto setup completes Setup into the Support Phase")
        check(not p.eval("!!document.getElementById('dock-actions') || !!document.getElementById('popup-actions')"),
              "the Actions panel is retired")
        p.click("#dock-decisions", wait=300)
        shown = p.eval("[...document.querySelectorAll('#decision-phase-actions button')].map(b => b.dataset.actionType)")
        check("mission" not in shown and p.eval("!!document.querySelector('#decision-phase-actions .decision-eye')"),
              "Decide leaves air support to the tray and the map, with a line saying so (%d buttons)" % len(shown))
        p.click("#decision-panel .popup-close", wait=200)
        check(p.eval("[...document.querySelectorAll('#reserve-tray .pf-unit[data-mission]')].length") > 0,
              "the Support Phase puts the air-support markers in the tray")
        p.click("#btn-guide-end", wait=400)
        check(p.eval(app + ".session.state.phase") == "reinforce",
              "ending the Support Phase reaches Reinforcements")

        # ---- save / load, the polished round trip: save this game, start a
        # new one, and the saved game must come back exactly as it was.
        # (All three buttons ride in the top menu bar now.)
        saved_status = p.eval("document.querySelector('#status').textContent")
        p.click("#btn-save", wait=300)
        check(p.eval("!document.querySelector('#btn-load').disabled"),
              "after saving, Load is offered")
        p.click("#btn-new", wait=600)
        p.eval("document.getElementById('ready').hidden = true")
        check(p.eval(app + ".session.state.phase") == "setup",
              "New game resets to Setup")
        p.click("#btn-load", wait=400)
        check(p.eval("document.querySelector('#status').textContent") == saved_status,
              "Load brings the saved game back (" + saved_status.strip() + ")")

        # ---- the refinements: a floating decision panel (pieces, actions,
        # END PHASE, in-progress save), the right panel's change feed, and
        # mouse-wheel zoom on the map.
        check(p.eval("document.getElementById('decision-panel').hidden") and
              p.eval("!document.getElementById('dock-decisions').hidden"),
              "the decision panel waits behind its Decide dock button, like the other popups")
        p.click("#dock-decisions", wait=300)
        check(p.eval("!document.getElementById('decision-panel').hidden && "
                     "document.getElementById('decision-panel').classList.contains('popup')"),
              "and the Decide button opens it as a popup")
        pieces = p.eval("document.querySelectorAll('#decision-pieces .decision-piece').length")
        check(pieces >= 10, "it lays out the player's pieces (%d)" % pieces)
        phase_before = p.eval(app + ".session.state.phase")
        check(p.eval("!document.getElementById('btn-decision-end').disabled"),
              "END PHASE is offered on the panel")
        p.click("#btn-decision-end", wait=500)
        phase_after = p.eval(app + ".session.state.phase")
        check(phase_after != phase_before,
              "END PHASE on the panel advances the game (%s -> %s)" % (phase_before, phase_after))
        banner = p.eval("document.getElementById('phase-banner').textContent") or ""
        check(bool(banner), "the phase change is announced on the board: %s" % banner)
        summary = p.eval("document.getElementById('change-summary').textContent") or ""
        check("→" in summary or "Turn" in summary,
              "the change feed reports what changed: %s" % summary[:70])
        # one more panel END PHASE (Fire -> Movement), where squads have
        # moves: choosing a piece must list what that piece can do.
        p.click("#btn-decision-end", wait=500)
        check(p.eval(app + ".session.state.phase") == "movement",
              "a second panel END PHASE reaches the Movement Phase")
        p.eval("[...document.querySelectorAll('#decision-pieces .decision-piece')]"
               ".find(function (x) { return !x.classList.contains('no-actions'); }).click()")
        p.wait(300)
        nacts = p.eval("document.querySelectorAll('#decision-actions button').length")
        check(nacts >= 1, "choosing a piece lists what it can do (%d actions)" % nacts)
        p.click("#btn-decision-save", wait=300)
        note = p.eval("document.getElementById('decision-save-note').textContent") or ""
        check(note.startswith("Saved game:"), "Save in progress works from the panel: %s" % note[:60])
        p.click("#decision-panel .popup-close", wait=250)
        check(p.eval("document.getElementById('decision-panel').hidden"),
              "and its round close button puts it away")
        # Zoom is four fixed levels: one wheel notch is one level.
        box = p.eval("(function(){var r=document.getElementById('board').getBoundingClientRect();"
                     "return [r.left + r.width * 0.3, r.top + r.height * 0.55];})()")
        p.page.mouse.move(box[0], box[1])
        p.page.mouse.wheel(0, -600)
        p.wait(250)
        lvl = p.eval(app + ".boardView.level")
        check(lvl == 1, "one wheel notch zooms the map in exactly one level (now %s)" % lvl)
        check(p.eval("document.querySelector('#zoom-seg [data-zoom=\"1\"]').classList.contains('on')"),
              "and the zoom strip in the menu lights District")
        p.click("#zoom-seg [data-zoom='0']", wait=350)
        check(p.eval(app + ".boardView.level") == 0 and p.eval(app + ".boardView.zoom") == 1,
              "City restores the whole map")
        p.click("#zoom-seg [data-zoom='3']", wait=350)
        native = p.eval("(function(){var a=%s, s=a.levelScales()[3];"
                        "return s * parseFloat(document.querySelector('.fw-stage').dataset.scale) * (window.devicePixelRatio||1);})()" % app)
        crop_w = p.eval("PhantomFuryBoard.meta.imageCrop.w")
        check(abs(native - crop_w / 1300) < 0.01,
              "Close shows the scan at its own resolution, one file pixel per screen pixel (%.3f)" % native)
        lv = p.eval(app + ".levelScales()")
        check(all(lv[i + 1] > lv[i] for i in range(3)), "and the four levels climb in order %s" % ([round(x, 2) for x in lv],))
        check(p.eval("getComputedStyle(document.getElementById('board-world')).willChange") in ("auto", ""),
              "the map layer is not left as a cached raster at rest (will-change off), so it stays sharp")
        p.click("#zoom-seg [data-zoom='0']", wait=350)
        # ---- the drag fix, from a player's clip: the map image must not
        # be natively draggable (a native image drag hijacks the pan and
        # floats a ghost of the whole board), and a real mouse drag on the
        # zoomed map must pan it without also clicking a move.
        check(p.eval("document.querySelector('.pf-map').draggable") is False,
              "the map image is not natively draggable, so no ghost board follows the mouse")
        p.page.mouse.move(box[0], box[1])
        p.page.mouse.wheel(0, -600)
        p.wait(250)
        hist = p.eval(app + ".session.history.length")
        view0 = p.eval("[%s.boardView.x, %s.boardView.y]" % (app, app))
        p.page.mouse.move(box[0], box[1])
        p.page.mouse.down()
        p.page.mouse.move(box[0] + 150, box[1] + 90, steps=8)
        p.page.mouse.up()
        p.wait(250)
        view1 = p.eval("[%s.boardView.x, %s.boardView.y]" % (app, app))
        check(view1 != view0, "dragging the zoomed map pans it (%s -> %s)" % (view0, view1))
        check(p.eval(app + ".session.history.length") == hist,
              "and the drag did not also click a move")
        p.click("#zoom-seg [data-zoom='0']", wait=350)
        # ---- the margins pass: the owner's cropped board, City as wide as
        # the map, the edge tracks carrying their markers, the reserve
        # boxes their pieces, and the hover card.
        crop = p.eval("PhantomFuryBoard.meta.imageCrop")
        nat = p.eval("[document.querySelector('.pf-map').naturalWidth, document.querySelector('.pf-map').naturalHeight]")
        check(nat == [crop["w"], crop["h"]], "the board image is the owner's crop, as the data records it %s" % (nat,))
        fitw = p.eval("[Math.round(document.getElementById('board-world').getBoundingClientRect().width),"
                      " Math.round(document.getElementById('board').getBoundingClientRect().width)]")
        check(abs(fitw[0] - fitw[1]) <= 2, "City shows the map exactly as wide as the viewport, no further %s" % (fitw,))
        on_track = p.eval("""(function(){var A=%s, s=A.session.state, T=PhantomFuryTracks, C=PhantomFuryBoard.meta.imageCrop;
          var br=document.getElementById('board-world').getBoundingClientRect();
          function at(peek, xy){var r=document.querySelector(".pf-track[data-peek='"+peek+"']").getBoundingClientRect();
            var ex=br.left+(xy[0]-C.x)/C.w*br.width, ey=br.top+(xy[1]-C.y)/C.h*br.height;
            return Math.abs(r.left+r.width/2-ex)<3 && Math.abs(r.top+r.height/2-ey)<3;}
          return [at('turn', T.turn[s.turn-1]), at('vp', T.score[Math.abs(s.vp)%%10]),
                  at('dragonEye', T.missions.dragonEye[s.support.dragonEye]), at('superCobra', T.missions.superCobra[s.support.cobra]),
                  at('hornet', T.missions.hornet[s.support.hornet]), document.querySelectorAll('.pf-track').length];})()""" % app)
        check(all(on_track[:5]) and on_track[5] == 6,
              "the Turn, VP and three Mission markers stand on their printed spaces %s" % (on_track,))
        check(p.eval("[...document.querySelectorAll('.pf-track')].every(function(t){return t.tagName !== 'BUTTON' && !t.querySelector('button');})"),
              "track markers are the game's to move: plain tokens, not buttons")
        hist = p.eval(app + ".session.history.length")
        sel0 = p.eval(app + ".controller.selected")
        on_board(p, ".pf-track[data-peek='turn']")
        check(p.eval(app + ".session.history.length") == hist and p.eval(app + ".controller.selected") == sel0,
              "and clicking one does nothing")
        boxed = p.eval("[document.querySelectorAll('#board .pf-unit.in-box').length,"
                       " %s.project(%s.session.state).units.filter(function(u){return ['company','battalion','iif','abrams'].indexOf(u.pool)>=0;}).length]" % (app, app))
        check(boxed[0] == boxed[1] and boxed[0] > 0, "every waiting reinforcement stands in its reserve box %s" % (boxed,))
        buid = p.eval("document.querySelector('#board .pf-unit.in-box').dataset.uid")
        on_board(p, "#board .pf-unit.in-box[data-uid='%s']" % buid)
        check(p.eval(app + ".controller.selected") == buid,
              "and a boxed piece is the player's: clicking it picks it up (%s)" % buid)
        p.page.keyboard.press("Escape"); p.wait(200)
        p.click("#zoom-seg [data-zoom='0']", wait=350)
        cu = p.eval("(function(){var b=document.getElementById('board').getBoundingClientRect();"
                    "var e=[...document.querySelectorAll('#board .pf-unit:not(.in-box)')].find(function(x){var r=x.getBoundingClientRect();"
                    "var cx=r.left+r.width/2, cy=r.top+r.height/2; return cx>b.left+40&&cx<b.left+b.width*0.6&&cy>b.top+40&&cy<b.bottom-40 && x.contains(document.elementFromPoint(cx,cy));});"
                    "if(!e) return null; var r=e.getBoundingClientRect(); return [r.left+r.width/2, r.top+r.height/2];})()")
        check(cu is not None, "a counter is in view to hover")
        if cu:
            p.page.mouse.move(cu[0], cu[1]); p.wait(250)
            card = p.eval("(function(){var k=document.getElementById('peek'); return [!k.hidden, !!k.querySelector('img').src,"
                          " document.querySelectorAll('#peek-notes li').length, document.getElementById('peek-title').textContent];})()")
            check(card[0] and card[1] and card[2] >= 2,
                  "hovering a counter shows it large with what it is: %s" % card[3])
            p.page.mouse.move(cu[0] + 120, cu[1] + 120); p.wait(250)
            check(p.eval("document.getElementById('peek').hidden"), "and the card goes when the mouse leaves")
        # a drag let go over the menu strip must end there
        b = p.eval("(function(){var r=document.getElementById('board').getBoundingClientRect(); return [r.left+r.width*0.45, r.top+r.height*0.6, r.top];})()")
        p.page.mouse.move(b[0], b[1]); p.page.mouse.down()
        p.page.mouse.move(b[0], b[2] - 40, steps=6); p.page.mouse.up(); p.wait(150)
        v0 = p.eval("[%s.boardView.x, %s.boardView.y]" % (app, app))
        p.page.mouse.move(b[0] + 200, b[1] + 100, steps=4); p.wait(150)
        check(p.eval("[%s.boardView.x, %s.boardView.y]" % (app, app)) == v0,
              "a map drag let go over the menu strip ends there (the map does not follow the mouse after)")
        p.click("#zoom-seg [data-zoom='0']", wait=350)
        # ---- the popup pass: the table starts clear, one popup opens at
        # a time from its dock button, the big close button clears it, and
        # the change feed is readable inside its popup. Text starts at the
        # new base: the 13px status line computes to 19.5px (1.5x).
        check(p.eval("document.querySelectorAll('.popup:not([hidden])').length") == 0,
              "the table starts clear: every panel popup is hidden")
        p.click("#dock-changes", wait=300)
        check(p.eval("!document.getElementById('popup-changes').hidden"),
              "the What changed button opens its popup")
        feed = p.eval("document.getElementById('change-summary').textContent") or ""
        check(bool(feed), "and the change feed is readable inside it: %s" % feed[:60])
        head = p.eval("(function(){var r=document.querySelector('#popup-changes .popup-head').getBoundingClientRect();"
                      "return [r.left + 110, r.top + r.height / 2];})()")
        pos0 = p.eval("(function(){var r=document.getElementById('popup-changes').getBoundingClientRect();"
                      "return [Math.round(r.left), Math.round(r.top)];})()")
        p.page.mouse.move(head[0], head[1])
        p.page.mouse.down()
        p.page.mouse.move(head[0] + 90, head[1] + 45, steps=6)
        p.page.mouse.up()
        p.wait(200)
        pos1 = p.eval("(function(){var r=document.getElementById('popup-changes').getBoundingClientRect();"
                      "return [Math.round(r.left), Math.round(r.top)];})()")
        check(pos1 != pos0, "and the popup drags by its head to a new home (%s -> %s)" % (pos0, pos1))
        p.click("#dock-pieces", wait=300)
        check(p.eval("document.getElementById('popup-changes').hidden && !document.getElementById('popup-pieces').hidden"),
              "opening Pieces closes What changed — one popup at a time")
        p.click("#popup-pieces .popup-close", wait=300)
        check(p.eval("document.querySelectorAll('.popup:not([hidden])').length") == 0,
              "and the big close button clears the table again")
        status_px = p.eval("parseFloat(getComputedStyle(document.getElementById('status')).fontSize)")
        check(status_px >= 19, "text starts half again as large (status line at %.1fpx)" % status_px)
        check(p.eval("!!document.querySelector('.menu-logo') && "
                     "document.querySelector('.menu-logo').getBoundingClientRect().width > 80"),
              "the box-art logo rides at the left of the menu bar")
        check(p.eval("document.getElementById('taste').closest('#menubar') !== null"),
              "and the text-size slider rides in the menu bar with the game buttons")
        geom = p.eval("(function(){var b=document.getElementById('board').getBoundingClientRect(),"
                      "t=document.getElementById('topbar').getBoundingClientRect(),"
                      "s=document.querySelector('.fw-stage').getBoundingClientRect();"
                      "return [Math.round(b.width), Math.round(s.width), Math.round(b.bottom - s.bottom), Math.round(b.top - t.bottom)];})()")
        k = p.eval("parseFloat(document.querySelector('.fw-stage').dataset.scale)")
        tw = p.eval("Math.round(document.getElementById('topbar').getBoundingClientRect().width)")
        # map-centric (2026-10-17): the map reaches 2% of the stage's width
        # from each side and 22px (2%) from its foot; the menu runs across it
        check(abs(geom[0] - geom[1] * 0.96) <= 3 and abs(tw - geom[0]) <= 2 and
              abs(geom[2] + 22 * k) <= 2 and abs(geom[3]) <= 3,
              "the map fills the stage to a 2%% margin, the menu strip flush across its top %s" % (geom,))
        check(p.eval("(function(){var s=document.getElementById('statusbar').getBoundingClientRect(),"
                     "b=document.getElementById('board').getBoundingClientRect();"
                     "return s.left > b.left && s.top > b.top && s.right < b.left + b.width / 2;})()"),
              "the status line floats as a card over the map's left side")
        dock_xy = p.eval("(function(){return [...document.querySelectorAll('.dock-btn')].map(function(b){"
                         "var r=b.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top)];});})()")
        check(len(dock_xy) == 4 and len(set(x for x, y in dock_xy)) == 1 and  # Actions retired 2026-10-31
              [y for x, y in dock_xy] == sorted(y for x, y in dock_xy),
              "and the panel buttons line up vertically on the right: %s" % (dock_xy,))
        check(p.eval("document.querySelector('.pf-zone').textContent.trim()") == "",
              "the Zone tiles carry no number of their own — the map already prints it")
        broken = p.eval("[...document.querySelectorAll('img')].filter(function(i){"
                        "return i.complete && i.naturalWidth === 0;}).length")
        check(broken == 0, "every counter face loads — no broken images on the table (%d)" % broken)
        p.click("#dock-decisions", wait=300)
        check(p.eval("!document.getElementById('decision-panel').hidden"),
              "the Decide button opens the turn-move popup")
        p.click("#dock-decisions", wait=300)
        check(p.eval("document.getElementById('decision-panel').hidden"),
              "and clicking it again puts it away")
        if a.shot:
            os.makedirs(a.shot, exist_ok=True)
            p.screenshot(os.path.join(a.shot, "match.png"))

        # ---- the interface itself. A green engine suite says nothing about
        # whether a player can see, reach and press the thing they must press.
        # The board's hit targets overlap by design (a counter sits on its
        # Location dot inside its Zone tile), and the reserve chips live in a
        # scroll panel; the overlap rule guards the chrome — the button bars.
        UI(p, check, root=".bar").no_button_overlap()
        ui0.inside_safe_area()
        ui_board = UI(p, check, root="#board")
        ui_board.min_type_size(where="the board")
        if p.eval("!!document.getElementById('btn-guide-end')"):
            ui0.topmost("#btn-guide-end", "the status card's End button")
        if p.eval("!!document.querySelector('.fw-typectl input')"):
            ui0.type_steps_hold(table=".fw-stage")
        check(p.eval("!!window.FW && !!FW.motion && !!document.querySelector('.fw-fx')"),
              "the page carries the motion layer and its overlay")

        # ---- Learn to play opens the chapter list (Learn to Play v2).
        p.eval("localStorage.removeItem('phantomfury.chapters.done')")
        p.click("#btn-tutorial", wait=400)
        check(p.eval("!document.getElementById('chapters').hidden"), "Learn to play opens the chapter list")
        info = p.eval("[...document.querySelectorAll('#chapter-list .chapter')].map(function(b){"
                      "return [b.dataset.chapter, b.disabled, b.classList.contains('next')];})")
        check(len(info) == 7 and info[0] == ["setup", False, True],
              "seven chapters, and Chapter 1 is marked Start here: %s" % (info,))
        ui0.topmost(".chapter[data-chapter='setup']", "Chapter 1")

        # ---- Chapter 1: a real Setup. Pick a counter from the tray in the
        # bubble, click its place on the map; a wrong pick is refused first.
        p.click(".chapter[data-chapter='setup']", wait=1200)
        SETUP = """(function(){
          var A = window[%(ns)r + 'App'], t = A.tutorial, b = t.current(), s = t.state;
          var ring = A.lessonFocus(), wrong = ring.filter(function (a) { return b.accept(s, a) !== true; })[0];
          function how(a) { return a.type === 'setupPlace' ? { chip: a.uid, at: "#board .pf-loc[data-zone='" + a.zone + "']" }
                                                          : { chip: a.caat, at: "#board .pf-unit[data-uid='" + a.uid + "']" }; }
          return { i: t.i, right: how(ring[0]), wrong: wrong ? how(wrong) : null, sig: JSON.stringify(s.units) };
        })()"""
        decided, refused6 = 0, 0
        for _ in range(30):
            if p.eval("document.getElementById('tutor').hidden"):
                break
            if p.eval("%s.lessonWaits()" % app):
                p.wait(1400)
                d = p.eval(SETUP % {"ns": ns})
                bubble_clear(p, "chapter 1 decision %d" % (decided + 1))
                check(p.eval("document.querySelectorAll('#lesson-tray .tray-chip').length") >= 4,
                      "the pieces to place stand in a tray in the bubble")
                for key in ("wrong", "right"):
                    h = d[key]
                    if not h:
                        continue
                    p.eval("%s.controller.selected = null" % app)
                    p.click("#lesson-tray .tray-chip[data-uid='%s']" % h["chip"], wait=200)
                    on_board(p, h["at"])
                    p.wait(300)
                    if key == "wrong":
                        ok = (p.eval("%s.tutorial.i" % app) == d["i"] and
                              p.eval("JSON.stringify(%s.tutorial.state.units)" % app) == d["sig"] and
                              not p.eval("document.getElementById('beat-refuse').hidden"))
                        refused6 += 1 if ok else 0
                        bubble_clear(p, "chapter 1 after a refusal")
                        check(ok, "a wrong setup choice is refused, changes nothing: %s"
                              % (p.eval("document.getElementById('beat-refuse').textContent") or "")[:70])
                check(p.eval("%s.tutorial ? %s.tutorial.i : 999" % (app, app)) > d["i"],
                      "the right choice, tray then map, is made")
                decided += 1
            else:
                p.click("#btn-continue", wait=400)
        check(decided == 2 and refused6 == 2, "chapter 1: %d setup decisions made, %d wrong ones refused" % (decided, refused6))
        check(p.eval("!document.getElementById('chapters').hidden && "
                     "document.querySelector(\".chapter[data-chapter='setup']\").classList.contains('done')"),
              "finishing it returns to the chapter list with Chapter 1 ticked")

        # ---- Chapters 2 and 3: look, then answer on the map (a piece, a
        # place or a Zone). Chapter 2 also proves a wrong pick is refused.
        def quiz_chapter(cid, n, test_wrong):
            check(p.eval("document.querySelector(\".chapter[data-chapter='%s']\").classList.contains('next')" % cid),
                  "Start here has moved on to Chapter %d" % n)
            p.click(".chapter[data-chapter='%s']" % cid, wait=1200)
            steps, solved, wrong_ok, flipped = 0, 0, None if test_wrong else True, None
            for _ in range(60):
                if p.eval("document.getElementById('tutor').hidden"):
                    break
                if flipped is None and p.eval("!document.getElementById('beat-card').hidden && !!document.querySelector('.pc.two')"):
                    p.wait(2400)
                    flipped = p.eval("document.querySelector('.pc').classList.contains('flipped')")
                    check(flipped, "a two-sided counter card turns itself over")
                if p.eval("!!document.querySelector('#board .pf-links line')"):
                    p.wait(400)
                    check(p.eval("document.querySelectorAll('#board .pf-links line').length") >= 1,
                          "chapter %d draws what connects to what on the map" % n)
                ans = p.eval("%s.quizAnswers()" % app)
                if ans:
                    p.wait(1400)
                    bubble_clear(p, "chapter %d quiz %d" % (n, solved + 1))
                    check(p.eval("document.getElementById('btn-continue').hidden"),
                          "chapter %d quiz %d: Next waits for the answer" % (n, solved + 1))
                    if wrong_ok is None:
                        other = p.eval("(function(a){var n=[...document.querySelectorAll('#board .pf-unit')].filter(function(e){"
                                       "var r=e.getBoundingClientRect(),b=document.getElementById('board').getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;"
                                       "return a.indexOf(e.dataset.uid)<0 && cx>b.left+40 && cx<b.right-40 && cy>b.top+40 && cy<b.bottom-40 &&"
                                       " document.elementFromPoint(cx,cy)&&e.contains(document.elementFromPoint(cx,cy));})[0];return n?n.dataset.uid:null;})(%s)" % json.dumps(ans))
                        if other:
                            on_board(p, "#board .pf-unit[data-uid='%s']" % other)
                            p.wait(200)
                            wrong_ok = p.eval("!document.getElementById('beat-refuse').hidden && document.getElementById('btn-continue').hidden")
                            check(wrong_ok, "a wrong pick is refused, in the guide's words: %s"
                                  % (p.eval("document.getElementById('beat-refuse').textContent") or "")[:70])
                    on_board(p, p.eval("%s.quizSelector(%s)" % (app, json.dumps(ans[0]))))
                    p.wait(300)
                    check(p.eval("!document.getElementById('beat-right').hidden && !document.getElementById('btn-continue').hidden"),
                          "the right answer (%s) is praised, and Next opens" % ans[0])
                    solved += 1
                p.click("#btn-continue", wait=300)
                steps += 1
            check(solved >= 4, "chapter %d played %d steps, %d quizzes answered on the map" % (n, steps, solved))
            check(p.eval("document.querySelector(\".chapter[data-chapter='%s']\").classList.contains('done')" % cid),
                  "and Chapter %d is ticked" % n)

        quiz_chapter("pieces", 2, True)
        quiz_chapter("board", 3, False)

        # ---- Chapter 4: practice positions. Each puzzle: a legal but wrong
        # move, made by clicking, is refused in the guide's words and changes
        # nothing; the right one, clicked, moves the lesson on.
        check(p.eval("document.querySelector(\".chapter[data-chapter='afford']\").classList.contains('next')"),
              "Start here has moved on to Chapter 4")
        p.click(".chapter[data-chapter='afford']", wait=1200)
        PUZZLE = """(function(){
          var A = window[%(ns)r + 'App'], t = A.tutorial, b = t.current(), s = t.state;
          var ring = A.lessonFocus(), wrong = ring.filter(function (a) { return b.accept(s, a) !== true; })[0];
          return { i: t.i, n: ring.length, right: A.gestureOf(ring[0], s), wrong: wrong ? A.gestureOf(wrong, s) : null,
                   sig: JSON.stringify(s.units) };
        })()"""
        puzzles, refused = 0, 0
        for _ in range(40):
            if p.eval("document.getElementById('tutor').hidden"):
                break
            if p.eval("%s.lessonWaits()" % app):
                p.wait(1400)
                pz = p.eval(PUZZLE % {"ns": ns})
                bubble_clear(p, "chapter 4 puzzle %d" % (puzzles + 1))
                check(pz["n"] >= 2, "puzzle %d rings %d choices for its squad" % (puzzles + 1, pz["n"]))
                if pz["wrong"]:
                    gesture(p, {"g": pz["wrong"]})
                    p.eval("%s.controller.selected = null" % app)
                    same = p.eval("JSON.stringify(%s.tutorial.state.units)" % app) == pz["sig"]
                    ok = (p.eval("%s.tutorial.i" % app) == pz["i"] and same and
                          not p.eval("document.getElementById('beat-refuse').hidden"))
                    refused += 1 if ok else 0
                    p.wait(1400)  # the camera (1.2 s) lifts the ring clear of the taller bubble
                    bubble_clear(p, "chapter 4 after a refusal")
                    check(ok, "a legal but wrong choice is refused, changes nothing: %s"
                          % (p.eval("document.getElementById('beat-refuse').textContent") or "")[:70])
                gesture(p, {"g": pz["right"]})
                check(p.eval("%s.tutorial ? %s.tutorial.i : 999" % (app, app)) > pz["i"],
                      "the right move, clicked, solves puzzle %d" % (puzzles + 1))
                puzzles += 1
            else:
                debrief_at_finish(p, "4", 4)
                p.click("#btn-continue", wait=400)
        check(puzzles == 4 and refused == 4, "chapter 4: %d puzzles solved, %d wrong choices refused" % (puzzles, refused))
        check(p.eval("document.querySelector(\".chapter[data-chapter='afford']\").classList.contains('done')"),
              "and Chapter 4 is ticked")

        # ---- Chapter 5: the tools. Each answer is a lesson button (the CAAT
        # and Explosives versions, IED or Sniper, the Security Element); the
        # wrong choice, a click on the board or the other button, is refused.
        check(p.eval("document.querySelector(\".chapter[data-chapter='tools']\").classList.contains('next')"),
              "Start here has moved on to Chapter 5")
        p.click(".chapter[data-chapter='tools']", wait=1200)
        TOOL = """(function(){
          var A = window[%(ns)r + 'App'], t = A.tutorial, b = t.current(), s = t.state;
          var ring = A.lessonFocus(), btns = A.lessonButtons().map(function (a) { return JSON.stringify(a); });
          var right = ring.filter(function (a) { return b.accept(s, a) === true; })[0];
          var wrong = ring.filter(function (a) { return b.accept(s, a) !== true; })[0];
          return { i: t.i, n: ring.length, right: btns.indexOf(JSON.stringify(right)) + 1,
                   wrongBtn: wrong ? btns.indexOf(JSON.stringify(wrong)) + 1 : 0,
                   wrong: wrong && A.gestureOf(wrong, s) && !(wrong.caat === true || wrong.explosives === true) ? A.gestureOf(wrong, s) : null,
                   sig: JSON.stringify(s.units) + JSON.stringify(s.pending) };
        })()"""
        tools_done, tools_refused = 0, 0
        for _ in range(40):
            if p.eval("document.getElementById('tutor').hidden"):
                break
            if p.eval("%s.lessonWaits()" % app):
                p.wait(1400)
                pz = p.eval(TOOL % {"ns": ns})
                if a.shot:
                    p.screenshot(os.path.join(a.shot, "tools-%d.png" % (tools_done + 1)))
                bubble_clear(p, "chapter 5 puzzle %d" % (tools_done + 1))
                check(pz["n"] == 2 and pz["right"] > 0, "tool puzzle %d: two choices, the answer on a button" % (tools_done + 1))
                if pz["wrong"] or pz["wrongBtn"]:
                    if pz["wrong"]:
                        gesture(p, {"g": pz["wrong"]})
                        p.eval("%s.controller.selected = null" % app)
                    else:
                        p.click("#lesson-acts button:nth-child(%d)" % pz["wrongBtn"], wait=300)
                    same = p.eval("JSON.stringify(%s.tutorial.state.units) + JSON.stringify(%s.tutorial.state.pending)" % (app, app)) == pz["sig"]
                    ok = (p.eval("%s.tutorial.i" % app) == pz["i"] and same and
                          not p.eval("document.getElementById('beat-refuse').hidden"))
                    tools_refused += 1 if ok else 0
                    p.wait(1400)
                    bubble_clear(p, "chapter 5 after a refusal")
                    check(ok, "the wrong tool choice is refused, changes nothing: %s"
                          % (p.eval("document.getElementById('beat-refuse').textContent") or "")[:70])
                seen = p.eval("""(function(){var b=document.querySelector('#lesson-acts button:nth-child(%d)'),
                  r=b.getBoundingClientRect(), e=document.elementFromPoint(r.left+r.width/2, r.top+r.height/2);
                  return !!e && (e===b || b.contains(e));})()""" % pz["right"])
                check(seen, "the answer's button is in view without scrolling")
                steps_txt = p.eval("document.getElementById('beat-steps').textContent") or ""
                check(p.eval("!!document.querySelector('#beat-steps li.ask')") and "press" not in steps_txt.lower(),
                      "the puzzle asks in context, no 'press the button': %s" % steps_txt[:70])
                p.click("#lesson-acts button:nth-child(%d)" % pz["right"], wait=300)
                check(p.eval("%s.tutorial ? %s.tutorial.i : 999" % (app, app)) > pz["i"],
                      "the right button solves tool puzzle %d" % (tools_done + 1))
                # the outcome is held on its own beat: a verdict, Walsh's reaction, the board moment
                p.wait(2600)
                held = p.eval("""(function(){var A=%s, o=A.outcome; if(!o) return null;
                  return {title: document.getElementById('beat-title').textContent, tone: o.o.tone,
                    pose: document.getElementById('guide-img').getAttribute('src'),
                    next: !document.getElementById('btn-continue').hidden, buttons: document.querySelectorAll('#lesson-acts button').length,
                    marks: document.querySelectorAll('#board .pf-stamp').length};})()""" % app)
                face = {"good": "laughing", "bad": "angry", "mixed": "calm", "news": "surprised"}
                check(bool(held) and held["title"] and held["next"] and held["buttons"] == 0 and
                      face[held["tone"]] in held["pose"] and held["marks"] >= 1,
                      "tool puzzle %d holds on its outcome: %s" % (tools_done + 1, held and (held["title"], held["tone"], held["marks"])))
                if a.shot:
                    p.screenshot(os.path.join(a.shot, "verdict-%d.png" % (tools_done + 1)))
                bubble_clear(p, "chapter 5 outcome %d" % (tools_done + 1))
                if tools_done == 0:
                    # Back re-reads the step before (no moves undone); Next walks forward again
                    verdict = held["title"]
                    p.click("#btn-back", wait=1800)
                    lb = p.eval("""[document.getElementById('beat-title').textContent, document.getElementById('beat-step').textContent,
                      document.getElementById('lesson-acts').hidden, document.getElementById('btn-continue').hidden]""")
                    check(lb[0] == "Take the shot" and "looking back" in lb[1] and lb[2] and not lb[3],
                          "Back shows the step before again, read-only, with Next to come forward: %s" % lb[:2])
                    p.click("#btn-continue", wait=1800)
                    check(p.eval("document.getElementById('beat-title').textContent") == verdict and
                          p.eval("!!%s.outcome" % app),
                          "Next from looking back returns to the outcome, nothing replayed")
                    # the words change once: out, then in a single time after the camera lands
                    p.eval("""(function(){var b=document.getElementById('tutor-body'), out=[], t0=performance.now();
                      (function tick(){ out.push(+getComputedStyle(b).opacity); if (performance.now()-t0 < 2200) requestAnimationFrame(tick); else window.__fades=out; })();})()""")
                    p.click("#btn-continue", wait=2600)
                    fades = p.eval("window.__fades") or []
                    rises = sum(1 for i in range(1, len(fades)) if fades[i - 1] < 0.5 <= fades[i])
                    check(rises == 1, "the next step's words fade in exactly once (%d times)" % rises)
                tools_done += 1
            else:
                debrief_at_finish(p, "5", 4)
                p.click("#btn-continue", wait=400)
        check(tools_done == 4 and tools_refused == 4, "chapter 5: %d tool puzzles solved, %d wrong choices refused" % (tools_done, tools_refused))
        check(p.eval("document.querySelector(\".chapter[data-chapter='tools']\").classList.contains('done')"),
              "and Chapter 5 is ticked")

        # ---- Chapter 6, the whole turn with the player's hands on the moves.
        check(p.eval("document.querySelector(\".chapter[data-chapter='turn']\").classList.contains('next')"),
              "Start here has moved on to Chapter 6")
        p.click(".chapter[data-chapter='turn']", wait=1200)
        beats, mine, refused_ok = 0, 0, None
        for _ in range(200):
            if p.eval("document.getElementById('tutor').hidden"):
                break
            if p.eval("!!%s.tutorial && %s.lessonWaits()" % (app, app)):
                # the lesson has handed over the move: make it, as a player would —
                # once the guide's camera has landed on the piece
                p.wait(1400)
                mv = p.eval(LESSON_MOVE % {"ns": ns})
                check(p.eval("!document.getElementById('beat-steps').hidden && "
                             "/^(First|Now),/.test(document.querySelector('#beat-steps .step-t').textContent) && "
                             "document.getElementById('btn-continue').hidden"),
                      "lesson %d says what to do, step by step, with no Next to skip it" % (mv["i"] + 1))
                if refused_ok is None and mv["wrong"]:
                    refused_ok = bool(mv["wrong"]["stayed"] and not mv["wrong"]["ok"] and mv["wrong"]["why"])
                    check(refused_ok, "a move the lesson did not ask for is refused, and it waits: %s"
                          % (mv["wrong"]["why"] or "")[:60])
                if mv["want"]:
                    gesture(p, mv["want"])
                check(p.eval("%s.tutorial ? %s.tutorial.i : 999" % (app, app)) > mv["i"],
                      "the move it asked for, made on the board, moves the lesson on %s" % str(
                          "" if p.eval("%s.tutorial ? %s.tutorial.i : 999" % (app, app)) > mv["i"] else
                          (mv["want"], p.eval("document.getElementById('why').textContent"))))
                mine += 1
            else:
                if p.eval("!!%s.tutorial.current().chrome" % app):
                    p.wait(700)
                    ring = p.eval("!document.getElementById('lesson-spot').classList.contains('none')")
                    ui = p.eval("(function(){var f=%s.tutorial.current().focus; f=typeof f==='function'?null:f;"
                                "var sel=f&&f.ui&&f.ui[0]; if(!sel) return 'piece'; var n=document.querySelector(sel);"
                                "return n && n.offsetParent ? sel : null;})()" % app)
                    check(ring and ui is not None, "the controls tour shows and rings %s" % ui)
                    if ui == "#dock":
                        check(p.eval("!document.getElementById('dock-decisions').hidden"),
                              "and the Decide button it describes is there")
                    bubble_clear(p, "controls tour (%s)" % ui)
                    tour = True
                if p.eval("!%s.outcome && %s.tutorial.current().title" % (app, app)) == "Turn 1 done":
                    p.wait(1800)
                    say = p.eval("document.getElementById('beat-say').textContent") or ""
                    check(re.search(r"score stands at -?\d+ VP", say) is not None,
                          "the victory recap reads the turn's real score: %s" % say[:70])
                    if a.shot:
                        p.screenshot(os.path.join(a.shot, "recap.png"))
                label = p.eval("document.getElementById('btn-continue').textContent")
                debrief_at_finish(p, "6", 4)
                p.click("#btn-continue", wait=250)
            beats += 1
        why = p.eval("document.getElementById('why').textContent") or ""
        check("could not continue" not in why, "the lesson played %d beats without stopping" % beats)
        check(mine >= 1, "and the player made %d of its moves themselves" % mine)
        check(p.eval("!document.querySelector('.fw-stage').classList.contains('lesson-chrome')"),
              "and the controls tour leaves nothing behind")
        check(p.eval("document.getElementById('tutor').hidden") and
              not p.eval("document.querySelector('.fw-stage').classList.contains('in-lesson')"),
              "Finish returned to a normal match, with the chapter list over it")

        # ---- Chapter 7 (last) is watched: Next only, the guide rings each move she makes.
        check(p.eval("document.querySelector(\".chapter[data-chapter='fight']\").classList.contains('next')"),
              "Start here has moved on to Chapter 7")
        p.click(".chapter[data-chapter='fight']", wait=1200)
        watched, rung, spots = 0, 0, set()
        for _ in range(60):
            if p.eval("document.getElementById('tutor').hidden"):
                break
            check(not p.eval("%s.tutorial.waiting()" % app), "chapter 7 step %d asks nothing of the player" % (watched + 1)) if watched == 0 else None
            if p.eval("!!%s.lessonPlan" % app):
                p.wait(1400)
                rung += p.eval("document.querySelectorAll('#board .lesson-planned').length > 0 && "
                               "!document.getElementById('lesson-spot').classList.contains('none') ? 1 : 0")
            p.wait(400)
            spots.add(tuple(p.eval("(function(){var r=document.getElementById('btn-continue').getBoundingClientRect();"
                                   "return [Math.round(r.left), Math.round(r.top)];})()")))
            p.click("#btn-continue", wait=300)
            watched += 1
        why = p.eval("document.getElementById('why').textContent") or ""
        check("could not continue" not in why and watched >= 10, "chapter 7 played %d steps without stopping" % watched)
        check(rung >= 4, "and rang each of its %d moves on the board before making it" % rung)
        check(len(spots) == 1, "and Next stood in the same place on every step: %s" % sorted(spots))
        check(p.eval("!document.getElementById('chapters').hidden && "
                     "document.querySelector(\".chapter[data-chapter='fight']\").classList.contains('done')"),
              "finishing it returns to the chapter list with Chapter 7 ticked")

        check(p.eval("[...document.querySelectorAll('#chapter-list .chapter')].every(function(b){return b.classList.contains('done');})"),
              "all seven chapters are ticked")
        p.click("#btn-chapters-close", wait=200)

        for line in p.errors:
            print("  " + line)
        check(not p.errors, "no console or page errors")

    # ---- the same page at a laptop's size. Everything above ran at 1920 x 1080,
    # where the stage's scale is 1 and a measurement in the wrong units still
    # comes out right. Both of the kit's views shipped that bug; this is the
    # check that would have caught each of them.
    with Page(width=1412, height=849) as p:
        p.open(os.path.join(HERE, "game", "index.html"), "seed=laptop")
        p.eval("document.getElementById('title-screen').hidden = true")
        bad, n, k = p.eval(PLACED % {"ns": ns})
        check(n > 0 and bad == 0, "at 1412 x 849 (stage %.3f) all %d counters sit on their own Location" % (k, n))
        p.click("#btn-new", wait=700)
        p.eval("document.getElementById('ready').hidden = true")
        bad, n, k = p.eval(PLACED % {"ns": ns})
        check(n > 0 and bad == 0, "and still do after the table is rebuilt (New game): %d misplaced of %d" % (bad, n))
        first = p.eval(FIRST_GESTURE % {"ns": ns})
        if first:
            before = p.eval(app + ".session.history.length")
            gesture(p, first)
            check(p.eval(app + ".session.history.length") > before,
                  "and a click-move lands at laptop size too")
        for line in p.errors:
            print("  " + line)
        check(not p.errors, "no console or page errors at laptop size")

    # ---- the play guide drives a turn: Ready -> Auto setup, then the status
    # card's End button walks the phases and names the next one.
    with Page() as p:
        p.open(os.path.join(HERE, "game", "index.html"), "seed=guide")
        p.click("#btn-title-play", wait=400)
        check(p.eval("!document.getElementById('ready').hidden"), "guide: Play asks Ready to play?")
        p.click("#btn-ready-auto", wait=600)
        check(p.eval(app + ".session.state.phase") == "support"
              and p.eval("(document.querySelector('#phase-track li.now')||{}).dataset.phase") == "support",
              "guide: Auto setup starts Turn 1 and the card lights Support")
        seen = []
        for _ in range(4):
            nxt = p.eval("document.getElementById('guide-next').textContent") or ""
            if not p.eval("!!document.getElementById('btn-guide-end')"):
                break
            p.click("#btn-guide-end", wait=500)
            seen.append(p.eval(app + ".session.state.phase"))
            check(p.eval("(document.querySelector('#phase-track li.now')||{}).dataset.phase") == seen[-1],
                  "guide: the card follows to %s (it had said: %s)" % (seen[-1], nxt[:50]))
        check(seen[:2] == ["reinforce", "fire"], "guide: End walks Support > Reinforcements > Fire: %s" % seen)
        # leaving a lesson part-way lands on Ready to play, not on a bare table
        p.click("#btn-tutorial", wait=300)
        p.click(".chapter[data-chapter='pieces']", wait=600)
        p.click("#btn-continue", wait=300)
        p.click("#btn-leave", wait=500)
        check(p.eval("!document.getElementById('ready').hidden && document.getElementById('chapters').hidden"),
              "guide: Leave lesson asks Ready to play?")
        check(not p.errors, "no console or page errors in the guide drive")

    # ---- in hand and the first-game coach (owner, 2026-10-31): Walsh points
    # at the drawn squads; a picked squad rides in the status card and every
    # Start Zone it may take glows; placing it moves her on. Her panel stays
    # on the right, clear of the Pieces window.
    with Page() as p:
        p.open(os.path.join(HERE, "game", "index.html"), "seed=hand")
        p.eval("(()=>{try{localStorage.removeItem('phantomfury.coach.off')}catch(e){}})()")
        p.click("#btn-title-play", wait=400)
        p.click("#btn-ready-setup", wait=500)
        say = "(document.getElementById('coach').hidden ? '' : document.getElementById('coach-say').textContent)"
        check("drawn squads" in (p.eval(say) or ""), "coach: Walsh points at the drawn squads in the tray")
        arrow = "getComputedStyle(document.getElementById('coach-line')).display"
        check(p.eval(arrow) == "none" and p.eval("getComputedStyle(document.getElementById('coach-ring')).display") != "none",
              "coach: by default she rings the control, with no arrow")
        p.eval("(()=>{const b=document.getElementById('opt-coach-arrow');b.checked=true;b.dispatchEvent(new Event('change'))})()")
        p.wait(200)
        check(p.eval(arrow) != "none", "coach: How to play's option adds the arrow")
        p.eval("(()=>{const b=document.getElementById('opt-coach-arrow');b.checked=false;b.dispatchEvent(new Event('change'))})()")
        check(p.eval("(()=>{const a=document.getElementById('coach').getBoundingClientRect(),b=document.getElementById('reserve-tray').getBoundingClientRect();"
                     "return a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom})()"),
              "coach: her panel does not cover the reserve tray")
        p.click("#reserve-tray .pf-unit[data-pool='setup']", wait=600)
        n = p.eval("document.querySelectorAll('#board .pf-zone.tgt').length")
        zones = p.eval("new Set(PhantomFury.legalActions(%s.session.state).filter(a=>a.type==='setupPlace'&&a.uid===%s.controller.selected).map(a=>a.zone)).size" % (app, app))
        check(not p.eval("document.getElementById('hand').hidden") and n == zones and n > 0,
              "hand: the picked squad is In hand and its Start Zones glow (%s lit, %s zones)" % (n, zones))
        check("in your hand" in (p.eval(say) or ""), "coach: Walsh moves to the In hand slot")
        z = p.eval("document.querySelector('#board .pf-zone.tgt').dataset.zone")
        p.eval("document.querySelector(\"#board .pf-zone[data-zone='%s']\").click()" % z)
        p.wait(500)
        check(p.eval("document.getElementById('hand').hidden && !document.querySelectorAll('#board .pf-zone.tgt').length"),
              "hand: placing the squad empties the hand and clears the glow")
        check("One squad per Start Zone" in (p.eval(say) or ""), "coach: after the first squad Walsh says do the rest")
        check(not p.eval("document.getElementById('reserve-tray').hidden") and
              p.eval("document.querySelectorAll(\"#reserve-tray .pf-unit[data-pool='setup']\").length") == 8,
              "tray: it stays open after a placement, with the eight squads left")
        p.click("#reserve-tray .pf-unit[data-pool='setup']", wait=400)
        p.eval("document.querySelector('#board .pf-zone.tgt').click()")
        p.wait(400)
        check(p.eval("document.querySelectorAll(\"#reserve-tray .pf-unit[data-pool='setup']\").length") == 7,
              "tray: a second squad goes straight from the tray to the map (two clicks)")
        p.click("#coach-skip", wait=300)
        check(p.eval("document.getElementById('coach').hidden"), "coach: Don't show again hides her")
        check(not p.errors, "no console or page errors in the hand / coach drive")

    # ---- Walsh's tips in tricky moments (owner, 2026-10-31): picking a
    # Dragon Eye Zone brings the second-Zone tip; once seen it stays away.
    with Page() as p:
        p.open(os.path.join(HERE, "game", "index.html"), "seed=hints")
        p.eval("(()=>{try{localStorage.setItem('phantomfury.coach.off','1');localStorage.removeItem('phantomfury.hints.seen');"
               "localStorage.removeItem('phantomfury.hints.off')}catch(e){}})()")
        p.click("#btn-title-play", wait=400)
        p.click("#btn-ready-auto", wait=600)
        title = "(document.getElementById('coach').hidden ? '' : document.getElementById('coach-title').textContent)"
        z = p.eval("(PhantomFury.legalActions(%s.session.state).find(a=>a.type==='mission'&&a.mission==='dragonEye'&&a.zone2)||{}).zone" % app)
        check(z is not None, "hints: the Support Phase offers a Dragon Eye pair")
        if z is not None:
            p.eval("document.querySelector(\"#board .pf-zone[data-zone='%s']\").click()" % z)
            p.wait(500)
            check("Dragon Eye" in (p.eval(title) or ""), "hints: picking a Zone brings Walsh's second-Zone tip")
            p.click("#coach-ok", wait=300)
            p.page.keyboard.press("Escape")
            p.wait(200)
            p.eval("document.querySelector(\"#board .pf-zone[data-zone='%s']\").click()" % z)
            p.wait(400)
            check(not p.eval(title), "hints: once seen, the tip does not come back")
        check(not p.errors, "no console or page errors in the hints drive")

    # ---- air support from the tray (owner, 2026-10-31): a Dragon Eye flown
    # tray > Zone > partner, then a Super Cobra tray > Zone > target button.
    with Page() as p:
        p.open(os.path.join(HERE, "game", "index.html"), "seed=air")
        p.eval("(()=>{try{localStorage.setItem('phantomfury.coach.off','1');localStorage.setItem('phantomfury.hints.off','1')}catch(e){}})()")
        p.click("#btn-title-play", wait=400)
        p.click("#btn-ready-auto", wait=600)
        legal = "PhantomFury.legalActions(%s.session.state)" % app
        for _ in range(3):
            if p.eval("%s.some(a=>a.type==='mission'&&a.mission==='cobra')" % legal):
                break
            p.click("#reserve-tray .pf-unit[data-mission='dragonEye']", wait=300)
            pair = p.eval("(()=>{const a=%s.find(a=>a.type==='mission'&&a.mission==='dragonEye'&&a.zone2);return a?[a.zone,a.zone2]:null})()" % legal)
            if not pair:
                break
            # only a success uses a Mission up [9.2], so count applied actions
            hist = p.eval(app + ".session.history.length")
            for z in pair:
                p.eval("document.querySelector(\"#board .pf-zone[data-zone='%s']\").click()" % z)
                p.wait(400)
            check(p.eval(app + ".session.history.length") == hist + 1 and p.eval(app + ".controller.mission") is None,
                  "air: a Dragon Eye flown from the tray over Zones %s and %s" % tuple(pair))
        if p.eval("%s.some(a=>a.type==='mission'&&a.mission==='cobra')" % legal):
            p.click("#reserve-tray .pf-unit[data-mission='cobra']", wait=300)
            lit = p.eval("document.querySelectorAll('#board .pf-zone.tgt').length")
            zones = p.eval("new Set(%s.filter(a=>a.type==='mission'&&a.mission==='cobra').map(a=>a.zone)).size" % legal)
            check(lit == zones and lit > 0, "air: the Super Cobra in hand lights the Zones it may strike (%s lit, %s legal)" % (lit, zones))
            z = p.eval("document.querySelector('#board .pf-zone.tgt').dataset.zone")
            hist = p.eval(app + ".session.history.length")
            p.eval("document.querySelector(\"#board .pf-zone[data-zone='%s']\").click()" % z)
            p.wait(400)
            if p.eval("document.querySelectorAll('#hand .hand-choices .btn').length"):
                p.click("#hand .hand-choices .btn", wait=500)
            check(p.eval(app + ".session.history.length") == hist + 1 and p.eval("document.getElementById('hand').hidden"),
                  "air: the Super Cobra strikes from the hand and the hand empties")
        else:
            check(False, "air: no Super Cobra target appeared after the Dragon Eyes")
        check(not p.errors, "no console or page errors in the air-support drive")

    # ---- combat feedback and the turn event (owner, 2026-10-31): a shot
    # draws a tracer and opens the report with every roll; a new turn pans
    # to the date wheel, steps the marker on, and Walsh speaks.
    with Page() as p:
        p.open(os.path.join(HERE, "game", "index.html"), "seed=p1")
        p.eval("(()=>{try{localStorage.setItem('phantomfury.coach.off','1');localStorage.setItem('phantomfury.hints.off','1')}catch(e){}})()")
        p.click("#btn-title-play", wait=400)
        p.click("#btn-ready-auto", wait=600)
        legal = "PhantomFury.legalActions(%s.session.state)" % app
        step = "(()=>{const A=%s;const L=PhantomFury.legalActions(A.session.state);A.perform(L.find(x=>x.type==='endPhase')||L[0])})()" % app
        for _ in range(60):
            if p.eval("%s.some(a=>a.type==='fire')" % legal):
                break
            p.eval(step)
            p.wait(40)
        if p.eval("!!%s.coachEvent" % app):
            p.click("#coach-ok", wait=1000)
        fire = p.eval("%s.find(a=>a.type==='fire')" % legal)
        check(bool(fire), "combat: a Fire action came up to test")
        if fire:
            p.eval("document.querySelectorAll('.popup:not([hidden])').forEach(n=>n.hidden=true)")
            p.eval("document.querySelector(\"#board .pf-unit[data-uid='%s']\").click()" % fire["uid"])
            p.wait(250)
            p.eval("document.querySelector(\"#board .pf-unit[data-uid='%s']\").click()" % fire["target"])
            p.wait(300)
            check(p.eval("document.querySelectorAll('#board .pf-shot line').length") >= 1, "combat: the shot draws a tracer on the map")
            check(p.eval("!document.getElementById('report').hidden && document.querySelectorAll('#report-rolls li .die').length >= 1"),
                  "combat: the report opens with the roll(s): %s" % p.eval("document.getElementById('report-title').textContent"))
            p.click("#report-ok", wait=200)
            check(p.eval("document.getElementById('report').hidden"), "combat: OK closes the report")
        t0 = p.eval(app + ".session.state.turn")
        for _ in range(40):
            if p.eval(app + ".session.state.turn") > t0:
                break
            p.eval(step)
            p.wait(40)
        p.wait(2700)
        title = p.eval("document.getElementById('coach').hidden ? '' : document.getElementById('coach-title').textContent")
        check(title.startswith("Turn") or title == "The last turn", "turn: Walsh speaks at the date wheel (%r)" % title)
        check(p.eval("(()=>{const t=document.querySelector(\"#board .pf-track[data-peek='turn']\").getBoundingClientRect();"
                     "return t.left>0&&t.right<innerWidth&&t.top>0&&t.bottom<innerHeight})()"),
              "turn: the camera has the Game Turn marker in view")
        p.click("#coach-ok", wait=1100)
        check(p.eval("document.getElementById('coach').hidden"), "turn: Got it ends the event")
        check(not p.errors, "no console or page errors in the combat / turn drive")

    if problems:
        print("live_check: %d problem(s)" % len(problems))
        return 1
    print("live_check: all good")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
