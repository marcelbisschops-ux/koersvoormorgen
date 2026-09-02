/* Koers voor Morgen — gedrag. Klein, degradeert netjes zonder JS. */
(function () {
  "use strict";

  /* mobiele nav */
  var toggle = document.querySelector(".nav__toggle");
  var links = document.querySelector(".nav__links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    links.addEventListener("click", function (e) {
      if (e.target.tagName === "A") links.classList.remove("open");
    });
  }

  var reduce =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* scroll-reveal + lijn-van-koers tekenen */
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" }
    );
    document.querySelectorAll(".reveal").forEach(function (el) {
      io.observe(el);
    });

    /* teken elke <path class="koersline--draw"> wanneer de ouder in beeld komt */
    document.querySelectorAll(".koersline--draw").forEach(function (path) {
      try {
        var len = path.getTotalLength();
        path.style.strokeDasharray = len;
        path.style.strokeDashoffset = len;
      } catch (err) {}
      var host = path.closest(".reveal") || path.closest("svg");
      if (!host) return;
      var pio = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) {
              path.style.strokeDashoffset = "0";
              pio.disconnect();
            }
          });
        },
        { threshold: 0.3 }
      );
      pio.observe(host);
    });
  } else {
    /* geen IO of reduced-motion: alles meteen zichtbaar */
    document.querySelectorAll(".reveal").forEach(function (el) {
      el.classList.add("in");
    });
    document.querySelectorAll(".koersline--draw").forEach(function (p) {
      p.style.strokeDashoffset = "0";
    });
  }

  /* contactformulier — progressive enhancement */
  var cf = document.getElementById("contactform");
  if (cf) {
    var status = document.getElementById("cf-status");
    cf.addEventListener("submit", function (e) {
      if (cf.querySelector('[name="website"]') && cf.querySelector('[name="website"]').value) {
        e.preventDefault();
        return;
      }
      if (!window.fetch) return; // laat de gewone POST het werk doen
      e.preventDefault();
      var btn = cf.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = "Versturen…";
      fetch(cf.action, { method: "POST", body: new FormData(cf), headers: { Accept: "application/json" } })
        .then(function (r) {
          if (!r.ok) throw new Error(r.status);
          cf.reset();
          status.style.display = "block";
          status.style.color = "var(--petrol-bright)";
          status.textContent = "Bericht ontvangen. Marcel neemt doorgaans binnen één werkdag contact op.";
          btn.textContent = "Verzonden";
        })
        .catch(function () {
          status.style.display = "block";
          status.style.color = "var(--bad)";
          status.innerHTML =
            'Versturen lukte niet. Mail gerust rechtstreeks naar ' +
            '<a href="mailto:marcel@bisschopsfinancing.nl">marcel@bisschopsfinancing.nl</a>.';
          btn.disabled = false;
          btn.textContent = "Verstuur";
        });
    });
  }

  /* schermafbeeldingen: klik of Enter om te vergroten */
  var shots = document.querySelectorAll(".walkshot img");
  if (shots.length) {
    var box = null;
    var onKey = function (e) {
      if (e.key === "Escape") closeBox();
    };
    var closeBox = function () {
      if (!box) return;
      if (box.parentNode) box.parentNode.removeChild(box);
      box = null;
      document.removeEventListener("keydown", onKey);
    };
    var openBox = function (src, alt) {
      closeBox();
      box = document.createElement("div");
      box.className = "lightbox";
      var big = new Image();
      big.src = src;
      big.alt = alt || "";
      box.appendChild(big);
      box.addEventListener("click", closeBox);
      document.body.appendChild(box);
      document.addEventListener("keydown", onKey);
      requestAnimationFrame(function () {
        box.classList.add("is-open");
      });
    };
    shots.forEach(function (img) {
      img.setAttribute("tabindex", "0");
      img.setAttribute("role", "button");
      img.setAttribute("aria-label", "Vergroot: " + (img.alt || "schermafbeelding"));
      img.addEventListener("click", function () {
        openBox(img.currentSrc || img.src, img.alt);
      });
      img.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openBox(img.currentSrc || img.src, img.alt);
        }
      });
    });
  }

  /* markeer de actieve hoofd-navlink */
  var path = location.pathname.replace(/\/index\.html$/, "/").replace(/\.html$/, "");
  document.querySelectorAll(".nav__links a").forEach(function (a) {
    var href = a.getAttribute("href") || "";
    var norm = href.replace(/\/index\.html$/, "/").replace(/\.html$/, "");
    if (norm !== "/" && path.indexOf(norm) === 0) a.setAttribute("aria-current", "page");
    if (norm === "/" && (path === "/" || path === "")) a.setAttribute("aria-current", "page");
  });
})();
