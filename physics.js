/* Tactile spring feedback, pixel current, and three tiny footer residents. */
(() => {
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  function springStep(position, velocity, target, stiffness = .12, damping = .78, dt = 1) {
    const step = clamp(dt, .25, 2);
    const nextVelocity = (velocity + (target - position) * stiffness * step) * Math.pow(damping, step);
    return { position: position + nextVelocity * step, velocity: nextVelocity };
  }
  // A quiet sidewalk layer: no more than two passersby cross at once.
  const backgroundPeople = [
    { start: 0, end: 20000, direction: 1, shirt: '#698b86', face: '#dec9aa', hair: '#536a69', pants: '#657878', shoes: '#48636b', bag: '#a7755f' },
    { start: 14000, end: 35000, direction: -1, shirt: '#8d7e70', face: '#e3cdb0', hair: '#5d6260', pants: '#62747b', shoes: '#48616a', hat: '#a5856e' },
    { start: 30000, end: 48000, direction: 1, shirt: '#738c9d', face: '#dbbd9f', hair: '#586773', pants: '#667178', shoes: '#4b626b', bag: '#a58e70' }
  ];
  function backgroundWalkerPositions(ms, width, unit, still = false) {
    if (still) return backgroundPeople.slice(0, 2).map((person, index) => ({ person, index, x: width * (index ? .68 : .33) }));
    const time = ((ms % 48000) + 48000) % 48000;
    const margin = unit * 10;
    return backgroundPeople.flatMap((person, index) => {
      if (time < person.start || time >= person.end) return [];
      const progress = (time - person.start) / (person.end - person.start);
      const distance = width + margin * 2;
      const x = person.direction > 0 ? -margin + distance * progress : width + margin - distance * progress;
      return [{ person, index, x }];
    });
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { springStep, backgroundWalkerPositions };
  if (typeof document === 'undefined') return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const interactive = [...document.querySelectorAll('.hero-actions .button,.project-open,.service-row,.hero-preview,.contact-email,.back-top')];
  const clearInteractions = [];

  interactive.forEach(element => {
    const entersWithHero = !!element.closest('.hero');
    const values = { x: 0, y: 0, rotation: 0, scale: 1 };
    const velocities = { x: 0, y: 0, rotation: 0, scale: 0 };
    const targets = { x: 0, y: 0, rotation: 0, scale: 1 };
    let frame = 0, previous = 0, pressed = false;
    const neutral = () => targets.x === 0 && targets.y === 0 && targets.rotation === 0 && targets.scale === 1;
    function reset() {
      cancelAnimationFrame(frame); frame = 0; previous = 0; pressed = false;
      Object.assign(values, { x: 0, y: 0, rotation: 0, scale: 1 });
      Object.assign(velocities, { x: 0, y: 0, rotation: 0, scale: 0 });
      Object.assign(targets, { x: 0, y: 0, rotation: 0, scale: 1 });
      element.style.removeProperty('transform'); element.classList.remove('spring-active');
    }
    function tick(time) {
      frame = 0;
      if (reduced.matches || document.hidden) { reset(); return; }
      const dt = previous ? clamp((time - previous) / 16.67, .25, 2) : 1;
      previous = time;
      let moving = false;
      for (const key of ['x', 'y', 'rotation', 'scale']) {
        const next = springStep(values[key], velocities[key], targets[key], key === 'scale' ? .2 : .12, .76, dt);
        values[key] = next.position; velocities[key] = next.velocity;
        if (Math.abs(values[key] - targets[key]) > .015 || Math.abs(velocities[key]) > .012) moving = true;
      }
      element.style.transform = `translate3d(${values.x.toFixed(2)}px,${values.y.toFixed(2)}px,0) rotate(${values.rotation.toFixed(2)}deg) scale(${values.scale.toFixed(4)})`;
      if (moving) frame = requestAnimationFrame(tick);
      else {
        previous = 0; element.classList.remove('spring-active');
        if (neutral()) element.style.removeProperty('transform');
      }
    }
    function wake() {
      if (reduced.matches || document.hidden || (entersWithHero && document.documentElement.classList.contains('nav-intro-running'))) return;
      element.classList.add('spring-active');
      if (!frame) frame = requestAnimationFrame(tick);
    }
    element.addEventListener('pointermove', event => {
      if (!fine.matches || reduced.matches || event.buttons || event.pointerType === 'touch' || (entersWithHero && document.documentElement.classList.contains('nav-intro-running'))) return;
      const bounds = element.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const x = clamp((event.clientX - bounds.left) / bounds.width - .5, -.5, .5);
      const y = clamp((event.clientY - bounds.top) / bounds.height - .5, -.5, .5);
      const card = element.matches('.project-open,.service-row');
      targets.x = x * (card ? 10 : 8);
      targets.y = y * (card ? 7 : 6);
      targets.rotation = card ? x * .9 : 0;
      targets.scale = pressed ? .975 : 1;
      wake();
    }, { passive: true });
    element.addEventListener('pointerdown', () => { if (reduced.matches) return; pressed = true; targets.scale = .975; wake(); }, { passive: true });
    const release = () => { pressed = false; targets.scale = 1; wake(); };
    element.addEventListener('pointerup', release, { passive: true });
    element.addEventListener('pointercancel', () => { targets.x = 0; targets.y = 0; targets.rotation = 0; release(); }, { passive: true });
    element.addEventListener('pointerleave', () => { targets.x = 0; targets.y = 0; targets.rotation = 0; release(); }, { passive: true });
    clearInteractions.push(reset);
  });

  // Move only the decorative reflection; the nav and its hit targets stay fixed.
  const header = document.querySelector('.site-header');
  const glint = header?.querySelector('.nav-glint');
  if (header && glint) {
    const center = () => header.getBoundingClientRect().width * .33;
    const maxX = () => header.getBoundingClientRect().width * .66;
    const values = { x: center(), y: 0, scale: 1, opacity: .14 };
    const velocities = { x: 0, y: 0, scale: 0, opacity: 0 };
    const targets = { x: center(), y: 0, scale: 1, opacity: .14 };
    let frame = 0, previous = 0, hovering = false, pressed = false;
    let lastScroll = window.scrollY || 0;
    const wake = () => {
      if (reduced.matches || document.hidden) return;
      if (!frame) frame = requestAnimationFrame(tickGlass);
    };
    function resetGlass() {
      cancelAnimationFrame(frame); frame = 0; previous = 0;
      hovering = false; pressed = false;
      header.classList.remove('glass-pressed');
      Object.assign(values, { x: center(), y: 0, scale: 1, opacity: .14 });
      Object.assign(velocities, { x: 0, y: 0, scale: 0, opacity: 0 });
      Object.assign(targets, { x: center(), y: 0, scale: 1, opacity: .14 });
      glint.style.removeProperty('transform');
      glint.style.removeProperty('opacity');
    }
    function tickGlass(time) {
      frame = 0;
      if (reduced.matches || document.hidden) { resetGlass(); return; }
      const dt = previous ? clamp((time - previous) / 16.67, .25, 2) : 1;
      previous = time;
      if (!hovering) targets.x = center();
      let moving = false;
      for (const key of ['x', 'y', 'scale', 'opacity']) {
        const next = springStep(values[key], velocities[key], targets[key], key === 'x' ? .09 : .14, .78, dt);
        values[key] = next.position; velocities[key] = next.velocity;
        if (Math.abs(values[key] - targets[key]) > .015 || Math.abs(velocities[key]) > .012) moving = true;
      }
      glint.style.transform = `translate3d(${clamp(values.x, 0, maxX()).toFixed(2)}px,${values.y.toFixed(2)}px,0) scale(${values.scale.toFixed(3)})`;
      glint.style.opacity = clamp(values.opacity, .1, .58).toFixed(3);
      if (moving) frame = requestAnimationFrame(tickGlass);
      else previous = 0;
    }
    header.addEventListener('pointermove', event => {
      if (!fine.matches || reduced.matches || event.pointerType === 'touch') return;
      const bounds = header.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      hovering = true;
      targets.x = clamp(event.clientX - bounds.left - bounds.width * .17, 0, bounds.width * .66);
      targets.y = clamp((event.clientY - bounds.top) / bounds.height - .5, -.5, .5) * 6;
      targets.scale = pressed ? .92 : 1.06;
      targets.opacity = pressed ? .54 : .42;
      wake();
    }, { passive: true });
    header.addEventListener('pointerdown', () => {
      if (reduced.matches) return;
      pressed = true; targets.scale = .92; targets.opacity = .54;
      header.classList.add('glass-pressed'); wake();
    }, { passive: true });
    const release = () => {
      pressed = false; header.classList.remove('glass-pressed');
      targets.scale = hovering ? 1.06 : 1;
      targets.opacity = hovering ? .42 : .14;
      wake();
    };
    header.addEventListener('pointerup', release, { passive: true });
    header.addEventListener('pointercancel', release, { passive: true });
    header.addEventListener('pointerleave', () => {
      hovering = false; targets.y = 0; release();
    }, { passive: true });
    addEventListener('scroll', () => {
      const now = window.scrollY || 0;
      const delta = clamp(now - lastScroll, -80, 80);
      lastScroll = now;
      if (reduced.matches || document.hidden || !delta) return;
      velocities.y += delta * -.045;
      velocities.scale += Math.abs(delta) * .00028;
      velocities.opacity += Math.abs(delta) * .0016;
      wake();
    }, { passive: true });
    addEventListener('resize', () => { if (!reduced.matches) wake(); }, { passive: true });
    document.addEventListener('visibilitychange', () => { if (document.hidden) resetGlass(); });
    clearInteractions.push(resetGlass);
  }
  reduced.addEventListener('change', () => { if (reduced.matches) clearInteractions.forEach(reset => reset()); });
  fine.addEventListener('change', () => { if (!fine.matches) clearInteractions.forEach(reset => reset()); });
  addEventListener('blur', () => clearInteractions.forEach(reset => reset()));

  const footer = document.querySelector('.contact');
  const stage = footer?.querySelector('.pixel-stage') || footer;
  const canvas = document.getElementById('footerPixels');
  const ctx = canvas?.getContext('2d');
  if (!footer || !stage || !ctx) return;
  const palette = ['#1b6984', '#2f8faa', '#f7f7ed', '#d94e2b'];
  const storyLines = [
    [
      { from: 2950, to: 4150, speaker: 0, text: 'ada project bro?' },
      { from: 4300, to: 5250, speaker: 1, text: 'ada!' },
      { from: 5400, to: 6650, speaker: 1, text: 'aku bawa brief.' },
      { from: 6800, to: 8050, speaker: 0, text: 'sip, ajak teman.' },
      { from: 10700, to: 11800, speaker: 0, text: 'mau gabung?' },
      { from: 11950, to: 13350, speaker: 2, text: 'aku urus visual.' },
      { from: 13500, to: 14800, speaker: 0, text: 'mantap, gas!' },
      { from: 17400, to: 18650, speaker: 1, text: 'aku ikut!' }
    ],
    [
      { from: 2950, to: 4150, speaker: 0, text: 'ide baru, bro?' },
      { from: 4300, to: 5250, speaker: 1, text: 'ada dong!' },
      { from: 5400, to: 6650, speaker: 1, text: 'brief-nya siap.' },
      { from: 6800, to: 8050, speaker: 0, text: 'aku panggil tim.' },
      { from: 10700, to: 11800, speaker: 0, text: 'siap eksplor?' },
      { from: 11950, to: 13350, speaker: 2, text: 'sketsanya siap.' },
      { from: 13500, to: 14800, speaker: 0, text: 'kita mulai!' },
      { from: 17400, to: 18650, speaker: 1, text: 'gas bareng!' }
    ]
  ];
  const residents = [
    { ratio:.17, phase:0, shirt:'#db5735', face:'#f6d7ad', hair:'#253d51', hat:'#f2aa48', pants:'#26485e', shoes:'#f8f6eb', x:0, vx:0 },
    { ratio:.51, phase:2.3, shirt:'#247d9b', face:'#f1cba8', hair:'#20394d', hat:null, pants:'#293d57', shoes:'#f3e6d3', x:0, vx:0 },
    { ratio:.83, phase:4.2, shirt:'#efaa47', face:'#f6dbb8', hair:'#355064', hat:'#377e92', pants:'#26475c', shoes:'#f7f2dc', x:0, vx:0 }
  ];
  const askBubble = stage.querySelector('.comic-bubble--ask');
  const replyBubble = stage.querySelector('.comic-bubble--reply');
  const pointer = { x: -1000, y: -1000, active: false, down: false };
  let pixels = [], width = 0, height = 0, frame = 0, previous = 0, visible = false, sceneClock = 0, dialogue = null;
  const smooth = value => { const t = clamp(value, 0, 1); return t * t * (3 - 2 * t); };
  const move = (from, to, start, end, time) => from + (to - from) * smooth((time - start) / (end - start));
  const spriteUnit = () => width < 320 ? 3 : width < 700 ? 4 : 5;
  function conversation(ms, unit) {
    const time = ms % 24000;
    const variant = Math.floor(ms / 24000) % storyLines.length;
    const home = residents.map(resident => width * resident.ratio);
    const gap = unit * 13 + 4;
    const first = variant ? home[0] : home[1] - gap;
    const firstPartner = variant ? home[0] + gap : home[1];
    const thirdMeet = variant ? home[2] - Math.min(22, gap * .22) : home[2];
    const second = thirdMeet - gap, group = second - gap;
    const secondStart = variant ? 9000 : 8250;
    let lead = home[0], partner = home[1], third = home[2];
    if (time >= 900 && time < 2800) lead = move(home[0], first, 900, 2800, time);
    else if (time >= 2800 && time < 8250) lead = first;
    else if (time >= 8250 && time < secondStart) lead = first;
    else if (time >= secondStart && time < 10500) lead = move(first, second, secondStart, 10500, time);
    else if (time >= 10500 && time < 20300) lead = second;
    else if (time >= 20300) lead = move(second, home[0], 20300, 24000, time);
    if (variant && time >= 900 && time < 2800) partner = move(home[1], firstPartner, 900, 2800, time);
    else if (variant && time >= 2800 && time < 8050) partner = firstPartner;
    else if (variant && time >= 8050 && time < 9000) partner = move(firstPartner, home[1], 8050, 9000, time);
    if (time >= 15100 && time < 17200) partner = move(home[1], group, 15100, 17200, time);
    else if (time >= 17200 && time < 20300) partner = group;
    else if (time >= 20300) partner = move(group, home[1], 20300, 24000, time);
    if (variant && time >= 9000 && time < 10500) third = move(home[2], thirdMeet, 9000, 10500, time);
    else if (variant && time >= 10500 && time < 20300) third = thirdMeet;
    else if (variant && time >= 20300) third = move(thirdMeet, home[2], 20300, 24000, time);
    const lines = storyLines[variant];
    const beat = lines.find(line => time >= line.from && time < line.to) || null;
    const walking = [
      (!variant && time >= 900 && time < 2800) || (time >= secondStart && time < 10500) || time >= 20300,
      (variant && ((time >= 900 && time < 2800) || (time >= 8050 && time < 9000))) || (time >= 15100 && time < 17200) || time >= 20300,
      variant && ((time >= 9000 && time < 10500) || time >= 20300)
    ];
    const directions = [
      time >= 20300 ? Math.sign(home[0] - second) : time >= secondStart && time < 10500 ? Math.sign(second - first) : Math.sign(first - home[0]),
      time >= 20300 ? Math.sign(home[1] - group) : time >= 15100 && time < 17200 ? Math.sign(group - home[1]) : time >= 8050 && time < 9000 ? Math.sign(home[1] - firstPartner) : Math.sign(firstPartner - home[1]),
      time >= 20300 ? Math.sign(home[2] - thirdMeet) : Math.sign(thirdMeet - home[2])
    ];
    return { time, positions: [lead, partner, third], walking, directions, beat, celebrate: time >= 18650 && time < 20300, group };
  }
  function showDialogue(beat, still = false) {
    const key = still ? 'still' : beat ? `${beat.speaker}:${beat.text}` : '';
    if (key !== dialogue) {
      if (askBubble && (still || beat?.speaker === 0)) askBubble.textContent = still ? storyLines[0][0].text : beat.text;
      if (replyBubble && (still || beat?.speaker > 0)) {
        replyBubble.textContent = still ? storyLines[0][1].text : beat.text;
        replyBubble.dataset.speaker = String(still ? 1 : beat.speaker);
      }
      askBubble?.classList.toggle('is-visible', still || beat?.speaker === 0);
      replyBubble?.classList.toggle('is-visible', still || (beat && beat.speaker > 0));
      dialogue = key;
    }
    if (askBubble) {
      const length = askBubble.textContent.length;
      const margin = Math.max(width < 320 ? 92 : 78, Math.min(width / 2, length * (window.innerWidth <= 700 ? 3.6 : 4.3) + 24));
      const x = clamp(still ? width * .37 : residents[0].x, Math.min(margin, width / 2), width - Math.min(margin, width / 2));
      askBubble.style.setProperty('--bubble-shift', `${(x - width * (window.innerWidth <= 700 ? .37 : .35)).toFixed(1)}px`);
    }
    if (replyBubble) {
      const length = replyBubble.textContent.length;
      const margin = Math.min(width / 2, length * (window.innerWidth <= 700 ? 3.6 : 4.3) + 22);
      const speaker = still ? 1 : beat?.speaker > 0 ? beat.speaker : 1;
      const x = clamp(still ? width * .7 : residents[speaker].x, margin, width - margin);
      replyBubble.style.setProperty('--bubble-shift', `${(x - width * .5).toFixed(1)}px`);
    }
  }
  function hash(column, row, seed = 0) {
    let n = Math.imul(column + 1, 73856093) ^ Math.imul(row + 1, 19349663) ^ Math.imul(seed + 1, 83492791);
    n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
    n = Math.imul(n ^ (n >>> 15), 0x846ca68b);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  }
  function rebuild() {
    const bounds = stage.getBoundingClientRect();
    width = Math.max(1, Math.round(bounds.width || stage.clientWidth));
    height = Math.max(1, Math.round(bounds.height || stage.clientHeight));
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    pixels = [];
    const gap = width < 700 ? 15 : 18;
    for (let row = 0, y = gap / 2; y < height; row++, y += gap) {
      for (let column = 0, x = gap / 2; x < width; column++, x += gap) {
        const band = .56 * height - Math.sin(x / Math.max(width, 1) * 4.8) * .15 * height;
        const ridge = Math.max(0, 1 - Math.abs(y - band) / Math.max(height * .42, 1));
        const density = (.035 + .12 * ridge) * (.7 + .3 * x / Math.max(width, 1));
        if (hash(column, row) > density) continue;
        pixels.push({ x, y, homeX: x, homeY: y, vx: 0, vy: 0,
          size: 3 + Math.floor(hash(column, row, 1) * 5),
          phase: hash(column, row, 2) * Math.PI * 2,
          opacity: .25 + hash(column, row, 3) * .44,
          color: palette[Math.min(palette.length - 1, Math.floor(hash(column, row, 4) * palette.length))] });
      }
    }
    residents.forEach((resident, index) => {
      resident.ratio = width < 320 ? [.24, .5, .76][index] : [.17, .51, .83][index];
      resident.x = width * resident.ratio; resident.vx = 0;
    });
    if (reduced.matches || !visible) draw(0, reduced.matches);
  }
  function drawBackgroundPerson(entry, unit, still) {
    const { person, index, x } = entry;
    const step = still ? 0 : Math.floor(sceneClock / 230 + index) % 2;
    const bob = still ? 0 : step ? -1 : 0;
    const baseX = Math.round(x - 4 * unit);
    const baseY = Math.round(height * .83 - 13 * unit + bob);
    const ink = '#4b6770';
    const part = (px, py, w, h, color) => {
      const directionX = person.direction > 0 ? px : 8 - px - w;
      ctx.fillStyle = color;
      ctx.fillRect(baseX + directionX * unit, baseY + py * unit, w * unit, h * unit);
    };
    ctx.globalAlpha = .13;
    ctx.fillStyle = ink;
    ctx.fillRect(baseX + unit, Math.round(height * .83) + 1, 6 * unit, 2);
    ctx.globalAlpha = .7;
    part(2 - step, 9, 2, 3, person.pants);
    part(5 + step, 9, 2, 3, person.pants);
    part(1 - step, 12, 3, 1, person.shoes);
    part(5 + step, 12, 3, 1, person.shoes);
    part(2, 5, 4, 4, ink);
    part(3, 5, 3, 4, person.shirt);
    part(1, 6, 1, 3, person.shirt);
    part(6, 5 + step, 1, 3, person.shirt);
    part(6, 8 + step, 1, 1, person.face);
    part(2, 1, 4, 4, person.hair);
    part(3, 2, 3, 3, person.face);
    part(6, 3, 1, 1, person.face);
    part(5, 3, 1, 1, ink);
    if (person.hat) { part(2, 0, 5, 1, person.hat); part(5, 1, 3, 1, person.hat); }
    if (person.bag) { part(0, 7, 2, 3, person.bag); part(1, 6, 1, 1, ink); }
    ctx.globalAlpha = 1;
  }
  function drawHuman(resident, index, unit, scene, still) {
    const walking = !still && scene.walking[index];
    const speaking = !still && scene.beat?.speaker === index;
    const sideways = walking && !speaking && scene.directions[index] !== 0;
    const cheering = !still && scene.celebrate;
    const blink = !still && (sceneClock + index * 1370) % 4700 < 100;
    const stride = walking && Math.floor(sceneClock / 160) % 2 === 1 ? 1 : 0;
    const bob = still ? 0 : walking ? Math.sin(sceneClock * .015) * 2 : cheering ? Math.abs(Math.sin(sceneClock * .008 + index)) * -3 : Math.sin(sceneClock * .003 + resident.phase) * .7;
    const baseX = Math.round(resident.x - 6 * unit);
    const baseY = Math.round(height - 13 - 18 * unit + bob);
    const facingRight = sideways ? scene.directions[index] > 0 : index === 0 ? still || scene.time < 20300 : index === 1 && walking ? scene.positions[1] > resident.x : false;
    const ink = '#183a4d';
    const drawPart = (x, y, w, h, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(baseX + (facingRight ? x : 12 - x - w) * unit, baseY + y * unit, w * unit, h * unit);
    };
    ctx.globalAlpha = .16;
    ctx.fillStyle = ink;
    ctx.fillRect(baseX + 2 * unit, height - 8, 8 * unit, 2);
    ctx.globalAlpha = 1;

    if (sideways) {
      // A true profile has one visible eye, a projecting nose/brim, and swinging limbs.
      const step = Math.floor(sceneClock / 160) % 2 ? 1 : -1;
      drawPart(3, 10, 1, 3, resident.shirt);
      drawPart(3, 13, 1, 1, resident.face);
      drawPart(4 - step, 14, 2, 3, resident.pants);
      drawPart(7 + step, 14, 2, 3, resident.pants);
      drawPart(3 - step, 17, 3, 1, resident.shoes);
      drawPart(7 + step, 17, 3, 1, resident.shoes);
      drawPart(4, 9, 4, 5, ink);
      drawPart(5, 9, 3, 4, resident.shirt);
      drawPart(step > 0 ? 9 : 8, 10, 1, 3, resident.shirt);
      drawPart(step > 0 ? 9 : 8, 13, 1, 1, resident.face);
      if (index === 0) drawPart(6, 10, 1, 3, '#f4bd90');
      if (index === 1) drawPart(6, 10, 1, 2, '#d7f0ed');
      if (index === 2) drawPart(6, 10, 1, 2, '#fff1ca');
      drawPart(3, 3, 6, 5, ink);
      drawPart(4, 4, 4, 4, resident.face);
      drawPart(3, 5, 1, 2, resident.face);
      drawPart(9, 6, 1, 1, resident.face);
      if (index === 0) {
        drawPart(4, 1, 5, 2, resident.hat);
        drawPart(3, 3, 8, 1, resident.hat);
        drawPart(3, 4, 1, 2, resident.hair);
      } else if (index === 1) {
        drawPart(4, 2, 5, 1, resident.hair);
        drawPart(3, 3, 1, 3, resident.hair);
        drawPart(6, 5, 3, 1, '#9e4e37');
        drawPart(7, 6, 2, 1, '#9e4e37');
        drawPart(1, 14, 2, 2, '#c59053');
        drawPart(1, 13, 2, 1, ink);
      } else {
        drawPart(5, 0, 2, 1, resident.hat);
        drawPart(4, 1, 5, 2, resident.hat);
        drawPart(3, 3, 7, 1, resident.hat);
        drawPart(4, 2, 1, 1, '#b4dce2');
      }
      drawPart(7, 5, 1, 1, blink ? resident.face : ink);
      drawPart(8, 7, 1, 1, ink);
      return;
    }

    // Narrow torso, separate legs, small hands, and visible footwear read as human silhouettes.
    drawPart(5, 8, 2, 1, resident.face);
    drawPart(3, 9, 6, 5, ink);
    drawPart(4, 9, 4, 4, resident.shirt);
    drawPart(3, 10, 1, 3, resident.shirt);
    drawPart(8, 10, 1, 3, resident.shirt);
    drawPart(2, 10, 1, 3, resident.shirt);
    drawPart(2, 13, 1, 1, resident.face);
    if (speaking || cheering) {
      drawPart(9, 8, 1, 3, resident.shirt);
      drawPart(10, 7, 1, 1, resident.face);
    } else {
      drawPart(9, 10, 1, 3, resident.shirt);
      drawPart(9, 13, 1, 1, resident.face);
    }
    if (cheering) { drawPart(1, 7, 1, 1, resident.face); drawPart(2, 8, 1, 2, resident.shirt); }
    if (index === 0) drawPart(5, 10, 1, 3, '#f4bd90');
    if (index === 1) drawPart(5, 10, 2, 2, '#d7f0ed');
    if (index === 2) { drawPart(4, 10, 1, 2, '#fff1ca'); drawPart(7, 10, 1, 2, '#fff1ca'); }
    drawPart(4 - stride, 14, 2, 3, resident.pants);
    drawPart(7 + stride, 14, 2, 3, resident.pants);
    drawPart(3 - stride, 17, 3, 1, resident.shoes);
    drawPart(7 + stride, 17, 3, 1, resident.shoes);
    drawPart(3 - stride, 17, 1, 1, ink);
    drawPart(9 + stride, 17, 1, 1, ink);

    drawPart(3, 3, 6, 5, ink);
    drawPart(4, 4, 4, 4, resident.face);
    drawPart(3, 5, 1, 2, resident.face);
    drawPart(8, 5, 1, 2, resident.face);
    if (index === 0) {
      drawPart(3, 1, 6, 2, resident.hat);
      drawPart(2, 3, 8, 1, resident.hat);
      drawPart(3, 2, 1, 1, ink);
    } else if (index === 1) {
      const glasses = '#9e4e37';
      drawPart(3, 2, 6, 1, resident.hair);
      drawPart(3, 3, 1, 2, resident.hair);
      drawPart(8, 3, 1, 2, resident.hair);
      drawPart(3, 5, 3, 1, glasses);
      drawPart(6, 5, 3, 1, glasses);
      drawPart(3, 6, 1, 1, glasses);
      drawPart(5, 6, 1, 1, glasses);
      drawPart(6, 6, 1, 1, glasses);
      drawPart(8, 6, 1, 1, glasses);
    } else {
      drawPart(5, 0, 2, 1, resident.hat);
      drawPart(3, 1, 6, 2, resident.hat);
      drawPart(2, 3, 8, 1, resident.hat);
      drawPart(4, 2, 1, 1, '#b4dce2');
      drawPart(7, 2, 1, 1, '#b4dce2');
      drawPart(3, 6, 1, 1, '#d67c5d');
      drawPart(8, 6, 1, 1, '#d67c5d');
    }
    if (index === 1) {
      if (!blink) { drawPart(4, 6, 1, 1, '#f8fbf5'); drawPart(7, 6, 1, 1, '#f8fbf5'); }
    } else {
      drawPart(4, 5, 1, 1, blink ? resident.face : ink);
      drawPart(7, 5, 1, 1, blink ? resident.face : ink);
      if (speaking) { drawPart(4, 4, 1, 1, ink); drawPart(7, 4, 1, 1, ink); }
    }
    drawPart(5, 7, speaking ? 1 : 2, 1, ink);
    if (scene.beat && scene.beat.speaker !== index && !still) {
      drawPart(3, 7, 1, 1, '#d67c5d');
      drawPart(8, 7, 1, 1, '#d67c5d');
    }
    if (index === 1) { drawPart(1, 14, 2, 2, '#c59053'); drawPart(1, 13, 2, 1, ink); }
  }
  function draw(time, still = false) {
    ctx.clearRect(0, 0, width, height);
    for (const pixel of pixels) {
      const pulse = still ? 1 : .63 + .37 * Math.sin(time * .0015 + pixel.phase);
      ctx.globalAlpha = pixel.opacity * pulse;
      ctx.fillStyle = pixel.color;
      ctx.fillRect(Math.round(pixel.x), Math.round(pixel.y), pixel.size, pixel.size);
    }
    const unit = spriteUnit();
    const scene = conversation(sceneClock, unit);
    showDialogue(scene.beat, still);
    ctx.globalAlpha = .2;
    ctx.fillStyle = '#17445b';
    ctx.fillRect(Math.min(18, width * .07), height - 10, Math.max(0, width - Math.min(36, width * .14)), 1);
    const backgroundUnit = width < 700 ? 2 : 3;
    backgroundWalkerPositions(sceneClock, width, backgroundUnit, still).forEach(person => drawBackgroundPerson(person, backgroundUnit, still));
    residents.forEach((resident, index) => drawHuman(resident, index, unit, scene, still));
    if (scene.celebrate && !still) {
      ctx.globalAlpha = .78;
      for (let index = 0; index < 7; index++) {
        const x = scene.group + (index - 3) * unit * 7;
        const y = height - 18 * unit - 20 - Math.sin(sceneClock * .004 + index) * 8;
        ctx.fillStyle = palette[index % palette.length];
        ctx.fillRect(Math.round(x), Math.round(y), unit - 1, unit - 1);
      }
    }
    ctx.globalAlpha = 1;
  }
  function tick(time) {
    frame = 0;
    if (!visible || document.hidden || reduced.matches) return;
    const dt = previous ? clamp((time - previous) / 16.67, .25, 2) : 1;
    previous = time;
    sceneClock += dt * 16.67;
    for (let index = 0; index < pixels.length; index++) {
      const pixel = pixels[index];
      const idleX = Math.sin(time * .00068 + pixel.phase) * 1.25;
      const idleY = Math.cos(time * .00054 + pixel.phase) * 1.25;
      if (pointer.active) {
        let dx = pixel.x - pointer.x, dy = pixel.y - pointer.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 110) {
          if (distance < .01) { const angle = index * 2.39996; dx = Math.cos(angle); dy = Math.sin(angle); }
          const influence = Math.pow(1 - distance / 110, 2);
          const force = influence * (pointer.down ? 3.2 : 1.25);
          const length = Math.max(distance, 1);
          pixel.vx += dx / length * force * dt;
          pixel.vy += dy / length * force * dt;
        }
      }
      const sx = springStep(pixel.x, pixel.vx, pixel.homeX + idleX, .055, .82, dt);
      const sy = springStep(pixel.y, pixel.vy, pixel.homeY + idleY, .055, .82, dt);
      pixel.x = sx.position; pixel.y = sy.position; pixel.vx = sx.velocity; pixel.vy = sy.velocity;
    }
    const scene = conversation(sceneClock, spriteUnit());
    residents.forEach((resident, index) => {
      let target = scene.positions[index];
      if (!scene.walking[index]) target += Math.sin(time * .0012 + resident.phase) * Math.min(2, width * .004);
      const distance = Math.hypot(resident.x - pointer.x, height - 32 - pointer.y);
      if (pointer.active && distance < 88) {
        const direction = Math.sign(resident.x - pointer.x) || 1;
        target += direction * Math.pow(1 - distance / 88, 2) * (pointer.down ? 42 : 28);
      }
      const edge = Math.min(width < 320 ? 38 : 25, width / 2);
      const next = springStep(resident.x, resident.vx, clamp(target, edge, width - edge), .12, .74, dt);
      resident.x = next.position; resident.vx = next.velocity;
    });
    draw(time);
    frame = requestAnimationFrame(tick);
  }
  function stop() { cancelAnimationFrame(frame); frame = 0; previous = 0; }
  function start() {
    if (!visible || document.hidden) return;
    if (reduced.matches) { stop(); pixels.forEach(pixel => { pixel.x = pixel.homeX; pixel.y = pixel.homeY; pixel.vx = 0; pixel.vy = 0; }); residents.forEach(resident => { resident.x = width * resident.ratio; resident.vx = 0; }); draw(0, true); return; }
    if (!frame) frame = requestAnimationFrame(tick);
  }
  stage.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' && !pointer.down) return;
    const bounds = canvas.getBoundingClientRect();
    pointer.x = event.clientX - bounds.left; pointer.y = event.clientY - bounds.top; pointer.active = true;
  }, { passive: true });
  stage.addEventListener('pointerdown', event => { pointer.down = true; pointer.active = true; const bounds = canvas.getBoundingClientRect(); pointer.x = event.clientX - bounds.left; pointer.y = event.clientY - bounds.top; }, { passive: true });
  stage.addEventListener('pointerup', () => { pointer.down = false; pointer.active = false; }, { passive: true });
  stage.addEventListener('pointerleave', () => { pointer.down = false; pointer.active = false; }, { passive: true });
  stage.addEventListener('pointercancel', () => { pointer.down = false; pointer.active = false; }, { passive: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { stop(); clearInteractions.forEach(reset => reset()); } else start(); });
  reduced.addEventListener('change', start);
  if ('ResizeObserver' in window) new ResizeObserver(() => { rebuild(); start(); }).observe(stage);
  else addEventListener('resize', () => { rebuild(); start(); });
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting || false; if (visible) start(); else stop(); }, { threshold: 0 }).observe(footer);
  else {
    const checkVisibility = () => { const bounds = footer.getBoundingClientRect(); visible = bounds.bottom > 0 && bounds.top < innerHeight; if (visible) start(); else stop(); };
    addEventListener('scroll', checkVisibility, { passive: true }); addEventListener('resize', checkVisibility); checkVisibility();
  }
  rebuild(); start();
})();
