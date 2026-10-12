/* Scripted 16:9 video of the twilight explainer. Loaded into the offline page by render.js;
   window.__seek(t) draws the frame at time t (seconds), window.__duration is the total length. */
(() => {
  const A = window.twilightAPI;
  A.stopLoop();
  Object.defineProperty(window, 'devicePixelRatio', { get: () => 2 });   // sharp 2D charts when they are enlarged
  document.documentElement.dataset.theme = 'dark';
  A.readTokens();

  // ---------- overlay elements ----------
  const el = (tag, id, parent = document.body) => { const e = document.createElement(tag); e.id = id; parent.appendChild(e); return e; };
  const cap = el('div', 'v-cap'), chap = el('div', 'v-chap'), title = el('div', 'v-title'), v2d = el('div', 'v2d');
  title.innerHTML = '<div class="t1"></div><div class="t2"></div>';

  // ---------- helpers ----------
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const ease = x => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  const lerp = (a, b, k) => a + (b - a) * k;
  const lerp3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
  const fade = (t, t0, t1, f = .6) => clamp(Math.min((t - t0) / f, (t1 - t) / f));
  const fmtDur = h => { const m = Math.round(h * 60); return (m >= 60 ? Math.floor(m / 60) + ' ч ' : '') + (m % 60) + ' мин'; };
  const S = A.S;
  function setPlace(city, N) {
    if (S.city === city && Math.abs(S.N - N) < 1e-6) return;
    S.city = city; const c = A.CITIES.find(x => x.id === city); if (c.lat != null) S.lat = c.lat;
    S.N = N; A.place();
  }
  function decl(N) { return 23.44 * Math.sin(2 * Math.PI * (284 + N) / 365); }
  const hFor = (lat, N, h0) => A.hoursFor(lat, decl(N), h0);
  const clock = solar => ((A.toClock(solar) % 24) + 24) % 24;
  const LAT = id => A.CITIES.find(c => c.id === id).lat;
  function twilightDur(id, N) { const lat = LAT(id); const a = hFor(lat, N, -0.833), b = hFor(lat, N, -18); return isNaN(b) ? NaN : b - a; }
  function show2d(node, on) {
    if (on) { if (node.parentNode !== v2d) { v2d.innerHTML = ''; v2d.appendChild(node); } v2d.style.display = 'flex'; }
    else v2d.style.display = 'none';
  }

  // ---------- the script ----------
  const raceFig = document.querySelector('#race .two');
  document.getElementById('raceChart').dataset.h = 330; document.getElementById('yearChart').dataset.h = 330;
  const lpFig = document.querySelector('#light .fig');
  const kazMarch = twilightDur('kazan', 80), mecMarch = twilightDur('makkah', 80), khaMarch = twilightDur('khasavyurt', 80);
  const shots = [
    { dur: 9, chapter: '', title: ['Сумерки, −18° и время намаза', 'Почему летом сумерки у нас длятся дольше, чем в Мекке'],
      run(t, p) { S.view = 'orbit'; setPlace('khasavyurt', 172); S.T = 12; A.orbitOnly();
        const a = .55 + p * .45; A.cam('free', [86 * Math.sin(a), 30, 86 * Math.cos(a)], [0, 0, 0], 45); } },
    { dur: 24, chapter: 'Времена года',
      caps: [[0, 4.5, 'Земля обходит Солнце за год'], [4.5, 10.5, 'В июне северное полушарие повёрнуто к Солнцу: день длинный, ночь короткая'],
             [10.5, 16, 'Ось Земли наклонена на 23,4° и всегда смотрит в одну сторону'], [16, 22.5, 'В декабре север отвёрнут от Солнца: день короткий, ночь длинная']],
      run(t, p) { S.view = 'orbit'; S.T = 12;
        let N = 80 + p * 365; if (N > 365) N -= 365; S.city = 'khasavyurt'; S.lat = LAT('khasavyurt'); S.N = N;
        if (Math.floor(t * 4) !== this._k) { this._k = Math.floor(t * 4); A.place(); }
        A.orbitOnly();
        const a = 1.0 + p * .5; A.cam('free', [78 * Math.sin(a), 36, 78 * Math.cos(a)], [0, 0, 0], 45); } },
    { dur: 16, chapter: 'Земля из космоса',
      caps: [[.5, 8, 'Цветные полосы — сумерки: три слоя по 6°, всего 18°'], [8, 15.5, 'Светлое кольцо — путь Хасавюрта за сутки']],
      run(t, p) { S.view = 'earth'; setPlace('khasavyurt', 172); S.T = lerp(18, 24, p);
        A.cam('free', lerp3([-4, 11, 16], [-9, 9, 14], ease(p)), [0, 0, 0], 40); } },
    { dur: 18, chapter: 'Что такое сумерки',
      caps: [[.3, 4.5, 'После заката Солнце ещё освещает воздух высоко над нами'], [4.5, 8.5, 'Гражданские сумерки: Солнце до −6° под горизонтом'],
             [8.5, 12.5, 'Навигационные: до −12°'], [12.5, 17.5, 'Астрономические: до −18°. Ниже — ночь']],
      run(t, p) { S.view = 'sky'; S.groundT = 40; setPlace('khasavyurt', 80);
        const ss = 12 + hFor(LAT('khasavyurt'), 80, -0.833); S.T = clock(lerp(ss - .2, ss + 2, p));
        const a = .75 + p * .35; A.cam('free', [27 * Math.sin(a), 10, 27 * Math.cos(a)], [0, -1, 0], 45); } },
    { dur: 16, chapter: 'Момент −18°',
      caps: [[.3, 5, 'Пока Солнце глубже 18° под горизонтом, небо тёмное'], [5, 10.5, 'С −18° начинается истинная заря — время фаджра'], [10.5, 15.5, 'С каждым градусом заря становится ярче']],
      run(t, p) { S.view = 'sky'; S.groundT = 0; setPlace('khasavyurt', 80);
        const fj = 12 - hFor(LAT('khasavyurt'), 80, -18); S.T = clock(lerp(fj - .35, fj + .75, p));
        A.cam('eye', null, null, 70); A.eye.yaw = Math.PI / 2 - .12; A.eye.pitch = 5;
        A.sky.pathGroup.visible = A.sky.prayerMarkers.visible = false; A.sky.domeMat.uniforms.gain.value = 2.5; } },
    { dur: 16, chapter: 'Мекка, 21 марта',
      caps: [[.3, 7.5, 'В Мекке Солнце уходит под горизонт почти отвесно'], [7.5, 15.5, 'До −18° — около ' + fmtDur(mecMarch) + '. Отсюда привычные «полтора часа»']],
      run(t, p) { S.view = 'sky'; S.groundT = 40; setPlace('makkah', 80);
        const ss = 12 + hFor(LAT('makkah'), 80, -0.833); S.T = clock(lerp(ss - .1, ss + mecMarch + .3, p));
        A.cam('free', [320, 0, 0], [0, -1.5, 0], 4.9); } },
    { dur: 14, chapter: 'Хасавюрт, 21 марта',
      caps: [[.3, 13.5, 'В Хасавюрте путь Солнца наклонён сильнее: до −18° — ' + fmtDur(khaMarch)]],
      run(t, p) { S.view = 'sky'; S.groundT = 40; setPlace('khasavyurt', 80);
        const ss = 12 + hFor(LAT('khasavyurt'), 80, -0.833); S.T = clock(lerp(ss - .1, ss + khaMarch + .3, p));
        A.cam('free', [320, 0, 0], [0, -1.5, 0], 4.9); } },
    { dur: 14, chapter: 'Казань, 21 марта',
      caps: [[.3, 13.5, 'В Казани ещё положе: до −18° — ' + fmtDur(kazMarch)]],
      run(t, p) { S.view = 'sky'; S.groundT = 40; setPlace('kazan', 80);
        const ss = 12 + hFor(LAT('kazan'), 80, -0.833); S.T = clock(lerp(ss - .1, ss + kazMarch + .3, p));
        A.cam('free', [320, 0, 0], [0, -1.5, 0], 4.9); } },
    { dur: 17, chapter: 'Казань, 21 июня',
      caps: [[.3, 8, 'Летом Солнце в полночь опускается только до ' + A.altAt(LAT('kazan'), decl(172), 0).toFixed(1).replace('.', ',').replace('-', '−') + '°'],
             [8, 16.5, 'До −18° оно не доходит: сумерки не исчезают всю ночь']],
      run(t, p) { S.view = 'sky'; S.groundT = 40; setPlace('kazan', 172);
        const ss = 12 + hFor(LAT('kazan'), 172, -0.833); S.T = clock(lerp(ss - .1, 24 + 2.5, p));
        A.cam('free', [320, 0, 0], [0, -1.5, 0], 4.9); } },
    { dur: 13, chapter: 'Сколько длятся сумерки', two: raceFig,
      caps: [[.3, 12.5, 'Полутора часов хватает только на юге. Летом на севере сумерки не кончаются']],
      run(t, p) { setPlace('kazan', 172); if (!this._drawn) { this._drawn = true; A.drawRace(); A.drawYear(); } } },
    { dur: 17, chapter: 'Засветка неба', two: lpFig,
      caps: [[.3, 5.5, 'Первая заря очень слабая'], [5.5, 11, 'Вдали от городов её видно с −18°'], [11, 16.5, 'В городе она тонет в засветке и видна только с −15° и позже']],
      run(t, p) { setPlace('kazan', 80); S.bortle = 7; S.haze = 1; S.moon = 0; S.lpMode = 'dawn';
        S.depr = lerp(21, 10, p); A.updateLp(); } },
    { dur: 22, chapter: 'Время намазов',
      run(t, p) { S.view = 'sky'; S.groundT = 40; setPlace('khasavyurt', 110); S.T = lerp(3, 23, p);
        const a = .7 + p * .6; A.cam('free', [27 * Math.sin(a), 11, 27 * Math.cos(a)], [0, -1, 0], 45); },
      capsFn() {   // a caption as the Sun passes each prayer point
        const lat = LAT('khasavyurt'), N = 110, d = decl(N);
        const asr = 12 + A.hoursFor(lat, d, Math.atan(1 / (1 + Math.tan(Math.abs(lat - d) * Math.PI / 180))) * 180 / Math.PI);
        const ev = [[12 - hFor(lat, N, -18), 'Фаджр: Солнце на 18° под горизонтом перед рассветом'], [12 + 2 / 60, 'Зухр: Солнце прошло самую высокую точку'],
                    [asr, 'Аср: тень предмета стала длиннее на его высоту'], [12 + hFor(lat, N, -0.833), 'Магриб: Солнце скрылось за горизонтом'],
                    [12 + hFor(lat, N, -18), 'Иша: Солнце опустилось на 18°, сумерки исчезли']];
        return [[.2, 2.6, 'Каждый намаз привязан к положению Солнца']].concat(ev.map(([s, txt]) => { const tc = (clock(s) - 3) / 20 * this.dur; return [tc - .4, tc + 3.2, txt]; }));
      } },
    { dur: 9, chapter: '', title: ['Время намаза определяет Солнце', 'а не то, что видно из окна: засветка, дымка и Луна прячут слабую зарю'],
      run(t, p) { S.view = 'orbit'; setPlace('khasavyurt', 172); S.T = 12; A.orbitOnly();
        const a = 1.5 + p * .4; A.cam('free', [86 * Math.sin(a), 30, 86 * Math.cos(a)], [0, 0, 0], 45); } }
  ];
  let start = 0; for (const s of shots) { s.t0 = start; start += s.dur; if (s.capsFn) s.caps = s.capsFn(); }
  window.__duration = start;

  window.__seek = t => {
    const s = shots.find(x => t < x.t0 + x.dur) || shots[shots.length - 1];
    A.sky.pathGroup.visible = A.sky.prayerMarkers.visible = true; A.sky.domeMat.uniforms.gain.value = 0;   // shots may change these
    const lt = t - s.t0, p = clamp(lt / s.dur);
    show2d(s.two, !!s.two);
    s.run(lt, p);
    if (!s.two) { A.time(); A.render(); }
    // captions
    const c = (s.caps || []).find(([a, b]) => lt >= a && lt < b);
    cap.textContent = c ? c[2] : ''; cap.style.opacity = c ? fade(lt, c[0], c[1], .45) : 0;
    chap.textContent = s.chapter; chap.style.opacity = s.chapter ? Math.min(fade(lt, 0, s.dur, .5), 1) : 0;
    title.style.opacity = s.title ? fade(lt, 0, s.dur, 1) : 0;
    if (s.title) { title.querySelector('.t1').textContent = s.title[0]; title.querySelector('.t2').textContent = s.title[1]; }
    // HUD only where the clock means something
    document.querySelector('.hud').style.opacity = (s.title || s.two || S.view === 'orbit') ? 0 : 1;
  };
})();
