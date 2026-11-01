/* phantomfury_director.js — how the lesson is shown (Learn to Play v2).
 *
 * The lesson's content is phantomfury_tutorial.js (beats on the engine);
 * this file only stages it, and is DOM-only like the app:
 *   - the camera eases the map to where the player should look;
 *   - a spotlight dims everything else and rings the piece in play;
 *   - Specialist Walsh, the guide, speaks in a large bubble beside it,
 *     with a pointer drawn from the bubble to the ring;
 *   - the result of the player's move (the die, the outcome) opens the
 *     next bubble, and Corporal Hendrix cuts in on a shot or an assault.
 * The app calls beat(ctx) when a beat is shown, layout() after every
 * board redraw, result(r) after the player's move, refused(why), hide().
 */
(function (global) {
  "use strict";

  var IMG = "../assets/characters/";
  // Happier faces (owner, 2026-10-18): she smiles while she talks, smiles
  // while she waits for your move, corrects you with a calm smile, laughs
  // when you get it right.
  var POSES = {
    talk: "walsh-face-smiling.png", grin: "walsh-bust-laughing-side.png",
    wow: "walsh-bust-portrait-surprised.png", focus: "walsh-head-portrait-calm.png",
    point: "walsh-bust-hand-signals.png", think: "walsh-bust-calm.png",
    drone: "walsh-kneel-tablet-drone.png",
    // reactions to the player's own move: delight, or a "damn it" grimace
    laugh: "walsh-bust-laughing.png", grimace: "walsh-bust-angry.png" };
  var ART = "../assets/counters/";
  var CAMEOS = { fire: "hendrix-rifle-kneeling-fire.png", assault: "hendrix-rifle-standing-firing.png" };
  // Slow on purpose (owner, 2026-10-18): the camera glides, and the words
  // fade in only once it has landed, so the eye knows where to look first.
  var CAMERA_MS = 1200, GAP = 70;
  // The bubble never moves (owner, 2026-10-18): it stands at the bottom centre
  // of the stage, so Next is always in the same place; the camera frames the
  // focus in the open board above it. BUBBLE_ROOM is the height kept for it.
  var BUBBLE_ROOM = 490;

  var cur = null, shownIndex = -1, flying = false, flyTimer = null, pending = null, cameoTimer = null;
  // The words change once (owner, 2026-10-19): the old text fades out, the new
  // is drawn while hidden, and it fades in a single time, after the camera
  // lands. `live` is the beat the lesson is on; `cur` is the one on screen,
  // which differs only while the player looks back through `history`.
  var SWAP_MS = 180, swapTimer = null, live = null, history = [], back = -1;

  function $(id) { return document.getElementById(id); }
  function A() { return global.PhantomFuryApp; }
  function stage() { return document.querySelector(".fw-stage"); }
  function k() { return parseFloat(stage().dataset.scale || "1"); }
  function still() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // ------------------------------------------------------------ where to look
  // The map elements the beat is about: its named focus, or — for a beat
  // that waits for a move — the piece the lesson hands over and every
  // place it may go or strike (the board marks them .lesson-actor / .tgt).
  function focusNodes() {
    if (!cur) return [];
    var b = cur.beat, f = cur.focus, q = [], a = cur.planned;
    if (b.view === "city") return [];
    if (a) {
      // a watch beat: the piece the guide is about to use, and where it goes or strikes
      if (a.uid) q.push(".pf-unit[data-uid='" + a.uid + "']");
      if (a.target) q.push(".pf-unit[data-uid='" + a.target + "']");
      if (a.to && a.to.street != null) q.push(".pf-street[data-street='" + a.to.street + "']");
      else if (a.to) q.push("[data-loc='" + a.to.zone + ":" + a.to.loc + "']");
      if (a.zone) q.push(".pf-zone[data-zone='" + a.zone + "']");
      if (a.zone2) q.push(".pf-zone[data-zone='" + a.zone2 + "']");
    } else if (cur.waiting && cur.moves.length && !(f && f.units) && !(cur.tray && f)) {
      // (a tray step rings its own focus: the place its steps name)
      q = [".pf-unit.lesson-actor", ".pf-unit.tgt", ".pf-loc.tgt", ".pf-street.tgt", ".pf-zone.tgt"];
      // a puzzle may widen the ring to its goal: whole Zones as well
      ((f && f.zones) || []).forEach(function (z) { q.push(".pf-loc[data-zone='" + z + "']", ".pf-unit[data-zone='" + z + "']"); });
    } else if (f) {
      // pieces, places (a Location's dot, or the piece standing on it),
      // Streets, and whole Zones: the tile, every Location and every piece in it
      (f.units || []).forEach(function (u) { q.push(".pf-unit[data-uid='" + u + "']"); });
      (f.locs || []).forEach(function (k) { q.push("[data-loc='" + k + "']", ".pf-unit[data-at='" + k + "']"); });
      (f.streets || []).forEach(function (id) { q.push(".pf-street[data-street='" + id + "']"); });
      (f.tracks || []).forEach(function (t) { q.push(".pf-track[data-peek='" + t + "']"); });
      (f.zones || []).forEach(function (z) { q.push(".pf-zone[data-zone='" + z + "']", ".pf-loc[data-zone='" + z + "']", ".pf-unit[data-zone='" + z + "']"); });
    }
    var out = [];
    q.forEach(function (sel) {
      document.querySelectorAll("#board " + sel).forEach(function (n) { if (out.indexOf(n) < 0) out.push(n); });
    });
    // the page's own controls (a controls tour): rung where they stand on the stage
    ((f && f.ui) || []).forEach(function (sel) { var n = document.querySelector(sel); if (n && n.offsetParent) out.push(n); });
    return out;
  }
  function stageBox(nodes) {
    var sr = stage().getBoundingClientRect(), s = k();
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    nodes.forEach(function (n) {
      var r = n.getBoundingClientRect();
      x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom);
    });
    return { x: (x0 - sr.left) / s, y: (y0 - sr.top) / s, w: (x1 - x0) / s, h: (y1 - y0) / s };
  }

  // ------------------------------------------------------------------ camera
  function moveCamera() {
    var b = cur.beat, nodes = focusNodes();
    if (b.view === "city") { A().boardHome(); return true; }
    if (!nodes.length) return false;                 // keep looking where we were
    var box = A().worldBoxOf(nodes);
    if (!box) return false;
    // frame the focus in the board above the bubble, centred across
    var board = document.getElementById("board"), bh = board.offsetHeight || 1000;
    // (the bubble's real height: its words are laid out before the camera moves)
    var room = Math.max(BUBBLE_ROOM, $("tutor").offsetHeight + 40);
    var free = Math.max(bh * 0.3, bh - room - GAP);
    // the ring sits just above the bubble, a short pointer away (owner:
    // the gap felt long); a ring too tall for that is centred instead
    // (a lesson may pull back past City, so a wide ring still fits above the bubble)
    A().cameraTo(box, { ax: 0.5, ay: free / 2 / bh, fill: nodes.length > 4 ? 0.8 : 0.4,
      fillH: (nodes.length > 4 ? 0.72 : 0.45) * free / bh, bottom: free + GAP / 2, loose: 0.75, minScale: 0.55, ms: CAMERA_MS });
    return true;
  }

  // ---------------------------------------------------------------- the beat
  function beat(ctx) {
    // a held outcome shares its move's step number, so it has a key of its own
    var key = ctx.key || ctx.index, fresh = key !== shownIndex;
    live = ctx;
    if (fresh) { history.push({ ctx: ctx, rows: null }); back = -1; }
    else if (back >= 0) return;             // looking back: the live beat waits for Next
    var shown = !$("tutor").hidden && shownIndex !== -1;
    shownIndex = key;
    cur = ctx;
    if (swapTimer) return;                  // mid-swap: the latest beat is drawn when it lands
    if (fresh && shown && !still()) { swapIn(); return; }
    show(fresh);
  }
  // fade the words out, then draw the next ones (still hidden) and fade in once
  function swapIn() {
    $("tutor").classList.add("swapping");
    swapTimer = setTimeout(function () { swapTimer = null; show(true); }, SWAP_MS);
  }
  function show(fresh) {
    $("tutor").hidden = false;
    $("lesson-spot").hidden = false;
    fill(fresh);
    if (fresh) {
      reframe();                            // sets lesson-flying first, so the words stay hidden in flight
      var t = $("tutor");
      t.classList.remove("enter"); void t.offsetWidth; t.classList.add("enter");
      t.classList.remove("why-open");
      if (back < 0 && history.length) history[history.length - 1].rows = shownRows;
    }
    $("tutor").classList.remove("swapping");
    $("tutor").classList.toggle("reviewing", back >= 0);
    $("btn-back").disabled = (back >= 0 ? back : history.length - 1) < 1;
    layout();
  }

  // Looking back: Back steps to the beats already shown, words, dice and camera,
  // without undoing anything; Next walks forward again to the live beat.
  function reviewOf(c) {
    var r = {};
    Object.keys(c).forEach(function (k) { r[k] = c[k]; });
    r.waiting = false; r.loose = []; r.moves = []; r.tray = null; r.labels = null; r.selected = null;
    r.quiz = c.quiz ? { prompt: c.quiz.prompt, solved: true } : null;
    r.reviewing = true;
    return r;
  }
  function goTo(i) {
    back = i >= history.length - 1 ? -1 : i;
    var e = history[back < 0 ? history.length - 1 : back];
    cur = back < 0 ? live : reviewOf(e.ctx);
    pending = e.rows && e.rows.length ? { rows: e.rows, pose: null, replay: true } : null;
    clearTimeout(swapTimer); swapTimer = null;
    if (still()) { show(true); return; }
    $("tutor").classList.add("swapping");
    swapTimer = setTimeout(function () { swapTimer = null; show(true); }, SWAP_MS);
  }
  function stepBack() {
    var at = back >= 0 ? back : history.length - 1;
    if (at < 1) return;
    goTo(at - 1);
  }
  function stepForward() {
    if (back < 0) return false;
    goTo(back + 1);
    return true;
  }

  // move the camera to the beat's focus and lay out once it settles
  function reframe() {
    var moved = moveCamera();
    clearTimeout(flyTimer);
    if (moved && !still()) {
      flying = true;
      stage().classList.add("lesson-flying");
      flyTimer = setTimeout(function () {
        flying = false; stage().classList.remove("lesson-flying"); layout();
      }, CAMERA_MS + 60);
    } else { flying = false; stage().classList.remove("lesson-flying"); }
  }

  function fill(fresh) {
    var b = cur.beat, waiting = cur.waiting;
    $("beat-step").textContent = (cur.chapter ? cur.chapter + " · " : "") + "Step " + Math.min(cur.index + 1, cur.total) + " of " + cur.total +
      (cur.reviewing ? " · looking back" : "");
    $("beat-title").textContent = cur.title || "";
    $("beat-say").textContent = cur.say || "";
    // the rule behind it waits behind "Why?"
    $("beat-explain").textContent = (cur.explain ? cur.explain + " " : "") + (b.cite || "");
    $("btn-why").hidden = !cur.explain;
    renderSteps();
    var t = $("tutor");
    ["good", "bad", "mixed", "news"].forEach(function (v) { t.classList.toggle("verdict-" + v, b.verdict === v); });
    t.classList.toggle("debriefing", !!cur.debrief);
    if (fresh) showDebrief(cur.debrief);
    if (fresh) { $("tutor").classList.remove("refused"); $("beat-refuse").hidden = true; $("beat-right").hidden = true; showResult(); showCard(b.card); $("tutor-body").scrollTop = 0; }
    var asking = !!(cur.quiz && !cur.quiz.solved);
    // the tray: off-map pieces to pick up (the draw, the CAATs)
    var tray = $("lesson-tray");
    tray.innerHTML = "";
    tray.hidden = !(cur.tray && cur.tray.length);
    (cur.tray || []).forEach(function (t, i) {
      var chip = el("button", "tray-chip" + (t.sel ? " sel" : ""));
      chip.dataset.uid = t.uid;
      chip.title = t.name;
      chip.style.setProperty("--i", i);
      var im = el("img"); im.src = t.image; im.alt = "";
      chip.appendChild(im);
      if (t.cf != null) chip.appendChild(el("span", null, String(t.cf)));
      chip.addEventListener("click", function () { A().trayPick(t.uid); });
      tray.appendChild(chip);
    });
    var acts = $("lesson-acts");
    acts.innerHTML = "";
    cur.loose.forEach(function (a, k) {
      var label = (cur.labels && cur.labels[k]) || a.label || a.type;   // a puzzle may name its choices in plain words
      if (a.type === "mission" && a.mission === "dragonEye" && a.zone2) label = "Fly the Dragon Eye over Zones " + a.zone + " and " + a.zone2;
      var btn = el("button", "btn primary lesson-act", label);
      btn.dataset.actionType = a.type;
      btn.title = a.cite || "";
      btn.addEventListener("click", function () { A().perform(a); });
      acts.appendChild(btn);
    });
    acts.hidden = !cur.loose.length;
    var c = $("btn-continue");
    c.hidden = waiting || asking;
    c.textContent = b.done && !cur.reviewing ? "Finish" : "Next ▸";
    setPose(b.verdict ? b.pose : cur.quiz && cur.quiz.solved ? "grin" : pending && fresh && pending.pose ? pending.pose : (b.pose || (waiting ? "focus" : "talk")));
  }
  // What to do, as a numbered list: "First, … Then, …". A beat may write its
  // own steps; otherwise they follow from what it asks for. The first step
  // ticks when the right piece has been picked up.
  function stepsFor() {
    var picked = !!cur.selected && (
      (cur.tray || []).some(function (t) { return t.uid === cur.selected; }) ||
      cur.moves.some(function (a) { return a.uid === cur.selected; }));
    var own = cur.steps;
    if (cur.quiz) return cur.quiz.solved ? null : [{ t: cur.quiz.prompt.replace(/^./, function (c) { return c.toLowerCase(); }) }];
    if (!cur.waiting) return own ? own.map(function (t) { return { t: t }; }) : null;
    if (own) return own.map(function (t, i) { return { t: t, done: i === 0 && own.length > 1 && picked }; });
    if (cur.loose.length) return [{ t: cur.hint ? cur.hint.replace(/^./, function (c) { return c.toLowerCase(); }) : "choose below." }];
    var strike = cur.moves.some(function (a) { return a.type === "fire" || a.type === "assault"; });
    return [{ t: "click the ringed squad.", done: picked },
            { t: strike ? "click the enemy it should hit." : "click where it should go." }];
  }
  function renderSteps() {
    var list = $("beat-steps"), steps = stepsFor();
    list.innerHTML = "";
    list.hidden = !steps;
    if (!steps) return;
    // the question first: what this moment asks of you, then how
    var ask = cur.ask || (cur.waiting ? (cur.loose.length ? "Make a decision." : "Your move.") : null);
    if (ask) list.appendChild(el("li", "ask", ask));
    var words = steps.length === 1 ? ["Now, "] : ["First, ", "Then, ", "Then, ", "Finally, "];
    steps.forEach(function (st, i) {
      var li = el("li", st.done ? "done" : "");
      var w = i === steps.length - 1 && steps.length > 2 ? "Finally, " : words[Math.min(i, words.length - 1)];
      li.appendChild(el("span", "step-n", st.done ? "✓" : String(i + 1)));
      li.appendChild(el("span", "step-t", w + st.t));
      list.appendChild(li);
    });
  }
  // The chapter's close: an after-action report of every decision the player
  // made (what they chose, what came of it, the lesson), what to remember,
  // and what the next chapter teaches.
  function showDebrief(d) {
    var box = $("beat-debrief");
    if (!box) {
      box = el("div"); box.id = "beat-debrief";
      $("beat-say").parentNode.insertBefore(box, $("beat-steps"));
    }
    box.innerHTML = "";
    box.hidden = !d;
    if (!d) return;
    if (d.rows.length) {
      box.appendChild(el("div", "db-kicker", "After-action report"));
      var ol = el("ol", "db-rows");
      d.rows.forEach(function (r) {
        var li = el("li", "db-row tone-" + r.tone);
        // the mark grades the call, the headline's colour the dice: a right call can still miss
        li.appendChild(el("span", "db-mark" + (r.tries ? " retry" : ""), "✓"));
        var body = el("div", "db-body");
        body.appendChild(el("div", "db-what", r.title + " — " + r.choice));
        var res = el("div", "db-res");
        if (r.headline) res.appendChild(el("b", "db-head", r.headline));
        res.appendChild(document.createTextNode((r.headline ? " · " : "") + (r.tries ? "right call on try " + (r.tries + 1) : "right call, first try")));
        body.appendChild(res);
        if (r.lesson) body.appendChild(el("div", "db-lesson", r.lesson));
        li.appendChild(body);
        ol.appendChild(li);
      });
      box.appendChild(ol);
    }
    if (d.takeaways.length) {
      box.appendChild(el("div", "db-kicker", "What to remember"));
      var ul = el("ul", "db-take");
      d.takeaways.forEach(function (t) { ul.appendChild(el("li", null, t)); });
      box.appendChild(ul);
    }
    if (d.next) box.appendChild(el("div", "db-next", "Next: " + d.next));
  }
  // A counter shown large in the bubble. With two sides it turns over by
  // itself once, then on every click: a squad's reduced side, what a
  // Suspect turned out to be, the other side of an Insurgents counter.
  var flipTimer = null;
  function showCard(card) {
    var box = $("beat-card");
    clearTimeout(flipTimer);
    box.innerHTML = "";
    box.hidden = !card;
    if (!card) return;
    var two = !!card.back;
    var pc = el("div", "pc" + (two ? " two" : ""));
    var flip = el("div", "pc-flip"), inner = el("div", "pc-inner");
    var f = el("img", "pc-face front"); f.src = ART + card.front.art; f.alt = card.front.label;
    inner.appendChild(f);
    if (two) { var k = el("img", "pc-face back"); k.src = ART + card.back.art; k.alt = card.back.label; inner.appendChild(k); }
    flip.appendChild(inner); pc.appendChild(flip);
    var labels = el("div", "pc-labels");
    labels.appendChild(el("div", "pc-l front", card.front.label));
    if (two) {
      labels.appendChild(el("div", "pc-l back", card.back.label));
      labels.appendChild(el("div", "pc-tip", "Click the counter to turn it over"));
      flip.addEventListener("click", function () { pc.classList.toggle("flipped"); });
      if (!still()) flipTimer = setTimeout(function () { pc.classList.add("flipped"); }, 1800);
    }
    pc.appendChild(labels);
    box.appendChild(pc);
  }
  function quizRight(text) {
    var n = $("beat-right");
    n.textContent = "✓ " + text;
    n.hidden = false;
    n.classList.remove("pop"); void n.offsetWidth; n.classList.add("pop");
    $("beat-refuse").hidden = true;
  }

  function setPose(p) {
    var img = $("guide-img"), src = IMG + (POSES[p] || POSES.talk);
    if (img.getAttribute("src") === src) return;
    img.setAttribute("src", src);
    var g = $("guide");
    g.classList.remove("swap"); void g.offsetWidth; g.classList.add("swap");
  }

  // ---------------------------------------------------------------- layout
  // The bubble stands still (CSS puts it at the bottom centre); this rings
  // the focus and draws the pointer from the bubble's top edge to the ring.
  function layout() {
    if (!cur || $("tutor").hidden) return;
    var st = stage(), W = st.offsetWidth, H = st.offsetHeight;
    var spot = $("lesson-spot"), tutor = $("tutor"), arrow = $("lesson-arrow");
    var nodes = flying ? [] : focusNodes();
    if (flying) { arrow.classList.remove("show"); return; }
    if (cur.planned) nodes.forEach(function (n) { n.classList.add("lesson-planned"); });
    if (!nodes.length) {
      spot.classList.add("none");
      setRect(spot, { x: W / 2, y: H / 2, w: 0, h: 0 });
      arrow.classList.remove("show");
      return;
    }
    var wb = A().worldBoxOf(nodes);
    var r = wb ? A().worldToStage(wb) : stageBox(nodes), pad = 18;
    r = { x: r.x - pad, y: r.y - pad, w: r.w + pad * 2, h: r.h + pad * 2 };
    spot.classList.remove("none");
    setRect(spot, r);
    var b = stageBox([tutor]);
    if (r.y + r.h > b.y - 12) { arrow.classList.remove("show"); return; }   // beside it: no pointer needed
    drawArrow(r, b);
  }
  function setRect(n, r) {
    n.style.left = r.x + "px"; n.style.top = r.y + "px"; n.style.width = r.w + "px"; n.style.height = r.h + "px";
  }
  function drawArrow(r, b) {
    var arrow = $("lesson-arrow"), path = $("lesson-arrow-path");
    // from the bubble's top edge, under the ring's centre where it can be
    var tx = r.x + r.w / 2, ty = r.y + r.h;
    var fx = Math.max(b.x + 40, Math.min(b.x + b.w - 40, tx)), fy = b.y;
    var mx = (fx + tx) / 2, my = (fy + ty) / 2 - 24;
    var d = "M" + fx + "," + fy + " Q" + mx + "," + my + " " + tx + "," + ty;
    if (path.getAttribute("d") === d && arrow.classList.contains("show")) return;
    path.setAttribute("d", d);
    arrow.classList.remove("show"); void arrow.getBoundingClientRect(); arrow.classList.add("show");
  }

  // ---------------------------------------------------- the move's result
  // Kept until the next beat opens, then shown at the top of its bubble:
  // every die the move rolled, what it needed, and what came of it.
  function result(r) {
    var a = r.byPlayer || {}, recs = r.records || [], rows = [];
    // ending a phase, or the guide skipping ahead: the banner says the
    // phase; only dice are worth a box
    var diceOnly = a.type === "endPhase" || a.type === "watch";
    if (diceOnly) recs = recs.filter(function (rec) { return rec.die != null; });
    // the dice first: a roll's record says more than a phase note does
    var rolled = recs.filter(function (rec) { return rec.die != null; });
    recs = (rolled.length ? rolled : recs).slice(0, 3);
    recs.forEach(function (rec) {
      rows.push({ die: rec.die, mod: rec.modifiedDie, target: rec.target,
        text: (rec.context ? rec.context + " — " : "") + (rec.result || "") });
    });
    if (!rows.length && !diceOnly) (r.events || []).slice(0, 2).forEach(function (e) { rows.push({ text: e }); });
    var bad = recs.some(function (rec) { return /miss|no effect|fail|pinned|loss/i.test(rec.result || ""); });
    pending = { rows: rows, pose: rows.length ? (bad ? "wow" : "grin") : "grin" };
    if (CAMEOS[a.type]) cameo(CAMEOS[a.type]);
  }
  var shownRows = null;
  function showResult() {
    var box = $("beat-result");
    box.innerHTML = "";
    shownRows = pending && pending.rows.length ? pending.rows : null;
    if (!pending || !pending.rows.length) { box.hidden = true; pending = null; return; }
    box.appendChild(el("div", "result-kicker", "What happened"));
    pending.rows.forEach(function (row) {
      var line = el("div", "result-row");
      if (row.die != null) {
        var die = el("span", "die rolling", "?");
        line.appendChild(die);
        if (pending.replay) { die.textContent = String(row.die); die.classList.remove("rolling"); }
        else rollDie(die, row.die);
        if (row.target != null) line.appendChild(el("span", "result-need",
          (row.mod != null && row.mod !== row.die ? "→ " + row.mod + " " : "") + "needs " + row.target + " or less"));
      }
      line.appendChild(el("span", "result-text", row.text));
      box.appendChild(line);
    });
    box.hidden = false;
    pending = null;
  }
  function rollDie(n, final) {
    if (still()) { n.textContent = String(final); n.classList.remove("rolling"); return; }
    var t = 0, iv = setInterval(function () {
      t += 1;
      n.textContent = String((final + t * 7) % 10);   // the show, not the roll: the engine rolled already
      if (t >= 10) { clearInterval(iv); n.textContent = String(final); n.classList.remove("rolling"); n.classList.add("landed"); }
    }, 60);
  }
  function cameo(file) {
    var c = $("lesson-cameo");
    c.setAttribute("src", IMG + file);
    c.hidden = false;
    c.classList.remove("play"); void c.offsetWidth; c.classList.add("play");
    clearTimeout(cameoTimer);
    cameoTimer = setTimeout(function () { c.hidden = true; c.classList.remove("play"); }, 2400);
  }

  function refused(why) {
    var n = $("beat-refuse");
    n.textContent = why;
    n.hidden = false;
    n.classList.remove("shake"); void n.offsetWidth; n.classList.add("shake");
    $("tutor").classList.add("refused");      // the reason now says what the moment asks: the question steps aside
    setPose("think");
    // the reason makes the bubble taller: lift the ring clear of it again
    reframe();
    layout();
  }

  function hide() {
    cur = null; live = null; shownIndex = -1; pending = null; flying = false;
    history = []; back = -1;
    clearTimeout(flyTimer); clearTimeout(swapTimer); swapTimer = null;
    $("tutor").classList.remove("swapping", "reviewing");
    ["tutor", "lesson-spot", "lesson-cameo"].forEach(function (id) { $(id).hidden = true; });
    $("lesson-arrow").classList.remove("show");
    stage().classList.remove("lesson-flying");
  }

  // Next with the keyboard too: Space, Enter or the right arrow.
  if (typeof document !== "undefined") {
    document.addEventListener("keydown", function (ev) {
      if (!cur || $("tutor").hidden) return;
      if (ev.key !== " " && ev.key !== "Enter" && ev.key !== "ArrowRight") return;
      if (ev.target && ev.target.tagName === "BUTTON" && ev.key !== "ArrowRight") return;   // the button takes its own key
      var c = $("btn-continue");
      if (!c.hidden) { ev.preventDefault(); c.click(); }
    });
  }

  global.PhantomFuryDirector = { beat: beat, layout: layout, result: result, refused: refused, hide: hide, quizRight: quizRight,
    back: stepBack, forward: stepForward, reviewing: function () { return back >= 0; } };
})(typeof window !== "undefined" ? window : globalThis);
