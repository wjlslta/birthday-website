// ╔══════════════════════════════════════════════════╗
// ║  master.js — gallery loader for Master view      ║
// ║  loads from GitHub: birthday-wishes/records.json ║
// ╚══════════════════════════════════════════════════╝

// ── CONFIG ──────────────────────────────────────────
const RECORDS_URL  = 'https://raw.githubusercontent.com/wjlslta/birthday-website/main/birthday-wishes/records.json';
const TARGET_DATE  = '2026-06-28T00:00:00';

let cachedEntries = [];

// ── Init ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
    updateCountdown();
    setInterval(updateCountdown, 1000);
    loadGallery();
});

// ── Countdown ──────────────────────────────────────
function updateCountdown() {
    const targetDate = new Date(TARGET_DATE).getTime();
    const now = new Date().getTime();
    const distance = targetDate - now;

    if (distance < 0) {
        document.getElementById('countdown').innerHTML = "🎉 It's Janice's birthday! 🎉";
        return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    document.getElementById('countdown').innerHTML = `${days}d ${hours}h ${minutes}m ${seconds}s until the celebration!`;
}

// ── Gallery (read-only — no admin class, no delete buttons) ──
async function loadGallery() {
    const gallery = document.getElementById('gallery');

    try {
        const resp = await fetch(RECORDS_URL);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        cachedEntries = data.entries || [];

        if (cachedEntries.length === 0) {
            gallery.innerHTML = `
                <div class="empty-gallery">
                    <i class="fas fa-inbox"></i>
                    <p>No memories yet.<br>Check back soon! 💝</p>
                </div>
            `;
            return;
        }

        gallery.innerHTML = cachedEntries.map((entry, index) => {
            let mediaHtml = '';
            if (entry.type === 'message') {
                mediaHtml = `<div style="width:100%;padding:20px;display:flex;align-items:center;justify-content:center;text-align:center;background:linear-gradient(135deg,#8B6B63 0%,#A67B7B 100%);border-radius:10px;">
                    <div>
                        <i class="fas fa-comment" style="font-size:3rem;margin-bottom:10px;color:#f5e6d3;"></i>
                        <p style="color:#f5e6d3;">${entry.name}</p>
                    </div>
                </div>`;
            } else if (entry.type === 'photobooth') {
                mediaHtml = `<img src="${entry.url}" style="width:100%;height:100%;object-fit:cover;" alt="photobooth" loading="lazy">`;
            } else {
                mediaHtml = `<${entry.type === 'video' ? 'video' : 'img'} src="${entry.url}" ${entry.type === 'video' ? 'controls' : ''} style="width:100%;height:100%;object-fit:cover;" loading="lazy">`;
            }

            return `
                <div class="gallery-item" onclick="openModal(${index})">
                    <div class="gallery-item-media">${mediaHtml}</div>
                    <div class="gallery-item-content">
                        <div class="gallery-item-name">${entry.name}</div>
                        <div class="gallery-item-message">${entry.message || 'No message'}</div>
                        <div class="gallery-item-type">${entry.type === 'photobooth' ? '📷 Photobooth' : entry.type}</div>
                        <div class="gallery-item-time">${new Date(entry.timestamp).toLocaleString()}</div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (e) {
        console.error('Failed to load gallery:', e);
        gallery.innerHTML = `
            <div class="empty-gallery">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Couldn't load memories.<br>Check back soon! 💝</p>
            </div>
        `;
    }
}

// ── Modal (view + download only, no delete) ──
function openModal(index) {
    const entry = cachedEntries[index];

    if (entry.type === 'message') {
        document.getElementById('modalMedia').innerHTML = `
            <div style="background:linear-gradient(135deg,#8B6B63 0%,#A67B7B 100%);color:#f5e6d3;padding:60px 20px;border-radius:15px;text-align:center;">
                <i class="fas fa-comment" style="font-size:4rem;margin-bottom:20px;"></i>
                <p style="font-size:1.2rem;">${entry.name}</p>
            </div>
        `;
    } else if (entry.type === 'photobooth') {
        document.getElementById('modalMedia').innerHTML = `<img src="${entry.url}" style="width:100%;border-radius:15px;" alt="photobooth">`;
    } else {
        document.getElementById('modalMedia').innerHTML = `<${entry.type === 'video' ? 'video' : 'img'} src="${entry.url}" ${entry.type === 'video' ? 'controls' : ''} style="width:100%;border-radius:15px;">`;
    }

    document.getElementById('modalName').textContent = entry.name;
    document.getElementById('modalMessage').textContent = entry.message || 'No message provided';
    document.getElementById('modalTime').textContent = new Date(entry.timestamp).toLocaleString();

    document.getElementById('modalActions').innerHTML = `
        <button class="btn btn-secondary" onclick="downloadEntry(${index})">
            <i class="fas fa-download"></i> Download
        </button>
    `;

    document.getElementById('modal').classList.add('active');
}

function downloadEntry(index) {
    const entry = cachedEntries[index];

    if (entry.type === 'message') {
        const element = document.createElement('a');
        const file = new Blob([`From: ${entry.name}\n\n${entry.message}`], {type: 'text/plain'});
        element.href = URL.createObjectURL(file);
        element.download = `message_${entry.name}_${Date.now()}.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    } else if (entry.url) {
        const element = document.createElement('a');
        element.href = entry.url;
        element.download = entry.filename || `${entry.type}_${Date.now()}`;
        element.target = '_blank';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }
}

function closeModal(event) {
    if (event && event.target.id !== 'modal') return;
    document.getElementById('modal').classList.remove('active');
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});
