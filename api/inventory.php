<?php
/**
 * Endpoint de Inventario y Piezas · DESGUACE
 * Requiere autenticación
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

sendJsonHeaders();
$user = checkAuth();

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $search = trim($_GET['search'] ?? '');
        $parts = DB::getCollection('inventory');

        if (!empty($search)) {
            $s = mb_strtolower($search, 'UTF-8');
            $parts = array_filter($parts, function($p) use ($s) {
                $haystack = ($p['name'] ?? '') . ' ' . ($p['vehicle'] ?? '') . ' ' . ($p['category'] ?? '') . ' ' . ($p['location'] ?? '');
                return mb_strpos(mb_strtolower($haystack, 'UTF-8'), $s) !== false;
            });
        }

        echo json_encode([
            'success' => true,
            'count' => count($parts),
            'data' => array_values($parts)
        ], JSON_UNESCAPED_UNICODE);
        exit;

    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) $input = $_POST;

        $name = trim($input['name'] ?? '');
        $vehicle = trim($input['vehicle'] ?? '');
        $category = trim($input['category'] ?? 'General');
        $price = floatval($input['price'] ?? 0);
        $location = trim($input['location'] ?? '');

        if (empty($name) || empty($vehicle)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Nombre de pieza y compatibilidad de vehículo son obligatorios.']);
            exit;
        }

        $all = DB::getCollection('inventory');
        $newId = 'PIE-' . (count($all) + 101);

        $newPart = [
            'id' => $newId,
            'name' => htmlspecialchars($name, ENT_QUOTES, 'UTF-8'),
            'vehicle' => htmlspecialchars($vehicle, ENT_QUOTES, 'UTF-8'),
            'category' => htmlspecialchars($category, ENT_QUOTES, 'UTF-8'),
            'price' => $price,
            'location' => htmlspecialchars($location, ENT_QUOTES, 'UTF-8'),
            'status' => 'Disponible',
            'tested' => true,
            'created_at' => date('c')
        ];

        $inserted = DB::insert('inventory', $newPart);
        DB::logAudit('inventory', $newId, 'create', $user['name'] ?? 'Operador CAT', "Alta de pieza '{$name}' en {$location}");

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Pieza dada de alta correctamente en el inventario.',
            'data' => $inserted
        ], JSON_UNESCAPED_UNICODE);
        exit;

    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Método no permitido']);
        exit;
}
