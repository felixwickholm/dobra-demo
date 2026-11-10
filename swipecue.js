/* swipecue.js (9.11, Rasmus: "make sure all of the demos are mobile-optimized").
   On phones, a wide table scrolls sideways and its last columns sit off-screen with no hint.
   This adds one line above every horizontal scroller that really overflows, in the page language.
   Boards (.brain-pipeline) and nav strips are skipped: the next column already peeks in. */
(() => {
  const SEL = '.wf-table-wrap, .demo-gantt-wrap, .scroll';
  const lang = (document.documentElement.lang || 'fi').slice(0, 2);
  const TXT = { fi: 'Vieritä sivulle nähdäksesi kaikki sarakkeet →', sv: 'Svep i sidled för att se alla kolumner →', en: 'Swipe sideways to see every column →' }[lang] || 'Swipe sideways to see every column →';
  const css = document.createElement('style');
  css.textContent = '.sc-swipe{display:none;margin:10px 16px 6px;font-size:13px;line-height:1.4;color:var(--wf-text-secondary,#5f6368)}@media (max-width:640px){.sc-swipe{display:block}}';
  document.head.appendChild(css);
  const hasCue = (el) => { const p = el.previousElementSibling; return p && /(sc-swipe|demo-scrollcue|eng-swipe)/.test(p.className || ''); };
  const scan = () => {
    if (window.innerWidth > 640) return;
    document.querySelectorAll(SEL).forEach((el) => {
      if (hasCue(el) || el.closest('nav, .brain-pipeline')) return;
      if (el.scrollWidth > el.clientWidth + 8) { const p = document.createElement('p'); p.className = 'sc-swipe'; p.setAttribute('aria-hidden', 'true'); p.textContent = TXT; el.before(p); }
    });
  };
  let t; const later = () => { clearTimeout(t); t = setTimeout(scan, 120); };
  new MutationObserver(later).observe(document.documentElement, { childList: true, subtree: true });
  addEventListener('resize', later); addEventListener('hashchange', later); addEventListener('load', later); later();
})();
