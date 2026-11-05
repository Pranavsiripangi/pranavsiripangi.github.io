(() => {
  const config = window.portfolioConfig;
  document.querySelectorAll('[data-brand]').forEach(element => { element.textContent = config.brand; });
  document.querySelectorAll('[data-year]').forEach(element => { element.textContent = new Date().getFullYear(); });
  // Position ("02 / 04") and the next link come from projects.js, matched by this page's file name.
  // Only projects with a case page take part, so the chain never points at a missing page.
  const pages = (window.portfolioProjects || []).filter(project => project.caseUrl);
  const file = location.pathname.split('/').pop() || '';
  const index = pages.findIndex(project => project.caseUrl === file);
  if (index >= 0) {
    const pad = value => String(value).padStart(2, '0');
    document.querySelectorAll('[data-case-position]').forEach(element => { element.textContent = `${pad(index + 1)} / ${pad(pages.length)}`; });
    const next = pages[(index + 1) % pages.length];
    document.querySelectorAll('[data-case-next]').forEach(link => {
      if (pages.length < 2) { link.closest('.case-bottom-next')?.setAttribute('hidden', ''); return; }
      link.href = next.caseUrl;
      link.textContent = `${next.name} ↗`;
    });
  }
  const title = document.querySelector('h1')?.textContent.trim();
  if (title) document.title = `${title} — Case study | ${config.name}`;
})();
