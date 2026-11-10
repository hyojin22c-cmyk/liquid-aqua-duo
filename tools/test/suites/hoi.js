// New profiles for a bean (hoi-profiles plugin). The feature is written against
// upstream functions it does not own, so this suite is what says an upstream
// merge left it standing: every name it calls is still there, the button is
// still in the bean's Profiles pane, the Claude request still has its shape,
// and nothing is registered until the person asks.
var HOI_UPSTREAM_FNS = ['aiProvider', 'aiKey', 'tAi', 't', 'claudeModel', 'beanFormDigest',
  'bgShownBatch', 'toIsoDate', 'loadProfiles', 'loadBeansGrinders', 'loadWorkflow',
  'openSettingsPage', 'spSelect', 'escapeHtml', 'escapeAttr', 'toast', 'api',
  'renderBgEditor', 'setBgTab', 'batchesOf'];

function hoiResult(drinks) {
  return {
    recipe: { name: '테스트', bean: { roaster: 'R1', name: 'Same', species: 'Arabica', processing: 'Washed', notes: '' },
      batch: { roastDate: '2026-11-01T00:00:00.000', roastLevel: 'Medium', notes: '' },
      drinks: (drinks || ['espresso', 'americano']).map(function (k) {
        return { drink: k, family: 'aflow', params: { fill_temp: 93, pour_temp: 92, infuse_pressure: 3, infuse_weight: 5,
          infuse_max_s: 30, pour_pressure: 9, pour_flow: 2.5, ramp_s: 10, ramp_down: false, flow_up: true },
          dose: 18, yield: 36, grinder: 'EK43s', basket: 'VST 18g', serve: '', grinder_setting_start: '',
          hot_water: { temp: 0, volume: 0 }, notes: 'n-' + k };
      }) },
    summary_md: '## 요약\n- **굵게** 한 줄', missing: ['로스팅일: 추정'] };
}

function withHoi(run) {
  var was = { beans: beans, list: beanBatchList, latest: beanBatches, sel: bgSel, bid: bgBatchId, nb: bgNewBatch,
    tab: bgTab, api: api, state: hoiState, lang: _lang, prov: prefs.aiProvider,
    loadProfiles: loadProfiles, loadBeansGrinders: loadBeansGrinders, loadWorkflow: loadWorkflow,
    openSettingsPage: openSettingsPage, spSelect: spSelect, toast: toast, fetch: window.fetch };
  beans = [{ id: 'bn-a', roaster: 'R1', name: 'Same' }, { id: 'bn-b', roaster: 'R2', name: 'Other' }];
  beanBatchList = { 'bn-a': [{ id: 'bt-a', beanId: 'bn-a', roastDate: '2026-11-01' }], 'bn-b': [] };
  beanBatches = { 'bn-a': beanBatchList['bn-a'][0] };
  var sent = [], toasts = [];
  api = function (m, p, b) { sent.push({ m: m, p: p, b: b }); return Promise.resolve({ ok: true, log: ['ok'] }); };
  loadProfiles = function () { return Promise.resolve(); };
  loadBeansGrinders = function () { return Promise.resolve(); };
  loadWorkflow = function () { return Promise.resolve(); };
  openSettingsPage = function () {}; spSelect = function () {};
  toast = function (msg) { toasts.push(msg); };
  function back() {
    beans = was.beans; beanBatchList = was.list; beanBatches = was.latest; bgSel = was.sel; bgBatchId = was.bid;
    bgNewBatch = was.nb; bgTab = was.tab; api = was.api; hoiState = was.state; _lang = was.lang;
    prefs.aiProvider = was.prov; loadProfiles = was.loadProfiles; loadBeansGrinders = was.loadBeansGrinders;
    loadWorkflow = was.loadWorkflow; openSettingsPage = was.openSettingsPage; spSelect = was.spSelect;
    toast = was.toast; window.fetch = was.fetch;
  }
  return Promise.resolve().then(function () { return run({ sent: sent, toasts: toasts }); })
    .then(function (v) { back(); return v; }, function (e) { back(); throw e; });
}
function hoiOpen(id) {
  bgTab = 'bean';
  bgSel = { type: 'bean', obj: JSON.parse(JSON.stringify(beans.filter(function (b) { return b.id === id; })[0])) };
  _recFor = id; bgBatchId = null; bgNewBatch = false;
  renderBgEditor(); setBgTab('profiles');
}
// Opening a bean reads its usage and batches; what matters here is the plugin.
function hoiCalls(gw) { return gw.sent.filter(function (c) { return c.p.indexOf(HOI_PLUGIN) === 0; }); }
function hoiSettle() { return new Promise(function (r) { setTimeout(r, 30); }); }

test('every upstream name the feature is built on is still there', function (T) {
  HOI_UPSTREAM_FNS.forEach(function (n) { T.eq(typeof window[n], 'function', n + ' is a function'); });
  T.ok(typeof CLAUDE_API === 'string' && /\/v1\/messages$/.test(CLAUDE_API), 'CLAUDE_API is the Messages endpoint');
  T.ok(Array.isArray(aiImages), 'aiImages is the scan photo list');
  T.ok(typeof claudeModel().id === 'string', 'claudeModel() names a model');
  ['mbNeedRoasterName', 'aiRefused', 'aiNeedKey'].forEach(function (k) {
    T.ok(t(k) !== k, 'upstream string ' + k + ' still exists'); });
  T.ok(t('aiRefused').indexOf('{m}') >= 0, 'aiRefused still takes the model name');
});

test("a bean's Profiles pane offers to build new profiles", function (T) {
  return withHoi(function () {
    hoiOpen('bn-a');
    var btn = T.el('#bgPaneProfiles #hoiGenBtn');
    T.ok(btn, 'the button is in the Profiles pane');
    T.eq(btn && btn.textContent, hoiT('hoiButton'), 'it says what it does');
    T.ok(T.el('#bgPaneProfiles #hoiMemo'), 'with a note to send along');
    T.ok(T.el('#bgPaneProfiles .rec-bar'), 'under the catalogue picks, which are still there');
  });
});

test('its words are its own, and a language without them reads English', function (T) {
  return withHoi(function () {
    _lang = 'ko'; T.eq(hoiT('hoiRegister'), 'Decaid에 등록', 'Korean');
    _lang = 'fr'; T.eq(hoiT('hoiRegister'), 'Add to Decaid', 'French falls back to English');
    T.ok(I18N.en.hoiRegister == null, 'nothing of it is on the upstream I18N lines');
  });
});

test('a designed lineup is shown for its own bean and no other', function (T) {
  return withHoi(function () {
    hoiOpen('bn-a');
    hoiState = { forBean: 'bn-a', busy: false, startedAt: 0, res: hoiResult(), err: null, dry: { ok: true },
      apply: '', registering: false, done: null, memo: '', usage: null };
    renderHoiBox();
    T.eq(T.all('#hoiBox .hoi-drink').length, 2, 'one card a drink');
    T.ok(T.el('#hoiBox .hoi-miss'), 'what was guessed is said');
    T.eq(T.all('#hoiBox .hoi-acts select option').length, 3, "don't load, and each drink");
    hoiOpen('bn-b');
    T.eq(T.el('#hoiBox').innerHTML, '', 'another bean shows none of it');
  });
});

test('the Claude request carries the prompt, the schema and the photos', function (T) {
  return withHoi(function () {
    var seen = null;
    window.fetch = function (url, init) {
      seen = { url: url, init: init };
      return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve({ stop_reason: 'end_turn',
        usage: { input_tokens: 1, output_tokens: 2 },
        content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: JSON.stringify(hoiResult(['espresso'])) }] }); } });
    };
    var content = [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'AAAA' } }, { type: 'text', text: 'bean' }];
    return hoiClaude('k-test', { system: 'SYS', schema: { type: 'object' } }, content).then(function (out) {
      var body = JSON.parse(seen.init.body), h = seen.init.headers;
      T.eq(seen.url, CLAUDE_API, 'to the Messages API');
      T.eq(body.model, claudeModel().id, 'with the model chosen in Settings');
      T.eq(body.system[0].text, 'SYS', "the plugin's prompt as the system prompt");
      T.eq(body.system[0].cache_control && body.system[0].cache_control.type, 'ephemeral', 'cached');
      T.eq(body.output_config.format.type, 'json_schema', 'answered to the schema');
      T.eq(body.messages[0].content[0].type, 'image', 'the photos go first');
      T.eq(h['x-api-key'], 'k-test', 'with the key from Settings');
      T.eq(h['anthropic-dangerous-direct-browser-access'], 'true', 'from the page');
      T.eq(out.recipe.drinks.length, 1, 'the recipe is read from the text block');
      T.eq(out._usage.output_tokens, 2, 'with what it cost');
    });
  });
});

test('a declined request says so instead of failing to parse', function (T) {
  return withHoi(function () {
    window.fetch = function () {
      return Promise.resolve({ ok: true, status: 200, json: function () {
        return Promise.resolve({ stop_reason: 'refusal', stop_details: { category: 'cyber' }, content: [] }); } });
    };
    return hoiClaude('k', { system: 'S', schema: {} }, []).then(function () { T.fail('it resolved'); },
      function (e) { T.ok(e.message.indexOf(claudeModel().name) >= 0, 'names the model that declined'); });
  });
});

test('adding registers for the bean and batch being edited, and only on the tap', function (T) {
  return withHoi(function (gw) {
    hoiOpen('bn-a');
    hoiState = { forBean: 'bn-a', busy: false, startedAt: 0, res: hoiResult(), err: null, dry: { ok: true },
      apply: 'americano', registering: false, done: null, memo: '', usage: null };
    renderHoiBox();
    T.eq(hoiCalls(gw).length, 0, 'showing the lineup sends nothing to the plugin');
    hoiRegister();
    return hoiSettle().then(function () {
      var post = hoiCalls(gw).filter(function (c) { return c.m === 'POST' && c.p === HOI_PLUGIN + '/build'; });
      T.eq(post.length, 1, 'one build');
      var b = (post[0] || {}).b || {};
      T.eq(b.beanId, 'bn-a', 'for the bean on screen');
      T.eq(b.batchId, 'bt-a', 'and its batch');
      T.eq(b.apply, 'americano', 'loading the drink picked');
      T.ok(!b.dryRun, 'for real this time');
      T.eq(b.summary_md, hoiResult().summary_md, 'the summary is kept with it');
      T.ok(hoiState.done, 'and the box says it was added');
    });
  });
});

test('without Claude chosen it asks for Claude and sends nothing', function (T) {
  return withHoi(function (gw) {
    var calls = 0;
    window.fetch = function () { calls++; return Promise.reject(new Error('no')); };
    prefs.aiProvider = 'gemini';
    hoiOpen('bn-a');
    hoiGenerate();
    return hoiSettle().then(function () {
      T.eq(calls, 0, 'no request');
      T.eq(hoiCalls(gw).length, 0, 'nothing to the plugin');
      T.ok(gw.toasts.indexOf(hoiT('hoiNeedClaude')) >= 0, 'says Claude is needed');
      T.ok(!hoiState.busy, 'and is not left waiting');
    });
  });
});

test('the summary is shown as text, not as markup', function (T) {
  var h = hoiMd('<img src=x onerror=alert(1)>\n## 제목\n- **굵게**');
  T.ok(h.indexOf('<img') < 0 && h.indexOf('&lt;img') >= 0, 'tags are escaped');
  T.ok(h.indexOf('<b>굵게</b>') >= 0, 'bold still reads as bold');
  T.ok(h.indexOf('class="h"') >= 0, 'headings are headings');
});
