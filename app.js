// Panel de Operaciones CAT (operaciones.html) - DESGUACE
// Integración con backend PHP, persistencia real, control de sesión y auditoría

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Verificación de autenticación de sesión
  let currentUser = null;
  try {
    const authRes = await fetch('api/auth.php?action=check');
    const authData = await authRes.json();
    if (!authData.authenticated || !authData.user) {
      window.location.href = 'login.html?redirect=operaciones.html';
      return;
    }
    currentUser = authData.user;
    renderUserInfo(currentUser);
  } catch (err) {
    console.warn('Error comprobando sesión con el servidor:', err);
    window.location.href = 'login.html?redirect=operaciones.html';
    return;
  }

  // 2. Elementos DOM principales
  const dialogAssistant = document.querySelector('#assistant');
  const modalReqDetail = document.querySelector('#modalRequestDetail');
  const modalVehiculo = document.querySelector('#modalVehiculo');
  const modalPieza = document.querySelector('#modalPieza');
  const modalBaja = document.querySelector('#modalBaja');
  const modalBuscarInv = document.querySelector('#modalBuscarInv');

  const sidebar = document.querySelector('.side');
  const hamb = document.querySelector('#hamb');
  const logoutBtn = document.querySelector('#logoutBtn');
  const currentDateEl = document.querySelector('#currentDate');
  const systemStatusBadge = document.querySelector('#systemStatusBadge');

  const requestsContainer = document.querySelector('#requestsContainer');
  const badgeCount = document.querySelector('#badgeCount');
  const heroSummary = document.querySelector('#heroSummary');
  const filterStatus = document.querySelector('#filterStatus');
  const refreshRequestsBtn = document.querySelector('#refreshRequestsBtn');

  // KPIs
  const kpiMonthCount = document.querySelector('#kpiMonthCount');
  const kpiConversion = document.querySelector('#kpiConversion');
  const kpiTotalParts = document.querySelector('#kpiTotalParts');
  const kpiLocatedPercent = document.querySelector('#kpiLocatedPercent');
  const kpiVehiclesInProcess = document.querySelector('#kpiVehiclesInProcess');
  const inventoryPreviewContainer = document.querySelector('#inventoryPreviewContainer');
  const vehiclesPreviewContainer = document.querySelector('#vehiclesPreviewContainer');
  const assistantProgressBar = document.querySelector('#assistantProgressBar');
  const assistantProgressPercent = document.querySelector('#assistantProgressPercent');

  // 3. Renderizado de fecha dinámica en español
  renderDynamicDate();

  // 4. Verificación de salud y versión del sistema
  checkSystemVersion();

  // 5. Navegación móvil y logout
  if (hamb && sidebar) {
    hamb.addEventListener('click', () => sidebar.classList.toggle('open'));
  }
  document.querySelectorAll('.nav a').forEach(a => {
    a.addEventListener('click', () => sidebar?.classList.remove('open'));
  });

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (confirm('¿Deseas cerrar la sesión operativa en el CAT?')) {
        try {
          await fetch('api/auth.php?action=logout', { method: 'POST' });
        } catch (e) {}
        window.location.href = 'login.html';
      }
    });
  }

  // Atajos de teclado
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      sidebar?.classList.remove('open');
      document.querySelectorAll('dialog[open]').forEach(d => d.close());
    }
    if (e.key.toLowerCase() === 'v' && !isAnyModalOpen() && !isFormInputActive()) {
      dialogAssistant?.showModal();
      resetVoiceUI();
    }
  });

  // 6. Carga inicial de datos
  await loadRequests();
  await loadStats();
  await loadInventoryPreview();
  await loadVehiclesPreview();

  // Recarga periódica inteligente (cada 30 segundos)
  setInterval(() => {
    loadRequests(false);
    loadStats();
  }, 30000);

  // 7. Control de filtros y actualización
  if (filterStatus) {
    filterStatus.addEventListener('change', () => loadRequests());
  }
  if (refreshRequestsBtn) {
    refreshRequestsBtn.addEventListener('click', () => {
      refreshRequestsBtn.textContent = 'Cargando…';
      Promise.all([loadRequests(), loadStats()]).finally(() => {
        refreshRequestsBtn.textContent = '↻ Actualizar';
      });
    });
  }

  // ==========================================
  // FUNCIONES DE CARGA Y API
  // ==========================================

  async function renderUserInfo(user) {
    const avatar = document.querySelector('#userAvatar');
    const nameEl = document.querySelector('#userDisplayName');
    const roleEl = document.querySelector('#userRole');
    const greetingEl = document.querySelector('#userGreeting');

    if (nameEl) nameEl.textContent = user.name;
    if (roleEl) roleEl.textContent = user.role || 'Operador CAT';
    if (avatar) {
      const initials = user.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
      avatar.textContent = initials || 'JG';
    }
    if (greetingEl) {
      const firstName = user.name.split(' ')[0];
      const hour = new Date().getHours();
      const salut = hour < 14 ? 'Buenos días' : (hour < 21 ? 'Buenas tardes' : 'Buenas noches');
      greetingEl.innerHTML = `${salut}, ${escapeHtml(firstName)} <span>↗</span>`;
    }
  }

  function renderDynamicDate() {
    if (!currentDateEl) return;
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    currentDateEl.textContent = formatter.format(now).toUpperCase();
  }

  async function checkSystemVersion() {
    if (!systemStatusBadge) return;
    try {
      const res = await fetch('api/version.php');
      const data = await res.json();
      if (data.status === 'operational') {
        systemStatusBadge.innerHTML = `● Base de datos activa · v${data.version} (${data.branch})`;
        systemStatusBadge.style.color = '#75817d';
      }
    } catch (e) {
      systemStatusBadge.innerHTML = `⚠ Sin conexión con la API`;
      systemStatusBadge.style.color = '#e05252';
    }
  }

  async function loadRequests(showLoading = true) {
    if (showLoading && requestsContainer) {
      requestsContainer.style.opacity = '0.6';
    }

    try {
      const statusVal = filterStatus ? filterStatus.value : 'all';
      const url = statusVal === 'all' ? 'api/requests.php' : `api/requests.php?status=${encodeURIComponent(statusVal)}`;
      const res = await fetch(url);

      if (res.status === 401) {
        window.location.href = 'login.html?redirect=operaciones.html';
        return;
      }

      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        renderRequestsList(data.data);
      }
    } catch (err) {
      console.warn('Error cargando solicitudes:', err);
    } finally {
      if (requestsContainer) requestsContainer.style.opacity = '1';
    }
  }

  function renderRequestsList(list) {
    if (!requestsContainer) return;

    const pendingList = list.filter(r => ['nueva', 'en_estudio', 'presupuestada', 'contactada'].includes(r.status));
    if (badgeCount) badgeCount.textContent = pendingList.length;

    if (heroSummary) {
      if (pendingList.length === 0) {
        heroSummary.innerHTML = `Todas las solicitudes están atendidas. El centro CAT está al día.`;
      } else {
        heroSummary.innerHTML = `<strong>${pendingList.length} solicitudes</strong> esperan acción en el centro CAT. Pulsa cualquier solicitud para ver la ficha y gestionar el estado.`;
      }
    }

    if (list.length === 0) {
      requestsContainer.innerHTML = `
        <div style="padding:32px;text-align:center;color:#666;border:1px dashed var(--line);border-radius:8px;margin-top:10px;">
          No hay solicitudes registradas con el filtro actual.
        </div>`;
      return;
    }

    requestsContainer.innerHTML = list.map(item => {
      const iconLetter = (item.part || 'P').charAt(0).toUpperCase();
      const tagColor = item.tagColor || 'orange';
      const timeAgo = formatTimeAgo(item.created_at);

      return `
        <article data-id="${escapeHtml(item.id)}" style="cursor:pointer;" title="Ver ficha de solicitud y auditoría">
          <span class="icon ${tagColor}">${iconLetter}</span>
          <div>
            <strong>${escapeHtml(item.part)}</strong>
            <small>${escapeHtml(item.vehicle || 'Sin vehículo especificado')}</small>
          </div>
          <div class="person">
            <strong>${escapeHtml(item.person || 'Cliente')}</strong>
            <small>${escapeHtml(item.channel || 'Canal directo')} · ${timeAgo}</small>
            ${item.phone ? `<small style="color:#008060;font-weight:600;">📞 ${escapeHtml(item.phone)}</small>` : ''}
          </div>
          <label class="tag ${tagColor}">${escapeHtml(item.action || 'Validar')}</label>
          <button class="arrow" type="button" aria-label="Abrir ficha">→</button>
        </article>
      `;
    }).join('');

    // Listener al hacer clic en cualquier fila de solicitud para abrir el modal de gestión y auditoría
    requestsContainer.querySelectorAll('article').forEach(art => {
      art.addEventListener('click', () => {
        const reqId = art.getAttribute('data-id');
        openRequestDetailModal(reqId);
      });
    });
  }

  async function loadStats() {
    try {
      const res = await fetch('api/stats.php');
      if (res.status === 401) return;
      const data = await res.json();
      if (data.success && data.kpis) {
        const kpis = data.kpis;
        if (kpiMonthCount) kpiMonthCount.textContent = kpis.this_month_requests;
        if (kpiConversion) kpiConversion.innerHTML = `${kpis.conversion_rate}<sup>%</sup>`;
        if (kpiTotalParts) kpiTotalParts.textContent = kpis.total_parts;
        if (kpiLocatedPercent) kpiLocatedPercent.textContent = `${kpis.located_percentage}%`;
        if (kpiVehiclesInProcess) kpiVehiclesInProcess.textContent = kpis.vehicles_in_process;

        // Ajustar porcentaje del asistente según solicitudes resueltas
        if (assistantProgressBar && assistantProgressPercent) {
          const total = kpis.total_requests || 1;
          const pending = kpis.pending_requests || 0;
          const resolvedRate = Math.min(95, Math.max(65, Math.round(((total - pending) / total) * 100)));
          assistantProgressBar.style.width = `${resolvedRate}%`;
          assistantProgressPercent.textContent = `${resolvedRate}%`;
        }

        // Renderizar barras dinámicas en la gráfica de actividad
        if (kpis.daily_activity && Array.isArray(kpis.daily_activity)) {
          const chartBars = document.querySelector('#chartBars');
          if (chartBars) {
            chartBars.innerHTML = kpis.daily_activity.map((act, i) => {
              const h = Math.min(100, Math.max(25, act.count * 20));
              const isHighlight = i === kpis.daily_activity.length - 1;
              return `<i style="height:${h}%;${isHighlight ? 'background:var(--lime);' : ''}"></i>`;
            }).join('');
          }
        }
      }
    } catch (err) {
      console.warn('Error cargando estadísticas:', err);
    }
  }

  async function loadInventoryPreview() {
    if (!inventoryPreviewContainer) return;
    try {
      const res = await fetch('api/inventory.php');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const slice = data.data.slice(0, 3);
        if (slice.length === 0) {
          inventoryPreviewContainer.innerHTML = '<p>No hay piezas en stock catalogadas.</p>';
          return;
        }
        inventoryPreviewContainer.innerHTML = slice.map(p => `
          <p>
            ${escapeHtml(p.name)}
            <span>${escapeHtml(p.vehicle)} · Ubicación: <strong>${escapeHtml(p.location || 'Pendiente')}</strong></span>
            <b>${p.price > 0 ? p.price.toFixed(2) + '€' : 'A consultar'}</b>
          </p>
        `).join('');
      }
    } catch (e) {
      console.warn('Error cargando inventario preview:', e);
    }
  }

  async function loadVehiclesPreview() {
    if (!vehiclesPreviewContainer) return;
    try {
      const res = await fetch('api/vehicles.php');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const slice = data.data.slice(0, 3);
        if (slice.length === 0) {
          vehiclesPreviewContainer.innerHTML = '<li><b>No hay vehículos en proceso actualmente.</b></li>';
          return;
        }
        vehiclesPreviewContainer.innerHTML = slice.map(v => `
          <li>
            <b>${escapeHtml(v.plate)} · ${escapeHtml(v.make_model)}</b>
            <small>${escapeHtml(v.status)} · DGT: ${escapeHtml(v.baja_dgt)}</small>
          </li>
        `).join('');
      }
    } catch (e) {
      console.warn('Error cargando vehículos preview:', e);
    }
  }

  // ==========================================
  // MODAL DE DETALLE DE SOLICITUD Y AUDITORÍA
  // ==========================================

  async function openRequestDetailModal(requestId) {
    if (!modalReqDetail) return;

    try {
      const res = await fetch(`api/requests.php?id=${encodeURIComponent(requestId)}`);
      const data = await res.json();
      if (!data.success || !data.data) {
        alert('No se encontró la solicitud.');
        return;
      }

      const req = data.data;
      const audit = data.audit || [];

      document.querySelector('#editRequestId').value = req.id;
      document.querySelector('#modalReqTitle').textContent = `Solicitud ${req.id}`;
      document.querySelector('#modalReqSubtitle').textContent = `${req.channel || 'Canal directo'} · ${formatTimeAgo(req.created_at)}`;

      document.querySelector('#detailPartVehicle').innerHTML = `
        ${escapeHtml(req.part)}<br>
        <span style="font-weight:400;color:var(--muted);font-size:12px;">${escapeHtml(req.vehicle || 'Sin vehículo')}</span>
      `;

      const contactActionsEl = document.querySelector('#detailContactActions');
      let cleanPhone = (req.phone || '').replace(/[^0-9+]/g, '');
      let waLink = '';
      if (cleanPhone) {
        const waPhone = cleanPhone.startsWith('+') ? cleanPhone.substring(1) : (cleanPhone.startsWith('34') ? cleanPhone : '34' + cleanPhone);
        const waMsg = encodeURIComponent(`Hola ${req.person || ''}, te contactamos desde el Centro de Recambios CAT respecto a tu consulta de ${req.part} para ${req.vehicle || ''}.`);
        waLink = `https://wa.me/${waPhone}?text=${waMsg}`;
      }

      document.querySelector('#detailPersonChannel').innerHTML = `
        ${escapeHtml(req.person || 'Cliente')} (${escapeHtml(req.phone || 'Sin teléfono')})
      `;

      if (contactActionsEl) {
        contactActionsEl.innerHTML = `
          ${cleanPhone ? `<a href="tel:${cleanPhone}">📞 Llamar</a>` : ''}
          ${waLink ? `<a href="${waLink}" target="_blank" rel="noopener" class="wa">💬 WhatsApp</a>` : ''}
        `;
      }

      // Estado y notas
      const editStatus = document.querySelector('#editStatus');
      if (editStatus) editStatus.value = req.status || 'nueva';

      const editNotes = document.querySelector('#editNotes');
      if (editNotes) editNotes.value = req.notes || '';

      const editPriceQuote = document.querySelector('#editPriceQuote');
      if (editPriceQuote) editPriceQuote.value = req.price_quote || '';

      // Renderizar historial de auditoría
      const auditContainer = document.querySelector('#auditLogContainer');
      if (auditContainer) {
        if (audit.length === 0) {
          auditContainer.innerHTML = '<div style="font-size:11px;color:#999;padding:6px 0;">Sin eventos previos registrados.</div>';
        } else {
          auditContainer.innerHTML = audit.map(a => {
            const dateStr = formatDateTime(a.created_at);
            return `
              <div class="audit-item">
                <small>${dateStr}</small>
                <strong>${escapeHtml(a.user_name || 'Sistema')}</strong>: ${escapeHtml(a.details || a.action)}
              </div>
            `;
          }).join('');
        }
      }

      modalReqDetail.showModal();
    } catch (err) {
      console.warn('Error abriendo modal de detalle:', err);
      alert('Error al obtener los detalles de la solicitud.');
    }
  }

  const closeReqDetailBtn = document.querySelector('#closeReqDetail');
  if (closeReqDetailBtn) closeReqDetailBtn.addEventListener('click', () => modalReqDetail?.close());

  const formUpdateState = document.querySelector('#formUpdateState');
  if (formUpdateState) {
    formUpdateState.addEventListener('submit', async (e) => {
      e.preventDefault();
      const reqId = document.querySelector('#editRequestId').value;
      const status = document.querySelector('#editStatus').value;
      const notes = document.querySelector('#editNotes').value;
      const priceQuote = document.querySelector('#editPriceQuote').value;
      const btn = document.querySelector('#btnSaveReqUpdate');

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = 'Guardando…';
      }

      try {
        const res = await fetch('api/requests.php', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: reqId,
            status: status,
            notes: notes,
            price_quote: priceQuote,
            comment: `Estado: ${status}`
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          modalReqDetail?.close();
          await loadRequests();
          await loadStats();
        } else {
          alert(data.error || 'No se pudo actualizar la solicitud.');
        }
      } catch (err) {
        console.warn('Error guardando cambios:', err);
        alert('Error de conexión al guardar los cambios.');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = 'Guardar y registrar auditoría <span>→</span>';
        }
      }
    });
  }

  // ==========================================
  // MODALES DE ACCIÓN RÁPIDA (VEHÍCULO, PIEZA, BAJA, BÚSQUEDA)
  // ==========================================

  // 1. Registrar Vehículo
  const btnRegVehiculo = document.querySelector('#btnRegVehiculo');
  const closeVehiculo = document.querySelector('#closeVehiculo');
  const formVehiculo = document.querySelector('#formVehiculo');

  if (btnRegVehiculo) btnRegVehiculo.addEventListener('click', () => modalVehiculo?.showModal());
  if (closeVehiculo) closeVehiculo.addEventListener('click', () => modalVehiculo?.close());

  if (formVehiculo) {
    formVehiculo.addEventListener('submit', async (e) => {
      e.preventDefault();
      const plate = document.querySelector('#vehPlate').value.trim();
      const year = document.querySelector('#vehYear').value;
      const makeModel = document.querySelector('#vehMakeModel').value.trim();
      const status = document.querySelector('#vehStatus').value;
      const bajaDgt = document.querySelector('#vehBaja').value;
      const notes = document.querySelector('#vehNotes').value.trim();

      try {
        const res = await fetch('api/vehicles.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plate, year, make_model: makeModel, status, baja_dgt: bajaDgt, notes
          })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          alert(`✓ Vehículo ${plate} registrado con éxito en el centro CAT.`);
          formVehiculo.reset();
          modalVehiculo?.close();
          await loadVehiclesPreview();
          await loadStats();
        } else {
          alert(data.error || 'Error al guardar el vehículo.');
        }
      } catch (err) {
        alert('Error de conexión al registrar vehículo.');
      }
    });
  }

  // 2. Dar de alta una pieza
  const btnAltaPieza = document.querySelector('#btnAltaPieza');
  const closePieza = document.querySelector('#closePieza');
  const formPieza = document.querySelector('#formPieza');

  if (btnAltaPieza) btnAltaPieza.addEventListener('click', () => modalPieza?.showModal());
  if (closePieza) closePieza.addEventListener('click', () => modalPieza?.close());

  if (formPieza) {
    formPieza.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.querySelector('#partName').value.trim();
      const vehicle = document.querySelector('#partVehicle').value.trim();
      const category = document.querySelector('#partCategory').value;
      const price = parseFloat(document.querySelector('#partPrice').value) || 0;
      const location = document.querySelector('#partLocation').value.trim();

      try {
        const res = await fetch('api/inventory.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, vehicle, category, price, location })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          alert(`✓ Pieza "${name}" catalogada en el inventario (${location}).`);
          formPieza.reset();
          modalPieza?.close();
          await loadInventoryPreview();
          await loadStats();
        } else {
          alert(data.error || 'Error al catalogar pieza.');
        }
      } catch (err) {
        alert('Error de conexión al catalogar pieza.');
      }
    });
  }

  // 3. Crear expediente de baja
  const btnExpBaja = document.querySelector('#btnExpBaja');
  const closeBaja = document.querySelector('#closeBaja');
  const formBaja = document.querySelector('#formBaja');

  if (btnExpBaja) btnExpBaja.addEventListener('click', () => modalBaja?.showModal());
  if (closeBaja) closeBaja.addEventListener('click', () => modalBaja?.close());

  if (formBaja) {
    formBaja.addEventListener('submit', async (e) => {
      e.preventDefault();
      const plate = document.querySelector('#bajaPlate').value.trim();
      const dni = document.querySelector('#bajaDni').value.trim();
      const owner = document.querySelector('#bajaOwner').value.trim();
      const phone = document.querySelector('#bajaPhone').value.trim();
      const location = document.querySelector('#bajaLocation').value.trim();

      try {
        // Guardar como solicitud prioritaria en requests
        const res = await fetch('api/requests.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            part: 'Baja definitiva DGT y retirada CAT',
            vehicle: `Matrícula: ${plate}`,
            person: `${owner} (DNI: ${dni})`,
            phone: phone,
            channel: 'Expediente Interno CAT',
            notes: `Ubicación grúa: ${location || 'Por confirmar'}`
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          alert(`✓ Expediente de baja creado para el vehículo ${plate}.`);
          formBaja.reset();
          modalBaja?.close();
          await loadRequests();
          await loadStats();
        } else {
          alert(data.error || 'Error al crear expediente de baja.');
        }
      } catch (err) {
        alert('Error de conexión al tramitar expediente.');
      }
    });
  }

  // 4. Buscador en tiempo real de inventario
  const btnBuscarInv = document.querySelector('#btnBuscarInv');
  const btnSearchTopbar = document.querySelector('#btnSearchTopbar');
  const btnOpenSearchInv = document.querySelector('#btnOpenSearchInv');
  const closeBuscarInv = document.querySelector('#closeBuscarInv');
  const btnCloseSearchModal = document.querySelector('#btnCloseSearchModal');
  const invSearchInput = document.querySelector('#invSearchInput');
  const invSearchResults = document.querySelector('#invSearchResults');
  const invResultsCount = document.querySelector('#invResultsCount');

  const openSearchModal = () => {
    modalBuscarInv?.showModal();
    invSearchInput?.focus();
    executeLiveSearch('');
  };

  if (btnBuscarInv) btnBuscarInv.addEventListener('click', openSearchModal);
  if (btnSearchTopbar) btnSearchTopbar.addEventListener('click', openSearchModal);
  if (btnOpenSearchInv) btnOpenSearchInv.addEventListener('click', openSearchModal);
  if (closeBuscarInv) closeBuscarInv.addEventListener('click', () => modalBuscarInv?.close());
  if (btnCloseSearchModal) btnCloseSearchModal.addEventListener('click', () => modalBuscarInv?.close());

  let searchDebounce = null;
  if (invSearchInput) {
    invSearchInput.addEventListener('input', (e) => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        executeLiveSearch(e.target.value.trim());
      }, 250);
    });
  }

  async function executeLiveSearch(query) {
    if (!invSearchResults) return;
    invSearchResults.innerHTML = '<div style="padding:16px;text-align:center;color:#666;">Buscando…</div>';

    try {
      const res = await fetch(`api/inventory.php?search=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        if (invResultsCount) invResultsCount.textContent = `${data.count} piezas encontradas`;
        if (data.data.length === 0) {
          invSearchResults.innerHTML = '<div style="padding:16px;text-align:center;color:#666;">No se encontraron piezas con ese término de búsqueda.</div>';
          return;
        }

        invSearchResults.innerHTML = data.data.map(p => `
          <div class="live-search-item">
            <div>
              <strong>${escapeHtml(p.name)}</strong>
              <div style="font-size:11px;color:var(--muted);margin-top:2px;">${escapeHtml(p.vehicle)}</div>
              <div style="font-size:10px;font-family:'DM Mono';color:#008060;margin-top:3px;">📍 ${escapeHtml(p.location || 'Sin ubicación')} · ${escapeHtml(p.category || 'General')}</div>
            </div>
            <div style="text-align:right;">
              <strong style="font-size:14px;color:var(--ink);">${p.price > 0 ? p.price.toFixed(2) + '€' : 'Consultar'}</strong>
              <div style="font-size:10px;font-family:'DM Mono';color:${p.status === 'Disponible' ? '#166534' : '#991b1b'};">${escapeHtml(p.status)}</div>
            </div>
          </div>
        `).join('');
      }
    } catch (e) {
      invSearchResults.innerHTML = '<div style="padding:16px;text-align:center;color:#e05252;">Error buscando en inventario.</div>';
    }
  }

  // ==========================================
  // ASISTENTE DE VOZ INTELIGENTE CONECTADO AL SERVIDOR
  // ==========================================

  const openButtons = document.querySelectorAll('#openAssistant, #openAssistant2');
  openButtons.forEach(b => b?.addEventListener('click', () => {
    dialogAssistant?.showModal();
    resetVoiceUI();
  }));

  const closeAssistantBtn = document.querySelector('#close');
  if (closeAssistantBtn) closeAssistantBtn.addEventListener('click', () => dialogAssistant?.close());

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
      if (reqTextarea) reqTextarea.value = transcript;
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
      if (voiceText) voiceText.textContent = 'Solicitud recogida · lista para guardar';
      if (voiceSub) voiceSub.textContent = 'Transcripción asistida completada';
      if (reqTextarea && !reqTextarea.value.trim()) {
        reqTextarea.value = 'Necesito un alternador para Renault Megane 1.5 dCi de 2011. Pregunta precio y disponibilidad con entrega rápida.';
      }
      if (!voiceClientName?.value) voiceClientName.value = 'Taller Mecánico';
      if (!voiceClientPhone?.value) voiceClientPhone.value = '620 998 877';

      if (listenBtn) {
        listenBtn.disabled = false;
        listenBtn.innerHTML = 'Hablar por micro <span>◉</span>';
      }
      if (voiceDot) {
        voiceDot.style.color = '#00a35c';
        voiceDot.textContent = '✓';
      }
    }, 1200);
  }

  function resetVoiceUI() {
    if (voiceText) voiceText.textContent = 'Listo para escuchar';
    if (voiceSub) voiceSub.textContent = SpeechRecognition ? 'Web Speech API · Voz en español (es-ES)' : 'Modo asistido listo';
    if (voiceDot) {
      voiceDot.style.color = '#00a35c';
      voiceDot.textContent = '✦';
    }
  }

  if (saveVoiceBtn) {
    saveVoiceBtn.addEventListener('click', async () => {
      const text = reqTextarea?.value.trim();
      const name = voiceClientName?.value.trim() || 'Cliente (Recepción Voz)';
      const phone = voiceClientPhone?.value.trim() || '600 000 000';

      if (!text) {
        alert('Por favor, graba o escribe los detalles de la solicitud.');
        return;
      }

      let partTitle = 'Solicitud de recambio';
      if (text.toLowerCase().includes('alternador')) partTitle = 'Alternador';
      else if (text.toLowerCase().includes('faro') || text.toLowerCase().includes('piloto')) partTitle = 'Faro / Piloto';
      else if (text.toLowerCase().includes('motor')) partTitle = 'Motor';
      else if (text.toLowerCase().includes('caja')) partTitle = 'Caja de cambios';
      else if (text.toLowerCase().includes('baja') || text.toLowerCase().includes('retirada')) partTitle = 'Retirada y baja definitiva';

      saveVoiceBtn.disabled = true;
      saveVoiceBtn.innerHTML = 'Guardando en base de datos…';

      try {
        const res = await fetch('api/requests.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            part: partTitle,
            vehicle: text,
            person: name,
            phone: phone,
            channel: 'Asistente de Voz'
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          if (reqTextarea) reqTextarea.value = '';
          if (voiceClientName) voiceClientName.value = '';
          if (voiceClientPhone) voiceClientPhone.value = '';
          dialogAssistant?.close();

          await loadRequests();
          await loadStats();

          document.querySelector('#solicitudes')?.scrollIntoView({ behavior: 'smooth' });
        } else {
          alert(data.error || 'No se pudo guardar la solicitud.');
        }
      } catch (err) {
        alert('Error conectando con la API del servidor.');
      } finally {
        saveVoiceBtn.disabled = false;
        saveVoiceBtn.innerHTML = 'Guardar en Base de Datos <span>→</span>';
      }
    });
  }

  // ==========================================
  // HELPERS
  // ==========================================

  function isAnyModalOpen() {
    return !!document.querySelector('dialog[open]');
  }

  function isFormInputActive() {
    const active = document.activeElement;
    return active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT');
  }

  function formatTimeAgo(isoString) {
    if (!isoString) return 'reciente';
    try {
      const d = new Date(isoString);
      const diffSecs = Math.floor((Date.now() - d.getTime()) / 1000);
      if (diffSecs < 60) return 'hace un momento';
      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins < 60) return `hace ${diffMins} min`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `hace ${diffHours} h`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'ayer';
      return `hace ${diffDays} d`;
    } catch (e) {
      return 'reciente';
    }
  }

  function formatDateTime(isoString) {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('es-ES', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
      });
    } catch (e) {
      return isoString;
    }
  }

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
