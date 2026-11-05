/* Repeat each editable row only far enough to cover the viewport, then loop one full set. */
(() => {
  const section = document.querySelector('.logo-marquee');
  if (!section) return;

  const rows = [...section.querySelectorAll('[data-marquee-row]')].map(windowElement => {
    const track = windowElement.querySelector('.marquee-track');
    const group = windowElement.querySelector('.marquee-group');
    return { windowElement, track, group, seeds: [...group.children].map(item => item.cloneNode(true)), reverse: windowElement.dataset.marqueeRow === 'reverse' };
  });

  function rebuild() {
    section.classList.remove('is-ready');
    for (const row of rows) {
      row.group.replaceChildren(...row.seeds.map(item => item.cloneNode(true)));
      row.track.replaceChildren(row.group);
      // Keep each repeated set wider than the viewport so the seam never exposes empty space.
      for (let repeat = 0; row.group.getBoundingClientRect().width < window.innerWidth * 1.1 && repeat < 12; repeat++) {
        for (const seed of row.seeds) {
          const copy = seed.cloneNode(true);
          copy.setAttribute('aria-hidden', 'true');
          row.group.append(copy);
        }
      }
      const distance = row.group.getBoundingClientRect().width;
      const copy = row.group.cloneNode(true);
      copy.setAttribute('aria-hidden', 'true');
      row.track.append(copy);
      row.track.style.setProperty('--marquee-distance', `-${distance}px`);
      row.track.style.setProperty('--marquee-duration', `${Math.round(distance / (row.reverse ? 54 : 48))}s`);
    }
    section.classList.add('is-ready');
    updateVisibility();
  }

  let resizeFrame = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(rebuild);
  }, { passive: true });
  if (document.fonts?.ready) document.fonts.ready.then(rebuild);
  rebuild();

  function updateVisibility() {
    const positions = rows.map(row => ({ row, bounds: row.windowElement.getBoundingClientRect() }));
    positions.forEach(({ row, bounds }) => {
      const inView = !document.hidden && bounds.bottom > 0 && bounds.top < innerHeight;
      row.windowElement.classList.toggle('is-in-view', inView);
    });
  }
  let visibilityFrame = 0;
  function scheduleVisibility() {
    if (!visibilityFrame) visibilityFrame = requestAnimationFrame(() => { visibilityFrame = 0; updateVisibility(); });
  }
  window.addEventListener('scroll', scheduleVisibility, { passive: true });
  window.addEventListener('resize', scheduleVisibility, { passive: true });
  document.addEventListener('load', scheduleVisibility, true);
  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(visibilityFrame); visibilityFrame = 0;
    updateVisibility();
  });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(scheduleVisibility, { threshold: 0 });
    rows.forEach(row => observer.observe(row.windowElement));
  }
  updateVisibility();

})();
