// The profile list on the unfolded Duo, under a finger. The page is put into
// the shape fitStage() gives the Duo so the panel over the covers is measured
// where it was squeezed, and the tag chips are pressed the way a finger presses
// them: down, moved or held, up, click.
//
// That shape is 720 on its short side at 87% (.dense): 720x1024 on end, 1024x720
// on its side. The test window is the tablet's, so the shape is put on by hand
// and fitStage() takes it off again.
function duoShape(kind) {
  var b = document.body, r = document.documentElement.style, app = document.querySelector('.app');
  // The clock a suite runs under does not drive CSS transitions, so a control
  // caught changing shape would be measured where it started, not where it ends.
  if (!document.getElementById('__duoStill')) {
    var st = document.createElement('style'); st.id = '__duoStill';
    st.textContent = '.app, .app *, .editpage, .editpage * { transition: none !important; }';
    document.head.appendChild(st);
  }
  ['compact', 'dense', 'fitpages', 'scaled'].forEach(function (c) { b.classList.toggle(c, !!kind); });
  b.classList.toggle('portrait', kind === 'end');
  if (!kind) { fitStage(); return; }
  var w = kind === 'end' ? 720 : 1024, h = kind === 'end' ? 1024 : 720;
  app.style.width = w + 'px'; app.style.height = h + 'px';
  app.style.transform = 'scale(0.869)'; app.style.transformOrigin = 'center center';
  r.setProperty('--fit', '0.869'); r.setProperty('--fit-w', w + 'px'); r.setProperty('--fit-h', h + 'px');
}
function duoOnEnd(on) { duoShape(on ? 'end' : null); }

function duoPress(b, moveBy, holdMs) {
  var r = b.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  function pe(type, dy) {
    b.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerType: 'touch',
      isPrimary: true, button: 0, clientX: x, clientY: y + (dy || 0) }));
  }
  pe('pointerdown');
  if (moveBy) pe('pointermove', moveBy);
  return new Promise(function (res) { setTimeout(res, holdMs || 40); }).then(function () {
    pe('pointerup', moveBy);
    // a hold redraws the chips: the click lands on whatever is under the finger now
    var at = document.elementFromPoint(x, y + (moveBy || 0)) || b;
    var chip = at.closest ? (at.closest('.ep-tag') || at) : at;
    chip.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y }));
  });
}

function duoChip(i) { return document.querySelectorAll('#epTools .ep-tag')[i]; }

function duoOpen() {
  duoOnEnd(true);
  openEditPage();
  epSetTag('');
  renderEpList();
}

function duoClose() { epSetTag(''); closeEditPage(); duoOnEnd(false); }

test('on end every tag chip is shown, none cut through', function (T) {
  duoOpen();
  var bar = T.el('#epTools'), tags = bar.querySelector('.ep-tags');
  T.ok(!!tags && tags.children.length > 6, 'chips to show: ' + (tags && tags.children.length));
  T.atMost(tags.scrollHeight - tags.clientHeight, 0, 'the chips are not a box of their own that hides a row');
  T.atMost(bar.scrollHeight - bar.clientHeight, 0, 'nor does the panel hide what is under them');
  var last = tags.lastElementChild;
  T.atMost(last.offsetTop + last.offsetHeight, tags.offsetTop + tags.clientHeight,
    'the last chip ends inside the panel');
  duoClose();
});

test('the chips leave touchstart to the scroll', function (T) {
  duoOpen();
  var b = duoChip(0);
  T.eq(b.ontouchstart, null, 'no touchstart that takes the finger');
  T.eq(b.ontouchend, null, 'and no touchend that chooses on lift');
  duoClose();
});

test('a finger that moves over a chip scrolls, and chooses nothing', function (T) {
  duoOpen();
  return duoPress(duoChip(0), -30).then(function () {
    T.eq(epTag, '', 'no tag chosen');
    duoClose();
  });
});

test('a tap on a chip still chooses it, and a second tap lets it go', function (T) {
  duoOpen();
  var k = duoChip(0).dataset.k;
  return duoPress(duoChip(0)).then(function () {
    T.eq(epTag, k, 'chosen');
    return duoPress(duoChip(0));
  }).then(function () {
    T.eq(epTag, '', 'let go');
    duoClose();
  });
});

test('a hold on a chip moves it to or from the main screen, and chooses nothing', function (T) {
  duoOpen();
  var k = duoChip(1).dataset.k, was = mainTagOn(k);
  return duoPress(duoChip(1), 0, 700).then(function () {
    T.eq(mainTagOn(k), !was, 'the hold toggled where the tag is offered');
    T.eq(epTag, '', 'and the click left behind by the redrawn chip chose nothing');
    return duoPress(duoChip(1), 0, 700);
  }).then(function () {
    T.eq(mainTagOn(k), was, 'put back');
    duoClose();
  });
});

test('cover curves are drawn a list height ahead of the scroll', function (T) {
  duoOpen();
  T.ok(!!epCurveObserver, 'an observer');
  T.ok(/100%/.test(epCurveObserver.rootMargin), 'its margin: ' + epCurveObserver.rootMargin);
  duoClose();
});

// iOS WebKit gave a swipe over the list to the closed modals above it, which
// were only transparent and pointer-events:none. Chrome does not, so what is
// asserted is the cause: nothing closed is left visible over the open page.
// Upstream hides them itself since v1.229 (duo.3 had its own rule for it);
// this keeps a merge from bringing the swipe-stealing layers back.
test('closed modals and pages are hidden, not only transparent', function (T) {
  duoOpen();
  var ov = T.all('.overlay:not(.show)'), pg = T.all('.editpage:not(.show)');
  T.ok(ov.length > 10, 'modals to check: ' + ov.length);
  T.eq(ov.filter(function (o) { return T.css(o, 'visibility') !== 'hidden'; }).length, 0, 'closed modals left visible');
  T.eq(pg.filter(function (o) { return T.css(o, 'visibility') !== 'hidden'; }).length, 0, 'closed pages left visible');
  T.eq(T.css(T.el('#editPage'), 'visibility'), 'visible', 'the open page');
  duoClose();
});

// The reshaped stage gives the dials less width than the tablet does, which is
// what shrank them; the reading over each has to shrink with it, to the share
// of the dial it has on the tablet (two fifths), where before it took half and
// covered the 3 and the 9.
test('a gauge reading keeps the tablet share of its dial, on end and on its side', function (T) {
  var st = { p: state.pressure, f: state.flow };
  ['end', 'side'].forEach(function (kind) {
  duoShape(kind);
  state.pressure = 8.6; state.flow = 2.3; applyGauges('pressure', 'flow');
  T.all('.gauges .gauge.dial').forEach(function (g) {
    var v = g.querySelector('.gauge-val'), body = g.querySelector('.gs-body');
    var r = document.createRange(); r.selectNodeContents(v); r.setEnd(v.firstChild, v.firstChild.length);
    var share = r.getBoundingClientRect().width / body.getBoundingClientRect().width;
    T.atMost(Math.round(share * 100), 42, kind + ': the number, as a share of the dial (%)');
  });
  });
  state.pressure = st.p; state.flow = st.f; applyGauges('pressure', 'flow');
  duoShape(null);
});

// Beside the curve the step table had 340px of the 480 it needs and ran off
// the screen; on end the editor is one column and the table has the width. It
// shows five steps and a half and scrolls for the rest, so the step being
// edited stays on the screen with the rows.
test('on end the profile editor shows the whole step table and the name', function (T) {
  duoOnEnd(true);
  openEditPage();
  var p = allProfiles.filter(function (x) { return ((x.profile || {}).steps || []).length >= 6; })[0] || allProfiles[0];
  epOpenEditor(p);
  var ed = T.el('#epEditor'), wrap = T.el('#epEditor .ep-grid-wrap'), grid = T.el('#epStepGrid');
  var meta = T.el('#epEditor .ep-meta'), name = T.el('#epEditor .ep-name-input');
  T.ok(grid.querySelectorAll('tr.gr').length >= 6, 'a profile with steps to show');
  T.atMost(wrap.scrollWidth - wrap.clientWidth, 1, 'the table does not run past its box');
  T.atMost(grid.getBoundingClientRect().right - ed.getBoundingClientRect().right, 1, 'nor past the editor');
  T.ok(wrap.clientHeight > 150, 'and is given height: ' + wrap.clientHeight);
  T.atMost(wrap.clientHeight, 240, 'but not so much that the step editor is pushed away');
  var se = T.el('#epEditor .ep-step-editor');
  T.atMost(se.offsetTop - (wrap.offsetTop + wrap.offsetHeight), 16, 'which starts right under the rows');
  T.ok(name.offsetWidth > meta.offsetWidth * 0.8, 'the name takes the row: ' + name.offsetWidth + ' of ' + meta.offsetWidth);
  closeEditPage();
  duoOnEnd(false);
});

// A tap that just misses the star lands on the cover and loads the profile,
// so on the reshaped stage the buttons reach further than they are drawn.
test('the pencil and star on a cover answer a near miss on the Duo only', function (T) {
  function probe() {
    openEditPage(); epSetView('list'); renderEpList();
    var card = T.el('#epList .ep-card:not(.bg-card)'), fav = card.querySelector('.cfoot .fav-btn');
    var ed = card.querySelector('.cfoot .ep-editbtn'), r = fav.getBoundingClientRect(), e = ed.getBoundingClientRect();
    function at(x, y) { var h = document.elementFromPoint(x, y); return fav.contains(h) ? 'fav' : ed.contains(h) ? 'edit' : 'card'; }
    var out = { above: at(r.left + r.width / 2, r.top - 3), right: at(r.right + 3, r.top + r.height / 2),
      gapL: at(e.right + 1, e.top + e.height / 2), gapR: at(r.left - 1, r.top + r.height / 2), far: at(r.left + r.width / 2, r.top - 16) };
    closeEditPage(); return out;
  }
  duoOnEnd(true);
  var duo = probe();
  duoOnEnd(false);
  var tab = probe();
  T.eq(duo.above, 'fav', 'on the Duo a tap just above the star is the star');
  T.eq(duo.right, 'fav', 'and just right of it');
  T.eq(duo.gapL + '/' + duo.gapR, 'edit/fav', 'the gap between pencil and star is split');
  T.eq(duo.far, 'card', 'a tap well above is still the cover');
  T.eq(tab.above, 'card', 'the tablet keeps its exact buttons');
});

test('a list scrolled to its end keeps the rest of the swipe', function (T) {
  duoOpen();
  T.eq(T.css(T.el('#epList'), 'overscrollBehaviorY'), 'contain', 'the covers');
  T.eq(T.css(T.el('#epTools .ep-tags'), 'overscrollBehaviorY'), 'contain', 'the chips');
  duoClose();
});
