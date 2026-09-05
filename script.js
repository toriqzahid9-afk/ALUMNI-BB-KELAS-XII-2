// Detection environment (lokal atau hosting)
// Detection environment
const isLocal = window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.startsWith('192.168.') ||
    window.location.hostname.startsWith('10.');

// Robust API Base Detection
let API_BASE = 'api.php';
// Gunakan relative path agar otomatis mendeteksi subfolder (localhost/Angkatan 2026/)
// atau root domain saat sudah di-hosting.

const getAdminKey = () => localStorage.getItem('admin_key') || '';

// Global State
const state = {
    photos: [],
    family: [],
    quotes: [],
    walikelas: { name: 'HJ. SITI AMAMAH, SE', url: '' },
    isAdmin: false,
    currentQuoteIndex: 0
};

let currentLightboxIndex = -1;

document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    await checkAdminStatus();
    loadData();
    setupEventListeners();
    initScrollReveal();
    initDragAndDrop();
    updateUIForRole();
});

function checkFamilyRegistration() {
    // Fitur dihapus sesuai request user
    return;
}

/* ===================================================
   ADMIN & SECURITY
   =================================================== */
async function checkAdminStatus() {
    try {
        const res = await fetch(`${API_BASE}?action=check_admin`);
        const result = await safeParseJSON(res);
        state.isAdmin = result.isAdmin;
        if (state.isAdmin) localStorage.setItem('admin_key', 'admin123');
        else localStorage.removeItem('admin_key');
    } catch (e) {
        console.error('Error checking admin:', e);
        state.isAdmin = !!localStorage.getItem('admin_key');
    }
}

const isAdmin = () => state.isAdmin;

async function logoutAdmin() {
    try {
        await fetch(`${API_BASE}?action=logout`);
        localStorage.removeItem('admin_key');
        state.isAdmin = false;
        alert('Admin Logout Berhasil');
        location.reload();
    } catch (e) {
        location.reload();
    }
}

/* ===================================================
   CORE DATA & RENDERING
   =================================================== */
const API = {
    photos: `${API_BASE}?type=photos`,
    family: `${API_BASE}?type=family`,
    quotes: `${API_BASE}?type=quotes`,
    walikelas: `${API_BASE}?type=walikelas`,
    login: `${API_BASE}?action=login`,
    upload: 'api.php?action=upload',
    delete: `${API_BASE}?action=delete`
};

async function loadData() {
    try {
        const t = Date.now();
        const responses = await Promise.all([
            fetch(API.photos + (API.photos.includes('?') ? '&' : '?') + 't=' + t),
            fetch(API.family + (API.family.includes('?') ? '&' : '?') + 't=' + t),
            fetch(API.quotes + (API.quotes.includes('?') ? '&' : '?') + 't=' + t),
            fetch(API.walikelas + (API.walikelas.includes('?') ? '&' : '?') + 't=' + t)
        ]);

        // Validate responses
        for (const res of responses) {
            if (!res.ok) {
                const text = await res.text();
                throw new Error(`HTTP ${res.status} dari ${res.url.split('?')[0]}. Pastikan api.php ada di lokasi yang benar.`);
            }
        }

        state.photos = await safeJson(responses[0]);
        state.family = await safeJson(responses[1]);
        state.quotes = await safeJson(responses[2]);
        const wkData = await safeJson(responses[3]);
        if (wkData) {
            if (Array.isArray(wkData)) {
                if (wkData.length > 0) state.walikelas = wkData[0];
            } else if (Object.keys(wkData).length > 0) {
                state.walikelas = wkData;
            }
        }

        renderAll();
        updateUIForRole();
    } catch (err) {
        console.error('Gagal memuat data:', err);
        const modal = document.createElement('div');
        modal.style = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#1a1a1a;border:2px solid #c5a059;padding:30px;z-index:99999;color:white;text-align:center;border-radius:15px;box-shadow:0 0 50px rgba(0,0,0,1);";
        modal.innerHTML = `
            <h3 style="color:#c5a059;margin-bottom:15px;">Koneksi Database Terganggu</h3>
            <p style="margin-bottom:20px;">Server hosting kamu sedang memblokir request JSON atau file api.php tidak ditemukan di lokasi yang benar.</p>
            <div style="font-size:10px; background:#000; padding:10px; margin-bottom:20px; border:1px solid #333; overflow:auto; max-height:60px;">${err.message}</div>
            <button onclick="location.reload()" style="background:#c5a059;border:none;padding:10px 20px;border-radius:5px;cursor:pointer;font-weight:bold;color:#000;">RELOAD WEBSITE</button>
            <p style="margin-top:15px;font-size:11px;opacity:0.6;">Saran: Jika kamu upload ke InfinityFree, pastikan folder 'data' di-set izinnya (CHMOD) ke 755.</p>
        `;
        document.body.appendChild(modal);
    }
}

// Fungsi bantu universal untuk parsing JSON yang "kotor" (misal ada injeksi HTML dari hosting)
async function safeParseJSON(response) {
    const text = await response.text();
    try {
        const jsonStart = text.search(/[\{\[]/);
        if (jsonStart !== -1) {
            let possibleJson = text.substring(jsonStart);
            const lastBrace = possibleJson.lastIndexOf('}');
            const lastBracket = possibleJson.lastIndexOf(']');
            const lastValidChar = Math.max(lastBrace, lastBracket);
            if (lastValidChar !== -1) {
                possibleJson = possibleJson.substring(0, lastValidChar + 1);
            }
            return JSON.parse(possibleJson);
        }
        throw new Error("Bukan JSON");
    } catch (e) {
        console.error("Parse Error. Server Response:", text);
        throw new Error(text.includes('<html') ? "Server mengembalikan HTML (Kemungkinan diblokir sistem keamanan hosting/InfinityFree)." : "Gagal memproses respon server.");
    }
}

// Fungsi pembantu untuk GET loadData (memberikan fallback array kosong jika error)
async function safeJson(response) {
    try {
        return await safeParseJSON(response);
    } catch (e) {
        console.error("SafeJson Fallback:", e);
        return [];
    }
}

function renderAll() {
    renderGallery();
    renderFamily();
    renderQuotes();
    renderWalikelas();
}

function updateUIForRole() {
    const logoutItem = document.getElementById('adminLogoutItem');
    const uploadBtn = document.getElementById('btnTambahKenangan');

    if (isAdmin()) {
        if (logoutItem) logoutItem.style.display = 'block';
        if (uploadBtn) {
            uploadBtn.innerHTML = '+ TAMBAH KENANGAN (UNLIMITED)';
            uploadBtn.className = 'btn-outline-gold';
            uploadBtn.onclick = () => openModal('uploadModal');
        }
    } else {
        if (logoutItem) logoutItem.style.display = 'none';
        if (uploadBtn) {
            uploadBtn.innerHTML = '+ TAMBAH KENANGAN';
            uploadBtn.className = 'btn-outline-gold';
            uploadBtn.onclick = () => openModal('uploadModal');
        }
    }
}

async function handleDeleteAndReplace() {
    if (confirm('Kamu hanya bisa upload 1 foto. Hapus foto lama untuk mengganti?')) {
        const userPhoto = state.photos.find(p => p.uploader === 'User');
        if (userPhoto) {
            const success = await deleteDataFromServer('photos', userPhoto.id);
            if (success) {
                localStorage.removeItem('has_uploaded');
                loadData();
                openModal('uploadModal');
            }
        } else {
            localStorage.removeItem('has_uploaded');
            openModal('uploadModal');
        }
    }
}

function renderGallery() {
    const track = document.getElementById('gallery-track');
    if (!track) return;
    track.innerHTML = '';

    const photosToRender = isAdmin() ? state.photos : state.photos.filter(p => p.status === 'approved');
    if (photosToRender.length === 0) {
        const container = document.getElementById('gallery-marquee-container');
        if (container) container.innerHTML = '<p class="text-center" style="width: 100%; color: var(--text-muted);">Belum ada kenangan.</p>';
        return;
    }

    // Duplicate photos for seamless marquee loop
    const fullPhotos = [...photosToRender, ...photosToRender];
    while (fullPhotos.length < 16) {
        fullPhotos.push(...photosToRender);
    }

    fullPhotos.forEach((photo) => {
        const originalIndex = photosToRender.findIndex(p => p.id === photo.id);
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.onclick = (e) => {
            if (e.target.closest('.admin-del-btn')) return;
            openLightbox(originalIndex, 'photos');
        };
        item.innerHTML = `
            ${isAdmin() ? `<button class="admin-del-btn" onclick="deleteData('photos', '${photo.id}', event)">&times;</button>` : ''}
            <img src="${photo.url || photo.photoUrl}" alt="Memory">
            <div class="gallery-overlay"></div>
        `;
        track.appendChild(item);
    });
}

function renderFamily() {
    const tracks = [
        document.getElementById('family-track-1'),
        document.getElementById('family-track-2'),
        document.getElementById('family-track-3')
    ];

    if (!tracks[0]) return;

    // Clear tracks
    tracks.forEach(track => { if (track) track.innerHTML = ''; });

    if (state.family.length === 0) {
        const container = document.getElementById('family-marquee-container');
        if (container) container.innerHTML = '<p style="color: var(--text-muted); text-align:center; width:100%;">Belum ada anggota keluarga.</p>';
        return;
    }

    // Distribute members into 3 groups
    const rows = [[], [], []];
    state.family.forEach((member, i) => {
        rows[i % 3].push(member);
    });

    // Render each row twice for seamless marquee
    rows.forEach((row, rowIndex) => {
        const track = tracks[rowIndex];
        if (!track) return;

        // If row is empty, don't render
        if (row.length === 0) return;

        // Combine to make a seamless loop (original + duplicate)
        const fullRow = [...row, ...row];

        // If the row is very short, duplicate more to fill the screen
        if (fullRow.length < 10) {
            while (fullRow.length < 20) {
                fullRow.push(...row);
            }
        }

        fullRow.forEach((member, i) => {
            // Find original index in state.family for lightbox
            const originalIndex = state.family.findIndex(m => m.id === member.id);
            track.appendChild(createFamilyCard(member, originalIndex));
        });
    });
}

function createFamilyCard(member, index) {
    const card = document.createElement('div');
    card.className = 'family-card';
    card.style.cursor = 'pointer';

    card.onclick = (e) => {
        // Jika yang diklik adalah tombol hapus atau edit foto, jangan buka lightbox
        if (e.target.closest('.admin-del-btn') || e.target.closest('.admin-edit-btn')) return;

        // Buka lightbox
        openLightbox(index, 'family', e);
    };

    const photoSrc = member.url || member.photoUrl || '';
    const safeName = (member.name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    card.innerHTML = `
        ${isAdmin() ? `
            <button class="admin-edit-btn" title="Ganti Foto Profil Anggota" onclick="openEditFamilyModal('${member.id}', '${safeName}', '${photoSrc}', event)"><i class='bx bxs-camera'></i></button>
            <button class="admin-del-btn" title="Hapus Anggota" onclick="deleteData('family', '${member.id}', event)">&times;</button>
        ` : ''}
        <div class="family-photo">
            <img src="${photoSrc}" alt="${member.name}" onerror="this.src='https://via.placeholder.com/130'">
        </div>
        <h3>${member.name}</h3>
    `;
    return card;
}

function openEditFamilyModal(id, name, currentPhoto, event) {
    if (event) event.stopPropagation();
    if (!isAdmin()) return;

    const modal = document.getElementById('editFamilyModal');
    if (!modal) return;

    document.getElementById('editFamilyId').value = id;
    document.getElementById('editFamilyName').value = name || '';
    const targetName = document.getElementById('editFamilyTargetName');
    if (targetName) targetName.innerText = name || 'Anggota';

    const currentImg = document.getElementById('editFamilyCurrentImg');
    if (currentImg) {
        currentImg.src = currentPhoto || 'https://via.placeholder.com/110';
    }

    // Reset file input & dropzone
    const input = document.getElementById('editFamilyPhotoFile');
    if (input) {
        input.value = '';
        input._processedFile = null;
        input.removeAttribute('data-processing');
    }
    const dz = document.getElementById('editFamilyDropZone');
    if (dz) {
        dz.innerHTML = `<i class='bx bx-camera' style="font-size: 40px; color: var(--accent-gold); margin-bottom: 12px;"></i><p>Klik untuk memilih foto PP baru</p>`;
        dz.removeAttribute('data-has-file');
    }

    openModal('editFamilyModal');
}

function renderQuotes() {
    const tracks = [
        document.getElementById('quote-track-1'),
        document.getElementById('quote-track-2'),
        document.getElementById('quote-track-3')
    ];

    if (!tracks[0]) return;

    // Clear tracks
    tracks.forEach(track => { if (track) track.innerHTML = ''; });

    if (state.quotes.length === 0) {
        const container = document.getElementById('quotes-marquee-container');
        if (container) container.innerHTML = '<p style="color: var(--text-muted); text-align:center; width:100%;">Belum ada pesan.</p>';
        return;
    }

    // Distribute quotes into 3 groups
    const rows = [[], [], []];
    state.quotes.forEach((quote, i) => {
        rows[i % 3].push(quote);
    });

    // Render each row
    rows.forEach((row, rowIndex) => {
        const track = tracks[rowIndex];
        if (!track) return;

        // If row is empty, don't render
        if (row.length === 0) return;

        // Combine to make a seamless loop
        const fullRow = [...row, ...row];
        // If the row is short, duplicate more
        if (fullRow.length < 6) {
            while (fullRow.length < 12) {
                fullRow.push(...row);
            }
        }

        fullRow.forEach((quote) => {
            // Find original index in state.quotes for lightbox
            const originalIndex = state.quotes.findIndex(q => q.id === quote.id);

            const item = document.createElement('div');
            item.className = 'quote-card';
            item.onclick = (e) => {
                if (e.target.classList.contains('admin-del-btn')) return;
                openMessageLightbox(originalIndex);
            };
            item.innerHTML = `
                ${isAdmin() ? `<button class="admin-del-btn" onclick="deleteData('quotes', '${quote.id}', event)">&times;</button>` : ''}
                <p class="quote-text">"${quote.message}"</p>
                <p class="quote-author">${quote.name || 'Anonim'}</p>
            `;
            track.appendChild(item);
        });
    });
}

async function deleteData(type, id, event) {
    if (event) event.stopPropagation();
    if (!confirm('Yakin ingin menghapus data ini?')) return;
    await deleteDataFromServer(type, id);
}

async function deleteDataFromServer(type, id) {
    try {
        const url = `${API.delete}&type=${type}&id=${id}`;
        const res = await fetch(url, { method: 'GET' });

        if (res.status === 403) {
            alert('Gagal: Sesi Admin kadaluarsa. Silakan login ulang (Klik Logo).');
            localStorage.removeItem('admin_key');
            location.reload();
            return false;
        }

        const result = await safeParseJSON(res);

        if (result.success) {
            alert('Berhasil dihapus!');
            location.reload();
            return true;
        } else {
            alert('Gagal Menghapus: ' + (result.message || 'Error tidak diketahui'));
            return false;
        }
    } catch (err) {
        console.error('Delete error:', err);
        alert('Terjadi kesalahan sistem saat menghubungi server.');
        return false;
    }
}

/* ===================================================
   UPLOAD & COMPRESSION
   =================================================== */
function initDragAndDrop() {
    const zones = [
        { id: 'dropZone', inputId: 'photoFile', previewId: 'filePreview' },
        { id: 'familyDropZone', inputId: 'familyPhotoFile', previewId: 'familyFilePreview' },
        { id: 'editFamilyDropZone', inputId: 'editFamilyPhotoFile', previewId: 'editFamilyFilePreview' },
        { id: 'walikelasDropZone', inputId: 'walikelasPhotoFile', previewId: 'walikelasFilePreview' }
    ];
    zones.forEach(zone => {
        const el = document.getElementById(zone.id);
        const input = document.getElementById(zone.inputId);
        if (el && input) {
            el.onclick = () => input.click();
            input.onchange = (e) => handleFileSelect(e.target.files[0], zone.previewId, zone.id);
        }
    });
}

async function handleFileSelect(file, previewId, dropZoneId) {
    if (!file) return;
    const dropZone = document.getElementById(dropZoneId);
    const inputId = dropZoneId === 'dropZone' ? 'photoFile' : 
                    (dropZoneId === 'familyDropZone' ? 'familyPhotoFile' : 
                    (dropZoneId === 'editFamilyDropZone' ? 'editFamilyPhotoFile' : 'walikelasPhotoFile'));
    const input = document.getElementById(inputId);
    const originalContent = dropZone.innerHTML;

    // 1. Visual Feedback: Global Loader
    const globalLoader = document.getElementById('globalLoader');
    const loaderText = document.getElementById('loaderText');
    input.setAttribute('data-processing', 'true');

    try {
        let blobToProcess = file;

        // 2. Auto-Detect & Convert HEIC
        if (file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic') {
            console.log("iPhone HEIC detected. Converting...");
            const converted = await heic2any({
                blob: file,
                toType: 'image/jpeg',
                quality: 0.7
            });
            blobToProcess = Array.isArray(converted) ? converted[0] : converted;
        }

        // 3. Fast Compression (Target < 1MB & Max 1200px)
        const processedFile = await compressImageOptimized(blobToProcess, file.name);

        // 4. Update Preview
        const reader = new FileReader();
        reader.onload = (e) => {
            dropZone.innerHTML = `<img src="${e.target.result}" style="max-width: 100%; max-height: 180px; object-fit: contain; border-radius: 8px;">`;
            dropZone.setAttribute('data-has-file', 'true');

            // Jika di modal edit family, update juga avatar circular preview-nya
            if (dropZoneId === 'editFamilyDropZone') {
                const curImg = document.getElementById('editFamilyCurrentImg');
                if (curImg) curImg.src = e.target.result;
            }
        };
        reader.readAsDataURL(processedFile);

        // 5. Save for Form
        input._processedFile = processedFile;
        input.setAttribute('data-processing', 'false');
        if (globalLoader) globalLoader.style.display = 'none';

    } catch (err) {
        console.error('Processing error:', err);
        alert('Gagal memproses gambar: ' + err.message);
        if (globalLoader) globalLoader.style.display = 'none';
        dropZone.innerHTML = originalContent;
        input.setAttribute('data-processing', 'false');
    }
}

function compressImageOptimized(blob, originalName) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let w = img.width, h = img.height, max = 1200; // Resize agar upload kilat

            if (w > max || h > max) {
                if (w > h) { h *= max / w; w = max; }
                else { w *= max / h; h = max; }
            }

            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);

            canvas.toBlob((b) => {
                const newName = originalName.replace(/\.[^/.]+$/, "") + ".jpg";
                resolve(new File([b], newName, { type: 'image/jpeg' }));
            }, 'image/jpeg', 0.7); // Kualitas 0.7: Ukuran kecil tapi tetap jernih
        };
        img.src = URL.createObjectURL(blob);
    });
}

/* ===================================================
   INTERACTION
   =================================================== */
function setupEventListeners() {
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');
    if (menuToggle && navLinks) {
        menuToggle.onclick = () => {
            const isActive = navLinks.classList.toggle('active');
            const icon = menuToggle.querySelector('i');
            if (icon) {
                icon.className = isActive ? 'bx bx-x' : 'bx bx-menu';
            }
        };

        const links = navLinks.querySelectorAll('a');
        links.forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                const icon = menuToggle.querySelector('i');
                if (icon) icon.className = 'bx bx-menu';
            });
        });
    }

    ['uploadForm', 'familyForm', 'editFamilyForm', 'walikelasForm', 'quote-form'].forEach(id => {
        const f = document.getElementById(id);
        if (f) f.onsubmit = (e) => { e.preventDefault(); handleFormSubmit(id); };
    });
}

async function handleFormSubmit(formId) {
    const typeMap = {
        'uploadForm': 'photos',
        'familyForm': 'family',
        'walikelasForm': 'walikelas',
        'quote-form': 'quotes'
    };
    const type = typeMap[formId];
    const url = formId === 'quote-form' ? `${API_BASE}?action=quotes` : `${API.upload}&type=${type}`;

    const globalLoader = document.getElementById('globalLoader');
    const loaderText = document.getElementById('loaderText');

    try {
        let res;
        if (formId === 'quote-form') {
            const name = document.getElementById('quote-name').value;
            const message = document.getElementById('quote-message').value;
            res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name, message: message })
            });
        } else if (formId === 'editFamilyForm') {
            const id = document.getElementById('editFamilyId').value;
            const name = document.getElementById('editFamilyName').value;
            const fileInput = document.getElementById('editFamilyPhotoFile');

            if (fileInput && fileInput.getAttribute('data-processing') === 'true') {
                alert('Sabar Bro, gambar lagi diproses...');
                return;
            }

            const file = fileInput ? fileInput._processedFile : null;
            if (!file && !name) {
                alert('Pilih foto baru atau ubah nama!');
                return;
            }

            const fd = new FormData();
            fd.append('id', id);
            if (name) fd.append('name', name);
            if (file) fd.append('photo', file);

            const editUrl = `${API_BASE}?action=edit_family`;
            res = await fetch(editUrl, { method: 'POST', body: fd });
        } else {
            const fd = new FormData();
            const fileInputId = formId === 'uploadForm' ? 'photoFile' : (formId === 'familyForm' ? 'familyPhotoFile' : 'walikelasPhotoFile');
            const fileInput = document.getElementById(fileInputId);

            if (fileInput.getAttribute('data-processing') === 'true') {
                alert('Sabar Bro, gambar lagi diproses...');
                return;
            }

            const file = fileInput._processedFile;
            if (!file) { alert('Pilih foto dulu, Bro!'); return; }
            fd.append('photo', file);
            if (formId === 'uploadForm') fd.append('uploader', 'User');
            else if (formId === 'familyForm') fd.append('name', document.getElementById('familyMemberName').value);
            else if (formId === 'walikelasForm') fd.append('name', 'HJ. SITI AMAMAH, SE');
            res = await fetch(url, { method: 'POST', body: fd });
        }

        const result = await safeParseJSON(res);

        if (result.success) {
            localStorage.removeItem('has_uploaded');
            alert(formId === 'editFamilyForm' ? 'Foto profil / data anggota berhasil diperbarui!' : 'Berhasil!');
            if (formId === 'quote-form') {
                document.getElementById('quote-name').value = '';
                document.getElementById('quote-message').value = '';
            } else {
                closeModal(formId.replace('Form', 'Modal'));
                // Reset dropzone
                const dropZoneId = formId === 'uploadForm' ? 'dropZone' : 
                                   (formId === 'familyForm' ? 'familyDropZone' : 
                                   (formId === 'editFamilyForm' ? 'editFamilyDropZone' : 'walikelasDropZone'));
                const dz = document.getElementById(dropZoneId);
                if (dz) {
                    if (dropZoneId === 'editFamilyDropZone') {
                        dz.innerHTML = `<i class='bx bx-camera' style="font-size: 40px; color: var(--accent-gold); margin-bottom: 12px;"></i><p>Klik untuk memilih foto PP baru</p>`;
                    } else {
                        dz.innerHTML = `<i class='bx bx-cloud-upload' style="font-size: 40px; color: var(--accent-gold); margin-bottom: 20px;"></i><p>Pilih foto kenangan</p>`;
                    }
                    dz.removeAttribute('data-has-file');
                }
            }
            loadData();
        } else {
            if (globalLoader) globalLoader.style.display = 'none';
            alert('Gagal: ' + (result.message || 'Error tidak diketahui'));
        }
    } catch (err) {
        if (globalLoader) globalLoader.style.display = 'none';
        console.error('Submit error:', err);
        alert('Terjadi kesalahan sistem saat mengirim data.');
    }
}

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) {
    const m = document.getElementById(id); m.style.display = 'none';
    // Clear preview is handled in handleFormSubmit or can be reset here
}

let currentLightboxSource = 'photos';

function openLightbox(index, source = 'photos', event = null) {
    if (event) event.stopPropagation();
    if (window.event && window.event.target.classList.contains('admin-del-btn')) return;

    currentLightboxSource = source;
    let data;
    if (source === 'photos') {
        data = isAdmin() ? state.photos : state.photos.filter(p => p.status === 'approved');
    } else if (source === 'family') {
        data = state.family;
    } else if (source === 'walikelas') {
        data = [state.walikelas];
    }

    currentLightboxIndex = index;
    const l = document.getElementById('lightbox');
    const imageContainer = document.getElementById('lightbox-image-container');
    const messageContainer = document.getElementById('lightbox-message-container');
    const i = document.getElementById('lightbox-img');
    const navs = document.querySelectorAll('.lightbox-nav');

    if (l && i && data[index]) {
        imageContainer.style.display = 'flex';
        if (messageContainer) messageContainer.style.display = 'none';

        i.src = data[index].url || data[index].photoUrl;

        // Buat jadi bulat jika sumbernya dari keluarga/walikelas
        if (source === 'family' || source === 'walikelas') {
            i.classList.add('is-circle');
        } else {
            i.classList.remove('is-circle');
        }

        l.style.display = 'flex';

        // Hide nav if only 1 image
        if (data.length <= 1) {
            navs.forEach(n => n.style.display = 'none');
        } else {
            navs.forEach(n => n.style.display = 'flex');
        }
    }
}

function openMessageLightbox(index) {
    state.currentQuoteIndex = index;
    const quote = state.quotes[index];
    if (!quote) return;

    const l = document.getElementById('lightbox');
    const imageContainer = document.getElementById('lightbox-image-container');
    const messageContainer = document.getElementById('lightbox-message-container');
    const msgText = document.getElementById('lightbox-msg-text');
    const msgAuthor = document.getElementById('lightbox-msg-author');
    const navs = document.querySelectorAll('#lightbox-message-container .lightbox-nav');

    if (l && msgText && msgAuthor) {
        if (imageContainer) imageContainer.style.display = 'none';
        if (messageContainer) messageContainer.style.display = 'flex';

        msgText.innerText = `"${quote.message}"`;
        msgAuthor.innerText = quote.name || 'Anonim';

        l.style.display = 'flex';

        // Show/hide navs
        if (state.quotes.length <= 1) {
            navs.forEach(n => n.style.display = 'none');
        } else {
            navs.forEach(n => n.style.display = 'flex');
        }
    }
}

function changeMessageLightbox(dir) {
    state.currentQuoteIndex += dir;
    if (state.currentQuoteIndex < 0) state.currentQuoteIndex = state.quotes.length - 1;
    if (state.currentQuoteIndex >= state.quotes.length) state.currentQuoteIndex = 0;

    const quote = state.quotes[state.currentQuoteIndex];
    if (!quote) return;

    const msgText = document.getElementById('lightbox-msg-text');
    const msgAuthor = document.getElementById('lightbox-msg-author');

    if (msgText && msgAuthor) {
        msgText.innerText = `"${quote.message}"`;
        msgAuthor.innerText = quote.name || 'Anonim';
    }
}

function changeLightbox(dir) {
    let data;
    if (currentLightboxSource === 'photos') {
        data = isAdmin() ? state.photos : state.photos.filter(p => p.status === 'approved');
    } else if (currentLightboxSource === 'family') {
        data = state.family;
    } else {
        return; // No nav for walikelas
    }

    currentLightboxIndex += dir;
    if (currentLightboxIndex < 0) currentLightboxIndex = data.length - 1;
    if (currentLightboxIndex >= data.length) currentLightboxIndex = 0;

    const i = document.getElementById('lightbox-img');
    if (i && data[currentLightboxIndex]) {
        i.src = data[currentLightboxIndex].url || data[currentLightboxIndex].photoUrl;

        if (currentLightboxSource === 'family' || currentLightboxSource === 'walikelas') {
            i.classList.add('is-circle');
        } else {
            i.classList.remove('is-circle');
        }
    }
}

// Ensure global access
window.openLightbox = openLightbox;
window.openMessageLightbox = openMessageLightbox;
window.changeMessageLightbox = changeMessageLightbox;
window.changeLightbox = changeLightbox;
window.closeModal = closeModal;
window.openModal = openModal;
window.deleteData = deleteData;
window.openEditFamilyModal = openEditFamilyModal;

function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal');
    const check = () => reveals.forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.9) el.classList.add('active');
    });
    window.addEventListener('scroll', check); setTimeout(check, 300);
}





window.openPinModal = () => { openModal('pinModal'); if (document.getElementById('adminPin')) document.getElementById('adminPin').value = ''; };
window.verifyPin = async () => {
    const pin = document.getElementById('adminPin').value;
    const res = await fetch(`${API_BASE}?action=login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) });
    const result = await safeParseJSON(res);
    if (result.success) { localStorage.setItem('admin_key', 'admin123'); location.reload(); }
    else { alert('PIN Salah'); closeModal('pinModal'); }
};

function renderWalikelas() {
    const imgEl = document.getElementById('walikelas-img');
    const nameEl = document.getElementById('walikelas-name');
    const btnContainer = document.getElementById('walikelas-admin-btns');

    const photoUrl = state.walikelas.url || state.walikelas.photoUrl;

    if (imgEl) {
        if (photoUrl) {
            imgEl.src = photoUrl;
            imgEl.style.cursor = 'pointer';
            imgEl.onclick = (e) => openLightbox(0, 'walikelas', e);
            imgEl.onerror = () => {
                imgEl.src = 'https://via.placeholder.com/180';
                imgEl.onerror = null;
                // Munculkan tombol edit jika gambar error agar bisa diperbaiki
                if (!isAdmin()) {
                    renderWalikelasButtons(btnContainer, false);
                }
            };
        } else {
            imgEl.src = 'https://via.placeholder.com/180';
            imgEl.style.cursor = 'pointer';
            imgEl.onclick = () => openModal('walikelasModal');
        }
    }

    if (nameEl) {
        nameEl.innerText = state.walikelas.name || 'HJ. SITI AMAMAH, SE';
    }

    renderWalikelasButtons(btnContainer, !!photoUrl);
}

function renderWalikelasButtons(container, hasPhoto) {
    if (!container) return;
    container.innerHTML = '';

    if (hasPhoto) {
        if (isAdmin()) {
            const delBtn = document.createElement('button');
            delBtn.className = 'edit-btn';
            delBtn.style = "position: absolute; top: 10px; right: 10px; background: #e74c3c; color: #fff; border: none; border-radius: 50%; width: 44px; height: 44px; cursor: pointer; z-index: 10; display:flex; align-items:center; justify-content:center; font-size: 20px;";
            delBtn.innerHTML = "<i class='bx bx-trash'></i>";
            delBtn.onclick = (e) => {
                if (confirm('Hapus foto Walikelas untuk menggantinya?')) {
                    deleteData('walikelas', state.walikelas.id, e);
                }
            };
            container.appendChild(delBtn);
        }
    } else {
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-btn';
        editBtn.style = "position: absolute; top: 10px; right: 10px; background: var(--accent-gold); color: #000; border: none; border-radius: 50%; width: 44px; height: 44px; cursor: pointer; z-index: 10; display:flex; align-items:center; justify-content:center; font-size: 20px;";
        editBtn.innerHTML = "<i class='bx bx-edit-alt'></i>";
        editBtn.onclick = () => openModal('walikelasModal');
        container.appendChild(editBtn);
    }
}

/* ===================================================
   THEME MANAGEMENT (FITUR TERANG / GELAP)
   =================================================== */
function initTheme() {
    const savedTheme = localStorage.getItem('site_theme') || 'dark';
    applyTheme(savedTheme);

    const themeToggleBtn = document.getElementById('themeToggle');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            applyTheme(newTheme);
            localStorage.setItem('site_theme', newTheme);
        });
    }
}

function applyTheme(theme) {
    if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        const icon = document.querySelector('#themeToggle i');
        if (icon) icon.className = 'bx bx-sun';
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        const icon = document.querySelector('#themeToggle i');
        if (icon) icon.className = 'bx bx-moon';
    }
}
