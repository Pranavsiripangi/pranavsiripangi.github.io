/* Contact form: sends the message straight to the owner's inbox through Web3Forms.
   The owner's email address never appears on the site; only a publishable access key (config.js) does. */
(() => {
  const form = document.getElementById('projectBriefForm');
  if (!form) return;
  const settings = window.portfolioConfig?.contactForm || {};
  const endpoint = settings.endpoint || 'https://api.web3forms.com/submit';
  const accessKey = String(settings.accessKey || '').trim();
  const ready = accessKey.length > 0;
  const button = document.getElementById('briefSubmit');
  const status = document.getElementById('briefFormStatus');
  const topic = document.getElementById('briefService');
  const buttonLabel = button.innerHTML;

  // Preselect a topic from ?service= links, if one matches.
  const requested = new URLSearchParams(location.search).get('service');
  if ([...topic.options].some(option => option.value === requested)) topic.value = requested;

  function setStatus(text, tone = '') {
    status.textContent = text;
    status.dataset.tone = tone;
  }

  if (!ready) {
    button.disabled = true;
    setStatus('The form is not connected yet. Please reach me on LinkedIn for now.', 'note');
  }

  function readValues() {
    if (!form.reportValidity()) return null;
    const values = Object.fromEntries(new FormData(form).entries());
    for (const key of Object.keys(values)) values[key] = String(values[key]).trim();
    return values;
  }

  function buildPayload(values) {
    const label = [...topic.options].find(option => option.value === values.service)?.textContent || values.service;
    return {
      access_key: accessKey,
      subject: `Portfolio contact — ${label}`,
      from_name: 'Portfolio contact form',
      name: values.senderName,
      email: values.senderEmail, // used as reply-to; the visitor's address, not the owner's
      topic: label,
      message: values.goal,
      timing: values.timeline,
      company: values.budget || 'Not specified',
      botcheck: values.botcheck ? true : ''
    };
  }

  async function send(event) {
    event.preventDefault();
    if (!ready || button.disabled) return;
    const values = readValues();
    if (!values) return;
    if (values.botcheck) return; // a filled honeypot means a bot; drop silently
    button.disabled = true;
    button.textContent = 'Sending…';
    setStatus('Sending your message…', 'busy');
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(buildPayload(values))
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success === false) throw new Error(result.message || `HTTP ${response.status}`);
      form.reset();
      setStatus('Thank you — your message is on its way. I will reply to the email you gave.', 'success');
    } catch (error) {
      setStatus('The message could not be sent right now. Please try again in a moment, or reach me on LinkedIn.', 'error');
    } finally {
      button.disabled = false;
      button.innerHTML = buttonLabel;
    }
  }

  form.addEventListener('submit', send);
  window.portfolioBrief = { buildPayload };
})();
