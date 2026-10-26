/*
 * 가상 샘플 데이터 생성기 — 실제 인물·기관 이용자와 무관한 가상 데이터만 사용합니다.
 */
(function (PPP) {
  'use strict';

  function rng(seed) { return function () { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; }

  var NAMES = ['가람', '나래', '다온', '라온', '마루', '바다', '사랑', '아름', '자람', '차오', '하늘', '한결', '푸름', '새봄'];
  var FAMILY = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신'];
  var WORKERS = ['담당A', '담당B', '담당C', '담당D'];
  var DREAMS = ['카페에서 바리스타로 일하기', '혼자 지하철 타고 친구 만나기', '내 방을 내가 꾸미기', '요리 자격증 따기', '합창단에서 노래하기', '도서관 사서 보조로 일하기', '제주도 여행 가기', '자립생활주택에서 살아보기'];
  var GOALS = {
    '교육': ['바리스타 기초 과정 수료', '스마트폰 활용 교육 참여'], '보건의료': ['주 3회 걷기 운동', '정기 치과 검진 받기'],
    '문화여가': ['동호회 월 2회 참여', '영화관 혼자 이용하기'], '직업': ['직업훈련 프로그램 참여', '보호작업장 실습'],
    '결혼': ['친구와 정기 모임 갖기', '감정표현 연습하기'], '주거': ['자립생활 체험 1박', '집안일 1가지 스스로 하기'],
    '법적(옹호)': ['시민옹호인과 월 1회 만남', '내 생각 말하기 연습'], '소득재정': ['용돈기입장 쓰기', '체크카드 사용 연습']
  };

  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function addDays(dateStr, n) { var d = new Date(dateStr); d.setDate(d.getDate() + n); return iso(d); }

  function build() {
    var r = rng(20261026);
    var pick = function (a) { return a[Math.floor(r() * a.length)]; };
    var db = PPP.store.emptyDb();
    db.meta.sample = true;
    var t = new Date();
    var todayStr = iso(t);
    var thisYear = t.getFullYear();
    var stamp = new Date().toISOString();

    for (var i = 0; i < NAMES.length; i++) {
      var monthsAgo = Math.floor(r() * 48) + 1;
      var start = new Date(t.getFullYear(), t.getMonth() - monthsAgo, 1 + Math.floor(r() * 27));
      var birth = new Date(1975 + Math.floor(r() * 30), Math.floor(r() * 12), 1 + Math.floor(r() * 27));
      var p = {
        id: 'pa_sample' + i,
        code: 'PPP-' + start.getFullYear() + '-' + String(i + 1).padStart(3, '0'),
        name: FAMILY[i] + NAMES[i],
        gender: r() < 0.55 ? '남' : '여',
        birthDate: iso(birth),
        disabilityType: r() < 0.6 ? '지적장애' : (r() < 0.6 ? '자폐성장애' : pick(['뇌병변장애', '지체장애', '청각장애'])),
        worker: WORKERS[i % WORKERS.length],
        startDate: iso(start),
        status: i === 12 ? '보류' : (i === 13 && monthsAgo > 40 ? '종결' : '참여중'),
        parentGroup: r() < 0.5 ? '핵심그룹' : '준비그룹',
        guardianRelation: pick(['모', '부', '형제자매']),
        memo: '',
        steps: {},
        createdAt: stamp, updatedAt: stamp, deletedAt: null
      };
      // 진행 정도: 지원 개월 수에 비례
      var stepsToDo = PPP.STEPS.filter(function (s) { return !s.optional; });
      var ratio = Math.min(1, monthsAgo / 40 + (r() * 0.15));
      var doneCount = Math.max(1, Math.round(stepsToDo.length * ratio));
      if (monthsAgo < 36 && doneCount >= stepsToDo.length) doneCount = stepsToDo.length - 1;
      var cursor = p.startDate;
      stepsToDo.slice(0, doneCount).forEach(function (s, k) {
        cursor = addDays(cursor, 15 + Math.floor(r() * 25));
        if (cursor > todayStr) cursor = todayStr;
        p.steps[s.id] = { done: true, date: cursor, memo: '' };
        if (k === 0 && r() < 0.6) p.steps.familyProgram = { done: true, date: cursor, memo: '' };
      });
      db.participants.push(p);

      var areas = PPP.AREAS.slice().sort(function () { return r() - 0.5; }).slice(0, 3);
      var dream = pick(DREAMS);

      // 회의 기록
      Object.keys(PPP.MEETING_STEP).forEach(function (type) {
        var sid = PPP.MEETING_STEP[type];
        if (p.steps[sid] && p.steps[sid].done && sid !== 'yearEval') {
          db.meetings.push({ id: PPP.store.uid('me'), participantId: p.id, type: type, status: '완료', date: p.steps[sid].date, time: '14:00', place: '복지관 상담실', attendeeRoles: ['당사자', '보호자', '담당 사회복지사'], attendees: '당사자, 보호자, ' + p.worker, agenda: (PPP.STEPS.find(function (s) { return s.id === sid; }) || {}).desc || '', content: type + ' 진행 (가상 기록)', decisions: type === '확정회의' ? '우선순위 영역: ' + areas.join(', ') : '', priorities: type === '확정회의' ? areas.slice() : [], nextAction: '', createdAt: stamp, updatedAt: stamp, deletedAt: null });
        }
      });
      // 다음 지원회의 일정 (계획 단계 참여자)
      var nxt = PPP.STEPS.find(function (s) { return !s.optional && !(p.steps[s.id] && p.steps[s.id].done); });
      if (nxt && nxt.phase === 'plan' && nxt.id !== 'shortPlan' && i % 4 !== 3) {
        var offset = i % 5 === 0 ? -6 : 3 + Math.floor(r() * 25);
        db.meetings.push({ id: PPP.store.uid('me'), participantId: p.id, type: nxt.label, status: '예정', date: addDays(todayStr, offset), time: pick(['10:00', '14:00', '15:30']), place: pick(['복지관 상담실', '가정 방문', '복지관 회의실']), attendeeRoles: ['당사자', '보호자', '담당 사회복지사'], attendees: '', agenda: nxt.desc, content: '', decisions: '', priorities: [], nextAction: '', createdAt: stamp, updatedAt: stamp, deletedAt: null });
      }

      // 자기소개서
      if (p.steps.counsel && p.steps.counsel.done) {
        var introComplete = !!(p.steps.integratedMeeting && p.steps.integratedMeeting.done);
        db.documents.push({
          id: PPP.store.uid('do'), participantId: p.id, formId: 'intro', year: null, status: introComplete ? '완료' : '작성중',
          data: {
            writtenAt: p.steps.counsel.date, writer: '당사자, 보호자', supporter: p.worker,
            name: p.name, gender: p.gender, birthDate: p.birthDate, disabilityType: p.disabilityType,
            oneWord: pick(['웃음이 많은 사람', '부지런한 사람', '노래를 좋아하는 사람', '친구를 잘 챙기는 사람']),
            dream: dream, happiness: '가족과 함께 여행 갔을 때 (가상)',
            dailyLiving: { '0_0': 4, '0_1': 3, '0_6': 2, '1_0': 3, '3_2': 4 },
            socialLiving: { '0_0': 3, '0_1': 4, '1_4': 4, '6_1': 2 }
          },
          createdAt: stamp, updatedAt: stamp, deletedAt: null
        });
      }

      // 실천계획서 (단기계획 수립 이후 연도별)
      if (p.steps.shortPlan && p.steps.shortPlan.done) {
        var fromYear = parseInt(p.steps.shortPlan.date.slice(0, 4), 10);
        for (var y = fromYear; y <= thisYear; y++) {
          db.documents.push({
            id: PPP.store.uid('do'), participantId: p.id, formId: 'plan', year: y, status: y < thisYear ? '완료' : (r() < 0.6 ? '완료' : '작성중'),
            data: {
              writtenAt: y === fromYear ? p.steps.shortPlan.date : y + '-01-' + String(10 + Math.floor(r() * 15)), writer: p.worker,
              dream: dream, longGoal: '5년 안에 ' + dream,
              plans: areas.map(function (a) { return { area: a, goal: pick(GOALS[a]), action: '월 2회 지역 활동 (가상)', note: '' }; })
            },
            createdAt: stamp, updatedAt: stamp, deletedAt: null
          });
          if (y < thisYear) {
            db.documents.push({
              id: PPP.store.uid('do'), participantId: p.id, formId: 'review', year: y, status: '완료',
              data: {
                writtenAt: (y + 1) + '-01-05', writer: p.worker, dream: dream, longGoal: '5년 안에 ' + dream,
                lookback: areas.map(function (a) { return { area: a, goal: pick(GOALS[a]), plan: '월 2회 활동', story: '처음엔 어려웠지만 익숙해짐 (가상)', happy: '', score: String(2 + Math.floor(r() * 4)) }; }),
                changed: r() < 0.5 ? ['나의 하루'] : ['나의 꿈', '나의 건강'],
                priorities: areas.map(function (a) { return { area: a, content: pick(GOALS[a]), help: '활동지원사 동행' }; })
              },
              createdAt: stamp, updatedAt: stamp, deletedAt: null
            });
          }
        }
        // 실천 활동 기록
        var actStart = p.steps.shortPlan.date;
        var n = 4 + Math.floor(r() * 10);
        for (var k = 0; k < n; k++) {
          var d = addDays(actStart, 20 + k * (25 + Math.floor(r() * 20)));
          if (d > todayStr) break;
          var area = pick(areas);
          var kind = k % 3 === 2 ? pick(['월 평가', '분기 평가']) : '활동기록';
          db.activities.push({
            id: PPP.store.uid('ac'), participantId: p.id, date: d, area: area, kind: kind,
            title: kind === '활동기록' ? pick(GOALS[area]) : area + ' ' + kind,
            content: '지역 기반 활동 진행 (가상 기록)', partners: pick(['시민옹호인', '활동지원사', '보호자', '동료']),
            score: kind === '활동기록' ? '' : String(2 + Math.floor(r() * 4)), memo: '',
            createdAt: stamp, updatedAt: stamp, deletedAt: null
          });
        }
      }
    }
    return db;
  }

  PPP.sample = { build: build };
})(window.PPP = window.PPP || {});
