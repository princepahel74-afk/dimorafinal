/* DIMORA marketing site — scroll reveal, navbar, mobile nav, before/after slider, particles */
(function () {
  'use strict';
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Navbar: transparent → glass after 80px */
  const nav = $('#nav');
  const onScroll = () => { if (nav) nav.classList.toggle('scrolled', window.scrollY > 80); };
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* Mobile nav */
  const burger = $('#burger'), mnav = $('#mnav');
  const setMenu = open => { if (!burger) return; burger.setAttribute('aria-expanded', open); burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); mnav.classList.toggle('open', open); mnav.setAttribute('aria-hidden', !open); document.body.style.overflow = open ? 'hidden' : ''; };
  if (burger) { burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true')); mnav.addEventListener('click', e => { if (e.target.closest('a,button')) setMenu(false); }); window.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); }); }

  /* In-page anchors (offset for the fixed nav) */
  document.addEventListener('click', e => {
    const a = e.target.closest('#landing a[href^="#"]'); if (!a) return;
    const id = a.getAttribute('href').slice(1); if (!id) { e.preventDefault(); return; }
    const t = document.getElementById(id); if (!t) return; e.preventDefault();
    window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - (id === 'top' ? 200 : 72), behavior: reduce ? 'auto' : 'smooth' });
  });

  /* Scroll reveal with stagger */
  const groups = ['.bento-grid', '.steps3'];
  groups.forEach(g => $$(g + ' > .reveal').forEach((el, i) => el.style.setProperty('--rd', (i * 80) + 'ms')));
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    $$('.reveal').forEach(el => io.observe(el));
  } else $$('.reveal').forEach(el => el.classList.add('in'));

  /* Before / After slider */
  const ba = $('#ba'), handle = $('#ba-handle');
  if (ba && handle) {
    let dragging = false;
    const set = p => { p = Math.max(2, Math.min(98, p)); ba.style.setProperty('--pos', p + '%'); handle.setAttribute('aria-valuenow', Math.round(p)); };
    const fromEvent = e => { const r = ba.getBoundingClientRect(); set((e.clientX - r.left) / r.width * 100); };
    ba.addEventListener('pointerdown', e => { dragging = true; ba.setPointerCapture(e.pointerId); fromEvent(e); });
    ba.addEventListener('pointermove', e => { if (dragging) fromEvent(e); });
    ['pointerup', 'pointercancel'].forEach(t => ba.addEventListener(t, () => dragging = false));
    handle.addEventListener('keydown', e => { const v = +handle.getAttribute('aria-valuenow'); if (e.key === 'ArrowLeft') { set(v - 4); e.preventDefault(); } if (e.key === 'ArrowRight') { set(v + 4); e.preventDefault(); } if (e.key === 'Home') set(2); if (e.key === 'End') set(98); });
    set(50);
  }

  /* Floating particles in the final CTA */
  const box = $('#particles');
  if (box) {
    const cols = ['#7c3aed', '#06b6d4', '#ec4899', '#6366f1', '#10b981', '#f59e0b'];
    for (let i = 0; i < 12; i++) {
      const p = document.createElement('i'); p.className = 'particle'; const sz = 2 + Math.random() * 2;
      p.style.cssText = `left:${6 + Math.random() * 88}%;top:${10 + Math.random() * 80}%;width:${sz}px;height:${sz}px;background:${cols[i % cols.length]};box-shadow:0 0 8px ${cols[i % cols.length]};--o:${(0.3 + Math.random() * 0.2).toFixed(2)};--d:${(6 + Math.random() * 9).toFixed(1)}s;--dl:${(-Math.random() * 8).toFixed(1)}s;--y:${(-20 - Math.random() * 40).toFixed(0)}px`;
      box.appendChild(p);
    }
  }
})();
