/**
 * 大谷塾シフト － Service Worker
 *
 * ねらいは2つだけです。
 *   ① ホーム画面に追加したときに、アプリとして起動できるようにする
 *   ② 圏外・電波が悪いときでも、前回開いた画面がすぐ出るようにする
 *
 * Firebase への通信には一切手を出しません（常に最新を取りに行きます）。
 * 画面を更新したときは CACHE_NAME の数字を1つ上げてください。
 */
var CACHE_NAME = 'otani-shift-v1';
var ASSETS = [
    './',
    './index.html',
    './manifest.webmanifest',
    './icon-180.png',
    './icon-192.png',
    './icon-512.png'
];

self.addEventListener('install', function (e) {
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then(function (c) { return c.addAll(ASSETS); })
            .catch(function () { /* 1つでも取れなければ諦めてよい */ })
            .then(function () { return self.skipWaiting(); })
    );
});

self.addEventListener('activate', function (e) {
    e.waitUntil(
        caches.keys().then(function (keys) {
            return Promise.all(keys.map(function (k) {
                return k === CACHE_NAME ? null : caches.delete(k);
            }));
        }).then(function () { return self.clients.claim(); })
    );
});

self.addEventListener('fetch', function (e) {
    var req = e.request;
    if (req.method !== 'GET') return;

    var url = new URL(req.url);
    // Firebase・Googleフォントなど外部への通信には触らない
    if (url.origin !== self.location.origin) return;

    var isPage = req.mode === 'navigate' ||
        url.pathname.slice(-1) === '/' ||
        url.pathname.slice(-11) === 'index.html';

    if (isPage) {
        // 画面本体は「まず通信」。更新をすぐ受け取り、圏外のときだけ保存分を出す
        e.respondWith(
            fetch(req).then(function (res) {
                var copy = res.clone();
                caches.open(CACHE_NAME).then(function (c) { c.put('./index.html', copy); });
                return res;
            }).catch(function () {
                return caches.match('./index.html').then(function (hit) {
                    return hit || caches.match('./');
                });
            })
        );
        return;
    }

    // アイコンなどは保存分を優先（変わらないため）
    e.respondWith(
        caches.match(req).then(function (hit) { return hit || fetch(req); })
    );
});
