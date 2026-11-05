/* A short, scroll-driven offset adds depth without moving the page content. */
(() => {
  const page = document.body;
  if (!page) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 700px)');
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const position = { far: 0, near: 0 };
  const velocity = { far: 0, near: 0 };
  const readingSections = [...document.querySelectorAll('.about, .process, .faq, .brief-section')];
  let quietTarget = 1, quiet = 1;
  let frame = 0, previousTime = 0, previousScroll = window.scrollY || 0;
  function readingFocus() {
    const line = innerHeight * .52;
    let strength = 0;
    for (const section of readingSections) {
      const bounds = section.getBoundingClientRect();
      if (!bounds.height) continue;
      const distance = Math.min(line - bounds.top, bounds.bottom - line);
      strength = Math.max(strength, clamp(distance / (innerHeight * .22), 0, 1));
    }
    quietTarget = 1 - strength * .68;
  }

  function target() {
    const range = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progress = clamp((window.scrollY || 0) / range, 0, 1);
    return { far: progress * (mobile.matches ? 10 : 18), near: -progress * 28 };
  }
  function paint() {
    page.style.setProperty('--water-scroll-far', `${position.far.toFixed(2)}px`);
    page.style.setProperty('--water-scroll-near', `${position.near.toFixed(2)}px`);
    page.style.setProperty('--water-drift-factor', quiet.toFixed(3));
  }
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
  }
  function reset() {
    stop();
    position.far = position.near = velocity.far = velocity.near = 0;
    page.style.removeProperty('--water-scroll-far');
    page.style.removeProperty('--water-scroll-near');
    page.style.removeProperty('--water-drift-factor');
  }
  function settleImmediately() {
    stop();
    const destination = target();
    readingFocus(); quiet = quietTarget;
    position.far = destination.far;
    position.near = destination.near;
    velocity.far = velocity.near = 0;
    paint();
  }
  function tick(time) {
    frame = 0;
    if (reduced.matches || document.hidden) { reset(); return; }
    const dt = previousTime ? clamp((time - previousTime) / 16.67, .5, 2) : 1;
    previousTime = time;
    const destination = target();
    quiet += (quietTarget - quiet) * Math.min(1, .14 * dt);
    let moving = Math.abs(quietTarget - quiet) > .002;
    for (const layer of ['far', 'near']) {
      velocity[layer] = (velocity[layer] + (destination[layer] - position[layer]) * .1 * dt) * Math.pow(.66, dt);
      position[layer] += velocity[layer] * dt;
      if (Math.abs(position[layer] - destination[layer]) > .08 || Math.abs(velocity[layer]) > .08) moving = true;
    }
    if (moving) {
      paint();
      frame = requestAnimationFrame(tick);
    } else {
      position.far = destination.far;
      position.near = destination.near;
      velocity.far = velocity.near = 0;
      quiet = quietTarget;
      previousTime = 0;
      paint();
    }
  }
  const wake = () => { if (!frame && !reduced.matches && !document.hidden) frame = requestAnimationFrame(tick); };

  addEventListener('scroll', () => {
    const now = window.scrollY || 0;
    const distance = now - previousScroll;
    const delta = clamp(distance, -120, 120);
    previousScroll = now;
    readingFocus();
    if (reduced.matches || document.hidden || !delta) return;
    if (Math.abs(distance) > window.innerHeight * 1.5) { settleImmediately(); return; }
    velocity.far = clamp(velocity.far + delta * (mobile.matches ? .018 : .025) * quietTarget, -4, 4);
    velocity.near = clamp(velocity.near - delta * .045 * quietTarget, -8, 8);
    wake();
  }, { passive: true });
  addEventListener('resize', () => { readingFocus(); wake(); }, { passive: true });
  addEventListener('pageshow', () => { previousScroll = window.scrollY || 0; if (reduced.matches) reset(); else settleImmediately(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (!reduced.matches) settleImmediately(); });
  reduced.addEventListener('change', () => { if (reduced.matches) reset(); else settleImmediately(); });
  mobile.addEventListener('change', () => { if (!reduced.matches) wake(); });
  if (!reduced.matches) settleImmediately();
})();
