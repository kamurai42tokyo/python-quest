/*
 * sw.js — Python Module Quest サービスワーカー
 * 静的アセットをキャッシュし、オフラインでも動作させる(PWA)。
 * アセットを更新したら CACHE のバージョンを上げること。
 */
var CACHE = "pmq-v1";
var ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/data.js",
  "./js/characters.js",
  "./js/app.js",
  "./manifest.json",
  "./icon.svg"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  // キャッシュ優先・無ければ取得して動的にキャッシュ・最後はindexへフォールバック
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      return hit || fetch(e.request).then(function (resp) {
        var copy = resp.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        return resp;
      }).catch(function () { return caches.match("./index.html"); });
    })
  );
});
