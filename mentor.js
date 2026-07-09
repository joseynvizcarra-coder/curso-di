// ============================================
// Mentor DI — Motor del chat + widget UI
// Tolerante a errores de tipeo, mayúsculas/minúsculas, acentos
// Requiere mentor-knowledge.js cargado antes
// ============================================
(function () {
  'use strict';

  // ---- Normalización: minúsculas, sin acentos, sin puntuación extra ----
  function normalize(str) {
    return str
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita acentos
      .replace(/[¿?¡!.,;:()"']/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ---- Distancia de edición (Levenshtein) para tolerar errores de tipeo ----
  function levenshtein(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      }
    }
    return dp[m][n];
  }

  // Tolerancia proporcional al largo de la palabra (más margen a palabras largas)
  function wordsAreClose(a, b) {
    if (a === b) return true;
    if (Math.abs(a.length - b.length) > 3) return false;
    const maxDist = a.length <= 4 ? 1 : a.length <= 8 ? 2 : 3;
    return levenshtein(a, b) <= maxDist;
  }

  // Palabras funcionales que no aportan significado — evita falsos positivos (ej. "sin" coincidiendo con cualquier frase que también tenga "sin")
  const STOPWORDS = new Set(['que','los','las','del','por','sin','con','una','uno','les','sus','este','esta','esto','eso','para','como','desde','entre','muy','mas','pero','todo','todos','toda','todas','tiene','hay','soy','eres','somos','son','estoy','estas','estan','tengo','tienes','sera','fue','ser','hacer','solo']);
  function meaningfulWords(str) {
    return normalize(str).split(' ').filter(w => w.length > 2 && !STOPWORDS.has(w));
  }

  // ---- Búsqueda: puntúa cada entrada de la KB contra la consulta ----
  function search(query) {
    const qNorm = normalize(query);
    const qWords = [...new Set(meaningfulWords(query))];
    let best = null, bestScore = 0;

    for (const entry of MENTOR_KB) {
      let score = 0;
      const allKwWords = new Set();

      for (const kw of entry.kw) {
        const kwNorm = normalize(kw);
        // Coincidencia de frase completa (substring) = puntaje alto, una sola vez
        if (qNorm.includes(kwNorm)) { score += kwNorm.split(' ').length * 3; continue; }
        meaningfulWords(kw).forEach(w => allKwWords.add(w));
      }

      // Cada palabra de la consulta cuenta UNA sola vez por entrada, no una vez por cada frase donde aparezca
      for (const qw of qWords) {
        let wordScore = 0;
        for (const kwWord of allKwWords) {
          if (kwWord === qw) { wordScore = 2; break; }
          if (wordScore < 1 && wordsAreClose(kwWord, qw)) wordScore = 1;
        }
        score += wordScore;
      }

      if (score > bestScore) { bestScore = score; best = entry; }
    }
    // Con una sola palabra significativa en la consulta, un solo acierto (aunque sea difuso) ya es señal suficiente
    const threshold = qWords.length <= 1 ? 1 : 2;
    return bestScore >= threshold ? best : null;
  }

  // ---- Small talk: saludos, cortesías, despedidas ----
  const SMALLTALK = [
    { kw: ['hola', 'buenas', 'hey', 'buen dia'], fn: () => greeting() },
    { kw: ['como estas', 'que tal', 'como andas'], r: 'Aquí, lista para lo que necesites del curso. ¿Y tú, cómo vas con el estudio?' },
    { kw: ['gracias', 'muchas gracias', 'te pasaste'], r: 'De nada — para eso estoy. ¿Alguna otra duda?' },
    { kw: ['chao', 'adios', 'nos vemos', 'hasta luego', 'me voy'], r: '¡Que rinda el estudio! Vuelve cuando quieras, aquí quedo.' },
    { kw: ['quien eres', 'que eres', 'eres un bot'], r: 'Soy el mentor de este curso — respondo dudas de terminología y conceptos de las 16 unidades, disponible a cualquier hora, incluida la madrugada.' },
    { kw: ['no entiendo nada', 'estoy perdida', 'esto es muy dificil'], r: 'Tranquila, vamos por partes. Cuéntame qué unidad estás viendo o qué término específico te está costando, y partimos de ahí.' },
    { kw: ['tengo sueño', 'no puedo mas', 'estoy cansada', 'son las 3'], r: 'Si ya es muy tarde, considera parar aquí y retomar descansada — la memoria consolida mejor con sueño de por medio. Si prefieres seguir un poco más, dime en qué te ayudo.' },
  ];

  function timeGreeting() {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return '¡Buenos días! ¿Partimos con alguna unidad o tienes una duda puntual?';
    if (h >= 12 && h < 19) return '¡Buenas tardes! ¿En qué te ayudo hoy?';
    if (h >= 19 && h < 23) return 'Buenas noches — ¿cómo va el repaso?';
    return 'Veo que estás despierta a esta hora estudiando — respeto total. Dime qué te tiene despierta y vemos si te ayudo a resolverlo rápido para que puedas descansar.';
  }
  function greeting() { return timeGreeting(); }

  function matchSmallTalk(qNorm) {
    for (const st of SMALLTALK) {
      for (const kw of st.kw) {
        if (qNorm.includes(normalize(kw))) return st.fn ? st.fn() : st.r;
      }
    }
    return null;
  }

  // ---- Chips de sugerencia iniciales ----
  const CHIPS = [
    '¿Qué es backward design?',
    'Ayúdame con SCORM',
    'No entiendo carga cognitiva',
    'Diferencia entre ADDIE y SAM',
    '¿Qué es la matriz RACI?',
  ];

  // ---- Construcción del widget ----
  function buildWidget() {
    const wrap = document.createElement('div');
    wrap.id = 'mentorWidget';
    wrap.innerHTML = `
      <button id="mentorToggle" aria-label="Abrir mentor">🖌</button>
      <div id="mentorPanel">
        <div id="mentorHeader">
          <span>Mentor del curso</span>
          <button id="mentorClose" aria-label="Cerrar">✕</button>
        </div>
        <div id="mentorMessages"></div>
        <div id="mentorChips"></div>
        <div id="mentorInputRow">
          <input id="mentorInput" type="text" placeholder="Escribe tu duda…" autocomplete="off">
          <button id="mentorSend">↵</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);

    const style = document.createElement('style');
    style.textContent = `
      #mentorWidget { position: fixed; bottom: 1.2rem; right: 1.2rem; z-index: 9998; font-family: 'IBM Plex Sans', sans-serif; }
      #mentorToggle { width: 54px; height: 54px; border-radius: 50%; background: var(--mc, #A85B32); color: #fff; border: none; font-size: 1.4rem; cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,0.25); }
      #mentorPanel { display: none; position: fixed; bottom: 5.2rem; right: 1.2rem; width: 340px; max-width: calc(100vw - 2.4rem); height: 460px; max-height: calc(100vh - 8rem); background: #F8F6F1; border: 1px solid #D8D1C0; border-radius: 8px; box-shadow: 0 8px 30px rgba(0,0,0,0.2); flex-direction: column; overflow: hidden; }
      #mentorWidget.open #mentorPanel { display: flex; }
      #mentorHeader { background: #1C1A17; color: #EDEAE3; padding: 0.7rem 1rem; display: flex; justify-content: space-between; align-items: center; font-family: 'IBM Plex Mono', monospace; font-size: 0.8rem; }
      #mentorHeader button { background: none; border: none; color: #C9C3B5; cursor: pointer; font-size: 0.9rem; }
      #mentorMessages { flex: 1; overflow-y: auto; padding: 0.9rem; display: flex; flex-direction: column; gap: 0.6rem; }
      .mentor-msg { font-size: 0.86rem; line-height: 1.45; padding: 0.55rem 0.75rem; border-radius: 6px; max-width: 85%; }
      .mentor-msg.bot { background: #E9E0EC; color: #1C1A17; align-self: flex-start; }
      .mentor-msg.user { background: #A85B32; color: #fff; align-self: flex-end; }
      .mentor-msg a { color: #2A5CAA; font-weight: 600; }
      #mentorChips { display: flex; gap: 0.4rem; flex-wrap: wrap; padding: 0 0.9rem 0.6rem; }
      .mentor-chip { font-family: 'IBM Plex Mono', monospace; font-size: 0.68rem; background: #F1E2D6; border: 1px solid #D8D1C0; border-radius: 12px; padding: 0.3rem 0.6rem; cursor: pointer; color: #A85B32; }
      .mentor-chip:hover { background: #E9E0EC; }
      #mentorInputRow { display: flex; border-top: 1px solid #D8D1C0; }
      #mentorInput { flex: 1; border: none; padding: 0.7rem 0.9rem; font-size: 0.85rem; background: #fff; }
      #mentorInput:focus { outline: none; }
      #mentorSend { width: 44px; border: none; background: #A85B32; color: #fff; font-size: 1rem; cursor: pointer; }
      @media (max-width: 480px) { #mentorPanel { width: calc(100vw - 1.5rem); right: 0.75rem; } }
    `;
    document.head.appendChild(style);

    const toggle = document.getElementById('mentorToggle');
    const panel = document.getElementById('mentorPanel');
    const messages = document.getElementById('mentorMessages');
    const input = document.getElementById('mentorInput');
    const chipsEl = document.getElementById('mentorChips');

    let opened = false;
    toggle.addEventListener('click', () => {
      opened = !opened;
      wrap.classList.toggle('open', opened);
      if (opened && messages.children.length === 0) {
        addMsg(greeting(), 'bot');
        renderChips();
        if (window.Gami) Gami.award('mentor_primer_uso', 5, 'Abriste el mentor por primera vez');
      }
    });
    document.getElementById('mentorClose').addEventListener('click', () => { opened = false; wrap.classList.remove('open'); });

    function addMsg(text, who) {
      const div = document.createElement('div');
      div.className = 'mentor-msg ' + who;
      div.innerHTML = text;
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
    }

    function renderChips() {
      chipsEl.innerHTML = CHIPS.map(c => `<span class="mentor-chip">${c}</span>`).join('');
      chipsEl.querySelectorAll('.mentor-chip').forEach(chip => {
        chip.addEventListener('click', () => { handleQuery(chip.textContent); });
      });
    }

    function handleQuery(text) {
      if (!text.trim()) return;
      addMsg(text, 'user');
      input.value = '';
      const qNorm = normalize(text);

      const small = matchSmallTalk(qNorm);
      if (small) { setTimeout(() => addMsg(small, 'bot'), 300); return; }

      const hit = search(text);
      if (hit) {
        setTimeout(() => {
          addMsg(hit.a + `<br><a href="${hit.u}.html">→ Ir a ${hit.ul}</a>`, 'bot');
          if (window.Gami) Gami.award('mentor_resuelto', 1, 'El mentor resolvió tu duda');
        }, 300);
      } else {
        setTimeout(() => addMsg('No tengo una respuesta directa para eso todavía — pero puedes intentar reformularla, o revisar la unidad más cercana al tema desde el índice. Si es una pregunta que se repite, dísela a Joselyn para que la agregue a mi base.', 'bot'), 300);
      }
    }

    document.getElementById('mentorSend').addEventListener('click', () => handleQuery(input.value));
    input.addEventListener('keydown', e => { if (e.key === 'Enter') handleQuery(input.value); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildWidget);
  else buildWidget();
})();
