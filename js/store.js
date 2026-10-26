/*
 * 데이터 저장소 + 도메인 규칙
 *  - 저장: 브라우저 IndexedDB (DB 'sungmin-ppp', 컬렉션별 object store) — 기관 PC 로컬 실행용
 *  - 화면 코드는 동기 API(all/get/upsert…)를 쓰고, 메모리 캐시의 변경분을 IndexedDB 트랜잭션으로 순서대로 기록합니다.
 *  - 기기·브라우저별 분리, 자동 동기화·암호화·다중 사용자 권한 관리 없음 (SECURITY.md §2)
 */
(function (PPP) {
  'use strict';

  var IDB_NAME = 'sungmin-ppp';
  var IDB_VERSION = 1;
  var LEGACY_KEY = 'sungmin-ppp-db';            // 이전 버전(localStorage) 데이터 이관용
  var SCHEMA_VERSION = 2;
  var COLLECTIONS = ['participants', 'documents', 'meetings', 'activities'];

  /* ---------- 평생과정설계 단계별 프로세스 ---------- */
  var PHASES = [
    { id: 'prep', label: '준비', steps: [
      { id: 'academy', label: '아카데미 수료', desc: '당사자/보호자/지원자' },
      { id: 'prepCounsel', label: '준비상담', desc: '영역별 정보 제공, 준비 과정 등' },
      { id: 'familyProgram', label: '가족 지원 프로그램', desc: '장애수용, 교육, 심리활동, 자조모임 등', optional: true }
    ] },
    { id: 'plan', label: '계획', sub: '지원회의', steps: [
      { id: 'counsel', label: '상담', desc: '회의 설계, 자기소개서 작성 안내' },
      { id: 'preMeeting', label: '사전회의', desc: '꿈과 히스토리 공유' },
      { id: 'integratedMeeting', label: '통합회의', desc: '힘과 필요 찾기' },
      { id: 'conference', label: '컨퍼런스회의', desc: '중장기목표 협의' },
      { id: 'confirmMeeting', label: '확정회의', desc: '중장기목표 및 영역 우선순위 확정' },
      { id: 'shortPlan', label: '단기계획 수립', desc: '단기목표(2년) 및 해당연도 실천계획 수립' }
    ] },
    { id: 'practice', label: '실천', steps: [
      { id: 'detailPlan', label: '세부계획 확인', desc: '월별, 연간 활동 계획 협의' },
      { id: 'practiceActivity', label: '실천활동 진행', desc: '계획 기반 지역중심 활동 이행, 시민옹호인·활동지원사 등 협력' },
      { id: 'activityEval', label: '활동평가', desc: '월/분기/반기 등 약속된 기간 내 실천과정 평가 및 세부계획 조정' }
    ] },
    { id: 'eval', label: '평가', sub: '모니터링', steps: [
      { id: 'yearEval', label: '실천과정 평가', desc: '목표평가·지원평가, 연초 해당연도 실천계획에 반영 (연1회)' }
    ] },
    { id: 'selfhelp', label: '자조활동 연계', steps: [
      { id: 'selfHelp', label: '미래설계 자조활동 연계', desc: '지원 3년(지원회의 1년, 실천 2년) 후 연계' }
    ] }
  ];
  var STEPS = [];
  PHASES.forEach(function (ph) { ph.steps.forEach(function (s) { STEPS.push(Object.assign({ phase: ph.id, phaseLabel: ph.label }, s)); }); });

  var MEETING_TYPES = ['준비상담', '상담', '사전회의', '통합회의', '컨퍼런스회의', '확정회의', '세부계획 협의', '활동평가 회의', '실천과정 평가', '기타'];
  var MEETING_STEP = { '준비상담': 'prepCounsel', '상담': 'counsel', '사전회의': 'preMeeting', '통합회의': 'integratedMeeting', '컨퍼런스회의': 'conference', '확정회의': 'confirmMeeting', '세부계획 협의': 'detailPlan', '활동평가 회의': 'activityEval', '실천과정 평가': 'yearEval' };
  var MEETING_STATUSES = ['예정', '완료', '취소'];
  var MEETING_ROLES = ['당사자', '보호자', '지원자(가족 외)', '담당 사회복지사', '시민옹호인', '활동지원사', '관련 기관', '기타'];
  var ACTIVITY_KINDS = ['활동기록', '월 평가', '분기 평가', '반기 평가'];
  var STATUSES = ['참여중', '보류', '종결'];
  var GROUPS = ['', '준비그룹', '핵심그룹'];
  var DISABILITY_TYPES = ['지적장애', '자폐성장애', '지체장애', '뇌병변장애', '시각장애', '청각장애', '언어장애', '정신장애', '기타'];

  /* ---------- 유틸 ---------- */
  function uid(prefix) {
    var r = (window.crypto && crypto.getRandomValues) ? Array.prototype.map.call(crypto.getRandomValues(new Uint8Array(6)), function (b) { return b.toString(16).padStart(2, '0'); }).join('') : Math.random().toString(16).slice(2, 14);
    return (prefix || 'id') + '_' + Date.now().toString(36) + r;
  }
  function now() { return new Date().toISOString(); }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function today() { return iso(new Date()); }
  function addDays(dateStr, n) { var d = new Date(dateStr + 'T00:00:00'); d.setDate(d.getDate() + n); return iso(d); }
  function emptyDb() {
    return { app: 'sungmin-ppp', schemaVersion: SCHEMA_VERSION, participants: [], documents: [], meetings: [], activities: [], settings: { fontScale: 1 }, meta: { createdAt: now(), updatedAt: now(), sample: false } };
  }

  var db = null;
  var listeners = [];
  var snapshotExists = false;
  var available = true;

  /* ---------- IndexedDB 계층 ---------- */
  var idb = null;
  var queue = Promise.resolve();
  var channel = ('BroadcastChannel' in window) ? new BroadcastChannel('sungmin-ppp') : null;

  function openIdb() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) return reject(new Error('이 브라우저는 IndexedDB를 지원하지 않습니다.'));
      var req = indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = function () {
        var d = req.result;
        COLLECTIONS.forEach(function (c) {
          if (!d.objectStoreNames.contains(c)) {
            var os = d.createObjectStore(c, { keyPath: 'id' });
            if (c !== 'participants') os.createIndex('participantId', 'participantId', { unique: false });
          }
        });
        if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv', { keyPath: 'key' });
      };
      req.onsuccess = function () {
        var d = req.result;
        d.onversionchange = function () { d.close(); PPP.ui && PPP.ui.toast('다른 창에서 앱이 업데이트되었습니다. 새로고침하세요.', 'error'); };
        resolve(d);
      };
      req.onerror = function () { reject(req.error || new Error('IndexedDB를 열 수 없습니다.')); };
      req.onblocked = function () { reject(new Error('다른 창이 저장소를 사용 중입니다. 다른 창을 닫고 새로고침하세요.')); };
    });
  }
  function readAll() {
    return new Promise(function (resolve, reject) {
      var tx = idb.transaction(COLLECTIONS.concat(['kv']), 'readonly');
      var out = {};
      COLLECTIONS.forEach(function (c) { var r = tx.objectStore(c).getAll(); r.onsuccess = function () { out[c] = r.result; }; });
      var kv = tx.objectStore('kv').getAll();
      kv.onsuccess = function () { out.kv = {}; kv.result.forEach(function (x) { out.kv[x.key] = x.value; }); };
      tx.oncomplete = function () { resolve(out); };
      tx.onerror = function () { reject(tx.error); };
    });
  }
  /* ops: [{ col, put: rec } | { col, del: id } | { col, clear: true } | { kv: key, value } | { kv: key, del: true }] */
  function write(ops) {
    if (!idb || !ops.length) return Promise.resolve();
    db.meta.updatedAt = now();
    ops = ops.concat([{ kv: 'meta', value: db.meta }]);
    var job = function () {
      return new Promise(function (resolve, reject) {
        var stores = {};
        ops.forEach(function (o) { stores[o.kv ? 'kv' : o.col] = 1; });
        var tx = idb.transaction(Object.keys(stores), 'readwrite');
        ops.forEach(function (o) {
          if (o.kv) { if (o.del) tx.objectStore('kv').delete(o.kv); else tx.objectStore('kv').put({ key: o.kv, value: clone(o.value) }); }
          else if (o.clear) tx.objectStore(o.col).clear();
          else if (o.del) tx.objectStore(o.col).delete(o.del);
          else tx.objectStore(o.col).put(clone(o.put));
        });
        tx.oncomplete = function () { if (channel) channel.postMessage('changed'); resolve(); };
        tx.onabort = tx.onerror = function () { reject(tx.error || new Error('저장 실패')); };
      });
    };
    queue = queue.then(job).catch(function (e) {
      console.error(e);
      var quota = e && (e.name === 'QuotaExceededError' || /quota/i.test(e.message || ''));
      PPP.ui && PPP.ui.toast(quota ? '저장 공간이 부족합니다. 사진을 줄이거나 백업 후 정리하세요.' : '저장하지 못했습니다: ' + (e && e.message), 'error');
    });
    return queue;
  }
  function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
  function fullReplaceOps(data) {
    var ops = COLLECTIONS.map(function (c) { return { col: c, clear: true }; });
    COLLECTIONS.forEach(function (c) { data[c].forEach(function (r) { ops.push({ col: c, put: r }); }); });
    ops.push({ kv: 'settings', value: data.settings }, { kv: 'schemaVersion', value: data.schemaVersion });
    return ops;
  }

  /* 앱 시작: IndexedDB → (없으면) localStorage 이전 데이터 이관 → null(첫 실행) */
  function load() {
    return openIdb().then(function (d) {
      idb = d;
      return readAll();
    }).then(function (out) {
      snapshotExists = !!out.kv.snapshot;
      if (out.kv.meta) {
        db = migrate({ app: 'sungmin-ppp', schemaVersion: out.kv.schemaVersion || 1, participants: out.participants, documents: out.documents, meetings: out.meetings, activities: out.activities, settings: out.kv.settings, meta: out.kv.meta });
        if ((out.kv.schemaVersion || 1) < SCHEMA_VERSION) return write(fullReplaceOps(db)).then(function () { return db; });
        return db;
      }
      var legacy = null;
      try { legacy = localStorage.getItem(LEGACY_KEY); } catch (e) { /* 접근 차단 */ }
      if (legacy) {
        db = migrate(JSON.parse(legacy));
        return write(fullReplaceOps(db)).then(function () {
          try { localStorage.removeItem(LEGACY_KEY); } catch (e) { /* ignore */ }
          PPP.ui && PPP.ui.toast('이전 버전 데이터를 IndexedDB로 옮겼습니다.');
          return db;
        });
      }
      return null;
    }).catch(function (e) {
      console.error(e);
      available = false;
      idb = null;
      throw e;
    });
  }
  function reload() {
    if (!idb) return Promise.resolve(db);
    return readAll().then(function (out) {
      if (!out.kv.meta) return db;
      db = migrate({ app: 'sungmin-ppp', schemaVersion: out.kv.schemaVersion || SCHEMA_VERSION, participants: out.participants, documents: out.documents, meetings: out.meetings, activities: out.activities, settings: out.kv.settings, meta: out.kv.meta });
      snapshotExists = !!out.kv.snapshot;
      return db;
    });
  }
  function notify() { listeners.forEach(function (fn) { fn(); }); }

  function migrate(data) {
    if (!data || data.app !== 'sungmin-ppp') throw new Error('형식이 다른 데이터입니다.');
    if (data.schemaVersion > SCHEMA_VERSION) throw new Error('더 최신 버전에서 만든 데이터입니다. 앱을 업데이트하세요.');
    COLLECTIONS.forEach(function (c) { if (!Array.isArray(data[c])) data[c] = []; });
    // v1 → v2: 지원회의 일정·참석 역할·안건 필드 추가
    if ((data.schemaVersion || 1) < 2) {
      data.meetings.forEach(function (m) {
        if (!m.status) m.status = '완료';
        if (!Array.isArray(m.attendeeRoles)) m.attendeeRoles = [];
        if (m.agenda == null) m.agenda = '';
      });
    }
    data.settings = Object.assign({ fontScale: 1 }, data.settings || {});
    data.meta = Object.assign({ createdAt: now(), updatedAt: now(), sample: false }, data.meta || {});
    data.schemaVersion = SCHEMA_VERSION;
    return data;
  }

  /* ---------- CRUD (메모리 즉시 반영 + IndexedDB 비동기 기록) ---------- */
  function all(col, includeDeleted) {
    return db[col].filter(function (r) { return includeDeleted || !r.deletedAt; });
  }
  function get(col, id) { return db[col].find(function (r) { return r.id === id; }) || null; }
  function upsert(col, rec) {
    var t = now(), saved;
    var i = rec.id ? db[col].findIndex(function (r) { return r.id === rec.id; }) : -1;
    if (i >= 0) { saved = db[col][i] = Object.assign({}, db[col][i], rec, { updatedAt: t }); }
    else { saved = Object.assign({ id: uid(col.slice(0, 2)), createdAt: t, updatedAt: t, deletedAt: null }, rec); db[col].push(saved); }
    write([{ col: col, put: saved }]); notify();
    return saved;
  }
  function softDelete(col, id) {
    var r = get(col, id); if (!r) return;
    r.deletedAt = now();
    var ops = [{ col: col, put: r }];
    if (col === 'participants') {
      ['documents', 'meetings', 'activities'].forEach(function (c) {
        db[c].forEach(function (x) { if (x.participantId === id && !x.deletedAt) { x.deletedAt = r.deletedAt; x.deletedWithParent = true; ops.push({ col: c, put: x }); } });
      });
    }
    write(ops); notify();
  }
  function restore(col, id) {
    var r = get(col, id); if (!r) return;
    var stamp = r.deletedAt;
    r.deletedAt = null;
    var ops = [{ col: col, put: r }];
    if (col === 'participants') {
      ['documents', 'meetings', 'activities'].forEach(function (c) {
        db[c].forEach(function (x) { if (x.participantId === id && x.deletedWithParent && x.deletedAt === stamp) { x.deletedAt = null; delete x.deletedWithParent; ops.push({ col: c, put: x }); } });
      });
    } else if (r.participantId) {
      var p = get('participants', r.participantId);
      if (p && p.deletedAt) { p.deletedAt = null; ops.push({ col: 'participants', put: p }); }
    }
    write(ops); notify();
  }
  function purge(col, id) {
    var ops = [{ col: col, del: id }];
    db[col] = db[col].filter(function (r) { return r.id !== id; });
    if (col === 'participants') {
      ['documents', 'meetings', 'activities'].forEach(function (c) {
        db[c].filter(function (x) { return x.participantId === id; }).forEach(function (x) { ops.push({ col: c, del: x.id }); });
        db[c] = db[c].filter(function (x) { return x.participantId !== id; });
      });
    }
    write(ops); notify();
  }

  /* ---------- 참여자 도메인 ---------- */
  function byParticipant(col, pid) {
    return all(col).filter(function (r) { return r.participantId === pid; });
  }
  function findDoc(pid, formId, year) {
    return all('documents').find(function (d) { return d.participantId === pid && d.formId === formId && (year == null || d.year === year); }) || null;
  }
  function stepState(p, stepId) { return (p.steps && p.steps[stepId]) || { done: false }; }
  function progress(p) {
    var counted = STEPS.filter(function (s) { return !s.optional; });
    var done = counted.filter(function (s) { return stepState(p, s.id).done; }).length;
    return { done: done, total: counted.length, pct: Math.round(done / counted.length * 100) };
  }
  function currentStep(p) {
    return STEPS.find(function (s) { return !s.optional && !stepState(p, s.id).done; }) || null;
  }
  function currentPhase(p) {
    if (p.status === '종결') return { id: 'closed', label: '종결' };
    var s = currentStep(p);
    if (!s) return { id: 'selfhelp', label: '자조활동 연계' };
    var ph = PHASES.find(function (x) { return x.id === s.phase; });
    return { id: ph.id, label: ph.label };
  }
  function supportYear(p, ref) {
    if (!p.startDate) return null;
    var s = new Date(p.startDate), r = ref ? new Date(ref) : new Date();
    var months = (r.getFullYear() - s.getFullYear()) * 12 + (r.getMonth() - s.getMonth()) - (r.getDate() < s.getDate() ? 1 : 0);
    if (months < 0) return 0;
    return Math.floor(months / 12) + 1;
  }
  function age(birthDate) {
    if (!birthDate) return null;
    var b = new Date(birthDate), n = new Date();
    var a = n.getFullYear() - b.getFullYear();
    if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
    return a;
  }
  function setStep(pid, stepId, patch) {
    var p = get('participants', pid); if (!p) return;
    p.steps = p.steps || {};
    p.steps[stepId] = Object.assign({}, p.steps[stepId] || {}, patch);
    p.updatedAt = now();
    write([{ col: 'participants', put: p }]); notify();
  }
  function nextCode(year) {
    var y = year || new Date().getFullYear();
    var prefix = 'PPP-' + y + '-';
    var max = 0;
    db.participants.forEach(function (p) { if (p.code && p.code.indexOf(prefix) === 0) { max = Math.max(max, parseInt(p.code.slice(prefix.length), 10) || 0); } });
    return prefix + String(max + 1).padStart(3, '0');
  }

  /* 지원회의 일정 */
  function scheduled(pid) {
    return all('meetings').filter(function (m) { return m.status === '예정' && (!pid || m.participantId === pid); })
      .sort(function (a, b) { return (a.date + (a.time || '')) < (b.date + (b.time || '')) ? -1 : 1; });
  }

  /* 확인 필요 항목 (대시보드 알림) */
  function alerts(p) {
    var list = [];
    if (p.status !== '참여중') return list;
    var ph = currentPhase(p).id;
    var y = new Date().getFullYear();
    var t = today();
    scheduled(p.id).forEach(function (m) {
      if (m.date < t) list.push({ level: 'warn', text: m.type + ' 일정(' + m.date.replace(/-/g, '.') + ') 지남 — 결과 미기록', link: '#/meetings/' + m.id });
    });
    var nextStep = currentStep(p);
    if (ph === 'plan' && nextStep && nextStep.id !== 'shortPlan' && !scheduled(p.id).some(function (m) { return MEETING_STEP[m.type] === nextStep.id; })) {
      list.push({ level: 'info', text: '다음 지원회의(' + nextStep.label + ') 일정 미정', link: '#/meetings/new?pid=' + p.id + '&type=' + encodeURIComponent(nextStep.label) });
    }
    var intro = findDoc(p.id, 'intro');
    if ((ph === 'plan' || ph === 'practice') && (!intro || intro.status !== '완료')) list.push({ level: 'warn', text: '자기소개서 ' + (intro ? '작성 중' : '미작성'), link: '#/p/' + p.id + '/doc/intro' });
    if (ph === 'practice' && !findDoc(p.id, 'plan', y)) list.push({ level: 'warn', text: y + '년 실천계획서 없음', link: '#/p/' + p.id + '/doc/plan/' + y });
    if (ph === 'practice' || ph === 'eval') {
      var evals = byParticipant('activities', p.id).filter(function (a) { return a.kind !== '활동기록'; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
      var last = evals[0] && evals[0].date;
      var days = last ? Math.floor((Date.now() - new Date(last).getTime()) / 86400000) : null;
      if (days === null) list.push({ level: 'info', text: '활동평가 기록 없음', link: '#/p/' + p.id + '?tab=activities' });
      else if (days > 90) list.push({ level: 'warn', text: '마지막 활동평가 후 ' + days + '일 경과', link: '#/p/' + p.id + '?tab=activities' });
    }
    var sy = supportYear(p);
    if (sy && sy > 3 && !stepState(p, 'selfHelp').done) list.push({ level: 'info', text: '지원 3년 경과 — 자조활동 연계 검토', link: '#/p/' + p.id + '?tab=steps' });
    return list;
  }

  /* ---------- 백업 · 복원 ---------- */
  function exportBackup() {
    var payload = clone(db);
    payload.exportedAt = now();
    payload.counts = {};
    COLLECTIONS.forEach(function (c) { payload.counts[c] = db[c].length; });
    return JSON.stringify(payload, null, 2);
  }
  function validateBackup(text) {
    var data;
    try { data = JSON.parse(text); } catch (e) { throw new Error('JSON 형식이 아닙니다. 이 앱에서 내보낸 백업 파일인지 확인하세요.'); }
    var counts = data && data.counts;
    data = migrate(data);
    var problems = [];
    if (counts) {
      COLLECTIONS.forEach(function (c) { if (counts[c] !== data[c].length) problems.push(c + ' 건수 불일치 (기록 ' + counts[c] + ' / 실제 ' + data[c].length + ')'); });
    }
    var ids = {};
    data.participants.forEach(function (p) {
      if (!p.id || !p.name) problems.push('이름 또는 ID가 없는 참여자가 있습니다.');
      ids[p.id] = true;
    });
    ['documents', 'meetings', 'activities'].forEach(function (c) {
      data[c].forEach(function (r) { if (!r.id) problems.push(c + ' 기록 중 ID가 없는 항목'); else if (!ids[r.participantId]) problems.push(c + ' 기록 중 참여자가 없는 항목(' + r.id + ')'); });
    });
    if (problems.length) throw new Error('백업 파일 검증 실패:\n- ' + problems.slice(0, 8).join('\n- '));
    return data;
  }
  function importBackup(data) {
    delete data.exportedAt; delete data.counts;
    var prev = db;
    db = data;
    snapshotExists = true;
    var p = write([{ kv: 'snapshot', value: prev }].concat(fullReplaceOps(db)));
    notify();
    return p;
  }
  function hasSnapshot() { return snapshotExists; }
  function undoRestore() {
    if (!idb || !snapshotExists) return Promise.resolve(false);
    return new Promise(function (resolve, reject) {
      var r = idb.transaction('kv', 'readonly').objectStore('kv').get('snapshot');
      r.onsuccess = function () { resolve(r.result && r.result.value); };
      r.onerror = function () { reject(r.error); };
    }).then(function (snap) {
      if (!snap) return false;
      db = migrate(snap);
      snapshotExists = false;
      return write([{ kv: 'snapshot', del: true }].concat(fullReplaceOps(db))).then(function () { notify(); return true; });
    });
  }
  function reset(data) { db = data || emptyDb(); var p = write(fullReplaceOps(db)); notify(); return p; }
  function setSetting(k, v) { db.settings[k] = v; write([{ kv: 'settings', value: db.settings }]); }
  function flush() { return queue; }

  /* 저장 공간 정보 (브라우저 추정치) */
  function storageInfo() {
    var est = navigator.storage && navigator.storage.estimate ? navigator.storage.estimate() : Promise.resolve({});
    var per = navigator.storage && navigator.storage.persisted ? navigator.storage.persisted() : Promise.resolve(false);
    return Promise.all([est, per]).then(function (r) { return { usage: r[0].usage, quota: r[0].quota, persisted: r[1] }; }).catch(function () { return {}; });
  }
  function requestPersist() {
    return navigator.storage && navigator.storage.persist ? navigator.storage.persist().catch(function () { return false; }) : Promise.resolve(false);
  }

  PPP.store = {
    load: load, reload: reload, reset: reset, emptyDb: emptyDb, flush: flush,
    get db() { return db; },
    get available() { return available; },
    all: all, get: get, upsert: upsert, softDelete: softDelete, restore: restore, purge: purge,
    byParticipant: byParticipant, findDoc: findDoc, stepState: stepState, setStep: setStep,
    progress: progress, currentStep: currentStep, currentPhase: currentPhase, supportYear: supportYear, age: age,
    nextCode: nextCode, alerts: alerts, scheduled: scheduled,
    exportBackup: exportBackup, validateBackup: validateBackup, importBackup: importBackup, hasSnapshot: hasSnapshot, undoRestore: undoRestore,
    setSetting: setSetting, storageInfo: storageInfo, requestPersist: requestPersist,
    useMemory: function (data) { db = data; available = false; },
    onChange: function (fn) { listeners.push(fn); },
    onExternalChange: function (fn) { if (channel) channel.onmessage = function () { fn(); }; },
    uid: uid, now: now, today: today, addDays: addDays
  };
  PPP.PHASES = PHASES;
  PPP.STEPS = STEPS;
  PPP.MEETING_TYPES = MEETING_TYPES;
  PPP.MEETING_STEP = MEETING_STEP;
  PPP.MEETING_STATUSES = MEETING_STATUSES;
  PPP.MEETING_ROLES = MEETING_ROLES;
  PPP.ACTIVITY_KINDS = ACTIVITY_KINDS;
  PPP.STATUSES = STATUSES;
  PPP.GROUPS = GROUPS;
  PPP.DISABILITY_TYPES = DISABILITY_TYPES;
  PPP.SCHEMA_VERSION = SCHEMA_VERSION;
})(window.PPP = window.PPP || {});
