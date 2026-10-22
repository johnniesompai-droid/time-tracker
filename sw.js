/* Service worker: ให้แอปเปิดใช้งานได้แม้ไม่มีอินเทอร์เน็ต
   เมื่อแก้ไขไฟล์แอป ให้เพิ่มเลข VERSION เพื่อให้เครื่องผู้ใช้โหลดเวอร์ชันใหม่ */
var VERSION = "v1";
var CACHE = "veggie-payroll-" + VERSION;

var CORE = [
  "./",
  "./index.html"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) { return cache.addAll(CORE); })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);

  // หน้าเว็บหลัก: ลองโหลดจากเน็ตก่อน (ได้เวอร์ชันล่าสุด) ถ้าออฟไลน์ใช้ของที่เก็บไว้
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put("./index.html", copy); });
        return res;
      }).catch(function () {
        return caches.match("./index.html");
      })
    );
    return;
  }

  // ไฟล์อื่น: ใช้ที่เก็บไว้ก่อน ถ้าไม่มีค่อยโหลดแล้วเก็บเพิ่ม (รวมฟอนต์ Google)
  event.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        var okToCache = res && (res.status === 200 || res.type === "opaque");
        if (okToCache && (url.origin === self.location.origin || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname))) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      });
    })
  );
});
