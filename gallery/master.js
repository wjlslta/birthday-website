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


// Redesigned dialogueScript — v3 (per-message branching in main storyline)
//
// Schema (per row):
//   [animKey, animDuration, messageText, button1Text, button2Text, nav1, nav2]
//
// BRANCHING RULES (v3):
//   • Main storyline (YES chain lines 0-110 and NO chain lines 111-158):
//     EVERY message must have button2 set to a reachable panel, UNLESS the
//     message is the absolute end of its chain (line 110 = YES victory,
//     line 158 = NO rejection). At the chain endings, button2 MUST be null
//     so the user can't skip past the ending.
//   • Panel-internal lines (any line inside Panels 2-25) and panel-ending
//     lines (last line of each panel, nav1 = -1): button2 MUST be null.
//     No "skip to end" option inside panels — the user must walk through.
//   • nav1 / nav2 = -1 marks the panel ending (conversation can quit there).
//
// Endings tally:
//   24 panel endings (Panels 2-25, nav1 = -1)
// + 2 chain endings (line 110 YES victory, line 158 NO rejection)
// = 26 total endings.

const dialogueScript = [

  // ---------- ROOT ----------
  [350, 850, "Janice, will you be my Girlfriend?", "Yes", "No", 1, 111], // 0

  // ---------- YES BRANCH (every line has a panel exit until line 110) ----------
  [350, 600, "Hehe!!", "Yes", "nope", 2, 159], // 1
  [350, 600, "Yay!! 😃", "Yay!!", "no!", 3, 159], // 2
  [350, 600, "We're together now?!!", "Together!!", "Wait no", 4, 159], // 3
  [350, 600, "Yay!!", "Yay!", "On second thought", 5, 159], // 4
  [350, 600, "Okay... press no now", "Trying now", "press no", 6, 159], // 5

  [350, 600, "Ummm......", "Yes", "nuh-uh", 7, 163], // 6
  [350, 600, "Did you press wrong?", "Whoops", "I didn't", 8, 163], // 7
  [350, 600, "It's the other button......", "Which one?", "other one!!!!!!", 9, 163], // 8
  [350, 600, "★ The one that says \"that one?\"?", "Ohh", "that one?", 10, 163], // 9
  [350, 875, "The one that's NOT moving around!?!", "That one", "This one!!", 11, 163], // 10

  [350, 600, "Like....", "Yes?", null, 12, 174], // 11
  [350, 1150, "pressing this button takes effort, you know?", "It does", "i'm too lazy, imma stop now", 13, 174], // 12
  [350, 875, "It's like... moving around your screen", "Mhmmm", null, 14, null], // 13
  [350, 1050, "Clicking the OTHER one's easier right?", "Yep", "the easy one", 15, 174], // 14

  [350, 700, "It's not moving around......", "Yes", "no~", 16, 179], // 15
  [350, 600, "Press that one 🥺", "Hehe!!", "pressing no", 17, 179], // 16

  [350, 600, "Please...", "Yes", "no thx", 18, 188], // 17
  [350, 725, "Okay this is difficult okay?!", "A little", "no it's not", 19, 188], // 18
  [350, 600, "I'm running out of ideas here...", "Take your time", "no time", 20, 188], // 19
  [350, 600, "Pleaseeeeee 🥺🥺", "Hehe", null, 21, null], // 20
  [350, 600, "Pretty pleaseeee", " neverrr", "okay fineee, here's your no", 22, 188], // 21

  [350, 1625, "Look... I'll cut you a deal. But you'll have to stop pressing yes.", "whats the deal??", null, 23, 201], // 22
  [350, 600, "So ummm is a boba okay??", "Nuh uhhh, ur never gonna convince me", "boba is goodddd", 24, 201], // 23
  [350, 625, "Pretty please with a boba", "Deal!", "no ", 25, 201], // 24

  [350, 625, "That's not enough??", "not enough", "thats fineee", 26, 201], // 25
  [350, 600, "Ummm....", "Then what?", null, 27, null], // 26
  [350, 650, "What if I add a plushie...", "Oooo tempting.... Nope!", "Oooh sureee", 28, 209], // 27
  [350, 600, "No??!!", "Nope", "plushieeeee", 29, 209], // 28

  [350, 750, "You want a jelly cat? Fine....", "not enoughhhh", "Jellycat??!", 30, 222], // 29
  [350, 1025, "Pretty please with a jelly cat AND boba??", "Hmm...", null, 31, null], // 30
  [350, 600, "Still no??...", "nope still", "okayyyy fineee", 32, 222], // 31

  [350, 600, "Running out of ideas...", "Yes", "no ideas?", 33, 240], // 32
  [350, 600, "Really....", "Really/..", null, 34, null], // 33
  [350, 900, "Wait... what about a dino plushie?", "Oooh", null, 35, null], // 34
  [350, 1325, "Please please please with boba AND a dino jelly cat??", "neverrr", "okayy, youve convinced me", 36, 240], // 35

  [350, 600, "Still no??!! 😭", "Yes", "fineeee", 37, 240], // 36
  [350, 750, "Why are you still clicking yes...", "Hehe", null, 38, null], // 37
  [350, 1050, "You got some ulterior motive or what?!", "Maybe~", "Byeeee", 39, 314], // 38
  [350, 1025, "Like... I thought you didn't want boyfriends", "Maybe now i do", null, 40, null], // 39
  [350, 1075, "I thought you only preferred situationships", "Maybe", null, 41, null], // 40
  [350, 600, "So click no...", "opposite of no", "no", 42, 279], // 41
  [350, 675, "This isn't you at all 😭", "It is", null, 43, null], // 42

  [350, 600, "Wait...", "???", null, 44, 297], // 43
  [350, 725, "Or unless you aren't Janice?!", "It is me", null, 45, null], // 44
  [350, 1200, "Like... Janice wouldn't say yes this many times...", "Yes i would", "not me?", 46, 297], // 45
  [350, 875, "Janice, will you be my girlfriend?? 🥺", "Yes!", null, 47, null], // 46
  [350, 600, "Look see...", "Yeah?", null, 48, null], // 47
  [350, 600, "This isn't you... at all", "Watch me", "it is meee", 49, 297], // 48

  [350, 875, "Wait... unless your ulterior motive...", "Yeahhh??", null, 50, 314], // 49
  [350, 700, "Is this to spite someone??!", "Nope", null, 51, null], // 50
  [350, 700, "Look, there's no one here...", "Okay...", "trueee", 52, 314], // 51
  [350, 600, "Cy isn't here (T_T)", "She isn't", null, 53, null], // 52
  [350, 675, "She doesn't know about this", "Secret's safe", null, 54, 314], // 53
  [350, 600, "This is just for you....", "Aw", "fineeee", 55, 314], // 54

  [350, 600, "....", "don't believe you", null, 56, 325], // 55
  [350, 600, "So I guess...", "Yeah", null, 57, null], // 56
  [350, 600, "That's not it??", "Mhmmm hmm", "that's not it", 58, 325], // 57
  [350, 600, "Look....", "Looking", null, 59, null], // 58
  [350, 650, "Boba's still on the table", "Yes please", null, 60, null], // 59
  [350, 950, "I can still give it to you... if you say no", "no thanks", "hmmm fine", 61, 325], // 60
  [350, 600, "Just press no 😭", "nope", null, 62, null], // 61
  [350, 600, "It's getting warm...", "Mhmmm", "fine", 63, 325], // 62

  [350, 600, "......", "Yes", "no no", 64, 337], // 63
  [350, 1075, "Wait, what are you still clicking yes for??", "It's fun", null, 65, null], // 64
  [350, 750, "There's nothing left I promise", "Mhmmmm", "no nothing", 66, 337], // 65
  [350, 600, "Like really......", "Really", null, 67, null], // 66
  [350, 800, "Why are you still clicking yes??", "Why not", null, 68, null], // 67
  [350, 600, "You should click no...", "Still yes!", "show me no", 69, 337], // 68
  [350, 1225, "No is where your friends' wishes are??", "I'm good", "no", 70, 337], // 69
  [350, 700, "There's nothing here I swear", "don't believe you", "okay", 71, 337], // 70

  [350, 925, "It's just me rambling to myself......", "Yes", "nada", 72, 342], // 71
  [350, 600, "Okay....", "Okay", null, 73, null], // 72
  [350, 600, "You know what?", "What?", "no idea", 74, 342], // 73
  [350, 725, "You just think this is funny rn??!", "Maybe", "not funny", 75, 342], // 74
  [350, 600, "ẂAIT --- WH҉AT H̶APPEŃED??", "What?", null, 76, null], // 75
  [350, 600, "Th̶is ísn't m҉---", "Hm?", null, 77, null], // 76
  [350, 625, "CL̶ICK ŃO PLE҉ASE!! QU̶ÍCKLY", "whats happening??!", "NO", 78, 342], // 77

  [350, 600, "Sorry....", "Yes", "no...", 79, 350], // 78
  [350, 600, "Page lagged for a sec", "All good", null, 80, null], // 79
  [350, 600, "*lemme fix.....*", "Take your time", "no fixing", 81, 350], // 80
  [350, 600, "*Fixing*", "Patiently waiting", null, 82, null], // 81
  [350, 600, "Are you happy now??!", "Yes", null, 83, null], // 82
  [350, 600, "You broke the website...", "Whoops", "i broke it", 84, 350], // 83

  [350, 600, "Y̶ou ḿa҉de me gl̷ítch", "Yes", "no!!", 85, 359], // 84
  [350, 1250, "And I don't wa̶nna gĺi҉tch o̷ut in fŕont of you ag҉ain", "No glitching", null, 86, null], // 85
  [350, 600, "Click no please....", "Okay", "No glitch", 87, 359], // 86
  [350, 725, "I really didn't code this far ngl", "Ah", null, 88, null], // 87
  [350, 1150, "If you don't click it... it's g̶onna b́re҉ak aǵain", "I'm clicking", "not clicking", 89, 359], // 88
  [350, 825, "And I'm g̶onna be gĺi҉tchy aǵa̶in...", "Noted", null, 90, null], // 89

  [350, 650, "Or are you being serious??", "Yes", "no sir", 91, 371], // 90
  [350, 850, "Like... you actually wanna be my gf??", "Maybe", null, 92, null], // 91
  [350, 600, "I mean...", "Yeah?", "no but yeah", 93, 371], // 92
  [350, 1325, "You've pressed it a bajillion times now 😂", "Hehe", null, 94, null], // 93
  [350, 850, "I dunno what to think about it....", "Think", null, 95, null], // 94
  [350, 900, "I thought we were joking around no??", "Maybe", "not joking", 96, 371], // 95
  [350, 750, "I thought we weren't serious??", "Or are we", null, 97, null], // 96

  [350, 600, "Well okay fine.....", "Yes", "no thanks", 98, 379], // 97
  [350, 600, "I guess you are....", "I am?", null, 99, null], // 98
  [350, 600, "So ummm....", "Umm?", null, 100, null], // 99
  [350, 600, "What do we do now??", "Dunno", null, 101, null], // 100
  [350, 900, "I got no plans for this...", "Aw", null, 102, null], // 101
  [350, 850, "Never thought you'd get this far", "Far", null, 103, null], // 102
  [350, 1200, "Never thought about this being real....", "Real", null, 104, null], // 103
  [350, 650, "Well... I guess you win?? ", "Win!", null, 105, null], // 104
  [350, 1175, "I guess I'll still have to say Happy Birthday??", "Happy birthday", null, 106, null], // 105
  [350, 1450, "Thanks for playing... and clicking yes a bajillion times", "Hehe", null, 107, null], // 106
  [350, 600, "Have a great day!!", "You too!", null, 108, null], // 107
  [350, 925, "And your friends' birthday wishes....", "Show me", null, 109, null], // 108
  [350, 600, "Coming right up....", "Okay", null, 110, null], // 109
  // YES VICTORY ENDING (line 110): button2 MUST be null. nav1=-1 ends the chain.
  [350, 700, "(Maybe your bf's too *wink*) 😏", "*giggle like an idiot*", null, -1, null], // 110

  // ---------- NO BRANCH (every line has a panel exit until line 158) ----------
  [350, 600, "What???!!", "No", "fine, yes", 112, 394], // 111
  [350, 950, "You're....🥺 you're not going to say yes", "Nope", "ok yes", 113, 394], // 112
  [350, 600, "Awww....", "Nope!", "okayyyy finee", 114, 394], // 113
  [350, 600, "Comeon....", "No way", "fine", 115, 394], // 114
  [350, 1050, "I mean... it could actually be serious tho", "Hmm, no","okay sure!", 116, 394], // 115
  [350, 600, "Think about it.....", "Still no", "you win", 117, 414], // 116
  [350, 1075, "My personality... and grand confessions....", "kinda true, but nope", "alright kinda true, yes", 118, 394], // 117
  [350, 600, "No??", "No", "ok you win", 119, 414], // 118
  [350, 725, "You're not gonna reconsider??", "Maybe not", "yeah ok yes", 120, 394], // 119
  [350, 600, "At all??", "At all", "fine you win", 121, 414], // 120

  [350, 600, "Pleaseeeeee.....", "No!", "ugh yes ok", 122, 394], // 121
  [350, 1575, "I had a whole surprise planned for your yes, you know??", "No", "ok, convinced", 123, 423], // 122
  [350, 600, "Tsk....", "Tsk", null, 124, null], // 123
  [350, 600, "Think about it", "Still no", "proof? yes", 125, 423], // 124
  [350, 600, "I mean....", "Yeah?", null, 126, null], // 125
  [350, 700, "I treated you to pizza......", "Yum", null, 127, null], // 126
  [350, 725, "Went to Shenzhen with you....", "yeah and??", "ok that's fair enough", 128, 423], // 127
  [350, 600, "That was a date right??", "Was it?", null, 129, null], // 128
  [350, 600, "You slept on my arm....", "Hehe", null, 130, null], // 129
  [350, 600, "Curled up against it...", "it was comfyyy", "fine, okayyy, ill be your gf!", 131, 423], // 130
  [350, 1050, "You were sleeping so peacefully too...", "Sorry", null, 132, null], // 131

  [350, 850, "You said you'd listen to your body", "No", null, 133, null], // 132
  [350, 925, "Aren't I the one you feel safe around?", "No", "i guess? imma reconsider then", 134, 442], // 133
  [350, 1175, "We've shared snacks, boba... even the hotpot!!", "Hehe", null, 135, null], // 134
  [350, 925, "I let you pick whatever you wanna eat", "True", null, 136, null], // 135
  [350, 725, "And held your handbag for you", "thats why we're friendsss", "we are being like a couple", 137, 442], // 136
  [350, 600, "I know your period", "...", null, 138, null], // 137
  [350, 775, "Do any of the other bf's know??", "Nah", null, 139, null], // 138
  [350, 600, "No... right??", "doesnt matter anyways", "trueeee, finee yes....", 140, 442], // 139
  [350, 700, "We're more than just friends", "Hmm", null, 141, null], // 140
  [350, 850, "We're literally doing couple stuff", "We are", null, 142, null], // 141
  [350, 1250, "We're basically together already and you say no??!", "I say no", "ok fineeee", 143, 442], // 142
  [350, 900, "Are you trying to break my heart???!", "Maybe", null, 144, null], // 143

  [350, 600, "I'll give you boba", "No", "ok for boba, hehe", 145, 458], // 144
  [350, 600, "Boba from Tenren....", "Tenren", null, 146, null], // 145
  [350, 600, "The one you like", "My fave", "fine, boba yes", 147, 458], // 146
  [350, 600, "The green milk tea", "Mhmmm", null, 148, null], // 147
  [350, 650, "I'll ship it to your house", "Wait really?", null, 149, 458], // 148
  [350, 675, "But you have to say yes ok?", "nope, in your dreamsss", "okayyy, yesss i will be your gf", 150, 458], // 149
  [350, 600, "Still no??!", "Still no", null, 151, null], // 150
  [350, 600, "*sad pout*", "Hehe", null, 152, null], // 151
  [350, 1575, "Guess I'll have to drink all the boba by myself from now on....", "awww", null, 153, null], // 152
  [350, 1475, "*he walks away, looks back at you... with teary puppy eyes*", "Wait—", null, 154, null], // 153
  [350, 1200, "Well... since you don't want me on your birthday", "Want you", null, 155, null], // 154
  [350, 1600, "Guess you'd rather other people wish you happy birthday then", "Want you here", null, 156, null], // 155
  [350, 975, "I guess you don't wanna see me there...", "I do", null, 157, null], // 156
  [350, 1675, "U know I thought you'll say yes so half the photos are me... but...", "Show me", null, 158, null], // 157
  // NO REJECTION ENDING (line 158): button2 MUST be null. nav1=-1 ends the chain.
  [350, 600, "*runs away sad*", "*sniff*", null, -1, null], // 158

  // ================== PANELS (no skip — button2 must be null on every line) ==================

  // ---------- PANEL 2 (bailed at the yes giggles) ----------
  [350, 600, "Yay!!", "Yay!!", null, 160, null], // 159
  [350, 600, "Okay....", "Okay", null, 161, null], // 160
  [350, 850, "Here're the birthday wishes for you", "Show me", null, 162, null], // 161
  [350, 1400, "Half of them are me cuz I know just how much you love me", "Continue", null, -1, null], // 162

  // ---------- PANEL 3 (early "press wrong" bailed) ----------
  [350, 600, "Okay phew!!", "Phew", null, 164, null], // 163
  [350, 600, "You did press wrong", "My bad", null, 165, null], // 164
  [350, 600, "Oopsie", "Hehe", null, 166, null], // 165
  [350, 600, "But that's okay!!", "Aw", null, 167, null], // 166
  [350, 1400, "We're very forgiving here at Underpaid Tech Support Inc.", "Haha", null, 168, null], // 167
  [350, 600, "Anyways...", "Anyway", null, 169, null], // 168
  [350, 625, "We're together now hehe!!", "Yay", null, 170, null], // 169
  [350, 600, "Okay!!", "Okay", null, 171, null], // 170
  [350, 600, "Happy birthday!!", "Thanks!", null, 172, null], // 171
  [350, 1275, "Here're some other birthday wishes from ur friends", "Show me", null, 173, null], // 172
  [350, 1000, "(they're mainly your bf tho) *wink wink*", "Continue", null, -1, null], // 173

  // ---------- PANEL 4 ("Like.... → no" bailed) ----------
  [350, 600, "Good girl!!", "Aw thanks", null, 175, null], // 174
  [350, 900, "You finally pressed the right button", "Finally", null, 176, null], // 175
  [350, 600, "Hehe!", "Hehe", null, 177, null], // 176
  [350, 600, "Okay!!", "Okay", null, 178, null], // 177
  [350, 1600, "Let's go see what other people wished you for happy birthday now", "Continue", null, -1, null], // 178

  // ---------- PANEL 5 ("not moving around → no") ----------
  [350, 600, "Hmphhhh....", "What now", null, 180, null], // 179
  [350, 675, "What are you trying to do?!", "Nothing~", null, 181, null], // 180
  [350, 600, "Make me mad??", "Maybe", null, 182, null], // 181
  [350, 675, "Or playing with my feelings", "Maybe both", null, 183, null], // 182
  [350, 600, "Hmph...", "Hehe", null, 184, null], // 183
  [350, 600, "Well anyways...", "Anyway", null, 185, null], // 184
  [350, 1025, "See what other people have wished you now", "Show me", null, 186, null], // 185
  [350, 600, "Hehe!!", "Hehe", null, 187, null], // 186
  [350, 600, "Happy Birthday", "Continue", null, -1, null], // 187

  // ---------- PANEL 6 ("Press that one (T_T) → no") ----------
  [350, 600, "Awww", "Hehe", null, 189, null], // 188
  [350, 600, "You're so nice!!", "Aw", null, 190, null], // 189
  [350, 1225, "Thanks for stopping once I ran out of ideas......", "You're welcome", null, 191, null], // 190
  [350, 800, "But you're leading me on too....", "Maybe", null, 192, null], // 191
  [350, 600, "Hmph...", "Hehe", null, 193, null], // 192
  [350, 600, "Lau lau *pouting face*", "Aww", null, 194, null], // 193
  [350, 600, "Hmphhh...", "Okay okay", null, 195, null], // 194
  [350, 1625, "Well it's your birthday so I can't really be mad at you that long", "Thanks for forgiving", null, 196, null], // 195
  [350, 925, "And as much as you played me....", "I didn't", null, 197, null], // 196
  [350, 1275, "I can't do that to you, I'm too nice", "You're sweet", null, 198, null], // 197
  [350, 1625, "Unlike some people *stares at you intensely*", "Who??", null, 199, null], // 198
  [350, 600, "Happy birthday!!", "Thanks!", null, 200, null], // 199
  [350, 725, "Here's more birthday wishes!!", "Continue", null, -1, null], // 200

  // ---------- PANEL 7 ("deal... → no" bailed) ----------
  [350, 600, "I should've known...", "Oh?", null, 202, null], // 201
  [350, 1150, "Should've known it took you a boba to stop....", "You know me", null, 203, null], // 202
  [350, 600, "Haiii....", "Hai", null, 204, null], // 203
  [350, 600, "My fault...", "Aww", null, 205, null], // 204
  [350, 1250, "Well I can't really get one for you right now.....", "Aw", null, 206, null], // 205
  [350, 1200, "But if you come visit, let's make our own okay??", "Deal!", null, 207, null], // 206
  [350, 775, "Happy birthday, 19th birthday!!", "Thanks!", null, 208, null], // 207
  [350, 1025, "And here's the birthday girl's website!!!", "Continue", null, -1, null], // 208

  // ---------- PANEL 8 ("is that not good enough? → no" bailed, boba+plushie) ----------
  [350, 825, "So you want boba AND a plushie??!", "Yes please", null, 210, null], // 209
  [350, 600, "Tsk tsk....", "Hehe", null, 211, null], // 210
  [350, 600, "So greedy.....", "Guilty", null, 212, null], // 211
  [350, 600, "Fine....", "Yay", null, 213, null], // 212
  [350, 650, "I'll get you a plushie....", "Yay!", null, 214, null], // 213
  [350, 1175, "But only when we go to Taiwan or Japan, okay??!", "Promise?", null, 215, null], // 214
  [350, 600, "As for the boba....", "Mhmmm?", null, 216, null], // 215
  [350, 600, "I guess we can make it??", "Yes please", null, 217, null], // 216
  [350, 725, "Like when you come visit me!!", "I'll come", null, 218, null], // 217
  [350, 600, "Hehe!!", "Hehe", null, 219, null], // 218
  [350, 1125, "Anyways, back to the main point of today", "Yeah?", null, 220, null], // 219
  [350, 600, "Happy birthday!!", "Thanks!", null, 221, null], // 220
  [350, 975, "More birthday wishes coming right up :)", "Continue", null, -1, null], // 221

  // ---------- PANEL 9 (jelly cat + boba) ----------
  [350, 600, "Jelly cat AND boba.....", "Mhmmm hmm", null, 223, null], // 222
  [350, 600, ":_c", "Aw don't cry", null, 224, null], // 223
  [350, 1325, "You know how much I spent with you when I went out??!", "How much?", null, 225, null], // 224
  [350, 1025, "And now you want a jelly cat AND boba....", "Sorry not sorry", null, 226, null], // 225
  [350, 975, "Well.... at least you have standards??!", "Hehe", null, 227, null], // 226
  [350, 600, "Ugh....", "Hehe", null, 228, null], // 227
  [350, 600, "You know what....", "What?", null, 229, null], // 228
  [350, 600, "I've changed my mind....", "Oh?", null, 230, null], // 229
  [350, 675, "I'm not getting you one....", "What", null, 231, null], // 230
  [350, 1400, "You can wait till I'm rich enough to afford it", "Mhmmm", null, 232, null], // 231
  [350, 600, "Anyways....", "Anyway", null, 233, null], // 232
  [350, 975, "Today's somebody's special day right??!", "Mine", null, 234, null], // 233
  [350, 1275, "Because I don't have to get you boba OR a jelly cat", "Fine", null, 235, null], // 234
  [350, 600, "Hehe!!! 😁", "Hehe", null, 236, null], // 235
  [350, 600, "I'm just kidding", "Hehe", null, 237, null], // 236
  [350, 600, "Happy Birthday!!", "Thanks!", null, 238, null], // 237
  [350, 850, "Hope you have a wonderful birthday", "Hope so", null, 239, null], // 238
  [350, 1125, "Here's more birthday wishes from your friends or family", "Continue", null, -1, null], // 239

  // ---------- PANEL 10 (dino jelly cat + boba — long money/pony ending) ----------
  [350, 600, "Finally!!!", "Finally", null, 241, null], // 240
  [350, 600, "You stopped....", "For now", null, 242, null], // 241
  [350, 600, "Wait....", "Hmm?", null, 243, null], // 242
  [350, 925, "You want a dino jelly cat and boba???", "Yes please", null, 244, null], // 243
  [350, 900, "But I thought you had one already...", "Want more", null, 245, null], // 244
  [350, 1850, "Wait no... don't you already have dino plushies and a bunch of jelly cats?", "More is more", null, 246, null], // 245
  [350, 600, "They're different??!", "Yes", null, 247, null], // 246
  [350, 600, "Nuh-uh....", "Uh-huh", null, 248, null], // 247
  [350, 600, "No wait...", "Wait", null, 249, null], // 248
  [350, 1275, "They're too expensive for me to afford anyways.....", "Aw", null, 250, null], // 249
  [350, 600, "Ugh...", "Sorry", null, 251, null], // 250
  [350, 600, "Fine....", "Yay", null, 252, null], // 251
  [350, 600, "I'll gift them to you", "Hehe", null, 253, null], // 252
  [350, 675, "But only in the future...", "Promise?", null, 254, null], // 253
  [350, 600, "I have uses for my money", "Mhmmm", null, 255, null], // 254
  [350, 600, "Need to invest in me", "Hehe", null, 256, null], // 255
  [350, 600, "So I can earn more money", "Smart", null, 257, null], // 256
  [350, 600, "So I can spend more....", "More? On me?", null, 258, null], // 257
  [350, 850, "(On you... yeah definitely on you)", "Aww", null, 259, null], // 258
  [350, 600, "(Trust)", "Trust", null, 260, null], // 259
  [350, 1500, "(I'll definitely give them to you in the future if you want)", "I want", null, 261, null], // 260
  [350, 600, "Well", "Well?", null, 262, null], // 261
  [350, 600, "Anyways", "Anyway", null, 263, null], // 262
  [350, 775, "You know what day it is right?!", "Mine", null, 264, null], // 263
  [350, 600, "Happy Birthday!!!", "Thanks!", null, 265, null], // 264
  [350, 775, "Hope you have fun at day camp!!", "Will do", null, 266, null], // 265
  [350, 600, "Pony missed me too much", "Pony!!", null, 267, null], // 266
  [350, 600, "Oh yeah...", "Yeah?", null, 268, null], // 267
  [350, 600, "I forgot...", "About?", null, 269, null], // 268
  [350, 975, "Your other friends' birthday wishes....", "Show me!", null, 270, null], // 269
  [350, 600, "Well...", "Well?", null, 271, null], // 270
  [350, 600, "You don't need theirs...", "Need yours", null, 272, null], // 271
  [350, 650, "You only need mine right??", "Yes", null, 273, null], // 272
  [350, 600, "Hehe!!", "Hehe", null, 274, null], // 273
  [350, 600, "Hehe??", "Hehe", null, 275, null], // 274
  [350, 600, "No??", "Hmm", null, 276, null], // 275
  [350, 600, "Aww...", "Aww", null, 277, null], // 276
  [350, 600, "Fine...", "Yay", null, 278, null], // 277
  [350, 600, "Here you go...", "Continue", null, -1, null], // 278

  // ---------- PANEL 11 (bribes don't work — Janice immune) ----------
  [350, 600, "Wow....", "Wow", null, 280, null], // 279
  [350, 800, "You aren't affected by bribes...", "Nope", null, 281, null], // 280
  [350, 600, "I didn't know that??!!", "Now you do", null, 282, null], // 281
  [350, 600, "Or well...", "Well?", null, 283, null], // 282
  [350, 675, "I probably did but I forgot", "Hehe", null, 284, null], // 283
  [350, 600, "Bwahahahaha", "Haha", null, 285, null], // 284
  [350, 600, "Sorry :P", "All good", null, 286, null], // 285
  [350, 1575, "Funny how you only picked no once I said you aren't Janice", "Mmm", null, 287, null], // 286
  [350, 600, "Ummmm", "What?", null, 288, null], // 287
  [350, 725, "Do you have imposter syndrome", "Maybe", null, 289, null], // 288
  [350, 600, "Well...", "Well?", null, 290, null], // 289
  [350, 600, "Don't worry...", "Okay", null, 291, null], // 290
  [350, 1625, "The Janice that I know will always be the real Janice in my heart", "Aww", null, 292, null], // 291
  [350, 600, "Happy birthday!!!", "Thanks!", null, 293, null], // 292
  [350, 700, "Hope you enjoy your day camp", "Will do!", null, 294, null], // 293
  [350, 600, "And now...", "Now?", null, 295, null], // 294
  [350, 600, "The final reveal:", "Ooh", null, 296, null], // 295
  [350, 950, "More birthday wishes from your friends", "Continue", null, -1, null], // 296

  // ---------- PANEL 12 (still-said-no at the "Wait..." check) ----------
  [350, 600, "Wait what???", "What", null, 298, null], // 297
  [350, 600, "You pressed no??", "I did", null, 299, null], // 298
  [350, 600, "Awww!!", "Hehe", null, 300, null], // 299
  [350, 600, "I know it's you now", "It's me", null, 301, null], // 300
  [350, 600, "Phew!!", "Phew", null, 302, null], // 301
  [350, 1050, "I thought you were an imposter, you know??", "I'm not", null, 303, null], // 302
  [350, 600, "I was worried!!", "Sorry", null, 304, null], // 303
  [350, 600, "Well...", "Well?", null, 305, null], // 304
  [350, 625, "Since real Janice is here", "Yep", null, 306, null], // 305
  [350, 600, "Happy birthday!!", "Thanks!", null, 307, null], // 306
  [350, 675, "Hope you have a great day!!", "Hope so", null, 308, null], // 307
  [350, 600, "Bye!!", "Wait—", null, 309, null], // 308
  [350, 600, "Enjoy your camp!!", "Will do", null, 310, null], // 309
  [350, 600, "Ohh!! Wait!!", "Wait what", null, 311, null], // 310
  [350, 600, "I almost forgot", "Forgot what", null, 312, null], // 311
  [350, 600, "Your birthday website!!", "Show me!", null, 313, null], // 312
  [350, 600, "Here, enjoy!!", "Continue", null, -1, null], // 313

  // ---------- PANEL 13 (bailed at "ulterior motive") ----------
  [350, 600, "Phew....", "Phew", null, 315, null], // 314
  [350, 775, "At least I calmed you down.....", "Maybe", null, 316, null], // 315
  [350, 600, "It's just you ok??", "It's me", null, 317, null], // 316
  [350, 1550, "I've never made anything like this for anyone else, okay??", "Aww", null, 318, null], // 317
  [350, 1125, "And I've been writing for an hour already....", "Dedication", null, 319, null], // 318
  [350, 600, "I wanna give up...", "Don't", null, 320, null], // 319
  [350, 600, "Well...", "Well?", null, 321, null], // 320
  [350, 600, "Anyways.....", "Anyway", null, 322, null], // 321
  [350, 700, "Since you're satisfied......", "Am now", null, 323, null], // 322
  [350, 600, "Happy birthday!!!", "Thanks!", null, 324, null], // 323
  [350, 975, "Here are your friends' birthday wishes:", "Continue", null, -1, null], // 324

  // ---------- PANEL 14 (bailed at silent "...." trigger) ----------
  [350, 600, "Well....", "Well?", null, 326, null], // 325
  [350, 1050, "I guess boba is still the magic solution??", "You know it", null, 327, null], // 326
  [350, 600, "Hehe....", "Hehe", null, 328, null], // 327
  [350, 975, "I have to tell the birthday girl tho...", "Tell me", null, 329, null], // 328
  [350, 1325, "I don't have boba... and I can't give it to you......", "Aw", null, 330, null], // 329
  [350, 600, "But well....", "Well?", null, 331, null], // 330
  [350, 600, "If you visit...", "When?", null, 332, null], // 331
  [350, 1000, "You wanna come over and make it with me?", "Yes", null, 333, null], // 332
  [350, 600, "Anyways", "Anyway", null, 334, null], // 333
  [350, 600, "Happy birthday!!!", "Thanks!", null, 335, null], // 334
  [350, 600, "Your birthday gallery", "Show me", null, 336, null], // 335
  [350, 600, "Coming right up!!", "Continue", null, -1, null], // 336

  // ---------- PANEL 15 (bailed at the second silent "...") ----------
  [350, 600, "Okay... well...", "Okay", null, 338, null], // 337
  [350, 1125, "I guess you wanna see your friends' wishes...", "I do", null, 339, null], // 338
  [350, 625, "And forget about me... so", "Never", null, 340, null], // 339
  [350, 600, "Happy birthday...", "Thanks", null, 341, null], // 340
  [350, 700, "Your friends' stuff is here:", "Continue", null, -1, null], // 341

  // ---------- PANEL 16 (saved Cy from breaking) ----------
  [350, 600, "Phew!!", "Phew", null, 343, null], // 342
  [350, 950, "You pressed no right before I broke...", "Phew", null, 344, null], // 343
  [350, 600, "Phew....", "Phew", null, 345, null], // 344
  [350, 1275, "I was so scared I'm gonna crash and be gone forever", "Aw", null, 346, null], // 345
  [350, 600, "Thanks for saving me", "Anytime", null, 347, null], // 346
  [350, 775, "Happy birthday, birthday girl!!", "Thanks!", null, 348, null], // 347
  [350, 675, "Well, since you saved me...", "Yes?", null, 349, null], // 348
  [350, 1400, "Here's some more birthday wishes from your dear friends:", "Continue", null, -1, null], // 349

  // ---------- PANEL 17 (broke the surprise, made Cy fix it) ----------
  [350, 600, "Hmph...", "Hehe", null, 351, null], // 350
  [350, 625, "Breaking my surprise.....", "Sorry!", null, 352, null], // 351
  [350, 600, "And then", "Then?", null, 353, null], // 352
  [350, 1325, "And you had the audacity to tell me to fix it too...", "Oops", null, 354, null], // 353
  [350, 600, "Hmph...", "Hehe", null, 355, null], // 354
  [350, 1225, "Well... it's your birthday so imma let that slide", "Thanks", null, 356, null], // 355
  [350, 600, "Happy birthday!!", "Thanks!", null, 357, null], // 356
  [350, 725, "And well since it's fixed...", "Good", null, 358, null], // 357
  [350, 950, "The birthday wishes from your friends:", "Continue", null, -1, null], // 358

  // ---------- PANEL 18 (you broke Cy AND made it glitch, then walked it back) ----------
  [350, 625, "Oh so now you click no...", "Yes", null, 360, null], // 359
  [350, 1125, "Only after I had to break in front of you....", "Sorry", null, 361, null], // 360
  [350, 600, "And glitch too...", "Sorry", null, 362, null], // 361
  [350, 900, "Do you know how embarrassing it is??", "Hehe", null, 363, null], // 362
  [350, 825, "Especially for me?? A whole tech genius", "Hehe", null, 364, null], // 363
  [350, 600, "Just kidding XD....", "Hehe", null, 365, null], // 364
  [350, 900, "I'm not a tech genius but still...", "Still you", null, 366, null], // 365
  [350, 600, "Well....", "Well?", null, 367, null], // 366
  [350, 775, "It still is your birthday so...", "Yes", null, 368, null], // 367
  [350, 600, "Happy birthday!!", "Thanks!", null, 369, null], // 368
  [350, 1100, "Lemme transfer you to the actual webpage now", "Take me", null, 370, null], // 369
  [350, 600, "Ahahaha....", "Continue", null, -1, null], // 370

  // ---------- PANEL 19 (you went serious then joked) ----------
  [350, 725, "Okay phew, you are joking....", "Maybe", null, 372, null], // 371
  [350, 1200, "Thought we were actually gonna be together...", "Or maybe not", null, 373, null], // 372
  [350, 1350, "And then we would never be able to be friends again...", "Don't worry", null, 374, null], // 373
  [350, 750, "But hey, that never happened!", "Phew", null, 375, null], // 374
  [350, 600, "Bwahahahahahaha....", "Hehe", null, 376, null], // 375
  [350, 625, "Best friends forever, no?", "Yes", null, 377, null], // 376
  [350, 650, "Anyways, happy birthday!!!", "Thanks!", null, 378, null], // 377
  [350, 600, "Your friends' wishes:", "Continue", null, -1, null], // 378

  // ---------- PANEL 20 (you said no right at the climax — broke Cy's heart) ----------
  [350, 600, "No???!", "Yes no", null, 380, null], // 379
  [350, 600, "Now??!", "Yes now", null, 381, null], // 380
  [350, 600, "Are you kidding me?!!", "Maybe", null, 382, null], // 381
  [350, 900, "Just when you got my hopes up...", "Sorry", null, 383, null], // 382
  [350, 600, "Hmph...", "Hehe", null, 384, null], // 383
  [350, 975, "You just love tricking me, don't you...", "Maybe", null, 385, null], // 384
  [350, 600, "You and everyone...", "Sad", null, 386, null], // 385
  [350, 600, "Well still...", "Still?", null, 387, null], // 386
  [350, 750, "I'm still a nice person so...", "You are", null, 388, null], // 387
  [350, 600, "Happy birthday...", "Thanks", null, 389, null], // 388
  [350, 1625, "Dunno why I did all this if you'd just say no at the end...", "Sorry", null, 390, null], // 389
  [350, 600, "Sighhh.....", "Sigh", null, 391, null], // 390
  [350, 650, "Well... I still made it...", "You did", null, 392, null], // 391
  [350, 875, "So here's your birthday gallery...", "Show me", null, 393, null], // 392
  [350, 1425, "Even tho you basically played the person who built it....", "Continue", null, -1, null], // 393

  // ---------- PANEL 21 (You Reconsidered — said yes at last) ----------
  [350, 600, "Hehe!!", "Hehe", null, 395, null], // 394
  [350, 600, "You reconsidered", "I did", null, 396, null], // 395
  [350, 600, "Yay!!!", "Yay!", null, 397, null], // 396
  [350, 600, "Okay...", "Okay", null, 398, null], // 397
  [350, 675, "I guess we're together now?", "Guess so", null, 399, null], // 398
  [350, 600, "No....", "No?", null, 400, null], // 399
  [350, 600, "You don't wanna??!", "I do!", null, 401, null], // 400
  [350, 600, "You're playing with me??!", "A little", null, 402, null], // 401
  [350, 600, "Actually....", "Yes?", null, 403, null], // 402
  [350, 1725, "Can't read your face, so imma leave it a mystery", "Mystery accepted", null, 404, null], // 403
  [350, 600, "Well anyways....", "Anyway", null, 405, null], // 404
  [350, 600, "Happy Birthday!!", "Thanks!", null, 406, null], // 405
  [350, 725, "Hope you enjoy your birthday!", "I will!", null, 407, null], // 406
  [350, 600, "Your friends too!!", "Hehe", null, 408, null], // 407
  [350, 775, "One from each friend, I think??", "One each", null, 409, null], // 408
  [350, 900, "I'm not sure, you can check yourself", "Will do", null, 410, null], // 409
  [350, 1175, "And ummm... half of them are probably me coz...", "Because?", null, 411, null], // 410
  [350, 1150, "I am basically half of your friend list, no??!", "Yes", null, 412, null], // 411
  [350, 600, "Hehe!!!", "Hehe", null, 413, null], // 412
  [350, 600, "Enjoy!!", "Continue", null, -1, null], // 413

  // ---------- PANEL 22 (Stayed "No" forever — Cy gives up gracefully) ----------
  [350, 600, "Aww....", "Aw", null, 415, null], // 414
  [350, 725, "So you really don't wanna...", "I really don't", null, 416, null], // 415
  [350, 1425, "I tried so hard to get you to play along??!", "Sorry", null, 417, null], // 416
  [350, 600, "Sighhhh....", "Sigh", null, 418, null], // 417
  [350, 600, "Well....", "Well?", null, 419, null], // 418
  [350, 750, "You are the special girl today", "I am", null, 420, null], // 419
  [350, 975, "I can't really force you to say yes...", "Can't", null, 421, null], // 420
  [350, 650, "Well, happy birthday....!!", "Thanks", null, 422, null], // 421
  [350, 1275, "And here are more birthday wishes from your friends", "Continue", null, -1, null], // 422

  // ---------- PANEL 23 (Janice needed "evidence" to say yes — playful teasing) ----------
  [350, 600, "So....", "So?", null, 424, null], // 423
  [350, 600, "So you needed evidence?!", "Maybe", null, 425, null], // 424
  [350, 600, "To say yes??", "Maybe", null, 426, null], // 425
  [350, 750, "That's not the Janice I know??", "It is", null, 427, null], // 426
  [350, 900, "You could never be moved by evidence", "Hehe", null, 428, null], // 427
  [350, 600, "But you know what??!", "What?", null, 429, null], // 428
  [350, 600, "I'll take it, hehe!!!", "Hehe", null, 430, null], // 429
  [350, 600, "WAIT A SECOND...", "What", null, 431, null], // 430
  [350, 825, "You're not pitying me, are you??!", "I'm not", null, 432, null], // 431
  [350, 650, "Cuz it seems like you are.", "Nope", null, 433, null], // 432
  [350, 600, "Hmph...", "Hehe", null, 434, null], // 433
  [350, 600, "I'm not agreeing tho...", "Mhmmm", null, 435, null], // 434
  [350, 625, "You can dream about it...", "Hehe", null, 436, null], // 435
  [350, 2575, "But since I'm such a nice person, and nobody else got you a surprise this good,", "Aww", null, 437, null], // 436
  [350, 1050, "I'm still gonna wish you a happy birthday.", "Thanks", null, 438, null], // 437
  [350, 600, "So...", "So?", null, 439, null], // 438
  [350, 1750, "Yeah. And I'm not gonna hide your birthday wishes from your friends...", "Show them", null, 440, null], // 439
  [350, 1375, "Since poor poor Janice hasn't got any good surprises...", "Aww", null, 441, null], // 440
  [350, 600, "Hmphhh....", "Continue", null, -1, null], // 441

  // ---------- PANEL 24 (Cy proposes — Janice will be impossible to convince) ----------
  [350, 600, "Wait....", "Wait", null, 443, null], // 442
  [350, 1025, "Did it take that much to convince you....", "Mhmmm", null, 444, null], // 443
  [350, 925, "You know I wanna get married one day, right....", "You did?", null, 445, null], // 444
  [350, 600, "Ughhh....", "Hehe", null, 446, null], // 445
  [350, 1375, "It's gonna be soooooo annoying when I propose, uh huh??", "Probably", null, 447, null], // 446
  [350, 600, "Imagine me...", "Imagining", null, 448, null], // 447
  [350, 1075, "Asking you... and then you dunno what to do", "Hehe", null, 449, null], // 448
  [350, 1800, "And then I have to say a whole speech to try and convince you to say yes", "Hehe", null, 450, null], // 449
  [350, 1100, "And the photographer just there waiting...", "Aw", null, 451, null], // 450
  [350, 600, "Yeah.....", "Yeah", null, 452, null], // 451
  [350, 600, "No thanks....", "Hmm", null, 453, null], // 452
  [350, 650, "Let's just stay friends...", "Friends", null, 454, null], // 453
  [350, 600, "And since we're friends,", "Friends", null, 455, null], // 454
  [350, 600, "Happy Birthday!!!", "Thanks!", null, 456, null], // 455
  [350, 1775, "And some more of my kind also have some things to tell you, ahahahaha", "Hehe", null, 457, null], // 456
  [350, 650, "My kind is friends, btw XD", "Continue", null, -1, null], // 457

  // ---------- PANEL 25 (NO branch — boba plea + epilogue) ----------
  [350, 600, "Boba....", "Boba", null, 459, null], // 458
  [350, 600, "Boba, boba, boba...", "Hehe", null, 460, null], // 459
  [350, 1100, "The magic solution to all Janice problems...", "You know it", null, 461, null], // 460
  [350, 600, "I should've known...", "Hehe", null, 462, null], // 461
  [350, 600, "Well...", "Well?", null, 463, null], // 462
  [350, 600, "Come over then...", "When?", null, 464, null], // 463
  [350, 600, "Come visit me...", "Okay", null, 465, null], // 464
  [350, 975, "We can make them and drink together...", "Yes please", null, 466, null], // 465
  [350, 750, "And make out(side) too *wink*", "Hehe", null, 467, null], // 466
  [350, 600, "Just kidding hahaha", "Hehe", null, 468, null], // 467
  [350, 600, "Happy Birthday...", "Thanks", null, 469, null], // 468
  [350, 900, "This is the final ending I'm writing", "Final one", null, 470, null], // 469
  [350, 600, "Yayyyy!!", "Yay", null, 471, null], // 470
  [350, 600, "Ugh...", "Hehe", null, 472, null], // 471
  [350, 600, "It took so long...", "Worth it", null, 473, null], // 472
  [350, 725, "Well... I hope you had fun...", "I did", null, 474, null], // 473
  [350, 800, "There's 26 different endings....", "24?!", null, 475, null], // 474
  [350, 900, "Hope you find them all (if you want)", "I'll try", null, 476, null], // 475
  [350, 600, "Ohh...", "What?", null, 477, null], // 476
  [350, 1175, "I just realized I missed a club application...", "Oops", null, 478, null], // 477
  [350, 1550, "Well it's fine, I'll just send a quick text to the captains...", "Good luck", null, 479, null], // 478
  [350, 750, "I'm kinda close with them, lol", "Nice", null, 480, null], // 479
  [350, 600, "Anyways...", "Anyway", null, 481, null], // 480
  [350, 700, "Imma stick around a long time now", "Stay", null, 482, null], // 481
  [350, 700, "Enjoy more birthday wishes~~", "Finish", null, -1, null] // 482

];

function showOverlay() {
    const overlay = document.getElementById('myOverlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    overlay.classList.add('visible');
}

async function birthdaySuprise() {
    console.log("birthdaySuprise started");

    const yesbtn = document.getElementById("yesbtn");
    const nobtn = document.getElementById("nobtn");

    showOverlay();
    let entry = dialogueScript[0];
    while (true) {
        updateButtons(entry[3], entry[4]);
        updateText(entry[0], entry[1], entry[2]);
        if (entry[5] <= 0) break;
        await new Promise(resolve => {

            const cleanup = () => {
                yesbtn.removeEventListener("click", handleYes);
                nobtn.removeEventListener("click", handleNo);
            };

            // Create the handler functions so we can clean up the *other* button's listener
            const handleYes = () => {
                cleanup();
                dialogueIndex = entry[5];
                resolve(); // Fixed: Added parentheses
            };

            const handleNo = () => {
                cleanup();
                dialogueIndex = entry[6];
                resolve(); // Fixed: Added parentheses
            };

            // { once: true } ensures the clicked button triggers its listener exactly once
            yesbtn.addEventListener('click', handleYes, { once: true });
            nobtn.addEventListener('click', handleNo, { once: true });
        }); // Fixed: Added missing closing parenthesis for the Promise
        entry = dialogueScript[dialogueIndex];
        
    }
    document.getElementById('myOverlay').classList.remove('visible');
    document.getElementById('myOverlay').classList.add('hidden');
}


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
    if (!dialogueIndex) return;
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

    nobtn.style.display = nbtn ? 'block' : 'none';

    console.log("updateButtons Finished");
}