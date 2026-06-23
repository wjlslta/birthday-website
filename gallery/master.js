// ╔══════════════════════════════════════════════════╗
// ║  master.js — read-only birthday gallery          ║
// ╚══════════════════════════════════════════════════╝

// ── CONFIG ──────────────────────────────────────────
const WORKER_URL   = 'https://birthdaydata.janicellchancl.workers.dev';
const REPO_OWNER   = 'wjlslta';
const REPO_NAME    = 'birthday_data';
const UPLOAD_PATH  = 'birthday-wishes';
const API_BASE     = `${WORKER_URL}/${REPO_OWNER}/${REPO_NAME}/contents`;
const RAW_BASE     = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main`;
const RECORDS_URL  = `${API_BASE}/${UPLOAD_PATH}/records.json`;
const TARGET_DATE  = '2026-06-28T00:00:00';

let cachedEntries = [];
const mediaUrlCache = new Map();

// ── Init ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
    updateCountdown();
    setInterval(updateCountdown, 1000);
    loadGallery();
    initLock();
});

// ═══════════════════════════════════════════════════
//  GALLERY + COUNTDOWN
// ═══════════════════════════════════════════════════

// ── Floating lock indicator ──────────────────────────
function initLock() {
    const target = new Date(TARGET_DATE);
    const now = new Date();
    const unlocked = now >= target;

    const lock = document.createElement('div');
    lock.id = 'floating-lock';
    lock.innerHTML = `
        <div style="
            display:flex;
            flex-direction:column;
            align-items:center;
            justify-content:center;
            color:#8B6B63;
            text-align:center;
            padding:60px 20px;
            width:100%;
            height:100%;
        ">
            <p style="font-family:'Poppins',sans-serif;font-size:2rem;opacity:0.55;margin:0;font-weight:600;letter-spacing:1px;">
                Locked until June 28
            </p>
        </div>
    `;
    lock.style.cssText = `
        position: absolute;
        inset: -20px;
        z-index: 100001;
        background: rgba(245,230,211,0.93);
        border-radius: 15px;
        box-shadow: 0 8px 40px rgba(0,0,0,0.5);
        backdrop-filter: blur(6px);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.6s ease, opacity 0.6s ease;
    `;

    const galleryParent = document.querySelector('.gallery-section');
    if (!galleryParent) return;
    galleryParent.style.position = 'relative';
    galleryParent.appendChild(lock);

    if (unlocked) {
        setTimeout(() => {
            lock.style.transform = 'translateY(-40px)';
            setTimeout(() => {
                lock.style.transform = 'translateY(120%)';
                lock.style.opacity = '0';
                setTimeout(() => lock.remove(), 700);
            }, 800);
        }, 600);
    }
}

function updateCountdown() {
    const targetDate = new Date(TARGET_DATE).getTime();
    const now = new Date().getTime();
    const distance = targetDate - now;
    const countdown = document.getElementById('countdown');
    if (!countdown) return;

    if (distance < 0) {
        countdown.innerHTML = "🎉 It's Janice's birthday! 🎉";
        return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    countdown.innerHTML = `${days}d ${hours}h ${minutes}m ${seconds}s until the celebration!`;
}

function base64ToBytes(base64) {
    const binary = atob(base64.replace(/\n/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

function base64ToUtf8(base64) {
    return new TextDecoder().decode(base64ToBytes(base64));
}

function detectMimeType(bytes, entry) {
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif';
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp';
    if (entry.type === 'video') return 'video/webm';
    if (entry.type === 'photobooth') return 'image/png';
    return 'image/jpeg';
}

function getMediaCacheKey(entry) {
    return entry.id || entry.filename || entry.url;
}

async function getMediaDisplayUrl(entry) {
    if (!entry || entry.type === 'message') return '';
    const cacheKey = getMediaCacheKey(entry);
    if (mediaUrlCache.has(cacheKey)) return mediaUrlCache.get(cacheKey);

    if (!entry.filename) {
        const fallback = entry.url || '';
        mediaUrlCache.set(cacheKey, fallback);
        return fallback;
    }

    try {
        const resp = await fetch(`${API_BASE}/${UPLOAD_PATH}/${entry.filename}`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        const bytes = base64ToBytes(data.content || '');
        if (bytes.length === 0) {
            throw new Error('Empty media content from worker');
        }
        const blob = new Blob([bytes], { type: detectMimeType(bytes, entry) });
        const objectUrl = URL.createObjectURL(blob);
        mediaUrlCache.set(cacheKey, objectUrl);
        return objectUrl;
    } catch (e) {
        console.warn('Worker media fetch failed, falling back to raw URL:', e);
        const fallback = entry.url || `${RAW_BASE}/${UPLOAD_PATH}/${entry.filename}`;
        mediaUrlCache.set(cacheKey, fallback);
        return fallback;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function renderMedia(entry, displayUrl) {
    const safeName = escapeHtml(entry.name || 'memory');

    if (entry.type === 'message') {
        return `<div style="width:100%;padding:20px;display:flex;align-items:center;justify-content:center;text-align:center;background:linear-gradient(135deg,#8B6B63 0%,#A67B7B 100%);border-radius:10px;">
            <div>
                <i class="fas fa-comment" style="font-size:3rem;margin-bottom:10px;color:#f5e6d3;"></i>
                <p style="color:#f5e6d3;">${safeName}</p>
            </div>
        </div>`;
    }

    if (!displayUrl) {
        return '<div class="media-error">image unavailable</div>';
    }

    if (entry.type === 'video') {
        return `<video src="${displayUrl}" controls style="width:100%;height:100%;object-fit:cover;" loading="lazy"></video>`;
    }

    const altText = entry.type === 'photobooth' ? 'photobooth' : safeName;
    return `<img src="${displayUrl}" style="width:100%;height:100%;object-fit:cover;" alt="${altText}" loading="lazy">`;
}

async function loadGallery() {
    const gallery = document.getElementById('gallery');

    try {
        const resp = await fetch(RECORDS_URL);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        const decoded = data.content ? base64ToUtf8(data.content) : '{"entries":[]}';
        const parsed = JSON.parse(decoded);
        cachedEntries = parsed.entries || [];

        if (cachedEntries.length === 0) {
            gallery.innerHTML = `
                <div class="empty-gallery">
                    <i class="fas fa-inbox"></i>
                    <p>No memories yet.<br>Check back soon! 💝</p>
                </div>
            `;
            return;
        }

        const shuffled = [...cachedEntries];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        const cards = await Promise.all(shuffled.map(async (entry) => {
            const realIndex = cachedEntries.indexOf(entry);
            const displayUrl = await getMediaDisplayUrl(entry);
            const safeName = escapeHtml(entry.name);
            const safeMessage = escapeHtml(entry.message || 'No message');
            const safeType = entry.type === 'photobooth' ? '📷 Photobooth' : escapeHtml(entry.type);

            return `
                <div class="gallery-item" onclick="openModal(${realIndex})">
                    <div class="gallery-item-media">${renderMedia(entry, displayUrl)}</div>
                    <div class="gallery-item-content">
                        <div class="gallery-item-name">${safeName}</div>
                        <div class="gallery-item-message">${safeMessage}</div>
                        <div class="gallery-item-type">${safeType}</div>
                        <div class="gallery-item-time">${new Date(entry.timestamp).toLocaleString()}</div>
                    </div>
                </div>
            `;
        }));

        gallery.innerHTML = cards.join('');

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

async function openModal(index) {
    const entry = cachedEntries[index];
    const displayUrl = await getMediaDisplayUrl(entry);

    document.getElementById('modalMedia').innerHTML = renderMedia(entry, displayUrl);
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

async function downloadEntry(index) {
    const entry = cachedEntries[index];

    if (entry.type === 'message') {
        const element = document.createElement('a');
        const file = new Blob([`From: ${entry.name}\n\n${entry.message}`], {type: 'text/plain'});
        element.href = URL.createObjectURL(file);
        element.download = `message_${entry.name}_${Date.now()}.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    } else {
        const element = document.createElement('a');
        element.href = await getMediaDisplayUrl(entry);
        element.download = entry.filename || `${entry.type}_${Date.now()}`;
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
