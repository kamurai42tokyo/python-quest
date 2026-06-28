/*
 * characters.js — 進化する「人生」キャラ (パラメトリック・ドット絵)
 * ------------------------------------------------------------------
 * 正解数 = レベル。1正解ごとに人生が1段階進む(最大20)。
 * カテゴリごとに1人の人物がいて、その人物の人生を 0..20 の段階で描く。
 *   Lv9  : Piscine受験生 / Lv10 : 42tokyo生 (全キャラ共通の節目) / Lv20 : レジェンド
 *   Lv10以降は色の系統転換 + 発光オーラ + 縁取りグロー等でインパクトを付ける。
 *
 * 5キャラ:
 *   基礎・構文            = ハジメ (堅実派の人間)
 *   関数・関数型          = ラム   (高校中退・独学の女の子)
 *   OOP                  = タクミ (専門学校→42 の男の子)
 *   プログラム構成・堅牢性 = ラー王 (蘇ったエジプトの王)
 *   データ操作            = デー太 (犬。取ってくる=fetch)
 *
 * 描画は外部画像を使わず、32x40 のドットを <canvas> に拡大描画する。
 */

window.Character = (function () {
  "use strict";

  var W = 32, H = 40, MAX_LEVEL = 20;

  var PAL = {
    ".": null,
    K: [38, 36, 54], s: [242, 200, 150], S: [214, 158, 110],
    h: [96, 62, 32], H: [54, 36, 20],
    p: [255, 200, 214], P: [235, 170, 188],
    w: [245, 245, 245], e: [59, 36, 23], m: [179, 114, 78],
    r: [206, 78, 70], R: [150, 48, 44],
    b: [70, 120, 170], B: [48, 88, 130],
    n: [60, 210, 215], N: [26, 32, 48], Q: [16, 20, 34],
    y: [245, 197, 24], V: [160, 107, 255], L: [70, 200, 120],
    M: [230, 90, 170], O: [222, 138, 58], D: [206, 158, 100],
    d: [52, 56, 72], g: [128, 140, 156], G: [92, 100, 116],
    c: [200, 204, 212], C: [136, 204, 255], k: [44, 44, 54], o: [124, 92, 60],
    // 発光(アウトライン対象外)
    a: [150, 235, 240], j: [130, 255, 180], u: [190, 150, 255],
    q: [255, 130, 130], z: [255, 225, 130], x: [255, 150, 225], F: [255, 255, 255]
  };
  var GLOW = { a: 1, j: 1, u: 1, q: 1, z: 1, x: 1, F: 1 };

  // ---------- グリッド ----------
  function mkGrid() {
    var g = new Array(H);
    for (var y = 0; y < H; y++) { g[y] = new Array(W); for (var x = 0; x < W; x++) g[y][x] = "."; }
    return g;
  }
  function clone(g) { var o = new Array(H); for (var y = 0; y < H; y++) o[y] = g[y].slice(); return o; }
  function rect(g, x0, y0, x1, y1, c) {
    for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++)
      if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = c;
  }
  function px(g, x, y, c) { if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = c; }
  var NB = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  function addOutline(g) {
    var out = clone(g);
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      if (g[y][x] !== ".") continue;
      for (var i = 0; i < 4; i++) {
        var nx = x + NB[i][0], ny = y + NB[i][1];
        if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
        var v = g[ny][nx];
        if (v !== "." && v !== "K" && !GLOW[v]) { out[y][x] = "K"; break; }
      }
    }
    return out;
  }
  function addEdgeGlow(g, col) {
    var out = clone(g);
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      if (g[y][x] !== ".") continue;
      for (var i = 0; i < 4; i++) {
        var nx = x + NB[i][0], ny = y + NB[i][1];
        if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
        if (g[ny][nx] === "K") { out[y][x] = col; break; }
      }
    }
    return out;
  }

  // ---------- 発光・オーラ ----------
  var R_SMALL = [[8, 12], [24, 12], [7, 24], [25, 24], [16, 4]];
  var R_MED = R_SMALL.concat([[5, 17], [27, 17], [9, 33], [23, 33], [16, 1]]);
  var R_BIG = R_MED.concat([[3, 13], [29, 13], [3, 27], [29, 27], [10, 2], [22, 2], [16, 38], [6, 7], [26, 7]]);
  function glowRing(g, pts, col) { for (var i = 0; i < pts.length; i++) px(g, pts[i][0], pts[i][1], col); }
  function drawAuraBack(g, cfg) {
    switch (cfg.aura) {
      case "screen": glowRing(g, R_SMALL, "a"); break;
      case "cyan": glowRing(g, R_MED, "a"); break;
      case "green": glowRing(g, R_MED, "j"); break;
      case "violet": glowRing(g, R_MED, "u"); break;
      case "magenta": glowRing(g, R_MED, "x"); break;
      case "gold": glowRing(g, R_BIG, "z"); break;
      case "red": glowRing(g, R_BIG, "q"); break;
      case "rainbow":
        var cols = ["q", "z", "j", "a", "x"];
        for (var i = 0; i < R_BIG.length; i++) px(g, R_BIG[i][0], R_BIG[i][1], cols[i % cols.length]);
        break;
    }
  }
  function drawSparksFront(g, cfg) {
    var s = null;
    if (cfg.aura === "violet") s = "u"; else if (cfg.aura === "magenta") s = "x";
    else if (cfg.aura === "red") s = "q"; else if (cfg.aura === "rainbow") s = "F";
    if (!s) return;
    var pts = [[10, 7], [22, 6], [8, 29], [24, 28], [16, 2]];
    for (var i = 0; i < pts.length; i++) px(g, pts[i][0], pts[i][1], s);
  }
  var ORBIT_POS = [[5, 11], [26, 11], [4, 21], [27, 21], [7, 33], [24, 33], [16, 2], [16, 38]];
  function drawOrbits(g, cfg) {
    if (!cfg.orbits) return;
    var rb = ["q", "z", "j", "a", "x"];
    var n = Math.min(cfg.orbits, ORBIT_POS.length);
    for (var i = 0; i < n; i++) {
      var col = cfg.orbitColor === "rainbow" ? rb[i % rb.length] : (cfg.orbitColor || "a");
      px(g, ORBIT_POS[i][0], ORBIT_POS[i][1], col); px(g, ORBIT_POS[i][0] + 1, ORBIT_POS[i][1], col);
    }
  }

  // ---------- 顔・髪・頭 ----------
  function drawFace(g, ey) {
    px(g, 13, ey, "e"); px(g, 13, ey + 1, "e"); px(g, 14, ey, "w");
    px(g, 18, ey, "e"); px(g, 18, ey + 1, "e"); px(g, 19, ey, "w");
    px(g, 11, ey + 3, "P"); px(g, 20, ey + 3, "P");
    px(g, 15, ey + 4, "m"); px(g, 16, ey + 4, "m");
  }
  function drawHair(g, cfg) {
    var hc = cfg.hair || "h";
    if (cfg.hairStyle === "none") { rect(g, 13, 4, 18, 5, hc); return; }
    rect(g, 10, 4, 21, 7, hc); rect(g, 9, 6, 10, 10, hc); rect(g, 21, 6, 22, 10, hc);
    rect(g, 11, 7, 20, 8, hc); px(g, 14, 8, "H"); px(g, 17, 8, "H");
    if (cfg.hairStyle === "long") {
      rect(g, 9, 8, 10, 21, hc); rect(g, 21, 8, 22, 21, hc);
      if (cfg.hairStreak) { px(g, 9, 13, cfg.hairStreak); px(g, 9, 15, cfg.hairStreak); px(g, 9, 17, cfg.hairStreak); }
    }
  }
  function drawHood(g, cfg) {
    var c = cfg.hoodC || cfg.outfit || "N";
    rect(g, 8, 4, 10, 18, c); rect(g, 21, 4, 23, 18, c); rect(g, 9, 3, 22, 5, c);
  }
  function drawDogHead(g, cfg) {
    var fur = cfg.fur || "D";
    rect(g, 8, 6, 11, 15, "o"); rect(g, 20, 6, 23, 15, "o");      // 垂れ耳
    rect(g, 11, 6, 20, 16, fur); rect(g, 10, 8, 21, 15, fur);     // 頭
    rect(g, 12, 13, 19, 18, "D"); rect(g, 11, 15, 20, 18, "D");   // マズル
    rect(g, 15, 14, 16, 15, "K");                                  // 鼻
    px(g, 13, 11, "e"); px(g, 18, 11, "e"); px(g, 14, 10, "w"); px(g, 19, 10, "w");
    px(g, 15, 17, "K"); px(g, 16, 17, "K");                        // 口
    if (cfg.tongue) { px(g, 15, 18, "r"); px(g, 16, 18, "r"); }
  }
  function drawHead(g, cfg) {
    switch (cfg.head) {
      case "band":
        var bc = cfg.bandC || "r"; rect(g, 10, 5, 21, 6, bc); px(g, 9, 6, "H"); px(g, 22, 6, "H"); break;
      case "cap":
        rect(g, 9, 3, 22, 6, cfg.capC || "N"); rect(g, 8, 6, 14, 7, cfg.capC || "N"); break;
      case "cap42":
        rect(g, 9, 3, 22, 6, "N"); rect(g, 8, 6, 14, 7, "N");
        px(g, 14, 4, "n"); px(g, 15, 4, "w"); px(g, 16, 4, "n"); break;
      case "crown":
        rect(g, 10, 3, 21, 4, "y");
        px(g, 11, 2, "y"); px(g, 13, 1, "y"); px(g, 16, 0, "y"); px(g, 19, 1, "y"); px(g, 20, 2, "y");
        px(g, 16, 2, "r"); px(g, 12, 3, "n"); px(g, 19, 3, "n"); break;
      case "wizardhat":
        var wc = cfg.hatC || "V";
        rect(g, 8, 5, 23, 7, wc); rect(g, 12, 2, 19, 5, wc); rect(g, 14, 0, 17, 2, wc);
        px(g, 15, 0, "z"); break;
      case "nemes":
        rect(g, 9, 3, 22, 6, "n");                                 // 頭巾上部
        rect(g, 8, 6, 11, 19, "n"); rect(g, 20, 6, 23, 19, "n");    // 左右の垂れ布
        rect(g, 8, 8, 11, 8, "y"); rect(g, 8, 11, 11, 11, "y"); rect(g, 8, 14, 11, 14, "y"); rect(g, 8, 17, 11, 17, "y");
        rect(g, 20, 8, 23, 8, "y"); rect(g, 20, 11, 23, 11, "y"); rect(g, 20, 14, 23, 14, "y"); rect(g, 20, 17, 23, 17, "y");
        rect(g, 9, 4, 22, 5, "y"); px(g, 15, 3, "y"); px(g, 16, 2, "r"); break; // 額バンド+ウラエウス
    }
    if (cfg.sundisk) { rect(g, 13, 0, 18, 1, "q"); px(g, 12, 1, "q"); px(g, 19, 1, "q"); }
    if (cfg.halo) { rect(g, 11, 0, 20, 0, "z"); px(g, 10, 1, "z"); px(g, 21, 1, "z"); }
    if (cfg.headphones) { rect(g, 8, 5, 9, 13, "k"); rect(g, 22, 5, 23, 13, "k"); rect(g, 9, 3, 22, 4, "k"); }
    if (cfg.beard) { rect(g, 15, 16, 16, 22, "k"); px(g, 15, 19, "n"); px(g, 16, 21, "y"); }
    if (cfg.earring) { px(g, 21, 16, "y"); px(g, 21, 17, "z"); }
    if (cfg.glasses) {
      var gc = cfg.glassesNeon ? "n" : "k";
      rect(g, 12, 11, 14, 12, gc); rect(g, 17, 11, 19, 12, gc); px(g, 15, 11, gc); px(g, 16, 11, gc);
      px(g, 13, 11, "C"); px(g, 18, 11, "C");
    }
  }
  function drawItem(g, cfg) {
    switch (cfg.item) {
      case "pacifier": px(g, 15, 16, "y"); px(g, 16, 16, "y"); px(g, 15, 17, "z"); break;
      case "toy": rect(g, 23, 26, 26, 29, "r"); px(g, 24, 27, "y"); break;
      case "ball": rect(g, 23, 27, 26, 30, "O"); px(g, 24, 28, "w"); break;
      case "book": rect(g, 8, 26, 15, 32, "o"); rect(g, 9, 27, 14, 31, "w"); px(g, 11, 29, "o"); px(g, 12, 29, "o"); break;
      case "laptop": rect(g, 8, 31, 24, 33, "c"); rect(g, 10, 31, 22, 32, "C"); px(g, 16, 33, "G"); break;
      case "briefcase": rect(g, 23, 28, 27, 33, "o"); rect(g, 24, 27, 26, 28, "o"); px(g, 25, 30, "z"); break;
      case "ankh": rect(g, 24, 25, 25, 32, "y"); rect(g, 23, 28, 26, 29, "y"); rect(g, 23, 24, 26, 25, "y"); px(g, 24, 23, "y"); px(g, 25, 23, "y"); break;
      case "gamepad": rect(g, 22, 27, 27, 30, "k"); px(g, 23, 28, "r"); px(g, 26, 28, "C"); px(g, 24, 29, "g"); break;
    }
    if (cfg.coffee) { rect(g, 25, 28, 27, 31, "w"); px(g, 26, 27, "S"); px(g, 25, 28, "o"); }
    if (cfg.sweat) { px(g, 9, 10, "C"); px(g, 9, 11, "C"); }
  }
  function drawCape(g, cfg) {
    if (!cfg.cape) return;
    var c = cfg.cape;
    rect(g, 6, 19, 8, 35, c); rect(g, 24, 19, 26, 35, c);
    rect(g, 7, 33, 8, 36, c); rect(g, 24, 33, 25, 36, c);
  }

  // ---------- 体 ----------
  function drawBaby(g, cfg) {
    var sk = cfg.skin || "s";
    rect(g, 9, 5, 22, 19, sk); rect(g, 21, 7, 22, 18, "S");
    if (cfg.hairStyle !== "bald") rect(g, 12, 5, 19, 6, cfg.hair || "h");
    drawFace(g, 12);
    var oc = cfg.outfit || "p", oe = cfg.outfitEdge || "P";
    rect(g, 11, 20, 20, 30, oc); rect(g, 19, 21, 20, 29, oe);
    rect(g, 12, 28, 19, 31, "w");
    rect(g, 8, 21, 10, 25, sk); rect(g, 21, 21, 23, 25, sk);
    rect(g, 12, 31, 15, 34, sk); rect(g, 16, 31, 19, 34, sk);
  }
  function drawAdult(g, cfg, frame) {
    var sk = cfg.skin || "s";
    var oc = cfg.outfit || "b", oe = cfg.outfitEdge || "B";
    var legY = cfg.short ? 36 : 39;
    if (cfg.headType === "dog") {
      drawDogHead(g, cfg);
    } else if (cfg.mummyHead) {
      rect(g, 11, 6, 20, 16, "w"); rect(g, 10, 8, 21, 15, "w");
      rect(g, 11, 10, 20, 10, "g"); rect(g, 12, 13, 19, 13, "g");   // 包帯の隙間
      px(g, 13, 12, cfg.eyeGlow || "Q"); px(g, 18, 12, cfg.eyeGlow || "Q");
    } else {
      rect(g, 11, 6, 20, 16, sk); rect(g, 10, 8, 21, 15, sk); rect(g, 19, 9, 20, 15, "S");
      drawHair(g, cfg); drawFace(g, 11); if (cfg.hood) drawHood(g, cfg);
    }
    rect(g, 10, 18, 21, 33, oc); rect(g, 9, 20, 22, 31, oc); rect(g, 20, 20, 22, 32, oe);
    if (cfg.wrap) { for (var wy = 19; wy < 32; wy += 3) rect(g, 9, wy, 22, wy, "w"); }
    if (cfg.shirt) rect(g, 14, 18, 17, 26, cfg.shirt);
    if (cfg.accent) rect(g, 15, 18, 16, 30, cfg.accent);
    if (cfg.accent && cfg.shirt) rect(g, 15, 18, 16, 25, cfg.accent);
    rect(g, 7, 22, 10, 31, oc); rect(g, 22, 22, 25, 31, oc); rect(g, 24, 22, 25, 31, oe);
    px(g, 8, 31, sk); px(g, 9, 32, sk); px(g, 23, 31, sk); px(g, 24, 32, sk);
    if (cfg.collar) { rect(g, 11, 18, 20, 19, cfg.collar); px(g, 15, 19, "y"); }
    var aBot = legY - (frame ? 1 : 0), bBot = legY - (frame ? 0 : 1);
    rect(g, 11, 33, 14, aBot, "d"); rect(g, 17, 33, 20, bBot, "d");
    rect(g, 11, aBot, 15, aBot, "K"); rect(g, 16, bBot, 20, bBot, "K");
  }

  // 黄金の柩(縦長の閉じた石棺)
  function drawCoffin(g, cfg) {
    rect(g, 11, 4, 20, 5, "y"); rect(g, 10, 5, 21, 38, "y"); rect(g, 13, 3, 18, 4, "y");
    rect(g, 20, 6, 21, 37, "o");                       // 右影
    rect(g, 9, 6, 22, 8, "n");                          // ネメス上部
    rect(g, 9, 8, 11, 19, "n"); rect(g, 20, 8, 22, 19, "n");
    rect(g, 10, 8, 21, 9, "y");                         // 額バンド
    rect(g, 12, 10, 19, 19, "D");                       // 顔マスク
    rect(g, 13, 13, 14, 13, "K"); rect(g, 17, 13, 18, 13, "K"); // 閉じた目
    px(g, 15, 16, "m"); px(g, 16, 16, "m");
    rect(g, 15, 20, 16, 23, "k");                       // 付け髭
    rect(g, 10, 25, 21, 26, "n"); rect(g, 10, 32, 21, 33, "n"); // 装飾帯
    rect(g, 11, 27, 20, 30, "o"); px(g, 14, 28, "y"); px(g, 17, 28, "y"); // 組んだ腕
    px(g, 13, 35, "n"); px(g, 16, 35, "n"); px(g, 18, 35, "n");
  }

  function buildGrid(cfg, frame) {
    var g = mkGrid();
    drawAuraBack(g, cfg); drawOrbits(g, cfg); drawCape(g, cfg);
    if (cfg.body === "baby") drawBaby(g, cfg);
    else if (cfg.body === "coffin") drawCoffin(g, cfg);
    else drawAdult(g, cfg, frame);
    drawItem(g, cfg); drawHead(g, cfg); drawSparksFront(g, cfg);
    var out = addOutline(g);
    if (cfg.edgeGlow) out = addEdgeGlow(out, cfg.edgeGlow);
    return out;
  }

  function paint(canvas, cfg, frame, scale) {
    var grid = buildGrid(cfg, frame);
    canvas.width = W * scale; canvas.height = H * scale;
    var ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, canvas.width, canvas.height);
    var bob = frame ? 0 : 1;
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var c = PAL[grid[y][x]]; if (!c) continue;
      ctx.fillStyle = "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")";
      ctx.fillRect(x * scale, (y - bob) * scale, scale, scale);
    }
  }

  // ====================================================================
  // 人物データ
  // ====================================================================
  var CHARS = {
    /* ---------------- 基礎・構文 : ハジメ ---------------- */
    "基礎・構文": { name: "ハジメ", desc: "教科書に忠実な堅実派", stages: [
      { title: "赤ちゃん", line: "オギャー。ハジメ、この世に生を受けた。", sprite: { body: "baby", outfit: "p", outfitEdge: "P", hairStyle: "none", item: "pacifier" } },
      { title: "幼児", line: "よちよち歩き。積み木を高く積むのが好き。", sprite: { body: "baby", outfit: "r", outfitEdge: "R", item: "toy" } },
      { title: "小学生", line: "ランドセルを背負い登校。九九を完璧に暗記した。", sprite: { body: "adult", short: true, outfit: "r", outfitEdge: "R", item: "book" } },
      { title: "中学生", line: "几帳面なノートでクラス一の評判。", sprite: { body: "adult", short: true, outfit: "N", outfitEdge: "Q", accent: "y" } },
      { title: "高校生", line: "教科書を隅から隅まで読み込む日々。", sprite: { body: "adult", outfit: "k", outfitEdge: "Q", hair: "H" } },
      { title: "大学生", line: "普通の大学に進学。基礎科目はいつも得意。", sprite: { body: "adult", outfit: "b", outfitEdge: "B", item: "book" } },
      { title: "就活生", line: "リクルートスーツでそつなく内定を獲得。", sprite: { body: "adult", outfit: "k", outfitEdge: "Q", shirt: "w", item: "briefcase" } },
      { title: "新人会社員", line: "マニュアル通りの仕事ぶりで信頼される新人。", sprite: { body: "adult", outfit: "k", outfitEdge: "Q", shirt: "w", accent: "r", item: "briefcase" } },
      { title: "会社員", line: "残業もミスもきっちり管理。でも、何かが物足りない。", sprite: { body: "adult", outfit: "k", outfitEdge: "Q", shirt: "w", accent: "b", glasses: true, item: "briefcase" } },
      { title: "Piscine受験生", line: "会社を辞め、4週間の Piscine に挑む。眠れない夜が続く。", sprite: { body: "adult", outfit: "g", outfitEdge: "G", hair: "H", item: "laptop", coffee: true, sweat: true } },
      { title: "42tokyo生", line: "Piscine を突破し、42tokyo生になった。【人生の折り返し】", sprite: { body: "adult", outfit: "N", outfitEdge: "Q", head: "cap42", item: "laptop" } },
      { title: "42本科生", line: "課題を次々と踏破。ブラックホールも怖くない。", sprite: { body: "adult", outfit: "N", outfitEdge: "Q", accent: "n", item: "laptop", aura: "screen" } },
      { title: "駆け出しエンジニア", line: "卒業し、初めての本番デプロイに成功。", sprite: { body: "adult", outfit: "b", outfitEdge: "B", accent: "n", glasses: true, item: "laptop", aura: "cyan" } },
      { title: "バックエンドエンジニア", line: "API を淡々と量産。基礎の強さが光る。", sprite: { body: "adult", outfit: "N", outfitEdge: "Q", accent: "L", glasses: true, item: "laptop", aura: "green", orbits: 2, orbitColor: "j" } },
      { title: "フルスタックエンジニア", line: "前も後ろも一人で回すフルスタックに。", sprite: { body: "adult", outfit: "G", outfitEdge: "d", accent: "n", glasses: true, item: "laptop", aura: "cyan", edgeGlow: "a", orbits: 3, orbitColor: "a" } },
      { title: "シニアエンジニア", line: "システムの土台づくりを任される設計者へ。", sprite: { body: "adult", outfit: "N", outfitEdge: "Q", accent: "n", cape: "B", glasses: true, glassesNeon: true, aura: "cyan", edgeGlow: "a", orbits: 3, orbitColor: "a" } },
      { title: "テックリード", line: "チームを率い、基礎から組織を立て直す。", sprite: { body: "adult", outfit: "N", outfitEdge: "Q", accent: "V", cape: "V", head: "band", bandC: "V", glasses: true, glassesNeon: true, aura: "violet", edgeGlow: "u", orbits: 4, orbitColor: "u" } },
      { title: "アーキテクト", line: "『土台が全て』── 悟りの境地に至る。", sprite: { body: "adult", outfit: "N", outfitEdge: "Q", accent: "y", cape: "y", glasses: true, aura: "gold", edgeGlow: "z", orbits: 5, orbitColor: "z" } },
      { title: "CTO", line: "会社の屋台骨そのものになった。", sprite: { body: "adult", outfit: "k", outfitEdge: "Q", head: "crown", cape: "y", aura: "gold", edgeGlow: "z", orbits: 6, orbitColor: "z" } },
      { title: "国を動かす者", line: "社会インフラを掌握。各国が無視できない存在に。", sprite: { body: "adult", outfit: "N", outfitEdge: "Q", head: "crown", cape: "R", accent: "r", aura: "red", edgeGlow: "q", orbits: 7, orbitColor: "q" } },
      { title: "レジェンドエンジニア", line: "その気になれば一国の根幹を握る男。基礎、ここに極まれり。", sprite: { body: "adult", outfit: "N", outfitEdge: "Q", head: "crown", halo: true, cape: "y", glasses: true, glassesNeon: true, aura: "rainbow", edgeGlow: "F", orbits: 8, orbitColor: "rainbow" } }
    ] },

    /* ---------------- 関数・関数型 : ラム ---------------- */
    "関数・関数型": { name: "ラム", desc: "高校中退、独学の天才肌", stages: [
      { title: "赤ちゃん", line: "ラム、誕生。よく泣く、感受性の強い赤ちゃん。", sprite: { body: "baby", outfit: "M", outfitEdge: "R", hairStyle: "none", item: "pacifier" } },
      { title: "幼児", line: "みんなの輪より、ひとり遊びが好きな子。", sprite: { body: "baby", outfit: "V", outfitEdge: "B", item: "toy" } },
      { title: "小学生", line: "絵を描くのが好きな、ごく普通の小学生。", sprite: { body: "adult", short: true, outfit: "V", outfitEdge: "Q", hairStyle: "long" } },
      { title: "中学生", line: "音楽だけが友だち。PCなんて触らない。", sprite: { body: "adult", short: true, outfit: "N", outfitEdge: "Q", hairStyle: "long", headphones: true } },
      { title: "高校中退", line: "馴染めず、高校を中退してしまう。", sprite: { body: "adult", outfit: "N", outfitEdge: "Q", hairStyle: "long", hairStreak: "M", hood: true, hoodC: "N" } },
      { title: "ニート(初期)", line: "昼まで寝て、ゲームと動画の毎日。", sprite: { body: "adult", outfit: "N", outfitEdge: "Q", hairStyle: "long", hood: true, item: "gamepad" } },
      { title: "ニート(中期)", line: "昼夜逆転。社会との接点が消えていく。", sprite: { body: "adult", outfit: "g", outfitEdge: "G", hairStyle: "long", hood: true, item: "gamepad" } },
      { title: "ニート(長期)", line: "ふと、将来が怖くなる夜がある。", sprite: { body: "adult", outfit: "g", outfitEdge: "G", hairStyle: "long", hood: true, sweat: true } },
      { title: "一念発起", line: "「このままじゃダメだ」。技術は無縁だけど、一歩踏み出す。", sprite: { body: "adult", outfit: "N", outfitEdge: "Q", hairStyle: "long", hairStreak: "M" } },
      { title: "Piscine受験生", line: "人生で初めてコードに触れる。キーボードも手探り。", sprite: { body: "adult", outfit: "g", outfitEdge: "G", hairStyle: "long", item: "laptop", coffee: true, sweat: true } },
      { title: "42tokyo生", line: "まさかの合格。未知の世界へ飛び込んだ。", sprite: { body: "adult", outfit: "N", outfitEdge: "Q", head: "cap42", hairStyle: "long", item: "laptop" } },
      { title: "42本科生", line: "触ったこともなかったのに、なぜか掴みが早い。", sprite: { body: "adult", outfit: "N", outfitEdge: "Q", hairStyle: "long", accent: "M", item: "laptop", aura: "magenta" } },
      { title: "駆け出しエンジニア", line: "関数を組み合わせる感覚が、妙にしっくりくる。", sprite: { body: "adult", outfit: "V", outfitEdge: "Q", hairStyle: "long", item: "laptop", aura: "magenta" } },
      { title: "関数型エンジニア", line: "lambda を魔法のように操る。", sprite: { body: "adult", outfit: "N", outfitEdge: "Q", hairStyle: "long", accent: "M", item: "laptop", aura: "magenta", orbits: 2, orbitColor: "x" } },
      { title: "高階の使い手", line: "高階関数で複雑さを畳み込む。", sprite: { body: "adult", outfit: "V", outfitEdge: "Q", hairStyle: "long", hairStreak: "M", item: "laptop", aura: "magenta", edgeGlow: "x", orbits: 3, orbitColor: "x" } },
      { title: "シニア(関数型)", line: "純粋関数で、壊れない世界を作る。", sprite: { body: "adult", outfit: "N", outfitEdge: "Q", hairStyle: "long", cape: "V", aura: "magenta", edgeGlow: "x", orbits: 3, orbitColor: "x" } },
      { title: "デコレータの魔女", line: "デコレータで万物を包み込む。", sprite: { body: "adult", outfit: "N", outfitEdge: "Q", hairStyle: "long", head: "wizardhat", hatC: "V", cape: "V", aura: "violet", edgeGlow: "u", orbits: 4, orbitColor: "u" } },
      { title: "関数型アーキテクト", line: "副作用なき大伽藍を設計する。", sprite: { body: "adult", outfit: "N", outfitEdge: "Q", hairStyle: "long", head: "wizardhat", hatC: "M", cape: "M", aura: "magenta", edgeGlow: "x", orbits: 5, orbitColor: "x" } },
      { title: "コードの賢者", line: "あらゆる言語の関数を見通す。", sprite: { body: "adult", outfit: "N", outfitEdge: "Q", hairStyle: "long", head: "wizardhat", hatC: "V", cape: "V", aura: "violet", edgeGlow: "u", orbits: 6, orbitColor: "rainbow" } },
      { title: "ラムダの女王", line: "関数型の頂に君臨する。", sprite: { body: "adult", outfit: "N", outfitEdge: "Q", hairStyle: "long", head: "crown", cape: "M", aura: "magenta", edgeGlow: "x", orbits: 7, orbitColor: "x" } },
      { title: "レジェンド(関数の女神)", line: "技術に触れて数年。一行の lambda で世界を書き換える女神に。", sprite: { body: "adult", outfit: "N", outfitEdge: "Q", hairStyle: "long", head: "wizardhat", hatC: "V", halo: true, cape: "M", aura: "rainbow", edgeGlow: "F", orbits: 8, orbitColor: "rainbow" } }
    ] },

    /* ---------------- OOP : タクミ ---------------- */
    "OOP": { name: "タクミ", desc: "ロン毛のおしゃれ設計者", stages: [
      { title: "赤ちゃん", line: "タクミ、誕生。何でも分解したがる子。", sprite: { body: "baby", outfit: "b", outfitEdge: "B", hairStyle: "none", item: "pacifier" } },
      { title: "幼児", line: "ブロック遊びに夢中。組み立てが好き。", sprite: { body: "baby", outfit: "b", outfitEdge: "B", item: "toy" } },
      { title: "小学生", line: "プラモ作りが得意。説明書を熟読する。", sprite: { body: "adult", short: true, outfit: "b", outfitEdge: "B", hairStyle: "long", item: "book" } },
      { title: "中学生", line: "自作PCに感動。髪を伸ばし始める。", sprite: { body: "adult", short: true, outfit: "N", outfitEdge: "Q", hairStyle: "long", accent: "n" } },
      { title: "高校生", line: "おしゃれに目覚めた高校時代。ピアスを開ける。", sprite: { body: "adult", outfit: "b", outfitEdge: "B", hairStyle: "long", earring: true } },
      { title: "専門学校生", line: "卒業後、プログラミングの専門学校へ。", sprite: { body: "adult", outfit: "b", outfitEdge: "B", hairStyle: "long", earring: true, item: "laptop" } },
      { title: "専門(チーム制作)", line: "チーム制作で『設計』の面白さを知る。", sprite: { body: "adult", outfit: "N", outfitEdge: "Q", hairStyle: "long", earring: true, accent: "n", item: "laptop" } },
      { title: "専門(卒業制作)", line: "卒業制作に没頭。クラス設計に凝る。", sprite: { body: "adult", outfit: "b", outfitEdge: "B", hairStyle: "long", earring: true, accent: "n", item: "laptop" } },
      { title: "進路決定", line: "就職せず、42 の門を叩くと決めた。", sprite: { body: "adult", outfit: "N", outfitEdge: "Q", hairStyle: "long", earring: true, item: "laptop" } },
      { title: "Piscine受験生", line: "Piscine に挑む。設計力を試される4週間。", sprite: { body: "adult", outfit: "g", outfitEdge: "G", hairStyle: "long", earring: true, item: "laptop", coffee: true, sweat: true } },
      { title: "42tokyo生", line: "42tokyo生に。専門で得た基礎が活きる。", sprite: { body: "adult", outfit: "N", outfitEdge: "Q", head: "cap42", hairStyle: "long", earring: true, item: "laptop" } },
      { title: "42本科生", line: "課題を、きれいなクラス設計で解く。", sprite: { body: "adult", outfit: "N", outfitEdge: "Q", hairStyle: "long", earring: true, accent: "n", item: "laptop", aura: "screen" } },
      { title: "駆け出しエンジニア", line: "初の本番を、堅い実装で乗り切る。", sprite: { body: "adult", outfit: "b", outfitEdge: "B", hairStyle: "long", earring: true, item: "laptop", aura: "cyan" } },
      { title: "OOPエンジニア", line: "クラス設計が美しいと評判に。", sprite: { body: "adult", outfit: "b", outfitEdge: "B", hairStyle: "long", earring: true, accent: "n", item: "laptop", aura: "cyan", orbits: 2, orbitColor: "a" } },
      { title: "設計者", line: "拡張に強い構造を、するすると描く。", sprite: { body: "adult", outfit: "G", outfitEdge: "d", hairStyle: "long", earring: true, accent: "n", item: "laptop", aura: "cyan", edgeGlow: "a", orbits: 3, orbitColor: "a" } },
      { title: "シニア(設計)", line: "抽象化で複雑さを制す。", sprite: { body: "adult", outfit: "N", outfitEdge: "Q", hairStyle: "long", earring: true, cape: "B", glasses: true, glassesNeon: true, aura: "cyan", edgeGlow: "a", orbits: 3, orbitColor: "a" } },
      { title: "テックリード", line: "設計指針を示し、チームを導く。", sprite: { body: "adult", outfit: "N", outfitEdge: "Q", hairStyle: "long", earring: true, head: "band", bandC: "n", cape: "B", glasses: true, glassesNeon: true, aura: "cyan", edgeGlow: "a", orbits: 4, orbitColor: "a" } },
      { title: "アーキテクト", line: "巨大システムの青写真を引く。", sprite: { body: "adult", outfit: "N", outfitEdge: "Q", hairStyle: "long", earring: true, cape: "y", accent: "y", glasses: true, glassesNeon: true, aura: "gold", edgeGlow: "z", orbits: 5, orbitColor: "z" } },
      { title: "マスターアーキテクト", line: "設計が、ついに芸術の域へ。", sprite: { body: "adult", outfit: "k", outfitEdge: "Q", hairStyle: "long", earring: true, head: "crown", cape: "y", glasses: true, glassesNeon: true, aura: "gold", edgeGlow: "z", orbits: 6, orbitColor: "z" } },
      { title: "設計の大棟梁", line: "国家システムの設計を託される。", sprite: { body: "adult", outfit: "N", outfitEdge: "Q", hairStyle: "long", earring: true, head: "crown", cape: "y", accent: "n", aura: "gold", edgeGlow: "z", orbits: 7, orbitColor: "z" } },
      { title: "レジェンド(設計神)", line: "万物をクラスで表す、設計の神。", sprite: { body: "adult", outfit: "N", outfitEdge: "Q", hairStyle: "long", earring: true, head: "crown", halo: true, cape: "y", glasses: true, glassesNeon: true, aura: "rainbow", edgeGlow: "F", orbits: 8, orbitColor: "rainbow" } }
    ] },

    /* ---------------- プログラム構成・堅牢性 : ラー王 ---------------- */
    "プログラム構成・堅牢性": { name: "ラー王", desc: "現代に蘇ったエジプト王", stages: [
      { title: "黄金の柩", line: "黄金の柩に納められし、古の王。", sprite: { body: "coffin" } },
      { title: "包帯のミイラ", line: "幾千年、包帯に包まれ眠り続ける。", sprite: { body: "adult", mummyHead: true, wrap: true, outfit: "w", outfitEdge: "g" } },
      { title: "目覚めるミイラ", line: "ある日、その双眸に光が灯る。", sprite: { body: "adult", mummyHead: true, eyeGlow: "q", wrap: true, outfit: "w", outfitEdge: "g", aura: "screen" } },
      { title: "蘇りし王", line: "包帯を解き、王が立ち上がる。", sprite: { body: "adult", head: "nemes", outfit: "y", outfitEdge: "o" } },
      { title: "古代の王、再臨", line: "黄金の威光、再び。だが世界は一変していた。", sprite: { body: "adult", head: "nemes", beard: true, outfit: "y", outfitEdge: "o", accent: "n", item: "ankh", aura: "gold" } },
      { title: "現代に放り出される", line: "見知らぬ現代。何もかもが異質だ。", sprite: { body: "adult", head: "nemes", outfit: "g", outfitEdge: "G" } },
      { title: "文明に戸惑う", line: "光る板(PC)に腰を抜かす。", sprite: { body: "adult", head: "nemes", outfit: "g", outfitEdge: "G", item: "laptop", sweat: true } },
      { title: "現代を学ぶ", line: "象形文字より難解な『コード』に出会う。", sprite: { body: "adult", head: "nemes", outfit: "N", outfitEdge: "Q", accent: "n", item: "laptop" } },
      { title: "一念発起", line: "王たる者、新たな知を極めると誓う。", sprite: { body: "adult", head: "nemes", outfit: "N", outfitEdge: "Q" } },
      { title: "Piscine受験生", line: "現代に蘇りし王、なぜか Piscine に挑む。", sprite: { body: "adult", head: "nemes", outfit: "g", outfitEdge: "G", item: "laptop", coffee: true, sweat: true } },
      { title: "42tokyo生", line: "42tokyo生に。象形文字よりコードが難しい。", sprite: { body: "adult", head: "nemes", outfit: "N", outfitEdge: "Q", accent: "n", item: "laptop" } },
      { title: "42本科生", line: "課題を、死者の書のごとく読み解く。", sprite: { body: "adult", head: "nemes", outfit: "N", outfitEdge: "Q", accent: "n", item: "laptop", aura: "screen" } },
      { title: "駆け出しエンジニア", line: "蘇りのごとく、落ちても何度も復活する。", sprite: { body: "adult", head: "nemes", outfit: "N", outfitEdge: "Q", accent: "n", item: "laptop", aura: "cyan" } },
      { title: "例外を統べる者", line: "try / except で、あらゆる災いを退ける。", sprite: { body: "adult", head: "nemes", accent: "y", item: "laptop", aura: "gold", orbits: 2, orbitColor: "z" } },
      { title: "不死のエンジニア", line: "どんな障害も finally で立て直す。", sprite: { body: "adult", head: "nemes", beard: true, accent: "n", aura: "gold", edgeGlow: "z", orbits: 3, orbitColor: "z" } },
      { title: "守護者", line: "システムを災厄から守る、黄金の盾。", sprite: { body: "adult", head: "nemes", cape: "n", beard: true, aura: "cyan", edgeGlow: "a", orbits: 3, orbitColor: "a" } },
      { title: "神官長(SRE)", line: "インフラの神殿を司る。", sprite: { body: "adult", head: "nemes", cape: "y", beard: true, aura: "gold", edgeGlow: "z", orbits: 4, orbitColor: "z" } },
      { title: "冥府の審判者", line: "落ちたサービスを、冥府から呼び戻す。", sprite: { body: "adult", head: "nemes", cape: "k", accent: "n", aura: "violet", edgeGlow: "u", orbits: 5, orbitColor: "u" } },
      { title: "太陽王(復活)", line: "太陽神ラーの化身として、再び君臨する。", sprite: { body: "adult", head: "nemes", sundisk: true, cape: "y", beard: true, aura: "gold", edgeGlow: "z", orbits: 6, orbitColor: "z" } },
      { title: "国を統べる神王", line: "国家のインフラそのものを支配する。", sprite: { body: "adult", head: "nemes", sundisk: true, cape: "R", accent: "r", aura: "red", edgeGlow: "q", orbits: 7, orbitColor: "q" } },
      { title: "レジェンド(不滅の神王)", line: "決して落ちぬ、不滅のシステムと化した神王。", sprite: { body: "adult", head: "nemes", sundisk: true, halo: true, cape: "y", beard: true, aura: "rainbow", edgeGlow: "F", orbits: 8, orbitColor: "rainbow" } }
    ] },

    /* ---------------- データ操作 : デー太(犬) ---------------- */
    "データ操作": { name: "デー太", desc: "取ってくるのが得意な犬", stages: [
      { title: "子犬", line: "デー太、生まれたての子犬。", sprite: { body: "adult", short: true, headType: "dog", outfit: "D", outfitEdge: "o", collar: "r" } },
      { title: "子犬(やんちゃ)", line: "ボール遊びに夢中。", sprite: { body: "adult", short: true, headType: "dog", outfit: "D", outfitEdge: "o", collar: "r", item: "ball", tongue: true } },
      { title: "やんちゃ犬", line: "投げたボールを必ず取ってくる。", sprite: { body: "adult", headType: "dog", outfit: "D", outfitEdge: "o", collar: "b", item: "ball" } },
      { title: "お手を覚える", line: "『お手』も『データ取って来い』も得意。", sprite: { body: "adult", headType: "dog", outfit: "D", outfitEdge: "o", collar: "b", tongue: true } },
      { title: "番犬", line: "家を守る、立派な番犬に。", sprite: { body: "adult", headType: "dog", outfit: "D", outfitEdge: "o", collar: "N" } },
      { title: "名犬", line: "近所で評判の、賢い犬。", sprite: { body: "adult", headType: "dog", outfit: "D", outfitEdge: "o", collar: "y", item: "ball" } },
      { title: "探索犬", line: "においでお宝(データ)を探し出す。", sprite: { body: "adult", headType: "dog", outfit: "D", outfitEdge: "o", collar: "n", aura: "screen" } },
      { title: "賢い犬", line: "なぜか眼鏡が似合う犬。", sprite: { body: "adult", headType: "dog", outfit: "D", outfitEdge: "o", collar: "n", glasses: true } },
      { title: "PCに夢中の犬", line: "ご主人のPawを真似て、キーを叩く。", sprite: { body: "adult", headType: "dog", outfit: "D", outfitEdge: "o", collar: "n", item: "laptop" } },
      { title: "Piscine受験生", line: "犬、Piscine に挑む。寝る間も惜しんで。", sprite: { body: "adult", headType: "dog", outfit: "g", outfitEdge: "G", item: "laptop", coffee: true, sweat: true } },
      { title: "42tokyo生", line: "42tokyo生に。クラス一の出席率(犬だけに)。", sprite: { body: "adult", headType: "dog", outfit: "N", outfitEdge: "Q", head: "cap42", item: "laptop" } },
      { title: "42本科生", line: "課題のボールを、次々と拾ってくる。", sprite: { body: "adult", headType: "dog", outfit: "N", outfitEdge: "Q", accent: "L", item: "laptop", aura: "screen" } },
      { title: "駆け出しエンジニア", line: "初仕事、データを取ってきて即解決。", sprite: { body: "adult", headType: "dog", outfit: "O", outfitEdge: "o", glasses: true, item: "laptop", aura: "cyan" } },
      { title: "データエンジニア", line: "fetch(取得)させたら右に出る者なし。", sprite: { body: "adult", headType: "dog", outfit: "N", outfitEdge: "Q", accent: "L", glasses: true, item: "laptop", aura: "green", orbits: 2, orbitColor: "j" } },
      { title: "データの猟犬", line: "巨大データの海から、目的の1件を咥えて来る。", sprite: { body: "adult", headType: "dog", outfit: "N", outfitEdge: "Q", accent: "L", aura: "green", edgeGlow: "j", orbits: 3, orbitColor: "j" } },
      { title: "シニア(データ)", line: "データ基盤の番犬として君臨する。", sprite: { body: "adult", headType: "dog", outfit: "N", outfitEdge: "Q", cape: "B", glasses: true, aura: "cyan", edgeGlow: "a", orbits: 3, orbitColor: "a" } },
      { title: "パイプラインの守護犬", line: "データの流れを、一匹で守り抜く。", sprite: { body: "adult", headType: "dog", outfit: "N", outfitEdge: "Q", head: "band", bandC: "L", cape: "B", aura: "green", edgeGlow: "j", orbits: 4, orbitColor: "j" } },
      { title: "データアーキテクト", line: "宝の地図(スキーマ)を描く。", sprite: { body: "adult", headType: "dog", outfit: "N", outfitEdge: "Q", cape: "y", accent: "y", aura: "gold", edgeGlow: "z", orbits: 5, orbitColor: "z" } },
      { title: "ご主人(CDO)", line: "今や、人間が尻尾を振る側になった。", sprite: { body: "adult", headType: "dog", outfit: "k", outfitEdge: "Q", head: "crown", cape: "y", aura: "gold", edgeGlow: "z", orbits: 6, orbitColor: "z" } },
      { title: "データを統べる犬", line: "世界中のデータが、彼の元へ集まる。", sprite: { body: "adult", headType: "dog", outfit: "N", outfitEdge: "Q", head: "crown", cape: "O", accent: "O", aura: "gold", edgeGlow: "z", orbits: 7, orbitColor: "z" } },
      { title: "レジェンド(データの神犬)", line: "どんなデータも必ず取ってくる、データの守護神。", sprite: { body: "adult", headType: "dog", outfit: "N", outfitEdge: "Q", head: "crown", halo: true, cape: "y", tongue: true, aura: "rainbow", edgeGlow: "F", orbits: 8, orbitColor: "rainbow" } }
    ] }
  };

  // ---------- 状態 & 公開 ----------
  var current = null, level = 0;
  var liveCanvas = null, lvEl = null, titleEl = null, lineEl = null, popEl = null, nameEl = null;
  var frame = 0, lastTs = 0, rafId = null;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function stagesArr() { return (current && current.stages) || CHARS["基礎・構文"].stages; }
  function clampLv(l) { return Math.max(0, Math.min(MAX_LEVEL, l)); }
  function stageOf(l) { return stagesArr()[clampLv(l)]; }
  function titleOf(l) { return stageOf(l).title; }
  function lineOf(l) { return stageOf(l).line; }
  function select(category) { current = CHARS[category] || CHARS["基礎・構文"]; }

  function mount() {
    var host = document.getElementById("char-sprite");
    lvEl = document.getElementById("char-lv"); titleEl = document.getElementById("char-title");
    lineEl = document.getElementById("char-line"); popEl = document.getElementById("levelup-pop");
    nameEl = document.getElementById("char-name");
    if (!host) return;
    host.innerHTML = "";
    liveCanvas = document.createElement("canvas"); liveCanvas.className = "char-canvas";
    host.appendChild(liveCanvas);
    if (rafId) cancelAnimationFrame(rafId);
    if (!reduceMotion) loop(0); else renderLive();
  }
  function renderLive() { if (liveCanvas) paint(liveCanvas, stageOf(level).sprite, frame, 5); }
  function loop(ts) {
    if (ts - lastTs > 320) { frame = frame ? 0 : 1; lastTs = ts; renderLive(); }
    rafId = requestAnimationFrame(loop);
  }
  function syncBanner() {
    if (lvEl) lvEl.textContent = level <= 0 ? "Lv.0" : "Lv." + level;
    if (titleEl) titleEl.textContent = titleOf(level);
    if (lineEl) lineEl.textContent = lineOf(level);
    if (nameEl) nameEl.textContent = nameOf();
  }
  function nameOf() { return (current && current.name) || "?"; }
  function infoOf(category) { var c = CHARS[category]; return c ? { name: c.name, desc: c.desc || "" } : { name: "", desc: "" }; }
  function showLevelUp(l) {
    if (!popEl) return;
    popEl.textContent = "進化！ " + titleOf(l);
    popEl.hidden = false; popEl.classList.remove("show"); void popEl.offsetWidth; popEl.classList.add("show");
  }
  function reset() { level = 0; renderLive(); syncBanner(); }
  function update(score) {
    var l = clampLv(score), up = l > level;
    level = l; renderLive(); syncBanner();
    if (up) showLevelUp(l);
  }
  function canvasFor(l, scale) { var cv = document.createElement("canvas"); paint(cv, stageOf(l).sprite, 1, scale || 5); return cv; }

  return {
    MAX_LEVEL: MAX_LEVEL,
    select: select, mount: mount, reset: reset, update: update,
    titleOf: titleOf, lineOf: lineOf, canvasFor: canvasFor, infoOf: infoOf,
    nameOf: function () { return (current && current.name) || "?"; }
  };
})();
