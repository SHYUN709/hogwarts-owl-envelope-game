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
    { id: "gryffindor", name: "그리핀도르", crest: "🦁", color: "#9c1c1c", accent: "#f0c75e" },
    { id: "slytherin",  name: "슬리데린",   crest: "🐍", color: "#1d5a36", accent: "#c9d1d3" },
    { id: "ravenclaw",  name: "래번클로",   crest: "🦅", color: "#22377a", accent: "#c79a5b" },
    { id: "hufflepuff", name: "후플푸프",   crest: "🦡", color: "#b8860b", accent: "#2b2118" },
  ],
  membersPerTeam: 10,   // 규칙 안내에 표시만 함

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
    butterbeer: { name: "버터맥주",        icon: "🍺", count: 2, value: 10, desc: "따끈한 버터맥주 한 잔! 점수를 얻는다." },        // +value점
    felix:      { name: "펠릭스 펠리시스", icon: "🧪", count: 1, value: 2,  desc: "행운의 물약! 지금 점수가 두 배가 된다." },      // 현재 점수 × value
    curse:      { name: "저주 주문",       icon: "⚡", count: 2, value: 10, desc: "공격할 팀을 직접 골라 점수를 깎는다." },        // 고른 팀 -value점
    dementor:   { name: "디멘터",          icon: "👻", count: 1,            desc: "디멘터가 행복을 빨아들였다… 점수가 0점이 된다." }, // 우리 팀 0점
    cloak:      { name: "투명 망토",       icon: "🧥", count: 1,            desc: "망토 속엔 아무것도 없었다." },                    // 꽝
  },

  // 퀴즈·미션 봉투 개수. (퀴즈 + 미션 + 아이템 합계 = 24 가 되어야 함)
  // 합이 24보다 모자라면 나머지는 퀴즈로 채워집니다.
  envelopeMix: { quiz: 12, mission: 5 },

  // true: 게임 시작마다 봉투 내용을 무작위로 섞음
  // false: 아래 fixedLayout대로 고정 (예: A: "quiz", B: "mission", C: "item:curse")
  shuffleEnvelopes: true,
  fixedLayout: null,

  // true: 퀴즈/미션을 content.js 순서대로 꺼냄 / false: 무작위
  questionsInOrder: false,

  manualAdjustStep: 5,  // 점수판 +/- 버튼 한 번에 바뀌는 점수
  sound: true,          // 효과음 (M 키로 켜고 끄기)
};
