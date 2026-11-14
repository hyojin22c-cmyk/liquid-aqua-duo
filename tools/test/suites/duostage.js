// The stage on the unfolded Duo: its size, what that size squeezed, what a
// finger is asked to hit on it, and the places that mixed the screen's pixels
// with the stage's.
//
// The Duo's shape is 720 on its short side at 87% (.dense): 720x1024 on end,
// 1024x720 on its side. The test window is the tablet's, so the shape is put on
// by hand and fitStage() takes it off again.
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
function duoWait(ms) { return new Promise(function (r) { setTimeout(r, ms || 60); }); }
// how far an element answers, in the screen's pixels, against how it is drawn
function duoReach(e) {
  var r = e.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  function span(dx, dy) {
    var n = 0;
    for (var i = 1; i < 60; i++) { var h = document.elementFromPoint(cx + dx * i, cy + dy * i); if (h === e || (h && e.contains(h))) n = i; else break; }
    return n;
  }
  return { w: span(-1, 0) + span(1, 0) + 1, h: span(0, -1) + span(0, 1) + 1, dw: Math.round(r.width), dh: Math.round(r.height) };
}
function duoOverlap(a, b) {
  var x = a.getBoundingClientRect(), y = b.getBoundingClientRect();
  return Math.min(Math.min(x.right, y.right) - Math.max(x.left, y.left), Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top));
}

test('the stage is 720 on its short side on the Duo, and the tablet keeps its own', function (T) {
  function sh(w, h) { var s = stageShape(w, h); return s.w + 'x' + s.h + (s.portrait ? ' end' : '') + (s.dense ? ' dense' : ''); }
  T.eq(sh(890, 626), '1024x720 dense', 'the Duo on its side');
  T.eq(sh(626, 890), '720x1024 end dense', 'the Duo on end');
  T.eq(sh(678, 466), '1048x720 dense', 'inside Decaid as an enlarged phone app, on its side');
  T.eq(sh(466, 678), '720x1048 end dense', 'and on end');
  T.eq(sh(1280, 800), '1280x800', 'the tablet');
  T.eq(sh(1024, 640), '1280x800', 'a smaller screen of the tablet\'s shape keeps the tablet\'s stage');
  T.eq(sh(1024, 768), '1100x825', 'an iPad on its side is as it was');
  T.eq(sh(768, 1024), '800x1067 end', 'and on end');
  T.near(Math.min(890 / 1024, 626 / 720), 0.869, 0.002, 'which is 87% on the Duo, where it was 78');
});

test('on its side a heavy cup does not run onto the dials', function (T) {
  duoShape('side');
  var w = T.el('#weightNum'), was = w.textContent;
  w.textContent = '345.2';
  var val = T.el('.weight-row .lt-val').getBoundingClientRect(), g = T.el('.live>.gauges').getBoundingClientRect();
  T.atMost(Math.round(val.right - g.left), 0, 'the weight ends before the dials begin');
  w.textContent = was;
  duoShape(null);
});

test('on end steam\'s controls each keep their own room', function (T) {
  duoShape('end');
  setRecipeMode('steam', true);
  var pane = T.el('#recipeSteam'), leaves = T.all('#recipeSteam button, #recipeSteam .dose-num').filter(function (e) { return e.getBoundingClientRect().width > 0; });
  T.ok(leaves.length >= 8, 'controls to check: ' + leaves.length);
  var worst = 0;
  for (var i = 0; i < leaves.length; i++) for (var j = i + 1; j < leaves.length; j++) {
    if (leaves[i].contains(leaves[j]) || leaves[j].contains(leaves[i])) continue;
    worst = Math.max(worst, duoOverlap(leaves[i], leaves[j]));
  }
  T.atMost(Math.round(worst), 1, 'no two of them over each other (px)');
  var card = T.el('.right .recipe');
  T.ok(card.offsetWidth >= 400, 'the recipe has the 400px it has at 800: ' + card.offsetWidth);
  setRecipeMode('espresso', true);
  duoShape(null);
});

test('the shot\'s line in the header is whole', function (T) {
  ['side', 'end'].forEach(function (kind) {
    duoShape(kind);
    var s = T.el('#shotSum'), was = s.textContent;
    s.textContent = '90.0° · 18.0 → 36.0g · 1:2.0';
    T.atMost(s.scrollWidth - s.clientWidth, 1, kind + ': not cut to an ellipsis');
    s.textContent = was;
  });
  duoShape(null);
});

test('profile covers stay three across, and the list\'s actions keep the title whole', function (T) {
  ['side', 'end'].forEach(function (kind) {
    duoShape(kind);
    openEditPage(); epSetView('list'); renderEpList();
    var cards = T.all('#epList .ep-card'), top = cards[0].getBoundingClientRect().top;
    var row = cards.filter(function (c) { return Math.abs(c.getBoundingClientRect().top - top) < 4; });
    T.eq(row.length, 3, kind + ': covers in the first row');
    T.atMost(T.el('#epTitle').offsetHeight, 36, kind + ': the title on one line');
    closeEditPage();
  });
  duoShape('end');
  openEditPage(); epSetView('list'); renderEpList();
  var acts = T.el('#epActs').getBoundingClientRect(), wide = T.el('#epWideBtn').getBoundingClientRect();
  T.ok(acts.top >= wide.bottom - 2, 'on end the library\'s actions sit under the page\'s');
  T.all('#editPage .ep-head button').forEach(function (b) {
    if (b.getBoundingClientRect().width) T.atMost(b.offsetHeight, 50, 'a button that broke its label in two: ' + b.textContent.trim());
  });
  closeEditPage();
  duoShape(null);
});

test('the shot log on its side is one page, and on end shows its shots two across', function (T) {
  duoShape('side');
  openShotLog();
  var d = T.el('#slDetail'), bar = T.el('#slDetail .ep-save-bar');
  T.eq(T.css(d, 'display'), 'block', 'the record and the notes are not two columns');
  if (bar) T.eq(T.css(bar, 'position'), 'fixed', 'the bar is held at the foot of the pane');
  closeShotLog();
  duoShape('end');
  openShotLog();
  T.eq(T.css(T.el('#slList'), 'gridTemplateColumns').split(' ').length, 2, 'two columns of shots');
  closeShotLog();
  duoShape(null);
});

test('on end settings and tags give their content the width', function (T) {
  duoShape('end');
  openSettingsPage();
  var nav = T.el('#spNav'), content = T.el('#settingsPage .sp-content');
  T.eq(T.css(nav, 'flexDirection'), 'row', 'the seven names go across');
  T.ok(nav.getBoundingClientRect().bottom <= content.getBoundingClientRect().top + 1, 'over the settings, not beside them');
  T.ok(content.offsetWidth > 600, 'which have the width: ' + content.offsetWidth);
  T.atMost(nav.scrollWidth - nav.clientWidth, 1, 'and all seven fit across');
  closeSettingsPage();
  openEditPage(); openTagPage();
  var tools = T.el('#tagTools'), body = T.el('#tagPage .ep-body');
  T.ok(tools.offsetWidth > body.clientWidth * 0.8, 'the tag panel is on top: ' + tools.offsetWidth + ' of ' + body.clientWidth);
  closeTagPage(); closeEditPage();
  duoShape(null);
});

test('small controls answer further than they are drawn', function (T) {
  duoShape('side');
  var ms = duoReach(T.el('.recipe .rg-cols .ms-btn'));
  T.ok(ms.w >= ms.dw + 6, '- and + beside the dose: ' + ms.dw + ' drawn, ' + ms.w + ' answering');
  var lg = duoReach(T.el('.legend-item.tog'));
  T.ok(lg.h >= lg.dh + 8, 'a legend switch: ' + lg.dh + ' tall, ' + lg.h + ' answering');
  setRecipeMode('steam', true);
  renderPresets('steam');
  var name = T.el('#steamPresets .pc-name'), pen = T.el('#steamPresets .pc-edit');
  if (name && pen) {
    var a = duoReach(name), b = duoReach(pen);
    T.ok(a.h >= 22 && a.w >= a.dw + 8, 'a preset\'s name: ' + a.dw + 'x' + a.dh + ' drawn, ' + a.w + 'x' + a.h + ' answering');
    T.ok(b.h >= 22 && b.w >= 22, 'its pencil: ' + b.dw + 'x' + b.dh + ' drawn, ' + b.w + 'x' + b.h + ' answering');
    T.atMost(Math.round(duoOverlap(name, pen)), 0, 'the two do not answer for each other');
  }
  setRecipeMode('espresso', true);
  openEditPage();
  epOpenEditor(allProfiles.filter(function (x) { return ((x.profile || {}).steps || []).length >= 6; })[0] || allProfiles[0]);
  var op = T.el('#epStepGrid td.ops button'), wrap = T.el('#epEditor .ep-grid-wrap');
  var o = duoReach(op);
  T.ok(o.dw >= 25 && o.w >= 28 && o.h >= 30, 'a step\'s buttons: ' + o.dw + ' drawn, ' + o.w + 'x' + o.h + ' answering');
  T.atMost(wrap.scrollWidth - wrap.clientWidth, 1, 'and the table still fits beside the step editor');
  closeEditPage();
  var pip = document.querySelector('.tc-pip') || (function () { var p = document.createElement('button'); p.className = 'tc-pip'; p.id = '__pip'; document.body.appendChild(p); return p; })();
  T.ok(parseFloat(T.css(pip, 'width')) >= 36 && parseFloat(T.css(pip, 'height')) >= 32, 'a taste pip is ' + T.css(pip, 'width') + ' by ' + T.css(pip, 'height'));
  if (pip.id === '__pip') pip.remove();
  duoShape(null);
});

// getBoundingClientRect() answers in the screen's pixels and a style is
// written in the stage's. On a scaled stage they differ, and three places
// wrote one as the other.
test('the ripple starts under the finger on a scaled stage', function (T) {
  duoShape('side');
  var fx = prefs.fx; prefs.fx = true;
  var host = T.el('#btnWorkflow'), r = host.getBoundingClientRect();
  T.near(duoScaleOf(host), 0.869, 0.01, 'the stage really is scaled here');
  var x = r.left + r.width * 0.85, y = r.top + r.height * 0.8;
  rippleIn(host, x, y);
  var rip = host.querySelector('.rip'), k = r.width / host.offsetWidth;
  T.ok(!!rip, 'a ripple');
  if (rip) {
    T.near(parseFloat(rip.style.left) * k, x - r.left, 1.5, 'across, in the screen\'s pixels');
    T.near(parseFloat(rip.style.top) * k, y - r.top, 1.5, 'and down');
    rip.remove();
  }
  prefs.fx = fx;
  duoShape(null);
  var m = document.createElement('div'); m.style.cssText = 'position:fixed;left:0;top:0;width:100px;height:20px';
  document.body.appendChild(m);
  T.eq(duoScaleOf(m), 1, 'and off the stage, where nothing is scaled, nothing is corrected');
  m.remove();
});

test('the camera picture fills its pane on a scaled stage', function (T) {
  duoShape('side');
  var pane = T.el('#camPane'), img = T.el('#camImg'), wasHidden = pane.hidden, wasCam = prefs.cam, home = pane.parentElement;
  prefs.cam = true; pane.hidden = false; img.hidden = false;
  camPlace();
  var p = pane.getBoundingClientRect(), i = img.getBoundingClientRect();
  T.ok(p.width > 40, 'a pane to fill: ' + Math.round(p.width) + 'x' + Math.round(p.height));
  T.near(i.width, p.width, 1.5, 'the picture is as wide as its pane');
  T.near(i.height, p.height, 1.5, 'and as tall');
  prefs.cam = wasCam; pane.hidden = wasHidden; img.hidden = true;
  if (home && pane.parentElement !== home) home.appendChild(pane);
  camPlace();
  duoShape(null);
});

test('a step picked on the curve is brought all the way into the table', function (T) {
  ['side', 'end'].forEach(function (kind) {
    duoShape(kind);
    openEditPage();
    epOpenEditor(allProfiles.filter(function (x) { return ((x.profile || {}).steps || []).length >= 9; })[0] || allProfiles[0]);
    var wrap = T.el('#epEditor .ep-grid-wrap'), rows = T.all('#epStepGrid tr.gr'), last = rows.length - 1;
    T.ok(wrap.scrollHeight > wrap.clientHeight + 30, kind + ': a table that scrolls: ' + wrap.clientHeight + ' of ' + wrap.scrollHeight);
    wrap.scrollTop = 0;
    epScrollRowIntoView(last);
    var wb = wrap.getBoundingClientRect(), rb = rows[last].getBoundingClientRect();
    T.atMost(Math.round(rb.bottom - wb.bottom), 0, kind + ': the last row ends inside the box');
    closeEditPage();
  });
  duoShape(null);
});
