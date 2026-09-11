<?php
/**
 * Endpoint de Flujo de Vehículos y Bajas DGT · DESGUACE
 * Requiere autenticación
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

sendJsonHeaders();
$user = checkAuth();

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $vehicles = DB::getCollection('vehicles');
        echo json_encode([
            'success' => true,
            'count' => count($vehicles),
            'data' => array_values($vehicles)
        ], JSON_UNESCAPED_UNICODE);
        exit;

    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) $input = $_POST;

        $plate = strtoupper(trim($input['plate'] ?? ''));
        $makeModel = trim($input['make_model'] ?? '');
        $year = intval($input['year'] ?? date('Y'));
        $status = trim($input['status'] ?? 'Recibido en campa');
        $bajaDgt = trim($input['baja_dgt'] ?? 'Pendiente trámite');
        $notes = trim($input['notes'] ?? '');

        if (empty($plate) || empty($makeModel)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Matrícula y marca/modelo son obligatorios.']);
            exit;
        }

        $all = DB::getCollection('vehicles');
        $newId = 'VEH-' . (count($all) + 101);

        $newVehicle = [
            'id' => $newId,
            'plate' => htmlspecialchars($plate, ENT_QUOTES, 'UTF-8'),
            'make_model' => htmlspecialchars($makeModel, ENT_QUOTES, 'UTF-8'),
            'year' => $year,
            'status' => htmlspecialchars($status, ENT_QUOTES, 'UTF-8'),
            'entry_date' => date('Y-m-d'),
            'baja_dgt' => htmlspecialchars($bajaDgt, ENT_QUOTES, 'UTF-8'),
            'notes' => htmlspecialchars($notes, ENT_QUOTES, 'UTF-8'),
            'created_at' => date('c')
        ];

        $inserted = DB::insert('vehicles', $newVehicle);
        DB::logAudit('vehicle', $newId, 'create', $user['name'] ?? 'Operador CAT', "Registro de vehículo {$plate} ({$makeModel})");

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Vehículo registrado correctamente en el centro CAT.',
            'data' => $inserted
        ], JSON_UNESCAPED_UNICODE);
        exit;

    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Método no permitido']);
        exit;
}
