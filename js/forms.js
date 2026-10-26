/*
 * 서식 정의 (HWP 원본 양식을 그대로 옮긴 스키마)
 *  - intro  : 평생과정설계 자기소개서 「행복을 이루기 위한 "나"의 이야기」
 *  - plan   : 미래설계 실천계획서 (연도별)
 *  - review : 《 》의 행복한 미래 이야기 (연간 돌아보기)
 *
 * 블록 타입
 *  fields      : 라벨 | 입력 2열 표. row.inputs 로 한 줄에 여러 입력
 *  group       : 왼쪽 묶음 라벨(rowspan) + 항목별 입력
 *  grid        : 열 정의 + 행 (fixedRows 고정 / rows 기본 행 수, addable 행 추가)
 *  weekly      : 월~일 × 행 정의 표
 *  matrix      : 항목 × 5단계 수행 수준 (라디오)
 *  checkgrid   : 체크 + 내용 + 필요한 도움
 *  compare     : 현재 | 미래 | 이유 비교표
 *  amounts     : 금액 표 (그룹 합계 자동 계산)
 *  photo       : 사진 + 설명
 *  note        : 안내문
 */
(function (PPP) {
  'use strict';

  var AREAS = ['교육', '보건의료', '문화여가', '직업', '결혼', '주거', '법적(옹호)', '소득재정'];
  var DAYS = ['월', '화', '수', '목', '금', '토', '일'];
  var LEVELS = ['시도하지않음', '수행불가', '가끔씩', '도움주면가능', '수행가능'];
  var YN = ['네', '아니오'];

  function ta(label, key, extra) { return Object.assign({ label: label, key: key, input: 'textarea' }, extra || {}); }
  function tx(label, key, extra) { return Object.assign({ label: label, key: key, input: 'text' }, extra || {}); }
  function academy(key, area) {
    return { type: 'fields', rows: [ta('<평생과정설계 아카데미에서 표현한 \'' + area + '\' 이야기>', key, { hint: '영역별 활동내용, 예비 미래설계서 중 해당 영역 내용 기록', wide: true })] };
  }
  function likeGroup(prefix) {
    return [
      { label: '상황', key: prefix + '_situation' }, { label: '공간', key: prefix + '_space' },
      { label: '사람', key: prefix + '_person' }, { label: '활동', key: prefix + '_activity' },
      { label: '물건', key: prefix + '_thing' }, { label: '음식', key: prefix + '_food' },
      { label: '의사표현', key: prefix + '_express' }, { label: '기타 (색깔, 음악 등)', key: prefix + '_etc' }
    ];
  }
  function mGroup(title, items) { return { title: title, items: items }; }

  var INTRO = {
    id: 'intro',
    title: '평생과정설계 자기소개서',
    subtitle: '행복을 이루기 위한 "나"의 이야기',
    program: '평생과정설계(PPP)지원사업',
    yearly: false,
    header: [
      { label: '작성일', key: 'writtenAt', input: 'date' },
      { label: '작성자', key: 'writer', input: 'text' },
      { label: '지원자', key: 'supporter', input: 'text' }
    ],
    preface: '평생과정설계 자기소개서 「행복을 이루기 위한 "나"의 이야기」는 평생과정설계 계획수립을 위한 기본적인 자료로 활용됩니다. 또한 "나"의 이야기는 장애 당사자와 가족의 소중한 삶의 이야기들이 담겨있어 추후 매우 의미 있는 자료가 될 것입니다. "나"의 이야기의 "나"는 장애 당사자를 의미합니다. "나"의 이야기는 장애 당사자와 가족이 함께 작성하시는 것이 가장 좋습니다.',
    sections: [
      {
        id: 's1', title: '【 나를 소개합니다 】', nameTitle: true,
        blocks: [
          { type: 'photo', key: 'photo', label: '내가 가장 멋있게 나온 사진을 붙여주세요.', captionKey: 'photoCaption', captionLabel: '♥ 사진을 설명해주세요.' },
          { type: 'fields', title: '○ "나"를 한마디로 표현하기', rows: [ta('"나"를 한마디로', 'oneWord', { hideLabel: true })] },
          {
            type: 'fields', title: '○ 나의 기본정보', rows: [
              tx('이름', 'name'),
              { label: '성별', key: 'gender', input: 'radio', options: ['남', '여'] },
              { label: '생년월일', inputs: [{ key: 'birthDate', input: 'date', label: '생년월일' }, { key: 'birthCal', input: 'radio', options: ['음', '양'], label: '음력/양력' }] },
              { label: '연락처', inputs: [{ key: 'phone', input: 'tel', prefix: '(나)', label: '본인 연락처' }, { key: 'emergencyPhone', input: 'tel', prefix: '(긴급연락처)', label: '긴급연락처' }] },
              tx('주소', 'address', { hint: '최소 수집 원칙: 시·구·동 수준까지만 권장 (기관 기준 확인 필요)' }),
              tx('장애유형', 'disabilityType'),
              ta('장애특성', 'disabilityTrait'),
              { label: '활동지원 서비스', inputs: [{ key: 'pasUse', input: 'radio', options: ['이용함', '이용안함'], label: '활동지원 서비스 이용 여부' }, { key: 'pasHours', input: 'number', prefix: '월', suffix: '시간', label: '월 이용 시간' }] },
              ta('활동지원 내용', 'pasContent'),
              tx('혈액형', 'bloodType'), tx('시력', 'eyesight'),
              { label: '키', key: 'height', input: 'number', suffix: 'cm' },
              { label: '몸무게', key: 'weight', input: 'number', suffix: 'kg' },
              { label: '사이즈', inputs: [{ key: 'sizeTop', input: 'text', prefix: '상의', label: '상의 사이즈' }, { key: 'sizeBottom', input: 'text', prefix: '하의', label: '하의 사이즈' }, { key: 'sizeShoes', input: 'text', prefix: '신발', label: '신발 사이즈' }] },
              { label: '종교', inputs: [{ key: 'religion', input: 'text', label: '종교' }, { key: 'religionActivity', input: 'text', prefix: '종교시설에서 하고 있는 활동:', label: '종교시설 활동' }] },
              tx('별명', 'nickname'), ta('성격', 'personality'), ta('기타', 'basicEtc')
            ]
          },
          {
            type: 'fields', title: '○ 나의 특성', rows: [
              ta('내가 잘하는 것 (좋은 점, 좋은 습관 등)', 'goodAt'),
              ta('내가 좋아하는 이야기 또는 추억', 'favStory'),
              ta('사람들이 좋아하는 나의 모습', 'likedBy')
            ]
          },
          { type: 'group', label: '내가 좋아하는 것 또는 나를 기분 좋게 하는 것', items: likeGroup('like') },
          { type: 'group', label: '내가 싫어하는 것 또는 나를 어렵게 하는 것', items: likeGroup('dislike') },
          { type: 'fields', rows: [ta('나를 편안하게 하는 방법', 'comfortWay'), ta('나에게 위로를 주는 방법', 'consoleWay')] },
          {
            type: 'grid', key: 'people', title: '○ 나와 함께 하고 있는 사람들', rows: 5, addable: true,
            columns: [{ key: 'relation', label: '관계' }, { key: 'name', label: '이름' }, { key: 'age', label: '나이', input: 'number', width: '4.5em' }, { key: 'job', label: '직업' }, { key: 'phone', label: '전화번호', input: 'tel' }, { key: 'help', label: '도움을 주는 내용' }]
          },
          {
            type: 'fields', rows: [
              ta('• 나와 가족이 기념하는 행사와 기념하는 방법', 'familyEvents', { wide: true }),
              ta('• 나의 친구(지인 등) 소개 및 함께 하는 방법', 'friends', { wide: true }),
              ta('• 내가 소속된 기관(단체 등)과 활동 방법', 'organizations', { wide: true })
            ]
          }
        ]
      },
      {
        id: 's2', title: '【 꿈과 행복 찾기 】',
        blocks: [
          {
            type: 'grid', key: 'dailyRoutine', title: '○ 나의 일상 나누기', rowHeader: '구분',
            fixedRows: ['아침', '점심', '저녁', '밤'],
            columns: [{ key: 'routine', label: '하루 일과', input: 'textarea' }, { key: 'rule', label: '나만의 중요한 규칙(루틴)', input: 'textarea' }]
          },
          { type: 'weekly', key: 'weeklyNow', title: '주간 활동', rows: ['관계 (누구와)', '활동 (무엇을)', '장소 (어디서)'] },
          { type: 'fields', title: '○ 내가 생각하는 행복이란? (행복하고 즐거웠던 경험 등)', rows: [ta('행복이란', 'happiness', { hideLabel: true })] },
          { type: 'fields', title: '○ 나의 꿈은?', rows: [ta('나의 꿈', 'dream', { hideLabel: true })] },
          { type: 'weekly', key: 'weeklyHope', title: '○ 내가 기대하는 일상 — 주간 활동', rows: ['관계 (누구와)', '활동 (무엇을)', '장소 (어디서)'] }
        ]
      },
      {
        id: 's3', title: '【 행복한 삶 준비하기 】',
        blocks: [
          {
            type: 'matrix', key: 'dailyLiving', title: '일상생활 — 자립생활에 필요한 것 돌아보기', itemHeader: '일상생활 활동', scale: LEVELS,
            groups: [
              mGroup('(1) 청소와 정리하기', ['집안 청소하기', '이부자리 정리하기', '옷장 정리하기', '탁자, 서랍장 정리하기', '싱크대 정리하기', '냉장고 정리하기', '설거지하기', '화장실 청소하기']),
              mGroup('(2) 빨래하기', ['세탁기 사용하기', '손빨래하기', '세탁소 이용하기']),
              mGroup('(3) 쓰레기 버리기', ['재활용 쓰레기', '음식물 쓰레기', '일반쓰레기']),
              mGroup('(4) 음식 만들기', ['양념 및 음식재료 알기', '요리도구 사용하기', '밥솥 사용하기']),
              mGroup('(5) 단정하게 옷 입기', ['자신의 옷 고르기', '깨끗한 옷 고르기', '결혼/장례식 때에 맞는 옷 입기']),
              mGroup('(6) 멋내기', ['머리 정돈하기', '손톱과 발톱 관리하기', '화장품 사용하기', '액세서리 사용하기']),
              mGroup('(7) 고장난 물건 고치기', ['라디오나 핸드폰이 고장 났을 때 서비스 센터 이용하기'])
            ]
          },
          {
            type: 'matrix', key: 'socialLiving', title: '사람들과 친하게 지내기', itemHeader: '사람들과 친하게 지내기 활동', scale: LEVELS,
            groups: [
              mGroup('(1) 사람들과 대화하기', ['대화할 때 바른 행동 알기', '좋은 말 사용하기', '나의 어려운 점 이야기하기']),
              mGroup('(2) 친구들과 친하게 지내기', ['취미생활 함께 하기', '모임에 참석하기', '집에 초대하기', '비밀지키기', '약속 지키기']),
              mGroup('(3) 이웃들과 함께 살기', ['이웃에게 인사하기', '질서 지키기', '피해주지 않기', '버스/지하철 예의 지키기']),
              mGroup('(4) 가족들과 친하게 지내기', ['가족 행사가기 (생일, 결혼 등)', '어른에게 안부 전화하기']),
              mGroup('(5) 지역사회시설 이용하기', ['주민센터 위치 알기 (구청, 동주민센터, 시청 등)', '우체국, 은행, 병원 등 찾기', '각 시설 이용하는 방법 알기']),
              mGroup('(6) 핸드폰으로 카카오톡, 문자, 페이스북 사용하기', ['들어가는 방법 알기', '문자 쓰는 방법 알기', '사진 올리는 방법 알기']),
              mGroup('(7) 원하는 곳으로 외출하기', ['내가 갈 곳 찾기', '버스, 택시, 지하철 이용 방법 알기', '길 묻기'])
            ]
          }
        ]
      },
      {
        id: 's4', title: '교육설계', area: '교육', lead: '꿈을 이루기 위한 이야기',
        blocks: [
          academy('eduAcademy', '교육'),
          { type: 'grid', key: 'eduPast', title: '○ 과거 교육', rows: 3, addable: true, columns: [{ key: 'name', label: '교육명' }, { key: 'org', label: '교육기관' }, { key: 'period', label: '교육기간' }, { key: 'note', label: '비고' }] },
          { type: 'grid', key: 'eduNow', title: '○ 현재 교육', rows: 3, addable: true, columns: [{ key: 'name', label: '교육명' }, { key: 'org', label: '교육기관' }, { key: 'period', label: '교육기간' }, { key: 'satisfaction', label: '만족도 (소감 등)' }] },
          { type: 'grid', key: 'eduFuture', title: '○ 꿈을 이루기 위한 미래 교육', rows: 3, addable: true, columns: [{ key: 'name', label: '희망교육' }, { key: 'reason', label: '이유' }, { key: 'help', label: '필요한 도움' }] }
        ]
      },
      {
        id: 's5', title: '보건의료 설계', area: '보건의료', lead: '몸과 마음이 건강하기 위한 이야기',
        blocks: [
          academy('healthAcademy', '보건의료'),
          { type: 'fields', title: '○ 내가 생각하는 건강', rows: [ta('나의 건강은 어떤가요?', 'healthNow')] },
          {
            type: 'checkgrid', key: 'healthNeeds', title: '내가 더 건강해지기 위해 필요한 도움은 무엇인가요?',
            items: ['정기적 건강검진(구강검진 등)', '건강한 식단관리', '건강한 체형(다이어트 등)', '건강한 마음챙김(스트레스 해소)', '건강관련 정보 알기', '약물복용 방법 알기', '기타'],
            columns: [{ key: 'content', label: '내용' }, { key: 'help', label: '필요한 도움' }]
          },
          {
            type: 'grid', key: 'healthRole', title: '나의 건강한 역할에 필요한 도움은 무엇인가요?', rowHeader: '질문',
            fixedRows: ['가족에서 어떤 역할을 하고 싶나요?', '친구, 동료 등 주변 사람들에게 어떤 역할을 하고 싶나요?'],
            columns: [{ key: 'content', label: '내용', input: 'textarea' }, { key: 'help', label: '필요한 도움', input: 'textarea' }]
          },
          {
            type: 'fields', title: '○ 나의 건강 정보', sensitive: true, rows: [
              tx('진단명 (또는 질환)', 'diagnosis'),
              tx('이용병원 — 병원이름(의사)', 'hospital'),
              tx('이용병원 — 진료내용', 'treatment'),
              { label: '이용병원 — 방문주기', inputs: [{ key: 'visitCycle', input: 'radio', options: ['정기', '비정기'], label: '방문주기' }, { key: 'visitCycleText', input: 'text', prefix: '정기(', suffix: ')', label: '정기 방문주기' }] },
              tx('약 복용 — 약 이름', 'medName'),
              tx('약 복용 — 복용이유', 'medReason'),
              tx('약 복용 — 복용시기', 'medTiming'),
              { label: '약 복용 — 복용관리', key: 'medManage', input: 'radio', options: ['스스로 복용', '복용 지원 필요'] },
              { label: '보조기구', inputs: [{ key: 'aids', input: 'checks', options: ['안경', '보청기', '휠체어', '기타'], label: '보조기구' }, { key: 'aidsEtc', input: 'text', prefix: '기타 (', suffix: ')', label: '보조기구 기타' }] }
            ]
          },
          {
            type: 'group', label: '건강습관', items: [
              { label: '식습관', key: 'habitDiet' }, { label: '수면', key: 'habitSleep' }, { label: '보조식품', key: 'habitSupplement' },
              { label: '구강관리', key: 'habitOral' }, { label: '건강검진', key: 'habitCheckup' }
            ]
          },
          {
            type: 'fields', title: '스트레스 · 우울', rows: [
              { label: '스트레스가 있나요?', key: 'stress', input: 'radio', options: ['없다', '가끔', '자주'] },
              ta('스트레스가 있다면 해결방법이 무엇인가요?', 'stressSolve'),
              { label: '우울을 느낀 적이 있나요?', key: 'depress', input: 'radio', options: ['없다', '가끔', '자주'] },
              ta('우울을 느낀 적이 있다면 해결방법이 무엇인가요?', 'depressSolve')
            ]
          },
          {
            type: 'fields', title: '늙어감', rows: [
              ta('나이 들어감(노화)에 대해 알고 있나요?', 'agingKnow'),
              ta('나이 들면 몸에 나타나는 변화를 알고 있나요?', 'agingChange'),
              ta('나는 어떤 모습으로 늙어가고 싶나요?', 'agingHope'),
              ta('죽음에 대해 어떻게 생각하나요?', 'deathThought'),
              { label: '주변 사람의 죽음을 경험한 적이 있나요?', key: 'deathExp', input: 'radio', options: ['없다', '있다'] },
              ta('그때 느꼈던 감정이 무엇인가요?', 'deathFeeling')
            ]
          }
        ]
      },
      {
        id: 's6', title: '문화여가설계', area: '문화여가', lead: '신나고 즐겁게 활동하기 위한 이야기',
        blocks: [
          academy('leisureAcademy', '문화여가'),
          { type: 'grid', key: 'leisureExp', title: '○ 나의 문화여가 경험', rows: 3, addable: true, columns: [{ key: 'activity', label: '문화여가 활동' }, { key: 'good', label: '좋았던 이유' }, { key: 'bad', label: '싫었던 이유' }] },
          { type: 'grid', key: 'leisureHope', title: '○ 내가 희망하는 문화여가', rows: 3, addable: true, columns: [{ key: 'activity', label: '문화여가 활동' }, { key: 'who', label: '누구와' }, { key: 'when', label: '언제(낮,밤)' }, { key: 'reason', label: '이유' }] },
          {
            type: 'fields', rows: [{
              label: '필요한 도움', inputs: [
                { key: 'leisureNeeds', input: 'checks', options: ['함께 하는 사람', '다양한 문화여가 활동 경험', '문화여가 활동비용', '문화여가 활동 시간과 장소 확보', '문화여가 관련 정보 알기', '기타'], label: '문화여가 필요한 도움' },
                { key: 'leisureNeedsEtc', input: 'text', prefix: '기타 (', suffix: ')', label: '문화여가 필요한 도움 기타' }
              ]
            }]
          }
        ]
      },
      {
        id: 's7', title: '직업설계', area: '직업', lead: '사회에서 즐겁게 일하기 위한 이야기',
        blocks: [
          academy('jobAcademy', '직업'),
          {
            type: 'fields', title: '○ 직업이 있는 경우', rows: [
              { label: '현재 직업을 계속 하고 싶나요?', key: 'jobKeep', input: 'radio', options: ['네', '아니오 (직업이 없는 경우로 이동)'] },
              ta('직업을 계속 하기 위해 필요한 준비는 무엇인가요?', 'jobKeepPrep'),
              ta('직업을 계속 하기 위해 필요한 지원은 무엇인가요?', 'jobKeepSupport')
            ]
          },
          {
            type: 'fields', title: '○ 직업이 없는 경우 (또는 직업을 바꾸고 싶은 경우)', rows: [
              { label: '직업을 희망하나요?', key: 'jobWant', input: 'radio', options: YN },
              ta('희망하는 직업이 무엇인가요?', 'jobHope'),
              ta('희망하는 직업을 위해 필요한 준비는 무엇인가요?', 'jobHopePrep'),
              ta('희망하는 직업을 위해 필요한 지원은 무엇인가요?', 'jobHopeSupport')
            ]
          },
          {
            type: 'fields', title: '○ 사회에 도움이 되는 활동', rows: [
              { label: '사회에 도움이 되는 활동을 희망하나요?', key: 'socialWant', input: 'radio', options: YN },
              ta('당신이 희망하는 활동이 무엇인가요?', 'socialHope')
            ]
          }
        ]
      },
      {
        id: 's8', title: '결혼설계', area: '결혼', lead: '좋아하는 사람과 함께 하기 위한 이야기',
        blocks: [
          academy('marriageAcademy', '결혼'),
          {
            type: 'fields', title: '○ 의미 있는 관계', rows: [
              { label: '나에게 의미있는 사람은 누구인가요? (가족 외)', inputs: [{ key: 'meaningful', input: 'checks', options: ['친구', '동료', '선후배', '배우자', '기타', '없다'], label: '의미있는 사람' }, { key: 'meaningfulEtc', input: 'text', prefix: '기타 (', suffix: ')', label: '의미있는 사람 기타' }] },
              ta('이유는 무엇인가요?', 'meaningfulReason'),
              ta('의미있는 사람과의 관계에 필요한 도움이 무엇인가요?', 'meaningfulHelp')
            ]
          },
          {
            type: 'fields', title: '○ 이성교제', rows: [
              { label: '이성교제 중인가요?', key: 'dating', input: 'radio', options: ['네', '아니요'] },
              { label: '이성교제를 희망하나요? (이성교제 중인 경우 지속적 교제)', key: 'datingWant', input: 'radio', options: ['네', '아니요'] },
              { label: '이성교제에 필요한 도움이 무엇인가요?', inputs: [{ key: 'datingHelp', input: 'checks', options: ['감정표현하기', '상대방 이해하기', '데이트하기', '성적욕구(스킨십 등)', '결혼을 위한 준비', '기타'], label: '이성교제 필요한 도움' }, { key: 'datingHelpEtc', input: 'text', prefix: '기타 (', suffix: ')', label: '이성교제 도움 기타' }] }
            ]
          },
          {
            type: 'fields', title: '○ 결혼', rows: [
              { label: '결혼생활 중인가요?', key: 'married', input: 'radio', options: ['네', '아니요'] },
              { label: '결혼을 희망하나요? (결혼한 경우 지속적 결혼생활)', key: 'marriageWant', input: 'radio', options: ['네', '아니요'] },
              { label: '결혼생활에 필요한 도움이 무엇인가요?', inputs: [{ key: 'marriageHelp', input: 'checks', options: ['가사활동(요리, 빨래 등)', '부부관계', '임신과 출산', '자녀 양육', '가족(시가, 처가 등)에서의 역할', '갈등해소 지원(부부 또는 가족)', '기타'], label: '결혼생활 필요한 도움' }, { key: 'marriageHelpEtc', input: 'text', prefix: '기타 (', suffix: ')', label: '결혼생활 도움 기타' }] }
            ]
          }
        ]
      },
      {
        id: 's9', title: '주거설계', area: '주거', lead: '살고 싶은 집에 대한 이야기',
        blocks: [
          academy('houseAcademy', '주거'),
          {
            type: 'compare', key: 'housing', title: '○ 내가 선택하는 주거생활',
            rows: [
              { key: 'with', label: '누구와 살고 있나요?', input: 'checks', options: ['가족', '혼자', '배우자', '친구, 동료'] },
              { key: 'type', label: '집의 유형은 무엇인가요?', input: 'checks', options: ['아파트', '주택', '빌라/다가구주택', '거주시설(그룹홈 등)', '기타'] },
              { key: 'tenure', label: '집의 형태는 무엇인가요?', input: 'checks', options: ['자가', '전세', '월세', '무상(임대)', '기타'] },
              { key: 'location', label: '집의 위치는 어디인가요?', input: 'checks', options: ['서울시', '경기도', '다른 지역'], detail: true },
              { key: 'nearby', label: '집 주변에 필요한 것은 무엇인가요?', input: 'checks', options: ['공원', '학교', '마트', '은행', '우체국', '식당', '관공서', '편리한교통', 'PC방', '도서관', '복지기관', '종교시설', '영화관', '미용실', '병원', '기타'] },
              { key: 'ownSpace', label: '나만의 공간이 있나요?', input: 'checks', options: ['있다', '없다'], futureOptions: ['필요하다', '필요없다'] },
              { key: 'important', label: '나에게 중요한 물건이나 가구는 무엇인가요?', input: 'text' },
              { key: 'neighbors', label: '내 주변에 누가 살았으면 좋겠나요?', input: 'text' },
              { key: 'chores', label: '독립적으로 수행할 수 있는 집안 일이 있나요?', input: 'checks', options: ['청소', '빨래', '설거지', '요리', '가스 잠그기', '문단속', '기타'] },
              { key: 'safety', label: '안전장치가 있나요?', input: 'checks', options: ['소화기', '비상벨', '도움요청 방법 알고 있다', '읽기 쉬운 설명서', '채광, 환기', '기타'], futureOptions: ['소화기', '비상벨', '도움요청 방법 필요하다', '읽기 쉬운 설명서', '채광, 환기 등', '기타'] }
            ]
          },
          {
            type: 'fields', rows: [{
              label: '필요한 도움', inputs: [
                { key: 'houseNeeds', input: 'checks', options: ['집 준비 관련 정보제공 (임대주택 관련 정보, 자가주택 준비 등)', '집 준비 관련 비용 지원(주거생활 비용)', '집 내부 환경 바꾸기(주거환경 개선)', '가사 활동 및 관리 방법 알기', '기타'], label: '주거 필요한 도움', column: true },
                { key: 'houseNeedsEtc', input: 'text', prefix: '기타', label: '주거 필요한 도움 기타' }
              ]
            }]
          }
        ]
      },
      {
        id: 's10', title: '법적설계', area: '법적(옹호)', lead: '나를 이해하고 도와주는 사람에 대한 이야기',
        blocks: [
          academy('legalAcademy', '법'),
          {
            type: 'fields', title: '○ 나를 이해하고 응원하는 사람(옹호인)', rows: [
              { label: '누가 나를 이해하고 응원해주길 희망하나요?', inputs: [{ key: 'advocateWho', input: 'checks', options: ['가족', '친인척', '친구', '이웃', '사회복지사', '활동지원사', '기타'], label: '희망 옹호인' }, { key: 'advocateWhoEtc', input: 'text', prefix: '기타 (', suffix: ')', label: '희망 옹호인 기타' }] },
              tx('이름', 'advocateName'),
              { label: '연락처', key: 'advocatePhone', input: 'tel' },
              {
                label: '희망하는 도움 — 어떤 도움을 받고 싶은가요?', inputs: [{
                  key: 'advocateHelp', input: 'checks', column: true, label: '옹호인에게 희망하는 도움', options: [
                    '내 꿈을 위해 배우고 싶은 것을 알아보는 것', '몸이 아플 때 약국이나 병원에 가서 진료를 받는 것',
                    '친구를 만들거나 친한 사람들과 신나고 즐거운 활동을 하는 것', '친한 사람들과 갈등이 생겼을 때 해결하는 것',
                    '사랑하는 사람과 이성교제(데이트) 또는 결혼하는 것', '직장에서 생긴 어려운 일 해결, 직장생활 잘 할 수 있도록 하는 것',
                    '은행에서 통장을 만들거나 돈을 찾는 것, 공과금(수도세, 전기세 등) 납부하는 것', '돈을 관리 하는 방법을 아는 것',
                    '앞으로 살고 싶은 집(아파트, 빌라 등)을 준비하는 것', '요리활동, 집안일(청소, 빨래 등) 등을 잘 하는 것',
                    '내 생각을 잘 말할 수 있도록 하는 것', '기타'
                  ]
                }, { key: 'advocateHelpEtc', input: 'text', prefix: '기타 (', suffix: ')', label: '희망하는 도움 기타' }]
              }
            ]
          }
        ]
      },
      {
        id: 's11', title: '소득재정설계', area: '소득재정', lead: '돈을 잘 사용하기 위한 이야기', sensitive: true,
        blocks: [
          academy('moneyAcademy', '소득재정'),
          {
            type: 'fields', title: '○ 돈 관리 경험', rows: [
              { label: '돈 사용에 대한 경험', key: 'moneyExp', input: 'radio', options: ['있다', '없다'] },
              { label: '▸ 사용목적 (있다)', inputs: [{ key: 'moneyPurpose', input: 'checks', options: ['식비', '간식비', '교통비', '통신비', '물건구매', '기타'], label: '돈 사용목적' }, { key: 'moneyPurposeEtc', input: 'text', prefix: '기타 (', suffix: ')', label: '돈 사용목적 기타' }] },
              tx('▸ 돈 사용 경험이 없는 이유? (없다)', 'moneyNoReason')
            ]
          },
          {
            type: 'fields', title: '○ 돈 관리 방법', rows: [
              { label: '돈 관리는 누가 하나요?', inputs: [{ key: 'moneyManager', input: 'radio', options: ['내가 직접 관리', '가족이 관리', '후견인이 관리', '기타', '누가 관리하는지 모름'], label: '돈 관리 주체' }, { key: 'moneyManagerEtc', input: 'text', prefix: '기타 (', suffix: ')', label: '돈 관리 주체 기타' }] },
              { label: '돈 보관 방법은 무엇인가요?', inputs: [{ key: 'moneyKeep', input: 'radio', options: ['현금으로 보관', '은행에 저금함', '저금통에 저금함', '기타', '보관방법 모름'], label: '돈 보관 방법' }, { key: 'moneyKeepEtc', input: 'text', prefix: '기타 (', suffix: ')', label: '돈 보관 방법 기타' }] },
              { label: '돈 사용방법은 무엇인가요?', inputs: [{ key: 'moneyUse', input: 'radio', options: ['현금 사용', '체크카드 사용', '신용카드 사용', '기타', '사용방법 모름'], label: '돈 사용방법' }, { key: 'moneyUseEtc', input: 'text', prefix: '기타 (', suffix: ')', label: '돈 사용방법 기타' }] },
              { label: '돈을 잘 관리하기 위해 필요한 도움은 무엇인가요?', inputs: [{ key: 'moneyHelp', input: 'checks', column: true, options: ['들어온 돈(수입)과 사용한 돈(지출)의 의미 알기', '계획적인 소비(돈 사용) 방법을 알고 실행하기', '다양한 분야의 소비 경험 늘리기', '기타'], label: '돈 관리 필요한 도움' }, { key: 'moneyHelpEtc', input: 'text', prefix: '기타 (', suffix: ')', label: '돈 관리 도움 기타' }] }
            ]
          },
          { type: 'note', text: '※ 지원자(보호자 등)가 체크합니다.' },
          {
            type: 'fields', title: '○ 자녀의 소득재정 관리에 대한 생각 확인하기', rows: [
              { label: '보호자 부재 시 장애자녀의 재산관리 주체는 누구인가요?', inputs: [{ key: 'assetManager', input: 'checks', options: ['장애자녀', '비장애형제', '친인척', '지인', '금융기관', '기타'], label: '재산관리 주체' }, { key: 'assetManagerEtc', input: 'text', prefix: '기타 (', suffix: ')', label: '재산관리 주체 기타' }] },
              { label: '장애자녀의 재산관리를 위해 필요한 도움은 무엇인가요?', inputs: [{ key: 'assetHelp', input: 'checks', column: true, options: ['영역별 활동에 따른 필요비용 설계', '신탁제도 정보 제공 및 활용 방법 지원', '후견제도 정보 제공 및 활용 방법 지원', '안전한 재산관리를 위한 방법 지원', '재산상속 정보 제공', '기타'], label: '재산관리 필요한 도움' }, { key: 'assetHelpEtc', input: 'text', prefix: '기타 (', suffix: ')', label: '재산관리 도움 기타' }] }
            ]
          },
          {
            type: 'amounts', key: 'assets', title: '○ 재산과 수입현황 파악', valueLabel: '월 평균 금액(원)',
            groups: [
              {
                label: '재산', items: [
                  { cat: '보유 유동자산', label: '현금' }, { cat: '보유 유동자산', label: '예금' }, { cat: '보유 유동자산', label: '연금, 보험' }, { cat: '보유 유동자산', label: '유가증권' },
                  { cat: '보유 고정자산', label: '부동산' },
                  { cat: '부채', label: '은행대출(-)', sign: -1 }, { cat: '부채', label: '기타(-)', sign: -1 }
                ]
              },
              {
                label: '수입', items: [
                  { cat: '정기 소득', label: '근로소득' }, { cat: '정기 소득', label: '부동산소득' }, { cat: '정기 소득', label: '장애연금/수당' }, { cat: '정기 소득', label: '개인연금' },
                  { cat: '비정기 소득', label: '결연후원' }, { cat: '비정기 소득', label: '정부지원금' }, { cat: '비정기 소득', label: '장애연금/수당' }, { cat: '비정기 소득', label: '기타' }
                ]
              }
            ]
          },
          {
            type: 'grid', key: 'insurance', title: '보험', rowHeader: '보험유형', fixedRows: ['의료', '상해', '연금', '기타'],
            columns: [{ key: 'coverage', label: '보험 보장 내용' }, { key: 'amount', label: '보장 금액', input: 'number' }]
          },
          {
            type: 'amounts', key: 'spendSelf', title: '○ 지출현황 파악 (장애인의 수입으로 지출하는 경우)', valueLabel: '월 평균 금액(원)',
            groups: [
              {
                label: '정기지출', items: ['주거생활비(월세, 각종공과금 등)', '식비(주식, 간식, 기호품 등)', '외식비(가족, 기타)', '교통비(대중교통, 차량유지비 등)', '통신비(구입비, 인터넷·핸드폰 월정액 등)', '교육비(학원비, 교재비 등)', '용돈(부모님, 자녀 등)', '각종 할부금(자동차구입 등)', '저축(적금, 주식형, 연금 등)', '금융비용(신용대출, 마이너스통장, 대출이자 등)', '의료비(병원비, 약값, 건강식품 등)', '보험비(생명보험, 손해보험, 공공보험 등)', '기타'].map(function (l) { return { label: l }; })
              },
              {
                label: '비정기지출', items: ['경조사비(돌잔치, 결혼, 생신 등)', '의류(신발)비(구입, 세탁비 등)', '문화여가비(취미, 스포츠, 영화관람, 여행 등)', '의료비(진료비, 의약품 및 건강식품구입비)', '의료기구(구입비, 수리비 등)', '생활용품비(구입비, 수리비, 가구/가전 등)', '이미용비(파마, 염색 등)', '기타'].map(function (l) { return { label: l }; })
              }
            ],
            grandTotal: true
          },
          {
            type: 'amounts', key: 'spendHouse', title: '○ 지출현황 파악 (가구의 수입으로 지출하는 경우)', valueLabel: '월 평균 금액(원)', ratioLabel: '장애인 지출 비율(5점만점)',
            groups: [
              {
                label: '정기지출', items: ['공공요금(임대료, 월세, 관리비 등)', '생활용품비(샴푸, 세제 등)', '생활비(주/부식, 간식 등)', '교통비(대중교통 등)', '통신비(인터넷, 핸드폰 요금 등)', '교육비(학원비, 치료비 등)', '저축(적금, 예금, 주택청약 등)', '금융비용(대출원금, 대출이자 등)', '의료비(병원비, 약값, 건강기능식품 등)', '보험비(생명보험, 손해보험 등)', '용돈(부모님, 자녀 등)', '각종 할부금(자동차 구입 등)', '기타'].map(function (l) { return { label: l }; })
              },
              {
                label: '비정기지출', items: ['경조사비(결혼, 조문 등)', '의류비(의료, 신발 구입비 등)', '문화여가비(여행 등)', '이미용비(파마, 염색 등)', '의료비(의료기구 구입비 및 수리비 등)', '생활비(생활용품 구입비 및 수리비 등)', '기타'].map(function (l) { return { label: l }; })
              }
            ],
            grandTotal: true
          }
        ]
      }
    ]
  };

  var PLAN = {
    id: 'plan',
    title: '미래설계 실천계획서',
    yearly: true,
    header: [{ label: '작성일', key: 'writtenAt', input: 'date' }, { label: '작성자', key: 'writer', input: 'text' }],
    sections: [{
      id: 'p1', title: '',
      blocks: [
        {
          type: 'fields', rows: [
            ta('꿈과 희망', 'dream'), ta('중장기목표', 'longGoal'),
            ta('내가 중요하게 생각하는 것', 'important'), ta('나에게 필요한 것', 'needs'), ta('성공경험', 'success')
          ]
        },
        {
          type: 'grid', key: 'plans', rows: 3, addable: true,
          columns: [
            { key: 'area', label: '영역', input: 'select', options: AREAS, width: '8em' },
            { key: 'goal', label: '단기목표', input: 'textarea' },
            { key: 'action', label: '실천계획', input: 'textarea' },
            { key: 'note', label: '비고', width: '8em' }
          ]
        }
      ]
    }]
  };

  var REVIEW = {
    id: 'review',
    title: '의 행복한 미래 이야기',
    nameInTitle: true,
    yearly: true,
    header: [{ label: '작성일', key: 'writtenAt', input: 'date' }, { label: '작성자', key: 'writer', input: 'text' }],
    sections: [
      {
        id: 'r1', title: '【 {Y}년 돌아보기 】',
        blocks: [
          { type: 'fields', rows: [ta('나의 꿈', 'dream'), ta('중장기 목표', 'longGoal')] },
          {
            type: 'grid', key: 'lookback', title: '미래설계 실천 계획', rows: 3, addable: true,
            columns: [
              { key: 'area', label: '영역', input: 'select', options: AREAS, width: '7.5em' },
              { key: 'goal', label: '단기목표', input: 'textarea' },
              { key: 'plan', label: '활동계획', input: 'textarea' },
              { key: 'story', label: '미래설계 실천 이야기 (변화, 어려움 등)', input: 'textarea' },
              { key: 'happy', label: '나에게 행복했던 순간들 (사진 등)', input: 'textarea' },
              { key: 'score', label: '점수로 평가하기', input: 'select', options: ['1', '2', '3', '4', '5'], width: '6em' }
            ]
          },
          { type: 'note', text: '※ 점수 척도(1~5점)는 기관 기준 확인 필요 — 확정 시 설정값으로 변경' }
        ]
      },
      {
        id: 'r2', title: '【 {Y1}년 달라진 정보 확인하기 】',
        blocks: [
          {
            type: 'fields', rows: [{
              label: '달라진 항목', inputs: [{ key: 'changed', input: 'checks', label: '달라진 항목', options: ['나의 꿈', '나의 강점', '나를 힘나게/힘들게 하는 것', '나와 함께 하고 있는 사람들', '나의 건강', '나의 거주 공간(집)', '나의 하루', '보호자(가족) 지원', '기타'] }]
            }]
          },
          {
            type: 'fields', rows: [
              ta('나의 꿈', 'newDream'), ta('나의 강점', 'newStrength'),
              ta('나를 힘나게 하는 것', 'newEnergy'), ta('나를 힘들게 하는 것', 'newHard'),
              ta('나와 함께 하고 있는 사람들', 'newPeople'), ta('나의 건강', 'newHealth'),
              ta('나의 거주공간 (집)', 'newHome')
            ]
          },
          { type: 'weekly', key: 'newDay', title: '나의 하루', rows: ['나의 하루'] },
          { type: 'fields', rows: [ta('보호자 (가족) 지원', 'newFamily')] }
        ]
      },
      {
        id: 'r3', title: '【 {Y1}년 행복한 삶 실천하기 】',
        blocks: [{
          type: 'grid', key: 'priorities', rowHeader: '우선순위', fixedRows: ['1', '2', '3'],
          columns: [
            { key: 'area', label: '미래설계 희망영역', input: 'select', options: AREAS, width: '9em' },
            { key: 'content', label: '내용', input: 'textarea' },
            { key: 'help', label: '필요한 도움', input: 'textarea' }
          ]
        }]
      }
    ]
  };

  PPP.FORMS = { intro: INTRO, plan: PLAN, review: REVIEW };
  PPP.FORM_ORDER = ['intro', 'plan', 'review'];
  PPP.AREAS = AREAS;
  PPP.DAYS = DAYS;
  PPP.LEVELS = LEVELS;
})(window.PPP = window.PPP || {});
