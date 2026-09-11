<?php
/**
 * Configuración global del sistema DESGUACE
 * Compatible con Hostinger (PHP 7.4 - 8.x+)
 */

// Zona horaria de España
date_default_timezone_set('Europe/Madrid');

// Directorio base de datos
define('DATA_DIR', __DIR__ . '/data');

// Versión del sistema y release
define('APP_VERSION', '1.2.0');
define('APP_BUILD_DATE', '2026-09-11');
define('APP_NAME', 'DESGUACE · Operaciones CAT');

// Configuración de sesión segura
define('SESSION_LIFETIME', 86400 * 7); // 7 días
define('SESSION_COOKIE_NAME', 'desguace_session');

// Credenciales iniciales del operador CAT
// En producción se valida contra la tabla de usuarios con password_hash()
define('DEFAULT_ADMIN_EMAIL', 'admin@desguace.com');
define('DEFAULT_ADMIN_NAME', 'Operador CAT');
define('DEFAULT_ADMIN_ROLE', 'Responsable CAT');
define('DEFAULT_ADMIN_HASH', password_hash('Desguace2026!', PASSWORD_BCRYPT));

// Asegurar que el directorio de datos existe
if (!is_dir(DATA_DIR)) {
    @mkdir(DATA_DIR, 0755, true);
}

// Configuración de cabeceras seguras para API
function sendJsonHeaders() {
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('Cache-Control: no-cache, no-store, must-revalidate');
}

// Iniciar sesión con cookies seguras
function initSession() {
    if (session_status() === PHP_SESSION_NONE) {
        $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') 
                   || (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443)
                   || (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');

        session_set_cookie_params([
            'lifetime' => SESSION_LIFETIME,
            'path' => '/',
            'domain' => '',
            'secure' => $isHttps,
            'httponly' => true,
            'samesite' => 'Lax'
        ]);
        session_name(SESSION_COOKIE_NAME);
        session_start();
    }
}

// Verificar si el usuario está autenticado
function checkAuth() {
    initSession();
    if (empty($_SESSION['user_id'])) {
        sendJsonHeaders();
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'No autorizado. Se requiere iniciar sesión en el panel de operaciones.',
            'authenticated' => false
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    return $_SESSION['user'];
}
