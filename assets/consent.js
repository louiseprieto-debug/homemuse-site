/* Home Muse: cookie consent + Meta Pixel (1054417427611393).
   The pixel loads ONLY after the visitor clicks "Accept". The choice is remembered for 6 months.
   Tracked: PageView, Lead (newsletter / free guide links, quiz sent), Schedule (booking links). */
(function () {
  var PIXEL = "1054417427611393", KEY = "hm_consent", MAX = 182 * 864e5;
  var FR = (document.documentElement.lang || "").indexOf("fr") === 0;
  var T = FR ? {
    msg: "J'utilise des cookies Meta pour mesurer l'efficacité de mes publicités. Rien ne s'active sans votre accord.",
    more: "En savoir plus", yes: "Accepter", no: "Refuser", link: "Cookies"
  } : {
    msg: "I use Meta cookies to see which of my ads actually help. Nothing switches on without your OK.",
    more: "Learn more", yes: "Accept", no: "Decline", link: "Cookies"
  };

  function get() {
    try { var v = JSON.parse(localStorage.getItem(KEY)); if (v && Date.now() - v.t < MAX) return v.c; } catch (e) {}
    return null;
  }
  function set(c) { try { localStorage.setItem(KEY, JSON.stringify({ c: c, t: Date.now() })); } catch (e) {} }

  var loaded = false;
  function loadPixel() {
    if (loaded) return; loaded = true;
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments) };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s)
    }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", PIXEL);
    window.fbq("track", "PageView");
  }

  // Public helper so other scripts (the quiz) can report events.
  window.hmTrack = function (name, data) { if (loaded && window.fbq) window.fbq("track", name, data || {}); };

  // Click tracking on key links.
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]"); if (!a) return;
    var h = a.href;
    if (/calendar\.app\.google|calendar\.google\.com\/calendar\/appointments/.test(h)) {
      window.hmTrack("Schedule", { content_name: (a.textContent || "").trim().slice(0, 60) });
    } else if (/substack\.com/.test(h)) {
      window.hmTrack("Lead", { content_name: "Newsletter / free guide" });
    }
  }, true);

  // Banner.
  var css = ".hm-cc{position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;max-width:560px;margin:0 auto;background:#FBF8F1;color:#1B2438;border:1px solid #E4DDCD;box-shadow:0 20px 50px -20px rgba(19,32,58,.45);padding:20px 22px;font:300 14px/1.6 'Jost','Helvetica Neue',Arial,sans-serif;display:flex;flex-wrap:wrap;gap:14px 18px;align-items:center}" +
    ".hm-cc p{margin:0;flex:1 1 280px}.hm-cc a{color:#A8792A}.hm-cc .b{display:flex;gap:10px}" +
    ".hm-cc button{font:500 11px 'Jost',Arial,sans-serif;letter-spacing:.18em;text-transform:uppercase;padding:11px 18px;cursor:pointer;border:1px solid #A8792A}" +
    ".hm-cc .y{background:linear-gradient(100deg,#93651D,#C99A45 50%,#EBD08E);color:#16203A;border:0}.hm-cc .n{background:transparent;color:#1B2438}" +
    ".hm-cc-link{background:none;border:0;padding:0;color:inherit;font:inherit;cursor:pointer;text-decoration:underline;opacity:.75}";
  function banner() {
    if (document.querySelector(".hm-cc")) return;
    if (!document.getElementById("hm-cc-css")) { var s = document.createElement("style"); s.id = "hm-cc-css"; s.textContent = css; document.head.appendChild(s); }
    var legal = FR ? "/fr/mentions-legales/" : "/mentions-legales/";
    var d = document.createElement("div"); d.className = "hm-cc"; d.setAttribute("role", "dialog"); d.setAttribute("aria-label", T.link);
    d.innerHTML = '<p>' + T.msg + ' <a href="' + legal + '#cookies">' + T.more + '</a></p><div class="b"><button class="n" type="button">' + T.no + '</button><button class="y" type="button">' + T.yes + '</button></div>';
    d.querySelector(".y").onclick = function () { set("yes"); d.remove(); loadPixel(); };
    d.querySelector(".n").onclick = function () { set("no"); d.remove(); };
    document.body.appendChild(d);
  }

  function init() {
    // Footer link to change the choice later.
    var f = document.querySelector("footer");
    if (f && !f.querySelector(".hm-cc-link")) {
      var b = document.createElement("button"); b.type = "button"; b.className = "hm-cc-link"; b.textContent = T.link;
      b.onclick = function () { if (!document.getElementById("hm-cc-css")) { var s = document.createElement("style"); s.id = "hm-cc-css"; s.textContent = css; document.head.appendChild(s); } banner(); };
      var p = document.createElement("p"); p.style.cssText = "margin:18px 0 0;font-size:12px"; p.appendChild(b);
      (f.querySelector(".wrap") || f).appendChild(p);
    }
    var c = get();
    if (c === "yes") loadPixel(); else if (c === null) banner();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
