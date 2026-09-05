<?php
session_start();
header('Content-Type: application/json');
ob_start();

error_reporting(0);
ini_set('display_errors', 0);

if (!isset($_SESSION['admin'])) {
    ob_clean();
    echo json_encode(['success' => false, 'message' => 'Silakan login admin']);
    exit;
}

$id = $_GET['id'] ?? '';
$type = $_GET['type'] ?? 'photos';
$dataFile = __DIR__ . "/data/{$type}.json";

if (!$id || !file_exists($dataFile)) {
    ob_clean();
    echo json_encode(['success' => false, 'message' => 'Data tidak ditemukan']);
    exit;
}

$db = json_decode(file_get_contents($dataFile), true) ?: [];
$newDb = [];
$itemToDelete = null;

foreach ($db as $item) {
    if (strval($item['id']) === strval($id)) {
        $itemToDelete = $item;
    } else {
        $newDb[] = $item;
    }
}

if ($itemToDelete) {
    $fileUrl = $itemToDelete['url'] ?? ($itemToDelete['photoUrl'] ?? '');
    if ($fileUrl && file_exists(__DIR__ . '/' . $fileUrl)) {
        @unlink(__DIR__ . '/' . $fileUrl);
    }
    
    file_put_contents($dataFile, json_encode($newDb, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), LOCK_EX);
    ob_clean();
    echo json_encode(['success' => true]);
} else {
    ob_clean();
    echo json_encode(['success' => false, 'message' => 'ID tidak ditemukan']);
}
exit;
