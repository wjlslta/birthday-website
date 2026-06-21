// ╔══════════════════════════════════════════════════╗
// ║  master.js — Master page (gallery + surprise)    ║
// ╚══════════════════════════════════════════════════╝

// ── CONFIG ──────────────────────────────────────────
const WORKER_URL    = 'https://birthdaydata.janicellchancl.workers.dev';
const RECORDS_URL   = `${WORKER_URL}/wjlslta/birthday_data/contents/birthday-wishes/records.json`;
const TARGET_DATE  = '2026-06-28T00:00:00';

let cachedEntries = [];

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

    // If unlocked, play the unlock animation
    if (unlocked) {
        setTimeout(() => {
            // Slide up slightly (like unlatching)
            lock.style.transform = 'translateY(-40px)';
            setTimeout(() => {
                // Then slide down and fade out
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

async function loadGallery() {
    const gallery = document.getElementById('gallery');

    try {
        const resp = await fetch(RECORDS_URL);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        // GitHub API returns base64 content — decode it
        const decoded = data.content ? atob(data.content.replace(/\n/g, '')) : '{"entries":[]}';
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

        // Shuffle for random order
        const shuffled = [...cachedEntries];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        gallery.innerHTML = shuffled.map((entry) => {
            // Find original index in cachedEntries for modal lookup
            const realIndex = cachedEntries.indexOf(entry);
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
                <div class="gallery-item" onclick="openModal(${realIndex})">
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


// ═══════════════════════════════════════════════════
//  SURPRISE OVERLAY — appears after countdown ends
// ═══════════════════════════════════════════════════

// ── SURPRISE CONFIG ─────────────────────────────────
const SURPRISE_CONFIG = {
    TARGET_DATE: '2026-06-28T00:00:00',

    ORIGINAL_URL: 'https://wjlslta.github.io/birthday-website/',

    PASSWORD: '0917',

    // ── PATH 1: Clicking "Yes" (button moves around) ──
    YES_MESSAGES: [
        'Wait... are you serious?',
        'wait, really?',
        'are you sure you\'re janice??!',
        'Are you reealllyyyyyyyy sure??',
        'Wait... you WANT to say yes?',
        "You're not clicking the wrong button are you??",
        'this is the WRONG button',
        'just click no please...',
        'Please???',
        'Pretty please??',
        'Pretty please with a boba?',
        'Pretty please with a boba and a dino jelly cat??',
        "Okay so you're just clicking randomly huh",
        'i coded this whole thing (with ai) and you\'re clicking the WRONG Yes',
        'This is getting embarrassing ngl',
        "don't you think you should give up",
        'you know what, just... imma give up...',
        'WAIT OR ARE YOU DOING THIS TO SPITE CY',
        'if you are you win okayyy',
        'Reallyyyyy...',
        "I'm serioussss",
        "i dunno what else to say... so bye??, imma disappear now",
    ],

    // ── PATH 2: Clicking "No" FIRST (full route) ──
    NO_FULL_MESSAGES: [
        "Are you sure???",
        "Like... actually sure?",
        "Because I could just be messing with you",
        "I might actually be serious thoooo",
        "okay wait you're actually clicking no",
        "that means you read the question...",
        "and you thought about it...",
        "and you chose no...",
        "which is... fair",
        "i mean we've talked about this",
        "but also like... what if i wasn't joking",
        "what if this whole thing was a setup to actually confess spectacularly",
        "i mean, you know me... it's my style",
        "are you really sure???",
        "you know i built this whole thing right",
        "the countdown. the password. the buttons.",
        "hours of coding (kinda?) and designing and testing and debugging",
        "all so i could ask you one question",
        "and you're clicking no",
        "which is honestly very on brand for you",
        "but like...",
        "like i know you can't click yes anymore,",
        "you know you could reload the page to change your answer right?",
        "at least consider this:",
        "what if this was all a ruse to get you to say no",
        "and then after you say no, i reveal that i actually am serious",
        "and then you have to live with the regret of saying no to my confession for the rest of your life",
        "and then every time you see me, you're reminded of that moment and it haunts you",
        "forever and ever and ever",
        "and ever and ever and ever",
        "well i guess you're really serious with the no",
        "so you win. you really win. congrats.",
        "are you really not gonna reconsider and reload the page to change your answer??",
        "okay then...",
        "hehehe, i was thinking the same don't worry",
    ],

    // ── PATH 3: Clicking "No" AFTER some "Yes" clicks ──
    NO_SHORT_MESSAGES: [
        "oh so NOW you click no?",
        "after all that??",
        "you really made me wait huh",
        "well at least you were joking",
        "hehehe",
        "Good Girl! You made the right choice, *pats you on head*",
    ],

    // ── Finale messages ──
    WIN_MESSAGES: [
        "Anyways Happy Birthday Janice!!! 🥳",
        "Hope you enjoyed my suprise!",
        "-your un(der)paid tech support",
    ],

    WIN_MESSAGE_DURATION: 3000,

    WRONG_PASSWORD_MESSAGES: [
        'hehe do you need a hint?? 🤭',
        "I'm younger than youuuu",
        'how can you not know???',
        'i thought you remembered.....',
        'Really, You got it wrong... again........   ',
        'are you really janice??',
        'Are you serious??! Did you really forget....',
        'tskkkk....',
        '............',
        'HMPH...',
        'OMG I GIVE UP ON YOU...',
        'Last chance and i\'m not showing you my birthday suprise... 😡',
        'HMPHHHHHHHHHHHHH',
    ],
};

// ── DATE GATE ──────────────────────────────────────
(function checkDate() {
    const target = new Date(SURPRISE_CONFIG.TARGET_DATE);
    const now = new Date();

    if (now >= target) {
        const existingOverlay = document.getElementById('overlay');
        if (existingOverlay) {
            existingOverlay.classList.remove('hidden');
            wireOverlayEvents();
            showPhase('phase-initial');
        } else {
            buildOverlay();
            showPhase('phase-initial');
        }
    }
})();

// ── BUILD OVERLAY ──────────────────────────────────
function buildOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'overlay';
    overlay.innerHTML = `
        <div id="phase-initial" class="phase">
            <h1>🎉 Happy Birthday! 🎂</h1>
            <p class="subtitle">Guess what, are you janice??</p>
            <div class="btn-row">
                <button class="btn-secondary" id="btn-skip">No</button>
                <button class="btn-primary"   id="btn-surprise">Yes</button>
            </div>
        </div>

        <div id="phase-password" class="phase">
            <h1>🔐</h1>
            <p class="subtitle">When's my birthday👀</p>
            <div class="password-form">
                <input type="password" id="password-input" placeholder="Enter password..." autocomplete="off">
                <button class="btn-primary" id="btn-password-submit">Unlock</button>
                <p class="error-msg" id="password-error"></p>
            </div>
        </div>

        <div id="phase-game" class="phase">
            <p class="message" id="game-message"></p>
            <div id="game-area"></div>
        </div>
    `;

    const finale = document.createElement('div');
    finale.id = 'finale';
    finale.innerHTML = '<div class="finale-text" id="finale-text"></div>';

    document.body.appendChild(overlay);
    document.body.appendChild(finale);

    wireOverlayEvents();
}

// ── EVENT WIRING ───────────────────────────────────
function wireOverlayEvents() {
    document.getElementById('btn-skip').addEventListener('click', () => {
        window.location.replace(SURPRISE_CONFIG.ORIGINAL_URL);
    });

    document.getElementById('btn-surprise').addEventListener('click', () => {
        showPhase('phase-password');
        document.getElementById('password-input').focus();
    });

    document.getElementById('btn-password-submit').addEventListener('click', handlePassword);
    document.getElementById('password-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handlePassword();
    });
}

// ── PHASE SWITCHING ────────────────────────────────
function showPhase(phaseId) {
    document.querySelectorAll('#overlay .phase').forEach(p => p.classList.remove('active'));
    document.getElementById(phaseId).classList.add('active');
}

// ── PASSWORD HANDLER ───────────────────────────────
let passwordAttempts = 0;

function handlePassword() {
    const input = document.getElementById('password-input');
    const errorEl = document.getElementById('password-error');
    const guess = input.value.trim();

    if (guess === SURPRISE_CONFIG.PASSWORD) {
        errorEl.textContent = '';
        input.value = '';
        passwordAttempts = 0;
        showPhase('phase-game');
        initGame();
        return;
    }

    passwordAttempts++;
    const msgIndex = Math.min(passwordAttempts - 1, SURPRISE_CONFIG.WRONG_PASSWORD_MESSAGES.length - 1);
    errorEl.textContent = SURPRISE_CONFIG.WRONG_PASSWORD_MESSAGES[msgIndex];
    input.value = '';

    if (passwordAttempts >= SURPRISE_CONFIG.WRONG_PASSWORD_MESSAGES.length) {
        setTimeout(() => {
            window.location.replace(SURPRISE_CONFIG.ORIGINAL_URL);
        }, 1500);
    }
}

// ── MINI GAME ──────────────────────────────────────
let yesClicks = 0;
let noClicks = 0;
let noRouteActive = false;
let noMessages = [];
let gameDone = false;

function initGame() {
    yesClicks = 0;
    noClicks = 0;
    noRouteActive = false;
    noMessages = [];
    gameDone = false;

    const gameMsg = document.getElementById('game-message');
    const gameArea = document.getElementById('game-area');
    gameArea.innerHTML = '';

    gameMsg.textContent = 'Janice, will you be my girlfriend?? 🥺🥺';

    const btnYes = document.createElement('button');
    btnYes.className = 'game-btn btn-primary';
    btnYes.textContent = 'Yes';
    gameArea.appendChild(btnYes);

    const btnNo = document.createElement('button');
    btnNo.className = 'game-btn btn-secondary';
    btnNo.textContent = 'No';
    gameArea.appendChild(btnNo);

    positionButton(btnYes, 0.35, 0.4);
    positionButton(btnNo, 0.65, 0.4);

    btnYes.addEventListener('click', () => {
        if (gameDone || noRouteActive) return;
        yesClicks++;

        const idx = Math.min(yesClicks - 1, SURPRISE_CONFIG.YES_MESSAGES.length - 1);
        gameMsg.textContent = SURPRISE_CONFIG.YES_MESSAGES[idx];

        if (yesClicks >= SURPRISE_CONFIG.YES_MESSAGES.length) {
            btnYes.style.opacity = '0';
            setTimeout(() => btnYes.remove(), 300);
            activateNoRoute();
        } else {
            moveToRandom(btnYes);
        }
    });

    btnNo.addEventListener('click', () => {
        if (gameDone) return;

        if (!noRouteActive) {
            btnYes.style.opacity = '0';
            setTimeout(() => btnYes.remove(), 300);

            if (yesClicks === 0) {
                noMessages = SURPRISE_CONFIG.NO_FULL_MESSAGES;
            } else {
                noMessages = SURPRISE_CONFIG.NO_SHORT_MESSAGES;
            }
            noRouteActive = true;
            noClicks = 0;
        }

        const idx = Math.min(noClicks, noMessages.length - 1);
        gameMsg.textContent = noMessages[idx];
        noClicks++;

        if (noClicks >= noMessages.length) {
            gameDone = true;
            setTimeout(() => {
                btnNo.style.opacity = '0';
                setTimeout(() => { if (btnNo.parentNode) btnNo.remove(); }, 300);
            }, 500);
            setTimeout(runFinale, 1500);
        }
    });
}

function activateNoRoute() {
    noRouteActive = true;
    noClicks = 0;
    noMessages = SURPRISE_CONFIG.NO_SHORT_MESSAGES;
}

function positionButton(btn, pctX, pctY) {
    btn.style.position = 'absolute';
    btn.style.left = (pctX * 100) + '%';
    btn.style.top  = (pctY * 100) + '%';
    btn.style.transform = 'translate(-50%, -50%)';
}

function moveToRandom(btn) {
    const x = 10 + Math.random() * 80;
    const y = 10 + Math.random() * 80;
    positionButton(btn, x / 100, y / 100);
}

// ── FINALE ─────────────────────────────────────────
function runFinale() {
    const overlayEl = document.getElementById('overlay');
    const finale = document.getElementById('finale');
    const textEl = document.getElementById('finale-text');

    overlayEl.classList.add('hidden');
    finale.style.display = 'flex';
    finale.style.opacity = '1';
    textEl.style.opacity = '0';
    textEl.style.transition = 'opacity 1s ease';

    let msgIndex = 0;

    function showMessage() {
        if (msgIndex >= SURPRISE_CONFIG.WIN_MESSAGES.length) {
            setTimeout(() => {
                window.location.replace(SURPRISE_CONFIG.ORIGINAL_URL);
            }, 500);
            return;
        }

        textEl.textContent = SURPRISE_CONFIG.WIN_MESSAGES[msgIndex];

        requestAnimationFrame(() => {
            textEl.style.opacity = '1';
        });

        setTimeout(() => {
            textEl.style.opacity = '0';
            setTimeout(() => {
                msgIndex++;
                showMessage();
            }, 1000);
        }, SURPRISE_CONFIG.WIN_MESSAGE_DURATION);
    }

    showMessage();
}
