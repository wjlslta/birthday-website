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
let dialogueIndex = 0;

// ── Init ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
    updateCountdown();
    setInterval(updateCountdown, 1000);
    birthdaySuprise();
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
        birthdaySuprise();
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

    // Prefer explicit raw URL when available — avoids worker payload issues
    if (entry.url) {
        mediaUrlCache.set(cacheKey, entry.url);
        return entry.url;
    }

    if (!entry.filename) {
        const fallback = '';
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

/**
 * Transcribed from whiteboard image. Columns:
 * [delayMs, durationMs, text, yesLabel, noLabel]
 *
 * delayMs / durationMs are PLACEHOLDERS. The whiteboard has no timing
 * numbers written anywhere — I filled defaults (0 delay / 600ms duration)
 * so the array is structurally complete. You need to tune these yourself,
 * they are guesses, not transcribed data.
 *
 * yesLabel/noLabel: defaulted to "Yes"/"No" for every line where a choice
 * is plausible. Set to null where the screen reads as auto-advancing
 * (pauses, the "page lagged/fix" glitch bit, and the two ending sequences)
 * — i.e. no real decision is being presented at that line. You know the
 * branching logic; I don't, so verify these null spots match your code flow.
 *
 * One line was illegible (marked below) — best guess used, flagged inline.
 */

const dialogueScript = [
  [0, 600, "Janice, Will you be my girlfriend?? ", "Yes", "No"],
  [0, 600, "Hehe!", "Yes", "No"],
  [0, 600, "Yay!", "Yes", "No"],
  [0, 600, "We're together now!", "Yes", "No"],
  [0, 600, "Yay!!!", "Yes", "No"],
  [0, 600, "Okay, you can press no now", "Yes", "No"],
  [0, 600, "Ummm.....", "Yes", "No"],
  [0, 600, "Are you sure you pressed the right button?", "Yes", "No"],
  [0, 600, "It's the other button", "Yes", "No"],
  [0, 600, "The one that says 'no'?", "Yes", "No"],
  [0, 600, "The one that's not moving around??!", "Yes", "No"],
  [0, 600, "Like...", "Yes", "No"],
  [0, 600, "Pressing this button requires effort you know?", "Yes", "No"],
  [0, 600, "It's like moving around your screen", "Yes", "No"],
  [0, 600, "Pressing the other button is easier right?", "Yes", "No"],
  [0, 600, "It doesn't move around", "Yes", "No"],
  [0, 600, "Press that one", "Yes", "No"],
  [0, 600, "Please...", "Yes", "No"],
  [0, 600, "Writing this is difficult...", "Yes", "No"],
  [0, 600, "......", "Continue", null],
  [0, 600, "I'm running out of ideas", "Yes", "No"],
  [0, 600, "Pleaseeeeee :(", "Yes", "No"],
  [0, 600, "Pretty pleaseee", "Yes", "No"],
  [0, 600, "Look I'll cut you a deal... but you'll have to stop pressing yes", "Okay", "No"],
  [0, 600, "So ummm is a boba okay??", "Not Enough", "No"],
  [0, 600, "Pretty please with a boba :)", "Yes", "No"],
  [0, 600, "Is that not good enough??", "Yes", "No"],
  [0, 600, "Ummm.....", "Yes", "No"],
  [0, 600, "What if I add a plushie...", "Yes", "No"],
  [0, 600, "No???!!", "Yes", "No"],
  [0, 600, "You want a jelly cat? Fine...", "Yes", "No"],
  [0, 600, "Pretty please with a jelly cat and boba??", "Yes", "No"],
  [0, 600, "Still no??", "Yes", "No"],
  [0, 600, "I'm running out of ideas", "Yes", "No"],
  [0, 600, "Really.....", "Yes", "No"],
  [0, 600, "Wait... what if it's a dino plushie", "Yes", "No"],
  [0, 600, "Please please please with boba and a dino jelly cat??", "Yes", "No"],
  [0, 600, "Still no?!! :(", "Yes", "No"],
  [0, 600, "......", "Continue", null],
  [0, 600, "......", "Continue", null],
  [0, 600, "......", "Continue", null],
  [0, 600, "......", "Continue", null],
  [0, 600, "Why are you still clicking", "Yes", "No"],
  [0, 600, "Do you have some kind of ulterior motive??!", "Yes", "No"],
  [0, 600, "Like I thought you didn't want boyfriends", "Yes", "No"],
  [0, 600, "I thought you only preferred situationships", "Yes", "No"],
  [0, 600, "So click No", "Yes", "No"],
  [0, 600, "This isn't you at all", "Yes", "No"],
  [0, 600, "Wait...", "Yes", "No"],
  [0, 600, "Or unless you aren't Janice??!", "Yes", "No"],
  [0, 600, "Like, Janice wouldn't say yes to me so many times", "Yes", "No"],
  [0, 600, "Janice, will you be my girlfriend??", "Yes", "No"],
  [0, 600, "Look, see...", "Yes", "No"],
  [0, 600, "This isn't you... at all", "Yes", "No"],
  [0, 600, "Wait unless you have an ulterior motive...", "Yes", "No"],
  [0, 600, "......", "Continue", null],
  [0, 600, "......", "Continue", null],
  [0, 600, "Is this to spite someone?!!", "Yes", "No"],
  [0, 600, "Look, there's no one here...", "Yes", "No"],
  [0, 600, "CY isn't here :(", "Yes", "No"], // illegible name on whiteboard, guessed "She"
  [0, 600, "She doesn't know about this", "Yes", "No"],
  [0, 600, "This is just for you...", "Yes", "No"],
  [0, 600, "So I guess", "Yes", "No"],
  [0, 600, "That's not it??", "Yes", "No"],
  [0, 600, "Look.....", "Yes", "No"],
  [0, 600, "Boba still up on the table", "Yes", "No"],
  [0, 600, "I can still give it to you if you want", "Yes", "No"],
  [0, 600, "Just press no :)", "Yes", "No"],
  [0, 600, "It's getting warm...", "Yes", "No"],
  [1000, 800, ".....", null, null], // dot-row pause on whiteboard, no choice shown
  [0, 600, "......", "Continue", null],
  [0, 600, "......", "Continue", null],
  [0, 600, "......", "Continue", null],
  [0, 600, "......", "Continue", null],
  [0, 600, "Wait, what are you still clicking yes for??", "Yes", "No"],
  [0, 600, "There's nothing left I promise", "Yes", "No"],
  [0, 600, "Like really.....", "Yes", "No"],
  [0, 600, "Why are you still clicking yes?!", "Yes", "No"],
  [0, 600, "You should click No no??", "Yes", "No"],
  [0, 600, "That's where you can see all your friends' stuff??", "Yes", "No"],
  [0, 600, "There's nothing here I swear", "Yes", "No"],
  [0, 600, "It's just me rambling to myself.....", "Yes", "No"],
  [0, 600, "Okay...", "Yes", "No"],
  [0, 600, "You know what?", "Yes", "No"],
  [0, 600, "You just think it's FUNNY huh?!!?", "Yes", "No"],
  [0, 600, "W41T --- WH4T5 H4PP3N1NG??", "Yes", "No"],
  [0, 600, "TH15 1SNT M3??!", "Yes", "No"],
  [0, 400, "Sorry", "Continue", null],
  [0, 400, "Page lagged for a sec...", "Continue", null],
  [2000, 500, "Lemme fix", "Continue", null],
  [500, 1500, "Fix.....", "Continue", null],
  [0, 600, "Are you happy now??!", "Yes", "No"],
  [0, 600, "You broke the website...", "Yes", "No"],
  [0, 600, "You made me angry", "Yes", "No"],
  [0, 600, "And I don't wanna be angry at you", "Yes", "No"],
  [0, 600, "Click no please...", "Yes", "No"],
  [0, 600, "I really didn't wanna take this far", "Yes", "No"],
  [0, 600, "If you don't click it, it's gonna break again...", "Yes", "No"],
  [0, 600, "And I'm gonna be mad again...", "Yes", "No"],
  [0, 600, "......", "Continue", null],
  [0, 600, "Or are you being serious??", "Yes", "No"],
  [0, 600, "Like you actually wanna be my gf??", "Yes", "No"],
  [0, 600, "I mean...", "Yes", "No"],
  [0, 600, "You did press like a bajillion times at this point", "Yes", "No"],
  [0, 600, "I dunno what to think about it", "Yes", "No"],
  [0, 600, "I thought we were joking around no??", "Yes", "No"],
  [0, 600, "I thought we weren't serious??", "Yes", "No"],
  [0, 600, "Well okay fine", "Yes", "No"],
  [0, 600, "I guess you are", "Yes", "No"],
  [0, 600, "So ummm...", "Yes", "No"],
  [0, 600, "What do we do now?", "Yes", "No"],
  [0, 600, "Like I don't have any plans for this", "Yes", "No"],
  [0, 600, "I never thought you'd get this far", "Yes", "No"],
  [0, 600, "And I've never thought about this being real...", "Yes", "No"],
  [0, 600, "🌩️🌩️🌩️", "Continue", null],
  [800, 1000, "Happy birthday!!!", null, null], // path end card
  [0, 600, "Wait hold on... what happened", null, null],
  [0, 600, "Lemme check my logs real quick...", null, null],
  [1200, 800, ".....", null, null],
  [0, 700, "Wait WHAT", null, null],
  [0, 700, "You said yes??!", null, null],
  [0, 700, "I was joking", null, null],
  [0, 700, "Are you actually being serious???", null, null],
  [0, 700, "Whatever... i dunno what to say", null, null],
  [0, 700, "Happy birthday again", null, null],
  [0, 700, "Thanks for clicking yes a bajillion times and building my ego...", null, null],
];

function showOverlay() {
    const overlay = document.getElementById('myOverlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    overlay.classList.add('visible');
}

async function birthdaySuprise() {
    console.log("birthdaySuprise started");
    showOverlay();
    const entry = dialogueScript[dialogueIndex] || dialogueScript[0];
    await updateText(entry[0], entry[1], entry[2]);
    await new Promise (resolve => {
        yesbtn.addEventListener('click', () => {
        updateButtons(entry[3], entry[4])
        dialogueIndex++;
        resolve;
    })})}


async function updateText(delay, reveal, text) {
    console.log("updateText start");
    const message = document.getElementById("bdaymessage");
    message.textContent = "";

    await new Promise (resolve => setTimeout(resolve, delay));

    const letterDelay = reveal / text.length;

    for(let letter = 0; letter < text.length; letter++){
        message.textContent += text.charAt(letter);
        await new Promise (resolve => setTimeout(resolve, letterDelay));
    }
    console.log("updateText Finished");
}

function updateButtons(ybtn, nbtn) {
    console.log("updateButtons Started");
    const yesbtn = document.getElementById("yesbtn");
    const nobtn = document.getElementById("nobtn");
    if (!yesbtn || !nobtn) return;

    yesbtn.textContent = ybtn;
    nobtn.textContent = nbtn;

    const w = window.innerWidth - yesbtn.offsetWidth;
    const h = window.innerHeight - yesbtn.offsetHeight;

    yesbtn.style.cssText = `position:absolute; left:${Math.random() * w}px; top:${(() => {
        let y = Math.random() * h;
        while (y > window.innerHeight * 0.3 && y < window.innerHeight * 0.5) {
            y = Math.random() * h;
        }
        return y;
    })()}px`;
    nobtn.style.position = 'relative';
    console.log("updateButtons Finished");
}