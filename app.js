/* ===== KONFIGURASI ===== */
// Tempel URL Web App dari Apps Script di sini (berakhiran /exec)
const API_URL = "https://script.google.com/macros/s/AKfycbyX6bH1yfSqJPzUOdHebb6fEI9SxrscAw9LCjvssqH-vjvQJLL8rT5_IbcycKVtKXmCNg/exec";
/* ======================== */

(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var rupiah = function (n) { return "Rp " + Number(n || 0).toLocaleString("id-ID"); };
  var configured = /^https:\/\/script\.google\.com\/.+\/exec$/.test(API_URL);
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.body.classList.remove("no-js");
  $("yr").textContent = new Date().getFullYear();

  /* ---------- Reveal saat scroll ---------- */
  var io = null;
  if ("IntersectionObserver" in window && !reduce) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  }
  function watch(root) {
    (root || document).querySelectorAll(".reveal:not(.in)").forEach(function (el) {
      if (io) io.observe(el); else el.classList.add("in");
    });
  }
  watch();

  /* ---------- Navbar ---------- */
  var nav = $("nav");
  function onScroll() { nav.classList.toggle("solid", window.scrollY > 40); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Toast ---------- */
  var tt;
  function toast(msg, type) {
    var t = $("toast");
    t.textContent = msg;
    t.className = "toast show " + (type || "ok");
    clearTimeout(tt);
    tt = setTimeout(function () { t.classList.remove("show"); }, 4500);
  }

  /* ---------- Count-up ---------- */
  var cur = { total: 0, count: 0, avg: 0, top: 0 };
  function countTo(el, from, to, fmt) {
    if (reduce || from === to) { el.textContent = fmt(to); return; }
    var start = null, dur = 1400;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(from + (to - from) * e));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function renderStats(d) {
    var total = Number(d.total) || 0, count = Number(d.count) || 0, top = Number(d.top) || 0;
    var target = Number(d.target) || 0;
    var avg = count ? Math.round(total / count) : 0;
    countTo($("heroTotal"), cur.total, total, rupiah);
    countTo($("stCount"), cur.count, count, function (n) { return n.toLocaleString("id-ID"); });
    countTo($("stAvg"), cur.avg, avg, rupiah);
    countTo($("stTop"), cur.top, top, rupiah);
    cur = { total: total, count: count, avg: avg, top: top };
    var pct = target ? Math.min(100, Math.round((total / target) * 100)) : 0;
    $("pct").textContent = pct + "% dari target";
    $("target").textContent = "Target " + rupiah(target);
    $("barWrap").setAttribute("aria-valuenow", pct);
    requestAnimationFrame(function () { setTimeout(function () { $("bar").style.width = pct + "%"; }, 100); });
  }

  function timeAgo(iso) {
    var t = new Date(iso).getTime();
    if (!t) return "";
    var s = Math.max(0, (Date.now() - t) / 1000);
    if (s < 60) return "baru saja";
    if (s < 3600) return Math.floor(s / 60) + " menit lalu";
    if (s < 86400) return Math.floor(s / 3600) + " jam lalu";
    if (s < 2592000) return Math.floor(s / 86400) + " hari lalu";
    return new Date(t).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  }

  function renderDonors(list) {
    var box = $("donors");
    box.innerHTML = "";
    if (!list || !list.length) {
      var em = document.createElement("div");
      em.className = "empty";
      em.textContent = "Belum ada donatur. Jadilah yang pertama membantu.";
      box.appendChild(em);
      return;
    }
    list.forEach(function (d, i) {
      var name = d.name || "Hamba Allah";
      var el = document.createElement("div");
      el.className = "donor reveal";
      el.style.setProperty("--d", Math.min(i, 6) * 0.07 + "s");

      var av = document.createElement("div");
      av.className = "av";
      av.textContent = d.anon ? "?" : name.trim().charAt(0).toUpperCase();

      var body = document.createElement("div");
      var nm = document.createElement("div");
      nm.className = "nm";
      nm.textContent = name + " ";
      var am = document.createElement("span");
      am.className = "am";
      am.textContent = "· " + rupiah(d.amount);
      nm.appendChild(am);
      var meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = (d.program || "Dana umum bencana") + " • " + timeAgo(d.time);
      body.appendChild(nm);
      body.appendChild(meta);
      if (d.note) {
        var q = document.createElement("q");
        q.textContent = d.note;
        body.appendChild(q);
      }
      el.appendChild(av);
      el.appendChild(body);
      box.appendChild(el);
    });
    watch(box);
  }

  /* ---------- Ambil data ---------- */
  function load() {
    if (!configured) {
      renderStats({ total: 0, count: 0, top: 0, target: 0 });
      renderDonors([]);
      $("donors").firstChild.textContent = "Isi API_URL di app.js untuk menampilkan data donatur.";
      return Promise.resolve();
    }
    return fetch(API_URL + "?t=" + Date.now(), { method: "GET", redirect: "follow" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (d) {
        if (!d.success) throw new Error(d.message || "Gagal memuat data");
        renderStats(d);
        renderDonors(d.donors);
      })
      .catch(function () {
        var box = $("donors");
        box.innerHTML = "";
        var em = document.createElement("div");
        em.className = "empty";
        em.textContent = "Data donatur belum bisa dimuat. Muat ulang halaman beberapa saat lagi.";
        box.appendChild(em);
      });
  }
  load();

  /* ---------- Form ---------- */
  var amount = $("amount"), chips = document.querySelectorAll(".chip");
  function digits(s) { return String(s).replace(/\D/g, ""); }
  function setAmount(v) {
    amount.value = v ? Number(v).toLocaleString("id-ID") : "";
    chips.forEach(function (c) { c.classList.toggle("on", c.dataset.v === String(v)); });
    $("fAmt").classList.remove("err");
  }
  chips.forEach(function (c) { c.addEventListener("click", function () { setAmount(c.dataset.v); }); });
  amount.addEventListener("input", function () { setAmount(digits(amount.value).replace(/^0+/, "")); });

  function flag(id, bad) { $(id).classList.toggle("err", bad); return !bad; }
  ["name", "phone", "programSel"].forEach(function (k) {
    var map = { name: "fName", phone: "fPhone", programSel: "fProg" };
    $(k).addEventListener("input", function () { $(map[k]).classList.remove("err"); });
    $(k).addEventListener("change", function () { $(map[k]).classList.remove("err"); });
  });

  var busy = false;
  $("form").addEventListener("submit", function (ev) {
    ev.preventDefault();
    if (busy) return;

    var name = $("name").value.trim();
    var phone = digits($("phone").value);
    var program = $("programSel").value;
    var nominal = parseInt(digits(amount.value) || "0", 10);

    var ok = true;
    ok = flag("fName", name.length < 2) && ok;
    ok = flag("fPhone", phone.length < 9 || phone.length > 15) && ok;
    ok = flag("fProg", !program) && ok;
    ok = flag("fAmt", !(nominal >= 10000)) && ok;
    if (!ok) { toast("Periksa kembali kolom yang bertanda merah.", "bad"); return; }
    if (!configured) { toast("API_URL di app.js belum diisi.", "bad"); return; }

    var payload = {
      name: name, phone: phone, program: program, amount: nominal,
      note: $("note").value.trim(), anon: $("anon").checked
    };

    busy = true;
    var btn = $("submit");
    btn.disabled = true;
    btn.classList.add("loading");
    $("btnTxt").textContent = "Mengirim...";

    fetch(API_URL, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (d) {
        if (!d.success) throw new Error(d.message || "Gagal menyimpan");
        toast("Terima kasih, " + (payload.anon ? "sahabat baik" : name) + "! Donasi Anda tercatat.", "ok");
        $("form").reset();
        setAmount("");
        return load();
      })
      .catch(function (e) {
        toast("Donasi belum terkirim. " + (e.message && e.message.indexOf("HTTP") !== 0 ? e.message : "Coba lagi sebentar."), "bad");
      })
      .then(function () {
        busy = false;
        btn.disabled = false;
        btn.classList.remove("loading");
        $("btnTxt").textContent = "Kirim donasi";
      });
  });
})();
