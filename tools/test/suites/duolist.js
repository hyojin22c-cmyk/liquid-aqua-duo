// The profile list on the unfolded Duo, under a finger. The page is put into
// the shape fitStage() gives it on end (800 wide, scaled down) so the panel
// over the covers is measured where it was squeezed, and the tag chips are
// pressed the way a finger presses them: down, moved or held, up, click.
function duoOnEnd(on) {
  var b = document.body, r = document.documentElement.style;
  ['portrait', 'compact', 'fitpages', 'scaled'].forEach(function (c) { b.classList.toggle(c, on); });
  if (on) { r.setProperty('--fit', '0.7825'); r.setProperty('--fit-w', '800px'); r.setProperty('--fit-h', '1137px'); }
  else fitStage();
}

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
test('closed modals and pages are hidden, not only transparent', function (T) {
  duoOpen();
  var ov = T.all('.overlay:not(.show)'), pg = T.all('.editpage:not(.show)');
  T.ok(ov.length > 10, 'modals to check: ' + ov.length);
  T.eq(ov.filter(function (o) { return T.css(o, 'visibility') !== 'hidden'; }).length, 0, 'closed modals left visible');
  T.eq(pg.filter(function (o) { return T.css(o, 'visibility') !== 'hidden'; }).length, 0, 'closed pages left visible');
  T.eq(T.css(T.el('#editPage'), 'visibility'), 'visible', 'the open page');
  duoClose();
});

test('a list scrolled to its end keeps the rest of the swipe', function (T) {
  duoOpen();
  T.eq(T.css(T.el('#epList'), 'overscrollBehaviorY'), 'contain', 'the covers');
  T.eq(T.css(T.el('#epTools .ep-tags'), 'overscrollBehaviorY'), 'contain', 'the chips');
  duoClose();
});
