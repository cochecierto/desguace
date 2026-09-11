# DESGUACE · Sistema Operativo para CAT

Sistema integral para Centros Autorizados de Tratamiento (CAT) y desguaces: captación pública de solicitudes de piezas y bajas DGT, panel privado de operaciones con autenticación y auditoría, persistencia en base de datos del servidor y asistente de voz en español.

- **Subdominio de producción:** [https://desguace.cochecierto.com/](https://desguace.cochecierto.com/)
- **Centro Operativo CAT:** [https://desguace.cochecierto.com/operaciones.html](https://desguace.cochecierto.com/operaciones.html) (requiere autenticación)
- **Portal de Acceso:** [https://desguace.cochecierto.com/login.html](https://desguace.cochecierto.com/login.html)
- **Endpoint de Salud y Versión:** [https://desguace.cochecierto.com/api/version.php](https://desguace.cochecierto.com/api/version.php)
- **Repositorio GitHub:** [https://github.com/cochecierto/desguace](https://github.com/cochecierto/desguace)

---

## 1. Credenciales de Acceso CAT

El panel privado cuenta con control de sesiones y protección de datos conforme a RGPD:

- **Usuario:** `admin@desguace.com`
- **Contraseña inicial:** `Desguace2026!`
- **Rol:** Gerente / Operador de Desguace

Cualquier intento de acceso a datos sin sesión activa es bloqueado por el servidor con código HTTP 401 Unauthorized.

---

## 2. Ejecución en Local

Ejecuta el lanzador automático en Windows:

```bat
iniciar_desguace.bat
```

O inicia el servidor PHP integrado desde tu terminal:

```bash
php -S localhost:8000
```

Y abre en tu navegador:
- Web pública de captación: [http://localhost:8000](http://localhost:8000)
- Acceso CAT: [http://localhost:8000/login.html](http://localhost:8000/login.html)
- Comprobación de API: [http://localhost:8000/api/version.php](http://localhost:8000/api/version.php)

---

## 3. Arquitectura del Sistema

```
desguace/
├── index.html               # Web comercial pública (embudo de solicitud de recambios)
├── public.js                # Lógica web pública (envía solicitudes a /api/requests.php)
├── styles-public.css        # Estilos responsivos de la web pública
├── login.html               # Pantalla de inicio de sesión seguro del personal CAT
├── operaciones.html         # Centro de control privado (solicitudes, KPIs, inventario, modales)
├── app.js                   # Lógica del panel CAT, conexión con API, Web Speech API y auditoría
├── styles.css               # Estilos del panel operativo y modales
├── .htaccess                # Configuración Apache Hostinger, HTTPS y bloqueo de archivos de datos
│
├── api/                     # Backend REST en PHP nativo (cero dependencias externas)
│   ├── config.php           # Configuración global, zona horaria Madrid y sesiones seguras
│   ├── db.php               # Motor de persistencia transaccional con bloqueo atómico (flock)
│   ├── auth.php             # Controlador de autenticación (login, logout, check)
│   ├── requests.php         # CRUD de solicitudes, filtros, estados y auditoría
│   ├── stats.php            # Cálculo de KPIs reales en tiempo real (conversión, stock, tiempos)
│   ├── inventory.php        # Alta y buscador interactivo de piezas en stock
│   ├── vehicles.php         # Registro de vehículos en campa y bajas DGT
│   ├── version.php          # Comprobación de salud, versión y coincidencia con main
│   └── data/                # Almacenamiento seguro persistente (protegido por .htaccess)
│       └── .htaccess        # Bloqueo total (Require all denied / Deny from all)
│
├── deploy_hostinger.py      # Script de despliegue FTP a Hostinger con creación de carpetas
└── .github/workflows/
    └── deploy.yml           # CI/CD automático de GitHub Actions a Hostinger
```

---

## 4. Despliegue en Hostinger (`desguace.cochecierto.com`)

### Opción A: Despliegue automático vía GitHub Actions (Recomendado)
Cada `git push` a la rama `main` despliega automáticamente por FTP a Hostinger.

Configura los siguientes secretos en tu repositorio GitHub (**Settings > Secrets and variables > Actions**):
- `HOSTINGER_FTP_HOST`: Servidor FTP (ej. `ftp.cochecierto.com` o la IP de tu cuenta).
- `HOSTINGER_FTP_USER`: Usuario FTP de Hostinger.
- `HOSTINGER_FTP_PASSWORD`: Contraseña FTP de Hostinger.
- `HOSTINGER_FTP_DIR` *(opcional)*: Directorio del subdominio (por defecto `public_html/desguace/`).

> [!NOTE]
> El workflow excluye automáticamente los archivos de datos (`api/data/*.json`, `api/data/*.sqlite`) para garantizar que un nuevo despliegue de código **nunca sobrescriba las solicitudes de clientes ni los datos de producción**.

### Opción B: Despliegue manual por script Python
```bash
python deploy_hostinger.py --host ftp.cochecierto.com --user tu_usuario --dir public_html/desguace
```

### Verificación posterior al despliegue
Tras desplegar, visita:
`https://desguace.cochecierto.com/api/version.php`
Comprueba que devuelve `status: "operational"`, versión y fecha actual, confirmando que la web en producción está 100% sincronizada con `main`.
