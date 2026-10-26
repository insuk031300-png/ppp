# DATA_MODEL.md — 데이터 구조

스키마 버전: **2** (`js/store.js` `SCHEMA_VERSION`)

## 1. 저장소 (IndexedDB)
| 항목 | 값 |
|---|---|
| DB 이름 / 버전 | `sungmin-ppp` / 1 (IndexedDB 구조 버전, 스키마 버전과 별개) |
| object store | `participants`, `documents`, `meetings`, `activities` (keyPath `id`, 하위 3개는 `participantId` 인덱스) |
| `kv` store (keyPath `key`) | `meta` {createdAt, updatedAt, sample}, `settings` {fontScale, lastBackupAt}, `schemaVersion`, `snapshot`(복원 직전 전체 데이터, 선택) |
| 동작 | 시작 시 전체를 메모리로 읽고, 변경은 메모리 반영 후 트랜잭션 큐로 순서대로 기록. 다른 창에는 BroadcastChannel `sungmin-ppp`로 변경 알림 |
| 범위 | 브라우저 출처(origin)별. file:// 실행 시 같은 브라우저·같은 프로필에서 공유. 다른 브라우저·PC와 분리 |

백업 JSON 형식(내보내기 전용):
```json
{ "app": "sungmin-ppp", "schemaVersion": 2,
  "participants": [], "documents": [], "meetings": [], "activities": [],
  "settings": {}, "meta": {}, "exportedAt": "ISO", "counts": { "participants": 14, "...": 0 } }
```
모든 레코드 공통: `id`(string, 접두사+시간+난수), `createdAt`, `updatedAt`(ISO 8601), `deletedAt`(ISO|null), 하위 기록은 `deletedWithParent`(bool, 선택).

## 2. 엔터티
### participant (참여자)
| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| code | string(≤20) | ✅ | `PPP-YYYY-NNN`, 전체(휴지통 포함) 고유 |
| name | string(≤30) | ✅ | |
| gender | '남'\|'여'\|'' | | |
| birthDate | date | | ≤ 오늘 |
| disabilityType | enum | | 지적장애, 자폐성장애, 지체장애, 뇌병변장애, 시각장애, 청각장애, 언어장애, 정신장애, 기타 |
| worker | string(≤20) | ✅ | 담당 사회복지사 |
| startDate | date | ✅ | 지원 연차 기준, ≥ birthDate |
| status | '참여중'\|'보류'\|'종결' | ✅ | |
| parentGroup | ''\|'준비그룹'\|'핵심그룹' | | 보호자 자조활동 그룹 |
| guardianRelation | string(≤10) | | |
| memo | string(≤500) | | 민감정보 금지 |
| steps | { [stepId]: { done: bool, date: date, memo: string(≤100) } } | | §4 |

### meeting (지원회의) — v2 확장
| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| participantId | id | ✅ | → participant |
| status | '예정'\|'완료'\|'취소' | ✅ | v1 데이터는 '완료'로 변환 |
| type | enum(10) | ✅ | 준비상담, 상담, 사전회의, 통합회의, 컨퍼런스회의, 확정회의, 세부계획 협의, 활동평가 회의, 실천과정 평가, 기타 |
| date | date | ✅ | 완료일 때 ≤ 오늘 |
| time | 'HH:MM'\|'' | | |
| place | string(≤60) | | |
| attendeeRoles | string[] | | 당사자, 보호자, 지원자(가족 외), 담당 사회복지사, 시민옹호인, 활동지원사, 관련 기관, 기타 |
| attendees | string(≤200) | | 참석자 메모 (이름은 꼭 필요할 때만) |
| agenda | string(≤1000) | | 안건 |
| content | string(≤3000) | 완료일 때 ✅ | |
| decisions | string(≤1000) | | |
| priorities | 영역[] (≤3, 중복 없음) | | 확정회의 완료 시 |
| nextAction | string(≤200) | | |

### document (서류)
| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| participantId | id | ✅ | |
| formId | 'intro'\|'plan'\|'review' | ✅ | |
| year | int\|null | | intro=null, plan/review=연도(2000~2100) |
| status | '작성중'\|'완료' | ✅ | |
| data | object | ✅ | §3 |
고유: (participantId, formId, year) 당 삭제되지 않은 1건.

### activity (활동·평가)
| 필드 | 타입 | 필수 |
|---|---|---|
| participantId | id | ✅ |
| date | date(≤오늘) | ✅ |
| area | 영역 enum(8) | ✅ |
| kind | '활동기록'\|'월 평가'\|'분기 평가'\|'반기 평가' | ✅ |
| score | '1'~'5'\|'' | 평가일 때 ✅ |
| title | string(≤100) | ✅ |
| partners, content, memo | string | |

### 관계
```
participant 1 ─── N meeting    (status: 예정 → 완료 | 취소)
participant 1 ─── N document   (formId, year)
participant 1 ─── N activity
```
지원회의 상태 전환: `예정 → 완료`(결과 기록), `예정 → 취소`, `완료 → 수정`. 완료 → 예정 되돌림은 허용하나 이미 완료된 단계는 자동 해제하지 않음(진행단계 탭에서 수동).

## 3. 서식 데이터(document.data) 형식
서식 정의 `js/forms.js`.
| 블록 | 저장 형식 | 예 |
|---|---|---|
| fields/group | `data[key] = 값` (checks는 배열) | `"gender": "여"` |
| grid | `data[key] = [ {col: 값} ]` | `"plans": [{"area":"주거","goal":"..."}]` |
| weekly | `data[key][행인덱스][요일]` | `"weeklyNow": {"0": {"월": "어머니"}}` |
| matrix | `data[key]["묶음_항목"] = 0..4` | `"dailyLiving": {"0_0": 4}` |
| checkgrid | `data[key][i] = {checked, content, help}` | |
| compare | `data[key][rowKey] = {now, future, nowDetail, futureDetail, reason}` | |
| amounts | `data[key]["그룹_항목"] = {v, ratio}` | 총계는 계산값(저장 안 함) |
| photo | `data.photo = "data:image/jpeg;base64,..."` (≤480px) | |
⚠️ forms.js 항목 **순서 변경** 시 matrix/amounts 인덱스가 어긋남 → 스키마 버전 증가 + 마이그레이션.

## 4. 단계 정의와 자동 완료 매핑
| 국면 | stepId | 단계 | 자동 완료 트리거 |
|---|---|---|---|
| 준비 | academy | 아카데미 수료 | |
| | prepCounsel | 준비상담 | 회의 「준비상담」 완료 |
| | familyProgram | 가족 지원 프로그램 *(선택, 진행률 제외)* | |
| 계획 | counsel | 상담 | 회의 「상담」 완료 |
| | preMeeting | 사전회의 | 회의 「사전회의」 완료 |
| | integratedMeeting | 통합회의 | 회의 「통합회의」 완료 |
| | conference | 컨퍼런스회의 | 회의 「컨퍼런스회의」 완료 |
| | confirmMeeting | 확정회의 | 회의 「확정회의」 완료 |
| | shortPlan | 단기계획 수립 | 실천계획서 「완료」 저장 |
| 실천 | detailPlan | 세부계획 확인 | 회의 「세부계획 협의」 완료 |
| | practiceActivity | 실천활동 진행 | 활동 기록 저장 |
| | activityEval | 활동평가 | 활동평가 저장, 회의 「활동평가 회의」 완료 |
| 평가 | yearEval | 실천과정 평가 | 행복한 미래 이야기 「완료」, 회의 「실천과정 평가」 완료 |
| 연계 | selfHelp | 미래설계 자조활동 연계 | |
예정·취소 상태의 회의는 단계를 바꾸지 않는다.

## 5. 저장 · 삭제 · 복원 정책
| 동작 | 정책 |
|---|---|
| 저장 | 참여자·회의·활동·단계: 즉시 / 서류: 명시적 저장(Ctrl+S), 미저장 이동·새로고침 경고 |
| 트랜잭션 | 연쇄 삭제·복원·백업 복원·전체 초기화는 단일 readwrite 트랜잭션 |
| 저장 실패 | 오류 토스트(용량 초과 구분). 메모리 상태는 유지되므로 즉시 백업 권장 |
| 삭제 | 소프트 삭제 → 휴지통, 참여자 삭제 시 하위 기록 연쇄 |
| 영구 삭제 | 휴지통에서 확인 후, 참여자는 하위 기록 모두 제거 |
| 보존 기간 | **확인 필요** (기관 기록물 관리 규정·개인정보 보유기간). 자동 파기 없음 |
| 백업 | 수동 JSON 내보내기, 7일 경과 시 대시보드 알림. 권장 주기 확인 필요 |
| 복원 | 전체 교체(병합 없음), 직전 데이터 `kv.snapshot` 1회 보관 |
| 영구 저장 | 시작 시 `navigator.storage.persist()` 요청, 허용 여부를 설정 화면에 표시 |
| 마이그레이션 | `SCHEMA_VERSION` +1, `migrate()`에 변환 추가(v1→v2: 회의 status/attendeeRoles/agenda). 시작 시·복원 시 자동 적용. 상위 버전 데이터는 거부 |
| 이전 저장소 이관 | IndexedDB가 비어 있고 localStorage `sungmin-ppp-db`가 있으면 변환·저장 후 localStorage 키 삭제 |
