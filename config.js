/* =====================================================================
 *  게임 설정 파일
 *  - 숫자(제한시간, 점수, 보너스, 아이템 효과, 봉투 개수)는 여기서 바꾸세요.
 *  - 저장 후 브라우저를 새로고침(F5)하면 바로 반영됩니다.
 *  - 규칙 안내 슬라이드도 이 값을 그대로 읽어서 보여줍니다.
 * ===================================================================== */
window.GAME_CONFIG = {
  title: "호그와트 부엉이 편지",
  subtitle: "홍보대사의 밤 · 기숙사 대항전",

  // 기숙사 팀 (순서 = 점수판 표시 순서)
  teams: [
    // gem = 중간 집계 모래시계 속 보석 색 (루비·에메랄드·사파이어·노란 다이아몬드)
    { id: "gryffindor", name: "그리핀도르", crest: "🦁", color: "#9c1c1c", accent: "#f0c75e", gem: "#e0243a" },
    { id: "slytherin",  name: "슬리데린",   crest: "🐍", color: "#1d5a36", accent: "#c9d1d3", gem: "#19b35a" },
    { id: "ravenclaw",  name: "래번클로",   crest: "🦅", color: "#22377a", accent: "#c79a5b", gem: "#2f74ff" },
    { id: "hufflepuff", name: "후플푸프",   crest: "🦡", color: "#b8860b", accent: "#2b2118", gem: "#ffd21f" },
  ],
  membersPerTeam: 10,   // 규칙 안내에 표시만 함

  // 🔐 비공개 점수: 게임 중엔 점수를 잠긴 금고로만 보여주고, 마지막에 금고를 하나씩 열어 공개
  //    (게임 중 사회자 확인용: 노트북에서 Shift 키를 누르고 있는 동안만 점수가 보임)
  hiddenScores: true,
  // ⏳ 중간 집계: 이 바퀴가 끝나면 숫자 없이 보석 모래시계로 대략적인 차이만 보여줌 (0 = 끔)
  midTallyAfterRound: 3,

  // 퀴즈 봉투
  quiz: {
    timeLimit: 15,       // 고른 팀 제한시간(초)
    points: 10,          // 정답 점수 (문제별로 content.js에서 따로 지정 가능)
    stealTimeLimit: 10,  // 스틸 팀 제한시간(초). 0이면 타이머 없이 진행
  },

  // 미션 봉투
  mission: {
    rankPoints: [15, 10, 5, 0], // 1등, 2등, 3등, 4등
    pickerWinBonus: 5,          // 봉투 고른 팀이 1등하면 추가 점수
    timeLimit: 60,              // 미션 타이머(초). 0이면 타이머 버튼 숨김
  },

  // 아이템 봉투  (count = 24장 중 몇 장 넣을지, value = 효과 숫자)
  items: {
    butterbeer: { name: "버터맥주",        icon: "🍺", count: 4, value: 20, desc: "따끈한 버터맥주 한 잔! 점수를 얻는다." },        // +value점
    felix:      { name: "펠릭스 펠리시스", icon: "🧪", count: 2, value: 50, desc: "행운의 물약! 엄청난 행운이 쏟아진다." },          // +value점 (대박 아이템)
    curse:      { name: "저주 주문",       icon: "⚡", count: 3, value: 20, desc: "공격할 팀을 직접 골라 점수를 깎는다." },        // 고른 팀 -value점
    dementor:   { name: "디멘터",          icon: "👻", count: 2, value: 40, desc: "디멘터가 행복을 빨아들였다… 점수를 잃는다." },     // 우리 팀 -value점
    cloak:      { name: "투명 망토",       icon: "🧥", count: 1,            desc: "망토 속엔 아무것도 없었다." },                    // 꽝
  },

  // 🎁 아이템 찬스: 아래 아이템은 상식 문제(content.js의 itemQuizzes)를 먼저 풀어야 함.
  // 맞힌 팀이 봉투 속 아이템을 그대로 받음 (좋은 것이든 디멘터·꽝이든 복불복!)
  // 틀리면 스틸 가능, 스틸까지 실패하면 아이템 소멸. 목록에서 빼면 그 아이템은 문제 없이 즉시 발동.
  itemQuiz: {
    items: ["butterbeer", "felix", "curse", "dementor", "cloak"],
    timeLimit: 15,       // 고른 팀 제한시간(초)
    stealTimeLimit: 10,  // 스틸 팀 제한시간(초)
    points: 10,          // 아이템 문제를 맞힌 팀이 받는 점수 (아이템 효과보다 먼저 적용, 넘겨도 맞힌 팀이 받음)
    allowPass: true,     // 맞힌 팀이 열어보기 전에 다른 팀에게 넘길 수 있음 (뭔지 모르는 채로!)
  },

  // 퀴즈·미션 봉투 개수. (퀴즈 + 미션 + 아이템 합계 = 24 가 되어야 함)
  // 합이 24보다 모자라면 나머지는 퀴즈로 채워집니다.
  envelopeMix: { quiz: 8, mission: 4 },   // + 아이템 12장 = 24

  // true: 게임 시작마다 봉투 내용을 무작위로 섞음
  // false: 아래 fixedLayout대로 고정 (예: A: "quiz", B: "mission", C: "item:curse")
  shuffleEnvelopes: true,
  fixedLayout: null,

  // true: 퀴즈/미션을 content.js 순서대로 꺼냄 / false: 무작위
  questionsInOrder: false,

  manualAdjustStep: 5,  // 점수판 +/- 버튼 한 번에 바뀌는 점수
  sound: true,          // 효과음 (M 키로 켜고 끄기)
};
