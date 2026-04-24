document.addEventListener('DOMContentLoaded', () => {

    // 1. Navbar Scroll Effect
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // 2. Smooth Scrolling for Anchor Links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if(targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if(targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // 3. Scroll Reveal Animation using Intersection Observer
    const fadeElements = document.querySelectorAll('.fade-up');
    
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    };

    const scrollObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Optional: Stop observing once visible if you only want the animation once
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    fadeElements.forEach(el => {
        scrollObserver.observe(el);
    });

    // 4. Load dynamic photos
    loadPhotos();

    // 5. Handle Upload Form
    const uploadForm = document.getElementById('upload-form');
    if(uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btnUpload = document.getElementById('btn-upload');
            const fileInput = document.getElementById('photo-file');
            
            if(!fileInput.files[0]) return;
            
            btnUpload.textContent = 'Mengunggah...';
            btnUpload.disabled = true;
            
            const formData = new FormData();
            formData.append('photo', fileInput.files[0]);
            formData.append('caption', 'Kenangan Indah'); // Default caption
            
            try {
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                if(data.success) {
                    // Add photo to gallery visually
                    appendPhotoToGallery(data.photo);
                    closeUploadModal();
                    uploadForm.reset();
                } else {
                    alert('Gagal mengunggah foto.');
                }
            } catch(err) {
                console.error(err);
                alert('Terjadi kesalahan.');
            } finally {
                btnUpload.textContent = 'Unggah Sekarang';
                btnUpload.disabled = false;
            }
        });
    }

    // 6. Quotes Logic
    loadQuotes();

    const quoteForm = document.getElementById('quote-form');
    if(quoteForm) {
        // Check if already submitted
        if(localStorage.getItem('hasSubmittedQuote_v2')) {
            quoteForm.style.display = 'none';
            document.getElementById('quote-success-msg').style.display = 'block';
        }

        quoteForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnSubmit = document.getElementById('btn-submit-quote');
            const nameInput = document.getElementById('quote-name');
            const messageInput = document.getElementById('quote-message');
            
            btnSubmit.textContent = 'Mengirim...';
            btnSubmit.disabled = true;

            try {
                const res = await fetch('/api/quotes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: nameInput.value,
                        message: messageInput.value
                    })
                });
                
                const data = await res.json();
                if(data.success) {
                    appendQuote(data.quote);
                    quoteForm.style.display = 'none';
                    document.getElementById('quote-success-msg').style.display = 'block';
                    localStorage.setItem('hasSubmittedQuote_v2', 'true');
                } else {
                    alert(data.error || 'Gagal mengirim pesan');
                }
            } catch(err) {
                alert('Terjadi kesalahan saat mengirim pesan');
            } finally {
                btnSubmit.textContent = 'Kirim Pesan';
                btnSubmit.disabled = false;
            }
        });
    }

    // 7. Family Logic
    loadFamilyMembers();
    if(localStorage.getItem('hasAddedFamilyMember')) {
        const btnAdd = document.getElementById('btn-add-family');
        if(btnAdd) btnAdd.style.display = 'none';
    }
    // 8. Premium Audio Feedback
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    function playSound(freq, duration, type = 'sine', volume = 0.1) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + duration);
    }

    function addFeedback(selector) {
        document.querySelectorAll(selector).forEach(el => {
            el.addEventListener('mouseenter', () => playSound(800, 0.05, 'sine', 0.02));
            el.addEventListener('click', () => playSound(400, 0.1, 'triangle', 0.05));
        });
    }

    addFeedback('button, .btn-primary, .nav-links a, .gallery-item, .family-card');

});

// Dynamic Photo Loading
async function loadPhotos() {
    try {
        const response = await fetch('/api/photos');
        const photos = await response.json();
        photos.forEach(photo => appendPhotoToGallery(photo));
    } catch(err) {
        console.error('Gagal memuat foto:', err);
    }
}

// Dynamic Quotes Loading
async function loadQuotes() {
    try {
        const res = await fetch('/api/quotes');
        const quotes = await res.json();
        quotes.forEach(quote => appendQuote(quote));
    } catch(err) {
        console.error('Gagal memuat pesan:', err);
    }
}

// Dynamic Family Logic
async function loadFamilyMembers() {
    try {
        const res = await fetch('/api/family');
        const members = await res.json();
        members.forEach(member => appendFamilyCard(member));
    } catch(err) {}
}

async function promptAddFamilyMember() {
    const name = prompt('Masukkan Nama Anggota Keluarga:');
    if(!name) return;

    try {
        const res = await fetch('/api/family', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        const data = await res.json();
        if(data.success) {
            appendFamilyCard(data.member);
            localStorage.setItem('hasAddedFamilyMember', 'true');
            const btnAdd = document.getElementById('btn-add-family');
            if(btnAdd) btnAdd.style.display = 'none';
        } else {
            alert(data.error);
        }
    } catch(err) {
        alert('Terjadi kesalahan');
    }
}

function appendFamilyCard(member) {
    const grid = document.getElementById('family-grid');
    if(!grid) return;

    const div = document.createElement('div');
    div.className = 'family-card elegant-card fade-up visible';
    div.id = 'family-' + member.id;
    div.style = 'text-align: center; padding: 20px;';

    const photoContent = (member.photoUrl) 
        ? `<img src="${member.photoUrl}" style="width: 100%; height: 100%; object-fit: cover; position: absolute; top:0; left:0;">`
        : (localStorage.getItem('hasUploadedFamilyPhoto'))
            ? `<i class='bx bx-image' style="font-size: 3rem; color: var(--text-muted); opacity: 0.3;"></i>`
            : `<i class='bx bx-image-add' style="font-size: 3rem; color: var(--text-muted); margin-bottom: 10px;"></i>
               <button class="btn-primary" style="padding: 8px 15px; font-size: 0.9rem;" onclick="document.getElementById('family-upload-${member.id}').click()">Upload Foto</button>`;

    div.innerHTML = `
        <button onclick="deleteFamilyMember(${member.id})" style="position: absolute; top: 10px; right: 10px; background: rgba(255,0,0,0.6); border: none; color: white; border-radius: 5px; cursor: pointer; z-index: 10; padding: 5px;"><i class='bx bx-trash'></i></button>
        <h3 style="color: var(--accent-gold); margin-bottom: 15px; font-family: var(--font-heading);">${member.name}</h3>
        <div class="photo-placeholder" style="width: 100%; aspect-ratio: 3/4; background: rgba(255,255,255,0.05); border: 2px dashed rgba(255,255,255,0.2); border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; overflow: hidden;">
            ${photoContent}
            <input type="file" id="family-upload-${member.id}" style="display: none;" accept="image/*" onchange="uploadFamilyPhoto(${member.id}, this)">
        </div>
    `;

    grid.appendChild(div);
}

async function uploadFamilyPhoto(id, input) {
    if(!input.files[0]) return;
    const formData = new FormData();
    formData.append('photo', input.files[0]);

    try {
        const res = await fetch('/api/family/' + id + '/upload', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if(data.success) {
            localStorage.setItem('hasUploadedFamilyPhoto', 'true');
            // Refresh all cards to hide other upload buttons
            document.getElementById('family-grid').innerHTML = '';
            loadFamilyMembers();
        } else {
            alert(data.error);
        }
    } catch(err) {
        alert('Gagal mengunggah foto');
    }
}

async function deleteFamilyMember(id) {
    if(!confirm('Hapus anggota ini?')) return;
    
    try {
        const res = await fetch('/api/family/' + id, { method: 'DELETE' });
        const data = await res.json();
        if(data.success) {
            const el = document.getElementById('family-' + id);
            if(el) el.remove();
            
            // Allow user to add again if it was their card
            localStorage.removeItem('hasAddedFamilyMember');
            localStorage.removeItem('hasUploadedFamilyPhoto');
            const btnAdd = document.getElementById('btn-add-family');
            if(btnAdd) btnAdd.style.display = 'inline-flex';
            
            // Reload cards to show upload buttons for others
            document.getElementById('family-grid').innerHTML = '';
            loadFamilyMembers();
        }
    } catch(err) {
        alert('Gagal menghapus');
    }
}

function appendQuote(quote) {
    const wrapper = document.getElementById('quotes-wrapper');
    if(!wrapper) return;
    
    const div = document.createElement('div');
    div.id = 'quote-' + quote.id;
    div.className = 'quote-card elegant-card fade-up visible';
    div.innerHTML = `
        <button onclick="deleteQuote(${quote.id})" style="position: absolute; top: 15px; right: 15px; background: rgba(255,0,0,0.4); border: none; color: white; border-radius: 5px; cursor: pointer; padding: 5px; z-index: 10;"><i class='bx bx-trash'></i></button>
        <i class='bx bxs-quote-alt-left quote-icon'></i>
        <p class="quote-text">"${quote.message}"</p>
        <div class="quote-author">
            <h4>${quote.name}</h4>
            <span>${quote.date}</span>
        </div>
    `;
    wrapper.appendChild(div);
}

async function deleteQuote(id) {
    if(!confirm('Hapus pesan ini?')) return;
    try {
        const res = await fetch('/api/quotes/' + id, { method: 'DELETE' });
        const data = await res.json();
        if(data.success) {
            const el = document.getElementById('quote-' + id);
            if(el) el.remove();
            
            // Reset restriction
            localStorage.removeItem('hasSubmittedQuote_v2');
            const quoteForm = document.getElementById('quote-form');
            const successMsg = document.getElementById('quote-success-msg');
            if(quoteForm) quoteForm.style.display = 'block';
            if(successMsg) successMsg.style.display = 'none';
        }
    } catch(err) {
        alert('Gagal menghapus');
    }
}

function appendPhotoToGallery(photo) {
    const galleryGrid = document.getElementById('gallery-grid');
    if(!galleryGrid) return;
    
    const div = document.createElement('div');
    div.className = 'gallery-item fade-up visible'; // visible to bypass intersection observer if loaded later
    div.id = 'photo-' + photo.id;
    // Properly escape quotes for inline handler
    const safeCaption = photo.caption.replace(/'/g, "\\'");
    div.setAttribute('onclick', `openLightbox('${photo.url}', '${safeCaption}')`);
    
    div.innerHTML = `
        <img src="${photo.url}" alt="${photo.caption}">
        <div class="gallery-overlay">
            <i class='bx bx-zoom-in'></i>
            <button class="delete-btn" onclick="event.stopPropagation(); deletePhoto(${photo.id})" style="position: absolute; top: 15px; right: 15px; background: rgba(255,0,0,0.7); border: none; color: white; padding: 5px 10px; border-radius: 5px; cursor: pointer; z-index: 10;"><i class='bx bx-trash'></i></button>
        </div>
    `;
    
    galleryGrid.appendChild(div);
}

async function deletePhoto(id) {
    if(!confirm('Yakin ingin menghapus kenangan ini?')) return;
    
    try {
        const response = await fetch('/api/photos/' + id, { method: 'DELETE' });
        const data = await response.json();
        if(data.success) {
            const el = document.getElementById('photo-' + id);
            if(el) el.remove();
        } else {
            alert('Gagal menghapus foto.');
        }
    } catch(err) {
        console.error(err);
        alert('Terjadi kesalahan saat menghapus.');
    }
}

// 6. Lightbox & Modal Logic
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxCaption = document.getElementById('lightbox-caption');

function openLightbox(imageSrc, captionText) {
    lightbox.style.display = "block";
    lightboxImg.src = imageSrc;
    lightboxCaption.innerHTML = captionText;
    
    // Prevent background scrolling
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    lightbox.style.display = "none";
    
    // Restore background scrolling
    document.body.style.overflow = 'auto';
}

// Close lightbox when clicking outside the image
window.onclick = function(event) {
    if (event.target == lightbox) {
        closeLightbox();
    }
}

// Close lightbox with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === "Escape") {
        if(lightbox.style.display === "block") closeLightbox();
        if(document.getElementById('upload-modal').style.display === "block") closeUploadModal();
    }
});

// Upload Modal Logic
function openUploadModal() {
    document.getElementById('upload-modal').style.display = "block";
    document.body.style.overflow = 'hidden';
}

function closeUploadModal() {
    document.getElementById('upload-modal').style.display = "none";
    document.body.style.overflow = 'auto';
}

window.addEventListener('click', function(event) {
    const uploadModal = document.getElementById('upload-modal');
    if (event.target == uploadModal) {
        closeUploadModal();
    }
});
