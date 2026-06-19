// ╔══════════════════════════════════════════════╗
// ║  CONFIG — change everything here            ║
// ╚══════════════════════════════════════════════╝
const CONFIG = {
  // When the surprise unlocks. Uses LOCAL time (same as the countdown site).
  // June 28, midnight in the viewer's timezone.
  TARGET_DATE: '2026-06-18T00:00:00',

  // The original countdown site
  ORIGINAL_URL: 'https://wjlslta.github.io/birthday-website/',

  // Password to reach the mini game
  PASSWORD: '0917',

  // ═══════════════════════════════════════════════
  //  PATH 1: Clicking "Yes" (button moves around)
  //  One message per click. After the last message,
  //  Yes disappears and user must click No.
  // ═══════════════════════════════════════════════
  YES_MESSAGES: [
    // ── Confusion ──
    'Wait... are you serious?',
    'wait, really?',
    'are you sure you\'re janice??!',
    'Are you reealllyyyyyyyy sure??',

    // ── Gaslighting ──
    'Wait... you WANT to say yes?',
    "You're not clicking the wrong button are you??",
    'this is the WRONG button',
    'just click no please...',

    // ── Begging ──
    'Please???',
    'Pretty please??',
    'Pretty please with a boba?',
    'Pretty please with a boba and a dino jelly cat??',

    // ── Embarrassment ──
    "Okay so you're just clicking randomly huh",
    'i coded this whole thing (with ai) and you\'re clicking the WRONG Yes',
    'This is getting embarrassing ngl',

    // ── Resignation ──
    "don't you think you should give up",
    'you know what, just... imma give up...',

    // ── The reveal ──
    'WAIT OR ARE YOU DOING THIS TO SPITE CY',
    'if you are you win okayyy',
    'Reallyyyyy...',
    "I'm serioussss",
    "i dunno what else to say... so bye??, imma disappear now",
  ],

  // ═══════════════════════════════════════════════
  //  PATH 2: Clicking "No" FIRST (full route)
  //  Yes disappears immediately. These play out.
  // ═══════════════════════════════════════════════
  NO_FULL_MESSAGES: [
    // ── Play it off ──
    "Are you sure???",
    "Like... actually sure?",
    "Because I could just be messing with you",
    "I might actually be serious thoooo",

    // ── Wait, am I? ──
    "okay wait you're actually clicking no",
    "that means you read the question...",
    "and you thought about it...",
    "and you chose no...",

    // ── Getting real ──
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

  // ═══════════════════════════════════════════════
  //  PATH 3: Clicking "No" AFTER some "Yes" clicks
  //  Shorter route — you already teased her enough
  // ═══════════════════════════════════════════════
  NO_SHORT_MESSAGES: [
    "oh so NOW you click no?",
    "after all that??",
    "you really made me wait huh",
    "well at least you were joking",
    "hehehe",
    "Good Girl! You made the right choice, *pats you on head*",
  ],

  // Full-screen messages shown after the mini game
  WIN_MESSAGES: [
    "Anyways Happy Birthday Janice!!! 🥳",
    "Hope you enjoyed my suprise!",
    "-your un(der)paid tech support",
  ],

  // How long each win message stays (ms)
  WIN_MESSAGE_DURATION: 3000,

  // Password attempt error messages
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

// ╔══════════════════════════════════════════════╗
// ║  DATE GATE — only fire after countdown ends  ║
// ╚══════════════════════════════════════════════╝
(function checkDate() {
  const target = new Date(CONFIG.TARGET_DATE);
  const now = new Date();

  if (now >= target) {
    const existingOverlay = document.getElementById('overlay');

    if (existingOverlay) {
      existingOverlay.classList.remove('hidden');
      wireEvents();
      showPhase('phase-initial');
    } else {
      buildOverlay();
      showPhase('phase-initial');
    }
  }
})();

// ╔══════════════════════════════════════════════╗
// ║  BUILD OVERLAY (for embedded mode)          ║
// ╚══════════════════════════════════════════════╝
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

  wireEvents();
}

// ╔══════════════════════════════════════════════╗
// ║  EVENT WIRING                               ║
// ╚══════════════════════════════════════════════╝
function wireEvents() {
  document.getElementById('btn-skip').addEventListener('click', () => {
    window.location.replace(CONFIG.ORIGINAL_URL);
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

// ╔══════════════════════════════════════════════╗
// ║  PHASE SWITCHING                            ║
// ╚══════════════════════════════════════════════╝
function showPhase(phaseId) {
  document.querySelectorAll('.phase').forEach(p => p.classList.remove('active'));
  document.getElementById(phaseId).classList.add('active');
}

// ╔══════════════════════════════════════════════╗
// ║  PASSWORD HANDLER                           ║
// ╚══════════════════════════════════════════════╝
let passwordAttempts = 0;

function handlePassword() {
  const input = document.getElementById('password-input');
  const errorEl = document.getElementById('password-error');
  const guess = input.value.trim();

  if (guess === CONFIG.PASSWORD) {
    errorEl.textContent = '';
    input.value = '';
    passwordAttempts = 0;
    showPhase('phase-game');
    initGame();
    return;
  }

  passwordAttempts++;
  const msgIndex = Math.min(passwordAttempts - 1, CONFIG.WRONG_PASSWORD_MESSAGES.length - 1);
  errorEl.textContent = CONFIG.WRONG_PASSWORD_MESSAGES[msgIndex];
  input.value = '';

  if (passwordAttempts >= CONFIG.WRONG_PASSWORD_MESSAGES.length) {
    setTimeout(() => {
      window.location.replace(CONFIG.ORIGINAL_URL);
    }, 1500);
  }
}

// ╔══════════════════════════════════════════════╗
// ║  MINI GAME — BRANCHING PATHS                ║
// ╚══════════════════════════════════════════════╝
let yesClicks = 0;
let noClicks = 0;
let noRouteActive = false;
let noMessages = [];      // which No-message pool is active
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

  // Yes button — moves around, plays YES_MESSAGES
  const btnYes = document.createElement('button');
  btnYes.className = 'game-btn btn-primary';
  btnYes.textContent = 'Yes';
  gameArea.appendChild(btnYes);

  // No button — stays put, triggers No route
  const btnNo = document.createElement('button');
  btnNo.className = 'game-btn btn-secondary';
  btnNo.textContent = 'No';
  gameArea.appendChild(btnNo);

  positionButton(btnYes, 0.35, 0.4);
  positionButton(btnNo, 0.65, 0.4);

  // ── YES BUTTON ──
  btnYes.addEventListener('click', () => {
    if (gameDone || noRouteActive) return;
    yesClicks++;

    const idx = Math.min(yesClicks - 1, CONFIG.YES_MESSAGES.length - 1);
    gameMsg.textContent = CONFIG.YES_MESSAGES[idx];

    if (yesClicks >= CONFIG.YES_MESSAGES.length) {
      // Yes ran out of messages — remove it, force into No route
      btnYes.style.opacity = '0';
      setTimeout(() => btnYes.remove(), 300);
      activateNoRoute();
    } else {
      moveToRandom(btnYes);
    }
  });

  // ── NO BUTTON ──
  btnNo.addEventListener('click', () => {
    if (gameDone) return;

    if (!noRouteActive) {
      // First No click — remove Yes, pick message pool
      btnYes.style.opacity = '0';
      setTimeout(() => btnYes.remove(), 300);

      if (yesClicks === 0) {
        // Clicked No immediately → full route
        noMessages = CONFIG.NO_FULL_MESSAGES;
      } else {
        // Clicked No after some Yes clicks → short route
        noMessages = CONFIG.NO_SHORT_MESSAGES;
      }
      noRouteActive = true;
      noClicks = 0;
    }

    // Show next No message
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
  // Yes ran out of messages — force into short No route
  noRouteActive = true;
  noClicks = 0;
  noMessages = CONFIG.NO_SHORT_MESSAGES;
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

// ╔══════════════════════════════════════════════╗
// ║  FINALE — Full-screen messages              ║
// ╚══════════════════════════════════════════════╝
function runFinale() {
  const overlayEl = document.getElementById('overlay');
  const finale = document.getElementById('finale');
  const textEl = document.getElementById('finale-text');

  // Hide overlay, show solid black finale screen immediately
  overlayEl.classList.add('hidden');
  finale.style.display = 'flex';
  finale.style.opacity = '1';        // solid black, no transparency
  textEl.style.opacity = '0';
  textEl.style.transition = 'opacity 1s ease';

  let msgIndex = 0;

  function showMessage() {
    if (msgIndex >= CONFIG.WIN_MESSAGES.length) {
      setTimeout(() => {
        window.location.replace(CONFIG.ORIGINAL_URL);
      }, 500);
      return;
    }

    textEl.textContent = CONFIG.WIN_MESSAGES[msgIndex];

    // Fade in
    requestAnimationFrame(() => {
      textEl.style.opacity = '1';
    });

    // Hold, then fade out
    setTimeout(() => {
      textEl.style.opacity = '0';

      setTimeout(() => {
        msgIndex++;
        showMessage();
      }, 1000); // match fadeOut duration
    }, CONFIG.WIN_MESSAGE_DURATION);
  }

  showMessage();
}
