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

      // Enviar solicitud al servidor mediante la API persistente
      const submitBtn = form.querySelector('#btnSubmitRequest');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Enviando solicitud al desguace…';
      }

      fetch('api/requests.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          part: part,
          vehicle: yearFuel ? `${vehicle} · ${yearFuel}` : vehicle,
          person: name,
          phone: phone,
          channel: 'Web pública'
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          const reqId = data.data.id || 'REQ';
          showFeedback(
            `✓ <strong>¡Solicitud registrada con éxito (#${reqId})!</strong> Hemos guardado tu petición para <em>${part}</em> (${vehicle}) en el centro CAT. Nuestro equipo técnico comprobará el stock y te contactará al <strong>${phone}</strong>.`,
            true
          );
          form.reset();
        } else {
          showFeedback(data.error || 'No se pudo registrar la solicitud. Por favor, llámanos al 900 000 000.', false);
        }
      })
      .catch(err => {
        console.warn('Error conectando con la API:', err);
        showFeedback('Error de conexión con el servidor. Por favor, llámanos directamente al 900 000 000 o escríbenos por WhatsApp.', false);
      })
      .finally(() => {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Enviar solicitud al desguace <span>→</span>';
        }
      });
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
