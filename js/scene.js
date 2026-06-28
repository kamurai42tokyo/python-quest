/*
 * scene.js — 進化キャラの背景(procedural ドット絵)
 * ------------------------------------------------------------------
 * キャラと同じドット絵の世界観で、(カテゴリ, レベル帯) ごとに背景を描く。
 * レベル帯は5刻みの4バンド: B1=Lv0-5 / B2=Lv6-10 / B3=Lv11-15 / B4=Lv16-20。
 *
 * 公開API:
 *   Scene.bandOf(level)              レベル→バンド(1..4)
 *   Scene.draw(canvas, category, band)  背景を描画
 */
window.Scene = (function () {
  "use strict";

  var BW = 96, BH = 24, HOR = 18; // 横96 x 縦24 / 地平線row=18

  function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function lerp(a, b, t) { return Math.round(a + (b - a) * t); }
  function shade(rgb, f) { return [Math.round(rgb[0] * f), Math.round(rgb[1] * f), Math.round(rgb[2] * f)]; }

  function bandOf(level) {
    var l = Math.max(0, Math.min(20, level));
    return l <= 5 ? 1 : l <= 10 ? 2 : l <= 15 ? 3 : 4;
  }

  // (カテゴリ -> バンド -> 背景設定)
  // sky:[上,下] / ground:地面 / motif:モチーフ / mc:モチーフ色 / wc:窓色 / stars:星
  var SCENES = {
    "基礎・構文": {
      1: { sky: ["#9fd0f0", "#dff0ff"], ground: "#3f5a2a", motif: "trees" },
      2: { sky: ["#ff9e5e", "#ffd9a0"], ground: "#7a5a3a", motif: "buildings", mc: "#5a3a4a", wc: "#ffd27f" },
      3: { sky: ["#16203a", "#2a3358"], ground: "#23283a", motif: "buildings", mc: "#10142a", wc: "#ffe08a", stars: true },
      4: { sky: ["#2a2a10", "#7a5e14"], ground: "#3a3320", motif: "buildings", mc: "#3a2f10", wc: "#ffd966", stars: true }
    },
    "関数・関数型": {
      1: { sky: ["#f3c9a8", "#e8b48a"], ground: "#7a5a3a", motif: "window", wc: "#bfe6ff" },
      2: { sky: ["#2a2230", "#1a1620"], ground: "#241c2a", motif: "monitors", wc: "#88ccff" },
      3: { sky: ["#14082a", "#2a0f4a"], ground: "#1a1228", motif: "buildings", mc: "#1a0f2e", wc: "#e066e0", stars: true },
      4: { sky: ["#0a0820", "#241048"], ground: "#140a22", motif: "planet", mc: "#e066e0", stars: true }
    },
    "OOP": {
      1: { sky: ["#d8c4a0", "#c4ad88"], ground: "#6b4a2a", motif: "window", wc: "#bfe6ff" },
      2: { sky: ["#bcd0e0", "#9db6d6"], ground: "#5a6070", motif: "monitors", wc: "#88ccff" },
      3: { sky: ["#16263a", "#1f3a5a"], ground: "#1c2738", motif: "monitors", wc: "#39a0d8", stars: false },
      4: { sky: ["#1a2a3a", "#2a4a6a"], ground: "#2a3a2a", motif: "columns", mc: "#f5c518", stars: true }
    },
    "プログラム構成・堅牢性": {
      1: { sky: ["#fad9a0", "#f0c070"], ground: "#caa15a", motif: "pyramid" },
      2: { sky: ["#3a3026", "#241c14"], ground: "#4a4030", motif: "columns", mc: "#6b5a3a" },
      3: { sky: ["#16203a", "#2a3358"], ground: "#23283a", motif: "buildings", mc: "#10142a", wc: "#ffe08a", stars: true },
      4: { sky: ["#3a2a0a", "#8a6010"], ground: "#5a4012", motif: "columns", mc: "#f5c518", sun: true }
    },
    "データ操作": {
      1: { sky: ["#9fd0f0", "#dff0ff"], ground: "#4a7a2a", motif: "trees" },
      2: { sky: ["#8ec8f0", "#cfe8ff"], ground: "#5a6a4a", motif: "buildings", mc: "#9aa6b2", wc: "#eaf2ff" },
      3: { sky: ["#0e1220", "#161c2e"], ground: "#1c2030", motif: "racks" },
      4: { sky: ["#0a0820", "#102048"], ground: "#0c0a1e", motif: "planet", mc: "#39d0d8", stars: true }
    }
  };

  // ---- モチーフ描画 (px/rectc は scale 済みの塗り関数) ----
  function drawMotif(cfg, px, rectc) {
    var mc = cfg.mc ? hex(cfg.mc) : [40, 40, 60];
    var wc = cfg.wc ? hex(cfg.wc) : [255, 224, 138];
    switch (cfg.motif) {
      case "trees":
        [12, 38, 64, 86].forEach(function (t) {
          rectc(t - 1, 12, t + 1, HOR - 1, [90, 58, 30]);
          rectc(t - 4, 7, t + 4, 12, [47, 122, 58]);
          rectc(t - 3, 4, t + 3, 8, [62, 150, 74]);
        });
        break;
      case "buildings":
        var xs = [2, 18, 33, 49, 65, 81], hs = [9, 14, 7, 16, 11, 13];
        for (var i = 0; i < xs.length; i++) {
          var x = xs[i], top = HOR - hs[i];
          rectc(x, top, x + 12, HOR - 1, mc);
          for (var wy = top + 2; wy < HOR - 1; wy += 3)
            for (var wx = x + 2; wx < x + 11; wx += 3) px(wx, wy, wc);
        }
        break;
      case "pyramid":
        var pk = 38, half = 15;
        for (var k = 0; k <= half; k++) {
          var y = (HOR - 1) - k, w = half - k;
          rectc(pk - w, y, pk + w, y, [184, 137, 74]);
          px(pk + w, y, [150, 110, 60]);
        }
        var p2 = 70, h2 = 9;
        for (var j = 0; j <= h2; j++) { var y2 = (HOR - 1) - j, w2 = h2 - j; rectc(p2 - w2, y2, p2 + w2, y2, [170, 125, 68]); }
        break;
      case "columns":
        [8, 26, 44, 62, 80].forEach(function (x) {
          rectc(x, 2, x + 6, HOR - 1, mc);
          rectc(x - 1, 2, x + 7, 3, shade(mc, 1.15));
          rectc(x - 1, HOR - 2, x + 7, HOR - 1, shade(mc, 0.7));
        });
        break;
      case "window":
        rectc(28, 3, 66, 13, [60, 66, 84]);          // 枠
        rectc(29, 4, 65, 12, wc);                     // ガラス
        rectc(46, 4, 47, 12, [60, 66, 84]); rectc(29, 8, 65, 8, [60, 66, 84]); // 桟
        break;
      case "monitors":
        rectc(18, 7, 40, 15, [40, 44, 54]); rectc(20, 8, 38, 14, wc);
        rectc(56, 8, 76, 15, [40, 44, 54]); rectc(58, 9, 74, 14, wc);
        break;
      case "racks":
        [8, 26, 44, 62, 80].forEach(function (x) {
          rectc(x, 3, x + 10, HOR - 1, [28, 34, 50]);
          for (var ly = 5; ly < HOR - 1; ly += 2) {
            px(x + 2, ly, (ly % 4) ? [57, 208, 216] : [255, 90, 90]);
            px(x + 8, ly, [120, 255, 180]);
          }
        });
        break;
      case "planet":
        var cx = 68, cy = 7, r = 6;
        for (var yy = -r; yy <= r; yy++) for (var xx = -r; xx <= r; xx++)
          if (xx * xx + yy * yy <= r * r) px(cx + xx, cy + yy, mc);
        for (var rx = -8; rx <= 8; rx++) px(cx + rx, cy + 1, shade(mc, 1.3)); // 環
        break;
    }
    if (cfg.sun) { var sx = 70, sy = 6, sr = 5; for (var sa = -sr; sa <= sr; sa++) for (var sb = -sr; sb <= sr; sb++) if (sa * sa + sb * sb <= sr * sr) px(sx + sa, sy + sb, [255, 210, 90]); }
  }

  var STARS = [[6, 3], [14, 6], [22, 2], [31, 5], [40, 3], [48, 7], [55, 4], [60, 9], [10, 11], [35, 10], [52, 12], [78, 2], [88, 5], [84, 10]];

  function draw(canvas, category, band) {
    var cat = SCENES[category] || SCENES["基礎・構文"];
    var cfg = cat[band] || cat[1];
    var scale = 6;
    canvas.width = BW * scale; canvas.height = BH * scale;
    var ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    function px(x, y, rgb) { ctx.fillStyle = "rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")"; ctx.fillRect(x * scale, y * scale, scale, scale); }
    function rectc(x0, y0, x1, y1, rgb) { for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) if (x >= 0 && x < BW && y >= 0 && y < BH) px(x, y, rgb); }

    // 空(グラデ)
    var top = hex(cfg.sky[0]), bot = hex(cfg.sky[1]);
    for (var y = 0; y < HOR; y++) {
      var t = y / (HOR - 1);
      var c = [lerp(top[0], bot[0], t), lerp(top[1], bot[1], t), lerp(top[2], bot[2], t)];
      for (var x = 0; x < BW; x++) px(x, y, c);
    }
    if (cfg.stars) for (var s = 0; s < STARS.length; s++) px(STARS[s][0], STARS[s][1], [255, 255, 240]);
    drawMotif(cfg, px, rectc);
    // 地面
    var g = hex(cfg.ground);
    rectc(0, HOR, BW - 1, BH - 1, g);
    rectc(0, HOR, BW - 1, HOR, shade(g, 1.25));   // 地表ハイライト
  }

  return { bandOf: bandOf, draw: draw };
})();
