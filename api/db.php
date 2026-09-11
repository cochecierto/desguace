<?php
/**
 * Capa de persistencia segura para DESGUACE
 * Almacenamiento JSON atómico con bloqueo exclusivo (flock)
 * Soporta transacciones concurrentes sin dependencias de extensiones externas
 */

require_once __DIR__ . '/config.php';

class DB {
    private static function getFilePath(string $collection): string {
        return DATA_DIR . '/' . preg_replace('/[^a-zA-Z0-9_-]/', '', $collection) . '.json';
    }

    /**
     * Obtiene una colección completa con bloqueo compartido
     */
    public static function getCollection(string $collection): array {
        self::ensureInitialized($collection);
        $file = self::getFilePath($collection);

        if (!file_exists($file)) {
            return [];
        }

        $fp = fopen($file, 'r');
        if (!$fp) return [];

        flock($fp, LOCK_SH);
        $content = stream_get_contents($fp);
        flock($fp, LOCK_UN);
        fclose($fp);

        $data = json_decode($content, true);
        return is_array($data) ? $data : [];
    }

    /**
     * Guarda una colección completa con bloqueo exclusivo
     */
    public static function saveCollection(string $collection, array $items): bool {
        $file = self::getFilePath($collection);
        $fp = fopen($file, 'c+');
        if (!$fp) return false;

        if (flock($fp, LOCK_EX)) {
            ftruncate($fp, 0);
            rewind($fp);
            fwrite($fp, json_encode(array_values($items), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            fflush($fp);
            flock($fp, LOCK_UN);
            fclose($fp);
            return true;
        }

        fclose($fp);
        return false;
    }

    /**
     * Busca elementos que cumplan una condición
     */
    public static function find(string $collection, callable $filter): array {
        $items = self::getCollection($collection);
        return array_values(array_filter($items, $filter));
    }

    /**
     * Busca un elemento por su ID
     */
    public static function findById(string $collection, string $id): ?array {
        $items = self::getCollection($collection);
        foreach ($items as $item) {
            if (isset($item['id']) && (string)$item['id'] === (string)$id) {
                return $item;
            }
        }
        return null;
    }

    /**
     * Inserta un nuevo elemento con timestamp
     */
    public static function insert(string $collection, array $record): array {
        self::ensureInitialized($collection);
        $file = self::getFilePath($collection);
        $fp = fopen($file, 'c+');
        if (!$fp) throw new Exception("No se pudo abrir el almacenamiento");

        $inserted = null;
        if (flock($fp, LOCK_EX)) {
            $content = stream_get_contents($fp);
            $items = json_decode($content, true) ?: [];

            if (empty($record['id'])) {
                $prefix = strtoupper(substr($collection, 0, 3));
                $record['id'] = $prefix . '-' . (count($items) + 101);
            }
            if (empty($record['created_at'])) {
                $record['created_at'] = date('c');
            }
            $record['updated_at'] = date('c');

            // Colocar los nuevos al principio para orden cronológico descendente
            array_unshift($items, $record);
            $inserted = $record;

            ftruncate($fp, 0);
            rewind($fp);
            fwrite($fp, json_encode(array_values($items), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            fflush($fp);
            flock($fp, LOCK_UN);
        }
        fclose($fp);

        return $inserted ?: $record;
    }

    /**
     * Actualiza un elemento existente por ID
     */
    public static function update(string $collection, string $id, array $updates): ?array {
        self::ensureInitialized($collection);
        $file = self::getFilePath($collection);
        $fp = fopen($file, 'c+');
        if (!$fp) return null;

        $updatedRecord = null;
        if (flock($fp, LOCK_EX)) {
            $content = stream_get_contents($fp);
            $items = json_decode($content, true) ?: [];

            foreach ($items as &$item) {
                if (isset($item['id']) && (string)$item['id'] === (string)$id) {
                    foreach ($updates as $k => $v) {
                        if ($k !== 'id' && $k !== 'created_at') {
                            $item[$k] = $v;
                        }
                    }
                    $item['updated_at'] = date('c');
                    $updatedRecord = $item;
                    break;
                }
            }
            unset($item);

            if ($updatedRecord) {
                ftruncate($fp, 0);
                rewind($fp);
                fwrite($fp, json_encode(array_values($items), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
                fflush($fp);
            }
            flock($fp, LOCK_UN);
        }
        fclose($fp);

        return $updatedRecord;
    }

    /**
     * Registra un evento de auditoría
     */
    public static function logAudit(string $entityType, string $entityId, string $action, string $userName, string $details = ''): array {
        $entry = [
            'id' => 'AUD-' . bin2hex(random_bytes(4)),
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'action' => $action,
            'user_name' => $userName,
            'details' => $details,
            'created_at' => date('c')
        ];
        return self::insert('audit_log', $entry);
    }

    /**
     * Inicializa semillas realistas la primera vez
     */
    private static function ensureInitialized(string $collection): void {
        $file = self::getFilePath($collection);
        if (file_exists($file) && filesize($file) > 4) {
            return;
        }

        $seeds = self::getSeeds($collection);
        if (!empty($seeds)) {
            self::saveCollection($collection, $seeds);
        }
    }

    private static function getSeeds(string $collection): array {
        switch ($collection) {
            case 'requests':
                return [
                    [
                        'id' => 'REQ-101',
                        'part' => 'Alternador 12V 150A',
                        'vehicle' => 'Renault Laguna · 1.9 dCi · 2007',
                        'person' => 'María García',
                        'phone' => '612 345 890',
                        'channel' => 'WhatsApp',
                        'status' => 'nueva',
                        'action' => 'Validar referencia y stock',
                        'notes' => 'Cliente necesita entrega rápida o recogida en mano.',
                        'created_at' => date('c', strtotime('-18 minutes')),
                        'updated_at' => date('c', strtotime('-18 minutes'))
                    ],
                    [
                        'id' => 'REQ-102',
                        'part' => 'Retirada y baja definitiva DGT',
                        'vehicle' => 'Seat Ibiza · 1.4 TDI · 2009',
                        'person' => 'Javier Rodríguez',
                        'phone' => '644 112 233',
                        'channel' => 'Teléfono',
                        'status' => 'en_estudio',
                        'action' => 'Solicitar permiso de circulación y DNI',
                        'notes' => 'Vehículo en garaje comunitario, requiere grúa de plataforma baja.',
                        'created_at' => date('c', strtotime('-45 minutes')),
                        'updated_at' => date('c', strtotime('-25 minutes'))
                    ],
                    [
                        'id' => 'REQ-103',
                        'part' => 'Motor completo 1.6 TDI (ref: CAYC)',
                        'vehicle' => 'Volkswagen Golf VI · 2013',
                        'person' => 'Taller Mecánico Central',
                        'phone' => '910 223 344',
                        'channel' => 'Web pública',
                        'status' => 'presupuestada',
                        'action' => 'Responder oferta con kilometraje verificado',
                        'notes' => 'Motor comprobado con 142.000 km. Presupuesto: 950€ + IVA con garantía.',
                        'created_at' => date('c', strtotime('-3 hours')),
                        'updated_at' => date('c', strtotime('-1 hour'))
                    ]
                ];

            case 'inventory':
                return [
                    [
                        'id' => 'PIE-101',
                        'name' => 'Alternador Valeo 150A TG15C028',
                        'vehicle' => 'Renault Laguna / Mégane / Scénic 1.9 dCi',
                        'category' => 'Electricidad',
                        'price' => 75.00,
                        'location' => 'Pasillo E · Estantería 03 · Balda 2',
                        'status' => 'Disponible',
                        'tested' => true,
                        'created_at' => date('c', strtotime('-2 days'))
                    ],
                    [
                        'id' => 'PIE-102',
                        'name' => 'Faro delantero izquierdo halógeno Valeo',
                        'vehicle' => 'Seat Ibiza IV (6J) 2008-2012',
                        'category' => 'Óptica',
                        'price' => 55.00,
                        'location' => 'Pasillo B · Estantería 01 · Balda 4',
                        'status' => 'Disponible',
                        'tested' => true,
                        'created_at' => date('c', strtotime('-3 days'))
                    ],
                    [
                        'id' => 'PIE-103',
                        'name' => 'Caja de cambios manual 5 vel. JCR',
                        'vehicle' => 'Volkswagen Golf V / Audi A3 1.9 TDI',
                        'category' => 'Transmisión',
                        'price' => 280.00,
                        'location' => 'Pasillo T · Suelo Palet 12',
                        'status' => 'Disponible',
                        'tested' => true,
                        'created_at' => date('c', strtotime('-5 days'))
                    ],
                    [
                        'id' => 'PIE-104',
                        'name' => 'Motor completo 1.6 TDI CAYC 105cv',
                        'vehicle' => 'Volkswagen Golf VI / Seat León 2010-2015',
                        'category' => 'Motor',
                        'price' => 950.00,
                        'location' => 'Bancada Central · Banco M-04',
                        'status' => 'Reservado',
                        'tested' => true,
                        'created_at' => date('c', strtotime('-6 days'))
                    ]
                ];

            case 'vehicles':
                return [
                    [
                        'id' => 'VEH-101',
                        'plate' => '4589-FXG',
                        'make_model' => 'Ford Focus 1.6 TDCi Trend',
                        'year' => 2008,
                        'status' => 'En descontaminación',
                        'entry_date' => date('Y-m-d', strtotime('-2 hours')),
                        'baja_dgt' => 'Tramitada',
                        'notes' => 'Fluidos extraídos. Pendiente desmontar mecánica frontal.'
                    ],
                    [
                        'id' => 'VEH-102',
                        'plate' => '8921-DTL',
                        'make_model' => 'Renault Megane II 1.5 dCi',
                        'year' => 2006,
                        'status' => 'Despiece activo',
                        'entry_date' => date('Y-m-d', strtotime('-1 day')),
                        'baja_dgt' => 'Certificado emitido',
                        'notes' => 'Motor y caja desmontados en banco de pruebas.'
                    ],
                    [
                        'id' => 'VEH-103',
                        'plate' => '1204-HJK',
                        'make_model' => 'Peugeot 308 1.6 HDi',
                        'year' => 2012,
                        'status' => 'Recibido en campa',
                        'entry_date' => date('Y-m-d'),
                        'baja_dgt' => 'Pendiente firma titular',
                        'notes' => 'Golpe lateral derecho, frontal intacto.'
                    ]
                ];

            case 'audit_log':
                return [
                    [
                        'id' => 'AUD-001',
                        'entity_type' => 'request',
                        'entity_id' => 'REQ-103',
                        'action' => 'status_change',
                        'user_name' => 'Operador CAT',
                        'details' => 'Cambio de estado a "Presupuestada". Oferta de 950€ comunicada al taller.',
                        'created_at' => date('c', strtotime('-1 hour'))
                    ],
                    [
                        'id' => 'AUD-002',
                        'entity_type' => 'request',
                        'entity_id' => 'REQ-102',
                        'action' => 'status_change',
                        'user_name' => 'Operador CAT',
                        'details' => 'Cambio de estado a "En estudio". Verificando documentación para baja DGT.',
                        'created_at' => date('c', strtotime('-25 minutes'))
                    ]
                ];

            case 'users':
                return [
                    [
                        'id' => 'USR-1',
                        'email' => DEFAULT_ADMIN_EMAIL,
                        'name' => DEFAULT_ADMIN_NAME,
                        'role' => DEFAULT_ADMIN_ROLE,
                        'password_hash' => DEFAULT_ADMIN_HASH,
                        'created_at' => date('c')
                    ]
                ];

            default:
                return [];
        }
    }
}
