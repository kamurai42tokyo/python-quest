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
    questions: [],
    index: 0,
    score: 0,
    answered: false
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
      questionText: src.question,
      code: src.code || null,
      correctText: src.answer,
      options: shuffle(opts.slice(0, 4)),
      mono: src.format !== "debug" || true // 解答はだいたいコード片なので等幅
    };
  }

  // 出題セットを作る。プールが少なければ重複を許容しつつ直近を避ける。
  function buildQuestionSet(count) {
    var pool = buildPool();
    if (pool.length === 0) return [];
    var recent = new Set(getRecent());
    var fresh = pool.filter(function (q) { return !recent.has(q.id); });
    var bag = shuffle(fresh.length ? fresh : pool);
    var used = {};
    var out = [];
    while (out.length < count) {
      if (bag.length === 0) {
        // 1巡したら再補充 (重複許容)。同一問の連続だけは避ける。
        bag = shuffle(pool);
      }
      var q = bag.shift();
      if (out.length > 0 && out[out.length - 1].src.id === q.id && pool.length > 1) {
        bag.push(q); // 直前と同じなら後回し
        continue;
      }
      out.push(makeQuestion(q));
      used[q.id] = true;
    }
    return out;
  }

  // ------- クイズ進行 -------
  function startQuiz() {
    var count = parseInt($("question-count").value, 10);
    state.questions = buildQuestionSet(count);
    state.index = 0;
    state.score = 0;
    if (window.Character) {
      Character.select(state.category);
      Character.mount();
      Character.reset();
    }
    showScreen("quiz-screen");
    renderQuestion();
  }

  function updateGauges() {
    var total = state.questions.length;
    $("score").textContent = "⚔ 正解 " + state.score;
    $("progress-fill").style.width = (total ? (state.score / total * 100) : 0) + "%";
  }

  function renderQuestion() {
    state.answered = false;
    var q = state.questions[state.index];
    var total = state.questions.length;

    $("progress").textContent = (state.index + 1) + " / " + total;
    updateGauges();
    $("q-tag").textContent = q.formatLabel;
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

    var nb = $("next-btn");
    nb.textContent = (state.index + 1 < state.questions.length) ? "つぎへ ▶" : "けっかへ ▶";
    nb.hidden = false;
  }

  function nextQuestion() {
    state.index++;
    if (state.index < state.questions.length) renderQuestion();
    else showResult();
  }

  function showResult() {
    showScreen("result-screen");
    var total = state.questions.length;
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
    window.scrollTo(0, 0);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // ------- フィルタUI -------
  function renderFilters() {
    // カテゴリ: 単一選択 (ラジオ的)
    var catBox = $("category-filters");
    CATEGORIES.forEach(function (c) {
      var ready = countOfCategory(c) > 0;
      var chip = document.createElement("button");
      chip.className = "chip" + (ready ? "" : " chip-soon");
      chip.type = "button";
      chip.textContent = ready ? c : c + "（準備中）";
      chip.setAttribute("aria-pressed", c === state.category ? "true" : "false");
      if (!ready) { chip.disabled = true; }
      chip.addEventListener("click", function () {
        if (!ready) return;
        state.category = c;
        catBox.querySelectorAll(".chip").forEach(function (b) {
          b.setAttribute("aria-pressed", "false");
        });
        chip.setAttribute("aria-pressed", "true");
        updatePreview();
      });
      catBox.appendChild(chip);
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

  // スタート画面: 選択中カテゴリの人物(Lv0=はじまりの姿)を表示
  function updatePreview() {
    if (!window.Character) return;
    Character.select(state.category);
    var host = $("preview-sprite");
    if (host) { host.innerHTML = ""; host.appendChild(Character.canvasFor(0, 4)); }
    var nm = $("preview-name");
    if (nm) nm.textContent = Character.nameOf();
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
    updatePreview();
    $("start-btn").addEventListener("click", function () {
      if (validateStart()) startQuiz();
    });
    $("next-btn").addEventListener("click", nextQuestion);
    $("retry-btn").addEventListener("click", startQuiz);
    $("home-btn").addEventListener("click", function () { showScreen("start-screen"); });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
