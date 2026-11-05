/* Contact page interactions. The map geometry is static; only two city points are selectable. */
(() => {
  const config = window.portfolioConfig;
  document.querySelectorAll('[data-brand]').forEach(element => { element.textContent = config.brand; });
  document.title = `Contact — ${config.name}`;
  document.getElementById('year').textContent = new Date().getFullYear();

  // Profile links from config.js; an empty URL (e.g. GitHub) is not shown.
  const profileLinks = config.links || {};
  const profileLabels = { linkedin: 'LinkedIn', github: 'GitHub', instagram: 'Instagram', tiktok: 'TikTok' };
  document.querySelectorAll('[data-profile-links]').forEach(list => {
    list.replaceChildren(...Object.entries(profileLabels).filter(([key]) => profileLinks[key]).map(([key, label]) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = profileLinks[key]; link.rel = 'me noopener'; link.textContent = `${label} ↗`;
      item.append(link);
      return item;
    }));
  });

  const menuToggle = document.getElementById('menuToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  function closeMenu(returnFocus = false) {
    mobileMenu.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
    if (returnFocus) menuToggle.focus();
  }
  menuToggle.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(open));
  });
  mobileMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => closeMenu()));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && mobileMenu.classList.contains('open')) closeMenu(true);
  });
  document.addEventListener('pointerdown', event => {
    if (!mobileMenu.contains(event.target) && !menuToggle.contains(event.target)) closeMenu();
  });
  matchMedia('(min-width:701px)').addEventListener('change', event => {
    if (event.matches) closeMenu();
  });

  const header = document.querySelector('.site-header');
  const updateHeader = () => header.classList.toggle('is-scrolled', scrollY > 24);
  addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();

  const cities = {
    jakarta: {
      number: '01', name: 'Jakarta', coordinates: '6.2146° S / 106.8451° E',
      description: 'Telkomsel internship, July to September 2025: market and demand analysis for the fixed-broadband business.'
    },
    bandung: {
      number: '02', name: 'Bandung', coordinates: '6.9222° S / 107.6069° E',
      description: 'Home base: Telkom University, three semesters as a teaching assistant, and my own projects.'
    }
  };
  const controls = [...document.querySelectorAll('[data-city]')];
  const number = document.getElementById('cityNumber');
  const name = document.getElementById('cityName');
  const description = document.getElementById('cityDescription');
  const coordinates = document.getElementById('cityCoordinates');
  const javaMap = document.querySelector('.java-map');
  const atlas = document.querySelector('.atlas-panel');
  const overview = document.getElementById('indonesiaMap');
  const detail = document.getElementById('javaMapCard');
  const viewControls = [...atlas.querySelectorAll('button[data-map-view]')];
  const regionTrigger = document.getElementById('regionTrigger');
  const caption = document.getElementById('atlasCaption');
  const hitmap = document.getElementById('islandHitmap');
  const islandNames = { sumatra:'Sumatra', java:'Java', kalimantan:'Kalimantan', sulawesi:'Sulawesi', papua:'Papua' };
  const islandDescriptions = {
    sumatra: 'The western side of the archipelago. Select another island to follow the map east.',
    java: 'Jakarta and Bandung sit on the western end of Java. Open City view to see both pins.',
    kalimantan: 'This central island group comes forward when selected. The city pair stays on Java.',
    sulawesi: 'A closer look at the island group east of Kalimantan. Continue across to Papua.',
    papua: 'The eastern edge of this archipelago view. Select Java to return toward the city pair.'
  };
  const islandGroups = [];
  const islandChoices = [...document.querySelectorAll('[data-island-choice]')];
  const locationKind = document.getElementById('locationKind');
  let activeIsland = null;
  let activeCity = 'jakarta';
  let activeView = 'detail';
  function renderLocation() {
    if (activeView === 'overview') {
      const island = activeIsland || 'java';
      locationKind.textContent = 'ISLAND GROUP';
      number.textContent = '';
      name.textContent = islandNames[island];
      coordinates.textContent = 'INDONESIA / ARCHIPELAGO';
      description.textContent = islandDescriptions[island];
      return;
    }
    const city = cities[activeCity];
    locationKind.textContent = 'CITY';
    number.textContent = `/ ${city.number}`;
    name.textContent = city.name;
    description.textContent = city.description;
    coordinates.textContent = city.coordinates;
  }
  function updateCaption() {
    if (activeView === 'detail') caption.textContent = `${cities[activeCity].name} selected · Choose the other pin to compare.`;
    else if (activeIsland) caption.textContent = `${islandNames[activeIsland]} selected · choose another island.`;
    else caption.textContent = 'Choose an island to bring it forward.';
  }
  function previewIsland(island) {
    caption.textContent = `${islandNames[island]} · Click or press Enter to select.`;
  }
  function selectIsland(island) {
    if (!islandNames[island]) return;
    activeIsland = island;
    islandGroups.forEach(group => {
      const selected = group.dataset.island === island;
      group.classList.toggle('is-selected', selected);
      group.setAttribute('aria-pressed', String(selected));
    });
    islandChoices.forEach(choice => choice.setAttribute('aria-pressed', String(choice.dataset.islandChoice === island)));
    renderLocation();
    updateCaption();
  }
  islandChoices.forEach(choice => choice.addEventListener('click', () => selectIsland(choice.dataset.islandChoice)));
  if (window.atlasIslandPaths && hitmap) {
    Object.entries(islandNames).forEach(([island, label]) => {
      if (!window.atlasIslandPaths[island]) return;
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.setAttribute('class', 'atlas-island');
      group.setAttribute('role', 'button');
      group.setAttribute('tabindex', '0');
      group.setAttribute('aria-label', `Explore ${label}`);
      group.setAttribute('aria-pressed', 'false');
      group.setAttribute('aria-controls', 'atlasCaption');
      group.dataset.island = island;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('class', 'atlas-island-hit');
      path.setAttribute('d', window.atlasIslandPaths[island]);
      group.append(path);
      hitmap.append(group);
      group.addEventListener('pointerenter', () => previewIsland(island));
      group.addEventListener('pointerleave', updateCaption);
      group.addEventListener('focus', () => previewIsland(island));
      group.addEventListener('blur', updateCaption);
      group.addEventListener('click', () => selectIsland(island));
      group.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          group.click();
          return;
        }
        const index = islandGroups.indexOf(group);
        const next = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? index + 1
          : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? index - 1
          : event.key === 'Home' ? 0 : event.key === 'End' ? islandGroups.length - 1 : -1;
        if (next < 0) return;
        event.preventDefault();
        islandGroups[(next + islandGroups.length) % islandGroups.length].focus();
      });
      islandGroups.push(group);
    });
    atlas.classList.add('islands-ready');
  }
  function setView(view) {
    if (view !== 'overview' && view !== 'detail') return;
    activeView = view;
    atlas.dataset.mapView = view;
    atlas.classList.add('atlas-ready');
    overview.inert = view !== 'overview';
    detail.inert = view !== 'detail';
    overview.setAttribute('aria-hidden', String(view !== 'overview'));
    detail.setAttribute('aria-hidden', String(view !== 'detail'));
    regionTrigger.setAttribute('aria-expanded', String(view === 'detail'));
    viewControls.forEach(control => control.setAttribute('aria-pressed', String(control.dataset.mapView === view)));
    document.getElementById('atlasScale').textContent = view === 'overview' ? 'INDONESIA' : 'JAKARTA · BANDUNG';
    if (view === 'detail') selectIsland('java');
    renderLocation();
    updateCaption();
  }
  function activate(city) {
    const selected = cities[city];
    if (!selected) return;
    const changed = activeCity !== city;
    activeCity = city;
    controls.forEach(control => {
      const active = control.dataset.city === city;
      control.classList.toggle('is-active', active);
      control.setAttribute('aria-pressed', String(active));
    });
    renderLocation();
    javaMap.dataset.activeCity = city;
    updateCaption();
    if (changed && !matchMedia('(prefers-reduced-motion: reduce)').matches && typeof name.animate === 'function') {
      name.getAnimations().forEach(animation => animation.cancel());
      name.animate([{ opacity: .5, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.22,1,.36,1)' });
    }
  }
  controls.forEach(control => {
    control.addEventListener('pointerenter', () => activate(control.dataset.city));
    control.addEventListener('focus', () => activate(control.dataset.city));
    control.addEventListener('click', () => { activate(control.dataset.city); setView('detail'); });
  });
  activate('jakarta');
  setView('detail');
  viewControls.forEach(control => control.addEventListener('click', () => setView(control.dataset.mapView)));
  const choices = [...document.querySelectorAll('.city-choice')];
  choices.forEach((control, index) => control.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % choices.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + choices.length) % choices.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = choices.length - 1;
    else return;
    event.preventDefault();
    setView('detail');
    choices[next].focus();
  }));
  atlas.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || activeView !== 'detail') return;
    event.preventDefault();
    setView('overview');
    viewControls.find(control => control.dataset.mapView === 'overview').focus();
  });

  const mapStage = document.querySelector('.map-stage');
  const mapSurface = mapStage.querySelector('.map-surface');
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let motionFrame = 0;
    mapStage.addEventListener('pointermove', event => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (motionFrame) cancelAnimationFrame(motionFrame);
      motionFrame = requestAnimationFrame(() => {
        const bounds = mapStage.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        const x = ((event.clientX - bounds.left) / bounds.width - .5) * 6;
        const y = ((event.clientY - bounds.top) / bounds.height - .5) * 4;
        mapSurface.style.setProperty('--map-shift-x', `${x.toFixed(2)}px`);
        mapSurface.style.setProperty('--map-shift-y', `${y.toFixed(2)}px`);
        motionFrame = 0;
      });
    });
    mapStage.addEventListener('pointerleave', () => {
      if (motionFrame) cancelAnimationFrame(motionFrame);
      motionFrame = 0;
      mapSurface.style.removeProperty('--map-shift-x');
      mapSurface.style.removeProperty('--map-shift-y');
    });
  }
  regionTrigger.addEventListener('click', () => {
    selectIsland('java');
    setView('detail');
    document.querySelector(`.city-pin[data-city="${activeCity}"]`).focus({ preventScroll: true });
  });
})();
