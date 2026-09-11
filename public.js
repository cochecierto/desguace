// Script para la web pública de DESGUACE (index.html)
document.addEventListener('DOMContentLoaded', () => {
  // 1. Scroll suave para enlaces internos
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const targetId = a.getAttribute('href');
      if (targetId && targetId !== '#') {
        const targetEl = document.querySelector(targetId);
        if (targetEl) {
          e.preventDefault();
          window.scrollTo({
            top: targetEl.offsetTop - 70,
            behavior: 'smooth'
          });
        }
      }
    });
  });

  // 2. Manejo del formulario de solicitud de piezas
  const form = document.querySelector('#partForm');
  const feedback = document.querySelector('#formFeedback');

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const vehicle = document.querySelector('#inputVehicle')?.value.trim();
      const yearFuel = document.querySelector('#inputYearFuel')?.value.trim();
      const part = document.querySelector('#inputPart')?.value.trim();
      const phone = document.querySelector('#inputPhone')?.value.trim();
      const name = document.querySelector('#inputName')?.value.trim() || 'Cliente web';

      if (!vehicle || !part || !phone) {
        showFeedback('Por favor, completa al menos el vehículo, la pieza y tu teléfono.', false);
        return;
      }

      // Estructura de la solicitud
      const newRequest = {
        id: 'REQ-' + Math.floor(1000 + Math.random() * 9000),
        part: part,
        vehicle: yearFuel ? `${vehicle} · ${yearFuel}` : vehicle,
        person: name,
        phone: phone,
        channel: 'Web pública',
        time: 'hace 1 min',
        status: 'Nueva',
        action: 'Validar referencia y stock',
        tagColor: 'orange'
      };

      // Guardar en localStorage compartido con el panel de operaciones
      try {
        const stored = JSON.parse(localStorage.getItem('desguace_solicitudes') || '[]');
        stored.unshift(newRequest);
        localStorage.setItem('desguace_solicitudes', JSON.stringify(stored));
      } catch (err) {
        console.warn('Error guardando en localStorage:', err);
      }

      // Mensaje de confirmación al usuario
      showFeedback(
        `✓ <strong>¡Solicitud enviada con éxito!</strong> Hemos registrado tu petición para <em>${part}</em> (${vehicle}). Nuestro equipo técnico comprobará el stock y te contactará al <strong>${phone}</strong>.`,
        true
      );

      form.reset();
    });
  }

  function showFeedback(msg, isSuccess) {
    if (!feedback) return;
    feedback.innerHTML = msg;
    feedback.style.display = 'block';
    if (isSuccess) {
      feedback.style.background = '#e6f7ec';
      feedback.style.color = '#1b6336';
      feedback.style.border = '1px solid #a3e2bb';
    } else {
      feedback.style.background = '#fdeeed';
      feedback.style.color = '#9a1e1e';
      feedback.style.border = '1px solid #f8b4b4';
    }
    feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
});
