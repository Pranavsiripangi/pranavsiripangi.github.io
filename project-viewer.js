/* Native, image-first project viewer. Content comes from window.portfolioProjects. */
(() => {
  const dialog = document.getElementById('caseDialog');
  const source = window.portfolioProjects;
  if (!dialog || !Array.isArray(source) || !source.length) return;

  const cards = [...document.querySelectorAll('.project-card[data-project]')];
  const projects = source.map(project => {
    const image = cards.find(card => card.dataset.project === project.id)?.querySelector('img');
    return { ...project, image: image?.getAttribute('src') || '', alt: image?.alt || `${project.name} preview` };
  });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const ease = 'cubic-bezier(.22,1,.36,1)';
  const canAnimate = () => !reduced.matches && typeof dialog.animate === 'function';

  // This template contains structure only. Editable content is assigned as text.
  dialog.classList.add('project-viewer');
  dialog.setAttribute('aria-labelledby', 'caseTitle');
  dialog.innerHTML = `
    <div class="dialog-inner project-viewer__shell">
      <header class="project-viewer__header">
        <span class="project-viewer__eyebrow">Selected work</span>
        <span class="project-viewer__count" aria-hidden="true"></span>
        <button class="project-viewer__close" id="dialogClose" type="button" aria-label="Close project details">×</button>
      </header>
      <div class="project-viewer__body">
        <div class="project-viewer__visual">
          <div class="project-viewer__experiment" hidden><span>Explore the interaction</span><button type="button" aria-controls="pulseDemo" aria-pressed="false">Try the dashboard</button></div>
          <figure class="project-viewer__media">
            <div class="project-viewer__image-slot"></div>
            <span class="project-viewer__image-error" hidden>Preview unavailable</span>
          </figure>
          <div class="pulse-demo" id="pulseDemo" hidden></div>
          <div class="project-viewer__filmstrip" role="group" aria-label="Choose a project"></div>
        </div>
        <div class="project-viewer__copy">
          <div class="project-viewer__intro">
            <span class="project-viewer__eyebrow" id="caseLabel"></span>
            <h2 id="caseTitle"></h2>
          </div>
          <div class="project-viewer__facts">
            <p id="caseDescription"></p>
            <ul id="caseDetails"></ul>
            <a class="project-viewer__case-link" id="caseStudyLink" href="#">Read the case study <span aria-hidden="true">↗</span></a>
          </div>
        </div>
      </div>
      <footer class="project-viewer__footer">
        <button class="project-viewer__previous" type="button" aria-label="Previous project"><span aria-hidden="true">←</span><span class="project-viewer__nav-label">Previous</span></button>
        <button id="dialogDone" type="button" aria-label="Close project details and return to portfolio"><span class="project-viewer__full-label" aria-hidden="true">Back to portfolio</span><span class="project-viewer__compact-label" aria-hidden="true">Close</span></button>
        <button class="project-viewer__next" type="button" aria-label="Next project"><span class="project-viewer__nav-label">Next</span><span aria-hidden="true">→</span></button>
      </footer>
      <p class="project-viewer__status" role="status" aria-live="polite" aria-atomic="true"></p>
    </div>`;

  const media = document.createElement('img');
  media.className = 'project-viewer__image';
  media.decoding = 'async';
  media.src = projects[0].image;
  media.alt = projects[0].alt;
  dialog.querySelector('.project-viewer__image-slot').replaceWith(media);
  const imageError = dialog.querySelector('.project-viewer__image-error');
  const title = dialog.querySelector('#caseTitle');
  const label = dialog.querySelector('#caseLabel');
  const description = dialog.querySelector('#caseDescription');
  const details = dialog.querySelector('#caseDetails');
  const caseStudyLink = dialog.querySelector('#caseStudyLink');
  const counter = dialog.querySelector('.project-viewer__count');
  const status = dialog.querySelector('.project-viewer__status');
  const filmstrip = dialog.querySelector('.project-viewer__filmstrip');
  const body = dialog.querySelector('.project-viewer__body');
  const copy = dialog.querySelector('.project-viewer__copy');
  const closeButton = dialog.querySelector('#dialogClose');
  const demoHost = dialog.querySelector('#pulseDemo');
  const experiment = dialog.querySelector('.project-viewer__experiment');
  const demoButton = experiment.querySelector('button');
  const preview = dialog.querySelector('.project-viewer__media');
  const demo = window.PulseDemo?.mount(demoHost);
  demoButton.addEventListener('click', () => {
    const active = demoButton.getAttribute('aria-pressed') !== 'true';
    demoButton.setAttribute('aria-pressed', String(active));
    demoButton.textContent = active ? 'Back to artwork' : 'Try the dashboard';
    demoHost.hidden = !active;
    preview.hidden = active;
    filmstrip.hidden = active;
  });
  const filmButtons = projects.map((project, index) => {
    const button = document.createElement('button');
    button.className = 'project-viewer__film';
    button.type = 'button';
    button.setAttribute('aria-label', `View ${project.name}`);
    button.dataset.index = String(index);
    const thumbnail = document.createElement('img');
    thumbnail.src = project.image;
    thumbnail.alt = '';
    thumbnail.loading = 'lazy';
    thumbnail.decoding = 'async';
    const label = document.createElement('span');
    label.textContent = project.name;
    button.append(thumbnail, label);
    filmstrip.append(button);
    return button;
  });
  const cache = new Map();
  let current = 0, ticket = 0, opener = null, lock = null, closing = false;
  let motion = [], shellMotion = null, closeMotion = null, backdropStart = false;

  function cancelMotion() {
    motion.forEach(animation => animation.cancel());
    motion = [];
  }

  function preload(src) {
    if (!src) return Promise.resolve(false);
    if (!cache.has(src)) {
      const image = new Image();
      const loaded = new Promise(resolve => {
        image.onload = () => resolve(true);
        image.onerror = () => resolve(false);
        image.src = src;
        if (image.complete) resolve(image.naturalWidth > 0);
      });
      cache.set(src, loaded.then(async okay => {
        if (okay && image.decode) { try { await image.decode(); } catch (_) { /* Loaded image can still be used. */ } }
        return okay;
      }));
    }
    return cache.get(src);
  }

  function lockPage() {
    if (lock) return;
    const documentStyle = document.documentElement.style;
    const bodyStyle = document.body.style;
    const properties = ['position', 'top', 'left', 'width', 'overflow', 'paddingRight'];
    lock = {
      x: scrollX, y: scrollY,
      body: Object.fromEntries(properties.map(property => [property, bodyStyle[property]])),
      overflow: documentStyle.overflow,
      scrollBehavior: documentStyle.scrollBehavior
    };
    const gutter = Math.max(0, innerWidth - document.documentElement.clientWidth);
    const padding = parseFloat(getComputedStyle(document.body).paddingRight) || 0;
    bodyStyle.position = 'fixed';
    bodyStyle.top = `${-lock.y}px`;
    bodyStyle.left = `${-lock.x}px`;
    bodyStyle.width = '100%';
    bodyStyle.overflow = 'hidden';
    bodyStyle.paddingRight = `${padding + gutter}px`;
    documentStyle.overflow = 'hidden';
  }

  function unlockPage() {
    if (!lock) return;
    const saved = lock;
    lock = null;
    Object.entries(saved.body).forEach(([property, value]) => { document.body.style[property] = value; });
    document.documentElement.style.overflow = saved.overflow;
    document.documentElement.style.scrollBehavior = 'auto';
    scrollTo(saved.x, saved.y);
    document.documentElement.style.scrollBehavior = saved.scrollBehavior;
  }

  function setContent(index, okay = true) {
    const project = projects[index];
    // Every project begins with its original artwork. The demo is opt-in.
    // The interactive dashboard is opt-in per project (`demo: 'pulse'` in projects.js),
    // so a real project never inherits the sample demo by reusing an id.
    experiment.hidden = project.demo !== 'pulse' || !demo;
    demoHost.hidden = true;
    preview.hidden = false;
    filmstrip.hidden = false;
    demoButton.setAttribute('aria-pressed', 'false');
    demoButton.textContent = 'Try the dashboard';
    demo?.reset();
    media.src = project.image;
    media.alt = project.alt;
    imageError.hidden = okay;
    media.classList.toggle('is-unavailable', !okay);
    title.textContent = project.name;
    // Each project states its own status (concept, prototype…) in projects.js.
    label.textContent = project.label || 'Selected project';
    description.textContent = project.description || '';
    details.replaceChildren(...(project.details || []).map(detail => {
      const item = document.createElement('li');
      const separator = detail.indexOf(':');
      if (separator < 0) item.textContent = detail;
      else {
        const label = document.createElement('span');
        label.className = 'project-viewer__detail-label';
        label.textContent = `${detail.slice(0, separator + 1)} `;
        const value = document.createElement('span');
        value.textContent = detail.slice(separator + 1).trim();
        item.append(label, value);
      }
      return item;
    }));
    caseStudyLink.hidden = !project.caseUrl;
    if (project.caseUrl) caseStudyLink.href = project.caseUrl;
    counter.textContent = `${String(index + 1).padStart(2, '0')} / ${String(projects.length).padStart(2, '0')}`;
    filmButtons.forEach((button, position) => button.setAttribute('aria-pressed', String(position === index)));
    status.textContent = `${project.name}, project ${index + 1} of ${projects.length}`;
  }

  function animateCopy(entrance = false) {
    if (!canAnimate()) return;
    for (const [position, element] of [dialog.querySelector('.project-viewer__intro'), dialog.querySelector('.project-viewer__facts')].entries()) {
      motion.push(element.animate([
        { opacity: .45, transform: 'translateY(10px)' },
        { opacity: 1, transform: 'none' }
      ], { duration: entrance ? 440 : 310, delay: entrance ? 130 + position * 70 : position * 45, easing: ease }));
    }
  }

  function animateImage(entrance, direction) {
    if (!canAnimate()) return;
    const first = entrance
      ? { opacity: .2, clipPath: 'inset(7% 0 9% 0)', transform: 'translateY(16px) scale(1.025)' }
      : { opacity: 0, clipPath: 'inset(0)', transform: `translateX(${direction * 14}px)` };
    motion.push(media.animate([first, { opacity: 1, clipPath: 'inset(0)', transform: 'none' }], {
      duration: entrance ? 500 : 250, easing: ease
    }));
  }

  async function changeProject(index, direction = 1) {
    if (!dialog.open || closing) return;
    current = (index + projects.length) % projects.length;
    const selected = current, request = ++ticket;
    cancelMotion();
    // Keep the current image present while the requested asset is decoded.
    const okay = await preload(projects[selected].image);
    if (request !== ticket || closing || !dialog.open) return;
    if (canAnimate()) {
      const fade = media.animate([
        { opacity: 1, transform: 'none' },
        { opacity: 0, transform: `translateX(${-direction * 10}px)` }
      ], { duration: 100, easing: 'ease-out', fill: 'forwards' });
      motion.push(fade);
      try { await fade.finished; } catch (_) { return; }
    }
    if (request !== ticket || closing || !dialog.open) return;
    cancelMotion();
    setContent(selected, okay);
    body.scrollTop = 0;
    copy.scrollTop = 0;
    animateImage(false, direction);
    animateCopy();
    preload(projects[(selected + 1) % projects.length].image);
  }

  function finishClose() {
    closeMotion?.cancel(); closeMotion = null;
    if (dialog.open) dialog.close();
  }

  function requestClose() {
    if (!dialog.open || closing) return;
    closing = true;
    ticket++;
    cancelMotion();
    shellMotion?.cancel(); shellMotion = null;
    dialog.classList.add('is-closing');
    if (!canAnimate()) { finishClose(); return; }
    closeMotion = dialog.animate([
      { opacity: 1, transform: 'none' },
      { opacity: 0, transform: 'translateY(10px) scale(.99)' }
    ], { duration: 180, easing: 'ease-in', fill: 'forwards' });
    closeMotion.finished.then(finishClose).catch(() => {});
  }

  async function openProject(index, trigger) {
    if (closing) return;
    if (dialog.open) { changeProject(index); return; }
    current = index;
    opener = trigger;
    const request = ++ticket;
    setContent(index);
    body.scrollTop = 0;
    copy.scrollTop = 0;
    lockPage();
    try { dialog.showModal(); }
    catch (_) { unlockPage(); return; }
    closeButton.focus({ preventScroll: true });
    if (canAnimate()) {
      shellMotion = dialog.animate([
        { opacity: 0, transform: 'translateY(30px) scale(.967)', offset: 0 },
        { opacity: 1, transform: 'translateY(-5px) scale(1.008)', offset: .72 },
        { opacity: 1, transform: 'none', offset: 1 }
      ], { duration: 560, easing: ease });
      animateCopy(true);
    }
    const okay = await preload(projects[index].image);
    if (request !== ticket || closing || !dialog.open) return;
    imageError.hidden = okay;
    media.classList.toggle('is-unavailable', !okay);
    animateImage(true, 1);
    preload(projects[(index + 1) % projects.length].image);
    preload(projects[(index + projects.length - 1) % projects.length].image);
  }

  // A trigger whose id is not in projects.js would otherwise do nothing, silently.
  document.querySelectorAll('[data-open]').forEach(trigger => {
    if (!projects.some(project => project.id === trigger.dataset.open)) {
      console.warn(`[project-viewer] data-open="${trigger.dataset.open}" does not match any project id in projects.js`, trigger);
    }
  });

  document.addEventListener('click', event => {
    const trigger = event.target instanceof Element ? event.target.closest('[data-open]') : null;
    if (!trigger) return;
    const index = projects.findIndex(project => project.id === trigger.dataset.open);
    if (index < 0) return;
    event.preventDefault();
    openProject(index, trigger);
  });
  closeButton.addEventListener('click', requestClose);
  dialog.querySelector('#dialogDone').addEventListener('click', requestClose);
  dialog.querySelector('.project-viewer__previous').addEventListener('click', () => changeProject(current - 1, -1));
  dialog.querySelector('.project-viewer__next').addEventListener('click', () => changeProject(current + 1, 1));
  filmstrip.addEventListener('click', event => {
    const button = event.target instanceof Element ? event.target.closest('.project-viewer__film') : null;
    if (!button || !filmstrip.contains(button)) return;
    const index = Number(button.dataset.index);
    if (!Number.isInteger(index) || index === current) return;
    changeProject(index, index > current ? 1 : -1);
  });
  dialog.addEventListener('cancel', event => { event.preventDefault(); requestClose(); });
  dialog.addEventListener('keydown', event => {
    if (!dialog.open || closing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.target instanceof Element && event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const direction = event.key === 'ArrowLeft' ? -1 : 1;
      changeProject(current + direction, direction);
    }
  });
  function outsideDialog(event) {
    if (event.target !== dialog) return false;
    const bounds = dialog.getBoundingClientRect();
    return event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
  }
  dialog.addEventListener('pointerdown', event => { backdropStart = outsideDialog(event); });
  dialog.addEventListener('pointercancel', () => { backdropStart = false; });
  dialog.addEventListener('click', event => {
    if (backdropStart && outsideDialog(event)) requestClose();
    backdropStart = false;
  });
  dialog.addEventListener('close', () => {
    ticket++;
    cancelMotion();
    shellMotion?.cancel(); shellMotion = null;
    closeMotion?.cancel(); closeMotion = null;
    closing = false;
    backdropStart = false;
    dialog.classList.remove('is-closing');
    unlockPage();
    if (opener?.isConnected) opener.focus({ preventScroll: true });
    opener = null;
  });
  reduced.addEventListener('change', () => {
    if (!reduced.matches) return;
    cancelMotion();
    shellMotion?.cancel(); shellMotion = null;
    if (closing) finishClose();
    else if (dialog.open) changeProject(current);
  });
})();
