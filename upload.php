<?php
session_start();
header('Content-Type: application/json');
ob_start();

// Matikan semua error agar tidak mengganggu JSON
error_reporting(0);
ini_set('display_errors', 0);

$type = $_GET['type'] ?? 'photos';
$uploadDir = __DIR__ . '/assets/uploads/';
$dataFile = __DIR__ . "/data/{$type}.json";

if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['photo'])) {
    $file = $_FILES['photo'];
    $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = 'memori-' . time() . '-' . rand(1000, 9999) . '.' . $ext;
    $target = $uploadDir . $filename;

    if (move_uploaded_file($file['tmp_name'], $target)) {
        // Ambil data lama
        $db = [];
        if (file_exists($dataFile)) {
            $db = json_decode(file_get_contents($dataFile), true) ?: [];
        }

        $entry = [
            'id' => time() . rand(100, 999),
            'url' => 'assets/uploads/' . $filename,
            'date' => date('d/m/Y'),
            'status' => 'approved'
        ];

        if ($type === 'family' || $type === 'walikelas') {
            $entry['name'] = $_POST['name'] ?? 'Anonim';
        } else {
            $entry['uploader'] = $_POST['uploader'] ?? 'User';
        }

        // Simpan data
        if ($type === 'walikelas') {
            $existing = [];
            if (file_exists($dataFile)) {
                $existing = json_decode(file_get_contents($dataFile), true) ?: [];
            }
            if (!empty($existing['url'])) {
                if (ob_get_length()) ob_clean();
                echo json_encode(['success' => false, 'message' => 'Foto sudah ada. Hapus dulu lewat Admin!']);
                exit;
            }
            $finalData = $entry;
        } else {
            $db[] = $entry;
            $finalData = $db;
        }

        file_put_contents($dataFile, json_encode($finalData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), LOCK_EX);
        
        if (ob_get_length()) ob_clean();
        echo json_encode(['success' => true, 'url' => $entry['url']]);
    } else {
        if (ob_get_length()) ob_clean();
        echo json_encode(['success' => false, 'message' => 'Gagal simpan file']);
    }
}
exit;
