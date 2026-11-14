/* =====================================================================
 *  문제 · 미션 · 동점 결승 문제
 *  - 자유롭게 고치거나 추가하세요. (쉼표, 따옴표 짝만 맞추면 됩니다)
 *  - 해리포터를 안 봐도 풀 수 있게, "분위기만 마법"이고 내용은 상식·영어·센스 문제입니다.
 *
 *  퀴즈 항목
 *    q     : 문제 (화면에 크게)
 *    hint  : 문제 아래 작은 글씨 (한국어 풀이·진행 방법). 빼도 됨
 *    a     : 정답 (정답 공개 때 표시)
 *    team  : true 이면 "👥 함께 퀴즈" — 팀 전원이 같이 푸는 문제
 *    time  : 이 문제만 제한시간(초). 0 이면 타이머 없음. 안 쓰면 config.js 기본값(15초)
 *    points: 이 문제만 점수 다르게. 안 쓰면 기본값(10점)
 *    must  : true 이면 매 판 반드시 출제 (나머지 자리는 무작위)
 *
 *  퀴즈 봉투 수(기본 12장)보다 문제가 많으면 그중 무작위로 나옵니다.
 * ===================================================================== */
window.GAME_CONTENT = {
  quizzes: [
    /* ---------- ⚡ 순발력 퀴즈 (15초, 누구나) ---------- */
    { q: "Unscramble the magic word:  L · W · O", hint: "알파벳 순서를 바꾸면? 마법 학교 편지를 배달하는 새!", a: "OWL (부엉이)" },
    { q: "Unscramble the magic word:  G · I · M · A · C", hint: "알파벳 순서를 바꾸면?", a: "MAGIC (마법)" },
    { q: "What has hands but can't clap?", hint: "손은 있는데 박수를 못 치는 것은?", a: "A clock (시계)" },
    { q: "What gets wetter the more it dries?", hint: "말릴수록 점점 더 젖는 것은?", a: "A towel (수건)" },
    { q: "What has keys but can't open a door?", hint: "열쇠(key)가 있는데 문을 못 여는 것은?", a: "A piano (피아노) · 키보드도 정답" },
    { q: "Which is heavier: 1 kg of feathers or 1 kg of gold?", hint: "깃털 1kg vs 금 1kg, 더 무거운 것은?", a: "Same! 둘 다 1kg" },
    { q: "The owl ______ to the castle yesterday.  (fly)", hint: "빈칸에 들어갈 fly의 과거형은?", a: "flew" },
    { q: "One mouse, two ______.", hint: "마법 실험실에 쥐가 두 마리! mouse의 복수형은?", a: "mice" },
    { q: "Which one does NOT belong?\nowl · cat · broom · rat", hint: "하나만 종류가 다른 것은?", a: "broom (빗자루) — 나머지는 동물" },
    { q: "⏰ = 💰", hint: "이모지가 나타내는 유명한 영어 속담은?", a: "Time is money." },
    { q: "🍎 a day keeps the 👨‍⚕️ away.", hint: "이모지를 영어 단어로 바꿔 문장을 완성하세요", a: "An apple a day keeps the doctor away." },
    { q: "A wizard has 3 owls.\nEach owl delivers 4 letters a day.\nHow many letters in 2 days?", hint: "부엉이 3마리가 하루에 편지를 4통씩 배달하면, 이틀 동안 몇 통?", a: "24 letters" },
    { q: "What sound does an owl make in English?", hint: "영어로 부엉이 울음소리는?", a: "Hoot (후트)" },
    { q: "What is the name of the magic school on our title screen?", hint: "힌트: 게임 첫 화면을 떠올려 보세요 🏰", a: "Hogwarts (호그와트)" },

    /* ---------- 🤪 한국식 넌센스 퀴즈 (15초, 살짝 생각해야 하는 난이도) ---------- */
    { q: "세상에서 가장 쉬운 숫자는?", hint: "넌센스! 🤔 숫자를 소리 내어 읽어 보세요", a: "190,000 (십구만 → 쉽구만)" },
    { q: "전화로 세운 건물은?", hint: "넌센스! 🤔", a: "콜로세움 (call로 세움)" },
    { q: "왕이 궁에 들어가기 싫을 때 하는 말은?", hint: "넌센스! 🤔", a: "궁시렁궁시렁 (궁 싫어 궁 싫어)" },
    { q: "신이 화나면?", hint: "넌센스! 🤔", a: "신발끈 (신 발끈)" },
    { q: "세상에서 가장 지루한 중학교는?", hint: "넌센스! 🤔", a: "로딩중 (loading 중)" },
    { q: "도둑이 가장 싫어하는 아이스크림은?", hint: "넌센스! 🤔", a: "누가바 (누가 봐!)" },
    { q: "할아버지가 가장 좋아하는 돈은?", hint: "넌센스! 🤔", a: "할머니 (할머 money)" },
    { q: "비가 1시간 동안 내리면?", hint: "넌센스! 🤔 TV 프로그램 이름", a: "추적 60분 (비가 추적추적)" },
    { q: "사과가 웃으면?", hint: "넌센스! 🤔", a: "풋사과 (풋!)" },

    /* ---------- 👥 함께 퀴즈 (팀 전원 참여, 시간 넉넉히) ---------- */
    { team: true, time: 30,
      q: "Make the word  O · W · L  with your bodies!",
      hint: "팀 전원이 몸으로 알파벳 O, W, L 세 글자를 만들기 · 사회자가 알아보면 성공",
      a: "성공 / 실패는 사회자 판정!" },
    { team: true, time: 30,
      q: "Count from 1 to 10 in English — together!",
      hint: "순서 정하지 말고 아무나 일어나며 \"One!\" \"Two!\"… 한 사람당 한 번 · 두 명이 동시에 외치면 처음부터 · 10까지 가면 성공",
      a: "\"Ten!\"까지 성공하면 정답" },
    { team: true, time: 20,
      q: "Show exactly 23 fingers!",
      hint: "팀원들이 손가락을 펴서 합계를 정확히 23개로 · 사회자가 세어 확인",
      a: "정확히 23개면 성공" },
    { team: true, time: 40,
      q: "Say 7 English words that start with  M",
      hint: "팀원이 한 명씩 돌아가며 M으로 시작하는 영어 단어 말하기 · 같은 사람 연속 X, 중복 X",
      a: "예) magic, moon, mouse, music, money, milk, map" },
    { team: true, time: 45,
      q: "English word chain: OWL → L… → ?",
      hint: "영어 끝말잇기! owl부터 시작해서 팀원 5명이 차례로 이어가면 성공 (예: owl → lemon → night …)",
      a: "5명 연결 성공하면 정답" },
    { team: true, time: 30,
      q: "Spell-relay:  Ex · pel · li · ar · mus!",
      hint: "팀원 5명이 한 음절씩 이어서 주문 완성! 막히거나 순서 틀리면 처음부터",
      a: "\"Ex-pel-li-ar-mus!\" 끊김 없이 성공하면 정답" },
    { team: true, time: 30,
      q: "Charades!  Guess the word in English",
      hint: "사회자가 대표 1명에게 귓속말로 단어를 알려줌 → 대표가 말없이 몸으로 표현 → 팀원이 영어로 맞히기",
      a: "dragon (드래곤)  ※ 사회자 귓속말용 정답" },
    { team: true, time: 0,
      q: "Team photo pose: \"The Sorting Hat!\"",
      hint: "10초 안에 팀 전원이 '마법 모자' 포즈로 단체 사진 자세! 가장 개성 있으면 성공 · 사회자 판정 (타이머 없음)",
      a: "사회자 마음에 들면 정답 📸" },

    /* ---------- 🗣️ 줄줄이 말해요 (팀 단합) ----------
       팀원이 한 명씩 돌아가며 하나씩 외치기 · 같은 사람 연속 X · 중복/틀림/5초 이상 막히면 끝
       목표 개수를 채우면 성공. a에 예시 정답을 적어 두었으니 판정할 때 참고하세요. */
    { team: true, must: true, time: 40,
      q: "🍗 줄줄이 말해요: 치킨집 브랜드 10개!",
      hint: "팀원이 한 명씩 돌아가며 치킨 브랜드 이름 외치기 · 중복·막힘(5초) 없이 10개면 성공",
      a: "교촌, BBQ, BHC, 굽네, 네네, 처갓집, 페리카나, 멕시카나, 호식이두마리, 또래오래, 노랑통닭, 60계, 푸라닭, 지코바, 자담치킨, 순살만공격, 바른치킨, 깐부치킨 …" },
    { team: true, must: true, time: 40,
      q: "🎓 줄줄이 말해요: 인천대학교 학과 8개!",
      hint: "팀원이 한 명씩 돌아가며 인천대에 있는 학과(학부) 이름 외치기 · 중복·막힘(5초) 없이 8개면 성공",
      a: "예) 국어국문, 영어영문, 중어중국, 일본지역문화, 수학, 물리, 화학, 해양, 패션산업, 경영, 경제, 행정, 정치외교, 사회복지, 신문방송, 문헌정보, 기계공학, 전기공학, 전자공학, 컴퓨터공학, 정보통신공학, 도시공학, 생명과학, 체육교육, 유아교육, 디자인, 공연예술, 법학 … (학과 개편이 있을 수 있으니 애매하면 학생들 의견으로 판정!)" },
    { team: true, must: true, time: 40,
      q: "🎤 줄줄이 말해요: 여자 아이돌 10개!",
      hint: "팀원이 한 명씩 돌아가며 걸그룹 이름 외치기 · 중복·막힘(5초) 없이 10개면 성공",
      a: "소녀시대, 원더걸스, 카라, 2NE1, 씨스타, 에이핑크, 트와이스, 레드벨벳, 블랙핑크, 마마무, 여자친구, 오마이걸, (여자)아이들, 있지, 에스파, 아이브, 르세라핌, 뉴진스, 케플러, 엔믹스, 아일릿, 베이비몬스터, 키스오브라이프 …" },
  ],

  missions: [
    {
      title: "집합 주문! Gather!",
      desc: "사회자가 외치는 조건대로 팀원을 모아 무대 앞으로!",
      how: "예) \"안경 쓴 사람 2명 + 운동화 신은 사람 3명!\" — 조건을 정확히 맞춰 먼저 도착한 순서대로 순위",
      time: 0,
    },
    {
      title: "분류 모자의 줄 세우기",
      desc: "팀원 10명이 말하지 않고 생일 순서(1월 1일 → 12월 31일)로 한 줄 서기!",
      how: "말하면 실격 · 손짓 OK · 완성되면 다 같이 \"Magic!\" 외치기 → 사회자 확인 후 순위",
      time: 90,
    },
    {
      title: "거대한 뱀을 만들어라",
      desc: "팀원들의 소지품(신발, 겉옷, 가방…)을 바닥에 이어 가장 긴 뱀 만들기!",
      how: "제한시간 종료 후 길이를 비교해 순위 · 사람 몸은 뱀에 포함 불가",
      time: 60,
    },
    {
      title: "부엉이 우편 릴레이",
      desc: "맨 앞 사람에게 영어 문장을 보여주고, 귓속말로 끝까지 전달!",
      how: "예) \"The brave owl flew over the moon.\" — 마지막 사람이 정확히 말한 순서대로 순위",
      time: 60,
    },
    {
      title: "스펠링 비 (Spelling Bee)",
      desc: "사회자가 읽어주는 영어 단어를 종이에 적어 번쩍!",
      how: "예) castle / dragon / wizard / potion — 정확한 철자를 먼저 든 순서대로 순위 · 종이·펜 필요",
      time: 0,
    },
    {
      title: "얼음! 석화 주문",
      desc: "음악이 멈추면 팀원 전원 그대로 얼음! 움직인 사람은 탈락",
      how: "3~4라운드 진행 후 남은 인원이 많은 팀부터 순위 · 음악 필요",
      time: 0,
    },
  ],

  // 동점 결승 문제 (먼저 맞힌 팀이 우승) — 짧고 정답이 하나인 문제
  tiebreakers: [
    { q: "Unscramble:  R · A · W · D · I · Z", a: "WIZARD (마법사)" },
    { q: "What has a neck but no head?", a: "A bottle (병)" },
    { q: "3 owls and 2 cats — how many legs in total?", a: "14 (6 + 8)" },
    { q: "What can you catch but never throw?", a: "A cold (감기)" },
  ],
};
