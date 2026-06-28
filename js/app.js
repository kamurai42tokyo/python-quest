/*
 * app.js — Python Module Quest 本体 (Phase 0)
 * ------------------------------------------------------------------
 * collection_quest の app.js を踏襲しつつ、出題軸を変更:
 *   - カテゴリは「単一選択」(その人物の人生を生きる)
 *   - 出題形式は複数選択 (出力予測 / 穴埋め・用語 / デバッグ)
 *   - 作り込み問題は question/code/answer/distractors を使い、毎回シャッフル
 *   - 正解数 = レベル。Character が人生段階を進める
 *
 * Phase 0 ではカテゴリ「基礎・構文」のみデータあり。他は「準備中」。
 */
(function () {
  "use strict";

  var DATA = window.QUIZ_DATA || [];

  // 5カテゴリ (単一選択)
  var CATEGORIES = [
    "基礎・構文", "関数・関数型", "OOP", "データ操作", "プログラム構成・堅牢性"
  ];

  // 出題形式 (複数選択)
  var MODES = [
    { key: "output", label: "出力予測" },
    { key: "fill", label: "穴埋め・用語" },
    { key: "debug", label: "デバッグ" }
  ];
  var MODE_LABEL = { output: "出力予測", fill: "穴埋め・用語", debug: "デバッグ" };

  var RECENT_KEY = "pmq_recent";
  var RECENT_MAX = 8;

  // ------- 状態 -------
  var state = {
    category: "基礎・構文",
    selectedModes: new Set(["output", "fill", "debug"]),
    count: 10,
    index: 0,
    score: 0,
    answered: false,
    pool: [],
    current: null,
    used: {},
    recentSet: null,
    lastId: null,
    sceneBand: null
  };

  // ------- ユーティリティ -------
  function $(id) { return document.getElementById(id); }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function sample(arr, n) { return shuffle(arr).slice(0, n); }

  function getRecent() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; }
    catch (e) { return []; }
  }
  function pushRecent(id) {
    var r = getRecent();
    r.push(id);
    while (r.length > RECENT_MAX) r.shift();
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(r)); } catch (e) {}
  }

  // 選択中のカテゴリ・形式に合う問題プール
  function buildPool() {
    return DATA.filter(function (q) {
      return q.category === state.category && state.selectedModes.has(q.format);
    });
  }

  function countOfCategory(cat) {
    return DATA.filter(function (q) { return q.category === cat; }).length;
  }

  // 1問を作る: 正解+ダミーをシャッフルして4択に。
  function makeQuestion(src) {
    var opts = [src.answer].concat(src.distractors || []);
    // 念のため4択に満たない場合は他問の答えで補充
    if (opts.length < 4) {
      var extra = shuffle(DATA.filter(function (q) {
        return q.category === src.category && q.answer !== src.answer;
      }).map(function (q) { return q.answer; }));
      for (var i = 0; i < extra.length && opts.length < 4; i++) {
        if (opts.indexOf(extra[i]) === -1) opts.push(extra[i]);
      }
    }
    return {
      src: src,
      formatLabel: MODE_LABEL[src.format] || src.format,
      difficulty: src.difficulty || 1,
      questionText: src.question,
      code: src.code || null,
      correctText: src.answer,
      options: shuffle(opts.slice(0, 4)),
      mono: src.format !== "debug" || true // 解答はだいたいコード片なので等幅
    };
  }

  // 現在のキャラLv(=正解数)で難易度を決める。
  // Lv0-10=易(1) / Lv11-15=難(2) / Lv16-20=最難(3)。
  // ＝ エンジニアに成長(Lv11/16以上)してから問題が難しくなる(苦戦中は易しいまま)。
  function difficultyForLevel(level) {
    return level <= 10 ? 1 : level <= 15 ? 2 : 3;
  }

  // 候補配列から1問選ぶ。未使用かつ直近でない→未使用→(尽きたら)既出も許容(直前は除く)。
  function preferFrom(arr, used, recent, lastId) {
    if (!arr.length) return null;
    var a = arr.filter(function (q) { return !used[q.id] && !recent.has(q.id) && q.id !== lastId; });
    if (a.length) return sample(a, 1)[0];
    a = arr.filter(function (q) { return !used[q.id] && q.id !== lastId; });
    if (a.length) return sample(a, 1)[0];
    a = arr.filter(function (q) { return q.id !== lastId; });   // 既出を許容(同難易度内で繰り返す)
    if (a.length) return sample(a, 1)[0];
    return sample(arr, 1)[0];
  }

  // 難易度は「目標を死守」: 目標難易度が尽きたら同難易度を繰り返し、
  // それでも無ければ初めて難易度差を広げる。
  // → 苦戦してLvが上がらない限り、難しい問題は出ない。
  function pickByTier(pool, tier, used, recent, lastId) {
    var exact = pool.filter(function (q) { return (q.difficulty || 1) === tier; });
    var chosen = preferFrom(exact, used, recent, lastId);
    if (chosen) return chosen;  // 目標難易度に問題があれば、繰り返してでもそれを使う
    for (var dist = 1; dist <= 2; dist++) {
      var near = pool.filter(function (q) { return Math.abs((q.difficulty || 1) - tier) === dist; });
      chosen = preferFrom(near, used, recent, lastId);
      if (chosen) return chosen;
    }
    return sample(pool, 1)[0];
  }

  // 現在のレベルに応じた難易度で次の1問を抽選し state.current にセット。
  function pickCurrent() {
    var tier = difficultyForLevel(state.score);
    var src = pickByTier(state.pool, tier, state.used, state.recentSet, state.lastId);
    if (!src) { state.current = null; return false; }
    state.used[src.id] = true;
    state.lastId = src.id;
    state.current = makeQuestion(src);
    return true;
  }

  // ------- クイズ進行 -------
  function startQuiz() {
    state.pool = buildPool();
    state.count = parseInt($("question-count").value, 10);
    state.index = 0;
    state.score = 0;
    state.used = {};
    state.recentSet = new Set(getRecent());
    state.lastId = null;
    if (window.Character) {
      Character.select(state.category);
      Character.mount();
      Character.reset();
    }
    showScreen("quiz-screen");
    state.sceneBand = null;
    updateScene();
    pickCurrent();
    renderQuestion();
  }

  // 現在のレベル帯(5刻み)に応じてテーマ背景を描く。帯が変わった時だけ再描画。
  function updateScene() {
    if (!window.Scene) return;
    var cv = $("scene-bg");
    if (!cv) return;
    var band = Scene.bandOf(state.score);
    if (band === state.sceneBand) return;
    state.sceneBand = band;
    Scene.draw(cv, state.category, band);
  }

  function updateGauges() {
    var total = state.count;
    $("score").textContent = "⚔ 正解 " + state.score;
    $("progress-fill").style.width = (total ? (state.score / total * 100) : 0) + "%";
  }

  function renderQuestion() {
    state.answered = false;
    var q = state.current;
    var total = state.count;

    $("progress").textContent = (state.index + 1) + " / " + total;
    updateGauges();
    $("q-tag").textContent = q.formatLabel + (q.difficulty >= 3 ? " ★★" : q.difficulty === 2 ? " ★" : "");
    $("question-text").textContent = q.questionText;

    var codeEl = $("question-code");
    if (q.code) { codeEl.textContent = q.code; codeEl.hidden = false; }
    else { codeEl.hidden = true; }

    var choicesEl = $("choices");
    choicesEl.innerHTML = "";
    q.options.forEach(function (opt) {
      var btn = document.createElement("button");
      btn.className = "choice" + (q.mono ? " mono" : "");
      btn.textContent = opt;
      btn.addEventListener("click", function () { onAnswer(btn, opt, q); });
      choicesEl.appendChild(btn);
    });

    $("feedback").hidden = true;
    $("next-btn").hidden = true;
  }

  function onAnswer(btn, chosen, q) {
    if (state.answered) return;
    state.answered = true;

    var ok = chosen === q.correctText;
    if (ok) state.score++;
    pushRecent(q.src.id);

    $("choices").querySelectorAll(".choice").forEach(function (b) {
      b.disabled = true;
      if (b.textContent === q.correctText) b.classList.add("correct");
      else if (b === btn) b.classList.add("wrong");
    });

    var fb = $("feedback");
    fb.innerHTML =
      '<span class="verdict ' + (ok ? "ok" : "ng") + '">' +
      (ok ? "⚔ せいかい！ 経験値を得た" : "💥 ミス…！ 解説で強くなろう") + "</span>" +
      '<div class="explain">' + escapeHtml(q.src.explanation || "") + "</div>";
    fb.hidden = false;

    updateGauges();
    if (window.Character) Character.update(state.score);
    updateScene();

    var nb = $("next-btn");
    nb.textContent = (state.index + 1 < state.count) ? "つぎへ ▶" : "けっかへ ▶";
    nb.hidden = false;
  }

  function nextQuestion() {
    state.index++;
    if (state.index < state.count) { pickCurrent(); renderQuestion(); }
    else showResult();
  }

  function showResult() {
    showScreen("result-screen");
    var total = state.count;
    var pct = total ? Math.round(state.score / total * 100) : 0;

    if (window.Character) {
      var host = $("result-char");
      host.innerHTML = "";
      host.appendChild(Character.canvasFor(state.score, 6));
      var lv = Math.min(state.score, Character.MAX_LEVEL);
      $("result-rank").textContent =
        Character.nameOf() + " は「" + Character.titleOf(state.score) + "」になった （Lv." + lv + "）";
      $("result-line").textContent = Character.lineOf(state.score);
    }

    $("result-score").textContent = "⚔ 正解 " + state.score + " / " + total;
    var msg;
    if (pct === 100) msg = "全問正解！ レジェンドへの道は近い 🎉";
    else if (pct >= 80) msg = "あと少し！ かなりの実力 💪";
    else if (pct >= 50) msg = "good。解説を読めばもっと伸びる 📖";
    else msg = "旅は始まったばかり。再挑戦で育てよう 🌱";
    $("result-message").textContent = "正答率 " + pct + "% — " + msg;
  }

  // ------- 画面切替 -------
  function showScreen(id) {
    ["start-screen", "quiz-screen", "result-screen"].forEach(function (s) {
      $(s).hidden = (s !== id);
    });
    // 出題中はヘッダー(タイトル/サブタイトル)を隠して上に詰める(スマホのスクロール削減)
    document.body.classList.toggle("in-quiz", id === "quiz-screen");
    window.scrollTo(0, 0);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // ------- フィルタUI -------
  function renderFilters() {
    // カテゴリ = キャラ一覧 (横長カードを縦積み・単一選択)
    var gallery = $("category-gallery");
    CATEGORIES.forEach(function (c) {
      var info = (window.Character && Character.infoOf) ? Character.infoOf(c) : { name: c, desc: "" };
      var card = document.createElement("button");
      card.type = "button";
      card.className = "char-card";
      card.setAttribute("role", "radio");
      card.setAttribute("aria-checked", c === state.category ? "true" : "false");

      var sprite = document.createElement("div");
      sprite.className = "char-card-sprite";
      if (window.Character) { Character.select(c); sprite.appendChild(Character.canvasFor(0, 3)); }
      card.appendChild(sprite);

      var text = document.createElement("div");
      text.className = "char-card-text";
      var head = document.createElement("div");
      head.className = "char-card-head";
      var nm = document.createElement("span"); nm.className = "char-card-name"; nm.textContent = info.name || c;
      var cat = document.createElement("span"); cat.className = "char-card-cat"; cat.textContent = c;
      head.appendChild(nm); head.appendChild(cat);
      var desc = document.createElement("span"); desc.className = "char-card-desc"; desc.textContent = info.desc;
      text.appendChild(head); text.appendChild(desc);
      card.appendChild(text);

      card.addEventListener("click", function () {
        state.category = c;
        gallery.querySelectorAll(".char-card").forEach(function (el) { el.setAttribute("aria-checked", "false"); });
        card.setAttribute("aria-checked", "true");
      });
      gallery.appendChild(card);
    });

    // 形式: 複数選択
    var modeBox = $("mode-filters");
    MODES.forEach(function (m) {
      var chip = document.createElement("button");
      chip.className = "chip";
      chip.type = "button";
      chip.textContent = m.label;
      chip.setAttribute("aria-pressed", state.selectedModes.has(m.key) ? "true" : "false");
      chip.addEventListener("click", function () {
        var now = chip.getAttribute("aria-pressed") !== "true";
        chip.setAttribute("aria-pressed", now ? "true" : "false");
        if (now) state.selectedModes.add(m.key); else state.selectedModes.delete(m.key);
      });
      modeBox.appendChild(chip);
    });
  }

  function validateStart() {
    var err = $("start-error");
    if (state.selectedModes.size === 0) {
      err.textContent = "出題形式を1つ以上選んでください。";
      err.hidden = false; return false;
    }
    if (buildPool().length === 0) {
      err.textContent = "選んだ範囲に問題がありません。形式を増やしてください。";
      err.hidden = false; return false;
    }
    err.hidden = true;
    return true;
  }

  // ------- 初期化 -------
  function init() {
    renderFilters();
    $("start-btn").addEventListener("click", function () {
      if (validateStart()) startQuiz();
    });
    $("next-btn").addEventListener("click", nextQuestion);
    $("retry-btn").addEventListener("click", startQuiz);
    $("home-btn").addEventListener("click", function () { showScreen("start-screen"); });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
