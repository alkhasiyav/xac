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
  const cap = el('div', 'v-cap'), chap = el('div', 'v-chap'), title = el('div', 'v-title'), v2d = el('div', 'v2d'), summ = el('div', 'v-sum'), card = el('div', 'v-card');
  title.innerHTML = '<div class="t1"></div><div class="t2"></div>';
  summ.innerHTML = '<div class="h"></div><ol>' + TX.summary.map(s => `<li>${s}</li>`).join('') + '</ol>';
  summ.querySelector('.h').textContent = TX.chapters.summary;
  card.innerHTML = '<div class="h"></div><ol>' + TX.calendar.list.map(s => `<li>${s}</li>`).join('') + '</ol>';
  card.querySelector('.h').textContent = TX.calendar.title;
  const ML = Object.assign({}, A.MOON_TX, TX.moon || {});   // labels inside the Moon drawings
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
  function moonCanvas(cssW, cssH, k) {   // draw at a logical size, enlarged k times
    chart.style.width = cssW + 'px'; chart.style.height = cssH + 'px'; chart.width = cssW * 2; chart.height = cssH * 2;
    const x = chart.getContext('2d'); x.setTransform(2 * k, 0, 0, 2 * k, 0, 0); x.clearRect(0, 0, cssW / k, cssH / k);
    return { x, w: cssW / k, h: cssH / k };
  }
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

  // what a degree is: a protractor at the observer, with the angles below the horizon
  function drawDegrees(t) {
    const { x, w, h } = chartCanvas(), K = TX.chart;
    const O = [w * .62, h * .56], r = 300;
    const a1 = clamp((t - .3) / 3), a2 = clamp((t - 4.5) / 2.5), a3 = clamp((t - 9) / 1.5), a4 = clamp((t - 12.5) / 4);
    // full circle, faint
    x.globalAlpha = .35 + .65 * (1 - a2) * a1; x.strokeStyle = '#9AA2C4'; x.setLineDash([8, 8]); x.lineWidth = 2;
    x.beginPath(); x.arc(O[0], O[1], r, 0, Math.PI * 2 * a1); x.stroke(); x.setLineDash([]); x.globalAlpha = 1;
    if (a1 > .9 && a2 < .5) { x.fillStyle = '#E6E9F5'; x.font = `600 30px ${FONT}`; x.textAlign = 'left'; x.fillText(K.deg360, O[0] + r + 30, O[1] - r + 40); }
    // horizon
    x.strokeStyle = '#E6E9F5'; x.lineWidth = 3; x.beginPath(); x.moveTo(60, O[1]); x.lineTo(w - 60, O[1]); x.stroke();
    x.fillStyle = '#9AA2C4'; x.font = `24px ${FONT}`; x.textAlign = 'left'; x.fillText(K.horizon, 70, O[1] - 14);
    // quarter: from the horizon (toward the west) up to the zenith, ticks every 10°
    if (a2 > 0) {
      x.strokeStyle = '#F2994A'; x.lineWidth = 6; x.beginPath(); x.arc(O[0], O[1], r, Math.PI, Math.PI + Math.PI / 2 * a2); x.stroke();
      x.fillStyle = '#E6E9F5'; x.font = `22px ${MONO}`; x.textAlign = 'center'; x.textBaseline = 'middle';
      for (let deg = 0; deg <= 90 * a2 + .01; deg += 10) {
        const an = Math.PI + deg * D2R, c = Math.cos(an), s2 = Math.sin(an);
        x.strokeStyle = '#F2994A'; x.lineWidth = 3; x.beginPath(); x.moveTo(O[0] + c * (r - 14), O[1] + s2 * (r - 14)); x.lineTo(O[0] + c * (r + 14), O[1] + s2 * (r + 14)); x.stroke();
        x.fillText(deg + '°', O[0] + c * (r + 44), O[1] + s2 * (r + 44));
      }
      x.textBaseline = 'alphabetic';
      if (a2 > .95) { x.fillStyle = '#F2994A'; x.font = `600 28px ${FONT}`; x.textAlign = 'left'; x.fillText(K.deg90, O[0] + 24, O[1] - r - 20); }
    }
    // the fist: a 10° wedge
    if (a3 > 0) {
      x.globalAlpha = a3; x.fillStyle = 'rgba(242,153,74,.28)'; x.beginPath(); x.moveTo(O[0], O[1]); x.arc(O[0], O[1], r, Math.PI + 30 * D2R, Math.PI + 40 * D2R); x.closePath(); x.fill();
      x.fillStyle = '#FFD3AA'; x.font = `600 26px ${FONT}`; x.textAlign = 'right';
      const an = Math.PI + 35 * D2R; x.fillText(K.fist, O[0] + Math.cos(an) * (r + 60) - 10, O[1] + Math.sin(an) * (r + 60) - 30); x.globalAlpha = 1;
    }
    // below the horizon: −6, −12, −18 and the Sun sinking
    if (a4 > 0) {
      const cols = ['#EE8744', '#8A6DD6', '#3C56B8'];
      for (let i = 0; i < 3; i++) {
        x.strokeStyle = cols[i]; x.lineWidth = 10; x.beginPath(); x.arc(O[0], O[1], r, Math.PI - (i + 1) * 6 * D2R, Math.PI - i * 6 * D2R); x.stroke();
        const an = Math.PI - (i + 1) * 6 * D2R; x.fillStyle = '#E6E9F5'; x.font = `600 24px ${MONO}`; x.textAlign = 'right';
        x.fillText('−' + (i + 1) * 6 + '°', O[0] + Math.cos(an) * (r + 30) - 6, O[1] + Math.sin(an) * (r + 30) + 14);
      }
      const dd = 20 * ease(a4), an = Math.PI - dd * D2R;
      const sx = O[0] + Math.cos(an) * r, sy = O[1] + Math.sin(an) * r;
      const g = x.createRadialGradient(sx, sy, 0, sx, sy, 40); g.addColorStop(0, 'rgba(255,240,180,1)'); g.addColorStop(.4, 'rgba(255,200,90,.9)'); g.addColorStop(1, 'rgba(255,200,90,0)');
      x.fillStyle = g; x.beginPath(); x.arc(sx, sy, 40, 0, Math.PI * 2); x.fill();
      x.strokeStyle = 'rgba(255,214,120,.8)'; x.setLineDash([6, 6]); x.lineWidth = 2; x.beginPath(); x.moveTo(O[0], O[1]); x.lineTo(sx, sy); x.stroke(); x.setLineDash([]);
      x.fillStyle = '#FFD3AA'; x.font = `600 30px ${MONO}`; x.textAlign = 'left'; x.fillText(K.depth + ': ' + Math.round(dd) + '°', 70, 70);
    }
    // the observer
    x.fillStyle = '#E6E9F5'; x.beginPath(); x.arc(O[0], O[1] - 46, 11, 0, Math.PI * 2); x.fill(); x.fillRect(O[0] - 8, O[1] - 34, 16, 34);
  }

  // why 18°: a slice through the Earth and its air near the observer, to scale (air ≈ 80 km)
  function drawWhy18(t) {
    const { x, w, h } = chartCanvas(), K = TX.chart;
    const dd = 20 * ease(clamp((t - 2) / 20)), d = dd * D2R;
    const Re = 4000, H = Re * 80 / 6371, O = [w * .78, 330], Cc = [O[0], O[1] + Re];
    const v = [Math.cos(d), -Math.sin(d)], n = [-Math.sin(d), -Math.cos(d)];   // sunlight direction and the normal of the grazing ray
    const T0 = [Cc[0] + Re * n[0], Cc[1] + Re * n[1]];
    x.save(); x.beginPath(); x.roundRect(0, 0, w, h, 22); x.clip();
    x.fillStyle = '#070a16'; x.fillRect(0, 0, w, h);
    // air shell
    x.save(); x.beginPath(); x.arc(Cc[0], Cc[1], Re + H, 0, Math.PI * 2); x.arc(Cc[0], Cc[1], Re, 0, Math.PI * 2, true); x.clip();
    x.fillStyle = '#18213f'; x.fillRect(0, 0, w, h);                     // air in the Earth's shadow
    x.beginPath();                                                       // sunlit air: beyond the grazing ray
    const far = 5000, p1 = [T0[0] - v[0] * far, T0[1] - v[1] * far], p2 = [T0[0] + v[0] * far, T0[1] + v[1] * far];
    x.moveTo(p1[0], p1[1]); x.lineTo(p2[0], p2[1]); x.lineTo(p2[0] - n[0] * -far, p2[1] - n[1] * -far); x.lineTo(p1[0] - n[0] * -far, p1[1] - n[1] * -far); x.closePath();
    const lg = x.createLinearGradient(0, O[1] - H, 0, O[1] + 200); lg.addColorStop(0, '#ffd58a'); lg.addColorStop(1, '#f08a4b');
    x.fillStyle = lg; x.fill();
    x.restore();
    // Earth
    x.fillStyle = '#1d3a24'; x.beginPath(); x.arc(Cc[0], Cc[1], Re, 0, Math.PI * 2); x.fill();
    // sun rays above the grazing line
    x.strokeStyle = 'rgba(255,214,120,.75)'; x.fillStyle = 'rgba(255,214,120,.75)'; x.lineWidth = 2;
    for (let k = 0; k < 5; k++) {
      const off = 16 + k * 34, b = [T0[0] - n[0] * -off, T0[1] - n[1] * -off];
      const s0 = [b[0] - v[0] * 1400, b[1] - v[1] * 1400], s1 = [b[0] - v[0] * 380 + v[0] * 300 * k / 4, b[1] - v[1] * 380 + v[1] * 300 * k / 4];
      x.beginPath(); x.moveTo(s0[0], s0[1]); x.lineTo(s1[0], s1[1]); x.stroke();
      x.beginPath(); x.moveTo(s1[0] + v[0] * 14, s1[1] + v[1] * 14); x.lineTo(s1[0] - v[0] * 4 - n[0] * 7, s1[1] - v[1] * 4 - n[1] * 7); x.lineTo(s1[0] - v[0] * 4 + n[0] * 7, s1[1] - v[1] * 4 + n[1] * 7); x.fill();
    }
    // the observer's horizon
    x.strokeStyle = 'rgba(230,233,245,.8)'; x.setLineDash([10, 8]); x.lineWidth = 2; x.beginPath(); x.moveTo(O[0], O[1]); x.lineTo(40, O[1]); x.stroke(); x.setLineDash([]);
    x.fillStyle = '#E6E9F5'; x.font = `22px ${FONT}`; x.textAlign = 'left'; x.fillText(K.horizon, 50, O[1] - 10);
    x.fillStyle = '#F2994A'; x.beginPath(); x.moveTo(O[0], O[1] - 4); x.lineTo(O[0] - 12, O[1] - 34); x.lineTo(O[0] + 12, O[1] - 34); x.fill();
    x.font = `600 24px ${FONT}`; x.textAlign = 'center'; x.fillText(K.you, O[0], O[1] - 44);
    // labels
    x.fillStyle = '#9AA2C4'; x.font = `22px ${FONT}`; x.textAlign = 'left';
    x.fillText(K.air + ' ' + K.air80, O[0] + 40, O[1] - H / 2 + 8);
    x.fillText(K.earth, O[0] - 80, O[1] + 110);
    x.fillStyle = '#FFD3AA'; x.fillText(K.sunlight, 60, 120);
    x.restore();
    x.fillStyle = '#FFD3AA'; x.font = `600 30px ${MONO}`; x.textAlign = 'left'; x.fillText(K.depth + ': ' + dd.toFixed(0) + '°', 60, 62);
  }

  // a day in Khasavyurt, noon to noon: day, twilight and dark night for 23 September and 21 June
  function drawNightBars(t) {
    const { x, w, h } = chartCanvas(), K = TX.chart, lat = LAT('khasavyurt');
    const L = 250, R = 60, x0 = 12, X = hh => L + (hh - x0) / 24 * (w - L - R);
    x.fillStyle = '#E6E9F5'; x.font = `600 30px ${FONT}`; x.textAlign = 'left'; x.fillText(K.nightTitle, 60, 62);
    x.font = `22px ${MONO}`; x.fillStyle = '#9AA2C4'; x.textAlign = 'center';
    for (let hh = 12; hh <= 36; hh += 3) x.fillText(String(hh % 24).padStart(2, '0') + ':00', X(hh), h - 40);
    const rows = [[266, K.sepRow, 200, clamp((t - 2.5) / 2)], [172, K.junRow, 430, clamp((t - 9) / 2)]];
    for (const [N, name, y, a] of rows) {
      if (a <= 0) continue;
      x.globalAlpha = a; setPlace('khasavyurt', N);
      const ev = h0 => hFor(lat, N, h0), c = s => { let v = A.toClock(s); while (v < 12) v += 24; return v; };
      const ss = c(12 + ev(-0.833)), e6 = c(12 + ev(-6)), e12 = c(12 + ev(-12)), e18 = c(12 + ev(-18));
      const m18 = c(36 - ev(-18)), m12 = c(36 - ev(-12)), m6 = c(36 - ev(-6)), sr = c(36 - ev(-0.833));
      const segs = [[12, ss, '#F4C443'], [ss, e6, '#EE8744'], [e6, e12, '#8A6DD6'], [e12, e18, '#3C56B8'], [e18, m18, '#0d1430'], [m18, m12, '#3C56B8'], [m12, m6, '#8A6DD6'], [m6, sr, '#EE8744'], [sr, 36, '#F4C443']];
      const bh = 70;
      for (const [s0, s1, col] of segs) { x.fillStyle = col; x.fillRect(X(s0), y, X(s1) - X(s0), bh); }
      x.strokeStyle = 'rgba(160,172,220,.35)'; x.lineWidth = 1; x.strokeRect(X(12), y, X(36) - X(12), bh);
      x.fillStyle = '#E6E9F5'; x.font = `600 28px ${FONT}`; x.textAlign = 'right'; x.fillText(name, L - 24, y + bh / 2 + 10);
      // events
      x.font = `20px ${FONT}`; x.textAlign = 'center';
      for (const [hh, lab, up] of [[ss, K.sunset, 1], [e18, K.ishaName, 0], [m18, K.fajrName, 0], [sr, K.sunrise, 1]]) {
        x.strokeStyle = '#E6E9F5'; x.beginPath(); x.moveTo(X(hh), y - 8); x.lineTo(X(hh), y + bh + 8); x.stroke();
        x.fillStyle = '#E6E9F5'; x.fillText(lab + ' ' + hm(hh), X(hh), up ? y - 16 : y + bh + 32);
      }
      // brackets: twilight and dark night
      const br = (s0, s1, lab, col, yy, align) => { x.strokeStyle = col; x.lineWidth = 3; x.beginPath(); x.moveTo(X(s0), yy - 8); x.lineTo(X(s0), yy); x.lineTo(X(s1), yy); x.lineTo(X(s1), yy - 8); x.stroke();
        x.fillStyle = col; x.font = `600 22px ${FONT}`; x.textAlign = align; x.fillText(lab, align === 'right' ? X(s1) - 4 : X(s0) + 4, yy + 30); };
      const yb = y + bh + 74;
      br(ss, e18, K.twilight + ' ' + dur(e18 - ss), '#FFD3AA', yb, 'right');
      br(e18, m18, K.night + ' ' + dur(m18 - e18), '#9fb0ff', yb, 'left');
      x.globalAlpha = 1;
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
    { dur: 18, chapter: 'degrees', two: true, caps: [[.3, 4.3, 'deg1'], [4.3, 9, 'deg2'], [9, 12.5, 'deg3'], [12.5, 17.7, 'deg4']],
      run(t, p) { drawDegrees(t); } },
    { dur: 32, chapter: 'why18', two: true, caps: [[.3, 6, 'w18_1'], [6, 12, 'w18_2'], [12, 19, 'w18_3'], [19, 25, 'w18_4'], [25, 31.7, 'w18_5']],
      run(t, p) { drawWhy18(t); } },
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
    { dur: 30, chapter: 'night', two: true, caps: [[.3, 5, 'night1'], [5, 9, 'night2'], [9, 14, 'night3'], [14, 19.5, 'night4'], [19.5, 24.5, 'night5'], [24.5, 29.7, 'night6']],
      run(t, p) { drawNightBars(t); } },
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
    { dur: 20, chapter: 'moon', two: true, caps: [[.3, 5, 'moon1'], [5, 10, 'moon2'], [10, 14.5, 'moon3'], [14.5, 19.7, 'moon4']],
      run(t, p) { const { x, w, h } = moonCanvas(1560, 750, 1.6);
        const day = t < 10 ? lerp(8, 29.53 + 1.5, t / 10) % 29.53 : t < 14.5 ? 0 : lerp(0, 2, clamp((t - 14.5) / 3));
        A.drawMoonOrbit(x, w, h, day, ML); } },
    { dur: 26, chapter: 'hilal', two: true, caps: [[.3, 5.5, 'hil1'], [5.5, 9.5, 'hil2'], [9.5, 19, 'hil3'], [19, 25.7, 'hil4']],
      run(t, p) { const ev = t < 9.5 ? 0 : t < 19 ? 1 : 2, k = 1.6, cw = 1560, lw = cw / k, lh = lw * 128 / 360 + 34;
        const { x, w, h } = moonCanvas(cw, lh * k, k); A.drawHilalMap(x, w, h, ev, ML); } },
    { dur: 13, chapter: 'moonsky', two: true, caps: [[.3, 12.7, 'msky']],
      run(t, p) { const { x, w, h } = moonCanvas(1560, 470, 1.6); A.drawHilalSky(x, w, h, 1, ML); } },
    { dur: 16, chapter: 'calendar', card: true,
      run(t, p) { S.view = 'orbit'; bands(0); A.orbit.ringHolder.visible = false; setPlace('khasavyurt', 172); S.T = 12; A.orbitOnly();
        const a = 1.2 + p * .3; A.cam('free', [86 * Math.sin(a), 30, 86 * Math.cos(a)], [0, 0, 0], 45); } },
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
    card.style.opacity = s.card ? fade(lt, 0, s.dur, .7) : 0;
    card.querySelectorAll('li').forEach((li, i) => { li.style.opacity = s.card ? clamp((lt - .8 - i * 2.6) / .6) : 0; });
    summ.querySelectorAll('li').forEach((li, i) => { li.style.opacity = s.summary ? clamp((lt - .8 - i * 2.2) / .6) : 0; });
    document.querySelector('.hud').style.opacity = (s.title || s.two || s.summary || s.card || S.view === 'orbit' || S.view === 'earth') ? 0 : 1;
  };
})();
