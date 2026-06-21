// ╔══════════════════════════════════════════════════╗
// ║  upload.js — birthday wishes uploader + gallery  ║
// ║  stores everything in GitHub: birthday-wishes/   ║
// ╚══════════════════════════════════════════════════╝

// ── CONFIG ──────────────────────────────────────────
const GITHUB_TOKEN = 'YOUR_GITHUB_PAT_HERE'; // ← PASTE YOUR TOKEN HERE
const REPO_OWNER   = 'wjlslta';
const REPO_NAME    = 'birthday-website';
const UPLOAD_PATH  = 'birthday-wishes';           // folder in repo
const RECORDS_FILE = 'birthday-wishes/records.json';
const RAW_BASE     = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main`;
const API_BASE     = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents`;

let mediaFile     = null;
let videoRecorder = null;
let recordedChunks = [];
let isRecording    = false;
let recordingTime  = 0;
let currentFrame   = 'classic';
let photoboothStream = null;
let pendingDeleteIndex = null;
const CORRECT_PASSWORD = '0304';

// ── Init ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
    updateCountdown();
    setInterval(updateCountdown, 1000);
    loadGallery();
    setupDropZone();
});

// ── Countdown ──────────────────────────────────────
function updateCountdown() {
    const targetDate = new Date('2026-06-28T00:00:00').getTime();
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

// ── Tabs ───────────────────────────────────────────
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
}

// ── Drop zone ──────────────────────────────────────
function setupDropZone() {
    const dropZone = document.getElementById('dropZone');
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
        handlePhotoUpload(e.dataTransfer.files[0]);
    });
}

document.getElementById('photoInput').addEventListener('change', (e) => {
    handlePhotoUpload(e.target.files[0]);
});

function handlePhotoUpload(file) {
    if (!file) return;
    mediaFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('photoPreview').innerHTML = `
            <img src="${e.target.result}" alt="preview">
            <button class="btn btn-primary" style="margin-top: 15px;" onclick="submitPhoto()">
                <i class="fas fa-upload"></i> Upload Photo
            </button>
        `;
    };
    reader.readAsDataURL(file);
}

// ═════════════════════════════════════════════════════
//  GITHUB API HELPERS
// ═════════════════════════════════════════════════════

async function githubGet(path) {
    const resp = await fetch(`${API_BASE}/${path}`, {
        headers: { Authorization: `Bearer ${GITHUB_TOKEN}` }
    });
    if (!resp.ok) throw new Error(`GET ${path}: ${resp.status}`);
    return resp.json();
}

async function githubPut(path, contentBase64, message, sha) {
    const body = {
        message: message,
        content: contentBase64,
        branch: 'main'
    };
    if (sha) body.sha = sha;

    const resp = await fetch(`${API_BASE}/${path}`, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(`PUT ${path}: ${resp.status} — ${err.message || 'unknown'}`);
    }
    return resp.json();
}

// reads records.json from GitHub, returns { sha, entries }
async function fetchRecords() {
    try {
        const data = await githubGet(RECORDS_FILE);
        // content is base64-encoded in GitHub API
        const decoded = atob(data.content.replace(/\n/g, ''));
        const parsed = JSON.parse(decoded);
        return { sha: data.sha, entries: parsed.entries || [] };
    } catch (e) {
        // file doesn't exist yet — create it
        console.log('records.json not found, starting fresh');
        return { sha: null, entries: [] };
    }
}

// saves records.json back to GitHub
async function saveRecords(entries, sha) {
    const json = JSON.stringify({ entries: entries }, null, 2);
    const base64 = btoa(unescape(encodeURIComponent(json)));
    const result = await githubPut(RECORDS_FILE, base64, 'Update birthday wishes records', sha);
    return result.content.sha; // return new SHA
}

// upload a file (photo/video/photobooth) to birthday-wishes/ folder
async function uploadFile(filename, base64Data) {
    await githubPut(`${UPLOAD_PATH}/${filename}`, base64Data, `Add ${filename}`);
}

// ═════════════════════════════════════════════════════
//  SUBMISSION FLOWS
// ═════════════════════════════════════════════════════

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // strip data:... prefix
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function submitPhoto() {
    if (!mediaFile) return;
    const name = prompt("What's your name?") || 'Anonymous';
    const message = prompt('Write a short message (optional)') || '';
    try {
        await addEntry(mediaFile, 'photo', name, message);
        resetPhotoTab();
    } catch(e) {
        alert('Upload failed: ' + e.message);
    }
}

async function submitVideo() {
    if (!mediaFile) return;
    const name = prompt("What's your name?") || 'Anonymous';
    const message = prompt('Write a short message (optional)') || '';
    try {
        await addEntry(mediaFile, 'video', name, message);
        resetVideoTab();
    } catch(e) {
        alert('Upload failed: ' + e.message);
    }
}

async function submitAll(event) {
    event.preventDefault();
    const name = document.getElementById('userName').value;
    const message = document.getElementById('userMessage').value;

    try {
        const { entries, sha } = await fetchRecords();
        const entry = {
            id: crypto.randomUUID(),
            type: 'message',
            name: name,
            message: message,
            filename: null,
            url: null,
            timestamp: new Date().toISOString()
        };
        entries.push(entry);
        await saveRecords(entries, sha);

        document.getElementById('userName').value = '';
        document.getElementById('userMessage').value = '';
        loadGallery();
        showSuccess();
        setTimeout(() => showThankYou(), 800);
    } catch(e) {
        alert('Failed to send message: ' + e.message);
    }
}

async function addToGallery(entry) {
    // no-op — replaced by GitHub flow, kept for compat
}

async function addEntry(fileOrBlob, type, name, message) {
    // 1. Fetch current records
    const { entries, sha } = await fetchRecords();

    // 2. Generate filename
    const ext = type === 'photobooth' ? 'png' : type === 'photo' ? 'jpg' : 'webm';
    const safeName = name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
    const filename = `${type}_${safeName}_${Date.now()}.${ext}`;

    // 3. Convert to base64 and upload file
    const base64 = await blobToBase64(fileOrBlob);
    await uploadFile(filename, base64);

    // 4. Create record entry
    const entry = {
        id: crypto.randomUUID(),
        type: type,
        name: name,
        message: message,
        filename: filename,
        url: `${RAW_BASE}/${UPLOAD_PATH}/${filename}`,
        timestamp: new Date().toISOString()
    };

    // 5. Append to records and save
    entries.push(entry);
    await saveRecords(entries, sha);

    // 6. Refresh gallery
    loadGallery();
    showSuccess();
    setTimeout(() => showThankYou(), 800);
}

// ═════════════════════════════════════════════════════
//  PHOTOBOOTH
// ═════════════════════════════════════════════════════

function selectFrame(frame) {
    currentFrame = frame;
    document.querySelectorAll('.frame-option').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

async function startPhotobooth() {
    try {
        photoboothStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
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
            ctx.strokeStyle = '#8B6B63';
            ctx.lineWidth = 8;
            ctx.strokeRect(10, 10, width - 20, height - 20);
            ctx.font = 'bold 40px Arial';
            ctx.fillStyle = '#8B6B63';
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
        <img src="${imageData}" alt="photobooth">
        <div class="photobooth-actions">
            <button class="btn btn-secondary" onclick="downloadPhotoboothPhoto('${imageData}')">
                <i class="fas fa-download"></i> Download
            </button>
            <button class="btn btn-primary" onclick="addPhotoboothToGallery('${imageData}')">
                <i class="fas fa-share"></i> Post to Gallery
            </button>
            <button class="btn btn-info" onclick="capturePhoto()">
                <i class="fas fa-redo"></i> Take Another
            </button>
        </div>
    `;
}

function downloadPhotoboothPhoto(imageData) {
    const link = document.createElement('a');
    link.href = imageData;
    link.download = `photobooth_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function addPhotoboothToGallery(imageData) {
    const name = prompt("What's your name?") || 'Anonymous';
    const message = prompt('Add a message (optional)') || '';

    // Convert data URL to blob for upload
    const resp = await fetch(imageData);
    const blob = await resp.blob();

    try {
        await addEntry(blob, 'photobooth', name, message);
        document.getElementById('photoboothPreview').innerHTML = '';
    } catch(e) {
        alert('Upload failed: ' + e.message);
    }
}

// ═════════════════════════════════════════════════════
//  VIDEO RECORDING
// ═════════════════════════════════════════════════════

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const videoEl = document.createElement('video');
        videoEl.id = 'recordingVideo';
        videoEl.style.display = 'none';
        videoEl.srcObject = stream;
        videoEl.play();
        document.body.appendChild(videoEl);

        const mediaRecorder = new MediaRecorder(stream);
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
                <video controls style="margin-top: 15px; width: 100%; border-radius: 10px;"></video>
                <button class="btn btn-primary" style="margin-top: 15px;" onclick="submitVideo()">
                    <i class="fas fa-upload"></i> Upload Video
                </button>
            `;
            document.querySelector('#videoPreviewContainer video').src = videoUrl;
            isRecording = false;
        };

        setTimeout(() => {
            if (isRecording) stopRecording(mediaRecorder);
        }, 30000);

        videoRecorder = mediaRecorder;
        mediaRecorder.start();

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
    if (isRecording) {
        recordingTime++;
        document.getElementById('recordingStatus').innerHTML = `<div class="recording-indicator"><i class="fas fa-dot-circle"></i> Recording... ${recordingTime}s</div>`;
        setTimeout(updateRecordingTimer, 1000);
    }
}

// ═════════════════════════════════════════════════════
//  GALLERY (loaded from GitHub records.json)
// ═════════════════════════════════════════════════════

async function loadGallery() {
    const gallery = document.getElementById('gallery');

    try {
        const { entries } = await fetchRecords();

        if (entries.length === 0) {
            gallery.innerHTML = `
                <div class="empty-gallery">
                    <i class="fas fa-inbox"></i>
                    <p>No memories yet.<br>Be the first to share! 💝</p>
                </div>
            `;
            return;
        }

        gallery.innerHTML = entries.map((entry, index) => {
            let mediaHtml = '';
            if (entry.type === 'message') {
                mediaHtml = `<div style="width: 100%; padding: 20px; display: flex; align-items: center; justify-content: center; text-align: center; background: linear-gradient(135deg, #8B6B63 0%, #A67B7B 100%); border-radius: 10px;">
                    <div>
                        <i class="fas fa-comment" style="font-size: 3rem; margin-bottom: 10px; color: #f5e6d3;"></i>
                        <p style="color: #f5e6d3;">${entry.name}</p>
                    </div>
                </div>`;
            } else if (entry.type === 'photobooth') {
                mediaHtml = `<img src="${entry.url}" style="width: 100%; height: 100%; object-fit: cover;" alt="photobooth" loading="lazy">`;
            } else {
                mediaHtml = `<${entry.type === 'video' ? 'video' : 'img'} src="${entry.url}" ${entry.type === 'video' ? 'controls' : ''} style="width: 100%; height: 100%; object-fit: cover;" loading="lazy">`;
            }

            return `
                <div class="gallery-item admin" onclick="openModal(${index})">
                    <div class="gallery-item-media">${mediaHtml}</div>
                    <div class="gallery-item-content">
                        <div class="gallery-item-name">${entry.name}</div>
                        <div class="gallery-item-message">${entry.message || 'No message'}</div>
                        <div class="gallery-item-type">${entry.type === 'photobooth' ? '📷 Photobooth' : entry.type}</div>
                        <div class="gallery-item-time">${new Date(entry.timestamp).toLocaleString()}</div>
                        <div class="gallery-item-actions" onclick="event.stopPropagation()">
                            <button class="btn btn-secondary btn-sm" onclick="downloadEntry(${index})">
                                <i class="fas fa-download"></i> Download
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="requestDeleteEntry(${index})">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
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

// keep a cached copy of entries for modal/download/delete
let cachedEntries = [];

async function getEntries() {
    const { entries } = await fetchRecords();
    cachedEntries = entries;
    return entries;
}

// ── Modal ──────────────────────────────────────────
async function openModal(index) {
    const entries = await getEntries();
    const entry = entries[index];

    if (entry.type === 'message') {
        document.getElementById('modalMedia').innerHTML = `
            <div style="background: linear-gradient(135deg, #8B6B63 0%, #A67B7B 100%); color: #f5e6d3; padding: 60px 20px; border-radius: 15px; text-align: center;">
                <i class="fas fa-comment" style="font-size: 4rem; margin-bottom: 20px;"></i>
                <p style="font-size: 1.2rem;">${entry.name}</p>
            </div>
        `;
    } else if (entry.type === 'photobooth') {
        document.getElementById('modalMedia').innerHTML = `<img src="${entry.url}" style="width: 100%; border-radius: 15px;" alt="photobooth">`;
    } else {
        document.getElementById('modalMedia').innerHTML = `<${entry.type === 'video' ? 'video' : 'img'} src="${entry.url}" ${entry.type === 'video' ? 'controls' : ''} style="width: 100%; border-radius: 15px;">`;
    }

    document.getElementById('modalName').textContent = entry.name;
    document.getElementById('modalMessage').textContent = entry.message || 'No message provided';
    document.getElementById('modalTime').textContent = new Date(entry.timestamp).toLocaleString();

    document.getElementById('modalActions').innerHTML = `
        <button class="btn btn-secondary" onclick="downloadEntry(${index})">
            <i class="fas fa-download"></i> Download
        </button>
        <button class="btn btn-danger" onclick="requestDeleteEntry(${index})">
            <i class="fas fa-trash"></i> Delete
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

// ── Delete (with password) ─────────────────────────
function requestDeleteEntry(index) {
    pendingDeleteIndex = index;
    document.getElementById('deletePassword').value = '';
    document.getElementById('passwordError').style.display = 'none';
    document.getElementById('passwordModal').classList.add('active');
    document.getElementById('deletePassword').focus();
}

function verifyPassword() {
    const password = document.getElementById('deletePassword').value;
    const errorDiv = document.getElementById('passwordError');

    if (password === CORRECT_PASSWORD) {
        closePasswordModal();
        deleteEntry(pendingDeleteIndex);
        pendingDeleteIndex = null;
    } else {
        errorDiv.textContent = '❌ Incorrect password. Please try again.';
        errorDiv.style.display = 'block';
        document.getElementById('deletePassword').value = '';
        document.getElementById('deletePassword').focus();
    }
}

async function deleteEntry(index) {
    try {
        const { entries, sha } = await fetchRecords();
        entries.splice(index, 1);
        await saveRecords(entries, sha);
        closeModal();
        loadGallery();
        alert('Entry deleted successfully!');
    } catch(e) {
        alert('Failed to delete: ' + e.message);
    }
}

// ── Modals ─────────────────────────────────────────
function closeModal(event) {
    if (event && event.target.id !== 'modal') return;
    document.getElementById('modal').classList.remove('active');
}

function closePasswordModal(event) {
    if (event && event.target.id !== 'passwordModal') return;
    document.getElementById('passwordModal').classList.remove('active');
    pendingDeleteIndex = null;
}

function resetPhotoTab() {
    document.getElementById('photoInput').value = '';
    document.getElementById('photoPreview').innerHTML = '';
    mediaFile = null;
}

function resetVideoTab() {
    const videoEl = document.getElementById('recordingVideo');
    if (videoEl) videoEl.remove();
    document.getElementById('videoPreviewContainer').innerHTML = '';
    mediaFile = null;
    recordedChunks = [];
}

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

// ── Keyboard shortcuts ─────────────────────────────
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
        closeThankYou();
        closePasswordModal();
    }
    if (e.key === 'Enter' && document.getElementById('passwordModal').classList.contains('active')) {
        verifyPassword();
    }
});
