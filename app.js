const requests = [];
const startVoice = document.querySelector('#startVoice');
const status = document.querySelector('#voiceStatus');
const transcript = document.querySelector('#transcript');
const form = document.querySelector('#requestForm');
const body = document.querySelector('#inboxBody');
const counter = document.querySelector('#counter');

// Adapter boundary: replace this demo with a backend-issued Azure Speech token.
// Never expose AZURE_SPEECH_KEY in this file or any public frontend asset.
const speechAdapter = { provider: 'azure-speech-standard', locale: 'es-ES', voice: 'es-ES-AlvaroNeural', mode: 'demo' };

startVoice.addEventListener('click', () => {
  status.textContent = 'Escuchando · demo';
  startVoice.innerHTML = '<span class="pulse"></span> Escuchando… <kbd>V</kbd>';
  const message = document.createElement('div');
  message.className = 'bubble client';
  message.textContent = 'Busco una pieza para mi coche.';
  transcript.append(message);
  setTimeout(() => {
    status.textContent = 'Solicitud preparada';
    document.querySelector('#need').value = 'Pieza para vehículo: pendiente de confirmar marca, modelo y motorización';
    document.querySelector('#need').focus();
    startVoice.innerHTML = '<span class="pulse"></span> Hablar de nuevo <kbd>V</kbd>';
  }, 700);
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const need = document.querySelector('#need').value.trim();
  const contact = document.querySelector('#contact').value.trim();
  const channel = document.querySelector('#channel').value;
  if (!need || !contact) return;
  requests.push({ need, contact, channel });
  const row = document.createElement('tr');
  row.innerHTML = `<td><strong>${escapeHtml(need.slice(0, 34))}${need.length > 34 ? '…' : ''}</strong><small>Datos pendientes de validación</small></td><td>${escapeHtml(contact)}<small>${escapeHtml(channel)}</small></td><td><span class="badge blue">Nueva</span></td><td>Revisar y contactar</td>`;
  body.prepend(row);
  counter.textContent = `${2 + requests.length} abiertas`;
  form.reset();
  status.textContent = 'Solicitud creada';
});

function escapeHtml(value) { return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char])); }

document.addEventListener('keydown', (event) => { if (event.key.toLowerCase() === 'v' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') startVoice.click(); });
