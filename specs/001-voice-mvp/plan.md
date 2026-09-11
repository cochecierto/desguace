# Plan técnico inicial

- Frontend estático sin dependencias para facilitar el primer despliegue.
- Estado local en memoria para la demo; sustituible por API.
- Adaptador `speechAdapter` con modo simulación y punto de integración para backend Azure Speech.
- Backend futuro: endpoint `/api/speech-token` con credenciales en variables de entorno.
- Backend futuro: persistencia de solicitudes y webhook de notificación.
- Diseño responsive, accesible por teclado y con estados explícitos.
