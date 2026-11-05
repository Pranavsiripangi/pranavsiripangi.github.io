/* An illustrative dashboard, with deterministic example data and no network. */
(() => {
  const samples = {
    '7': [142, 168, 151, 196, 185, 218, 236],
    '30': [132, 149, 170, 159, 203, 228, 247, 223, 280, 307],
    '90': [118, 142, 159, 207, 195, 252, 269, 314, 338, 372, 409, 438]
  };
  const number = value => new Intl.NumberFormat('en-US').format(value);
  function summary(days) {
    const values = samples[days] || samples['30'];
    const total = values.reduce((sum, value) => sum + value, 0);
    const change = Math.round((values.at(-1) / values[0] - 1) * 100);
    return { values, total, change, average: Math.round(total / values.length) };
  }
  function mount(host) {
    host.innerHTML = `
      <div class="pulse-demo__heading"><strong>PULSE<span aria-hidden="true"> /</span></strong><span>Interactive study · example data</span></div>
      <div class="pulse-demo__intro"><h3>A clearer view.</h3><label>Period<select aria-label="Dashboard period"><option value="7">Last 7 days</option><option value="30" selected>Last 30 days</option><option value="90">Last 90 days</option></select></label></div>
      <div class="pulse-demo__metrics"><div><span>Sample visits</span><strong data-pulse-total></strong></div><div><span>First → last interval</span><strong data-pulse-change></strong></div><div><span>Average / interval</span><strong data-pulse-average></strong></div></div>
      <div class="pulse-demo__chart"><div class="pulse-demo__chart-head"><span>Visits by interval</span><span data-pulse-range></span></div><svg viewBox="0 0 460 124" role="img" aria-label="Example visits by interval"><path d="M12 30H448M12 65H448M12 100H448" fill="none" stroke="#d9e4e7"/><g data-pulse-bars></g></svg><p data-pulse-summary role="status" aria-live="polite" aria-atomic="true"></p></div>
      <p class="pulse-demo__footnote">Change the period to explore the hierarchy. These numbers illustrate the interface; they are not project results.</p>`;
    const select = host.querySelector('select');
    const svg = host.querySelector('svg');
    const bars = host.querySelector('[data-pulse-bars]');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let motions = [];
    function render(animate = false) {
      motions.forEach(motion => motion.cancel()); motions = [];
      const { values, total, change, average } = summary(select.value);
      host.querySelector('[data-pulse-total]').textContent = number(total);
      host.querySelector('[data-pulse-change]').textContent = `+${change}%`;
      host.querySelector('[data-pulse-average]').textContent = number(average);
      host.querySelector('[data-pulse-range]').textContent = `${select.value} days`;
      const text = `Last ${select.value} days: ${number(total)} sample visits across ${values.length} intervals. First interval ${values[0]}, last interval ${values.at(-1)}.`;
      host.querySelector('[data-pulse-summary]').textContent = text;
      svg.setAttribute('aria-label', text);
      const peak = Math.max(...values), slot = 436 / values.length;
      bars.replaceChildren(...values.map((value, index) => {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        const height = value / peak * 88;
        for (const [key, val] of Object.entries({ x: 12 + index * slot + 3, y: 110 - height, width: slot - 6, height, rx: 3, fill: index === values.length - 1 ? '#a83e1d' : '#43888c' })) rect.setAttribute(key, String(val));
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = `Interval ${index + 1}: ${value} visits`; rect.append(title);
        return rect;
      }));
      if (animate && !reduced.matches && typeof bars.animate === 'function') {
        motions.push(bars.animate([{ opacity: .35, transform: 'translateY(5px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.22,1,.36,1)' }));
      }
    }
    select.addEventListener('change', () => render(true));
    reduced.addEventListener('change', () => { motions.forEach(motion => motion.cancel()); motions = []; });
    render();
    return { reset() { select.value = '30'; render(); } };
  }
  window.PulseDemo = { mount, summary };
})();
