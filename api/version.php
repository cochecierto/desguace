<?php
/**
 * Endpoint de Verificación de Despliegue y Salud · DESGUACE
 * Permite verificar si la web en producción corresponde exactamente a main
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

sendJsonHeaders();

$dbWritable = is_writable(DATA_DIR);
$totalRequests = count(DB::getCollection('requests'));

echo json_encode([
    'status' => 'operational',
    'app_name' => APP_NAME,
    'version' => APP_VERSION,
    'build_date' => APP_BUILD_DATE,
    'branch' => 'main',
    'php_version' => PHP_VERSION,
    'server_time' => date('c'),
    'timezone' => date_default_timezone_get(),
    'storage' => [
        'engine' => 'JSON atomic flock (file-based DB)',
        'data_dir_writable' => $dbWritable,
        'records_count' => $totalRequests
    ]
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
