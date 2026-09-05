<?php
session_start();
error_reporting(0);
ini_set('display_errors', 0);
ini_set('log_errors', 0);

// Konfigurasi Path
define('DATA_DIR', __DIR__ . '/data/');
define('UPLOAD_DIR', __DIR__ . '/assets/uploads/');

// Buat folder jika belum ada
if (!is_dir(DATA_DIR)) mkdir(DATA_DIR, 0755, true);
if (!is_dir(UPLOAD_DIR)) mkdir(UPLOAD_DIR, 0755, true);

$type = $_GET['type'] ?? '';
$action = $_GET['action'] ?? '';

ob_start();
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');

// 1. FUNGSI AMBIL DATA
function getData($file) {
    $path = DATA_DIR . $file . '.json';
    clearstatcache(true, $path);
    if (!file_exists($path)) return [];
    return json_decode(file_get_contents($path), true) ?: [];
}

// 2. FUNGSI SIMPAN DATA (ANTI-CORRUPT)
function saveData($file, $data) {
    $path = DATA_DIR . $file . '.json';
    
    // Pastikan data adalah array
    if (!is_array($data) && $file !== 'walikelas') $data = [];
    
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
    // Gunakan locking untuk mencegah file rusak saat diakses bersamaan
    return file_put_contents($path, $json, LOCK_EX);
}

// 3. LOGIKA API
if ($action === 'login') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (($data['pin'] ?? '') === '130408') {
        $_SESSION['admin'] = true;
        if (ob_get_length()) ob_clean();
        echo json_encode(['success' => true]);
    } else {
        if (ob_get_length()) ob_clean();
        echo json_encode(['success' => false, 'message' => 'PIN Salah']);
    }
    exit;
}

if ($action === 'logout') {
    session_destroy();
    if (ob_get_length()) ob_clean();
    echo json_encode(['success' => true]);
    exit;
}

if ($action === 'check_admin') {
    if (ob_get_length()) ob_clean();
    echo json_encode(['isAdmin' => isset($_SESSION['admin'])]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && !empty($type) && empty($action)) {
    if (ob_get_length()) ob_clean();
    echo json_encode(getData($type));
    exit;
}

// UPLOAD DATA (POST)
if ($action === 'upload') {
    if (!isset($_FILES['photo'])) {
        if (ob_get_length()) ob_clean();
        echo json_encode(['success' => false, 'message' => 'Tidak ada file']);
        exit;
    }

    $file = $_FILES['photo'];
    $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = 'memori-' . time() . '-' . rand(1000, 9999) . '.' . $ext;
    $target = UPLOAD_DIR . $filename;

    if (move_uploaded_file($file['tmp_name'], $target)) {
        $dataType = $_GET['type'] ?? 'photos'; 
        $db = getData($dataType);
        
        $entry = [
            'id' => time() . rand(100, 999),
            'url' => 'assets/uploads/' . $filename,
            'date' => date('d/m/Y'),
            'status' => 'approved'
        ];

        if ($dataType === 'family' || $dataType === 'walikelas') {
            $entry['name'] = $_POST['name'] ?? 'Anonim';
        } else {
            $entry['uploader'] = $_POST['uploader'] ?? 'User';
        }

        if ($dataType === 'walikelas') {
            $existing = getData('walikelas');
            if (!empty($existing['url'])) {
                if (ob_get_length()) ob_clean();
                echo json_encode(['success' => false, 'message' => 'Foto sudah ada. Hapus dulu lewat Admin!']);
                exit;
            }
            saveData('walikelas', $entry);
        } else {
            $db[] = $entry;
            saveData($dataType, $db);
        }

        if (ob_get_length()) ob_clean();
        echo json_encode(['success' => true, 'url' => $entry['url']]);
    } else {
        if (ob_get_length()) ob_clean();
        echo json_encode(['success' => false, 'message' => 'Gagal simpan file']);
    }
    exit;
}

// TAMBAH PESAN (POST)
if ($action === 'quotes') {
    $data = json_decode(file_get_contents('php://input'), true);
    $db = getData('quotes');
    $db[] = [
        'id' => time() . rand(100, 999),
        'name' => $data['name'] ?? 'Anonim',
        'message' => $data['message'] ?? ''
    ];
    saveData('quotes', $db);
    if (ob_get_length()) ob_clean();
    echo json_encode(['success' => true]);
    exit;
}

// EDIT PROFIL / GANTI FOTO ANGGOTA KELUARGA (POST)
if ($action === 'edit_family') {
    if (!isset($_SESSION['admin'])) {
        http_response_code(403);
        if (ob_get_length()) ob_clean();
        echo json_encode(['success' => false, 'message' => 'Unauthorized: Silakan login admin']);
        exit;
    }

    $id = $_POST['id'] ?? ($_GET['id'] ?? '');
    if (!$id) {
        if (ob_get_length()) ob_clean();
        echo json_encode(['success' => false, 'message' => 'ID Anggota tidak valid']);
        exit;
    }

    $db = getData('family');
    $foundIndex = -1;
    for ($i = 0; $i < count($db); $i++) {
        if (strval($db[$i]['id']) === strval($id)) {
            $foundIndex = $i;
            break;
        }
    }

    if ($foundIndex === -1) {
        if (ob_get_length()) ob_clean();
        echo json_encode(['success' => false, 'message' => 'Anggota keluarga tidak ditemukan']);
        exit;
    }

    // Update Nama jika dikirim
    if (isset($_POST['name']) && trim($_POST['name']) !== '') {
        $db[$foundIndex]['name'] = trim($_POST['name']);
    }

    // Jika ada upload foto baru
    if (isset($_FILES['photo']) && $_FILES['photo']['error'] === UPLOAD_ERR_OK) {
        $file = $_FILES['photo'];
        $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = 'memori-' . time() . '-' . rand(1000, 9999) . '.' . $ext;
        $target = UPLOAD_DIR . $filename;

        if (move_uploaded_file($file['tmp_name'], $target)) {
            // Hapus foto lama jika ada
            $oldUrl = $db[$foundIndex]['url'] ?? ($db[$foundIndex]['photoUrl'] ?? '');
            if ($oldUrl) {
                $oldPath = __DIR__ . '/' . $oldUrl;
                if (file_exists($oldPath)) {
                    @unlink($oldPath);
                }
            }
            $db[$foundIndex]['url'] = 'assets/uploads/' . $filename;
        } else {
            if (ob_get_length()) ob_clean();
            echo json_encode(['success' => false, 'message' => 'Gagal menyimpan file foto baru']);
            exit;
        }
    }

    if (saveData('family', $db)) {
        clearstatcache();
        if (ob_get_length()) ob_clean();
        echo json_encode([
            'success' => true,
            'message' => 'Foto profil berhasil diperbarui',
            'member' => $db[$foundIndex]
        ]);
    } else {
        if (ob_get_length()) ob_clean();
        echo json_encode(['success' => false, 'message' => 'Gagal memperbarui data']);
    }
    exit;
}

// HAPUS DATA (DELETE / GET dengan key)
if ($action === 'delete') {
    $id = $_GET['id'] ?? '';
    $type = $_GET['type'] ?? '';

    if (!$id || !$type) {
        if (ob_get_length()) ob_clean();
        echo json_encode(['success' => false, 'message' => 'ID atau Type tidak valid']);
        exit;
    }

    $db = getData($type);
    if ($type === 'walikelas') {
        $itemToDelete = $db;
    } else {
        foreach ($db as $item) {
            if (strval($item['id']) === strval($id)) {
                $itemToDelete = $item;
            } else {
                $newDb[] = $item;
            }
        }
    }

    if (!$itemToDelete || ($type === 'walikelas' && empty($itemToDelete['url']))) {
        if (ob_get_length()) ob_clean();
        echo json_encode(['success' => false, 'message' => 'Data tidak ditemukan di database']);
        exit;
    }

    // KEAMANAN: Admin bisa hapus apapun.
    if (!isset($_SESSION['admin'])) {
        http_response_code(403);
        if (ob_get_length()) ob_clean();
        echo json_encode(['success' => false, 'message' => 'Unauthorized: Silakan login admin']);
        exit;
    }

    // Eksekusi Hapus Fisik
    $fileUrl = $itemToDelete['url'] ?? ($itemToDelete['photoUrl'] ?? '');
    if ($fileUrl) {
        $fullPath = __DIR__ . '/' . $fileUrl;
        if (file_exists($fullPath)) {
            @unlink($fullPath);
        }
    }

    $finalData = ($type === 'walikelas') ? [] : $newDb;
    if (saveData($type, $finalData)) {
        clearstatcache();
        if (ob_get_length()) ob_clean();
        echo json_encode(['success' => true]);
    } else {
        if (ob_get_length()) ob_clean();
        echo json_encode(['success' => false, 'message' => 'Gagal mengupdate database JSON']);
    }
    exit;
}
