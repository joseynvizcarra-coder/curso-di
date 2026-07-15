// ============================================
// Mentor DI v2 — Motor + widget UI
// Interfaz inspirada en el mentor anatómico (avatar, estado en línea,
// indicador de escritura, acciones contextuales dentro de cada mensaje)
// aplicada al contenido del curso de Diseño Instruccional.
// Requiere mentor-knowledge.js cargado antes.
// ============================================
(function () {
  'use strict';

  // ============================================
  // MOTOR DE BÚSQUEDA (normalización + tolerancia a tipeo)
  // ============================================
  function normalize(str) {
    return str
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[¿?¡!.,;:()"']/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

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

  function wordsAreClose(a, b) {
    if (a === b) return true;
    if (Math.abs(a.length - b.length) > 3) return false;
    const maxDist = a.length <= 4 ? 1 : a.length <= 8 ? 2 : 3;
    return levenshtein(a, b) <= maxDist;
  }

  const STOPWORDS = new Set(['que','los','las','del','por','sin','con','una','uno','les','sus','este','esta','esto','eso','para','como','desde','entre','muy','mas','pero','todo','todos','toda','todas','tiene','hay','soy','eres','somos','son','estoy','estas','estan','tengo','tienes','sera','fue','ser','hacer','solo']);
  function meaningfulWords(str) {
    return normalize(str).split(' ').filter(w => w.length > 2 && !STOPWORDS.has(w));
  }

  function search(query) {
    const qNorm = normalize(query);
    const qWords = [...new Set(meaningfulWords(query))];
    let best = null, bestScore = 0;

    for (const entry of MENTOR_KB) {
      let score = 0;
      const allKwWords = new Set();
      for (const kw of entry.kw) {
        const kwNorm = normalize(kw);
        if (qNorm.includes(kwNorm)) { score += kwNorm.split(' ').length * 3; continue; }
        meaningfulWords(kw).forEach(w => allKwWords.add(w));
      }
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
    const threshold = qWords.length <= 1 ? 1 : 2;
    return bestScore >= threshold ? best : null;
  }

  function relatedEntries(entry, n) {
    return MENTOR_KB.filter(e => e.u === entry.u && e.id !== entry.id).slice(0, n);
  }
  function labelFor(entry) {
    const kw = entry.kw[0];
    // Acrónimos cortos (sin espacio, <=5 letras) se ven mejor en mayúsculas completas: LMS, SCORM, RACI
    if (!kw.includes(' ') && kw.length <= 6) return kw.toUpperCase();
    // Frases: capitaliza cada palabra significativa
    return kw.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  // ============================================
  // SMALL TALK — conversación casual, con variedad de respuestas
  // ============================================
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  const SMALLTALK = [
    { kw: ['hola', 'buenas', 'hey', 'buen dia', 'holi'], fn: () => ({ text: greeting(), actions: chipsIniciales() }) },
    { kw: ['como estas', 'que tal', 'como andas', 'como te va', 'todo bien'], fn: () => ({ text: pick([
      'Aquí, lista para lo que necesites del curso. ¿Y tú, cómo vas con el estudio?',
      'Bien, gracias por preguntar. ¿Cómo va tu día de estudio?',
      'Todo tranquilo por acá. ¿Tú cómo la llevas hoy?'
    ]), actions: [] }) },
    { kw: ['gracias', 'muchas gracias', 'te pasaste', 'muy amable', 'excelente gracias'], fn: () => ({ text: pick([
      'De nada — para eso estoy. ¿Alguna otra duda?',
      'Un gusto poder ayudar. ¿Seguimos con algo más?',
      'Cuando quieras. ¿Te sirvo con algo más del curso?'
    ]), actions: [] }) },
    { kw: ['chao', 'adios', 'nos vemos', 'hasta luego', 'me voy', 'bye'], fn: () => ({ text: pick([
      '¡Que rinda el estudio! Vuelve cuando quieras, aquí quedo.',
      'Nos vemos — mucho éxito con lo que sigue.',
      'Listo, aquí quedo para la próxima. ¡Suerte!'
    ]), actions: [] }) },
    { kw: ['quien eres', 'que eres', 'eres un bot', 'eres una ia', 'eres real'], fn: () => ({ text: 'Soy el mentor de este curso — respondo dudas de terminología y conceptos de las 18 unidades, disponible a cualquier hora, incluida la madrugada. No soy una IA conversacional completa, funciono con un banco de respuestas y reconocimiento de patrones.', actions: [] }) },
    { kw: ['que haces', 'en que andas', 'todo tranquilo'], fn: () => ({ text: pick([
      'Por acá, esperando dudas de diseño instruccional. ¿Y tú, en qué unidad vas?',
      'Nada nuevo de mi lado — soy bastante predecible. ¿Cómo va tu estudio?'
    ]), actions: [] }) },
    { kw: ['hace frio', 'que frio', 'esta helado'], fn: () => ({ text: pick([
      'Buen clima para quedarse estudiando adentro, entonces. ¿En qué te ayudo?',
      'Justo lo que se necesita para concentrarse sin distraerse afuera. ¿Seguimos?'
    ]), actions: [] }) },
    { kw: ['que calor', 'hace calor', 'esta caluroso'], fn: () => ({ text: 'Con este calor, un descanso corto entre unidades no viene mal. ¿Seguimos cuando quieras.', actions: [] }) },
    { kw: ['esta lloviendo', 'llueve', 'esta nublado'], fn: () => ({ text: 'Buen día para quedarse con el curso abierto entonces. ¿En qué te ayudo?', actions: [] }) },
    { kw: ['que dia es hoy', 'que fecha es'], fn: () => ({ text: 'Hoy es ' + new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + '.', actions: [] }) },
    { kw: ['que hora es'], fn: () => ({ text: 'Son las ' + new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) + '.', actions: [] }) },
    { kw: ['estoy aburrida', 'estoy aburrido', 'que aburrido'], fn: () => ({ text: 'Un buen término de DI puede arreglar eso — pregúntame por algo que no tengas claro y lo vemos.', actions: chipsIniciales() }) },
    { kw: ['cuentame un chiste', 'dime un chiste', 'hazme reir'], fn: () => ({ text: 'No tengo humor propio, pero sí muchas definiciones de DI que a veces son igual de secas que un chiste malo. ¿Probamos con una?', actions: chipsIniciales() }) },
    { kw: ['eres genial', 'me caes bien', 'eres util', 'me ayudaste mucho'], fn: () => ({ text: pick([
      'Gracias, se agradece. Sigamos si tienes más dudas.',
      'Qué bueno que sirvió. Aquí sigo si necesitas algo más.'
    ]), actions: [] }) },
    { kw: ['eres tonto', 'no sirves', 'eres malo', 'no me ayudas'], fn: () => ({ text: 'Puede que no tenga la respuesta que buscas todavía — cuéntame de nuevo qué necesitas y probamos otra forma de encontrarla.', actions: [] }) },
    { kw: ['cuantos años tienes', 'tienes novio', 'tienes novia', 'donde vives'], fn: () => ({ text: 'Esa la voy a dejar pasar — no tengo vida fuera de este curso. ¿En qué te ayudo del contenido?', actions: [] }) },
    { kw: ['cuantas unidades tiene el curso', 'cuantas unidades hay'], fn: () => ({ text: 'El curso tiene 18 unidades en 6 módulos — desde fundamentos de DI hasta educación técnico-profesional e IA aplicada.', actions: [] }) },
    { kw: ['cuanto dura el curso', 'cuanto tiempo toma'], fn: () => ({ text: 'Cada unidad toma entre 40 y 50 minutos aproximadamente, así que el curso completo son unas 14-15 horas de estudio activo, sin contar repasos.', actions: [] }) },
    { kw: ['ok', 'dale', 'listo', 'perfecto', 'genial', 'bacan', 'joya'], fn: () => ({ text: pick(['Dale.', 'Perfecto.', 'Listo, aquí quedo.', '👍']), actions: [] }) },
  ];

  function timeGreeting() {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return '¡Buenos días! ¿Partimos con alguna unidad o tienes una duda puntual?';
    if (h >= 12 && h < 19) return '¡Buenas tardes! ¿En qué te ayudo hoy?';
    if (h >= 19 && h < 23) return 'Buenas noches — ¿cómo va el repaso?';
    return 'Veo que estás despierta a esta hora estudiando — respeto total. Dime qué te tiene despierta y vemos si te ayudo a resolverlo rápido.';
  }
  function greeting() { return timeGreeting(); }
  function chipsIniciales() { return ['¿Qué es backward design?', 'Ayúdame con SCORM', 'No entiendo carga cognitiva', '¿Qué es la matriz RACI?']; }

  function matchSmallTalk(text) {
    const qNorm = normalize(text);
    for (const st of SMALLTALK) {
      for (const kw of st.kw) {
        if (qNorm.includes(normalize(kw))) return st.fn();
      }
    }
    return null;
  }

  // Detección de frustración — para ofrecer un descanso, sin diagnosticar nada, solo un gesto de cuidado
  const FRUSTRACION_KW = ['no entiendo nada', 'estoy perdida', 'esto es muy dificil', 'no puedo mas', 'estoy cansada', 'muy dificil', 'me cuesta mucho', 'no doy mas'];
  let frustracionSeguidas = 0;

  // ============================================
  // WIDGET
  // ============================================
  function buildWidget() {
    const wrap = document.createElement('div');
    wrap.id = 'mentorWidget';
    wrap.innerHTML = `
      <div id="mentorBackdrop"></div>
      <button id="mentorToggle" aria-label="Abrir mentor">
        <span id="mentorToggleIcon">🖌</span>
        <span id="mentorBadge">1</span>
      </button>
      <div id="mentorPanel">
        <div id="mentorHeader">
          <div id="mentorHeaderInfo">
            <div id="mentorAvatar">🖌</div>
            <div id="mentorStatus">
              <div id="mentorName">Mentor DI</div>
              <div id="mentorOnline"><span id="mentorDot"></span>En línea</div>
            </div>
          </div>
          <button id="mentorClose" aria-label="Cerrar">✕</button>
        </div>
        <div id="mentorMessages"></div>
        <div id="mentorTyping"><span></span><span></span><span></span></div>
        <div id="mentorInputRow">
          <textarea id="mentorInput" placeholder="Escribe tu duda…" rows="1"></textarea>
          <button id="mentorSend" aria-label="Enviar">↑</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);

    const style = document.createElement('style');
    style.textContent = `
      #mentorWidget { position: fixed; bottom: 1.2rem; right: 1.2rem; z-index: 9998; font-family: 'IBM Plex Sans', sans-serif; }
      #mentorBackdrop { position: fixed; inset: 0; background: rgba(28,26,23,0.35); backdrop-filter: blur(2px); z-index: 9997; display: none; opacity: 0; transition: opacity 0.25s ease; }
      #mentorBackdrop.show { display: block; opacity: 1; }

      #mentorToggle { position: relative; width: 58px; height: 58px; border-radius: 50%; background: linear-gradient(135deg, #1C1A17, #3A362F); border: 3px solid #F8F6F1; cursor: pointer; box-shadow: 0 6px 20px rgba(0,0,0,0.3); transition: transform 0.2s ease; display: flex; align-items: center; justify-content: center; }
      #mentorToggle:hover { transform: scale(1.08); }
      #mentorToggleIcon { font-size: 1.5rem; }
      #mentorBadge { position: absolute; top: -6px; right: -6px; background: #A83232; color: #fff; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700; border: 2px solid #fff; animation: mentorPulse 2s infinite; font-family: 'IBM Plex Mono', monospace; }
      #mentorBadge.hide { display: none; }
      @keyframes mentorPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.15); } }

      #mentorPanel { position: fixed; bottom: 5.4rem; right: 1.2rem; width: 380px; max-width: calc(100vw - 2.4rem); height: 560px; max-height: calc(100vh - 8rem); background: #fff; border-radius: 16px; box-shadow: 0 12px 40px rgba(0,0,0,0.28); display: none; flex-direction: column; overflow: hidden; z-index: 9999; }
      #mentorPanel.open { display: flex; animation: mentorSlideUp 0.25s ease-out; }
      @keyframes mentorSlideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }

      #mentorHeader { background: linear-gradient(135deg, #1C1A17, #3A362F); color: #EDEAE3; padding: 1rem 1.1rem; display: flex; align-items: center; justify-content: space-between; }
      #mentorHeaderInfo { display: flex; align-items: center; gap: 0.7rem; }
      #mentorAvatar { width: 40px; height: 40px; border-radius: 50%; background: #EDEAE3; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; flex-shrink: 0; }
      #mentorName { font-weight: 600; font-size: 0.95rem; font-family: 'Fraunces', serif; }
      #mentorOnline { font-size: 0.72rem; color: #C9C3B5; display: flex; align-items: center; gap: 0.35rem; margin-top: 0.1rem; }
      #mentorDot { width: 7px; height: 7px; border-radius: 50%; background: #4CAF50; animation: mentorBlink 2s infinite; }
      @keyframes mentorBlink { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
      #mentorClose { background: rgba(255,255,255,0.12); border: none; color: #EDEAE3; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 0.85rem; transition: transform 0.2s ease, background 0.2s ease; }
      #mentorClose:hover { background: rgba(255,255,255,0.22); transform: rotate(90deg); }

      #mentorMessages { flex: 1; overflow-y: auto; padding: 1rem; background: #F2F0EC; display: flex; flex-direction: column; gap: 0.7rem; }
      #mentorMessages::-webkit-scrollbar { width: 6px; }
      #mentorMessages::-webkit-scrollbar-thumb { background: #C9C3B5; border-radius: 3px; }

      .mentor-msg-row { display: flex; animation: mentorFadeIn 0.25s ease-out; }
      @keyframes mentorFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      .mentor-msg-row.user { justify-content: flex-end; }
      .mentor-msg-row.bot { justify-content: flex-start; }
      .mentor-bubble { max-width: 82%; padding: 0.65rem 0.9rem; border-radius: 16px; font-size: 0.86rem; line-height: 1.45; }
      .mentor-msg-row.bot .mentor-bubble { background: #fff; color: #1C1A17; border-bottom-left-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
      .mentor-msg-row.user .mentor-bubble { background: #A85B32; color: #fff; border-bottom-right-radius: 4px; }
      .mentor-bubble a { color: #2A5CAA; font-weight: 600; }
      .mentor-bubble strong { color: #A85B32; }
      .mentor-msg-row.user .mentor-bubble strong { color: #F1E2D6; }

      .mentor-actions { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.6rem; }
      .mentor-action-btn { background: #fff; border: 1.5px solid #A85B32; color: #A85B32; padding: 0.35rem 0.7rem; border-radius: 14px; font-size: 0.76rem; font-family: 'IBM Plex Mono', monospace; cursor: pointer; transition: all 0.15s ease; }
      .mentor-action-btn:hover { background: #A85B32; color: #fff; }
      .mentor-action-btn:disabled { opacity: 0.45; cursor: default; }

      #mentorTyping { display: none; gap: 0.3rem; padding: 0.65rem 0.9rem; background: #fff; border-radius: 16px; border-bottom-left-radius: 4px; width: fit-content; margin: 0 1rem 0.7rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
      #mentorTyping.show { display: flex; }
      #mentorTyping span { width: 7px; height: 7px; border-radius: 50%; background: #B7B0A3; animation: mentorTypingDot 1.3s infinite; }
      #mentorTyping span:nth-child(2) { animation-delay: 0.18s; }
      #mentorTyping span:nth-child(3) { animation-delay: 0.36s; }
      @keyframes mentorTypingDot { 0%,60%,100% { transform: translateY(0); opacity: 0.5; } 30% { transform: translateY(-4px); opacity: 1; } }

      #mentorInputRow { display: flex; gap: 0.6rem; align-items: flex-end; padding: 0.8rem; background: #fff; border-top: 1px solid #E2DCCC; }
      #mentorInput { flex: 1; border: 1.5px solid #D8D1C0; border-radius: 20px; padding: 0.6rem 0.9rem; font-size: 0.85rem; font-family: inherit; resize: none; max-height: 90px; transition: border-color 0.15s ease; }
      #mentorInput:focus { outline: none; border-color: #A85B32; }
      #mentorSend { width: 38px; height: 38px; border-radius: 50%; background: #A85B32; color: #fff; border: none; font-size: 1rem; cursor: pointer; flex-shrink: 0; transition: transform 0.15s ease; }
      #mentorSend:hover { transform: scale(1.08); }

      @media (max-width: 480px) { #mentorPanel { width: calc(100vw - 1.5rem); right: 0.75rem; height: 70vh; } }
    `;
    document.head.appendChild(style);

    const toggle = document.getElementById('mentorToggle');
    const panel = document.getElementById('mentorPanel');
    const backdrop = document.getElementById('mentorBackdrop');
    const badge = document.getElementById('mentorBadge');
    const messages = document.getElementById('mentorMessages');
    const input = document.getElementById('mentorInput');
    const typing = document.getElementById('mentorTyping');

    let opened = false;
    function openPanel() {
      opened = true;
      panel.classList.add('open');
      backdrop.classList.add('show');
      badge.classList.add('hide');
      if (messages.children.length === 0) {
        addBotMessage(greeting(), chipsIniciales());
        if (window.Gami) Gami.award('mentor_primer_uso', 5, 'Abriste el mentor por primera vez');
      }
      input.focus();
    }
    function closePanel() {
      opened = false;
      panel.classList.remove('open');
      backdrop.classList.remove('show');
    }
    toggle.addEventListener('click', () => opened ? closePanel() : openPanel());
    document.getElementById('mentorClose').addEventListener('click', closePanel);
    backdrop.addEventListener('click', closePanel);
    panel.addEventListener('click', e => e.stopPropagation());

    input.addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 90) + 'px';
    });

    function addUserMessage(text) {
      const row = document.createElement('div');
      row.className = 'mentor-msg-row user';
      row.innerHTML = `<div class="mentor-bubble"></div>`;
      row.querySelector('.mentor-bubble').textContent = text;
      messages.appendChild(row);
      scrollDown();
    }

    function addBotMessage(text, actions) {
      const row = document.createElement('div');
      row.className = 'mentor-msg-row bot';
      const bubble = document.createElement('div');
      bubble.className = 'mentor-bubble';
      bubble.innerHTML = text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      row.appendChild(bubble);

      if (actions && actions.length) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'mentor-actions';
        actions.forEach(label => {
          const btn = document.createElement('button');
          btn.className = 'mentor-action-btn';
          btn.textContent = label;
          btn.addEventListener('click', () => {
            btn.disabled = true;
            actionsDiv.querySelectorAll('button').forEach(b => b.disabled = true);
            handleQuery(label);
          });
          actionsDiv.appendChild(btn);
        });
        bubble.appendChild(actionsDiv);
      }
      messages.appendChild(row);
      scrollDown();
    }

    function scrollDown() { setTimeout(() => { messages.scrollTop = messages.scrollHeight; }, 60); }

    function showTyping() { typing.classList.add('show'); scrollDown(); }
    function hideTyping() { typing.classList.remove('show'); }

    function handleQuery(text) {
      if (!text || !text.trim()) return;
      addUserMessage(text);
      input.value = '';
      input.style.height = 'auto';
      showTyping();

      const delay = 700 + Math.random() * 700;
      setTimeout(() => {
        hideTyping();
        const qNorm = normalize(text);

        const small = matchSmallTalk(text);
        if (small) { addBotMessage(small.text, small.actions); frustracionSeguidas = 0; return; }

        const isFrustrado = FRUSTRACION_KW.some(kw => qNorm.includes(normalize(kw)));
        if (isFrustrado) {
          frustracionSeguidas++;
          if (frustracionSeguidas >= 2) {
            addBotMessage('Noto que llevas un rato con esto y se está sintiendo pesado. A veces cortar un momento — estirar, tomar agua — ayuda más que seguir insistiendo de inmediato. ¿Quieres que sigamos igual, o prefieres volver en un rato?', ['Sigamos igual', 'Vuelvo en un rato']);
            frustracionSeguidas = 0;
            return;
          }
          addBotMessage('Vamos por partes. Cuéntame qué unidad estás viendo o qué término específico te está costando, y partimos de ahí.', []);
          return;
        }
        frustracionSeguidas = 0;

        const hit = search(text);
        if (hit) {
          const related = relatedEntries(hit, 2);
          const actions = [`→ Ir a ${hit.ul}`, ...related.map(r => labelFor(r))];
          const answer = hit.a;
          addBotMessage(answer, actions);
          if (window.Gami) Gami.award('mentor_resuelto', 1, 'El mentor resolvió tu duda');
        } else {
          addBotMessage('No tengo una respuesta directa para eso todavía. Puedes reformularla, o si es una pregunta que se repite, cuéntaselo a Joselyn para que la agregue a mi base.', chipsIniciales());
        }
      }, delay);
    }

    // Si la acción clickeada empieza con "→ Ir a", navega a la unidad en vez de generar respuesta
    messages.addEventListener('click', e => {
      const btn = e.target.closest('.mentor-action-btn');
      if (!btn) return;
      const label = btn.textContent;
      if (label.startsWith('→ Ir a')) {
        const hit = MENTOR_KB.find(entry => label.includes(entry.ul));
        if (hit) { window.location.href = hit.u + '.html'; }
      }
    }, true);

    document.getElementById('mentorSend').addEventListener('click', () => handleQuery(input.value));
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleQuery(input.value); }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildWidget);
  else buildWidget();
})();
