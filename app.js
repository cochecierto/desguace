// Panel de Operaciones CAT (operaciones.html) - DESGUACE
const SEED_REQUESTS = [
  {
    id: 'REQ-101',
    part: 'Alternador',
    vehicle: 'Renault Laguna · 1.9 dCi · 2007',
    person: 'María García',
    phone: '612 345 890',
    channel: 'WhatsApp',
    time: 'hace 8 min',
    status: 'Nueva',
    action: 'Validar referencia',
    tagColor: 'orange'
  },
  {
    id: 'REQ-102',
    part: 'Retirada y baja definitiva',
    vehicle: 'Seat Ibiza · 1.4 TDI · 2009',
    person: 'Javier R.',
    phone: '644 112 233',
    channel: 'Teléfono',
    time: 'hace 24 min',
    status: 'Documentación',
    action: 'Solicitar documentos',
    tagColor: 'blue'
  },
  {
    id: 'REQ-103',
    part: 'Motor completo (ref: CAYC)',
    vehicle: 'Volkswagen Golf VI · 2013',
    person: 'Taller Novo',
    phone: '988 223 344',
    channel: 'Web pública',
    time: 'ayer',
    status: 'En curso',
    action: 'Responder precio',
    tagColor: 'green'
  }
];

document.addEventListener('DOMContentLoaded', () => {
  // 1. Elementos principales
  const dialog = document.querySelector('#assistant');
  const sidebar = document.querySelector('.side');
  const hamb = document.querySelector('#hamb');
  const requestsContainer = document.querySelector('#requestsContainer');
  const badgeCount = document.querySelector('#badgeCount');
  const heroSummary = document.querySelector('#heroSummary');
  const resetBtn = document.querySelector('#resetDataBtn');

  // 2. Control de navegación y sidebar
  if (hamb && sidebar) {
    hamb.addEventListener('click', () => sidebar.classList.toggle('open'));
  }
  document.querySelectorAll('.nav a').forEach(a => {
    a.addEventListener('click', () => sidebar?.classList.remove('open'));
  });

  // Atajos de teclado
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      sidebar?.classList.remove('open');
      if (dialog?.open) dialog.close();
    }
    if (e.key.toLowerCase() === 'v' && !dialog?.open && document.activeElement.tagName !== 'TEXTAREA' && document.activeElement.tagName !== 'INPUT') {
      dialog?.showModal();
    }
  });

  // 3. Inicializar y cargar solicitudes
  function getStoredRequests() {
    try {
      const data = localStorage.getItem('desguace_solicitudes');
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (err) {
      console.warn('Error leyendo de localStorage:', err);
    }
    // Guardar semillas iniciales
    localStorage.setItem('desguace_solicitudes', JSON.stringify(SEED_REQUESTS));
    return [...SEED_REQUESTS];
  }

  function saveRequests(list) {
    localStorage.setItem('desguace_solicitudes', JSON.stringify(list));
    renderRequests(list);
  }

  function renderRequests(list) {
    if (!requestsContainer) return;

    if (list.length === 0) {
      requestsContainer.innerHTML = `
        <div style="padding:24px;text-align:center;color:#666;border:1px dashed #ddd;border-radius:12px;grid-column:1/-1;">
          No hay solicitudes pendientes en este momento. Las nuevas consultas aparecerán aquí automáticamente.
        </div>`;
      if (badgeCount) badgeCount.textContent = '0';
      if (heroSummary) heroSummary.textContent = 'Todas las solicitudes están atendidas.';
      return;
    }

    if (badgeCount) badgeCount.textContent = list.length;
    if (heroSummary) {
      heroSummary.innerHTML = `<strong>${list.length} solicitudes</strong> en bandeja. El asistente clasifica y prepara las fichas para validación del equipo.`;
    }

    requestsContainer.innerHTML = list.map((item, index) => {
      const iconLetter = (item.part || 'P').charAt(0).toUpperCase();
      const tagColor = item.tagColor || 'orange';

      return `
        <article data-index="${index}" style="cursor:pointer;" title="Clic para avanzar estado">
          <span class="icon ${tagColor}">${iconLetter}</span>
          <div>
            <strong>${escapeHtml(item.part)}</strong>
            <small>${escapeHtml(item.vehicle || 'Sin vehículo especificado')}</small>
          </div>
          <div class="person">
            <strong>${escapeHtml(item.person || 'Cliente')}</strong>
            <small>${escapeHtml(item.channel || 'Canal directo')} · ${escapeHtml(item.time || 'Reciente')}</small>
            ${item.phone ? `<small style="color:#008060;font-weight:600;">📞 ${escapeHtml(item.phone)}</small>` : ''}
          </div>
          <label class="tag ${tagColor}">${escapeHtml(item.action || 'Validar')}</label>
          <button class="arrow" type="button" aria-label="Avanzar acción">→</button>
        </article>
      `;
    }).join('');

    // Listener para avanzar estados al hacer clic
    requestsContainer.querySelectorAll('article').forEach(art => {
      art.addEventListener('click', () => {
        const idx = parseInt(art.getAttribute('data-index'), 10);
        advanceRequestState(idx);
      });
    });
  }

  function advanceRequestState(index) {
    const list = getStoredRequests();
    if (!list[index]) return;

    const currentAction = list[index].action;
    if (currentAction.includes('Validar')) {
      list[index].action = 'Responder precio y stock';
      list[index].tagColor = 'green';
    } else if (currentAction.includes('Responder') || currentAction.includes('precio')) {
      list[index].action = 'Contactar cliente';
      list[index].tagColor = 'blue';
    } else if (currentAction.includes('Contactar') || currentAction.includes('documentos')) {
      list[index].action = '✓ Confirmada y cerrada';
      list[index].tagColor = 'gray';
    } else {
      // Si ya está cerrada, volver a ponerla en validar
      list[index].action = 'Validar referencia';
      list[index].tagColor = 'orange';
    }
    saveRequests(list);
  }

  // Restablecer datos de prueba
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('¿Restablecer solicitudes iniciales de demostración?')) {
        localStorage.setItem('desguace_solicitudes', JSON.stringify(SEED_REQUESTS));
        renderRequests(SEED_REQUESTS);
      }
    });
  }

  // Carga inicial
  let currentRequests = getStoredRequests();
  renderRequests(currentRequests);

  // Sincronización en tiempo real entre pestañas (StorageEvent)
  window.addEventListener('storage', (e) => {
    if (e.key === 'desguace_solicitudes') {
      currentRequests = getStoredRequests();
      renderRequests(currentRequests);
    }
  });

  // 4. Modal de Asistente de Voz / Inteligente
  const openButtons = document.querySelectorAll('#openAssistant, #openAssistant2');
  openButtons.forEach(b => b?.addEventListener('click', () => {
    dialog?.showModal();
    resetVoiceUI();
  }));

  const closeBtn = document.querySelector('#close');
  if (closeBtn) closeBtn.addEventListener('click', () => dialog?.close());

  // Prompts rápidos de ejemplo
  document.querySelectorAll('.prompts button').forEach(btn => {
    btn.addEventListener('click', () => {
      const promptText = btn.getAttribute('data-prompt') || btn.textContent;
      const reqTextarea = document.querySelector('#request');
      if (reqTextarea) {
        reqTextarea.value = promptText;
        reqTextarea.focus();
      }
    });
  });

  // 5. Reconocimiento de Voz (Web Speech API es-ES con Fallback)
  const listenBtn = document.querySelector('#listen');
  const voiceText = document.querySelector('#voiceText');
  const voiceSub = document.querySelector('#voiceSub');
  const voiceDot = document.querySelector('#voiceDot');
  const reqTextarea = document.querySelector('#request');
  const saveVoiceBtn = document.querySelector('#saveVoiceRequest');
  const voiceClientName = document.querySelector('#voiceClientName');
  const voiceClientPhone = document.querySelector('#voiceClientPhone');

  let recognition = null;
  let isListening = false;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      isListening = true;
      if (listenBtn) {
        listenBtn.classList.add('active');
        listenBtn.innerHTML = 'Detener <span>■</span>';
      }
      if (voiceText) voiceText.textContent = 'Escuchando en español (es-ES)…';
      if (voiceSub) voiceSub.textContent = 'Habla ahora claro al micrófono';
      if (voiceDot) {
        voiceDot.style.color = '#e05252';
        voiceDot.textContent = '◉';
      }
    };

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        transcript += event.results[i][0].transcript;
      }
      if (reqTextarea) {
        reqTextarea.value = transcript;
      }
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      fallbackSpeechSimulation('Error de micrófono (' + event.error + '). Usando modo asistido.');
    };

    recognition.onend = () => {
      isListening = false;
      if (listenBtn) {
        listenBtn.classList.remove('active');
        listenBtn.innerHTML = 'Hablar por micro <span>◉</span>';
      }
      if (voiceText) voiceText.textContent = 'Solicitud captada · lista para validar';
      if (voiceSub) voiceSub.textContent = 'Puedes editar el texto antes de guardarla';
      if (voiceDot) {
        voiceDot.style.color = '#00a35c';
        voiceDot.textContent = '✓';
      }
    };
  }

  if (listenBtn) {
    listenBtn.addEventListener('click', () => {
      if (recognition) {
        if (!isListening) {
          try {
            recognition.start();
          } catch (err) {
            console.warn('Recognition start failed:', err);
            fallbackSpeechSimulation();
          }
        } else {
          recognition.stop();
        }
      } else {
        fallbackSpeechSimulation();
      }
    });
  }

  function fallbackSpeechSimulation(customMsg) {
    if (listenBtn) {
      listenBtn.disabled = true;
      listenBtn.innerHTML = 'Escuchando… <span>◉</span>';
    }
    if (voiceText) voiceText.textContent = customMsg || 'Escuchando la solicitud…';
    if (voiceSub) voiceSub.textContent = 'Simulación activa (es-ES)';

    setTimeout(() => {
      if (voiceText) voiceText.textContent = 'Solicitud recogida · lista para validar';
      if (voiceSub) voiceSub.textContent = 'Transcripción completada con éxito';
      if (reqTextarea && !reqTextarea.value.trim()) {
        reqTextarea.value = 'Necesito un alternador para Renault Megane 1.5 dCi de 2011. Pregunta si tienen stock comprobado y precio con entrega.';
      }
      if (!voiceClientName?.value) voiceClientName.value = 'Taller Gómez';
      if (!voiceClientPhone?.value) voiceClientPhone.value = '620 998 877';

      if (listenBtn) {
        listenBtn.disabled = false;
        listenBtn.innerHTML = 'Hablar por micro <span>◉</span>';
      }
      if (voiceDot) {
        voiceDot.style.color = '#00a35c';
        voiceDot.textContent = '✓';
      }
    }, 1400);
  }

  function resetVoiceUI() {
    if (voiceText) voiceText.textContent = 'Listo para escuchar';
    if (voiceSub) voiceSub.textContent = SpeechRecognition ? 'Web Speech API · Voz en español (es-ES)' : 'Modo asistido con simulación activa';
    if (voiceDot) {
      voiceDot.style.color = '#00a35c';
      voiceDot.textContent = '✦';
    }
  }

  // 6. Guardar solicitud desde el asistente de voz en el panel
  if (saveVoiceBtn) {
    saveVoiceBtn.addEventListener('click', () => {
      const text = reqTextarea?.value.trim();
      const name = voiceClientName?.value.trim() || 'Cliente (Recepción Voz)';
      const phone = voiceClientPhone?.value.trim() || '';

      if (!text) {
        alert('Por favor, graba o escribe los detalles de la solicitud.');
        return;
      }

      // Extraer un título simple de la pieza
      let partTitle = 'Solicitud de recambio';
      if (text.toLowerCase().includes('alternador')) partTitle = 'Alternador';
      else if (text.toLowerCase().includes('faro') || text.toLowerCase().includes('piloto')) partTitle = 'Faro / Piloto';
      else if (text.toLowerCase().includes('motor')) partTitle = 'Motor';
      else if (text.toLowerCase().includes('caja')) partTitle = 'Caja de cambios';
      else if (text.toLowerCase().includes('baja') || text.toLowerCase().includes('retirada')) partTitle = 'Retirada y baja definitiva';

      const newReq = {
        id: 'VOZ-' + Math.floor(100 + Math.random() * 900),
        part: partTitle,
        vehicle: text.length > 50 ? text.substring(0, 50) + '…' : text,
        person: name,
        phone: phone,
        channel: 'Asistente de Voz',
        time: 'hace 1 min',
        status: 'Nueva',
        action: 'Validar referencia',
        tagColor: 'orange'
      };

      const list = getStoredRequests();
      list.unshift(newReq);
      saveRequests(list);

      // Limpiar formulario y cerrar
      if (reqTextarea) reqTextarea.value = '';
      if (voiceClientName) voiceClientName.value = '';
      if (voiceClientPhone) voiceClientPhone.value = '';
      dialog?.close();

      // Scroll a la sección de solicitudes
      document.querySelector('#solicitudes')?.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // 7. Botones de acción rápida en el panel
  const quickActions = [
    { id: '#btnRegVehiculo', label: 'Registro de vehículo CAT' },
    { id: '#btnAltaPieza', label: 'Dar de alta una pieza en stock' },
    { id: '#btnExpBaja', label: 'Crear expediente telemático de baja' },
    { id: '#btnBuscarInv', label: 'Buscador de inventario' }
  ];

  quickActions.forEach(action => {
    const btn = document.querySelector(action.id);
    if (btn) {
      btn.addEventListener('click', () => {
        alert(`Módulo "${action.label}":\nEste flujo abrirá el formulario específico en la siguiente fase de desarrollo.`);
      });
    }
  });

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
