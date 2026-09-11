<?php
/**
 * Suite de Pruebas Automatizadas de Backend y Seguridad · DESGUACE
 * Usa streams nativos de PHP (sin dependencia de cURL)
 */

$baseUrl = 'http://127.0.0.1:8001';
$currentSessionCookie = '';

echo "=== INICIANDO TEST SUITE DESGUACE ===\n\n";

function request($method, $url, $data = null, $useAuthCookie = false) {
    global $currentSessionCookie;

    $headers = [
        "Content-Type: application/json",
        "Accept: application/json"
    ];

    if ($useAuthCookie && !empty($currentSessionCookie)) {
        $headers[] = "Cookie: $currentSessionCookie";
    }

    $opts = [
        'http' => [
            'method' => $method,
            'header' => implode("\r\n", $headers),
            'ignore_errors' => true,
            'timeout' => 5
        ]
    ];

    if ($data !== null) {
        $opts['http']['content'] = is_string($data) ? $data : json_encode($data);
    }

    $context = stream_context_create($opts);
    $response = @file_get_contents($url, false, $context);
    
    // Extraer código HTTP y cookies de $http_response_header
    $httpCode = 0;
    if (isset($http_response_header)) {
        foreach ($http_response_header as $hdr) {
            if (preg_match('#^HTTP/\S+\s+(\d+)#', $hdr, $m)) {
                $httpCode = (int)$m[1];
            }
            if (preg_match('/^Set-Cookie:\s*([^;]+)/i', $hdr, $m)) {
                $currentSessionCookie = $m[1];
            }
        }
    }

    return [
        'code' => $httpCode,
        'body' => json_decode($response, true) ?: $response
    ];
}

$passed = 0;
$failed = 0;

function assertTest($description, $condition, $details = '') {
    global $passed, $failed;
    if ($condition) {
        echo "✓ PASS: $description\n";
        $passed++;
    } else {
        echo "❌ FAIL: $description ($details)\n";
        $failed++;
    }
}

// 1. Test Endpoint de Salud y Versión
$res = request('GET', "$baseUrl/api/version.php");
assertTest("GET /api/version.php devuelve HTTP 200 y status 'operational'", 
    $res['code'] === 200 && ($res['body']['status'] ?? '') === 'operational', 
    json_encode($res));

// 2. Test Creación de Solicitud Pública (desde index.html)
$newReqPayload = [
    'part' => 'Alternador 150A Valeo',
    'vehicle' => 'Seat León 1.9 TDI 2006',
    'person' => 'Carlos Méndez (Taller)',
    'phone' => '677 889 900',
    'channel' => 'Web pública'
];
$res = request('POST', "$baseUrl/api/requests.php", $newReqPayload);
$createdId = $res['body']['data']['id'] ?? null;
assertTest("POST /api/requests.php público crea solicitud persistente (HTTP 201)", 
    $res['code'] === 201 && !empty($createdId), 
    json_encode($res));

// 3. Test Protección del Panel: Acceso a solicitudes sin sesión debe dar 401
$res = request('GET', "$baseUrl/api/requests.php");
assertTest("GET /api/requests.php sin autenticar devuelve HTTP 401 Unauthorized", 
    $res['code'] === 401, 
    "HTTP {$res['code']}");

// 4. Test Login con credenciales erróneas
$res = request('POST', "$baseUrl/api/auth.php?action=login", ['email' => 'admin@desguace.com', 'password' => 'clave_falsa']);
assertTest("POST /api/auth.php con credenciales falsas devuelve HTTP 401", 
    $res['code'] === 401, 
    "HTTP {$res['code']}");

// 5. Test Login con credenciales correctas del CAT
$res = request('POST', "$baseUrl/api/auth.php?action=login", ['email' => 'admin@desguace.com', 'password' => 'Desguace2026!']);
assertTest("POST /api/auth.php con credenciales válidas devuelve HTTP 200 y usuario", 
    $res['code'] === 200 && !empty($res['body']['user']['name']), 
    json_encode($res));

// 6. Test Comprobación de Sesión Activa
$res = request('GET', "$baseUrl/api/auth.php?action=check", null, true);
assertTest("GET /api/auth.php?action=check reconoce sesión autenticada", 
    $res['code'] === 200 && ($res['body']['authenticated'] ?? false) === true, 
    json_encode($res));

// 7. Test Obtención de Solicitudes Autenticado (debe contener la recién creada)
$res = request('GET', "$baseUrl/api/requests.php", null, true);
$foundCreated = false;
if (!empty($res['body']['data']) && is_array($res['body']['data'])) {
    foreach ($res['body']['data'] as $r) {
        if (($r['id'] ?? '') === $createdId) {
            $foundCreated = true;
            break;
        }
    }
}
assertTest("GET /api/requests.php autenticado lista solicitudes y contiene la creada (#$createdId)", 
    $res['code'] === 200 && $foundCreated, 
    "Total: " . count($res['body']['data'] ?? []));

// 8. Test Transición de Estado y Registro de Auditoría
$patchPayload = [
    'id' => $createdId,
    'status' => 'presupuestada',
    'notes' => 'Comprobada referencia Valeo en almacén. Presupuesto de 75€ ofrecido.',
    'price_quote' => '75€'
];
$res = request('PATCH', "$baseUrl/api/requests.php", $patchPayload, true);
assertTest("PATCH /api/requests.php actualiza estado a 'presupuestada' (HTTP 200)", 
    $res['code'] === 200 && ($res['body']['data']['status'] ?? '') === 'presupuestada', 
    json_encode($res));

// 9. Test Verificación de Auditoría en Solicitud
$res = request('GET', "$baseUrl/api/requests.php?id=$createdId", null, true);
$hasAudit = !empty($res['body']['audit']) && count($res['body']['audit']) >= 2;
assertTest("Auditoría: La solicitud registra eventos de creación y cambio de estado", 
    $hasAudit, 
    "Audit entries: " . count($res['body']['audit'] ?? []));

// 10. Test Estadísticas Dinámicas Reales
$res = request('GET', "$baseUrl/api/stats.php", null, true);
$kpis = $res['body']['kpis'] ?? [];
assertTest("GET /api/stats.php devuelve KPIs calculados de la BD real", 
    $res['code'] === 200 && isset($kpis['total_requests']) && isset($kpis['conversion_rate']), 
    json_encode($kpis));

// 11. Test Alta de Pieza en Inventario
$partPayload = [
    'name' => 'Faro antiniebla derecho Bosch',
    'vehicle' => 'Volkswagen Golf VII',
    'category' => 'Óptica',
    'price' => 35.0,
    'location' => 'Pasillo B · Estantería 02 · Balda 1'
];
$res = request('POST', "$baseUrl/api/inventory.php", $partPayload, true);
assertTest("POST /api/inventory.php registra nueva pieza en stock", 
    $res['code'] === 201 && !empty($res['body']['data']['id']), 
    json_encode($res));

// 12. Test Registro de Vehículo CAT
$vehPayload = [
    'plate' => '7732-KRP',
    'make_model' => 'Audi A4 2.0 TDI Avant',
    'year' => 2015,
    'status' => 'Recibido en campa',
    'baja_dgt' => 'Pendiente trámite',
    'notes' => 'Vehículo completo para despiece.'
];
$res = request('POST', "$baseUrl/api/vehicles.php", $vehPayload, true);
assertTest("POST /api/vehicles.php registra vehículo en el CAT", 
    $res['code'] === 201 && !empty($res['body']['data']['id']), 
    json_encode($res));

// 13. Test Logout y Revocación de Acceso
$res = request('POST', "$baseUrl/api/auth.php?action=logout", null, true);
assertTest("POST /api/auth.php?action=logout destruye la sesión", 
    $res['code'] === 200 && ($res['body']['success'] ?? false) === true, 
    json_encode($res));

$res = request('GET', "$baseUrl/api/requests.php", null, true);
assertTest("Tras logout, GET /api/requests.php vuelve a dar 401 Unauthorized", 
    $res['code'] === 401, 
    "HTTP {$res['code']}");

echo "\n=========================================\n";
echo "RESULTADOS: $passed APROBADAS, $failed FALLIDAS\n";
echo "=========================================\n";

exit($failed > 0 ? 1 : 0);
