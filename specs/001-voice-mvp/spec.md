# Especificación · Asistente de voz web MVP

## Objetivo

Capturar fuera de horario la necesidad de un cliente y entregarla ordenada a un representante del desguace.

## Requisitos

- RF-1: Cuando el usuario pulse “Hablar con el asistente”, el sistema debe mostrar el estado de escucha.
- RF-2: Cuando el usuario complete el flujo, el sistema debe mostrar un resumen de vehículo, pieza y contacto.
- RF-3: Cuando se guarde una solicitud, el sistema debe asignarla al estado `Nueva` y mostrar una confirmación.
- RF-4: El sistema no debe mostrar precio, disponibilidad o compatibilidad como confirmadas sin validación humana.
- RF-5: El panel debe mostrar solicitudes y su siguiente acción.
- RF-6: La configuración de Azure debe estar preparada para voz `es-ES` sin incluir secretos.

## Fuera de alcance

Telefonía PSTN, WhatsApp Calling, pagos, inventario real, certificados DGT, autenticación multiusuario y decisiones técnicas autónomas.

## Criterios de finalización

La demo permite iniciar una conversación simulada, completar una solicitud, verla en la bandeja y comprobar visualmente el estado de validación humana.
