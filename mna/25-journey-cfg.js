// © 2026 Bisschops Financing B.V. Alle rechten voorbehouden.
// KVM-FUNC-WF-001 (WF-C): schrijfdeel van de journeyconfiguratie. Bewust los van mna/22-journey.js (die component leest
// alleen; zelfde scheiding als worker/54 en worker/59): een fase met reden op niet van toepassing zetten of weer opnemen.
// Fase op niet van toepassing zetten of weer opnemen (worker/59); daarna de journey opnieuw laden.
function jrNvt(key, nvt, reden, foutEl, knop) {
  if (knop) knop.disabled = true;
  fetchMetTimeout(WORKER + '/mna/journey-cfg/fase', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-tussen-key': S._bgKey || S.code }, body: JSON.stringify({ code: S.code, fase_key: key, nvt: nvt, reden: reden }) }, 20000)
    .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
    .then(function (x) {
      if (!x.ok) { if (knop) knop.disabled = false; if (foutEl) foutEl.textContent = x.j.error || 'Dat lukte niet. Er is niets gewijzigd.'; return; }
      JR.cache = {}; var el = document.getElementById('jr-begeleider'); if (el) el.removeAttribute('data-jr-klaar'); jrMount();
    })
    .catch(function () { if (knop) knop.disabled = false; if (foutEl) foutEl.textContent = 'Geen verbinding. Er is niets gewijzigd.'; });
}
