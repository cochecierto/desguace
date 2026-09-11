# DESGUACE · Recepción Inteligente para CAT

MVP para Centros Autorizados de Tratamiento (CAT) y desguaces en España: asistente web de captura inteligente de solicitudes de recambios y bajas definitivas DGT, con panel de control y bandeja de seguimiento.

- **Subdominio de producción:** [https://desguace.cochecierto.com/](https://desguace.cochecierto.com/)
- **Repositorio GitHub:** [https://github.com/cochecierto/desguace](https://github.com/cochecierto/desguace)

---

## 1. Ejecución en Local

Puedes ejecutarlo en Windows con el script directo:

```bat
iniciar_desguace.bat
```

O mediante cualquier terminal con Python:

```bash
python -m http.server 8080
```

Y abrir en tu navegador: [http://localhost:8080](http://localhost:8080)

---

## 2. Despliegue en GitHub

El repositorio está vinculado a `https://github.com/cochecierto/desguace.git`.

Para enviar los cambios a GitHub:

```bash
git add .
git commit -m "feat: configuracion de produccion para desguace.cochecierto.com y despliegue Hostinger"
git push origin main
```

---

## 3. Despliegue en Hostinger (`desguace.cochecierto.com`)

### Opción A: Despliegue automático con GitHub Actions (Recomendado)
El archivo `.github/workflows/deploy.yml` sube automáticamente los archivos estáticos a Hostinger por FTP en cada `git push` a la rama `main`.

Solo necesitas configurar 3 secretos en tu repositorio de GitHub (**Settings > Secrets and variables > Actions**):
- `HOSTINGER_FTP_HOST`: Servidor FTP de Hostinger (ej: `ftp.cochecierto.com` o la IP de tu cuenta).
- `HOSTINGER_FTP_USER`: Tu usuario FTP de Hostinger.
- `HOSTINGER_FTP_PASSWORD`: Tu contraseña FTP de Hostinger.
- `HOSTINGER_FTP_DIR` *(opcional)*: Directorio del subdominio en Hostinger (por defecto `public_html/desguace` o `domains/desguace.cochecierto.com/public_html`).

### Opción B: Despliegue directo por script Python
Puedes desplegar directamente desde tu máquina ejecutando:

```bash
python deploy_hostinger.py --host ftp.cochecierto.com --user tu_usuario --dir public_html/desguace
```

### Configuración del Subdominio en el hPanel de Hostinger:
1. Entra a tu **hPanel de Hostinger**.
2. Ve a **Sitios web > Dominios > Subdominios**.
3. Crea el subdominio `desguace` bajo el dominio `cochecierto.com`.
4. Define la carpeta raíz personalizada (ejemplo: `public_html/desguace` o `domains/desguace.cochecierto.com/public_html`).
5. Asegúrate de activar el certificado SSL gratuito para el subdominio en la sección **Seguridad > SSL**.

---

## Estructura del Proyecto

- `index.html`: Landing y asistente de recepción inteligente para CAT / DESGUACE.
- `styles.css`: Estilos visuales con diseño tipográfico y responsive.
- `app.js`: Lógica de interacción con simulación de voz y gestión de solicitudes en memoria.
- `iniciar_desguace.bat`: Lanzador directo para Windows.
- `deploy_hostinger.py`: Script de despliegue FTP autónomo.
- `.github/workflows/deploy.yml`: Automatización de CI/CD para Hostinger.
# Arquitectura de producto

El proyecto separa deliberadamente dos experiencias:

- `public.html`: web pública del desguace. Incluye inicio, embudo de solicitud de piezas, catálogo tipo marketplace, bajas y retiradas, contacto y acceso al asistente.
- `index.html`: centro privado de operaciones para el equipo. Gestiona solicitudes, inventario, vehículos, bajas, analítica y el asistente gerente.

La web pública recoge la oportunidad; el SaaS interno la clasifica y la entrega a una persona para confirmar disponibilidad, precio, ubicación y entrega. No hay compra automática en esta primera fase.

## Publicación

Para mostrar la propuesta pública se sirve `public.html`. El acceso profesional permanece en `index.html`. Las integraciones de voz Azure Speech, WhatsApp, correo y persistencia de solicitudes se conectarán en la siguiente fase mediante sus endpoints seguros.
