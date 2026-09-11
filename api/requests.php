<?php
/**
 * Endpoint de Solicitudes de Piezas y Bajas · DESGUACE
 * POST: Público (o Asistente de Voz / Teléfono)
 * GET/PATCH/DELETE: Privado (requiere autenticación)
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

sendJsonHeaders();

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'POST':
        // Creación de solicitud (puede ser pública desde index.html o interna por voz/teléfono)
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            $input = $_POST;
        }

        $part = trim($input['part'] ?? '');
        $vehicle = trim($input['vehicle'] ?? '');
        $phone = trim($input['phone'] ?? '');
        $person = trim($input['person'] ?? 'Cliente web');
        $channel = trim($input['channel'] ?? 'Web pública');
        $notes = trim($input['notes'] ?? '');

        if (empty($part) || empty($phone)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'La pieza solicitada y el teléfono de contacto son obligatorios.'
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Determinar ID correlativo único
        $existing = DB::getCollection('requests');
        $nextNum = count($existing) + 101;
        $requestId = 'REQ-' . $nextNum;

        // Si ya existiese, generar con random
        if (DB::findById('requests', $requestId)) {
            $requestId = 'REQ-' . mt_rand(200, 9999);
        }

        $newRequest = [
            'id' => $requestId,
            'part' => htmlspecialchars($part, ENT_QUOTES, 'UTF-8'),
            'vehicle' => htmlspecialchars($vehicle, ENT_QUOTES, 'UTF-8'),
            'person' => htmlspecialchars($person, ENT_QUOTES, 'UTF-8'),
            'phone' => htmlspecialchars($phone, ENT_QUOTES, 'UTF-8'),
            'channel' => htmlspecialchars($channel, ENT_QUOTES, 'UTF-8'),
            'status' => 'nueva',
            'action' => 'Validar referencia y stock',
            'tagColor' => 'orange',
            'notes' => htmlspecialchars($notes, ENT_QUOTES, 'UTF-8'),
            'ip' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1',
            'created_at' => date('c'),
            'updated_at' => date('c')
        ];

        $inserted = DB::insert('requests', $newRequest);

        // Registro de auditoría
        DB::logAudit(
            'request',
            $requestId,
            'created',
            $person . ' (' . $channel . ')',
            "Solicitud creada para '{$part}' ({$vehicle}) desde {$channel}"
        );

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Solicitud registrada correctamente en el centro CAT.',
            'data' => $inserted
        ], JSON_UNESCAPED_UNICODE);
        exit;

    case 'GET':
        // Privado: requiere sesión activa
        $user = checkAuth();

        $statusFilter = $_GET['status'] ?? 'all';
        $search = trim($_GET['search'] ?? '');
        $id = trim($_GET['id'] ?? '');

        // Si se pide una solicitud específica con su historial de auditoría
        if (!empty($id)) {
            $item = DB::findById('requests', $id);
            if (!$item) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Solicitud no encontrada']);
                exit;
            }

            $auditTrail = DB::find('audit_log', function($log) use ($id) {
                return isset($log['entity_id']) && $log['entity_id'] === $id;
            });

            echo json_encode([
                'success' => true,
                'data' => $item,
                'audit' => $auditTrail
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Listado de solicitudes con filtros
        $requests = DB::getCollection('requests');

        if ($statusFilter !== 'all') {
            $requests = array_filter($requests, function($r) use ($statusFilter) {
                return isset($r['status']) && $r['status'] === $statusFilter;
            });
        }

        if (!empty($search)) {
            $searchLower = mb_strtolower($search, 'UTF-8');
            $requests = array_filter($requests, function($r) use ($searchLower) {
                $text = ($r['part'] ?? '') . ' ' . ($r['vehicle'] ?? '') . ' ' . ($r['person'] ?? '') . ' ' . ($r['phone'] ?? '') . ' ' . ($r['id'] ?? '');
                return mb_strpos(mb_strtolower($text, 'UTF-8'), $searchLower) !== false;
            });
        }

        echo json_encode([
            'success' => true,
            'count' => count($requests),
            'data' => array_values($requests)
        ], JSON_UNESCAPED_UNICODE);
        exit;

    case 'PATCH':
    case 'PUT':
        // Privado: requiere sesión activa
        $user = checkAuth();

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Cuerpo JSON requerido']);
            exit;
        }

        $id = trim($input['id'] ?? '');
        if (empty($id)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'ID de solicitud requerido']);
            exit;
        }

        $existing = DB::findById('requests', $id);
        if (!$existing) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Solicitud no encontrada']);
            exit;
        }

        $updates = [];
        $auditDetails = [];

        // Validación y mapeo de estados formales
        $validStates = [
            'nueva' => ['action' => 'Validar referencia y stock', 'tagColor' => 'orange', 'label' => 'Nueva'],
            'en_estudio' => ['action' => 'Comprobando stock y compatibilidad', 'tagColor' => 'blue', 'label' => 'En estudio'],
            'presupuestada' => ['action' => 'Responder oferta y precio', 'tagColor' => 'green', 'label' => 'Presupuestada'],
            'contactada' => ['action' => 'Contactar cliente / Esperando confirmación', 'tagColor' => 'purple', 'label' => 'Contactada'],
            'cerrada_exito' => ['action' => '✓ Confirmada y cerrada (Venta/Baja)', 'tagColor' => 'gray', 'label' => 'Cerrada con éxito'],
            'cerrada_desestimada' => ['action' => '✕ Desestimada / Sin disponibilidad', 'tagColor' => 'gray', 'label' => 'Desestimada']
        ];

        if (!empty($input['status']) && isset($validStates[$input['status']])) {
            $newStatus = $input['status'];
            $updates['status'] = $newStatus;
            $updates['action'] = $validStates[$newStatus]['action'];
            $updates['tagColor'] = $validStates[$newStatus]['tagColor'];
            $auditDetails[] = "Estado cambiado a '{$validStates[$newStatus]['label']}'";
        }

        if (isset($input['notes'])) {
            $updates['notes'] = htmlspecialchars(trim($input['notes']), ENT_QUOTES, 'UTF-8');
            $auditDetails[] = "Notas internas actualizadas";
        }

        if (isset($input['action']) && empty($input['status'])) {
            $updates['action'] = htmlspecialchars(trim($input['action']), ENT_QUOTES, 'UTF-8');
        }

        if (empty($updates)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'No se enviaron campos válidos para actualizar']);
            exit;
        }

        $updated = DB::update('requests', $id, $updates);

        // Registro de auditoría
        $detailsText = implode(', ', $auditDetails);
        if (!empty($input['comment'])) {
            $detailsText .= ' — Nota: ' . htmlspecialchars(trim($input['comment']), ENT_QUOTES, 'UTF-8');
        }
        DB::logAudit('request', $id, 'update', $user['name'] ?? 'Operador CAT', $detailsText);

        echo json_encode([
            'success' => true,
            'message' => 'Solicitud actualizada correctamente',
            'data' => $updated
        ], JSON_UNESCAPED_UNICODE);
        exit;

    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Método no permitido']);
        exit;
}
