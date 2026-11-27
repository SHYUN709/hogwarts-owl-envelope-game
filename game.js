/* 호그와트 부엉이 편지 – 게임 로직 */
(() => {
  "use strict";
  const C = window.GAME_CONFIG;
  const T = window.GAME_CONTENT;
  const TEAMS = C.teams;
  const N = TEAMS.length;
  const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWX".split("");
  const TOTAL = LETTERS.length;
  const ROUNDS = Math.round(TOTAL / N);
  const SAVE_KEY = "hp-owl-envelope-game-v1";
  const ITEM_KEYS = ["butterbeer", "felix", "curse", "polyjuice", "timeturner", "dementor", "cloak"];
  const TYPE_ICON = { quiz: "📜", mission: "⚔️" };

  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const range = (n) => Array.from({ length: n }, (_, i) => i);
  const tStyle = (i) => `--color:${TEAMS[i].color};--accent:${TEAMS[i].accent}`;
  const tName = (i) => TEAMS[i].name;
  // game-icons.net SVG (vendor/icons.js). 파일이 없으면 이모지로 대체
  const gi = (key, fallback) => window.GAME_ICONS && GAME_ICONS[key]
    ? `<svg class="gi" viewBox="0 0 512 512" aria-hidden="true"><path d="${GAME_ICONS[key]}"/></svg>` : fallback;
  const crest = (i) => gi(TEAMS[i].id, TEAMS[i].crest);
  const itemIcon = (k) => gi(k, C.items[k].icon);
  // 받침 있으면 a(이/은), 없으면 b(가/는)
  const josa = (w, a, b) => { const c = String(w).charCodeAt(String(w).length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 ? a : b; };

  let S = null;            // 저장되는 게임 상태
  let history = [];        // 되돌리기용 스냅샷
  let view = "title";
  let modal = null;        // 봉투 진행 중 임시 상태 (확정 전에는 저장 안 됨)
  let rulesSlide = -1;
  let shown = null;        // 점수판에 표시된 점수 (애니메이션용)
  let soundOn = C.sound !== false;
  let drawing = false;
  let mixWarning = "";

  /* ====================== 아이템 문구 ====================== */
  function itemShort(k) {
    const it = C.items[k];
    switch (k) {
      case "butterbeer": return `+${it.value}점`;
      case "felix": return `+${it.value}점 대박!`;
      case "curse": return `다른 팀 -${it.value}점`;
      case "polyjuice": return "고른 팀과 점수 바꾸기";
      case "timeturner": return "보관 → 다른 팀 문제 먼저 답하기";
      case "dementor": return `우리 팀 -${it.value}점`;
      default: return "꽝! 아무 일도 없음";
    }
  }

  /* ====================== 봉투 구성 ====================== */
  function buildEnvelopes() {
    let types = [];
    if (!C.shuffleEnvelopes && C.fixedLayout) {
      types = LETTERS.map((L) => C.fixedLayout[L] || "quiz");
    } else {
      ITEM_KEYS.forEach((k) => { for (let i = 0; i < (C.items[k].count || 0); i++) types.push("item:" + k); });
      for (let i = 0; i < (C.envelopeMix.mission || 0); i++) types.push("mission");
      for (let i = 0; i < (C.envelopeMix.quiz || 0); i++) types.push("quiz");
      while (types.length < TOTAL) types.push("quiz");
      types = shuffle(types).slice(0, TOTAL);
    }
    return LETTERS.map((L, i) => {
      const [type, item] = types[i].split(":");
      return { letter: L, type, item: item || null, openedBy: null, summary: "" };
    });
  }

  function checkMix() {
    const items = ITEM_KEYS.reduce((s, k) => s + (C.items[k].count || 0), 0);
    const sum = items + (C.envelopeMix.quiz || 0) + (C.envelopeMix.mission || 0);
    if (C.shuffleEnvelopes || !C.fixedLayout) {
      if (sum > TOTAL) mixWarning = `config.js 확인: 퀴즈+미션+아이템 = ${sum}장으로 24장을 넘어요. 일부가 빠집니다.`;
      else if (sum < TOTAL) mixWarning = `config.js 안내: 봉투 합계가 ${sum}장이라 나머지 ${TOTAL - sum}장은 퀴즈로 채웁니다.`;
    }
  }

  // 퀴즈 출제 순서: must:true 문제는 이번 판 퀴즈 봉투 안에 반드시 포함
  function buildQuizOrder(quizEnvCount, list = T.quizzes) {
    const all = range(list.length);
    const must = all.filter((i) => list[i].must);
    const others = all.filter((i) => !list[i].must);
    const pool = C.questionsInOrder ? others : shuffle(others);
    const k = Math.max(0, quizEnvCount - must.length);
    const picked = must.concat(pool.slice(0, k));
    return (C.questionsInOrder ? picked.sort((a, b) => a - b) : shuffle(picked)).concat(pool.slice(k));
  }

  function newGame() {
    const qn = T.quizzes.length, mn = T.missions.length;
    const envs = buildEnvelopes();
    if (T.quizzes.filter((q) => q.must).length > envs.filter((e) => e.type === "quiz").length)
      toast("⚠ 꼭 출제할 문제가 퀴즈 봉투 수보다 많아요 (config.js 확인)");
    S = {
      phase: "draw",
      order: null,
      turn: 0,
      scores: range(N).map(() => 0),
      picks: range(N).map(() => 0),
      envs,
      quizOrder: qn ? buildQuizOrder(envs.filter((e) => e.type === "quiz").length) : [],
      quizPtr: 0,
      missionOrder: mn ? buildQuizOrder(envs.filter((e) => e.type === "mission").length, T.missions) : [],
      itemQuizOrder: shuffle(range((T.itemQuizzes || []).length)),
      itemQuizPtr: 0,
      missionPtr: 0,
      tbPtr: 0,
      tickets: range(N).map(() => 0),   // ⏳ 시간 돌리개 보유 개수
      tieWinner: null,
      log: [],
    };
    history = [];
    shown = S.scores.slice();
    save();
  }

  /* ====================== 저장 / 되돌리기 ====================== */
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ S, history })); } catch (e) { /* 저장 불가 환경 무시 */ }
  }
  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d && d.S && d.S.envs && d.S.envs.length === TOTAL && d.S.scores.length === N) { S = d.S; history = d.history || []; }
    } catch (e) { /* 무시 */ }
  }
  function commit(fn) {
    history.push(JSON.stringify(S));
    if (history.length > 80) history.shift();
    fn();
    save();
  }
  function undo() {
    if (modal) { closeModal(); toast("봉투를 닫았어요 (아직 반영 전이라 그대로 남아 있어요)"); return; }
    if (!history.length) { toast("되돌릴 기록이 없어요"); return; }
    S = JSON.parse(history.pop());
    save();
    view = S.phase === "end" ? "end" : S.phase === "draw" ? "draw" : "board";
    render();
    toast("↶ 한 단계 되돌렸어요");
  }

  const clamp0 = (v) => Math.max(0, Math.round(v));
  const curTeam = () => S.order[S.turn % N];

  /* ====================== 효과음 (파일 없이 합성) ====================== */
  let actx = null;
  function ac() {
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (actx.state === "suspended") actx.resume();
    return actx;
  }
  function tone(f, dur = 0.2, type = "sine", vol = 0.18, at = 0, slideTo = null) {
    if (!soundOn) return;
    const a = ac(); if (!a) return;
    const t = a.currentTime + at;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol * (C.soundVolume ?? 1), t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t); o.stop(t + dur + 0.05);
  }
  const sfx = {
    pick: () => { tone(660, 0.12, "triangle"); tone(990, 0.15, "triangle", 0.12, 0.08); },
    tick: () => tone(1200, 0.06, "square", 0.06),
    buzz: () => { tone(160, 0.6, "sawtooth", 0.16); tone(120, 0.6, "sawtooth", 0.12, 0.05); },
    correct: () => [523, 659, 784].forEach((f, i) => { tone(f, 0.5, "triangle", 0.14, i * 0.1); tone(f * 2, 0.5, "sine", 0.06, i * 0.1); }),
    wrong: () => { tone(330, 0.25, "square", 0.08); tone(247, 0.4, "square", 0.08, 0.2); },
    steal: () => { tone(300, 0.5, "sawtooth", 0.08, 0, 1400); tone(1400, 0.25, "triangle", 0.1, 0.45); },
    fanfare: () => [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i === 6 ? 0.9 : 0.22, "triangle", 0.15, [0, .15, .3, .45, .7, .85, 1.05][i])),
    dark: () => { tone(220, 1.2, "sawtooth", 0.1, 0, 55); tone(233, 1.2, "sine", 0.1, 0, 60); },
    sparkle: () => range(6).forEach((i) => tone(1500 + Math.random() * 1500, 0.15, "sine", 0.05, i * 0.06)),
    zap: () => { tone(1800, 0.3, "sawtooth", 0.1, 0, 200); tone(90, 0.4, "square", 0.08, 0.15); },
    open: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.35, "sine", 0.14, i * 0.09)),
    potion: () => { sfx.sparkle(); sfx.correct(); },
    coin: () => { tone(1975, 0.07, "square", 0.045); tone(2637, 0.18, "sine", 0.07, 0.05); },
    drum: () => range(10).forEach((i) => tone(110 + (i % 2) * 8, 0.09, "triangle", 0.12, i * 0.09)),
    vault: () => { tone(220, 0.15, "square", 0.08); tone(160, 0.35, "sawtooth", 0.07, 0.12); [784, 988, 1319].forEach((f, i) => tone(f, 0.4, "triangle", 0.12, 0.45 + i * 0.1)); },
  };
  // config.sounds 에 있는 효과음은 파일(vendor/sounds)로 재생, 파일을 못 읽으면 위 합성음으로 대체
  const synthSfx = { ...sfx };   // 파일로 바꾸기 전 원래 합성음 (순서 추첨에서 사용)
  Object.entries(C.sounds || {}).forEach(([k, file]) => {
    const synth = sfx[k];
    if (!synth || !file) return;
    sfx[k] = () => {
      if (!soundOn) return;
      const a = new Audio("vendor/sounds/" + file);
      a.volume = Math.min(1, C.soundFileVolume ?? C.soundVolume ?? 1);
      a.play().catch(synth);
    };
  });

  /* ====================== 연출 ====================== */
  function burst(x, y, color = "#e8c46a", n = 28) {
    const fx = $("#fx");
    for (let i = 0; i < n; i++) {
      const s = document.createElement("div");
      s.className = "spark";
      const ang = Math.random() * Math.PI * 2, dist = 80 + Math.random() * 220;
      s.style.left = x + "px"; s.style.top = y + "px";
      s.style.setProperty("--x", Math.cos(ang) * dist + "px");
      s.style.setProperty("--y", Math.sin(ang) * dist + "px");
      s.style.setProperty("--c", Math.random() < 0.5 ? color : "#fff3c4");
      s.style.setProperty("--d", 0.9 + Math.random() * 0.9 + "s");
      fx.appendChild(s);
      setTimeout(() => s.remove(), 2000);
    }
  }
  // canvas-confetti (vendor/confetti.browser.js) 금색 꽃가루. 파일이 없으면 조용히 건너뜀
  function goldConfetti(big) {
    if (!window.confetti) return;
    const o = { colors: ["#ffd75e", "#e8c46a", "#fff3c4", "#b8892f"], zIndex: 120, disableForReducedMotion: true };
    confetti({ ...o, particleCount: big ? 160 : 90, spread: big ? 100 : 70, origin: { y: 0.6 } });
    if (big) setTimeout(() => {
      confetti({ ...o, particleCount: 80, angle: 60, spread: 60, origin: { x: 0, y: 0.7 } });
      confetti({ ...o, particleCount: 80, angle: 120, spread: 60, origin: { x: 1, y: 0.7 } });
    }, 300);
  }
  function burstOn(el, color, n) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, color, n);
  }
  function flash(color) {
    const f = document.createElement("div");
    f.className = "flash"; f.style.background = color;
    document.body.appendChild(f); setTimeout(() => f.remove(), 800);
  }
  let toastTimer = 0;
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
  }

  /* ====================== 비공개 점수 (잠긴 금고) ====================== */
  // 게임 중엔 총점을 숨기고, 결과 발표에서 금고를 열면(S.revealed) 공개
  const hiddenMode = () => C.hiddenScores !== false && !!S && !S.revealed;
  function syncHideClass() { document.body.classList.toggle("hide-scores", hiddenMode()); }
  let revealStep = 0;   // 결과 발표에서 몇 개의 금고를 열었는지

  // 금화가 날아가는 연출: d>0 이면 화면 가운데 → 팀 금고로, d<0 이면 금고에서 우수수 쏟아짐
  function coinFly(i, d) {
    const card = document.querySelector(`.team-card[data-team="${i}"]`);
    if (!card || !d) return;
    const r = card.getBoundingClientRect();
    const cx = r.left + r.width * 0.78, cy = r.top + r.height / 2;
    const n = Math.max(1, Math.min(8, Math.round(Math.abs(d) / 10)));
    for (let k = 0; k < n; k++) {
      const c = document.createElement("div");
      c.className = "coin coin-fly";
      document.body.appendChild(c);
      const sx = d > 0 ? innerWidth / 2 + (Math.random() - 0.5) * 240 : cx;
      const sy = d > 0 ? innerHeight * 0.55 + (Math.random() - 0.5) * 120 : cy;
      const ex = d > 0 ? cx : cx + (Math.random() - 0.5) * 260;
      const ey = d > 0 ? cy : cy + 220 + Math.random() * 160;
      const a = c.animate([
        { transform: `translate(${sx}px,${sy}px) scale(1) rotateY(0deg)`, opacity: 1 },
        { transform: `translate(${ex}px,${ey}px) scale(${d > 0 ? 0.55 : 0.8}) rotateY(720deg)`, opacity: d > 0 ? 1 : 0 },
      ], { duration: 650 + k * 40, delay: k * 110, easing: d > 0 ? "cubic-bezier(.4,0,.6,1)" : "cubic-bezier(.3,.1,.7,1)", fill: "forwards" });
      a.onfinish = () => {
        c.remove();
        if (d > 0) { sfx.coin(); card.classList.remove("vault-bump"); void card.offsetWidth; card.classList.add("vault-bump"); }
      };
    }
    if (d < 0) { sfx.dark(); card.classList.remove("vault-shake"); void card.offsetWidth; card.classList.add("vault-shake"); }
  }

  /* ====================== 화면 전환 ====================== */
  function render() {
    syncHideClass();
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    $("#screen-" + view).classList.add("active");
    if (view === "title") renderTitle();
    if (view === "draw") renderDraw();
    if (view === "board") renderBoard();
    if (view === "end") renderEnd();
  }

  /* ---------- 타이틀 ---------- */
  function renderTitle() {
    const inProgress = !!(S && (S.phase !== "draw" || S.order));
    const openedCount = S ? S.envs.filter((e) => e.openedBy !== null).length : 0;
    $("#screen-title").innerHTML = `
      <div class="crest-row">${TEAMS.map((t) => `<span>${crest(TEAMS.indexOf(t))}</span>`).join("")}</div>
      <div class="title-en">HOGWARTS · OWL POST</div>
      <h1 class="title-main">${esc(C.title)}</h1>
      <div class="title-sub">${esc(C.subtitle)}</div>
      ${mixWarning ? `<div class="warn">${esc(mixWarning)}</div>` : ""}
      <div class="title-actions">
        <button class="btn big ghost" data-act="rules">📖 게임 규칙 안내</button>
        <a class="btn big ghost" href="answers.html" target="_blank" rel="noopener" style="text-decoration:none">📋 사회자 답안지</a>
        <button class="btn big gold" data-act="new">✨ 새 게임 시작</button>
        ${inProgress ? `<button class="btn big" data-act="resume">↪ 이어하기 (${openedCount}/${TOTAL})</button>` : ""}
      </div>
      <div class="title-hint">
        <kbd>1</kbd> 규칙 &nbsp; <kbd>2</kbd> 아이템표 &nbsp; <kbd>0</kbd> 전체화면 &nbsp; <kbd>9</kbd> 소리 켜기/끄기 &nbsp; <kbd>Ctrl</kbd>+<kbd>Z</kbd> 되돌리기
        <div class="credits">Icons: Lorc, Delapouite, Caro Asercion, DarkZaitzev, Lucasms — game-icons.net (CC BY 3.0) · Fonts: SIL OFL · canvas-confetti (ISC) · Sounds: Kenney.nl (CC0)</div>
      </div>`;
  }

  /* ---------- 순서 추첨 ---------- */
  function renderDraw(animating) {
    const ordered = S.order && !animating ? S.order.slice() : range(N);
    $("#screen-draw").innerHTML = `
      <h2 class="draw-title">🎲 순서 추첨</h2>
      <div class="draw-row">
        ${ordered.map((i) => `
          <div class="draw-card ${animating ? "spin" : S.order ? "pop" : ""}" style="${tStyle(i)}" data-team="${i}">
            ${S.order && !animating ? `<div class="order-no">${S.order.indexOf(i) + 1}</div>` : `<div class="order-no" style="opacity:${animating ? 1 : 0}">?</div>`}
            <div class="crest">${crest(i)}</div>
            <div class="tname">${esc(TEAMS[i].name)}</div>
          </div>`).join("")}
      </div>
      <div class="draw-actions">
        ${S.order
          ? `<button class="btn ghost" data-act="draw">🔁 다시 추첨</button>
             <button class="btn big gold" data-act="start" data-primary>게임 시작 ▶</button>`
          : `<button class="btn big gold" data-act="draw" data-primary ${animating ? "disabled" : ""}>🎲 추첨하기</button>`}
        <button class="btn ghost" data-act="rules">📖 규칙 안내</button>
      </div>`;
  }
  function doDraw() {
    if (drawing) return;
    drawing = true;
    S.order = null;
    renderDraw(true);
    const nos = () => document.querySelectorAll("#screen-draw .order-no");
    const iv = setInterval(() => {
      const r = shuffle(range(N));
      nos().forEach((el, k) => (el.textContent = r[k] + 1));
      synthSfx.tick();
    }, 110);
    setTimeout(() => {
      clearInterval(iv);
      S.order = shuffle(range(N));
      drawing = false;
      save();
      renderDraw();
      synthSfx.fanfare();
      document.querySelectorAll(".draw-card").forEach((c, k) => setTimeout(() => burstOn(c, TEAMS[+c.dataset.team].accent, 18), k * 120));
    }, 1900);
  }

  /* ---------- 게임판 ---------- */
  function renderBoard() {
    renderScoreboard();
    renderGrid();
    renderStatus();
  }

  function renderScoreboard() {
    const over = S.turn >= TOTAL;
    const cur = over ? -1 : curTeam();
    if (!shown || shown.length !== N) shown = S.scores.slice();
    $("#scoreboard").innerHTML = TEAMS.map((t, i) => `
      <div class="team-card ${i === cur ? "current" : over ? "" : "dim"}" style="${tStyle(i)}" data-team="${i}">
        <div class="order-tag">${S.order ? S.order.indexOf(i) + 1 + "번" : ""}</div>
        ${S.tickets && S.tickets[i] ? `<div class="ticket-tag" title="시간 돌리개 보유">⏳${S.tickets[i] > 1 ? "×" + S.tickets[i] : ""}</div>` : ""}
        <div class="crest">${crest(i)}</div>
        <div class="info">
          <div class="tname">${esc(t.name)}</div>
          <div class="pips">${range(ROUNDS).map((k) => `<span class="pip ${k < S.picks[i] ? "on" : ""}"></span>`).join("")}</div>
        </div>
        <div class="score real" id="score-${i}">${S.scores[i]}</div>
        <div class="vault" aria-label="잠긴 금고"><div class="vault-door"><div class="vault-dial"></div></div><span class="vault-lock">🔒</span></div>
        <div class="adj">
          <button data-act="adj" data-arg="${i}:-1" title="점수 수동 감점">−${C.manualAdjustStep}</button>
          <button data-act="adj" data-arg="${i}:1" title="점수 수동 가점">+${C.manualAdjustStep}</button>
        </div>
      </div>`).join("");
    // 점수 변화 애니메이션
    syncHideClass();
    S.scores.forEach((v, i) => {
      const d = v - shown[i];
      if (d !== 0 && hiddenMode()) { coinFly(i, d); return; }   // 비공개: 숫자 대신 금화만
      if (d !== 0) {
        const card = document.querySelector(`.team-card[data-team="${i}"]`);
        const sc = $("#score-" + i);
        sc.classList.add("bump");
        const tag = document.createElement("div");
        tag.className = "delta " + (d > 0 ? "plus" : "minus");
        tag.textContent = (d > 0 ? "+" : "") + d;
        card.appendChild(tag);
        countUp(sc, shown[i], v);
        if (d > 0) burstOn(card, TEAMS[i].accent, 22);
      }
    });
    shown = S.scores.slice();
  }
  function countUp(el, from, to) {
    const t0 = performance.now(), dur = 700;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function envIcon(e) { return e.type === "item" ? itemIcon(e.item) : TYPE_ICON[e.type]; }

  function renderGrid() {
    const over = S.turn >= TOTAL;
    const glow = over ? "#e8c46a" : TEAMS[curTeam()].accent;
    $("#grid").innerHTML = S.envs.map((e, i) => {
      const open = e.openedBy !== null;
      return `<button class="env ${open ? "open" : ""} ${modal && modal.env === i ? "selected" : ""}"
          style="--glow:${glow}" data-act="pick" data-arg="${i}" ${open ? 'aria-disabled="true"' : ""} aria-label="${e.letter} 봉투">
        ${open ? `<span class="letter-tag">${e.letter}</span><div class="seal">${envIcon(e)}</div>
                  <div class="opened-info" style="--team:${TEAMS[e.openedBy].color}">${esc(e.summary)}</div>`
               : `<div class="seal">${e.letter}</div>`}
      </button>`;
    }).join("");
  }

  function renderStatus() {
    const over = S.turn >= TOTAL;
    const round = Math.min(ROUNDS, Math.floor(S.turn / N) + 1);
    const left = S.envs.filter((e) => e.openedBy === null).length;
    const cur = over ? -1 : curTeam();
    $("#statusbar").innerHTML = `
      <div class="round">${over ? "🏁 모든 봉투 개봉 완료!" : `🌙 ${round}바퀴째 / ${ROUNDS} · 남은 봉투 ${left}장`}${tallyReached() ? ` <button class="tally-btn" data-act="tally">⏳ 현황 보기 <kbd>3</kbd></button>` : ""}</div>
      <div class="order">${S.order.map((ti, k) => `${k ? "<span>›</span>" : ""}<span class="chip ${ti === cur ? "now" : ""}" style="${tStyle(ti)}">${TEAMS[ti].crest} ${esc(TEAMS[ti].name)}</span>`).join("")}</div>
      <div class="keys">
        ${over ? `<button data-act="toEnd" style="border-color:var(--gold);color:var(--gold);font-size:2.2vh">🏆 결과 보기</button> ` : "봉투 글자키로 선택 · "}
        <a href="answers.html" target="_blank" rel="noopener" style="color:inherit;border:1px solid #fff5;border-radius:6px;padding:.1em .5em;text-decoration:none">📋 답안지</a> <button data-act="rules">1 규칙</button> <button data-act="items">2 아이템</button>
        <button data-act="undo">Ctrl+Z 되돌리기</button> <button data-act="sound">${soundOn ? "🔊" : "🔇"}</button>
        <button data-act="home">⌂</button>
      </div>`;
  }

  /* ====================== 봉투 진행 (모달) ====================== */
  function pickEnvelope(i) {
    if (!S || view !== "board" || modal || S.turn >= TOTAL) return;
    const e = S.envs[i];
    if (!e || e.openedBy !== null) return;
    modal = { env: i, team: curTeam(), stage: "confirm" };
    sfx.pick();
    renderGrid();
    openModal();
  }

  function openModal() { $("#modal").hidden = false; renderModal(); }
  function closeModal() {
    stopTimer();
    const wasTally = modal && modal.stage === "tally";
    modal = null;
    $("#modal").hidden = true;
    if (view === "board") { renderGrid(); if (!wasTally) setTimeout(autoTally, 600); }
  }

  function headHTML(label) {
    const m = modal;
    return `<div class="head">
      <span class="who" style="${tStyle(m.team)}">${TEAMS[m.team].crest} ${esc(tName(m.team))}</span>
      <span>${label || `<b>${S.envs[m.env].letter}</b> 봉투`}</span></div>`;
  }

  function timerHTML() {
    const t = modal.timer;
    if (!t) return "";
    const left = Math.ceil(t.left);
    const pct = (t.left / t.total) * 100;
    return `<div class="timer ${t.running ? "" : "idle"} ${t.left <= 5 && t.left > 0 && t.running ? "warn" : ""}" id="timer">
      <div class="num" id="timer-num">${t.left <= 0 ? "0" : left}</div>
      <div class="bar"><div class="fill" id="timer-fill" style="width:${pct}%"></div></div>
    </div>`;
  }

  function teamButtons(list, act, extra = () => "") {
    return `<div class="team-pick">${list.map((i) => `
      <button class="team-btn ${extra(i).includes("picked") ? "picked" : ""}" style="${tStyle(i)}" data-act="${act}" data-arg="${i}" aria-label="${esc(tName(i))} ${S.scores[i]}점">
        <span class="crest">${crest(i)}</span><span>${esc(tName(i))}</span>
        <span class="s">${S.scores[i]}점</span>${extra(i).replace("picked", "")}
      </button>`).join("")}</div>`;
  }

  function renderModal() {
    const m = modal; if (!m) return;
    const e = S.envs[m.env];
    const P = $("#modal-panel");
    let h = "";

    if (m.stage === "confirm") {
      h = `${headHTML(`<b>${e.letter}</b> 봉투를 골랐습니다!`)}
        <div class="big-env hover-bob" id="big-env">
          <div class="flap"></div><div class="seal">${e.letter}</div><div class="note">✉️</div>
        </div>
        <div class="sub">부엉이가 편지를 물고 왔어요…</div>
        <div class="actions">
          <button class="btn ink" data-act="cancel">취소 <kbd>Esc</kbd></button>
          <button class="btn big gold" data-act="openEnv" data-primary>✉️ 봉투 열기 <kbd>Enter</kbd></button>
        </div>`;
    }

    /* ---------- 퀴즈 ---------- */
    else if (m.stage === "quiz" || m.stage === "stealAns") {
      const q = m.quiz;
      const stealing = m.stage === "stealAns";
      const ticketTeams = !stealing && !q.team && m.ticketUser == null ? range(N).filter((i) => i !== m.team && S.tickets && S.tickets[i] > 0) : [];
      h = `${stealing
            ? `<div class="head"><span class="who" style="${tStyle(m.stealTeam)}">${TEAMS[m.stealTeam].crest} ${esc(tName(m.stealTeam))}</span><span>⚡ 스틸 도전!</span></div>`
            : m.ticketUser != null
            ? `<div class="head"><span class="who" style="${tStyle(m.ticketUser)}">${TEAMS[m.ticketUser].crest} ${esc(tName(m.ticketUser))}</span><span>⏳ 시간 돌리개! 먼저 답하기</span></div>`
            : headHTML()}
        ${m.itemQuiz
          ? `<h2 class="kind">🎁 아이템 찬스 <span class="tag-en">ITEM CHANCE</span></h2>
             <div class="sub" style="font-weight:800;color:var(--seal)">맞히면 <b>+${itemQuizCfg().points ?? C.quiz.points}점</b> + 봉투 속 아이템! 좋은 것일까, 나쁜 것일까… 🎲</div>`
          : `<h2 class="kind">${q.team ? "👥 함께 퀴즈" : "📜 퀴즈"} <span class="tag-en">${q.team ? "TEAM QUIZ" : "QUIZ"} · ${m.points}점</span></h2>`}
        <div class="question">${esc(q.q)}</div>
        ${q.hint ? `<div class="hint">${esc(q.hint)}</div>` : ""}
        ${timerHTML()}
        ${m.timeout ? `<div class="sub" style="color:var(--bad);font-weight:800;font-size:3.4vh">⏰ 시간 종료!</div>` : ""}
        <div class="actions">
          ${m.timer ? `<button class="btn ink" data-act="timer">${m.timer.running ? "⏸ 일시정지" : m.timer.left < m.timer.total ? "▶ 계속" : "⏱ 타이머 시작"} <kbd>Space</kbd></button>` : ""}
          ${stealing ? `<button class="btn ink" data-act="stealChange">↺ 스틸 팀 다시 고르기</button>` : ""}
          ${ticketTeams.map((i) => `<button class="btn steal" data-act="useTicket" data-arg="${i}">⏳ ${TEAMS[i].crest} ${esc(tName(i))} 시간 돌리개</button>`).join("")}
          <button class="btn big bad" data-act="${stealing ? "stealWrong" : "wrong"}">✘ ${stealing ? "오답" : "오답 / 시간 초과"}</button>
          <button class="btn big ok" data-act="${stealing ? "stealRight" : "right"}">✔ 정답!</button>
        </div>`;
    }
    else if (m.stage === "steal") {
      const others = range(N).filter((i) => i !== (m.ticketUser ?? m.team));
      h = `${headHTML()}
        <div class="steal-banner">⚡ 스틸 찬스!</div>
        <div class="question" style="font-size:4.2vh">${esc(m.quiz.q)}</div>
        <div class="rank-prompt" style="color:var(--steal)">👇 스틸할 팀을 누르세요 <span style="font-size:.75em">(가장 먼저 손 든 팀${m.quiz.team ? " · 같은 과제에 도전!" : ""}${m.itemQuiz ? " · 맞히면 아이템을 가져가요!" : ""})</span></div>
        ${teamButtons(others, "stealTeam")}
        <div class="actions">
          <button class="btn ink" data-act="noSteal">🙅 아무도 안 듦 → 정답 공개</button>
        </div>`;
    }
    else if (m.stage === "quizResult") {
      const r = m.result;
      h = `${headHTML()}
        <h2 class="kind">📜 정답 공개</h2>
        <div class="question" style="font-size:4vh;opacity:.75">${esc(m.quiz.q)}</div>
        <div class="answer ${String(m.quiz.a).length > 40 ? "long" : ""}">${esc(m.quiz.a)}</div>
        ${r.team !== null
          ? `<div class="result-line good">${r.steal ? "⚡ 스틸 성공! " : "🎉 "}${TEAMS[r.team].crest} ${esc(tName(r.team))} +${m.points}점</div>`
          : `<div class="result-line none">아쉽게도 이번 문제는 득점 없음</div>`}
        <div class="actions"><button class="btn big gold" data-act="finish" data-primary>다음 차례 ▶ <kbd>Enter</kbd></button></div>`;
    }

    /* ---------- 미션 ---------- */
    else if (m.stage === "mission") {
      const ms = m.mission;
      h = `${headHTML()}
        <h2 class="kind">⚔️ 미션 <span class="tag-en">MISSION · 4팀 모두 참가</span></h2>
        <h3 class="mission-title">${esc(ms.title)}</h3>
        <div class="mission-desc">${esc(ms.desc)}</div>
        ${ms.how ? `<div class="mission-how">${esc(ms.how)}</div>` : ""}
        <div class="sub">${C.mission.rankPoints.map((p, i) => `${i + 1}등 ${p}점`).join(" · ")} &nbsp;|&nbsp; 봉투 고른 팀이 1등하면 +${C.mission.pickerWinBonus}점 보너스</div>
        ${timerHTML()}
        <div class="actions">
          ${m.timer ? `<button class="btn ink" data-act="timer">${m.timer.running ? "⏸ 일시정지" : m.timer.left < m.timer.total ? "▶ 계속" : "⏱ 타이머 시작"} <kbd>Space</kbd></button>` : ""}
          <button class="btn big gold" data-act="toRank" data-primary>🏁 순위 입력하기</button>
        </div>`;
    }
    else if (m.stage === "missionRank") {
      const done = m.ranks.length === N;
      const badge = (i) => { const r = m.ranks.indexOf(i); return r >= 0 ? `picked<span class="rank-badge">${r + 1}등</span>` : ""; };
      h = `${headHTML()}
        <h2 class="kind">⚔️ ${esc(m.mission.title)}</h2>
        ${done ? missionResultHTML() : `<div class="rank-prompt">${m.ranks.length + 1}등 팀을 누르세요</div>${teamButtons(range(N), "rank", badge)}`}
        <div class="actions">
          <button class="btn ink" data-act="rankReset">↺ 다시 입력</button>
          ${done ? `<button class="btn big gold" data-act="finish" data-primary>점수 반영 ▶ <kbd>Enter</kbd></button>` : ""}
        </div>`;
    }

    /* ---------- 아이템 ---------- */
    else if (m.stage === "item") {
      const k = e.item, it = C.items[k];
      const owner = m.itemTeam ?? m.team;
      const needTarget = (k === "curse" || k === "polyjuice") && m.target == null;
      const others = range(N).filter((i) => i !== owner);
      const pts = itemWinPoints(m);
      const base = S.scores.slice(); if (pts) base[m.winner] = clamp0(base[m.winner] + pts);
      const bonus = pts ? `<span style="color:#0d6a33;font-weight:800">✅ ${TEAMS[m.winner].crest} ${esc(tName(m.winner))} 정답 +${pts}점</span> · ` : "";
      let body = "";
      if (needTarget) {
        body = `<div class="rank-prompt">${k === "polyjuice" ? `🔄 ${esc(tName(owner))}, 점수를 바꿀 팀을 고르세요!` : `⚡ ${esc(tName(owner))}, 저주를 걸 팀을 고르세요!`}</div>${teamButtons(others, "curseTarget")}`;
      } else if (k === "timeturner") {
        body = `<div class="result-line good" style="font-size:3.6vh">⏳ ${esc(tName(owner))} 보관! 다른 팀 문제가 열리면 꺼내 써서 먼저 답할 수 있어요</div>`;
      } else if (k === "polyjuice") {
        // 폴리주스: 정답 점수(+10)를 먼저 반영한 뒤 두 팀 점수를 맞바꿈
        const t = m.target, lab = (i) => `<span class="lbl" style="${tStyle(i)}">${TEAMS[i].crest} ${esc(tName(i))}</span>`;
        body = hiddenMode()
          ? `<div class="score-change hidden-change">${lab(owner)}<span>⇄</span>${lab(t)}<span>금고를 통째로 바꿨다!</span></div>`
          : `<div class="score-change">${lab(owner)}<span>${base[owner]}</span><span class="arrow">⇄</span><span>${base[t]}</span>${lab(t)}</div>`;
      } else {
        const tgt = k === "curse" ? m.target : owner;
        const before = S.scores[tgt], after = itemResult(k, base[tgt]);
        const lbl = `<span class="lbl" style="${tStyle(tgt)}">${TEAMS[tgt].crest} ${esc(tName(tgt))}</span>`;
        const hiddenLine = {
          butterbeer: `<span class="coin"></span> 금고에 <b>${C.items[k].value} 갈레온</b> 입금!`,   // 🪙 이모지는 Windows 10에서 네모로 깨짐
          felix: `<span class="coin"></span><span class="coin"></span> 금고에 <b>${C.items[k].value} 갈레온</b> 대박 입금!`,
          curse: `💸 금고에서 <b>${C.items[k].value} 갈레온</b> 증발!`,
          dementor: `🕳️ 디멘터가 금고에서 <b>${C.items[k].value} 갈레온</b>을 빨아갔다…`,
        }[k];
        body = k === "cloak"
          ? `<div class="result-line none">아이템 효과는 없어요… 🌫️</div>`
          : hiddenMode()
          ? `<div class="score-change hidden-change">${lbl}<span>${hiddenLine}</span></div>`
          : `<div class="score-change"><span class="lbl" style="${tStyle(tgt)}">${TEAMS[tgt].crest} ${esc(tName(tgt))}</span>
               <span>${before}</span><span class="arrow">➜</span><span class="to">${after}</span></div>`;
      }
      h = `${headHTML()}
        <h2 class="kind">🎁 아이템 <span class="tag-en">ITEM</span></h2>
        <div class="item-icon">${itemIcon(k)}</div>
        <h3 class="item-name">${esc(it.name)}</h3>
        <div class="item-effect">${esc(itemShort(k))}</div>
        ${m.itemQuiz
          ? `<div class="sub" style="font-size:2.9vh">정답 <b>${esc(m.quiz.a)}</b> · ${bonus}${m.passedFrom != null ? `🔄 ${esc(tName(m.passedFrom))}${josa(tName(m.passedFrom), "이", "가")} 넘긴 아이템 →` : m.stolen ? "⚡ 스틸 성공! " : ""}<b>${TEAMS[owner].crest} ${esc(tName(owner))}</b> ${k === "dementor" ? "😱 앗, 디멘터를 받았다…" : k === "cloak" ? "🌫️ 받았지만 꽝!" : "🎉 아이템 획득!"}</div>`
          : needTarget ? "" : `<div class="sub">${esc(it.desc)}</div>`}
        ${body}
        <div class="actions">${needTarget ? "" : `<button class="btn big gold" data-act="finish" data-primary>확인 ▶ <kbd>Enter</kbd></button>`}</div>`;
    }
    else if (m.stage === "itemChoice") {
      const w = m.winner;
      h = `${headHTML()}
        <h2 class="kind">🎁 아이템 획득 찬스!</h2>
        <div class="sub">정답 <b>${esc(m.quiz.a)}</b> · ${m.stolen ? "⚡ 스틸 성공! " : "🎉 "}<b>${TEAMS[w].crest} ${esc(tName(w))}</b> 정답! <b>+${itemWinPoints(m)}점</b> (아이템을 넘겨도 점수는 우리 팀 것)</div>
        <div class="item-icon" style="font-size:8vh">🎁</div>
        <div class="rank-prompt">${esc(tName(w))}, 이 아이템… 직접 열까요? 다른 팀에게 넘길까요?</div>
        <div class="sub">좋은 것일까, 디멘터일까… 열기 전엔 아무도 몰라요! 🎲</div>
        <div class="actions" style="margin-top:0">
          <button class="btn big gold" data-act="keepItem" data-primary>🎁 우리가 연다! <kbd>Enter</kbd></button>
        </div>
        <div class="sub" style="margin-top:.5vh">또는 👇 넘길 팀 선택</div>
        ${teamButtons(range(N).filter((i) => i !== w), "passItem")}`;
    }
    else if (m.stage === "itemLost") {
      const it = C.items[e.item];
      h = `${headHTML()}
        <h2 class="kind">🎁 아이템 찬스 · 정답 공개</h2>
        <div class="question" style="font-size:4vh;opacity:.75">${esc(m.quiz.q)}</div>
        <div class="answer ${String(m.quiz.a).length > 40 ? "long" : ""}">${esc(m.quiz.a)}</div>
        <div class="result-line none">💨 아무도 맞히지 못해 아이템이 사라졌어요</div>
        <div class="sub">봉투 속 아이템은… ${it.icon} <b>${esc(it.name)}</b> (${esc(itemShort(e.item))})</div>
        <div class="actions"><button class="btn big gold" data-act="finish" data-primary>다음 차례 ▶ <kbd>Enter</kbd></button></div>`;
    }

    /* ---------- 중간 집계 (모래시계) ---------- */
    else if (m.stage === "tally") {
      h = `<div class="head"><span>⏳ 지금 ${Math.min(ROUNDS, Math.floor(S.turn / N) + 1)}바퀴째 · 남은 봉투 ${TOTAL - S.turn}장</span></div>
        <h2 class="kind">⏳ 중간 집계 <span class="tag-en">HOUSE HOURGLASSES</span></h2>
        <div class="sub">모래시계에 보석이 많이 쌓일수록 금고에 금화가 많아요! 정확한 금액은… 마지막 금고 오픈 때 공개 🔐</div>
        ${hourglassesHTML()}
        <div class="actions"><button class="btn big gold" data-act="cancel" data-primary>계속하기 ▶ <kbd>Enter</kbd></button></div>`;
    }

    /* ---------- 동점 결승 ---------- */
    else if (m.stage === "tie") {
      const tb = T.tiebreakers.length ? T.tiebreakers[S.tbPtr % T.tiebreakers.length] : { q: "(content.js에 동점 결승 문제를 넣어 주세요)", a: "" };
      h = `<div class="head"><span>🏆 동점 결승전</span></div>
        <h2 class="kind">⚡ 결승 문제 <span class="tag-en">SUDDEN DEATH</span></h2>
        <div class="question">${esc(tb.q)}</div>
        ${m.showAnswer ? `<div class="answer">${esc(tb.a)}</div>` : ""}
        <div class="rank-prompt">먼저 맞힌 팀은?</div>
        ${teamButtons(m.tied, "tieWin")}
        <div class="actions">
          <button class="btn ink" data-act="tieNext">다른 문제로 ↻</button>
          ${m.showAnswer ? "" : `<button class="btn ink" data-act="tieAnswer">정답 보기</button>`}
          <button class="btn ink" data-act="cancel">닫기</button>
        </div>`;
    }

    if (m.quizNo && m.stage !== "confirm") h = `<div class="qno" title="사회자 답안지 번호">Q${m.quizNo}</div>` + h;
    if (m.itemNo && m.stage !== "confirm") h = `<div class="qno" title="사회자 답안지 번호">아이템 ${m.itemNo}</div>` + h;
    if (m.stage === "tie" && T.tiebreakers.length) h = `<div class="qno">결승 ${(S.tbPtr % T.tiebreakers.length) + 1}</div>` + h;
    P.innerHTML = h;
  }

  function itemQuizCfg() { return Object.assign({ items: ["butterbeer", "felix", "curse", "polyjuice", "timeturner", "dementor", "cloak"], timeLimit: C.quiz.timeLimit, stealTimeLimit: C.quiz.stealTimeLimit }, C.itemQuiz || {}); }
  function itemNeedsQuiz(k) { return itemQuizCfg().items.includes(k); }
  // 아이템 찬스 문제를 맞힌 팀이 받는 정답 점수 (아이템 효과보다 먼저 적용)
  function itemWinPoints(m) { return m.itemQuiz && m.winner != null ? (itemQuizCfg().points ?? C.quiz.points) : 0; }

  // 아이템 찬스 정답 → 양도 선택(설정 시) → 아이템 공개
  function afterItemWin(m) {
    if (itemQuizCfg().allowPass === false) { m.itemTeam = m.winner; goItem(m); return; }
    m.stage = "itemChoice"; sfx.correct();
  }
  function goItem(m) {
    m.stage = "item";
    const k = S.envs[m.env].item;
    if (k === "dementor" || k === "curse") { sfx.dark(); flash("#1a2a4a"); }
    else if (k === "polyjuice") { sfx.zap(); flash("#7b3fe4"); }
    else if (k === "cloak") sfx.wrong();
    else if (k === "felix") { sfx.potion(); flash("#fff3c4"); goldConfetti(false); }
    else { sfx.sparkle(); sfx.correct(); flash("#fff3c4"); }
  }

  function itemResult(k, v) {
    const it = C.items[k];
    switch (k) {
      case "butterbeer": return clamp0(v + it.value);
      case "felix": return clamp0(v + it.value);
      case "curse": return clamp0(v - it.value);
      case "dementor": return clamp0(v - it.value);
      default: return v;
    }
  }

  function missionPoints() {
    // ranks[0] = 1등 팀 index
    const pts = range(N).map(() => 0);
    modal.ranks.forEach((ti, r) => { pts[ti] += C.mission.rankPoints[r] || 0; });
    if (modal.ranks[0] === modal.team) pts[modal.team] += C.mission.pickerWinBonus;
    return pts;
  }
  function missionResultHTML() {
    const pts = missionPoints();
    return `<table class="result-table">${modal.ranks.map((ti, r) => `
      <tr><td>${r + 1}등</td><td>${TEAMS[ti].crest} ${esc(tName(ti))}</td>
      <td class="pts">+${pts[ti]}${r === 0 && ti === modal.team ? ` <span style="font-size:.7em">(보너스 +${C.mission.pickerWinBonus})</span>` : ""}</td></tr>`).join("")}</table>`;
  }

  /* ---------- 타이머 ---------- */
  let timerIv = 0;
  function makeTimer(sec) { return sec > 0 ? { total: sec, left: sec, running: false } : null; }
  function toggleTimer() {
    const t = modal && modal.timer; if (!t || t.left <= 0) return;
    if (t.running) { t.running = false; stopTimer(); renderModal(); return; }
    t.running = true;
    t.endAt = performance.now() + t.left * 1000;
    let lastSec = Math.ceil(t.left);
    clearInterval(timerIv);
    timerIv = setInterval(() => {
      if (!modal || !modal.timer) return stopTimer();
      t.left = Math.max(0, (t.endAt - performance.now()) / 1000);
      const sec = Math.ceil(t.left);
      if (sec !== lastSec) { lastSec = sec; if (sec <= 5 && sec > 0) sfx.tick(); }
      const num = $("#timer-num"), fill = $("#timer-fill"), box = $("#timer");
      if (num) num.textContent = sec;
      if (fill) fill.style.width = (t.left / t.total) * 100 + "%";
      if (box) box.classList.toggle("warn", t.left <= 5 && t.left > 0);
      if (t.left <= 0) {
        t.running = false; stopTimer(); sfx.buzz();
        modal.timeout = true;
        renderModal();
      }
    }, 100);
    renderModal();
  }
  function stopTimer() { clearInterval(timerIv); timerIv = 0; }

  /* ---------- 모달 동작 ---------- */
  function act(a, arg) {
    const m = modal;
    switch (a) {
      /* 공통 / 화면 */
      case "rules": openRules(0); break;
      case "items": openRules(2); break;
      case "undo": undo(); break;
      case "sound": soundOn = !soundOn; toast(soundOn ? "🔊 소리 켬" : "🔇 소리 끔"); if (view === "board") renderStatus(); break;
      case "home": view = "title"; render(); break;
      case "new":
        if (S && S.phase !== "draw" && !confirm("진행 중인 게임 기록이 지워집니다. 새 게임을 시작할까요?")) return;
        newGame(); view = "draw"; render(); break;
      case "resume": view = S.phase === "end" ? "end" : S.phase === "board" ? "board" : "draw"; shown = S.scores.slice(); render(); if (view === "board") setTimeout(autoTally, 800); break;
      case "draw": doDraw(); break;
      case "start":
        commit(() => { S.phase = "board"; });
        view = "board"; shown = S.scores.slice(); render();
        toast(`첫 순서: ${tName(S.order[0])}`); break;
      case "toEnd": view = "end"; render(); break;
      case "tally": openTally(); break;
      case "openVault": openNextVault(); break;
      case "toPodium": revealStep = N; S.revealed = true; save(); render(); break;
      case "toBoard": view = "board"; render(); break;
      case "pick": pickEnvelope(+arg); break;
      case "adj": {
        const [ti, dir] = arg.split(":").map(Number);
        commit(() => { S.scores[ti] = clamp0(S.scores[ti] + dir * C.manualAdjustStep); S.log.push({ t: "adj", team: ti, d: dir * C.manualAdjustStep }); });
        renderScoreboard(); break;
      }

      /* 봉투 */
      case "cancel": closeModal(); break;
      case "openEnv": {
        const env = S.envs[m.env];
        const big = $("#big-env"); big.classList.remove("hover-bob"); big.classList.add("opening");
        big.querySelector(".note").textContent = env.type === "item" ? "🎁" : TYPE_ICON[env.type];
        sfx.open();
        setTimeout(() => {
          if (modal !== m) return;
          burstOn(big, "#e8c46a", 40);
          if (env.type === "quiz") {
            const qn = T.quizzes.length;
            m.quiz = qn ? T.quizzes[S.quizOrder[S.quizPtr % qn]] : { q: "(content.js에 퀴즈를 넣어 주세요)", a: "" };
            m.quizNo = qn ? S.quizOrder[S.quizPtr % qn] + 1 : 0;
            m.points = m.quiz.points ?? C.quiz.points;
            m.timer = makeTimer(m.quiz.time ?? C.quiz.timeLimit);
            m.stage = "quiz";
          } else if (env.type === "mission") {
            const mn = T.missions.length;
            m.mission = mn ? T.missions[S.missionOrder[S.missionPtr % mn]] : { title: "미션", desc: "(content.js에 미션을 넣어 주세요)" };
            m.timer = makeTimer(m.mission.time ?? C.mission.timeLimit);
            m.stage = "mission";
          } else if (itemNeedsQuiz(env.item)) {
            // 🎁 아이템 찬스: 상식 문제를 맞혀야 아이템 공개·획득
            const iq = T.itemQuizzes || [], n = iq.length;
            m.itemQuiz = true;
            m.quiz = n ? iq[S.itemQuizOrder[S.itemQuizPtr % n]] : { q: "(content.js의 itemQuizzes에 문제를 넣어 주세요)", a: "" };
            m.itemNo = n ? S.itemQuizOrder[S.itemQuizPtr % n] + 1 : 0;
            m.points = 0;
            m.timer = makeTimer(m.quiz.time ?? itemQuizCfg().timeLimit);
            m.stage = "quiz";
            sfx.sparkle();
          } else {
            m.itemTeam = m.team;
            goItem(m);
          }
          renderModal();
        }, 1300);
        break;
      }

      /* 퀴즈 */
      case "timer": toggleTimer(); break;
      case "right":
        stopTimer();
        { const p = m.ticketUser ?? m.team;   // 시간 돌리개를 썼으면 그 팀이 우선권
          if (m.itemQuiz) { m.winner = p; afterItemWin(m); renderModal(); burstOn($("#modal-panel"), TEAMS[p].accent, 50); break; }
          sfx.correct(); flash("#bff5cf");
          m.result = { team: p, steal: false }; m.stage = "quizResult"; renderModal();
          burstOn($("#modal-panel"), TEAMS[p].accent, 50); break; }
      case "useTicket":
        stopTimer();
        m.ticketUser = +arg; m.timeout = false;
        m.timer = makeTimer(m.quiz.time ?? (m.itemQuiz ? itemQuizCfg().timeLimit : C.quiz.timeLimit));
        sfx.zap(); flash("#7b3fe4"); renderModal(); break;
      case "wrong":
        stopTimer(); sfx.wrong();
        m.timer = null; m.timeout = false; m.stage = "steal"; renderModal(); break;
      case "stealTeam":
        m.stealTeam = +arg; m.timeout = false;
        m.timer = makeTimer(m.itemQuiz ? itemQuizCfg().stealTimeLimit : C.quiz.stealTimeLimit);
        m.stage = "stealAns"; sfx.pick(); renderModal();
        if (m.timer) toggleTimer();
        break;
      case "stealChange":
        stopTimer(); m.timer = null; m.timeout = false; m.stealTeam = null; m.stage = "steal"; renderModal(); break;
      case "stealRight":
        stopTimer();
        if (m.itemQuiz) { m.winner = m.stealTeam; m.stolen = true; afterItemWin(m); renderModal(); burstOn($("#modal-panel"), "#b48cff", 50); break; }
        sfx.correct(); flash("#e3d4ff");
        m.result = { team: m.stealTeam, steal: true }; m.stage = "quizResult"; renderModal();
        burstOn($("#modal-panel"), "#b48cff", 50); break;
      case "stealWrong":
      case "noSteal":
        stopTimer(); if (a === "stealWrong") sfx.wrong();
        if (m.itemQuiz) { m.stage = "itemLost"; renderModal(); break; }
        m.result = { team: null, steal: a === "stealWrong" }; m.stage = "quizResult"; renderModal(); break;

      /* 미션 */
      case "toRank": stopTimer(); m.ranks = []; m.stage = "missionRank"; renderModal(); break;
      case "rank":
        if (m.ranks.includes(+arg)) break;
        m.ranks.push(+arg); sfx.pick();
        if (m.ranks.length === N - 1) m.ranks.push(range(N).find((i) => !m.ranks.includes(i)));
        if (m.ranks.length === N) sfx.correct();
        renderModal(); break;
      case "rankReset": m.ranks = []; renderModal(); break;

      /* 아이템 */
      case "keepItem": m.itemTeam = m.winner; goItem(m); renderModal(); break;
      case "passItem":
        m.itemTeam = +arg; m.passedFrom = m.winner; sfx.steal();
        toast(`🔄 ${tName(m.winner)} → ${tName(+arg)} 아이템 양도!`);
        goItem(m); renderModal(); break;
      case "curseTarget": m.target = +arg; sfx.zap(); flash("#b8322a"); renderModal(); break;

      case "finish": finishTurn(); break;

      /* 동점 결승 */
      case "tieOpen": openTie(); break;
      case "tieAnswer": m.showAnswer = true; renderModal(); break;
      case "tieNext":
        commit(() => { S.tbPtr++; }); m.showAnswer = false; renderModal(); break;
      case "tieWin":
        commit(() => { S.tieWinner = +arg; S.tbPtr++; });
        closeModal(); renderEnd(); sfx.fanfare(); break;
    }
  }

  function finishTurn() {
    const m = modal, e = S.envs[m.env];
    const before = S.scores.slice();
    commit(() => {
      const env = S.envs[m.env];
      env.openedBy = m.team;
      if (env.type === "quiz") {
        S.quizPtr++;
        if (m.result.team !== null) {
          S.scores[m.result.team] = clamp0(S.scores[m.result.team] + m.points);
          env.summary = m.result.steal ? `⚡${tName(m.result.team)} 스틸 +${m.points}` : m.ticketUser != null ? `⏳${tName(m.result.team)} +${m.points}` : `정답 +${m.points}`;
        } else env.summary = "득점 없음";
      } else if (env.type === "mission") {
        S.missionPtr++;
        const pts = missionPoints();
        pts.forEach((p, i) => (S.scores[i] = clamp0(S.scores[i] + p)));
        env.summary = `미션 1등 ${tName(m.ranks[0])}`;
      } else {
        const k = env.item;
        if (m.itemQuiz) S.itemQuizPtr = (S.itemQuizPtr || 0) + 1;
        if (m.stage === "itemLost") {
          env.summary = `${C.items[k].name} 놓침`;
        } else {
          const owner = m.itemTeam ?? m.team;
          const tgt = k === "curse" ? m.target : owner;
          const pts = itemWinPoints(m);
          if (pts) S.scores[m.winner] = clamp0(S.scores[m.winner] + pts);   // 정답 점수 먼저
          if (k === "polyjuice") [S.scores[owner], S.scores[m.target]] = [S.scores[m.target], S.scores[owner]];   // 점수 맞바꾸기
          else if (k === "timeturner") S.tickets[owner]++;                   // 보관
          else S.scores[tgt] = itemResult(k, S.scores[tgt]);                 // 그다음 아이템 효과
          const by = m.passedFrom != null ? `🔄${tName(m.passedFrom)}→${tName(owner)} ` : owner !== m.team ? `⚡${tName(owner)} ` : "";
          env.summary = k === "curse" ? `${by}${C.items[k].name} → ${tName(tgt)}` : k === "polyjuice" ? `${by}폴리주스 ⇄ ${tName(m.target)}` : `${by}${C.items[k].name}`;
        }
      }
      if (m.ticketUser != null) S.tickets[m.ticketUser] = Math.max(0, S.tickets[m.ticketUser] - 1);
      S.picks[m.team]++;
      S.turn++;
      S.log.push({ t: "env", letter: e.letter, team: m.team, before, after: S.scores.slice() });
      if (S.turn >= TOTAL) S.phase = "end";
    });
    closeModal();
    renderBoard();
    if (S.turn >= TOTAL) {
      setTimeout(() => { toast("🏁 24개 봉투를 모두 열었어요! 결과 발표!"); }, 600);
      setTimeout(() => { revealStep = 0; view = "end"; render(); }, 2600);
    } else {
      toast(`다음 차례: ${TEAMS[curTeam()].crest} ${tName(curTeam())}`);
      setTimeout(autoTally, 1800);   // n바퀴 끝 → 중간 집계
    }
  }

  /* ---------- 결과 ---------- */
  function standings() {
    const idx = range(N).sort((a, b) => S.scores[b] - S.scores[a]);
    // 동점은 같은 순위
    const rank = {};
    idx.forEach((ti, k) => { rank[ti] = k > 0 && S.scores[ti] === S.scores[idx[k - 1]] ? rank[idx[k - 1]] : k + 1; });
    return { idx, rank };
  }
  function topTied() {
    const max = Math.max(...S.scores);
    return range(N).filter((i) => S.scores[i] === max);
  }
  /* ---------- 🔐 금고 오픈 (비공개 모드 결과 발표) ---------- */
  function renderVaultReveal() {
    const { idx, rank } = standings();
    const order = idx.slice().reverse();               // 가장 적게 모은 팀부터
    const opened = new Set(order.slice(0, revealStep));
    const next = order[revealStep];
    $("#screen-end").innerHTML = `
      <h2 class="end-title">🔐 금고 오픈!</h2>
      <div class="tie-note" style="color:var(--parchment)">${revealStep === 0 ? "가장 적게 모은 기숙사부터 금고를 엽니다…" : revealStep < N ? "다음 금고는 과연…?" : "모든 금고가 열렸습니다!"}</div>
      <div class="vaults">${TEAMS.map((t, i) => {
        const o = opened.has(i);
        return `<div class="vault-card ${o ? "open" : ""}" style="${tStyle(i)}" data-team="${i}">
          <div class="crest">${crest(i)}</div>
          <div class="tname">${esc(t.name)}</div>
          <div class="big-vault">
            ${o ? `<div class="vault-gold">${"<span class=\"coin\"></span>".repeat(Math.min(15, Math.max(1, Math.round(S.scores[i] / 8))))}</div>`
                : `<div class="vault-door"><div class="vault-dial"></div></div><span class="vault-lock">🔒</span>`}
          </div>
          <div class="vault-amount" id="va-${i}">${o ? S.scores[i] : "?"}</div>
          <div class="vault-unit">${o ? "갈레온" : "&nbsp;"}</div>
          <div class="vault-rank">${o ? `${rank[i]}위` : "&nbsp;"}</div>
        </div>`;
      }).join("")}</div>
      <div class="end-actions">
        ${revealStep < N
          ? `<button class="btn big gold" data-act="openVault" data-primary>🔓 ${rank[next]}위 금고 열기 <kbd>Enter</kbd></button>`
          : `<button class="btn big gold" data-act="toPodium" data-primary>🏆 시상식 보기 <kbd>Enter</kbd></button>`}
        <button class="btn ghost" data-act="toBoard">게임판 보기</button>
        <button class="btn ghost" data-act="undo">↶ 되돌리기</button>
      </div>`;
  }
  let vaultBusy = false;
  function openNextVault() {
    if (revealStep >= N || vaultBusy) return;
    vaultBusy = true;
    const ti = standings().idx.slice().reverse()[revealStep];
    const btn = document.querySelector('[data-act="openVault"]'); if (btn) btn.disabled = true;
    const card = document.querySelector(`.vault-card[data-team="${ti}"]`); if (card) card.classList.add("shaking");
    sfx.drum();
    setTimeout(() => {
      vaultBusy = false;
      revealStep++;
      renderVaultReveal();
      sfx.vault();
      const amt = $("#va-" + ti); if (amt) countUp(amt, 0, S.scores[ti]);
      const c2 = document.querySelector(`.vault-card[data-team="${ti}"]`);
      if (c2) { burstOn(c2, "#ffd76a", 46); for (let k = 0; k < 5; k++) setTimeout(sfx.coin, 300 + k * 140); }
      if (revealStep === N) setTimeout(() => { sfx.fanfare(); goldConfetti(true); }, 900);
    }, 1000);
  }

  function renderEnd() {
    if (hiddenMode()) { renderVaultReveal(); return; }
    const { idx, rank } = standings();
    const tied = topTied();
    const isTie = tied.length > 1 && S.tieWinner === null;
    const winner = tied.length === 1 ? tied[0] : S.tieWinner;
    // 시상대 배치: 2등 1등 3등 4등…
    const layout = N >= 3 ? [idx[1], idx[0], idx[2], ...idx.slice(3)] : idx;
    const heights = [46, 38, 31, 25, 22, 20];
    $("#screen-end").innerHTML = `
      <h2 class="end-title">${isTie ? "⚖️ 동점입니다!" : `🏆 ${TEAMS[winner].crest} ${esc(tName(winner))} 우승!`}</h2>
      ${isTie ? `<div class="tie-note">${tied.map((i) => esc(tName(i))).join(" · ")} — 결승 문제 1개로 우승팀을 가립니다</div>` : ""}
      <div class="podium">
        ${layout.map((ti) => {
          let r = rank[ti];
          if (!isTie && S.tieWinner !== null && tied.includes(ti)) r = ti === S.tieWinner ? 1 : 2;
          const h = heights[Math.min(r - 1, heights.length - 1)];
          return `<div class="col ${ti === winner && !isTie ? "winner" : ""}" style="${tStyle(ti)}">
            ${ti === winner && !isTie ? `<div class="crown">👑</div>` : ""}
            <div class="rank">${r}${["ST", "ND", "RD"][r - 1] || "TH"}</div>
            <div class="stand" style="height:${h}vh">
              <div class="crest">${crest(ti)}</div>
              <div class="tname">${esc(tName(ti))}</div>
              <div class="pts">${S.scores[ti]}</div>
            </div></div>`;
        }).join("")}
      </div>
      <div class="end-actions">
        ${isTie ? `<button class="btn big steal" data-act="tieOpen" data-primary>⚡ 동점 결승 문제</button>` : ""}
        <button class="btn ghost" data-act="toBoard">게임판 보기</button>
        <button class="btn ghost" data-act="undo">↶ 되돌리기</button>
        <button class="btn ghost" data-act="new">새 게임</button>
      </div>`;
    if (!isTie) {
      sfx.fanfare(); goldConfetti(true);
      setTimeout(() => { const w = document.querySelector(".podium .winner .stand"); for (let k = 0; k < 4; k++) setTimeout(() => burstOn(w, k % 2 ? "#fff3c4" : TEAMS[winner].accent, 40), k * 350); }, 200);
    }
  }
  /* ---------- 중간 집계 ---------- */
  const tallyRound = () => C.midTallyAfterRound || 0;
  const tallyReached = () => tallyRound() > 0 && S && S.turn >= tallyRound() * N && S.turn < TOTAL;
  function hourglassesHTML() {
    const max = Math.max(...S.scores);
    return `<div class="hourglasses">${TEAMS.map((t, i) => {
      // 1등 대비 상대적인 높이만 보여줌 (정확한 점수는 비밀)
      const pct = max > 0 ? Math.round(6 + (S.scores[i] / max) * 80) : 6;
      return `<div class="hg" style="--gem:${t.gem || t.accent};--color:${t.color};--delay:${i * 0.25}s">
        <div class="hg-glass">
          <div class="hg-cap"></div>
          <div class="hg-bulb top"><div class="hg-sand" style="height:${100 - pct}%"></div></div>
          <div class="hg-neck"><div class="hg-stream"></div></div>
          <div class="hg-bulb bottom"><div class="hg-sand" style="height:${pct}%"></div></div>
          <div class="hg-cap"></div>
        </div>
        <div class="hg-name">${t.crest} ${esc(t.name)}</div>
      </div>`;
    }).join("")}</div>`;
  }
  // 중간 집계를 아직 안 봤으면 띄움. 다른 창이 열려 있으면 그 창이 닫힐 때 다시 시도
  function autoTally() {
    if (!tallyReached() || S.tallyShown) return;
    if (modal) return;   // closeModal() 에서 다시 부름
    openTally();
  }
  function openTally() {
    if (modal) return;
    S.tallyShown = true; save();
    modal = { stage: "tally", env: -1, team: 0 };
    openModal();
    sfx.sparkle();
    setTimeout(() => { for (let k = 0; k < 6; k++) setTimeout(sfx.coin, k * 260); }, 300);
  }

  function openTie() {
    modal = { stage: "tie", tied: topTied(), showAnswer: false, env: -1, team: 0 };
    openModal();
  }

  /* ====================== 규칙 안내 슬라이드 ====================== */
  function slides() {
    const rp = C.mission.rankPoints;
    return [
      `<div class="slide parchment">
        <h2>✉️ 게임 방법 <small>HOW TO PLAY</small></h2>
        <ul>
          <li><span class="b">🏰</span><span><em>${N}개 기숙사</em> 팀 대결! (팀당 ${C.membersPerTeam}명)</span></li>
          <li><span class="b">🦉</span><span>A~X, <em>${TOTAL}개의 부엉이 편지</em> 중 하나를 골라요</span></li>
          <li><span class="b">🎲</span><span>첫 순서는 <em>랜덤 추첨</em>! 정해진 순서대로 한 장씩</span></li>
          <li><span class="b">🔁</span><span><em>${ROUNDS}바퀴</em> = 팀당 ${ROUNDS}번 → ${TOTAL}장 모두 열리면 끝</span></li>
          <li><span class="b">📦</span><span>봉투 속엔 📜 <em>퀴즈</em> · ⚔️ <em>미션</em> · 🎁 <em>아이템</em></span></li>
          ${C.hiddenScores !== false ? `<li><span class="b">🔐</span><span>점수는 <em>잠긴 금고</em>에 비밀!${tallyRound() ? ` ${tallyRound()}바퀴 뒤 <em>⏳ 모래시계</em>로 살짝 공개` : ""}</span></li>` : ""}
          <li><span class="b">🏆</span><span>마지막에 금고 오픈! 가장 많이 모은 팀 우승 · 동점이면 <em>결승 문제</em></span></li>
        </ul>
        <div class="host-note">👑 사회자 재량으로 <b>가산점·감점</b> 가능! <b>사회자에게 잘 보이는 것은 필수!!</b> 😎</div>
      </div>`,
      `<div class="slide parchment">
        <h2>📜 퀴즈 & ⚔️ 미션 <small>QUIZ & MISSION</small></h2>
        <div class="cols">
          <div class="box">
            <h3>📜 퀴즈</h3>
            <ul>
              <li><span class="b">☝️</span><span>고른 팀이 먼저! 제한시간 안에 <em>한 번</em> 답하기</span></li>
              <li><span class="b">👥</span><span><em>함께 퀴즈</em>는 팀 전원이 힘을 모아!</span></li>
              <li><span class="b">⭕</span><span>정답 <em>+${C.quiz.points}점</em> · 틀려도 감점 없음</span></li>
            </ul>
            <div class="steal-note">⚡ <b>스틸 찬스</b><br>틀리거나 시간 초과 → <b>가장 먼저 손 든 1팀</b>만 한 번 답! 성공하면 +${C.quiz.points}점</div>
          </div>
          <div class="box">
            <h3>⚔️ 미션</h3>
            <ul>
              <li><span class="b">👥</span><span><em>4팀 모두</em> 참가하는 미니게임!</span></li>
              <li><span class="b">🥇</span><span>${rp.map((p, i) => `${i + 1}등 <em>${p}</em>`).join(" · ")}</span></li>
              <li><span class="b">🎁</span><span>봉투 고른 팀이 1등하면 <em>보너스 +${C.mission.pickerWinBonus}점</em></span></li>
            </ul>
          </div>
        </div>
      </div>`,
      `<div class="slide parchment">
        <h2>🎁 아이템 효과표 <small>MAGIC ITEMS</small></h2>
        <table class="items">${ITEM_KEYS.map((k) => `<tr><td>${itemIcon(k)}</td><td>${esc(C.items[k].name)}</td><td>${esc(itemShort(k))}</td></tr>`).join("")}</table>
        <div class="foot">
          ${ITEM_KEYS.every(itemNeedsQuiz)
            ? `<span>🎯 <b>상식 문제를 맞힌 팀</b>은 <b>+${itemQuizCfg().points ?? C.quiz.points}점</b>과 봉투 속 아이템을 받아요 — 복불복! 🎲 (틀리면 스틸)</span>
               ${itemQuizCfg().allowPass !== false ? `<span>🔄 열기 전에 <b>다른 팀에게 넘길 수도</b> 있어요!</span>` : ""}`
            : `<span>🎯 ${ITEM_KEYS.filter(itemNeedsQuiz).map((k) => C.items[k].icon).join("")} <b>상식 문제를 맞혀야</b> 받음 (틀리면 스틸!)</span>
               <span>💥 ${ITEM_KEYS.filter((k) => !itemNeedsQuiz(k)).map((k) => C.items[k].icon).join("")} <b>즉시 발동</b></span>`}
          <span>🛡️ <b>0점 아래로</b> 안 내려가요</span></div>
      </div>`,
    ];
  }
  function openRules(i) { rulesSlide = i; $("#rules").hidden = false; renderRules(); }
  function closeRules() { rulesSlide = -1; $("#rules").hidden = true; }
  function renderRules() {
    const all = slides();
    rulesSlide = Math.max(0, Math.min(all.length - 1, rulesSlide));
    $("#rules-panel").innerHTML = all[rulesSlide].replace(/<\/div>\s*$/, `
      <div class="slide-nav">
        <button data-r="prev">◀</button>
        ${all.map((_, k) => `<span class="dot ${k === rulesSlide ? "on" : ""}"></span>`).join("")}
        <button data-r="next">▶</button>
        <span>← → 넘기기 · Esc 닫기</span>
        <button data-r="close">✕ 닫기</button>
      </div></div>`);
  }

  /* ====================== 입력 ====================== */
  document.addEventListener("click", (ev) => {
    ac(); // 첫 클릭에서 오디오 허용
    const r = ev.target.closest("[data-r]");
    if (r) {
      if (r.dataset.r === "prev") { rulesSlide--; renderRules(); }
      if (r.dataset.r === "next") { if (rulesSlide >= slides().length - 1) closeRules(); else { rulesSlide++; renderRules(); } }
      if (r.dataset.r === "close") closeRules();
      return;
    }
    const b = ev.target.closest("[data-act]");
    if (b && !b.disabled) act(b.dataset.act, b.dataset.arg);
  });

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.().catch(() => toast("F11 키로 전체화면을 켜 주세요"));
  }

  // 사회자 몰래 보기: Shift 를 누르고 있는 동안만 실제 점수 표시
  document.addEventListener("keyup", (ev) => { if (ev.key === "Shift") document.body.classList.remove("peek"); });
  window.addEventListener("blur", () => document.body.classList.remove("peek"));

  document.addEventListener("keydown", (ev) => {
    ac();
    const k = ev.key;
    if (k === "Shift") { document.body.classList.add("peek"); return; }
    if ((ev.ctrlKey || ev.metaKey) && (k === "z" || k === "Z")) { ev.preventDefault(); if (rulesSlide >= 0) closeRules(); undo(); return; }
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;

    // 규칙 안내가 열려 있을 때
    if (rulesSlide >= 0) {
      if (k === "ArrowRight" || k === "PageDown" || k === " " || k === "Enter") { ev.preventDefault(); if (rulesSlide >= slides().length - 1) closeRules(); else { rulesSlide++; renderRules(); } }
      else if (k === "ArrowLeft" || k === "PageUp") { ev.preventDefault(); rulesSlide--; renderRules(); }
      else if (k === "Escape" || k === "1") closeRules();
      else if (k === "2") { if (rulesSlide === 2) closeRules(); else { rulesSlide = 2; renderRules(); } }
      return;
    }
    if (k === "1") { openRules(0); return; }
    if (k === "2") { openRules(2); return; }
    if (k === "3" && !modal && view === "board" && tallyReached()) { openTally(); return; }
    if (k === "0") { toggleFullscreen(); return; }
    if (k === "9") { act("sound"); return; }

    if (modal) {
      if (k === "Escape" && (modal.stage === "confirm" || modal.stage === "tie" || modal.stage === "tally")) { closeModal(); return; }
      if (k === " ") { ev.preventDefault(); if (modal.timer) toggleTimer(); return; }
      if (k === "Enter") { ev.preventDefault(); const p = document.querySelector("#modal-panel [data-primary]"); if (p) p.click(); return; }
      return;
    }
    if (k === "Enter") {
      const p = document.querySelector(".screen.active [data-primary]");
      if (p && !p.disabled) { ev.preventDefault(); p.click(); }
      return;
    }
    if (view === "board" && /^[a-xA-X]$/.test(k)) {
      pickEnvelope(LETTERS.indexOf(k.toUpperCase()));
    }
  });

  /* ====================== 시작 ====================== */
  checkMix();
  load();
  if (S && !S.tickets) S.tickets = range(N).map(() => 0);
  if (S && (!S.itemQuizOrder || S.itemQuizOrder.length !== (T.itemQuizzes || []).length)) { S.itemQuizOrder = shuffle(range((T.itemQuizzes || []).length)); S.itemQuizPtr = S.itemQuizPtr || 0; }
  if (S) shown = S.scores.slice();
  render();
})();
