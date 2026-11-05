/* The same small project note travels from a workstation to the brief. */
(() => {
  window.portfolioServiceNotes = {
    'digital-design': { title: 'A clearer digital experience.', prompt: 'Who is this for, and what should become easier?', output: 'Interface direction · flows · prototype', mark: '01 / DESIGN' },
    'brand-systems': { title: 'A recognisable point of view.', prompt: 'What should people recognise or remember?', output: 'Visual direction · identity · usage notes', mark: '02 / BRAND' },
    'web-development': { title: 'An idea, ready for the browser.', prompt: 'What should the site help someone do?', output: 'Responsive frontend · interaction · handoff', mark: '03 / BUILD' }
  };
  document.querySelectorAll('.service-row').forEach(card => {
    const key = new URL(card.href, location.href).searchParams.get('service');
    const note = window.portfolioServiceNotes[key];
    if (!note) return;
    const invitation = card.querySelector('.service-invitation');
    if (!invitation) return;
    invitation.querySelector('.service-invitation-dot')?.remove();
    const message = document.createElement('span');
    message.className = 'service-note-feedback';
    message.setAttribute('aria-hidden', 'true');
    message.textContent = 'Take this idea →';
    invitation.append(message);
  });
})();
