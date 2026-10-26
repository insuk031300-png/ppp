# CLAUDE.md — AI 개발 지침

성민복지관 **지원회의(평생과정설계) 사례관리 지원 웹앱** 작업 시 반드시 따르는 규칙입니다. 작업 전 이 파일과 `PROJECT_SPEC.md`, `DATA_MODEL.md`, `TEST_PLAN.md`를 먼저 읽으세요.

## 1. 프로젝트 목적
- 장애인복지관 평생과정설계 사업에서 **지원회의 과정(상담 → 사전 → 통합 → 컨퍼런스 → 확정회의 → 단기계획)** 을 효율화하고, 당사자의 정보·서류·회의·실천 활동을 기록·저장한다.
- 사용자: 사회복지사 약 10명. 각자 **기관 PC에서 로컬 실행**.
- 서류는 기관 HWP 원본(자기소개서 / 미래설계 실천계획서 / 행복한 미래 이야기)을 **항목·순서·선택지 그대로** 전자화한다.
- 당사자의 존엄성과 자기결정권을 존중한다: 서식 문구는 당사자 1인칭("나")을 유지하고, 회의 기록은 "당사자의 말과 선택 중심"으로 안내한다. 결함 중심 표현을 추가하지 않는다.

## 2. 기술 스택
- HTML + CSS + JavaScript (프레임워크·빌드 도구·외부 CDN 없음)
- 저장: **IndexedDB** (DB `sungmin-ppp`, object store: participants / documents / meetings / activities / kv)
- 실행: 기관 PC에서 `index.html` 또는 단일 파일 `dist/성민-평생과정설계.html` 더블클릭 (file://). 서버 불필요
- 보안: `<meta>` CSP (`script-src 'self'`, 단일 파일은 SHA-256 해시)
- 라이트 모드 전용, 디자인 토큰은 `css/style.css` `:root`
- `vercel.json`은 웹 배포를 선택할 경우를 위한 보조 설정이며 기본 배포 방식이 아니다

## 3. 파일 구조
```
index.html               앱 셸 (사이드바, 상단바, main, CSP meta)
css/style.css            디자인 토큰 · 레이아웃 · 서식(종이 양식) · 인쇄(@media print)
js/ui.js                 esc(), 토스트, 모달(포커스 가두기, onOpen/onOk), 다운로드
js/forms.js              서식 스키마 (HWP 원본 → 블록 정의). 서식 변경은 이 파일만 수정
js/store.js              IndexedDB 계층, 메모리 캐시, 단계(PHASES/STEPS), 도메인 규칙, 백업·복원, 마이그레이션
js/sample.js             가상 샘플 데이터 생성기
js/charts.js             SVG 도넛·막대 차트 (+표 보기, 툴팁)
js/formview.js           서식 렌더러 (edit / view 모드) + 입력 바인딩
js/app.js                해시 라우터와 모든 화면 (대시보드, 참여자, 지원회의, 서식, 휴지통, 설정)
scripts/build-single.js  단일 HTML 빌드 (dist/, CSP 해시 자동 계산)
vercel.json              (선택) 웹 배포 시 보안 헤더
```
스크립트 로드 순서: ui → forms → store → sample → charts → formview → app (전역 `window.PPP`).

## 4. 코딩 규칙
- 모든 사용자 입력·저장값을 HTML에 넣을 때 **반드시 `PPP.ui.esc()`**. `innerHTML`에 이스케이프 없는 값 금지.
- 인라인 `<script>`, `on*=` 속성, `eval`, `new Function`, 외부 스크립트·폰트 금지 (CSP).
- 데이터 접근은 `PPP.store` API로만. 화면 코드에서 `indexedDB`/`localStorage` 직접 접근 금지.
- store 쓰기 규칙: 메모리 캐시를 먼저 바꾸고 `write(ops)`로 **한 트랜잭션**에 기록. 여러 레코드가 함께 바뀌는 작업(연쇄 삭제, 복원)은 반드시 하나의 `write` 호출로.
- 화면 이동 전 저장 완료가 필요한 테스트·기능은 `PPP.store.flush()`를 기다린다.
- 삭제는 **소프트 삭제**(`deletedAt`) → 휴지통 → 영구 삭제의 2단계.
- 새 서식 블록 타입은 `formview.js` `BLOCKS`에 edit/view 모드를 **모두** 구현하고 인쇄 CSS 확인.
- 모든 입력 요소는 `<label>` 또는 `aria-label`. 선택지 묶음은 `fieldset/legend`. 표는 `scope` 있는 `<th>`.
- 차트 범주색은 `--series-1..7` 고정 순서. 색만으로 구분 금지 (범례 수치 + 표 보기).
- 날짜 `YYYY-MM-DD`, 시간 `HH:MM`, 금액은 원 단위 숫자.
- 들여쓰기 2칸, 세미콜론, ES5 호환 문법 위주 (IIFE 모듈 패턴 유지).

## 5. 금지사항
- 실제 이용자 이름·연락처·주민번호·진단명 등을 코드·샘플·문서·테스트·커밋에 넣지 않는다. 샘플은 `sample.js`의 가상 데이터만.
- 주민등록번호 필드를 추가하지 않는다.
- 확인되지 않은 법령·평가지표·보존기간을 사실처럼 단정하지 않는다 → "확인 필요".
- 백업 JSON 파일을 저장소에 커밋하지 않는다 (`.gitignore`).
- 로컬 저장인데 "동기화", "암호화", "다중 사용자 권한"을 제공한다고 안내하지 않는다.
- `[입력 필요]`였던 업무 규칙(PROJECT_SPEC.md §9)을 임의로 확정 구현하지 않는다.

## 6. 완료 기준 (Definition of Done)
1. `node --check js/*.js` 통과, 브라우저 콘솔 오류·CSP 위반 0건 (index.html과 단일 파일 둘 다)
2. TEST_PLAN.md의 해당 기능 시나리오(정상·오류·경계값) 통과
3. 데이터 변경 기능은 **새로고침 후에도 유지**되는지 확인 (IndexedDB 기록)
4. 키보드만으로 조작 가능 (Tab 순서, 포커스 표시, 모달 ESC)
5. 360px 폭에서 페이지 가로 스크롤 없음 (서식 표는 표 내부 스크롤 허용)
6. 서식·회의록 변경 시 인쇄 미리보기(PDF) 확인
7. 데이터 구조 변경 시 `SCHEMA_VERSION` 증가 + `migrate()` 작성 + 이전 버전 백업 복원 테스트
8. 관련 문서 갱신 + `node scripts/build-single.js` 재빌드

## 7. 변경 시 문서 갱신 규칙
| 변경 내용 | 갱신할 문서 |
|---|---|
| 기능 추가·변경 | FEATURES.md, PROJECT_SPEC.md(요구사항·수용 기준), README.md(사용법), TEST_PLAN.md |
| 데이터 필드·컬렉션 | DATA_MODEL.md, `store.js` SCHEMA_VERSION/migrate, TEST_PLAN.md(마이그레이션) |
| 서식(HWP) 변경 | `forms.js`, DATA_MODEL.md §3, FEATURES.md F-05 |
| 화면·컴포넌트 | UI_UX.md |
| 저장 방식·백업·보안 | SECURITY.md, README.md |
| 일정·우선순위 | DEVELOPMENT_PLAN.md |
문서 간 용어는 `PROJECT_SPEC.md` §7 용어집을 따른다.
