<?php
/**
 * Controlador de Autenticación y Sesiones · DESGUACE
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

sendJsonHeaders();
initSession();

$action = $_GET['action'] ?? ($_SERVER['REQUEST_METHOD'] === 'POST' ? 'login' : 'check');

switch ($action) {
    case 'login':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Método no permitido']);
            exit;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            $input = $_POST;
        }

        $email = trim($input['email'] ?? '');
        $password = trim($input['password'] ?? '');

        if (empty($email) || empty($password)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Introduce email y contraseña']);
            exit;
        }

        $users = DB::getCollection('users');
        $matchedUser = null;

        foreach ($users as $u) {
            if (strcasecmp($u['email'], $email) === 0) {
                if (password_verify($password, $u['password_hash'])) {
                    $matchedUser = $u;
                    break;
                }
            }
        }

        // Fallback para admin por defecto si la lista estuviera vacía o en primer inicio
        if (!$matchedUser && strcasecmp($email, DEFAULT_ADMIN_EMAIL) === 0 && password_verify($password, DEFAULT_ADMIN_HASH)) {
            $matchedUser = [
                'id' => 'USR-1',
                'email' => DEFAULT_ADMIN_EMAIL,
                'name' => DEFAULT_ADMIN_NAME,
                'role' => DEFAULT_ADMIN_ROLE
            ];
        }

        if ($matchedUser) {
            session_regenerate_id(true);
            $_SESSION['user_id'] = $matchedUser['id'];
            $_SESSION['user'] = [
                'id' => $matchedUser['id'],
                'email' => $matchedUser['email'],
                'name' => $matchedUser['name'],
                'role' => $matchedUser['role']
            ];

            DB::logAudit('auth', $matchedUser['id'], 'login', $matchedUser['name'], 'Inicio de sesión exitoso desde ' . ($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'));

            echo json_encode([
                'success' => true,
                'message' => 'Inicio de sesión correcto',
                'user' => $_SESSION['user']
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Credenciales no válidas']);
        exit;

    case 'logout':
        $userName = $_SESSION['user']['name'] ?? 'Usuario';
        $userId = $_SESSION['user_id'] ?? 'unknown';

        DB::logAudit('auth', $userId, 'logout', $userName, 'Cierre de sesión');

        $_SESSION = [];
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params["path"], $params["domain"],
                $params["secure"], $params["httponly"]
            );
        }
        session_destroy();

        echo json_encode(['success' => true, 'message' => 'Sesión cerrada']);
        exit;

    case 'check':
    default:
        $isAuthenticated = !empty($_SESSION['user_id']);
        echo json_encode([
            'success' => true,
            'authenticated' => $isAuthenticated,
            'user' => $isAuthenticated ? $_SESSION['user'] : null
        ], JSON_UNESCAPED_UNICODE);
        exit;
}
