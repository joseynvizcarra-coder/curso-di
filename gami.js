// ============================================
// GAMI v2 — Cuaderno de taller DI
// Puntos · niveles (etapas de una pintura) · badges · racha real
// Compartido entre index.html y todas las unidades
// ============================================
(function () {
  'use strict';

  const KEY = 'di_gami_v2';

  // Niveles con nombres de etapas de un óleo — 100 pts por nivel
  const NIVELES = ['Boceto', 'Imprimación', 'Primera capa', 'Empaste', 'Veladura', 'Barniz'];

  const BADGES = {
    primeraCapa: '🖌 Primera capa — completaste tu primera unidad',
    curiosa: '🔍 Curiosa — levantaste todas las capas de una unidad',
    multimodal: '🎧 Multimodal — usaste texto, PDF, audio y video en una unidad',
    racha3: '🔥 Constancia — 3 días seguidos de estudio',
  };

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }

  function data() {
    const d = load();
    if (!d.points) d.points = 0;
    if (!d.badges) d.badges = [];
    if (!d.days) d.days = [];
    if (!d.seen) d.seen = {};
    return d;
  }

  // ---- Racha real: días consecutivos ----
  function registerToday(d) {
    const today = new Date().toISOString().slice(0, 10);
    if (!d.days.includes(today)) { d.days.push(today); d.days.sort(); }
  }
  function streak(d) {
    if (!d.days.length) return 0;
    let count = 0;
    const cursor = new Date();
    for (;;) {
      const iso = cursor.toISOString().slice(0, 10);
      if (d.days.includes(iso)) { count++; cursor.setDate(cursor.getDate() - 1); }
      else if (count === 0 && iso === new Date().toISOString().slice(0, 10)) { cursor.setDate(cursor.getDate() - 1); }
      else break;
    }
    return count;
  }

  function nivel(points) {
    const idx = Math.min(Math.floor(points / 100), NIVELES.length - 1);
    return { n: idx + 1, nombre: NIVELES[idx], progresoPct: Math.min(100, (points % 100)), siguiente: NIVELES[Math.min(idx + 1, NIVELES.length - 1)] };
  }

  // ---- Toast visible (la parte que faltó en el LMS de dibujo) ----
  function toast(html, color) {
    let wrap = document.getElementById('gamiToasts');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'gamiToasts';
      wrap.style.cssText = 'position:fixed;bottom:1.2rem;right:1.2rem;z-index:9999;display:flex;flex-direction:column;gap:0.5rem;max-width:290px;';
      document.body.appendChild(wrap);
    }
    const t = document.createElement('div');
    t.style.cssText = 'background:#1C1A17;color:#EDEAE3;border-left:4px solid ' + (color || '#A85B32') + ';border-radius:4px;padding:0.7rem 1rem;font-family:"IBM Plex Mono",monospace;font-size:0.76rem;box-shadow:0 4px 16px rgba(0,0,0,0.25);opacity:0;transform:translateY(8px);transition:all 0.35s ease;';
    t.innerHTML = html;
    wrap.appendChild(t);
    requestAnimationFrame(() => { t.style.opacity = '1'; t.style.transform = 'translateY(0)'; });
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(8px)'; setTimeout(() => t.remove(), 400); }, 3800);
  }

  // ---- API pública ----
  window.Gami = {
    // Otorga puntos una sola vez por actionId
    award(actionId, pts, label) {
      const d = data();
      if (d.seen[actionId]) return false;
      d.seen[actionId] = true;
      const nivelAntes = nivel(d.points).n;
      d.points += pts;
      registerToday(d);
      save(d);
      toast('<strong>+' + pts + ' pts</strong> · ' + label);
      const nv = nivel(d.points);
      if (nv.n > nivelAntes) toast('⬆ <strong>Nivel ' + nv.n + ': ' + nv.nombre + '</strong>', '#6B4C7A');
      const s = streak(d);
      if (s >= 3) this.badge('racha3');
      this.renderChips();
      return true;
    },

    badge(id) {
      const d = data();
      if (d.badges.includes(id) || !BADGES[id]) return false;
      d.badges.push(id);
      save(d);
      toast('<strong>Insignia:</strong> ' + BADGES[id], '#B9862C');
      this.renderChips();
      return true;
    },

    hasSeen(actionId) { return !!data().seen[actionId]; },

    state() {
      const d = data();
      return { points: d.points, nivel: nivel(d.points), streak: streak(d), badges: d.badges.map(b => BADGES[b]) };
    },

    touchDay() { const d = data(); registerToday(d); save(d); },

    // Rellena elementos con ids gamiPoints / gamiNivel / gamiStreak / gamiBadges si existen en la página
    renderChips() {
      const s = this.state();
      const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      set('gamiPoints', s.points + ' pts');
      set('gamiNivel', 'Nivel ' + s.nivel.n + ' · ' + s.nivel.nombre);
      set('gamiStreak', s.streak + (s.streak === 1 ? ' día' : ' días'));
      const bEl = document.getElementById('gamiBadges');
      if (bEl) bEl.innerHTML = s.badges.length ? s.badges.map(b => '<span style="display:inline-block;background:var(--card,#F8F6F1);border:1px solid var(--border,#D8D1C0);border-radius:3px;padding:0.25rem 0.6rem;margin:0 0.3rem 0.3rem 0;font-size:0.74rem;">' + b + '</span>').join('') : '<span style="color:var(--ink-muted,#6B665D);font-size:0.78rem;">Aún sin insignias — se ganan estudiando.</span>';
    },
  };

  document.addEventListener('DOMContentLoaded', () => { window.Gami.touchDay(); window.Gami.renderChips(); });
})();
