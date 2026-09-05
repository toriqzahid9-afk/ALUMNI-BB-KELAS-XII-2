<?php
session_start();
// Fix session key to match api.php and hapus.php
if (!isset($_SESSION['admin']) || $_SESSION['admin'] !== true) {
    header('Location: index.html');
    exit;
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard | SMA Bina Bhakti</title>
    <link href="https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css" rel="stylesheet">
    <link rel="stylesheet" href="style.css">
    <style>
        .admin-dashboard {
            padding: 100px 0;
            min-height: 100vh;
            background: var(--bg-black);
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 50px;
        }
        .stat-card {
            background: var(--bg-surface);
            padding: 30px;
            border: 1px solid var(--accent-gold);
            text-align: center;
        }
        .stat-number {
            font-size: 32px;
            color: var(--accent-gold);
            display: block;
            margin-top: 10px;
        }
        .admin-nav {
            margin-bottom: 30px;
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
        }
        .logout-btn {
            background: #e74c3c;
            color: white;
            border: none;
            padding: 10px 20px;
            cursor: pointer;
            text-decoration: none;
            font-size: 12px;
            letter-spacing: 2px;
            border-radius: 4px;
        }
        
        .manage-section {
            margin-top: 50px;
            background: var(--bg-surface);
            padding: 30px;
            border: 1px solid rgba(197,160,89,0.3);
            border-radius: 8px;
        }
        .manage-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            border-bottom: 1px solid var(--accent-gold);
            padding-bottom: 10px;
        }
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        .data-table th, .data-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .data-table th {
            color: var(--accent-gold);
            font-weight: 600;
            font-size: 14px;
            text-transform: uppercase;
        }
        .data-table img {
            width: 50px;
            height: 50px;
            object-fit: cover;
            border-radius: 4px;
        }
        .btn-del-small {
            background: #e74c3c;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }
        .btn-del-small:hover {
            background: #c0392b;
        }
        .btn-edit-small {
            background: var(--accent-gold);
            color: #000;
            border: none;
            padding: 5px 10px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            margin-right: 5px;
            font-weight: 600;
        }
        .btn-edit-small:hover {
            background: #e6b800;
        }
        .tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        .tab-btn {
            background: transparent;
            border: 1px solid var(--accent-gold);
            color: var(--accent-gold);
            padding: 8px 16px;
            cursor: pointer;
            border-radius: 4px;
            font-size: 12px;
        }
        .tab-btn.active {
            background: var(--accent-gold);
            color: black;
        }
        .admin-modal {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.85);
            z-index: 9999;
            justify-content: center;
            align-items: center;
        }
        .admin-modal-content {
            background: var(--bg-surface);
            border: 1px solid var(--accent-gold);
            padding: 30px;
            border-radius: 12px;
            width: 90%;
            max-width: 450px;
            position: relative;
        }
    </style>
</head>
<body>
    <div class="admin-dashboard">
        <div class="container">
            <div class="section-title">
                <span class="section-badge">CONTROL PANEL</span>
                <h2 class="serif-title">Admin Dashboard</h2>
                <div class="title-line"></div>
            </div>

            <div class="admin-nav">
                <a href="index.html" class="btn-outline-gold">KEMBALI KE WEB</a>
                <a href="logout.php" class="logout-btn">LOGOUT ADMIN</a>
            </div>

            <div class="stats-grid" id="stats-grid">
                <div class="stat-card">
                    <i class='bx bx-image' style="font-size: 30px; color: var(--accent-gold);"></i>
                    <h3>Total Foto</h3>
                    <span class="stat-number" id="count-photos">...</span>
                </div>
                <div class="stat-card">
                    <i class='bx bx-user' style="font-size: 30px; color: var(--accent-gold);"></i>
                    <h3>Anggota</h3>
                    <span class="stat-number" id="count-family">...</span>
                </div>
                <div class="stat-card">
                    <i class='bx bx-message-square-detail' style="font-size: 30px; color: var(--accent-gold);"></i>
                    <h3>Pesan</h3>
                    <span class="stat-number" id="count-quotes">...</span>
                </div>
            </div>

            <div class="manage-section">
                <div class="manage-header">
                    <h3>Kelola Konten</h3>
                </div>
                
                <div class="tabs">
                    <button class="tab-btn active" onclick="switchTab('photos', this)">FOTO GALERI</button>
                    <button class="tab-btn" onclick="switchTab('family', this)">ANGGOTA KELUARGA</button>
                    <button class="tab-btn" onclick="switchTab('quotes', this)">PESAN & KESAN</button>
                </div>

                <div id="table-container">
                    <table class="data-table">
                        <thead>
                            <tr id="table-head">
                                <!-- Dynamic -->
                            </tr>
                        </thead>
                        <tbody id="table-body">
                            <!-- Dynamic -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal Edit Foto Profil Anggota di Admin Dashboard -->
    <div id="adminEditModal" class="admin-modal">
        <div class="admin-modal-content">
            <button onclick="closeAdminEditModal()" style="position: absolute; top: 15px; right: 15px; background: none; border: none; color: #fff; font-size: 24px; cursor: pointer;">&times;</button>
            <h3 style="color: var(--accent-gold); margin-bottom: 15px;">Ganti Foto Profil Anggota</h3>
            <form id="adminEditForm" onsubmit="submitAdminEdit(event)">
                <input type="hidden" id="adminEditId">
                <div style="margin-bottom: 15px;">
                    <label style="display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 5px;">Nama Anggota:</label>
                    <input type="text" id="adminEditName" required class="gold-input" style="width: 100%; box-sizing: border-box;">
                </div>
                <div style="text-align: center; margin-bottom: 15px;">
                    <img id="adminEditPreview" src="" style="width: 90px; height: 90px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent-gold);">
                    <p style="font-size: 11px; color: var(--text-muted); margin-top: 5px;">Foto Saat Ini</p>
                </div>
                <div style="margin-bottom: 20px;">
                    <label style="display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 5px;">Pilih File Foto Baru (JPG/PNG/HEIC):</label>
                    <input type="file" id="adminEditFile" accept="image/*" onchange="previewAdminFile(this)" style="color: #fff; font-size: 13px;">
                </div>
                <button type="submit" class="btn-solid-gold" style="width: 100%; cursor: pointer; border-radius: 4px; padding: 12px;">SIMPAN PERUBAHAN</button>
            </form>
        </div>
    </div>

    <script>
        let currentType = 'photos';
        let allData = {
            photos: [],
            family: [],
            quotes: []
        };

        async function loadData() {
            const t = Date.now();
            try {
                const [p, f, q] = await Promise.all([
                    fetch('api.php?type=photos&t=' + t).then(r => r.json()),
                    fetch('api.php?type=family&t=' + t).then(r => r.json()),
                    fetch('api.php?type=quotes&t=' + t).then(r => r.json())
                ]);
                
                allData.photos = p;
                allData.family = f;
                allData.quotes = q;

                document.getElementById('count-photos').innerText = p.length;
                document.getElementById('count-family').innerText = f.length;
                document.getElementById('count-quotes').innerText = q.length;

                renderTable();
            } catch (e) {
                console.error(e);
            }
        }

        function switchTab(type, btn) {
            currentType = type;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderTable();
        }

        function renderTable() {
            const head = document.getElementById('table-head');
            const body = document.getElementById('table-body');
            const data = allData[currentType];

            body.innerHTML = '';
            
            if (currentType === 'quotes') {
                head.innerHTML = `
                    <th>Nama</th>
                    <th>Pesan</th>
                    <th style="width: 100px;">Aksi</th>
                `;
                data.forEach(item => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${item.name || 'Anonim'}</td>
                        <td style="font-style: italic;">"${item.message}"</td>
                        <td><button class="btn-del-small" onclick="deleteItem('${item.id}')">Hapus</button></td>
                    `;
                    body.appendChild(tr);
                });
            } else if (currentType === 'family') {
                head.innerHTML = `
                    <th>Foto Profil</th>
                    <th>Nama Lengkap</th>
                    <th style="width: 180px;">Aksi</th>
                `;
                data.forEach(item => {
                    const tr = document.createElement('tr');
                    const imgUrl = item.url || item.photoUrl;
                    const safeName = (item.name || '').replace(/'/g, "\\'");
                    tr.innerHTML = `
                        <td><img src="${imgUrl}" style="border-radius: 50%; width: 50px; height: 50px; border: 1px solid var(--accent-gold);" onerror="this.src='https://via.placeholder.com/50'"></td>
                        <td><strong>${item.name || 'Anonim'}</strong></td>
                        <td>
                            <button class="btn-edit-small" onclick="openAdminEditModal('${item.id}', '${safeName}', '${imgUrl}')"><i class='bx bx-camera'></i> Ganti Foto</button>
                            <button class="btn-del-small" onclick="deleteItem('${item.id}')">Hapus</button>
                        </td>
                    `;
                    body.appendChild(tr);
                });
            } else {
                head.innerHTML = `
                    <th>Preview</th>
                    <th>Tanggal</th>
                    <th style="width: 100px;">Aksi</th>
                `;
                data.forEach(item => {
                    const tr = document.createElement('tr');
                    const imgUrl = item.url || item.photoUrl;
                    tr.innerHTML = `
                        <td><img src="${imgUrl}" onerror="this.src='https://via.placeholder.com/50'"></td>
                        <td>${item.date || '-'}</td>
                        <td><button class="btn-del-small" onclick="deleteItem('${item.id}')">Hapus</button></td>
                    `;
                    body.appendChild(tr);
                });
            }
            
            if (data.length === 0) {
                body.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 20px;">Belum ada data.</td></tr>';
            }
        }

        function openAdminEditModal(id, name, currentPhoto) {
            document.getElementById('adminEditId').value = id;
            document.getElementById('adminEditName').value = name;
            document.getElementById('adminEditPreview').src = currentPhoto || 'https://via.placeholder.com/90';
            document.getElementById('adminEditFile').value = '';
            document.getElementById('adminEditModal').style.display = 'flex';
        }

        function closeAdminEditModal() {
            document.getElementById('adminEditModal').style.display = 'none';
        }

        function previewAdminFile(input) {
            if (input.files && input.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById('adminEditPreview').src = e.target.result;
                };
                reader.readAsDataURL(input.files[0]);
            }
        }

        async function submitAdminEdit(e) {
            e.preventDefault();
            const id = document.getElementById('adminEditId').value;
            const name = document.getElementById('adminEditName').value;
            const fileInput = document.getElementById('adminEditFile');
            const file = fileInput.files ? fileInput.files[0] : null;

            const fd = new FormData();
            fd.append('id', id);
            if (name) fd.append('name', name);
            if (file) fd.append('photo', file);

            try {
                const res = await fetch('api.php?action=edit_family', {
                    method: 'POST',
                    body: fd
                });
                const result = await res.json();
                if (result.success) {
                    alert('Foto profil / data anggota berhasil diperbarui!');
                    closeAdminEditModal();
                    loadData();
                } else {
                    alert('Gagal: ' + (result.message || 'Error tidak diketahui'));
                }
            } catch (err) {
                alert('Terjadi kesalahan jaringan/server.');
            }
        }

        async function deleteItem(id) {
            if (!confirm('Yakin ingin menghapus data ini secara permanen?')) return;
            
            try {
                const t = Date.now();
                const res = await fetch(`api.php?action=delete&type=${currentType}&id=${id}&t=${t}`);
                const result = await res.json();
                
                if (result.success) {
                    alert('Data berhasil dihapus');
                    loadData();
                } else {
                    alert('Gagal: ' + (result.message || 'Terjadi kesalahan'));
                }
            } catch (e) {
                alert('Terjadi kesalahan sistem');
            }
        }

        loadData();
    </script>
</body>
</html>
