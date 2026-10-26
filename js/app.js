/* 화면 라우팅과 각 화면 */
(function (PPP) {
  'use strict';
  var S = PPP.store, ui = PPP.ui, esc = ui.esc;
  var main, titleEl;
  var editor = { dirty: false };

  /* ---------- 공통 ---------- */
  var FONT_STEPS = [0.9, 1, 1.15, 1.3];
  function applyFont(scale) {
    document.documentElement.style.fontSize = (scale * 100) + '%';
    document.querySelectorAll('[data-font]').forEach(function (b) { b.setAttribute('aria-pressed', String(Number(b.getAttribute('data-font')) === scale)); });
  }
  function setTitle(t) { titleEl.textContent = t; document.title = t + ' · 성민복지관 평생과정설계'; }
  function fmtDate(d) { return d ? d.replace(/-/g, '.') : '-'; }
  function phaseBadge(p) { var ph = S.currentPhase(p); return '<span class="badge ph-' + ph.id + '">' + esc(ph.label) + '</span>'; }
  function statusBadge(s) { return '<span class="badge st-' + (s === '참여중' ? 'on' : s === '보류' ? 'hold' : 'end') + '">' + esc(s) + '</span>'; }
  function progressBar(p) {
    var pr = S.progress(p);
    return '<span class="pbar" role="img" aria-label="진행률 ' + pr.pct + '퍼센트 (' + pr.done + '/' + pr.total + '단계)"><span class="pbar-fill" style="width:' + pr.pct + '%"></span></span><span class="pbar-num">' + pr.pct + '%</span>';
  }
  function stepDots(p) {
    return '<span class="dots" aria-hidden="true">' + PPP.PHASES.map(function (ph) {
      return '<span class="dot-grp">' + ph.steps.filter(function (s) { return !s.optional; }).map(function (s) {
        return '<span class="dot' + (S.stepState(p, s.id).done ? ' on' : '') + '" title="' + esc(ph.label + ' · ' + s.label) + '"></span>';
      }).join('') + '</span>';
    }).join('') + '</span>';
  }
  function lastRecordDate(pid) {
    var dates = S.byParticipant('meetings', pid).filter(function (m) { return m.status === '완료'; }).map(function (m) { return m.date; }).concat(S.byParticipant('activities', pid).map(function (a) { return a.date; }));
    return dates.sort().pop() || null;
  }
  function participants() { return S.all('participants'); }
  function empty(title, desc, action) {
    return '<div class="empty"><p class="empty-title">' + esc(title) + '</p><p>' + esc(desc) + '</p>' + (action || '') + '</div>';
  }
  function optionList(list, sel, blank) {
    return (blank != null ? '<option value="">' + esc(blank) + '</option>' : '') + list.map(function (o) { return '<option' + (o === sel ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('');
  }

  /* ---------- 대시보드 ---------- */
  function viewDashboard(q) {
    setTitle('대시보드');
    var year = Number(q.year) || new Date().getFullYear();
    var all = participants();
    var active = all.filter(function (p) { return p.status === '참여중'; });
    var acts = S.all('activities'), meets = S.all('meetings').filter(function (m) { return m.status === '완료'; });
    var sched = S.scheduled();
    var t0 = S.today(), t14 = S.addDays(t0, 14);
    var inYear = function (d) { return d && Number(d.slice(0, 4)) === year; };
    var actsY = acts.filter(function (a) { return inYear(a.date); });
    var meetsY = meets.filter(function (m) { return inYear(m.date); });
    var avg = active.length ? Math.round(active.reduce(function (s, p) { return s + S.progress(p).pct; }, 0) / active.length) : 0;
    var alertRows = [];
    active.forEach(function (p) { S.alerts(p).forEach(function (a) { alertRows.push({ p: p, a: a }); }); });

    // 통계
    var phaseOrder = ['준비', '계획', '실천', '평가', '자조활동 연계', '종결'];
    var phaseCount = phaseOrder.map(function (l) { return { label: l, value: all.filter(function (p) { return S.currentPhase(p).label === l; }).length }; });
    var count = function (list, fn) { var m = {}; list.forEach(function (x) { var k = fn(x) || '미입력'; m[k] = (m[k] || 0) + 1; }); return Object.keys(m).map(function (k) { return { label: k, value: m[k] }; }).sort(function (a, b) { return b.value - a.value; }); };
    var dis = count(all, function (p) { return p.disabilityType; });
    var gender = ['남', '여'].map(function (g) { return { label: g, value: all.filter(function (p) { return p.gender === g; }).length }; });
    var yearsC = ['1년차', '2년차', '3년차', '4년차 이상'].map(function (l, i) { return { label: l, value: active.filter(function (p) { var y = S.supportYear(p) || 1; return i < 3 ? y === i + 1 : y >= 4; }).length }; });
    var ageBands = ['20대 이하', '30대', '40대', '50대 이상'].map(function (l, i) {
      return { label: l, value: all.filter(function (p) { var a = S.age(p.birthDate); if (a == null) return false; return i === 0 ? a < 30 : i === 3 ? a >= 50 : a >= (i + 2) * 10 && a < (i + 3) * 10; }).length };
    });
    var planAreas = PPP.AREAS.map(function (ar) {
      var n = 0;
      S.all('documents').forEach(function (d) { if (d.formId === 'plan' && d.year === year && Array.isArray(d.data.plans)) d.data.plans.forEach(function (r) { if (r && r.area === ar) n++; }); });
      return { label: ar, value: n };
    }).sort(function (a, b) { return b.value - a.value; });
    var scoreAreas = PPP.AREAS.map(function (ar) {
      var s = actsY.filter(function (a) { return a.area === ar && a.score; }).map(function (a) { return Number(a.score); });
      return { label: ar, value: s.length ? Math.round(s.reduce(function (x, y) { return x + y; }, 0) / s.length * 10) / 10 : 0 };
    }).filter(function (d) { return d.value > 0; });
    var months = []; for (var m = 1; m <= 12; m++) { var mm = String(m).padStart(2, '0'); months.push({ label: m + '월', value: actsY.filter(function (a) { return a.date.slice(5, 7) === mm; }).length + meetsY.filter(function (x) { return x.date.slice(5, 7) === mm; }).length }); }

    var years = {}; acts.concat(meets).forEach(function (r) { if (r.date) years[r.date.slice(0, 4)] = 1; }); years[new Date().getFullYear()] = 1;
    var yearSel = '<label class="inline-label" for="dash-year">기준연도</label><select id="dash-year">' + Object.keys(years).sort().reverse().map(function (y) { return '<option' + (Number(y) === year ? ' selected' : '') + '>' + y + '</option>'; }).join('') + '</select>';

    var workers = Array.from(new Set(all.map(function (p) { return p.worker; }).filter(Boolean))).sort();
    var C = PPP.charts;
    var html = '';
    var lb = S.db.settings.lastBackupAt, lbDays = lb ? Math.floor((Date.now() - new Date(lb).getTime()) / 86400000) : null;
    if (!S.db.meta.sample && (lbDays == null || lbDays >= 7)) html += '<p class="warn-box" role="note">' + (lbDays == null ? '아직 백업한 적이 없습니다.' : '마지막 백업 후 ' + lbDays + '일이 지났습니다.') + ' 이 PC에만 저장되므로 <a href="#/settings">설정 · 백업</a>에서 백업 파일을 내려받아 주세요.</p>';
    html += '<div class="toolbar"><div class="toolbar-left">' + yearSel + '</div><div class="toolbar-right"><a class="btn btn-primary" href="#/participants/new">+ 참여자 등록</a></div></div>';
    html += '<section class="kpis" aria-label="핵심 지표">' +
      kpi('전체 참여자', all.length + '명', '참여중 ' + active.length + ' · 보류 ' + all.filter(function (p) { return p.status === '보류'; }).length + ' · 종결 ' + all.filter(function (p) { return p.status === '종결'; }).length) +
      kpi('평균 진행률', avg + '%', '참여중 ' + active.length + '명 기준 · 13단계') +
      kpi(year + '년 지원회의·상담', meetsY.length + '건', '예정 ' + sched.length + '건 · 2주 내 ' + sched.filter(function (m) { return m.date >= t0 && m.date <= t14; }).length + '건') +
      kpi(year + '년 실천 활동', actsY.length + '건', '활동평가 ' + actsY.filter(function (a) { return a.kind !== '활동기록'; }).length + '건 포함') +
      kpi('확인 필요', alertRows.length + '건', '자기소개서·실천계획·평가 주기', alertRows.length ? 'warn' : '') +
      '</section>';
    html += '<section class="panel" aria-labelledby="h-stats"><div class="panel-head"><h2 id="h-stats">참여자 현황 통계</h2><p class="panel-desc">원형 그래프 항목에 마우스를 올리면 수치가 표시되며, 각 그래프의 「표로 보기」로 표 형태를 확인할 수 있습니다.</p></div><div class="chart-grid">' +
      C.donut('평생과정설계 단계별 분포', phaseCount) +
      C.donut('장애유형', dis) +
      C.donut('성별', gender) +
      C.donut('지원 연차 (참여중)', yearsC) +
      '</div></section>';
    html += '<section class="panel" aria-labelledby="h-stats2"><div class="panel-head"><h2 id="h-stats2">' + year + '년 실천 영역 통계</h2></div><div class="chart-grid three">' +
      C.donut(year + '년 실천계획 영역 분포', planAreas, { unit: '건', totalLabel: '계획(건)' }) +
      C.bars('영역별 활동평가 평균 점수', scoreAreas, { unit: '점', max: 5, note: '활동평가(월·분기·반기) 점수 평균, 5점 만점 (척도 기관 확인 필요)' }) +
      C.bars('월별 회의·활동 기록', months, { unit: '건', keepZero: true }) +
      '</div><div class="chart-grid three">' + C.bars('연령대', ageBands, { unit: '명', keepZero: true }) + '</div></section>';

    // 지원회의 현황
    var gaps = [['상담', 'counsel', 'preMeeting', '상담→사전'], ['', 'preMeeting', 'integratedMeeting', '사전→통합'], ['', 'integratedMeeting', 'conference', '통합→컨퍼런스'], ['', 'conference', 'confirmMeeting', '컨퍼런스→확정'], ['', 'confirmMeeting', 'shortPlan', '확정→단기계획']].map(function (g) {
      var d = all.map(function (p) { var a = S.stepState(p, g[1]), b = S.stepState(p, g[2]); return a.done && b.done && a.date && b.date ? (new Date(b.date) - new Date(a.date)) / 86400000 : null; }).filter(function (x) { return x != null && x >= 0; });
      return { label: g[3], value: d.length ? Math.round(d.reduce(function (x, y) { return x + y; }, 0) / d.length) : 0 };
    });
    var totalDays = all.map(function (p) { var a = S.stepState(p, 'counsel'), b = S.stepState(p, 'confirmMeeting'); return a.done && b.done && a.date && b.date ? (new Date(b.date) - new Date(a.date)) / 86400000 : null; }).filter(function (x) { return x != null && x >= 0; });
    var typeCount = PPP.MEETING_TYPES.map(function (t) { return { label: t, value: meetsY.filter(function (m) { return m.type === t; }).length }; }).sort(function (a, b) { return b.value - a.value; });
    var upcoming = sched.filter(function (m) { return m.date <= t14 && S.get('participants', m.participantId) && !S.get('participants', m.participantId).deletedAt; }).slice(0, 8);
    html += '<section class="panel" aria-labelledby="h-meet"><div class="panel-head"><h2 id="h-meet">지원회의 현황</h2><a class="btn btn-ghost btn-sm" href="#/meetings">지원회의 전체 보기</a></div><div class="chart-grid three">' +
      '<figure class="chart"><figcaption class="chart-title">다가오는 지원회의 (2주 이내 · 지난 일정 포함)</figcaption>' + (upcoming.length ? '<ul class="meet-list">' + upcoming.map(function (m) {
        var p = S.get('participants', m.participantId), over = m.date < t0;
        return '<li class="' + (over ? 'over' : '') + '"><a href="#/meetings/' + m.id + '"><span class="m-date">' + fmtDate(m.date).slice(5) + (m.time ? ' ' + esc(m.time) : '') + '</span><span class="m-who">' + esc(p.name) + '</span><span class="badge">' + esc(m.type) + '</span>' + (over ? '<span class="badge warn">일정 지남</span>' : '') + '</a></li>';
      }).join('') + '</ul>' : '<p class="empty-mini">2주 이내 예정된 지원회의가 없습니다.</p>') + '</figure>' +
      C.bars('지원회의 단계 간 평균 소요일', gaps, { unit: '일', note: '상담→확정회의 평균 ' + (totalDays.length ? Math.round(totalDays.reduce(function (x, y) { return x + y; }, 0) / totalDays.length) + '일' : '-') + ' (완료 참여자 ' + totalDays.length + '명 기준)', color: 'var(--series-2)' }) +
      C.donut(year + '년 완료 회의 유형', typeCount, { unit: '건' }) +
      '</div></section>';

    // 진행상황 표
    html += '<section class="panel" aria-labelledby="h-prog"><div class="panel-head"><h2 id="h-prog">참여자별 진행상황</h2>' +
      '<div class="filters"><label class="inline-label" for="pf-worker">담당</label><select id="pf-worker"><option value="">전체</option>' + optionList(workers, q.worker) + '</select>' +
      '<label class="inline-label" for="pf-phase">단계</label><select id="pf-phase"><option value="">전체</option>' + optionList(phaseOrder, q.phase) + '</select></div></div>';
    var rows = all.filter(function (p) { return (!q.worker || p.worker === q.worker) && (!q.phase || S.currentPhase(p).label === q.phase); })
      .sort(function (a, b) { return S.progress(b).pct - S.progress(a).pct || a.name.localeCompare(b.name); });
    if (!rows.length) html += empty('조건에 맞는 참여자가 없습니다', '필터를 바꾸거나 참여자를 등록하세요.');
    else {
      html += '<div class="tbl-scroll"><table class="tbl progress-tbl"><caption class="sr-only">참여자별 평생과정설계 진행상황</caption><thead><tr><th scope="col">참여자</th><th scope="col">담당</th><th scope="col">지원연차</th><th scope="col">현재 단계</th><th scope="col">단계 진행 (준비·계획·실천·평가·연계)</th><th scope="col">진행률</th><th scope="col">다음 단계</th><th scope="col">최근 기록</th><th scope="col">확인</th></tr></thead><tbody>' +
        rows.map(function (p) {
          var next = S.currentStep(p), al = S.alerts(p);
          return '<tr><th scope="row"><a href="#/p/' + p.id + '">' + esc(p.name) + '</a><span class="sub">' + esc(p.code) + '</span></th><td>' + esc(p.worker || '-') + '</td><td>' + (S.supportYear(p) ? S.supportYear(p) + '년차' : '-') + '</td><td>' + phaseBadge(p) + (p.status !== '참여중' ? ' ' + statusBadge(p.status) : '') + '</td><td>' + stepDots(p) + '</td><td class="nowrap">' + progressBar(p) + '</td><td>' + (next ? esc(next.label) : '완료') + '</td><td class="nowrap">' + fmtDate(lastRecordDate(p.id)) + '</td><td>' + (al.length ? '<span class="badge warn" title="' + esc(al.map(function (a) { return a.text; }).join(', ')) + '">' + al.length + '건</span>' : '<span class="muted">-</span>') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    html += '</section>';

    // 확인 필요 + 최근 기록
    html += '<div class="two-col"><section class="panel" aria-labelledby="h-alert"><div class="panel-head"><h2 id="h-alert">확인 필요</h2></div>' +
      (alertRows.length ? '<ul class="alert-list">' + alertRows.slice(0, 12).map(function (r) { return '<li class="al-' + r.a.level + '"><span class="al-icon" aria-hidden="true">' + (r.a.level === 'warn' ? '!' : 'i') + '</span><span class="sr-only">' + (r.a.level === 'warn' ? '주의' : '안내') + '</span><a href="' + r.a.link + '">' + esc(r.p.name) + '</a> — ' + esc(r.a.text) + '</li>'; }).join('') + '</ul>' + (alertRows.length > 12 ? '<p class="muted">외 ' + (alertRows.length - 12) + '건</p>' : '') : empty('확인할 항목이 없습니다', '모든 참여중 참여자의 서류와 평가 주기가 정상입니다.')) + '</section>';
    var recent = meets.map(function (m) { return { date: m.date, pid: m.participantId, text: '회의 · ' + m.type }; })
      .concat(acts.map(function (a) { return { date: a.date, pid: a.participantId, text: (a.kind === '활동기록' ? '활동 · ' : '평가 · ') + a.area + ' ' + (a.title || '') }; }))
      .sort(function (a, b) { return a.date < b.date ? 1 : -1; }).slice(0, 10);
    html += '<section class="panel" aria-labelledby="h-recent"><div class="panel-head"><h2 id="h-recent">최근 기록</h2></div>' + (recent.length ? '<ul class="recent-list">' + recent.map(function (r) { var p = S.get('participants', r.pid); return '<li><span class="r-date">' + fmtDate(r.date) + '</span><a href="#/p/' + r.pid + '">' + esc(p ? p.name : '-') + '</a><span class="r-text">' + esc(r.text) + '</span></li>'; }).join('') + '</ul>' : empty('기록이 없습니다', '참여자 화면에서 회의·활동을 기록하세요.')) + '</section></div>';

    main.innerHTML = html;
    PPP.charts.bindTooltips(main);
    function go() {
      var p = new URLSearchParams();
      var y = main.querySelector('#dash-year').value; if (Number(y) !== new Date().getFullYear()) p.set('year', y);
      var w = main.querySelector('#pf-worker').value; if (w) p.set('worker', w);
      var ph = main.querySelector('#pf-phase').value; if (ph) p.set('phase', ph);
      location.hash = '#/dashboard' + (p.toString() ? '?' + p.toString() : '');
    }
    ['#dash-year', '#pf-worker', '#pf-phase'].forEach(function (s) { main.querySelector(s).addEventListener('change', go); });
  }
  function kpi(label, value, sub, tone) {
    return '<div class="kpi' + (tone ? ' ' + tone : '') + '"><p class="kpi-label">' + esc(label) + '</p><p class="kpi-value">' + esc(value) + '</p><p class="kpi-sub">' + esc(sub) + '</p></div>';
  }

  /* ---------- 참여자 목록 ---------- */
  function viewList(q) {
    setTitle('참여자 관리');
    var all = participants();
    var workers = Array.from(new Set(all.map(function (p) { return p.worker; }).filter(Boolean))).sort();
    var kw = (q.q || '').trim().toLowerCase();
    var rows = all.filter(function (p) {
      return (!kw || [p.name, p.code, p.worker, p.disabilityType].join(' ').toLowerCase().indexOf(kw) >= 0) &&
        (!q.status || p.status === q.status) && (!q.worker || p.worker === q.worker) && (!q.phase || S.currentPhase(p).label === q.phase);
    }).sort(function (a, b) { return (a.code || '').localeCompare(b.code || ''); });
    var html = '<form class="toolbar search-bar" role="search" id="list-form"><div class="toolbar-left">' +
      '<label class="sr-only" for="q">검색</label><input type="search" id="q" name="q" placeholder="이름, 관리번호, 담당자, 장애유형 검색" value="' + esc(q.q || '') + '">' +
      '<label class="sr-only" for="f-status">상태</label><select id="f-status" name="status"><option value="">상태 전체</option>' + optionList(PPP.STATUSES, q.status) + '</select>' +
      '<label class="sr-only" for="f-phase">단계</label><select id="f-phase" name="phase"><option value="">단계 전체</option>' + optionList(['준비', '계획', '실천', '평가', '자조활동 연계', '종결'], q.phase) + '</select>' +
      '<label class="sr-only" for="f-worker">담당</label><select id="f-worker" name="worker"><option value="">담당 전체</option>' + optionList(workers, q.worker) + '</select>' +
      '<button class="btn btn-ghost" type="submit">검색</button></div><div class="toolbar-right"><a class="btn btn-primary" href="#/participants/new">+ 참여자 등록</a></div></form>';
    html += '<p class="result-count" role="status">' + rows.length + '명 / 전체 ' + all.length + '명</p>';
    if (!all.length) html += empty('등록된 참여자가 없습니다', '「참여자 등록」으로 첫 참여자를 추가하세요.', '<a class="btn btn-primary" href="#/participants/new">참여자 등록</a>');
    else if (!rows.length) html += empty('검색 결과가 없습니다', '검색어 또는 필터를 바꿔보세요.');
    else {
      html += '<div class="tbl-scroll"><table class="tbl"><caption class="sr-only">참여자 목록</caption><thead><tr><th scope="col">관리번호</th><th scope="col">이름</th><th scope="col">성별/나이</th><th scope="col">장애유형</th><th scope="col">담당</th><th scope="col">시작일</th><th scope="col">상태</th><th scope="col">단계</th><th scope="col">진행률</th><th scope="col"><span class="sr-only">작업</span></th></tr></thead><tbody>' +
        rows.map(function (p) {
          var a = S.age(p.birthDate);
          return '<tr><td class="nowrap">' + esc(p.code) + '</td><th scope="row"><a href="#/p/' + p.id + '">' + esc(p.name) + '</a></th><td>' + esc(p.gender || '-') + ' / ' + (a != null ? a + '세' : '-') + '</td><td>' + esc(p.disabilityType || '-') + '</td><td>' + esc(p.worker || '-') + '</td><td class="nowrap">' + fmtDate(p.startDate) + '</td><td>' + statusBadge(p.status) + '</td><td>' + phaseBadge(p) + '</td><td class="nowrap">' + progressBar(p) + '</td><td class="nowrap"><a class="btn btn-ghost btn-sm" href="#/p/' + p.id + '/edit">수정</a></td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    main.innerHTML = html;
    main.querySelector('#list-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(e.target), p = new URLSearchParams();
      fd.forEach(function (v, k) { if (v) p.set(k, v); });
      location.hash = '#/participants' + (p.toString() ? '?' + p.toString() : '');
    });
    ['#f-status', '#f-phase', '#f-worker'].forEach(function (s) { main.querySelector(s).addEventListener('change', function () { main.querySelector('#list-form').requestSubmit(); }); });
  }

  /* ---------- 참여자 등록/수정 ---------- */
  function viewParticipantForm(id) {
    var p = id ? S.get('participants', id) : null;
    if (id && !p) return notFound();
    setTitle(p ? '참여자 정보 수정' : '참여자 등록');
    p = p || { code: S.nextCode(), status: '참여중', startDate: S.today(), parentGroup: '' };
    var f = function (label, name, control, req, help) {
      return '<div class="field"><label for="pf-' + name + '">' + esc(label) + (req ? ' <span class="req" aria-hidden="true">*</span><span class="sr-only">(필수)</span>' : '') + '</label>' + control + (help ? '<p class="help" id="pf-' + name + '-help">' + esc(help) + '</p>' : '') + '<p class="err" id="pf-' + name + '-err" hidden></p></div>';
    };
    var inp = function (name, type, val, extra) { return '<input id="pf-' + name + '" name="' + name + '" type="' + type + '" value="' + esc(val || '') + '" aria-describedby="pf-' + name + '-err pf-' + name + '-help" ' + (extra || '') + '>'; };
    var sel = function (name, list, val, blank) { return '<select id="pf-' + name + '" name="' + name + '" aria-describedby="pf-' + name + '-err">' + optionList(list, val, blank) + '</select>'; };
    var html = '<form id="p-form" class="card form-card" novalidate><p class="form-intro">기본 등록 정보만 입력합니다. 연락처·주소·건강 등 상세 정보는 <strong>자기소개서</strong> 서식에서 필요한 범위만 기록하세요. <span class="req">*</span> 필수</p><div class="form-grid">' +
      f('관리번호', 'code', inp('code', 'text', p.code, 'required maxlength="20"'), true, '자동 생성 (PPP-연도-번호). 중복 불가') +
      f('이름', 'name', inp('name', 'text', p.name, 'required maxlength="30" autocomplete="off"'), true) +
      f('성별', 'gender', sel('gender', ['남', '여'], p.gender, '선택')) +
      f('생년월일', 'birthDate', inp('birthDate', 'date', p.birthDate, 'max="' + S.today() + '"')) +
      f('장애유형', 'disabilityType', sel('disabilityType', PPP.DISABILITY_TYPES, p.disabilityType, '선택')) +
      f('담당 사회복지사', 'worker', inp('worker', 'text', p.worker, 'required maxlength="20"'), true) +
      f('지원 시작일', 'startDate', inp('startDate', 'date', p.startDate, 'required'), true, '지원 연차 계산 기준 (지원회의 1년 + 실천 2년)') +
      f('참여 상태', 'status', sel('status', PPP.STATUSES, p.status)) +
      f('보호자 자조활동 그룹', 'parentGroup', sel('parentGroup', ['준비그룹', '핵심그룹'], p.parentGroup, '해당 없음'), false, '보호자 미래설계 자조활동 (가족 역량에 따른 그룹)') +
      f('주 보호자 관계', 'guardianRelation', inp('guardianRelation', 'text', p.guardianRelation, 'maxlength="10" placeholder="예: 모, 부, 형제자매"'), false, '보호자 이름·연락처는 자기소개서에서 필요 시 기록') +
      '</div>' + f('메모', 'memo', '<textarea id="pf-memo" name="memo" rows="3" maxlength="500">' + esc(p.memo || '') + '</textarea>', false, '민감정보(진단명 등)는 적지 마세요. 최대 500자') +
      '<div class="form-actions"><a class="btn btn-ghost" href="' + (p.id ? '#/p/' + p.id : '#/participants') + '">취소</a><button type="submit" class="btn btn-primary">' + (p.id ? '수정 저장' : '등록') + '</button></div></form>';
    main.innerHTML = html;
    var form = main.querySelector('#p-form');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = {}; new FormData(form).forEach(function (val, k) { v[k] = String(val).trim(); });
      var errs = {};
      if (!v.name) errs.name = '이름을 입력하세요.';
      if (!v.worker) errs.worker = '담당 사회복지사를 입력하세요.';
      if (!v.code) errs.code = '관리번호를 입력하세요.';
      else if (S.all('participants', true).some(function (x) { return x.code === v.code && x.id !== p.id; })) errs.code = '이미 사용 중인 관리번호입니다. (휴지통 포함)';
      if (!v.startDate) errs.startDate = '지원 시작일을 입력하세요.';
      if (v.birthDate && v.birthDate > S.today()) errs.birthDate = '생년월일은 오늘 이후일 수 없습니다.';
      if (v.birthDate && v.startDate && v.startDate < v.birthDate) errs.startDate = '지원 시작일이 생년월일보다 빠릅니다.';
      form.querySelectorAll('.err').forEach(function (el) { el.hidden = true; el.textContent = ''; });
      form.querySelectorAll('[aria-invalid]').forEach(function (el) { el.removeAttribute('aria-invalid'); });
      var keys = Object.keys(errs);
      if (keys.length) {
        keys.forEach(function (k) { var el = form.querySelector('#pf-' + k + '-err'); el.textContent = errs[k]; el.hidden = false; form.querySelector('#pf-' + k).setAttribute('aria-invalid', 'true'); });
        form.querySelector('#pf-' + keys[0]).focus();
        ui.toast('입력값을 확인하세요: ' + keys.length + '개 항목', 'error');
        return;
      }
      var saved = S.upsert('participants', Object.assign({}, p, v, { steps: p.steps || {} }));
      ui.toast(p.id ? '참여자 정보를 수정했습니다.' : '참여자를 등록했습니다.');
      location.hash = '#/p/' + saved.id;
    });
    form.querySelector('#pf-name').focus();
  }

  /* ---------- 참여자 상세 ---------- */
  var TABS = [['overview', '개요'], ['steps', '진행단계'], ['docs', '서류'], ['meetings', '지원회의'], ['activities', '활동·평가']];
  function viewDetail(id, q) {
    var p = S.get('participants', id);
    if (!p || p.deletedAt) return notFound();
    setTitle(p.name + ' — 참여자 기록');
    var tab = TABS.some(function (t) { return t[0] === q.tab; }) ? q.tab : 'overview';
    var pr = S.progress(p), a = S.age(p.birthDate), sy = S.supportYear(p);
    var html = '<div class="p-head card"><div class="p-id"><p class="p-code">' + esc(p.code) + '</p><h2 class="p-name">' + esc(p.name) + '</h2><p class="p-meta">' +
      [p.gender, a != null ? a + '세' : '', p.disabilityType, '담당 ' + (p.worker || '-'), sy ? '지원 ' + sy + '년차' : ''].filter(Boolean).map(esc).join(' · ') + '</p>' +
      '<p>' + statusBadge(p.status) + ' ' + phaseBadge(p) + (p.parentGroup ? ' <span class="badge">보호자 ' + esc(p.parentGroup) + '</span>' : '') + '</p></div>' +
      '<div class="p-prog"><p class="kpi-label">진행률</p><p class="kpi-value">' + pr.pct + '%</p><p class="kpi-sub">' + pr.done + ' / ' + pr.total + '단계 완료</p>' + stepDots(p) + '</div>' +
      '<div class="p-actions"><a class="btn btn-ghost btn-sm" href="#/p/' + p.id + '/edit">기본정보 수정</a><button type="button" class="btn btn-ghost btn-sm danger-text" id="del-p">삭제</button></div></div>';
    html += '<div class="tabs" role="tablist" aria-label="참여자 기록">' + TABS.map(function (t) {
      return '<button type="button" role="tab" id="tab-' + t[0] + '" aria-controls="panel" aria-selected="' + (t[0] === tab) + '" tabindex="' + (t[0] === tab ? 0 : -1) + '" data-tab="' + t[0] + '">' + t[1] + '</button>';
    }).join('') + '</div><div id="panel" role="tabpanel" aria-labelledby="tab-' + tab + '" class="tab-panel"></div>';
    main.innerHTML = html;
    var panel = main.querySelector('#panel');
    ({ overview: tabOverview, steps: tabSteps, docs: tabDocs, meetings: tabMeetings, activities: tabActivities })[tab](p, panel);
    var tabs = main.querySelectorAll('[role=tab]');
    tabs.forEach(function (b, i) {
      b.addEventListener('click', function () { location.hash = '#/p/' + p.id + (b.dataset.tab === 'overview' ? '' : '?tab=' + b.dataset.tab); });
      b.addEventListener('keydown', function (e) {
        var n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
        if (n == null) return;
        e.preventDefault(); n = (n + tabs.length) % tabs.length; tabs[n].focus(); tabs[n].click();
      });
    });
    if (q.tab) setTimeout(function () { var t = main.querySelector('#tab-' + tab); t && t.focus(); }, 0);
    main.querySelector('#del-p').addEventListener('click', function () {
      ui.confirm('참여자 삭제', p.name + ' 님과 모든 서류·회의·활동 기록을 휴지통으로 옮깁니다.\n휴지통에서 복원할 수 있습니다.', { danger: true, okText: '휴지통으로 이동' }).then(function (ok) {
        if (!ok) return;
        S.softDelete('participants', p.id);
        ui.toast('휴지통으로 옮겼습니다.');
        location.hash = '#/participants';
      });
    });
  }

  function tabOverview(p, el) {
    var y = new Date().getFullYear();
    var plan = S.findDoc(p.id, 'plan', y) || S.all('documents').filter(function (d) { return d.participantId === p.id && d.formId === 'plan'; }).sort(function (a, b) { return b.year - a.year; })[0];
    var review = S.all('documents').filter(function (d) { return d.participantId === p.id && d.formId === 'review'; }).sort(function (a, b) { return b.year - a.year; })[0];
    var intro = S.findDoc(p.id, 'intro');
    var al = S.alerts(p);
    var html = '<div class="two-col">';
    html += '<section class="card"><h3>꿈과 목표</h3><dl class="dl">' +
      '<dt>나의 꿈</dt><dd>' + esc((plan && plan.data.dream) || (intro && intro.data.dream) || '미기록') + '</dd>' +
      '<dt>중장기목표</dt><dd>' + esc((plan && plan.data.longGoal) || '미기록') + '</dd>' +
      '<dt>"나"를 한마디로</dt><dd>' + esc((intro && intro.data.oneWord) || '미기록') + '</dd>' +
      '<dt>다음 지원회의</dt><dd>' + (function () { var n = S.scheduled(p.id)[0]; return n ? '<a href="#/meetings/' + n.id + '">' + fmtDate(n.date) + (n.time ? ' ' + esc(n.time) : '') + ' · ' + esc(n.type) + '</a>' : '<span class="muted">예정 없음</span>'; })() + '</dd></dl></section>';
    html += '<section class="card"><h3>확인 필요</h3>' + (al.length ? '<ul class="alert-list">' + al.map(function (a) { return '<li class="al-' + a.level + '"><span class="al-icon" aria-hidden="true">' + (a.level === 'warn' ? '!' : 'i') + '</span><a href="' + a.link + '">' + esc(a.text) + '</a></li>'; }).join('') + '</ul>' : '<p class="muted">확인할 항목이 없습니다.</p>') +
      (p.memo ? '<h3>메모</h3><p class="pre">' + esc(p.memo) + '</p>' : '') + '</section></div>';
    html += '<section class="card"><h3>' + (plan ? plan.year + '년 ' : '') + '실천계획 (영역별 단기목표)</h3>';
    var rows = plan && Array.isArray(plan.data.plans) ? plan.data.plans.filter(function (r) { return r && (r.area || r.goal); }) : [];
    html += rows.length ? '<div class="tbl-scroll"><table class="tbl"><thead><tr><th scope="col">영역</th><th scope="col">단기목표</th><th scope="col">실천계획</th><th scope="col">활동 기록</th></tr></thead><tbody>' + rows.map(function (r) {
      var n = S.byParticipant('activities', p.id).filter(function (a) { return a.area === r.area && a.date.slice(0, 4) === String(plan.year); }).length;
      return '<tr><td><span class="badge">' + esc(r.area || '-') + '</span></td><td>' + esc(r.goal || '') + '</td><td>' + esc(r.action || '') + '</td><td class="num">' + n + '건</td></tr>';
    }).join('') + '</tbody></table></div>' : empty('실천계획서가 없습니다', '단기계획 수립 후 「서류」 탭에서 실천계획서를 작성하세요.', '<a class="btn btn-ghost btn-sm" href="#/p/' + p.id + '/doc/plan/' + y + '">' + y + '년 실천계획서 작성</a>');
    html += '</section>';
    if (review && Array.isArray(review.data.priorities)) {
      html += '<section class="card"><h3>' + (review.year + 1) + '년 행복한 삶 실천하기 (우선순위)</h3><ol class="prio">' + review.data.priorities.filter(function (r) { return r && (r.area || r.content); }).map(function (r) { return '<li><strong>' + esc(r.area || '') + '</strong> ' + esc(r.content || '') + (r.help ? ' <span class="muted">— 필요한 도움: ' + esc(r.help) + '</span>' : '') + '</li>'; }).join('') + '</ol></section>';
    }
    el.innerHTML = html;
  }

  function tabSteps(p, el) {
    var sy = S.supportYear(p);
    var html = '<p class="note-box">평생과정설계 단계별 프로세스: <strong>준비 → 계획(지원회의) → 실천 → 평가(모니터링)</strong>. 미래설계 지원 3년(지원회의 1년, 실천 2년) 후 미래설계 자조활동으로 연계합니다.' + (sy ? ' 현재 <strong>지원 ' + sy + '년차</strong>입니다.' : '') + ' 회의 기록을 저장하면 해당 단계가 자동으로 완료 처리됩니다.</p>';
    html += '<div class="phases">' + PPP.PHASES.map(function (ph) {
      return '<section class="phase card ph-border-' + ph.id + '"><h3>' + esc(ph.label) + (ph.sub ? ' <span class="muted">(' + esc(ph.sub) + ')</span>' : '') + '</h3><ol class="steps">' + ph.steps.map(function (s) {
        var st = S.stepState(p, s.id);
        var mc = S.byParticipant('meetings', p.id).filter(function (m) { return PPP.MEETING_STEP[m.type] === s.id; }).length;
        return '<li class="step' + (st.done ? ' done' : '') + '"><div class="step-main"><label class="opt step-check"><input type="checkbox" data-step="' + s.id + '"' + (st.done ? ' checked' : '') + '> <strong>' + esc(s.label) + '</strong>' + (s.optional ? ' <span class="badge">선택</span>' : '') + '</label><p class="step-desc">' + esc(s.desc) + (mc ? ' · 회의 ' + mc + '건' : '') + '</p></div>' +
          '<div class="step-fields"><label class="sr-only" for="sd-' + s.id + '">' + esc(s.label) + ' 완료일</label><input type="date" id="sd-' + s.id + '" data-step-date="' + s.id + '" value="' + esc(st.date || '') + '" max="' + S.today() + '">' +
          '<label class="sr-only" for="sm-' + s.id + '">' + esc(s.label) + ' 메모</label><input type="text" id="sm-' + s.id + '" data-step-memo="' + s.id + '" value="' + esc(st.memo || '') + '" placeholder="메모" maxlength="100"></div></li>';
      }).join('') + '</ol></section>';
    }).join('') + '</div>';
    el.innerHTML = html;
    el.addEventListener('change', function (e) {
      var t = e.target;
      if (t.dataset.step) {
        var patch = { done: t.checked };
        if (t.checked && !S.stepState(p, t.dataset.step).date) patch.date = S.today();
        S.setStep(p.id, t.dataset.step, patch);
        ui.toast((t.checked ? '완료 처리: ' : '완료 해제: ') + PPP.STEPS.find(function (s) { return s.id === t.dataset.step; }).label);
        render();
      } else if (t.dataset.stepDate) {
        if (t.value && t.value > S.today()) { ui.toast('완료일은 오늘 이후일 수 없습니다.', 'error'); t.value = S.stepState(p, t.dataset.stepDate).date || ''; return; }
        S.setStep(p.id, t.dataset.stepDate, { date: t.value });
      } else if (t.dataset.stepMemo) {
        S.setStep(p.id, t.dataset.stepMemo, { memo: t.value.trim() });
      }
    });
  }

  function tabDocs(p, el) {
    var y = new Date().getFullYear();
    function docCard(d, form, year) {
      var href = '#/p/' + p.id + '/doc/' + form.id + (year ? '/' + year : '');
      var printHref = '#/p/' + p.id + '/print/' + form.id + (year ? '/' + year : '');
      var name = (year ? year + '년 ' : '') + (form.id === 'review' ? '행복한 미래 이야기' : form.title);
      return '<li class="doc-card"><div><p class="doc-name">' + esc(name) + '</p><p class="muted">' + (d ? '<span class="badge ' + (d.status === '완료' ? 'st-on' : 'warn') + '">' + esc(d.status) + '</span> 수정 ' + fmtDate(d.updatedAt.slice(0, 10)) + ' · 기록 항목 ' + PPP.formview.filledCount(d.data) + '개' : '<span class="badge">미작성</span>') + '</p></div>' +
        '<div class="doc-actions"><a class="btn btn-' + (d ? 'ghost' : 'primary') + ' btn-sm" href="' + href + '">' + (d ? '수정' : '작성') + '</a>' + (d ? '<a class="btn btn-ghost btn-sm" href="' + printHref + '">보기·인쇄</a>' : '') + '</div></li>';
    }
    var docs = S.byParticipant('documents', p.id);
    var html = '<section class="card"><h3>평생과정설계 자기소개서 <span class="muted">— 행복을 이루기 위한 "나"의 이야기</span></h3><p class="help">계획 단계 「상담」에서 작성 안내 → 사전회의 전까지 당사자·가족이 함께 작성</p><ul class="doc-list">' + docCard(S.findDoc(p.id, 'intro'), PPP.FORMS.intro) + '</ul></section>';
    ['plan', 'review'].forEach(function (fid) {
      var form = PPP.FORMS[fid];
      var list = docs.filter(function (d) { return d.formId === fid; }).sort(function (a, b) { return b.year - a.year; });
      var defYear = fid === 'plan' ? y : y - 1;
      html += '<section class="card"><h3>' + (fid === 'plan' ? '미래설계 실천계획서 <span class="muted">— 연도별</span>' : '행복한 미래 이야기 <span class="muted">— 연간 돌아보기 · 다음 해 실천하기</span>') + '</h3>' +
        '<p class="help">' + (fid === 'plan' ? '단기계획 수립(단기목표 2년) 및 해당연도 실천계획. 이전 해 「행복한 삶 실천하기」 우선순위를 불러옵니다.' : '실천과정 평가(연 1회). 해당 연도 실천계획서를 불러와 돌아보기 표를 채웁니다.') + '</p>' +
        '<ul class="doc-list">' + (list.length ? list.map(function (d) { return docCard(d, form, d.year); }).join('') : '<li class="muted">작성된 서류가 없습니다.</li>') + '</ul>' +
        '<div class="new-doc"><label for="ny-' + fid + '">새로 작성할 연도</label><select id="ny-' + fid + '">' + [y + 1, y, y - 1, y - 2, y - 3].map(function (yy) { return '<option' + (yy === defYear ? ' selected' : '') + '>' + yy + '</option>'; }).join('') + '</select><button type="button" class="btn btn-ghost btn-sm" data-new="' + fid + '">작성</button></div></section>';
    });
    el.innerHTML = html;
    el.querySelectorAll('[data-new]').forEach(function (b) {
      b.addEventListener('click', function () {
        var fid = b.dataset.new, yy = el.querySelector('#ny-' + fid).value;
        location.hash = '#/p/' + p.id + '/doc/' + fid + '/' + yy;
      });
    });
  }

  /* ---------- 지원회의: 일정 예약 · 결과 기록 · 회의록 ---------- */
  function fieldWrap(label, html, req, id) {
    return '<div class="field"' + (id ? ' id="' + id + '"' : '') + '><label><span class="lbl">' + esc(label) + (req ? ' <span class="req" aria-hidden="true">*</span><span class="sr-only">(필수)</span>' : '') + '</span>' + html + '</label></div>';
  }
  function stepForType(type) { var sid = PPP.MEETING_STEP[type]; return sid ? PPP.STEPS.find(function (s) { return s.id === sid; }) : null; }
  function meetingForm(m, o) {
    var r = m || {};
    var status = o.status || r.status || '예정';
    var type = r.type || o.type || '사전회의';
    var st = stepForType(type);
    var html = '';
    if (o.pick) {
      html += fieldWrap('참여자', '<select name="participantId" required>' + '<option value="">선택</option>' + participants().filter(function (p) { return p.status !== '종결'; }).sort(function (a, b) { return a.name.localeCompare(b.name); }).map(function (p) { return '<option value="' + p.id + '"' + (p.id === o.pid ? ' selected' : '') + '>' + esc(p.name + ' (' + p.code + ', 담당 ' + (p.worker || '-') + ')') + '</option>'; }).join('') + '</select>', true);
    }
    html += '<fieldset class="field status-set"><legend>상태 <span class="req" aria-hidden="true">*</span></legend><div class="opts">' + PPP.MEETING_STATUSES.map(function (s) {
      return '<label class="opt"><input type="radio" name="status" value="' + s + '"' + (s === status ? ' checked' : '') + '> ' + s + (s === '예정' ? ' (일정 예약)' : s === '완료' ? ' (결과 기록)' : '') + '</label>';
    }).join('') + '</div></fieldset>';
    html += '<div class="form-grid three">' + fieldWrap('회의 유형', '<select name="type">' + optionList(PPP.MEETING_TYPES, type) + '</select>', true) +
      fieldWrap('일자', '<input type="date" name="date" required value="' + esc(r.date || S.today()) + '">', true) +
      fieldWrap('시간', '<input type="time" name="time" value="' + esc(r.time || '') + '">') + '</div>';
    html += fieldWrap('장소', '<input type="text" name="place" maxlength="60" placeholder="복지관 상담실, 가정 방문 등" value="' + esc(r.place || '') + '">');
    var roles = Array.isArray(r.attendeeRoles) ? r.attendeeRoles : ['당사자', '보호자', '담당 사회복지사'];
    html += '<fieldset class="field"><legend>참석 (역할)</legend><div class="opts">' + PPP.MEETING_ROLES.map(function (x) { return '<label class="opt"><input type="checkbox" name="attendeeRoles" value="' + esc(x) + '"' + (roles.indexOf(x) >= 0 ? ' checked' : '') + '> ' + esc(x) + '</label>'; }).join('') + '</div></fieldset>';
    html += fieldWrap('참석자 메모', '<input type="text" name="attendees" maxlength="200" placeholder="외부 참석 기관명 등 (이름·연락처는 꼭 필요한 경우만)" value="' + esc(r.attendees || '') + '">');
    html += fieldWrap('안건 (회의 목적)', '<textarea name="agenda" rows="2" maxlength="1000" placeholder="' + esc(st ? st.desc : '') + '">' + esc(r.agenda || '') + '</textarea>');
    html += '<div class="result-only">' +
      fieldWrap('회의 내용', '<textarea name="content" rows="4" maxlength="3000" placeholder="당사자의 말과 선택을 중심으로 기록">' + esc(r.content || '') + '</textarea>', true) +
      fieldWrap('결정 사항', '<textarea name="decisions" rows="2" maxlength="1000">' + esc(r.decisions || '') + '</textarea>') +
      '<fieldset class="field prio-set" ' + (type === '확정회의' ? '' : 'hidden') + '><legend>확정된 영역 우선순위</legend><div class="form-grid three">' + [0, 1, 2].map(function (i) {
        return '<label>' + (i + 1) + '순위<select name="prio' + i + '">' + optionList(PPP.AREAS, (r.priorities || [])[i], '선택') + '</select></label>';
      }).join('') + '</div></fieldset>' +
      fieldWrap('다음 할 일', '<input type="text" name="nextAction" maxlength="200" value="' + esc(r.nextAction || '') + '">') +
      '<fieldset class="field next-set"><legend>다음 지원회의 바로 예약 (선택)</legend><div class="form-grid three">' +
      '<label>유형<select name="nextType">' + optionList(PPP.MEETING_TYPES, o.nextType || '', '예약 안 함') + '</select></label>' +
      '<label>일자<input type="date" name="nextDate"></label><label>시간<input type="time" name="nextTime"></label></div></fieldset>' +
      '</div><p class="err" hidden></p>';
    return html;
  }
  function nextTypeAfter(type) {
    var order = ['상담', '사전회의', '통합회의', '컨퍼런스회의', '확정회의'];
    var i = order.indexOf(type);
    return i >= 0 && i < order.length - 1 ? order[i + 1] : (type === '준비상담' ? '상담' : '');
  }
  function openMeeting(m, o) {
    o = o || {};
    var isNew = !m || !m.id;
    var title = isNew ? (o.status === '완료' ? '지원회의 결과 기록' : '지원회의 일정 예약') : (o.status === '완료' && m.status === '예정' ? '지원회의 결과 기록' : '지원회의 수정');
    return ui.modal({
      title: title, okText: '저장',
      html: '<form class="modal-form" novalidate>' + meetingForm(m, Object.assign({ nextType: nextTypeAfter((m && m.type) || o.type || '') }, o)) + '</form>',
      onOpen: function (dlg) {
        var form = dlg.querySelector('form');
        function sync() {
          var s = form.querySelector('[name=status]:checked').value, t = form.type.value, st = stepForType(t);
          form.querySelector('.result-only').hidden = s !== '완료';
          form.querySelector('.prio-set').hidden = t !== '확정회의';
          form.agenda.placeholder = st ? st.desc : '';
          if (!form.nextDate.value) form.nextType.value = nextTypeAfter(t);
        }
        form.addEventListener('change', function (e) { if (e.target.name === 'status' || e.target.name === 'type') sync(); });
        sync();
      },
      onOk: function (dlg) {
        var form = dlg.querySelector('form');
        var fd = new FormData(form), v = {};
        fd.forEach(function (val, k) { if (k !== 'attendeeRoles') v[k] = String(val).trim(); });
        v.attendeeRoles = fd.getAll('attendeeRoles');
        var pid = o.pick ? v.participantId : (m ? m.participantId : o.pid);
        var errs = [];
        if (!pid) errs.push('참여자를 선택하세요.');
        if (!v.date || !/^\d{4}-\d{2}-\d{2}$/.test(v.date)) errs.push('일자를 입력하세요.');
        if (v.time && !/^\d{2}:\d{2}$/.test(v.time)) errs.push('시간 형식이 올바르지 않습니다.');
        if (v.status === '완료') {
          if (v.date > S.today()) errs.push('완료한 회의의 일자는 오늘 이후일 수 없습니다. 앞으로의 회의는 「예정」으로 저장하세요.');
          if (!v.content) errs.push('회의 내용을 입력하세요.');
          var pr = [v.prio0, v.prio1, v.prio2].filter(Boolean);
          if (new Set(pr).size !== pr.length) errs.push('우선순위 영역이 중복되었습니다.');
          if (v.nextDate && !v.nextType) errs.push('예약할 다음 회의 유형을 선택하세요.');
          if (v.nextDate && v.nextDate < v.date) errs.push('다음 회의 일자는 이번 회의 이후여야 합니다.');
        }
        var e = form.querySelector('.err');
        if (errs.length) { e.textContent = errs.join(' '); e.hidden = false; e.setAttribute('role', 'alert'); return false; }
        var rec = {
          participantId: pid, status: v.status, type: v.type, date: v.date, time: v.time, place: v.place,
          attendeeRoles: v.attendeeRoles, attendees: v.attendees, agenda: v.agenda,
          content: v.status === '완료' ? v.content : (m && m.content) || '', decisions: v.status === '완료' ? v.decisions : (m && m.decisions) || '',
          priorities: v.type === '확정회의' && v.status === '완료' ? [v.prio0, v.prio1, v.prio2].filter(Boolean) : [],
          nextAction: v.status === '완료' ? v.nextAction : (m && m.nextAction) || ''
        };
        var saved = S.upsert('meetings', Object.assign({}, m || {}, rec));
        var msgs = ['저장했습니다.'];
        if (v.status === '완료') {
          var sid = PPP.MEETING_STEP[v.type];
          if (sid && !S.stepState(S.get('participants', pid), sid).done) {
            S.setStep(pid, sid, { done: true, date: v.date });
            msgs.push('진행단계 「' + stepForType(v.type).label + '」 완료로 표시했습니다.');
          }
          if (v.nextDate && v.nextType) {
            S.upsert('meetings', { participantId: pid, status: '예정', type: v.nextType, date: v.nextDate, time: v.nextTime, place: v.place, attendeeRoles: v.attendeeRoles, attendees: '', agenda: (stepForType(v.nextType) || {}).desc || '', content: '', decisions: '', priorities: [], nextAction: '' });
            msgs.push('다음 「' + v.nextType + '」을(를) ' + fmtDate(v.nextDate) + '에 예약했습니다.');
          }
        }
        ui.toast(msgs.join(' '));
        return saved.id;
      }
    });
  }
  function meetingCard(m, withWho) {
    var p = S.get('participants', m.participantId);
    var over = m.status === '예정' && m.date < S.today();
    return '<li class="rec card' + (m.status === '예정' ? ' rec-sched' : '') + '"><div class="rec-head"><span class="r-date">' + fmtDate(m.date) + (m.time ? ' ' + esc(m.time) : '') + '</span>' +
      '<span class="badge ' + (m.status === '완료' ? 'st-on' : m.status === '취소' ? 'st-end' : 'ph-plan') + '">' + esc(m.status) + '</span>' + (over ? '<span class="badge warn">일정 지남</span>' : '') +
      '<span class="badge">' + esc(m.type) + '</span>' + (withWho && p ? '<a href="#/p/' + p.id + '?tab=meetings"><strong>' + esc(p.name) + '</strong></a>' : '') + (m.place ? '<span class="muted">' + esc(m.place) + '</span>' : '') +
      '<span class="rec-actions">' + (m.status === '예정' ? '<button type="button" class="btn btn-primary btn-sm" data-result="' + m.id + '">결과 기록</button>' : '') +
      '<a class="btn btn-ghost btn-sm" href="#/meetings/' + m.id + '">회의록</a><button type="button" class="btn btn-ghost btn-sm" data-edit="' + m.id + '">수정</button><button type="button" class="btn btn-ghost btn-sm danger-text" data-del="' + m.id + '">삭제</button></span></div>' +
      ((m.attendeeRoles || []).length ? '<p class="muted">참석: ' + esc(m.attendeeRoles.join(', ')) + (m.attendees ? ' · ' + esc(m.attendees) : '') + '</p>' : '') +
      (m.agenda ? '<p><strong>안건</strong> ' + esc(m.agenda) + '</p>' : '') +
      (m.content ? '<p class="pre">' + esc(m.content) + '</p>' : '') +
      (m.decisions ? '<p><strong>결정 사항</strong> ' + esc(m.decisions) + '</p>' : '') +
      ((m.priorities || []).length ? '<p><strong>확정 우선순위</strong> ' + m.priorities.map(function (a, i) { return (i + 1) + '. ' + esc(a); }).join(' · ') + '</p>' : '') +
      (m.nextAction ? '<p><strong>다음 할 일</strong> ' + esc(m.nextAction) + '</p>' : '') + '</li>';
  }
  function bindMeetingActions(el) {
    el.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.result) openMeeting(S.get('meetings', b.dataset.result), { status: '완료' }).then(function (ok) { if (ok) render(); });
      if (b.dataset.edit) openMeeting(S.get('meetings', b.dataset.edit)).then(function (ok) { if (ok) render(); });
      if (b.dataset.del) ui.confirm('회의 기록 삭제', '이 지원회의 기록을 휴지통으로 옮길까요?', { danger: true, okText: '삭제' }).then(function (ok) { if (ok) { S.softDelete('meetings', b.dataset.del); ui.toast('휴지통으로 옮겼습니다.'); render(); } });
    });
  }
  function sortMeetings(list) {
    var sched = list.filter(function (m) { return m.status === '예정'; }).sort(function (a, b) { return (a.date + (a.time || '')) < (b.date + (b.time || '')) ? -1 : 1; });
    var rest = list.filter(function (m) { return m.status !== '예정'; }).sort(function (a, b) { return (a.date + (a.time || '')) < (b.date + (b.time || '')) ? 1 : -1; });
    return sched.concat(rest);
  }
  function tabMeetings(p, el) {
    var list = sortMeetings(S.byParticipant('meetings', p.id));
    var next = S.currentStep(p);
    var html = '<div class="toolbar"><div class="toolbar-left"><p class="help">지원회의(상담·사전·통합·컨퍼런스·확정)와 세부계획 협의, 실천과정 평가 회의를 예약하고 결과를 기록합니다.' + (next && next.phase === 'plan' ? ' 다음 단계: <strong>' + esc(next.label) + '</strong>' : '') + '</p></div>' +
      '<div class="toolbar-right"><button type="button" class="btn btn-ghost" id="add-sched">+ 일정 예약</button><button type="button" class="btn btn-primary" id="add-result">+ 결과 기록</button></div></div>';
    html += list.length ? '<ul class="rec-list">' + list.map(function (m) { return meetingCard(m, false); }).join('') + '</ul>' : empty('지원회의 기록이 없습니다', '「일정 예약」으로 다음 회의를 잡거나 「결과 기록」으로 진행한 회의를 남기세요.');
    el.innerHTML = html;
    var defType = next && PPP.MEETING_TYPES.indexOf(next.label) >= 0 ? next.label : '기타';
    el.querySelector('#add-sched').addEventListener('click', function () { openMeeting(null, { pid: p.id, status: '예정', type: defType }).then(function (ok) { if (ok) render(); }); });
    el.querySelector('#add-result').addEventListener('click', function () { openMeeting(null, { pid: p.id, status: '완료', type: defType }).then(function (ok) { if (ok) render(); }); });
    bindMeetingActions(el);
  }

  /* 지원회의 전체 화면 */
  function viewMeetings(q) {
    setTitle('지원회의');
    var all = S.all('meetings').filter(function (m) { var p = S.get('participants', m.participantId); return p && !p.deletedAt; });
    var status = q.status == null ? '예정' : q.status;
    var workers = Array.from(new Set(participants().map(function (p) { return p.worker; }).filter(Boolean))).sort();
    var rows = all.filter(function (m) {
      var p = S.get('participants', m.participantId);
      return (!status || m.status === status) && (!q.type || m.type === q.type) && (!q.worker || p.worker === q.worker) && (!q.month || m.date.slice(0, 7) === q.month);
    });
    rows = sortMeetings(rows);
    var t0 = S.today();
    var cnt = function (fn) { return all.filter(fn).length; };
    var html = '<section class="kpis four" aria-label="지원회의 요약">' +
      kpi('예정된 지원회의', cnt(function (m) { return m.status === '예정'; }) + '건', '이번 주 ' + cnt(function (m) { return m.status === '예정' && m.date >= t0 && m.date <= S.addDays(t0, 7); }) + '건') +
      kpi('일정 지남 (결과 미기록)', cnt(function (m) { return m.status === '예정' && m.date < t0; }) + '건', '「결과 기록」으로 완료 처리', cnt(function (m) { return m.status === '예정' && m.date < t0; }) ? 'warn' : '') +
      kpi('이번 달 완료', cnt(function (m) { return m.status === '완료' && m.date.slice(0, 7) === t0.slice(0, 7); }) + '건', '올해 ' + cnt(function (m) { return m.status === '완료' && m.date.slice(0, 4) === t0.slice(0, 4); }) + '건') +
      kpi('다음 회의 미정', participants().filter(function (p) { return p.status === '참여중' && S.alerts(p).some(function (a) { return /일정 미정/.test(a.text); }); }).length + '명', '계획 단계 참여자 기준') + '</section>';
    html += '<form class="toolbar" id="m-filter"><div class="toolbar-left">' +
      '<label class="sr-only" for="mf-status">상태</label><select id="mf-status" name="status"><option value=""' + (status === '' ? ' selected' : '') + '>상태 전체</option>' + optionList(PPP.MEETING_STATUSES, status) + '</select>' +
      '<label class="sr-only" for="mf-type">유형</label><select id="mf-type" name="type"><option value="">유형 전체</option>' + optionList(PPP.MEETING_TYPES, q.type) + '</select>' +
      '<label class="sr-only" for="mf-worker">담당</label><select id="mf-worker" name="worker"><option value="">담당 전체</option>' + optionList(workers, q.worker) + '</select>' +
      '<label class="sr-only" for="mf-month">월</label><input type="month" id="mf-month" name="month" value="' + esc(q.month || '') + '">' +
      '</div><div class="toolbar-right"><button type="button" class="btn btn-ghost" id="m-sched">+ 일정 예약</button><button type="button" class="btn btn-primary" id="m-result">+ 결과 기록</button></div></form>';
    html += '<p class="result-count" role="status">' + rows.length + '건</p>';
    html += rows.length ? '<ul class="rec-list">' + rows.map(function (m) { return meetingCard(m, true); }).join('') + '</ul>' : empty(status === '예정' ? '예정된 지원회의가 없습니다' : '조건에 맞는 지원회의가 없습니다', '「일정 예약」으로 지원회의를 잡을 수 있습니다.');
    main.innerHTML = '<div id="meetings">' + html + '</div>';
    var root = main.querySelector('#meetings');
    root.querySelector('#m-filter').addEventListener('change', function () {
      var p = new URLSearchParams(); var f = new FormData(root.querySelector('#m-filter'));
      p.set('status', f.get('status')); ['type', 'worker', 'month'].forEach(function (k) { if (f.get(k)) p.set(k, f.get(k)); });
      location.hash = '#/meetings?' + p.toString();
    });
    root.querySelector('#m-sched').addEventListener('click', function () { openMeeting(null, { pick: true, status: '예정' }).then(function (ok) { if (ok) render(); }); });
    root.querySelector('#m-result').addEventListener('click', function () { openMeeting(null, { pick: true, status: '완료' }).then(function (ok) { if (ok) render(); }); });
    bindMeetingActions(root);
    if (q.newFor !== undefined) {
      openMeeting(null, { pick: true, pid: q.newFor, status: '예정', type: q.type || undefined }).then(function () { history.replaceState(null, '', '#/meetings'); lastHash = '#/meetings'; render(); });
    }
  }

  /* 지원회의록 (보기·인쇄) */
  function viewMeetingRecord(id) {
    var m = S.get('meetings', id);
    var p = m && S.get('participants', m.participantId);
    if (!m || m.deletedAt || !p) return notFound();
    setTitle('지원회의록 · ' + p.name + ' · ' + m.type);
    var row = function (label, val, multi) { return '<tr><th scope="row">' + esc(label) + '</th><td>' + (multi ? '<span class="v-text multi">' + esc(val || '') + '</span>' : esc(val || '')) + '</td></tr>'; };
    var roles = PPP.MEETING_ROLES.map(function (x) { return ((m.attendeeRoles || []).indexOf(x) >= 0 ? '■ ' : '□ ') + x; }).join('　');
    main.innerHTML = '<div class="toolbar no-print"><div class="toolbar-left"><a class="btn btn-ghost" href="#/p/' + p.id + '?tab=meetings">← ' + esc(p.name) + ' 회의 목록</a><a class="btn btn-ghost" href="#/meetings">지원회의 전체</a></div><div class="toolbar-right">' +
      (m.status === '예정' ? '<button type="button" class="btn btn-ghost" data-result="' + m.id + '">결과 기록</button>' : '') + '<button type="button" class="btn btn-ghost" data-edit="' + m.id + '">수정</button><button type="button" class="btn btn-primary" id="do-print">인쇄 / PDF 저장</button></div></div>' +
      '<p class="note-box no-print">앱 기본 회의록 양식입니다. 기관 고유 회의록 서식이 있으면 알려주세요 (확인 필요).</p>' +
      '<div class="paper"><article class="doc mode-view"><header class="doc-head"><p class="doc-program">평생과정설계(PPP)지원사업</p><h2 class="doc-title">지원회의록</h2><p class="doc-sub">' + esc(m.type) + (m.status !== '완료' ? ' (' + esc(m.status) + ')' : '') + '</p></header>' +
      '<table class="ftable"><tbody>' + row('참여자', p.name + ' (' + p.code + ')') + row('담당 사회복지사', p.worker) +
      row('일시', fmtDate(m.date) + (m.time ? ' ' + m.time : '')) + row('장소', m.place) +
      '<tr><th scope="row">참석 (역할)</th><td>' + esc(roles) + (m.attendees ? '<br>' + esc(m.attendees) : '') + '</td></tr>' +
      row('안건 (회의 목적)', m.agenda, true) + row('회의 내용', m.content, true) + row('결정 사항', m.decisions, true) +
      (m.type === '확정회의' ? row('확정된 영역 우선순위', (m.priorities || []).map(function (a, i) { return (i + 1) + '순위 ' + a; }).join(' / ')) : '') +
      row('다음 할 일', m.nextAction, true) + '</tbody></table>' +
      '<table class="ftable sign"><tbody><tr><th scope="row">작성자</th><td>' + esc(p.worker || '') + '</td><th scope="row">확인</th><td></td></tr></tbody></table></article></div>';
    main.querySelector('#do-print').addEventListener('click', function () { window.print(); });
    bindMeetingActions(main.querySelector('.toolbar'));
  }

  /* ---------- 활동·평가 기록 ---------- */
  function activityForm(rec) {
    var r = rec || {};
    var f = fieldWrap;
    return '<div class="form-grid">' + f('일자', '<input type="date" name="date" required max="' + S.today() + '" value="' + esc(r.date || S.today()) + '">', true) +
      f('영역', '<select name="area" required>' + optionList(PPP.AREAS, r.area, '선택') + '</select>', true) +
      f('구분', '<select name="kind">' + optionList(PPP.ACTIVITY_KINDS, r.kind || '활동기록') + '</select>', true) +
      f('평가 점수 (평가일 때)', '<select name="score">' + optionList(['1', '2', '3', '4', '5'], r.score, '없음') + '</select>') + '</div>' +
      f('활동명', '<input type="text" name="title" maxlength="100" value="' + esc(r.title || '') + '">', true) +
      f('함께한 사람 (협력)', '<input type="text" name="partners" maxlength="100" placeholder="시민옹호인, 활동지원사 등" value="' + esc(r.partners || '') + '">') +
      f('내용 · 당사자 반응', '<textarea name="content" rows="4" maxlength="3000">' + esc(r.content || '') + '</textarea>') +
      f('세부계획 조정 / 메모', '<textarea name="memo" rows="2" maxlength="1000">' + esc(r.memo || '') + '</textarea>') + '<p class="err" hidden></p>';
  }
  function openActivity(p, rec) {
    ui.modal({
      title: (rec ? '수정: ' : '새 ') + '활동·평가 기록',
      html: '<form class="modal-form" novalidate>' + activityForm(rec) + '</form>',
      okText: '저장',
      onOk: function (dlg) {
        var form = dlg.querySelector('form');
        var v = {}; new FormData(form).forEach(function (val, k) { v[k] = String(val).trim(); });
        var err = '';
        if (!v.date) err = '일자를 입력하세요.';
        else if (v.date > S.today()) err = '일자는 오늘 이후일 수 없습니다.';
        else if (!v.area) err = '영역을 선택하세요.';
        else if (!v.title) err = '활동명을 입력하세요.';
        else if (v.kind !== '활동기록' && !v.score) err = '활동평가는 점수를 선택하세요.';
        var e = form.querySelector('.err');
        if (err) { e.textContent = err; e.hidden = false; e.setAttribute('role', 'alert'); return false; }
        if (v.kind === '활동기록') v.score = '';
        S.upsert('activities', Object.assign({}, rec || {}, v, { participantId: p.id }));
        var cur = S.get('participants', p.id);
        if (v.kind !== '활동기록' && !S.stepState(cur, 'activityEval').done) S.setStep(p.id, 'activityEval', { done: true, date: v.date });
        if (!S.stepState(cur, 'practiceActivity').done) S.setStep(p.id, 'practiceActivity', { done: true, date: v.date });
        ui.toast('저장했습니다.');
        return true;
      }
    }).then(function (ok) { if (ok) render(); });
  }
  function tabActivities(p, el) {
    var list = S.byParticipant('activities', p.id).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var html = '<div class="toolbar"><div class="toolbar-left"><p class="help">계획 기반 지역중심 활동과 월/분기/반기 활동평가를 기록합니다.</p></div><div class="toolbar-right"><button type="button" class="btn btn-primary" id="add-rec">+ 활동·평가 기록</button></div></div>';
    if (list.length) {
      var byArea = PPP.AREAS.map(function (a) { return { label: a, value: list.filter(function (x) { return x.area === a; }).length }; });
      html += '<div class="chart-grid three">' + PPP.charts.donut('영역별 활동 기록', byArea, { unit: '건' }) + '</div>';
    }
    html += list.length ? '<ul class="rec-list">' + list.map(function (r) {
      return '<li class="rec card"><div class="rec-head"><span class="r-date">' + fmtDate(r.date) + '</span><span class="badge">' + esc(r.area) + '</span><span class="badge ' + (r.kind === '활동기록' ? '' : 'st-on') + '">' + esc(r.kind) + (r.score ? ' · ' + esc(r.score) + '점' : '') + '</span><strong>' + esc(r.title || '') + '</strong>' +
        '<span class="rec-actions"><button type="button" class="btn btn-ghost btn-sm" data-edit="' + r.id + '">수정</button><button type="button" class="btn btn-ghost btn-sm danger-text" data-del="' + r.id + '">삭제</button></span></div>' +
        (r.partners ? '<p class="muted">함께: ' + esc(r.partners) + '</p>' : '') + '<p class="pre">' + esc(r.content || '') + '</p>' + (r.memo ? '<p><strong>조정/메모</strong> ' + esc(r.memo) + '</p>' : '') + '</li>';
    }).join('') + '</ul>' : empty('활동 기록이 없습니다', '오른쪽 위 버튼으로 첫 기록을 추가하세요.');
    el.innerHTML = html;
    PPP.charts.bindTooltips(el);
    el.querySelector('#add-rec').addEventListener('click', function () { openActivity(p); });
    el.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.edit) openActivity(p, S.get('activities', b.dataset.edit));
      if (b.dataset.del) ui.confirm('기록 삭제', '이 기록을 휴지통으로 옮길까요?', { danger: true, okText: '삭제' }).then(function (ok) { if (ok) { S.softDelete('activities', b.dataset.del); ui.toast('휴지통으로 옮겼습니다.'); render(); } });
    });
  }

  /* ---------- 서식 작성 ---------- */
  function prefill(p, fid, year) {
    var d = {};
    var docs = S.byParticipant('documents', p.id);
    if (fid === 'intro') {
      d = { name: p.name, gender: p.gender, birthDate: p.birthDate, disabilityType: p.disabilityType, writtenAt: S.today(), supporter: p.worker || '' };
    } else if (fid === 'plan') {
      var prevPlan = docs.find(function (x) { return x.formId === 'plan' && x.year === year - 1; });
      var prevReview = docs.find(function (x) { return x.formId === 'review' && x.year === year - 1; });
      var intro = S.findDoc(p.id, 'intro');
      d.writtenAt = S.today(); d.writer = p.worker || '';
      d.dream = (prevPlan && prevPlan.data.dream) || (intro && intro.data.dream) || '';
      d.longGoal = (prevPlan && prevPlan.data.longGoal) || '';
      if (prevReview && Array.isArray(prevReview.data.priorities)) d.plans = prevReview.data.priorities.filter(function (r) { return r && r.area; }).map(function (r) { return { area: r.area, goal: r.content || '', action: '', note: '우선순위 반영' }; });
    } else if (fid === 'review') {
      var plan = docs.find(function (x) { return x.formId === 'plan' && x.year === year; });
      d.writtenAt = S.today(); d.writer = p.worker || '';
      if (plan) {
        d.dream = plan.data.dream || ''; d.longGoal = plan.data.longGoal || '';
        if (Array.isArray(plan.data.plans)) d.lookback = plan.data.plans.filter(function (r) { return r && (r.area || r.goal); }).map(function (r) { return { area: r.area, goal: r.goal, plan: r.action }; });
      }
    }
    return d;
  }

  function viewDoc(pid, fid, year, printMode) {
    var p = S.get('participants', pid);
    var form = PPP.FORMS[fid];
    if (!p || p.deletedAt || !form) return notFound();
    year = form.yearly ? Number(year) || new Date().getFullYear() : null;
    if (form.yearly && (year < 2000 || year > 2100)) return notFound();
    var doc = S.findDoc(pid, fid, year);
    var docName = (year ? year + '년 ' : '') + (fid === 'review' ? '행복한 미래 이야기' : form.title);
    var ctx = { name: p.name, year: year };

    if (printMode) {
      setTitle(p.name + ' · ' + docName);
      main.innerHTML = '<div class="toolbar no-print"><div class="toolbar-left"><a class="btn btn-ghost" href="#/p/' + p.id + '?tab=docs">← 서류 목록</a></div><div class="toolbar-right"><a class="btn btn-ghost" href="#/p/' + p.id + '/doc/' + fid + (year ? '/' + year : '') + '">수정</a><button type="button" class="btn btn-primary" id="do-print">인쇄 / PDF 저장</button></div></div>' +
        '<p class="note-box no-print">인쇄 대화상자에서 대상(프린터)을 <strong>「PDF로 저장」</strong>으로 선택하면 PDF 파일로 저장됩니다. 출력물에는 민감정보가 포함되어 있으니 보관·파기에 유의하세요.</p>' +
        '<div class="paper">' + PPP.formview.render(form, doc ? doc.data : {}, 'view', ctx) + '</div>';
      main.querySelector('#do-print').addEventListener('click', function () { window.print(); });
      return;
    }

    setTitle(p.name + ' · ' + docName + (doc ? '' : ' (새로 작성)'));
    var data = doc ? JSON.parse(JSON.stringify(doc.data)) : prefill(p, fid, year);
    var status = doc ? doc.status : '작성중';
    editor.dirty = !doc;
    var nav = form.sections.length > 2 ? '<nav class="sec-nav" aria-label="서식 목차"><ul>' + form.sections.map(function (s) { return '<li><a href="#sec-' + s.id + '" data-jump="sec-' + s.id + '">' + esc((s.title || '').replace(/[【】]/g, '').replace(/\{Y\}/g, year).replace(/\{Y1\}/g, year + 1).trim()) + '</a></li>'; }).join('') + '</ul></nav>' : '';
    main.innerHTML = '<div class="toolbar doc-toolbar"><div class="toolbar-left"><a class="btn btn-ghost" href="#/p/' + p.id + '?tab=docs">← 서류 목록</a><span class="save-state" id="save-state" role="status"></span></div>' +
      '<div class="toolbar-right"><label class="inline-label" for="doc-status">작성 상태</label><select id="doc-status">' + optionList(['작성중', '완료'], status) + '</select>' +
      (doc ? '<a class="btn btn-ghost" href="#/p/' + p.id + '/print/' + fid + (year ? '/' + year : '') + '">보기·인쇄</a><button type="button" class="btn btn-ghost danger-text" id="doc-del">삭제</button>' : '') +
      '<button type="button" class="btn btn-primary" id="doc-save">저장 <kbd>Ctrl+S</kbd></button></div></div>' +
      (!doc && Object.keys(data).length > 4 ? '<p class="note-box">이전 서류의 내용을 불러와 미리 채웠습니다. 확인 후 저장하세요.</p>' : '') +
      '<div class="doc-layout">' + nav + '<div class="paper" id="paper"></div></div>';
    var paper = main.querySelector('#paper');
    var stateEl = main.querySelector('#save-state');
    function paint() { paper.innerHTML = PPP.formview.render(form, data, 'edit', ctx); }
    function markDirty() { editor.dirty = true; stateEl.textContent = '저장하지 않은 변경 사항이 있습니다'; stateEl.className = 'save-state dirty'; }
    paint();
    if (editor.dirty) markDirty();
    PPP.formview.bind(paper, form, data, { dirty: markDirty, rerender: function () { var y = window.scrollY; paint(); window.scrollTo(0, y); } });
    main.querySelector('#doc-status').addEventListener('change', markDirty);
    function save() {
      var invalid = paper.querySelector('[aria-invalid="true"]');
      if (invalid) { invalid.focus(); ui.toast('형식이 맞지 않는 입력이 있습니다: ' + (invalid.getAttribute('aria-label') || ''), 'error'); return; }
      var st = main.querySelector('#doc-status').value;
      var saved = S.upsert('documents', Object.assign({}, doc || { participantId: p.id, formId: fid, year: year }, { data: JSON.parse(JSON.stringify(data)), status: st }));
      if (!saved) return;
      doc = saved;
      editor.dirty = false;
      stateEl.textContent = '저장됨 ' + new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
      stateEl.className = 'save-state ok';
      // 서류 저장에 따른 단계 자동 표시
      if (fid === 'plan' && !S.stepState(p, 'shortPlan').done && st === '완료') S.setStep(p.id, 'shortPlan', { done: true, date: S.today() });
      if (fid === 'review' && st === '완료' && !S.stepState(p, 'yearEval').done) S.setStep(p.id, 'yearEval', { done: true, date: S.today() });
      ui.toast('저장했습니다.');
      if (!main.querySelector('#doc-del')) render();
    }
    main.querySelector('#doc-save').addEventListener('click', save);
    editor.save = save;
    var del = main.querySelector('#doc-del');
    if (del) del.addEventListener('click', function () {
      ui.confirm('서류 삭제', docName + '을(를) 휴지통으로 옮길까요?', { danger: true, okText: '삭제' }).then(function (ok) {
        if (!ok) return;
        S.softDelete('documents', doc.id); editor.dirty = false;
        ui.toast('휴지통으로 옮겼습니다.');
        location.hash = '#/p/' + p.id + '?tab=docs';
      });
    });
    main.querySelectorAll('[data-jump]').forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); var t = document.getElementById(a.dataset.jump); t.scrollIntoView({ behavior: 'smooth' }); t.querySelector('h3').setAttribute('tabindex', '-1'); t.querySelector('h3').focus({ preventScroll: true }); });
    });
  }

  /* ---------- 빈 서식 ---------- */
  function viewForms(fid) {
    if (fid) {
      var form = PPP.FORMS[fid]; if (!form) return notFound();
      setTitle('빈 서식 · ' + (fid === 'review' ? '행복한 미래 이야기' : form.title));
      main.innerHTML = '<div class="toolbar no-print"><div class="toolbar-left"><a class="btn btn-ghost" href="#/forms">← 서식 목록</a></div><div class="toolbar-right"><button type="button" class="btn btn-primary" id="do-print">인쇄 / PDF 저장</button></div></div><div class="paper">' + PPP.formview.render(form, {}, 'view', {}) + '</div>';
      main.querySelector('#do-print').addEventListener('click', function () { window.print(); });
      return;
    }
    setTitle('서식 안내');
    main.innerHTML = '<p class="note-box">한글(HWP) 원본 양식을 그대로 옮긴 전자 서식입니다. 참여자별 작성은 <a href="#/participants">참여자</a> 화면의 「서류」 탭에서 합니다. 당사자·가족이 종이로 먼저 작성하는 경우 빈 서식을 인쇄해 사용하세요.</p><ul class="doc-list">' +
      PPP.FORM_ORDER.map(function (id) {
        var f = PPP.FORMS[id];
        var desc = { intro: '나를 소개합니다 · 꿈과 행복 찾기 · 행복한 삶 준비하기 · 8개 영역 설계 (교육·보건의료·문화여가·직업·결혼·주거·법적·소득재정)', plan: '꿈과 희망 · 중장기목표 · 영역별 단기목표와 실천계획 (연도별)', review: '올해 돌아보기 · 다음 해 달라진 정보 확인하기 · 행복한 삶 실천하기 (우선순위 3개)' }[id];
        return '<li class="doc-card"><div><p class="doc-name">' + esc(id === 'review' ? '《　》의 행복한 미래 이야기' : f.title) + '</p><p class="muted">' + esc(desc) + '</p></div><div class="doc-actions"><a class="btn btn-ghost btn-sm" href="#/forms/' + id + '">빈 서식 보기·인쇄</a></div></li>';
      }).join('') + '</ul>';
  }

  /* ---------- 휴지통 ---------- */
  function viewTrash() {
    setTitle('휴지통');
    var items = [];
    var label = { participants: '참여자', documents: '서류', meetings: '회의', activities: '활동' };
    ['participants', 'documents', 'meetings', 'activities'].forEach(function (c) {
      S.db[c].filter(function (r) { return r.deletedAt && !(c !== 'participants' && r.deletedWithParent); }).forEach(function (r) {
        var p = c === 'participants' ? r : S.get('participants', r.participantId);
        var name = c === 'participants' ? r.name + ' (' + r.code + ') 및 하위 기록' : c === 'documents' ? (r.year ? r.year + '년 ' : '') + (r.formId === 'review' ? '행복한 미래 이야기' : PPP.FORMS[r.formId].title) : c === 'meetings' ? r.type + ' ' + fmtDate(r.date) : r.area + ' ' + (r.title || '') + ' ' + fmtDate(r.date);
        items.push({ c: c, r: r, who: p ? p.name : '-', name: name });
      });
    });
    items.sort(function (a, b) { return a.r.deletedAt < b.r.deletedAt ? 1 : -1; });
    var html = '<p class="note-box">삭제한 기록은 이곳에 보관되며 복원할 수 있습니다. 「영구 삭제」는 되돌릴 수 없습니다. 보존 기간 정책은 기관 규정 확인 필요 (현재 자동 삭제 없음).</p>';
    html += items.length ? '<div class="tbl-scroll"><table class="tbl"><thead><tr><th scope="col">구분</th><th scope="col">참여자</th><th scope="col">내용</th><th scope="col">삭제일</th><th scope="col"><span class="sr-only">작업</span></th></tr></thead><tbody>' + items.map(function (it) {
      return '<tr><td><span class="badge">' + label[it.c] + '</span></td><td>' + esc(it.who) + '</td><td>' + esc(it.name) + '</td><td class="nowrap">' + fmtDate(it.r.deletedAt.slice(0, 10)) + '</td><td class="nowrap"><button type="button" class="btn btn-ghost btn-sm" data-restore="' + it.c + '|' + it.r.id + '">복원</button><button type="button" class="btn btn-ghost btn-sm danger-text" data-purge="' + it.c + '|' + it.r.id + '">영구 삭제</button></td></tr>';
    }).join('') + '</tbody></table></div>' : empty('휴지통이 비어 있습니다', '삭제한 참여자·서류·기록이 여기에 표시됩니다.');
    main.innerHTML = '<div id="trash">' + html + '</div>';
    main.querySelector('#trash').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.restore) { var r = b.dataset.restore.split('|'); S.restore(r[0], r[1]); ui.toast('복원했습니다.'); render(); }
      if (b.dataset.purge) {
        var q = b.dataset.purge.split('|');
        ui.confirm('영구 삭제', '이 항목을 영구 삭제합니다. 되돌릴 수 없습니다.' + (q[0] === 'participants' ? '\n참여자의 모든 서류·회의·활동 기록도 함께 삭제됩니다.' : ''), { danger: true, okText: '영구 삭제' }).then(function (ok) { if (ok) { S.purge(q[0], q[1]); ui.toast('영구 삭제했습니다.'); render(); } });
      }
    });
  }

  /* ---------- 설정 · 백업 ---------- */
  function viewSettings() {
    setTitle('설정 · 백업');
    var counts = ['participants', 'documents', 'meetings', 'activities'].map(function (c) { return S.all(c).length; });
    var html = '<section class="card"><h3>글자 크기</h3><p class="help">화면 상단의 「가」 버튼과 같습니다. 이 기기에 저장됩니다.</p><div class="segctl" role="group" aria-label="글자 크기">' +
      FONT_STEPS.map(function (s, i) { return '<button type="button" class="btn btn-ghost" data-font="' + s + '" aria-pressed="false">' + ['작게', '보통', '크게', '아주 크게'][i] + '</button>'; }).join('') + '</div></section>';
    html += '<section class="card"><h3>백업 (내보내기)</h3><p>참여자 ' + counts[0] + '명 · 서류 ' + counts[1] + '건 · 회의 ' + counts[2] + '건 · 활동 ' + counts[3] + '건</p><p class="help" id="storage-info">저장 공간 확인 중…</p><p class="help">마지막 백업: ' + (S.db.settings.lastBackupAt ? new Date(S.db.settings.lastBackupAt).toLocaleString('ko-KR') : '<strong>없음</strong>') + '</p>' +
      '<p class="warn-box">백업 파일(JSON)에는 참여자의 민감정보가 <strong>암호화되지 않은 상태</strong>로 들어 있습니다. 기관 공용 보안 저장소(접근권한 지정)에만 보관하고, 개인 메일·메신저·USB로 옮기지 마세요.</p>' +
      '<button type="button" class="btn btn-primary" id="do-backup">백업 파일 내려받기</button></section>';
    html += '<section class="card"><h3>복원 (가져오기)</h3><p class="help">이 앱에서 내려받은 백업 파일만 복원할 수 있습니다. 복원하면 현재 데이터가 <strong>백업 내용으로 교체</strong>되며, 직전 상태는 1회 되돌리기용으로 보관됩니다.</p>' +
      '<label class="btn btn-ghost" for="restore-file">백업 파일 선택</label><input type="file" id="restore-file" accept=".json,application/json" class="sr-only">' +
      (S.hasSnapshot() ? ' <button type="button" class="btn btn-ghost" id="undo-restore">직전 복원 되돌리기</button>' : '') + '</section>';
    html += '<section class="card"><h3>데이터 관리</h3><p class="help">' + (S.db.meta.sample ? '현재 <strong>가상 샘플 데이터</strong>가 들어 있습니다. 실제 사용 전 「모든 데이터 비우기」를 하세요.' : '실제 데이터 사용 중입니다.') + '</p>' +
      '<button type="button" class="btn btn-ghost" id="load-sample">가상 샘플 데이터 불러오기</button> <button type="button" class="btn btn-danger" id="wipe">모든 데이터 비우기</button></section>';
    html += '<section class="card"><h3>저장 방식 안내</h3><ul class="plain"><li>데이터는 이 PC의 이 브라우저 안(IndexedDB)에만 저장됩니다. 다른 PC·다른 브라우저·다른 직원과 <strong>자동 동기화되지 않습니다</strong>.</li><li>브라우저 저장소는 <strong>암호화·로그인·다중 사용자 권한 관리가 없습니다</strong>. 같은 PC 계정을 쓰는 사람은 누구나 열람할 수 있으니 개인 계정·화면 잠금을 사용하세요.</li><li>브라우저의 사이트 데이터 삭제, 시크릿 창, 다른 브라우저 사용, 앱 폴더 위치 변경 시 데이터가 보이지 않거나 사라질 수 있습니다. <strong>정기적으로 백업</strong>하세요.</li><li>담당자 간 자료 이관은 백업 파일로만 가능하며, 복원 시 상대 PC의 데이터가 교체됩니다.</li></ul><p class="muted">데이터 버전 ' + PPP.SCHEMA_VERSION + '</p></section>';
    main.innerHTML = html;
    applyFont(S.db.settings.fontScale || 1);
    S.storageInfo().then(function (info) {
      var el = main.querySelector('#storage-info'); if (!el) return;
      el.textContent = !S.available ? '저장소를 사용할 수 없어 임시(메모리)로 실행 중입니다.' :
        (info.usage != null ? '이 사이트 사용 용량 약 ' + (info.usage / 1024 / 1024).toFixed(2) + 'MB / 브라우저 허용 약 ' + Math.round(info.quota / 1024 / 1024) + 'MB · ' : '') +
        (info.persisted ? '영구 저장 허용됨 (브라우저가 임의로 지우지 않음)' : '영구 저장 미허용 — 디스크가 부족하면 브라우저가 데이터를 지울 수 있습니다. 백업을 꼭 하세요.');
    });
    main.querySelector('#do-backup').addEventListener('click', function () {
      var d = new Date(), stamp = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-' + String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0');
      ui.download('성민-평생과정설계-백업-' + stamp + '.json', S.exportBackup());
      S.setSetting('lastBackupAt', S.now());
      ui.toast('백업 파일을 내려받았습니다. 안전한 위치에 보관하세요.');
    });
    main.querySelector('#restore-file').addEventListener('change', function (e) {
      var f = e.target.files[0]; e.target.value = '';
      if (!f) return;
      if (f.size > 50 * 1024 * 1024) { ui.toast('파일이 너무 큽니다 (50MB 초과).', 'error'); return; }
      f.text().then(function (text) {
        var data;
        try { data = S.validateBackup(text); } catch (err) { ui.modal({ title: '복원할 수 없습니다', message: err.message, cancel: false, okText: '닫기' }); return; }
        var live = function (c) { return data[c].filter(function (r) { return !r.deletedAt; }).length; };
        ui.confirm('백업 복원', '파일: ' + f.name + '\n내보낸 시각: ' + (data.exportedAt ? new Date(data.exportedAt).toLocaleString('ko-KR') : '알 수 없음') +
          '\n\n참여자 ' + live('participants') + '명 · 서류 ' + live('documents') + '건 · 회의 ' + live('meetings') + '건 · 활동 ' + live('activities') + '건\n\n현재 데이터가 이 내용으로 교체됩니다. 계속할까요?', { okText: '복원', danger: true }).then(function (ok) {
          if (!ok) return;
          S.importBackup(data).then(function () {
            applyFont(S.db.settings.fontScale || 1);
            ui.toast('복원을 완료했습니다.');
            render();
          });
        });
      }).catch(function () { ui.toast('파일을 읽을 수 없습니다.', 'error'); });
    });
    var undo = main.querySelector('#undo-restore');
    if (undo) undo.addEventListener('click', function () {
      ui.confirm('복원 되돌리기', '마지막 복원 직전의 데이터로 되돌립니다.').then(function (ok) { if (ok) return S.undoRestore().then(function (done) { if (done) { applyFont(S.db.settings.fontScale || 1); ui.toast('되돌렸습니다.'); render(); } }); });
    });
    main.querySelector('#load-sample').addEventListener('click', function () {
      ui.confirm('샘플 데이터', '현재 데이터를 지우고 가상 샘플 데이터(14명)를 불러옵니다. 먼저 백업하세요.', { danger: true, okText: '불러오기' }).then(function (ok) { if (ok) S.reset(PPP.sample.build()).then(function () { ui.toast('샘플 데이터를 불러왔습니다.'); render(); }); });
    });
    main.querySelector('#wipe').addEventListener('click', function () {
      ui.modal({
        title: '모든 데이터 비우기', danger: true, okText: '모두 삭제',
        html: '<p>참여자·서류·기록을 모두 영구 삭제합니다. 되돌릴 수 없습니다.</p><div class="field"><label for="wipe-confirm">확인을 위해 <strong>삭제</strong> 를 입력하세요</label><input id="wipe-confirm" type="text" autocomplete="off"></div><p class="err" hidden></p>',
        onOk: function (dlg) { if (dlg.querySelector('#wipe-confirm').value.trim() !== '삭제') { var e = dlg.querySelector('.err'); e.textContent = '「삭제」를 정확히 입력하세요.'; e.hidden = false; return false; } }
      }).then(function (ok) { if (ok) { var fs = S.db.settings.fontScale; S.reset(); S.setSetting('fontScale', fs); ui.toast('모든 데이터를 비웠습니다.'); render(); } });
    });
  }

  function notFound() {
    setTitle('찾을 수 없음');
    main.innerHTML = empty('페이지 또는 기록을 찾을 수 없습니다', '삭제되었거나 주소가 잘못되었습니다.', '<a class="btn btn-primary" href="#/dashboard">대시보드로</a>');
  }

  /* ---------- 라우터 ---------- */
  var lastHash = '';
  function parse() {
    var h = location.hash.replace(/^#/, '') || '/dashboard';
    var qi = h.indexOf('?');
    var path = (qi >= 0 ? h.slice(0, qi) : h).split('/').filter(Boolean).map(decodeURIComponent);
    var q = {}; if (qi >= 0) new URLSearchParams(h.slice(qi + 1)).forEach(function (v, k) { q[k] = v; });
    return { path: path, q: q };
  }
  function render() {
    var r = parse(), a = r.path;
    editor.dirty = false; editor.save = null;
    var navKey = a[0] === 'p' || a[0] === 'participants' ? 'participants' : a[0] || 'dashboard';
    document.querySelectorAll('.nav a').forEach(function (l) { if (l.dataset.nav === navKey) l.setAttribute('aria-current', 'page'); else l.removeAttribute('aria-current'); });
    document.body.classList.toggle('print-view', (a[0] === 'p' && a[2] === 'print') || (a[0] === 'forms' && !!a[1]) || (a[0] === 'meetings' && !!a[1] && a[1] !== 'new'));
    if (a[0] === 'dashboard' || !a[0]) viewDashboard(r.q);
    else if (a[0] === 'participants' && a[1] === 'new') viewParticipantForm(null);
    else if (a[0] === 'participants') viewList(r.q);
    else if (a[0] === 'p' && a[1] && !a[2]) viewDetail(a[1], r.q);
    else if (a[0] === 'p' && a[2] === 'edit') viewParticipantForm(a[1]);
    else if (a[0] === 'p' && a[2] === 'doc') viewDoc(a[1], a[3], a[4], false);
    else if (a[0] === 'p' && a[2] === 'print') viewDoc(a[1], a[3], a[4], true);
    else if (a[0] === 'meetings' && a[1] === 'new') viewMeetings(Object.assign({}, r.q, { status: '예정', newFor: r.q.pid || '' }));
    else if (a[0] === 'meetings' && a[1]) viewMeetingRecord(a[1]);
    else if (a[0] === 'meetings') viewMeetings(r.q);
    else if (a[0] === 'forms') viewForms(a[1]);
    else if (a[0] === 'trash') viewTrash();
    else if (a[0] === 'settings') viewSettings();
    else notFound();
    lastHash = location.hash;
    document.querySelector('.sidebar').classList.remove('open');
    document.getElementById('menu-btn').setAttribute('aria-expanded', 'false');
  }
  function onHash() {
    if (editor.dirty && location.hash !== lastHash) {
      var target = location.hash;
      history.replaceState(null, '', lastHash || '#/dashboard');
      ui.confirm('저장하지 않은 변경 사항', '작성 중인 내용이 저장되지 않았습니다. 저장하지 않고 이동할까요?', { okText: '저장하지 않고 이동', danger: true }).then(function (ok) {
        if (ok) { editor.dirty = false; location.hash = target; }
      });
      return;
    }
    var keepScroll = lastHash.split('?')[0] === location.hash.split('?')[0] && /^#\/p\//.test(location.hash);
    render();
    if (!keepScroll) { window.scrollTo(0, 0); main.focus({ preventScroll: true }); }
  }

  function init() {
    main = document.getElementById('main');
    titleEl = document.getElementById('page-title');
    main.innerHTML = '<p class="empty" role="status">데이터를 불러오는 중…</p>';
    S.load().then(function (data) {
      if (!data) return S.reset(PPP.sample.build());
    }).then(function () {
      S.requestPersist();
      start();
    }, function (err) {
      S.useMemory(PPP.sample.build());
      start();
      ui.modal({ title: '저장소를 사용할 수 없습니다', message: '이 브라우저에서 IndexedDB를 열 수 없어 저장 없이 임시로 실행합니다. 입력한 내용은 창을 닫으면 사라집니다.\n(시크릿 창이거나 사이트 데이터 저장이 차단된 경우일 수 있습니다)\n\n원인: ' + err.message, cancel: false, okText: '확인' });
      document.getElementById('storage-banner').hidden = false;
    });
  }
  function start() {
    applyFont(S.db.settings.fontScale || 1);
    document.getElementById('sample-banner').hidden = !S.db.meta.sample;
    S.onChange(function () { document.getElementById('sample-banner').hidden = !S.db.meta.sample; });
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-font]');
      if (b) { var s = Number(b.getAttribute('data-font')); S.setSetting('fontScale', s); applyFont(s); }
    });
    document.getElementById('font-dec').addEventListener('click', function () { step(-1); });
    document.getElementById('font-inc').addEventListener('click', function () { step(1); });
    function step(d) {
      var i = FONT_STEPS.indexOf(S.db.settings.fontScale || 1); if (i < 0) i = 1;
      i = Math.max(0, Math.min(FONT_STEPS.length - 1, i + d));
      S.setSetting('fontScale', FONT_STEPS[i]); applyFont(FONT_STEPS[i]);
      ui.toast('글자 크기: ' + ['작게', '보통', '크게', '아주 크게'][i]);
    }
    document.getElementById('menu-btn').addEventListener('click', function () {
      var sb = document.querySelector('.sidebar'); var open = !sb.classList.contains('open');
      sb.classList.toggle('open', open); this.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && editor.save) { e.preventDefault(); editor.save(); }
    });
    window.addEventListener('beforeunload', function (e) { if (editor.dirty) { e.preventDefault(); e.returnValue = ''; } });
    window.addEventListener('hashchange', onHash);
    S.onExternalChange(function () { if (editor.dirty || document.querySelector('.modal')) return; S.reload().then(function () { render(); ui.toast('다른 창에서 변경된 데이터를 불러왔습니다.'); }); });
    render();
  }

  PPP.app = { init: init };
  document.addEventListener('DOMContentLoaded', init);
})(window.PPP = window.PPP || {});
