/* Scripted 16:9 video of the twilight explainer, for viewers who start from zero:
   the Earth is a ball → it spins (day/night) → it circles the Sun (year) → its axis is tilted (seasons)
   → twilight → why isha comes later in summer in Khasavyurt → why the south differs → the further north, the longer.
   Loaded into the offline page by render.js with window.VIDEO_TEXT (captions-<lang>.json) and window.__lang.
   window.__seek(t) draws the frame at time t (seconds); window.__duration is the total length. */
(() => {
  const A = window.twilightAPI, TX = window.VIDEO_TEXT, LANG = window.__lang || 'ru';
  A.stopLoop();
  Object.defineProperty(window, 'devicePixelRatio', { get: () => 2 });   // sharp 2D charts
  document.documentElement.dataset.theme = 'dark';
  A.readTokens();
  const S = A.S;
  S.compare = false; S.axis = false; S.groundT = 40;
  A.setLang(LANG === 'av' ? 'av' : 'ru');
  if (!TX.hudDate) document.body.classList.add('v-nodate');

  // ---------- overlay elements ----------
  const el = (tag, id, parent = document.body) => { const e = document.createElement(tag); e.id = id; parent.appendChild(e); return e; };
  const cap = el('div', 'v-cap'), chap = el('div', 'v-chap'), title = el('div', 'v-title'), v2d = el('div', 'v2d'), summ = el('div', 'v-sum');
  title.innerHTML = '<div class="t1"></div><div class="t2"></div>';
  summ.innerHTML = '<div class="h"></div><ol>' + TX.summary.map(s => `<li>${s}</li>`).join('') + '</ol>';
  summ.querySelector('.h').textContent = TX.chapters.summary;
  const chart = document.createElement('canvas'); v2d.appendChild(chart);

  // translate the fixed 3D labels; hide the ones without a translation
  function relabel() {
    document.querySelectorAll('.lbl').forEach(l => {
      const ru = l.dataset.ru || (l.dataset.ru = l.textContent);
      if (ru in TX.labels) { l.textContent = TX.labels[ru]; l.style.visibility = ''; }
      else if (/[а-яё]/i.test(ru) && LANG !== 'ru' && !l.classList.contains('pray') && !l.classList.contains('you') && !/^(Бакъ|Сордо)/.test(ru)) l.style.visibility = 'hidden';
    });
  }

  // ---------- helpers ----------
  const D2R = Math.PI / 180;
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const ease = x => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  const lerp = (a, b, k) => a + (b - a) * k;
  const lerp3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
  const fade = (t, t0, t1, f = .5) => clamp(Math.min((t - t0) / f, (t1 - t) / f));
  const decl = N => 23.44 * Math.sin(2 * Math.PI * (284 + N) / 365);
  const LAT = id => A.CITIES.find(c => c.id === id).lat;
  const hFor = (lat, N, h0) => A.hoursFor(lat, decl(N), h0);
  const hm = h => { h = ((h % 24) + 24) % 24; const m = Math.round(h * 60); return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
  const dur = h => { const m = Math.round(h * 60); return (m >= 60 ? Math.floor(m / 60) + ' ' + TX.chart.hours + ' ' : '') + (m % 60) + ' ' + TX.chart.min; };
  function setPlace(city, N) {
    if (S.city === city && Math.abs(S.N - N) < 1e-6) return;
    S.city = city; S.lat = LAT(city); S.N = N; A.place(); relabel();
  }
  const clockOf = solar => A.toClock(solar);   // uses the current city and date
  function facts(city, N) {   // sunset, isha (clock) and twilight length for a place and day
    const prev = [S.city, S.N]; setPlace(city, N);
    const lat = LAT(city), a = hFor(lat, N, -0.833), b = hFor(lat, N, -18);
    const f = { ss: clockOf(12 + a), isha: isNaN(b) ? NaN : clockOf(12 + b), dur: isNaN(b) ? NaN : b - a, low: A.altAt(lat, decl(N), 0) };
    setPlace(prev[0], prev[1]);
    return f;
  }
  const fill = (s, f) => s.replace('{ss}', hm(f.ss)).replace('{isha}', hm(f.isha)).replace('{dur}', dur(f.dur)).replace('{low}', (f.low < 0 ? '−' : '') + Math.abs(f.low).toFixed(1).replace('.', ',') + '°');
  const C = TX.caps;
  const bands = on => { A.earth.mat.uniforms.bands.value = on; A.orbit.mat.uniforms.bands.value = on; A.orbit.ghosts.forEach(g => { g.m.uniforms.bands.value = on; }); };
  const sideCam = () => A.cam('free', [320, 0, 0], [0, -1.5, 0], 4.9);   // far and narrow: the Sun's daily circle is seen edge-on as a line
  function toSide(k) {   // from the overview to the side view, keeping the framed height steady
    const tA = [0, -1, 0], tB = [0, -1.5, 0], dA = [27, 11, 27], dB = [320, 1.5, 0];
    const lenA = Math.hypot(...dA), lenB = Math.hypot(...dB), dist = lerp(lenA, lenB, k), hgt = lerp(2 * lenA * Math.tan(22.5 * D2R), 2 * lenB * Math.tan(2.45 * D2R), k);
    const d = lerp3(dA.map(v => v / lenA), dB.map(v => v / lenB), k), n = Math.hypot(...d), tg = lerp3(tA, tB, k);
    A.cam('free', tg.map((v, i) => v + d[i] / n * dist), tg, 2 * Math.atan(hgt / 2 / dist) / D2R);
  }
  const evening = (f, p, extra) => (f.ss - .25) + p * ((isNaN(f.isha) ? f.ss + extra : f.isha + .35) - (f.ss - .25));

  // ---------- 2D charts drawn here, so every word comes from the caption file ----------
  function chartCanvas() {
    const w = 1500, h = 720; chart.style.width = w + 'px'; chart.style.height = h + 'px'; chart.width = w * 2; chart.height = h * 2;
    const x = chart.getContext('2d'); x.setTransform(2, 0, 0, 2, 0, 0); x.clearRect(0, 0, w, h);
    x.fillStyle = '#131931'; x.beginPath(); x.roundRect(0, 0, w, h, 22); x.fill();
    return { x, w, h };
  }
  const FONT = '"Golos Text", sans-serif', MONO = '"JetBrains Mono", monospace';
  function drawLatChart(prog) {
    const { x, w, h } = chartCanvas();
    const L = 110, R = 60, T = 90, B = 110, maxH = 4;
    const X = lat => L + lat / 62 * (w - L - R), Y = hh => T + (1 - hh / maxH) * (h - T - B);
    x.fillStyle = '#E6E9F5'; x.font = `600 30px ${FONT}`; x.fillText(TX.chart.latTitle, L, 56);
    x.font = `22px ${MONO}`; x.fillStyle = '#9AA2C4'; x.textAlign = 'right'; x.textBaseline = 'middle';
    for (let k = 0; k <= maxH; k++) { x.fillText(k + ' ' + TX.chart.hours, L - 16, Y(k)); x.strokeStyle = 'rgba(160,172,220,.15)'; x.beginPath(); x.moveTo(L, Y(k)); x.lineTo(w - R, Y(k)); x.stroke(); }
    x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    for (let lat = 0; lat <= 60; lat += 10) x.fillText(lat + '°', X(lat), h - B + 40);
    x.font = `22px ${FONT}`; x.fillText(TX.chart.latAxis, (L + w - R) / 2, h - 28);
    const series = [[266, '#7d9bf0', TX.chart.sep], [172, '#F2994A', TX.chart.jun]];
    const top = lat => lat * prog;
    for (const [N, col, name] of series) {
      x.strokeStyle = col; x.lineWidth = 5; x.beginPath(); let pen = false, endLat = 0;
      for (let lat = 0; lat <= top(62); lat += .25) {
        const a = hFor(lat, N, -0.833), b = hFor(lat, N, -18);
        if (isNaN(b)) { pen = false; continue; }
        const v = Math.min(maxH, b - a); pen ? x.lineTo(X(lat), Y(v)) : x.moveTo(X(lat), Y(v)); pen = true; endLat = lat;
      }
      x.stroke();
      if (prog > .95) { const a = hFor(30, N, -0.833), b = hFor(30, N, -18); x.fillStyle = col; x.font = `600 26px ${FONT}`; x.textAlign = 'left'; x.fillText(name, X(31), Y(b - a) - (N === 172 ? 26 : -40)); }
    }
    // the summer line goes off the top where twilight never ends
    const lim = (() => { for (let lat = 40; lat < 62; lat += .05) if (isNaN(hFor(lat, 172, -18))) return lat; return 99; })();
    if (top(62) > lim) { x.fillStyle = 'rgba(242,153,74,.18)'; x.fillRect(X(lim), T - 40, X(Math.min(62, top(62))) - X(lim), 34); x.fillStyle = '#F2994A'; x.font = `22px ${FONT}`; x.textAlign = 'left'; x.fillText('↑ ' + TX.chart.never, X(lim) + 10, T - 16); }
    for (const id of ['makkah', 'khasavyurt', 'moscow']) {
      const lat = LAT(id); if (lat > top(62)) continue;
      x.strokeStyle = 'rgba(230,233,245,.35)'; x.lineWidth = 1.5; x.setLineDash([6, 6]); x.beginPath(); x.moveTo(X(lat), T); x.lineTo(X(lat), h - B); x.stroke(); x.setLineDash([]);
      x.fillStyle = '#E6E9F5'; x.font = `600 24px ${FONT}`; x.textAlign = 'center'; x.fillText(TX.chart.cities[id], X(lat), h - B - 14);
    }
  }
  function drawYearChart(prog) {
    const { x, w, h } = chartCanvas();
    const L = 110, R = 60, T = 90, B = 90, maxH = 3;
    const X = n => L + (n - 1) / 364 * (w - L - R), Y = hh => T + (1 - hh / maxH) * (h - T - B);
    x.fillStyle = '#E6E9F5'; x.font = `600 30px ${FONT}`; x.fillText(TX.chart.yearTitle, L, 56);
    x.font = `22px ${MONO}`; x.fillStyle = '#9AA2C4'; x.textAlign = 'right'; x.textBaseline = 'middle';
    for (let k = 0; k <= maxH; k++) { x.fillText(k + ' ' + TX.chart.hours, L - 16, Y(k)); x.strokeStyle = 'rgba(160,172,220,.15)'; x.beginPath(); x.moveTo(L, Y(k)); x.lineTo(w - R, Y(k)); x.stroke(); }
    x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.font = `22px ${FONT}`;
    const md = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; let acc = 1;
    for (let m = 0; m < 12; m++) { x.fillText(TX.chart.months[m], X(acc + 14), h - B + 40); acc += md[m]; }
    for (const [id, col] of [['makkah', '#8A6DD6'], ['khasavyurt', '#F2994A']]) {
      const lat = LAT(id); x.strokeStyle = col; x.lineWidth = 5; x.beginPath(); let pen = false, last = null;
      for (let n = 1; n <= 365 * prog; n++) { const a = hFor(lat, n, -0.833), b = hFor(lat, n, -18); if (isNaN(b)) { pen = false; continue; } pen ? x.lineTo(X(n), Y(b - a)) : x.moveTo(X(n), Y(b - a)); pen = true; last = [n, b - a]; }
      x.stroke();
      if (last) { x.fillStyle = col; x.font = `600 26px ${FONT}`; x.textAlign = 'left'; const n0 = Math.min(last[0], 300); const a = hFor(lat, n0, -0.833), b = hFor(lat, n0, -18); x.fillText(TX.chart.cities[id], X(n0) + 8, Y(b - a) - 18); }
    }
    if (prog > .5) {   // mark the two days compared in the video
      for (const n of [172, 266]) { const lat = LAT('khasavyurt'); const a = hFor(lat, n, -0.833), b = hFor(lat, n, -18);
        x.fillStyle = '#fff'; x.beginPath(); x.arc(X(n), Y(b - a), 8, 0, Math.PI * 2); x.fill();
        x.font = `600 22px ${MONO}`; x.textAlign = 'center'; x.fillText(dur(b - a), X(n), Y(b - a) - 22); }
    }
  }

  // ---------- the script ----------
  const fK = facts('khasavyurt', 266), fJ = facts('khasavyurt', 172), fM = facts('makkah', 172), fZ = facts('kazan', 172);
  const shots = [
    { dur: 7, title: TX.title,
      run(t, p) { S.view = 'orbit'; bands(0); A.orbit.ringHolder.visible = false; setPlace('khasavyurt', 266); S.T = 12; A.orbitOnly();
        const a = .5 + p * .35; A.cam('free', [86 * Math.sin(a), 30, 86 * Math.cos(a)], [0, 0, 0], 45); } },
    { dur: 12, chapter: 'earth', caps: [[.4, 6, 'earth1'], [6, 11.6, 'earth2']],
      run(t, p) { S.view = 'earth'; bands(0); A.earth.bandGroup.visible = false; A.earth.ringHolder.visible = false;
        setPlace('khasavyurt', 266); S.T = 14;
        A.cam('free', lerp3([30, 14, 62], [8, 8, 19], ease(p)), [0, 0, 0], 40); } },
    { dur: 18, chapter: 'spin', caps: [[.3, 4.5, 'spin1'], [4.5, 9, 'spin2'], [9, 13, 'spin3'], [13, 17.7, 'spin4']],
      run(t, p) { S.view = 'earth'; bands(0); A.earth.bandGroup.visible = false; A.earth.ringHolder.visible = false;
        setPlace('khasavyurt', 266);
        S.T = ((fK.ss - 15.6 + 24 * p) % 24 + 24) % 24;   // the city reaches sunset near the end of the shot
        A.cam('free', [-2, 9, 19], [0, 0, 0], 40); } },
    { dur: 16, chapter: 'orbit', caps: [[.3, 7.5, 'orbit1'], [7.5, 15.7, 'orbit2']],
      run(t, p) { S.view = 'orbit'; bands(0); A.orbit.ringHolder.visible = false; S.T = 12;
        let N = 266 + p * 365; if (N > 365) N -= 365; S.city = 'khasavyurt'; S.lat = LAT('khasavyurt'); S.N = N;
        if (Math.floor(t * 3) !== this._k) { this._k = Math.floor(t * 3); A.place(); relabel(); }
        A.orbitOnly(); const a = .9 + p * .5; A.cam('free', [76 * Math.sin(a), 38, 76 * Math.cos(a)], [0, 0, 0], 45); } },
    { dur: 18, chapter: 'tilt', caps: [[.3, 5, 'tilt1'], [5, 9.5, 'tilt2'], [13, 17.7, 'tilt3']],
      run(t, p) { S.view = 'orbit'; bands(0); A.orbit.ringHolder.visible = false; S.T = 12;
        const N = p < .5 ? 172 : lerp(172, 355, clamp((p - .5) / .22)); S.city = 'khasavyurt'; S.lat = LAT('khasavyurt'); S.N = N;
        if (Math.floor(t * 3) !== this._k) { this._k = Math.floor(t * 3); A.place(); relabel(); }
        A.orbitOnly(); A.cam('free', [100, 8, 24], [0, 0, 0], 34); } },
    { dur: 18, chapter: 'twilight', caps: [[.3, 5, 'tw1'], [5, 10.5, 'tw2'], [10.5, 17.7, 'tw3']],
      run(t, p) { S.view = 'earth'; bands(clamp(t / 3)); A.earth.bandGroup.visible = t > 3; A.earth.ringHolder.visible = false;
        setPlace('khasavyurt', 266); S.T = ((lerp(fK.ss - .6, fK.isha + .3, p)) % 24 + 24) % 24;
        A.cam('free', lerp3([-2, 9, 19], [-6, 10, 15], ease(p)), [0, 0, 0], 40); } },
    { dur: 22, chapter: 'sky', caps: [[.3, 4, 'sky1'], [4, 8, 'sky2'], [8, 12.5, 'sky3'], [12.5, 17, 'sep1'], [17, 21.7, 'sep2']],
      run(t, p) { S.view = 'sky'; setPlace('khasavyurt', 266); S.T = ((evening(fK, p)) % 24 + 24) % 24;
        toSide(ease(clamp((t - 8) / 3.5))); },
      text: { sep1: fK, sep2: fK } },
    { dur: 20, chapter: 'summer', caps: [[.3, 6, 'jun1'], [6, 13, 'jun2'], [13, 19.7, 'jun3']],
      run(t, p) { S.view = 'sky'; setPlace('khasavyurt', 172); S.T = ((evening(fJ, p)) % 24 + 24) % 24; sideCam(); },
      text: { jun1: fJ, jun3: fJ } },
    { dur: 18, chapter: 'why', caps: [[.3, 4.5, 'pole1'], [4.5, 9, 'pole2'], [9.5, 17.7, 'pole3']],
      run(t, p) { S.view = 'earth'; bands(1); A.earth.bandGroup.visible = true; A.earth.ringHolder.visible = true;
        const N = t < 9 ? 172 : 266; setPlace('khasavyurt', N);
        const f = N === 172 ? fJ : fK; S.T = ((f.ss + .9) % 24 + 24) % 24;
        const d = decl(N) * D2R; A.cam('free', [Math.sin(d) * 21, Math.cos(d) * 21, 6], [0, 0, 0], 40); } },
    { dur: 15, chapter: 'south', caps: [[.3, 7, 'mec1'], [7, 14.7, 'mec2']],
      run(t, p) { S.view = 'sky'; setPlace('makkah', 172); S.T = ((evening(fM, p)) % 24 + 24) % 24; sideCam(); },
      text: { mec2: fM } },
    { dur: 15, chapter: 'north', caps: [[.3, 7, 'kaz1'], [7, 14.7, 'kaz2']],
      run(t, p) { S.view = 'sky'; setPlace('kazan', 172); S.T = ((evening(fZ, p, 5.5)) % 24 + 24) % 24; sideCam(); },
      text: { kaz1: fZ } },
    { dur: 14, chapter: 'latitude', two: true, caps: [[.5, 7, 'lat1'], [7, 13.7, 'lat2']],
      run(t, p) { drawLatChart(clamp(t / 6)); } },
    { dur: 14, chapter: 'year', two: true, caps: [[.5, 7.5, 'year1'], [7.5, 13.7, 'year2']],
      run(t, p) { drawYearChart(clamp(t / 6)); } },
    { dur: 18, summary: true,
      run(t, p) { S.view = 'orbit'; bands(0); A.orbit.ringHolder.visible = false; setPlace('khasavyurt', 172); S.T = 12; A.orbitOnly();
        const a = 1.4 + p * .4; A.cam('free', [86 * Math.sin(a), 30, 86 * Math.cos(a)], [0, 0, 0], 45); } }
  ];
  let start = 0; for (const s of shots) { s.t0 = start; start += s.dur; }
  window.__duration = start;
  relabel();

  window.__seek = t => {
    const s = shots.find(x => t < x.t0 + x.dur) || shots[shots.length - 1];
    const lt = t - s.t0, p = clamp(lt / s.dur);
    v2d.style.display = s.two ? 'flex' : 'none';
    s.run.call(s, lt, p);
    if (!s.two) { A.time(); A.render(); }
    const c = (s.caps || []).find(([a, b]) => lt >= a && lt < b);
    const txt = c ? (s.text && s.text[c[2]] ? fill(C[c[2]], s.text[c[2]]) : C[c[2]]) : '';
    cap.textContent = txt; cap.style.opacity = c ? fade(lt, c[0], c[1], .4) : 0;
    chap.textContent = s.chapter ? TX.chapters[s.chapter] : ''; chap.style.opacity = s.chapter ? fade(lt, 0, s.dur, .5) : 0;
    title.style.opacity = s.title ? fade(lt, 0, s.dur, .9) : 0;
    if (s.title) { title.querySelector('.t1').textContent = s.title[0]; title.querySelector('.t2').textContent = s.title[1]; }
    summ.style.opacity = s.summary ? fade(lt, 0, s.dur + 5, .9) : 0;
    summ.querySelectorAll('li').forEach((li, i) => { li.style.opacity = s.summary ? clamp((lt - .8 - i * 2.2) / .6) : 0; });
    document.querySelector('.hud').style.opacity = (s.title || s.two || s.summary || S.view === 'orbit' || S.view === 'earth') ? 0 : 1;
  };
})();
