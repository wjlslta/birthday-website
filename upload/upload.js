// ╔══════════════════════════════════════════════════╗
// ║  upload.js — birthday wishes uploader + gallery  ║
// ║  stores in GitHub: wjlslta/birthday_data         ║
// ╚══════════════════════════════════════════════════╝

// ── CONFIG ──────────────────────────────────────────
const WORKER_URL    = 'https://birthdaydata.janicellchancl.workers.dev';
const REPO_OWNER    = 'wjlslta';
const REPO_NAME     = 'birthday_data';
const UPLOAD_PATH   = 'birthday-wishes';
const RECORDS_FILE  = 'birthday-wishes/records.json';
const RAW_BASE      = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main`;
const API_BASE      = `${WORKER_URL}/${REPO_OWNER}/${REPO_NAME}/contents`;
const TARGET_DATE   = '2026-06-28T00:00:00';

// ── Video recording config ──────────────────────────
const VIDEO_MAX_DURATION = 180;              // seconds (3 min)
const VIDEO_BITRATE      = 2500000;          // 2.5 Mbps
const VIDEO_WIDTH        = 1280;
const VIDEO_HEIGHT       = 720;
const VIDEO_FRAMERATE    = 30;

// ── State ──────────────────────────────────────────
let mediaFile        = null;
let videoRecorder    = null;
let recordedChunks   = [];
let isRecording      = false;
let recordingTime    = 0;
let currentFrame     = 'classic';
let photoboothStream = null;
let cachedEntries    = [];

// ── Init ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
    updateCountdown();
    setInterval(updateCountdown, 1000);
    loadGallery();
    setupDropZone();
});

// ═══════════════════════════════════════════════════
//  UTF-8 ENCODING HELPERS
// ═══════════════════════════════════════════════════

function utf8ToBase64(str) {
    const utf8Bytes = new TextEncoder().encode(str);
    let binary = '';
    utf8Bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary);
}

function base64ToUtf8(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
}

// ═══════════════════════════════════════════════════
//  COUNTDOWN
// ═══════════════════════════════════════════════════

function updateCountdown() {
    const targetDate = new Date(TARGET_DATE).getTime();
    const now = new Date().getTime();
    const distance = targetDate - now;

    const el = document.getElementById('countdown');
    if (!el) return;

    if (distance < 0) {
        el.innerHTML = "🎉 It's Janice's birthday! 🎉";
        return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    el.innerHTML = `${days}d ${hours}h ${minutes}m ${seconds}s until the celebration!`;
}

// ═══════════════════════════════════════════════════
//  TABS
// ═══════════════════════════════════════════════════

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
}

// ═══════════════════════════════════════════════════
//  GITHUB API HELPERS (via Worker)
// ═══════════════════════════════════════════════════

async function githubGet(path) {
    const resp = await fetch(`${API_BASE}/${path}`);
    if (!resp.ok) throw new Error(`GET ${path}: ${resp.status}`);
    return resp.json();
}

async function githubPut(path, contentBase64, message, sha) {
    const body = { message: message, content: contentBase64, branch: 'main' };
    if (sha) body.sha = sha;

    const resp = await fetch(`${API_BASE}/${path}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(`PUT ${path}: ${resp.status} — ${err.message || 'unknown'}`);
    }
    return resp.json();
}

async function fetchRecords() {
    try {
        const data = await githubGet(RECORDS_FILE);
        const decoded = base64ToUtf8(data.content.replace(/\n/g, ''));
        const parsed = JSON.parse(decoded);
        return { sha: data.sha, entries: parsed.entries || [] };
    } catch (e) {
        console.log('records.json not found, starting fresh');
        return { sha: null, entries: [] };
    }
}

async function saveRecords(entries, sha) {
    const json = JSON.stringify({ entries: entries }, null, 2);
    const base64 = utf8ToBase64(json);
    const result = await githubPut(RECORDS_FILE, base64, 'Update birthday wishes records', sha);
    return result.content.sha;
}

async function uploadFile(filename, base64Data) {
    await githubPut(`${UPLOAD_PATH}/${filename}`, base64Data, `Add ${filename}`);
}

// ═══════════════════════════════════════════════════
//  UPLOAD FORM (injected into preview areas)
// ═══════════════════════════════════════════════════

function injectUploadForm(containerId, onSubmit) {
    const container = document.getElementById(containerId);
    const formId = containerId + '-form';

    if (document.getElementById(formId)) return;

    const formHtml = `
        <div id="${formId}" class="upload-form">
            <input type="text" id="${formId}-name" placeholder="Your name *" required>
            <textarea id="${formId}-message" placeholder="Write a birthday message... *" required></textarea>
            <button class="btn btn-primary" id="${formId}-submit">
                <i class="fas fa-upload"></i> Upload
            </button>
            <p id="${formId}-error" style="color:#c0392b;font-size:0.85rem;display:none;"></p>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', formHtml);

    document.getElementById(`${formId}-submit`).addEventListener('click', () => {
        const name = document.getElementById(`${formId}-name`).value.trim();
        const message = document.getElementById(`${formId}-message`).value.trim();
        const errorEl = document.getElementById(`${formId}-error`);

        if (!name || !message) {
            errorEl.textContent = 'Please fill in both your name and message.';
            errorEl.style.display = 'block';
            return;
        }
        errorEl.style.display = 'none';
        onSubmit(name, message);
    });
}

// ═══════════════════════════════════════════════════
//  PHOTO UPLOAD
// ═══════════════════════════════════════════════════

function setupDropZone() {
    const dropZone = document.getElementById('dropZone');
    if (!dropZone) return;
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        handlePhotoFile(e.dataTransfer.files[0]);
    });
}

document.getElementById('photoInput').addEventListener('change', (e) => {
    handlePhotoFile(e.target.files[0]);
});

function handlePhotoFile(file) {
    if (!file) return;
    mediaFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('photoPreview').innerHTML = `
            <img src="${e.target.result}" alt="preview">
        `;
        injectUploadForm('photoPreview', submitPhoto);
    };
    reader.readAsDataURL(file);
}

async function submitPhoto(name, message) {
    if (!mediaFile) return;
    try {
        await addEntry(mediaFile, 'photo', name, message);
        resetPhotoTab();
    } catch(e) {
        alert('Upload failed: ' + e.message);
    }
}

function resetPhotoTab() {
    document.getElementById('photoInput').value = '';
    document.getElementById('photoPreview').innerHTML = '';
    mediaFile = null;
}

// ═══════════════════════════════════════════════════
//  VIDEO RECORDING
// ═══════════════════════════════════════════════════

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: VIDEO_WIDTH },
                height: { ideal: VIDEO_HEIGHT },
                frameRate: { ideal: VIDEO_FRAMERATE }
            },
            audio: true
        });

        const videoEl = document.createElement('video');
        videoEl.id = 'recordingVideo';
        videoEl.style.display = 'none';
        videoEl.srcObject = stream;
        videoEl.play();
        document.body.appendChild(videoEl);

        const mediaRecorder = new MediaRecorder(stream, {
            videoBitsPerSecond: VIDEO_BITRATE,
            mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
                ? 'video/webm;codecs=vp8'
                : 'video/webm'
        });

        recordedChunks = [];
        isRecording = true;
        recordingTime = 0;

        mediaRecorder.ondataavailable = (e) => recordedChunks.push(e.data);
        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            mediaFile = blob;
            stream.getTracks().forEach(track => track.stop());
            videoEl.remove();

            const videoUrl = URL.createObjectURL(blob);
            document.getElementById('videoPreviewContainer').innerHTML = `
                <video controls style="margin-top:15px;width:100%;border-radius:10px;max-height:300px;"></video>
            `;
            document.querySelector('#videoPreviewContainer video').src = videoUrl;
            isRecording = false;

            injectUploadForm('videoPreviewContainer', submitVideo);
        };

        videoRecorder = mediaRecorder;
        mediaRecorder.start(1000);

        document.getElementById('startRecordBtn').style.display = 'none';
        document.getElementById('stopRecordBtn').style.display = 'flex';
        document.getElementById('recordingStatus').innerHTML = '<div class="recording-indicator"><i class="fas fa-dot-circle"></i> Recording...</div>';

        updateRecordingTimer();
    } catch (error) {
        alert('Could not access camera. Please check permissions.');
    }
}

function stopRecording(recorder = videoRecorder) {
    if (recorder) {
        recorder.stop();
        document.getElementById('startRecordBtn').style.display = 'flex';
        document.getElementById('stopRecordBtn').style.display = 'none';
        document.getElementById('recordingStatus').innerHTML = '';
        isRecording = false;
    }
}

function updateRecordingTimer() {
    if (!isRecording) return;
    recordingTime++;
    const mins = Math.floor(recordingTime / 60);
    const secs = recordingTime % 60;
    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
    const remaining = VIDEO_MAX_DURATION - recordingTime;

    let statusHtml = `<div class="recording-indicator"><i class="fas fa-dot-circle"></i> Recording... ${timeStr}</div>`;

    if (remaining <= 30) {
        statusHtml += `<p style="color:#ff9800;font-size:0.9rem;margin-top:5px;">⚠ ${remaining}s remaining</p>`;
    }

    document.getElementById('recordingStatus').innerHTML = statusHtml;

    if (recordingTime >= VIDEO_MAX_DURATION) {
        stopRecording(videoRecorder);
        return;
    }

    setTimeout(updateRecordingTimer, 1000);
}

async function submitVideo(name, message) {
    if (!mediaFile) return;
    try {
        await addEntry(mediaFile, 'video', name, message);
        resetVideoTab();
    } catch(e) {
        alert('Upload failed: ' + e.message);
    }
}

function resetVideoTab() {
    const videoEl = document.getElementById('recordingVideo');
    if (videoEl) videoEl.remove();
    document.getElementById('videoPreviewContainer').innerHTML = '';
    mediaFile = null;
    recordedChunks = [];
}

// ═══════════════════════════════════════════════════
//  MESSAGE
// ═══════════════════════════════════════════════════

function submitMessage(event) {
    event.preventDefault();
    const name = document.getElementById('userName').value.trim();
    const message = document.getElementById('userMessage').value.trim();

    if (!name || !message) {
        alert('Please fill in both your name and message.');
        return;
    }

    addMessageEntry(name, message).then(() => {
        document.getElementById('userName').value = '';
        document.getElementById('userMessage').value = '';
        loadGallery();
        showSuccess();
        setTimeout(() => showThankYou(), 800);
    }).catch(e => {
        alert('Failed to send message: ' + e.message);
    });
}

async function addMessageEntry(name, message) {
    const { entries, sha } = await fetchRecords();
    const entry = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2),
        type: 'message',
        name: name,
        message: message,
        filename: null,
        url: null,
        timestamp: new Date().toISOString()
    };
    entries.push(entry);
    await saveRecords(entries, sha);

    const local = getLocalUploads();
    local.push(entry);
    saveLocalUploads(local);
}

// ═══════════════════════════════════════════════════
//  PHOTOBOOTH
// ═══════════════════════════════════════════════════

function selectFrame(frame) {
    currentFrame = frame;
    document.querySelectorAll('.frame-option').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

async function startPhotobooth() {
    try {
        photoboothStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: VIDEO_WIDTH }, height: { ideal: VIDEO_HEIGHT } },
            audio: false
        });
        document.getElementById('photoboothVideo').srcObject = photoboothStream;
        document.getElementById('startPhotobooth').style.display = 'none';
        document.getElementById('stopPhotobooth').style.display = 'flex';
        document.getElementById('capturePhoto').style.display = 'flex';
    } catch (error) {
        alert('Could not access camera. Please check permissions.');
    }
}

function stopPhotobooth() {
    if (photoboothStream) {
        photoboothStream.getTracks().forEach(track => track.stop());
        document.getElementById('startPhotobooth').style.display = 'flex';
        document.getElementById('stopPhotobooth').style.display = 'none';
        document.getElementById('capturePhoto').style.display = 'none';
    }
}

function capturePhoto() {
    const video = document.getElementById('photoboothVideo');
    const canvas = document.getElementById('photoboothCanvas');
    const ctx = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0);
    drawFrame(ctx, canvas.width, canvas.height);

    let countdown = 3;
    const countdownEl = document.getElementById('countdownTimer');
    countdownEl.classList.add('active');
    countdownEl.textContent = countdown;

    const countdownInterval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            countdownEl.textContent = countdown;
        } else {
            clearInterval(countdownInterval);
            countdownEl.classList.remove('active');
            const imageData = canvas.toDataURL('image/png');
            showPhotoboothPreview(imageData);
        }
    }, 1000);
}

function drawFrame(ctx, width, height) {
    ctx.lineWidth = 8;
    switch(currentFrame) {
        case 'classic':
            ctx.strokeStyle = '#D4A574';
            ctx.strokeRect(10, 10, width - 20, height - 20);
            break;
        case 'hearts':
            ctx.strokeStyle = '#8B6B43';
            ctx.strokeRect(10, 10, width - 20, height - 20);
            ctx.font = 'bold 40px Arial';
            ctx.fillStyle = '#8B6B43';
            ctx.fillText('🤎', 20, 50);
            ctx.fillText('🤎', width - 70, 50);
            ctx.fillText('🤎', 20, height - 20);
            ctx.fillText('🤎', width - 70, height - 20);
            break;
    }
}

function showPhotoboothPreview(imageData) {
    const preview = document.getElementById('photoboothPreview');
    preview.innerHTML = `
        <img src="${imageData}" alt="photobooth" style="max-width:100%;border-radius:10px;">
        <div class="photobooth-actions">
            <button class="btn btn-secondary" onclick="downloadPhotoboothPhoto('${imageData}')">
                <i class="fas fa-download"></i> Download
            </button>
            <button class="btn btn-info" onclick="capturePhoto()">
                <i class="fas fa-redo"></i> Take Another
            </button>
        </div>
    `;
    injectUploadForm('photoboothPreview', (name, message) => {
        submitPhotobooth(imageData, name, message);
    });
}

function downloadPhotoboothPhoto(imageData) {
    const link = document.createElement('a');
    link.href = imageData;
    link.download = `photobooth_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function submitPhotobooth(imageData, name, message) {
    try {
        const resp = await fetch(imageData);
        const blob = await resp.blob();
        await addEntry(blob, 'photobooth', name, message);
        document.getElementById('photoboothPreview').innerHTML = '';
        showSuccess();
        setTimeout(() => showThankYou(), 800);
    } catch(e) {
        alert('Upload failed: ' + e.message);
    }
}

// ═══════════════════════════════════════════════════
//  LOCAL STORAGE HELPERS
// ═══════════════════════════════════════════════════

function getLocalUploads() {
    try {
        const stored = localStorage.getItem('bd_myUploads');
        return stored ? JSON.parse(stored) : [];
    } catch(e) { return []; }
}

function saveLocalUploads(entries) {
    localStorage.setItem('bd_myUploads', JSON.stringify(entries));
}

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function addEntry(fileOrBlob, type, name, message) {
    const { entries, sha } = await fetchRecords();

    const safeName = encodeURIComponent(
        name.replace(/[^\w\u4e00-\u9fff\u3400-\u4dbf\s]/g, '').substring(0, 20)
    );
    const ext = type === 'photobooth' ? 'png' : type === 'photo' ? 'jpg' : 'webm';
    const filename = `${type}_${safeName}_${Date.now()}.${ext}`;

    const base64 = await blobToBase64(fileOrBlob);
    await uploadFile(filename, base64);

    const entry = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2),
        type: type,
        name: name,
        message: message,
        filename: filename,
        url: `${RAW_BASE}/${UPLOAD_PATH}/${filename}`,
        timestamp: new Date().toISOString()
    };

    entries.push(entry);
    await saveRecords(entries, sha);

    const local = getLocalUploads();
    local.push(entry);
    saveLocalUploads(local);

    loadGallery();
    showSuccess();
    setTimeout(() => showThankYou(), 800);
}

// ═══════════════════════════════════════════════════
//  HTML ESCAPE HELPER
// ═══════════════════════════════════════════════════

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ═══════════════════════════════════════════════════
//  GALLERY (stacks vertically, only shows local uploads)
// ═══════════════════════════════════════════════════

async function loadGallery() {
    const gallery = document.getElementById('gallery');
    const section = document.getElementById('gallerySection');
    const entries = getLocalUploads();
    cachedEntries = entries;

    if (entries.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';

    gallery.innerHTML = entries.map((entry, index) => {
        let mediaHtml = '';
        const safeName = escapeHtml(entry.name);
        const safeMessage = escapeHtml(entry.message || 'No message');

        if (entry.type === 'message') {
            mediaHtml = `<div style="width:100%;padding:20px;display:flex;align-items:center;justify-content:center;text-align:center;background:linear-gradient(135deg,#8B6B43 0%,#6b4f30 100%);border-radius:10px;">
                <div>
                    <i class="fas fa-comment" style="font-size:3rem;margin-bottom:10px;color:#f5e6d3;"></i>
                    <p style="color:#f5e6d3;">${safeName}</p>
                </div>
            </div>`;
        } else if (entry.type === 'photobooth') {
            mediaHtml = `<img src="${entry.url}" style="width:100%;height:100%;object-fit:cover;" alt="photobooth" loading="lazy">`;
        } else {
            const tag = entry.type === 'video' ? 'video' : 'img';
            const controls = entry.type === 'video' ? 'controls' : '';
            mediaHtml = `<${tag} src="${entry.url}" ${controls} style="width:100%;height:100%;object-fit:cover;" loading="lazy"></${tag}>`;
        }

        return `
            <div class="gallery-item" onclick="openModal(${index})">
                <button class="gallery-item-delete" onclick="event.stopPropagation();deleteEntry(${index})" title="Delete">✕</button>
                <div class="gallery-item-media">${mediaHtml}</div>
                <div class="gallery-item-content">
                    <div class="gallery-item-name">${safeName}</div>
                    <div class="gallery-item-message">${safeMessage}</div>
                    <div class="gallery-item-type">${entry.type === 'photobooth' ? '📷 Photobooth' : escapeHtml(entry.type)}</div>
                    <div class="gallery-item-time">${new Date(entry.timestamp).toLocaleString()}</div>
                </div>
            </div>
        `;
    }).join('');
}

// ═══════════════════════════════════════════════════
//  MODAL
// ═══════════════════════════════════════════════════

function openModal(index) {
    const entry = cachedEntries[index];
    const safeName = escapeHtml(entry.name);
    const safeMessage = escapeHtml(entry.message || 'No message provided');

    if (entry.type === 'message') {
        document.getElementById('modalMedia').innerHTML = `
            <div style="background:linear-gradient(135deg,#8B6B43 0%,#6b4f30 100%);color:#f5e6d3;padding:60px 20px;border-radius:15px;text-align:center;">
                <i class="fas fa-comment" style="font-size:4rem;margin-bottom:20px;"></i>
                <p style="font-size:1.2rem;">${safeName}</p>
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

    document.getElementById('modal').classList.add('active');
}

function closeModal(event) {
    if (event && event.target.id !== 'modal') return;
    document.getElementById('modal').classList.remove('active');
}

// ═══════════════════════════════════════════════════
//  DELETE (confirm once, no password)
// ═══════════════════════════════════════════════════

async function deleteEntry(index) {
    if (!confirm('Delete this entry?')) return;
    try {
        const { entries, sha } = await fetchRecords();
        const entry = cachedEntries[index];
        const githubIndex = entries.findIndex(e => e.id === entry.id);
        if (githubIndex !== -1) {
            entries.splice(githubIndex, 1);
            await saveRecords(entries, sha);
        }

        const local = getLocalUploads();
        local.splice(index, 1);
        saveLocalUploads(local);

        closeModal();
        loadGallery();
    } catch(e) {
        alert('Failed to delete: ' + e.message);
    }
}

// ═══════════════════════════════════════════════════
//  SUCCESS / THANK YOU / KEYBOARD
// ═══════════════════════════════════════════════════

function showSuccess() {
    const msg = document.getElementById('successMessage');
    msg.classList.add('show');
    setTimeout(() => msg.classList.remove('show'), 3000);
}

function showThankYou() {
    document.getElementById('thankYouModal').classList.add('active');
}

function closeThankYou(event) {
    if (event && event.target.id !== 'thankYouModal') return;
    document.getElementById('thankYouModal').classList.remove('active');
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
        closeThankYou();
    }
});