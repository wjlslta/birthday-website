/* ============================================================
   BIRTHDAY OVERLAY — message arrays + full-yes finale logic
   Drop these into surprise.js. Notes at the bottom explain
   the wiring since I don't have your actual file to edit directly.
   ============================================================ */


/* ----------------------------------------------------------
   1. NO_FULL_MESSAGES — she clicks No immediately, no yes clicks
   56 lines. devastation -> respect -> one sincere line -> revenge threat
   ---------------------------------------------------------- */
const NO_FULL_MESSAGES = [
  "WOW",
  "okay",
  "not even a SECOND of consideration",
  "you just—",
  "this isnt ur second time right??",
  "you didnt come back to see what clicking no would do right??",
  "you know what this is right??",
  "on your birthday",
  "the one day a year when i thought maybe, just maybe, you'd be in a mood to say yes to something",
  "and you click no like you're declining a calendar invite",
  "i spent so long on this (with ai) lor",
  "tskkkk",
  "fineeeee",
  "you win this time",
  "but i need you to know what you just missed outttt",
  "i thought about this confession bit for like a week",
  "wrote a bunch of yes messages",
  "for NOTHING",
  "you didn't click a single one",
  "not ONE",
  "i have ideas...",
  "wasted on someone with this much ... 決心",
  "anyways",
  "happy birthday janice",
  "for real",
  "you're the only person i'd build an entire fake website to mess with",
  "(well) kinda with ai help but still",
  "happy birthday laaa",
  "Love youuuuu(yes platonic) (so much)",
  "okayyyyy byeeeee now imma go be normal again",
];


/* ----------------------------------------------------------
   2. NO_SHORT_MESSAGES — she clicks Yes N times then No
   47 lines, with the yesClicks count baked in.
   This is now a FUNCTION, not a static array, because it needs
   the click count. Call it once when the no-route activates.
   ---------------------------------------------------------- */
function buildNoShortMessages(yesClicks) {
  return [
    `wait. you clicked yes ${yesClicks} times`,
    "and THEN you said no",
    "...",
    "okay wow",
    "that's so much worse than an immediate no",
    "you let me get my hopes up",
    "you read the boba threat",
    "you saw the dino jelly cat line and kept GOING",
    "you watched me beg",
    "you watched me question if you were even janice",
    "you sat through the part where i said you were clicking the wrong button",
    "you let me think i was getting somewhere",
    "you were just farming content this whole time weren't you",
    "this was never about saying yes for you huh",
    "you just wanted to see how far i'd go",
    "you chaotic creature",
    "you menace",
    "you absolute MENACE",
    "okay but also",
    "i have to respect it",
    `${yesClicks} clicks of pure psychological warfare`,
    "you knew exactly what you were doing",
    "you let me spiral. on purpose.",
    "for sport",
    "for content",
    "for absolutely no reason except chaos",
    "this is genuinely the most janice thing you could've done",
    "real ones don't say no immediately",
    "real ones make you suffer first",
    "and THEN say no",
    "that's... actually kind of an art form",
    "i'm offended but also a little impressed",
    "mostly offended",
    "okay mostly impressed",
    "anyway",
    `you humored my unhinged confession for ${yesClicks} clicks`,
    "and gave me false hope for free",
    "couldn't be me (it was me, i wrote this whole thing)",
    "okay but for real",
    "thank you for entertaining this with me",
    `you're the only person who'd sit through ${yesClicks} fake yeses just to mess with me back`,
    "...okay that one was sincere. ignoring that.",
    "moving on",
    "happy birthday you certified menace",
    `i'm remembering this number (${yesClicks}) forever btw`,
    "it's getting written down. for revenge purposes.",
    "anyway bye, love you, never doing this again",
  ];
}


/* ----------------------------------------------------------
   3. YES_FINALE_MESSAGES — she clicks Yes through all 22 and
   then clicks the armed "yes (for real??)" button.
   63 lines. panic spiral -> self-aware collapse -> escape.
   ---------------------------------------------------------- */
const YES_FINALE_MESSAGES = [
  "wait",
  "wait wait wait",
  "you clicked yes",
  "22 times",
  "TWENTY TWO TIMES",
  "you never clicked no",
  "not once",
  "janice",
  "janice what is happening",
  "this was a joke",
  "this was SUPPOSED to be a joke",
  "...wasn't it??",
  "you know this is a joke right",
  "right???",
  "haha. right.",
  "okay why aren't you saying anything",
  "did my fake bit just accidentally become real",
  "is this real now",
  "are we... together now",
  "i did not plan for this outcome",
  "i have zero contingency for this",
  "i wrote 22 yes messages and zero plans for after 22 yes messages",
  "rookie mistake honestly",
  "okay. okay. let's think about this calmly.",
  "actually no let's not, i'm spiraling a little",
  "you really just kept clicking yes huh",
  "past the confusion phase",
  "past the part where i said you were clicking the wrong button",
  "past the begging",
  "past the boba and the dino jelly cat",
  "past the part where i said i was giving up and disappearing",
  "you saw ALL of that and still thought yes was the move",
  "okay i need you to explain yourself",
  "is this a bit",
  "are you doing a bit back at me right now",
  "or did you actually just agree to date your best friend over text",
  "WAIT OR ARE YOU DOING THIS TO SPITE CY",
  "if you are, i respect it, but i also need clarity",
  "because my code does not know what to do right now",
  "i did not write a plan for this (with ai) or otherwise",
  "we are off the map",
  "we are in uncharted territory",
  "okay deep breaths",
  "so. to confirm.",
  "you, janice, my best friend since forever",
  "have said yes",
  "to a confession",
  "that i wrote as a joke",
  "more than 22 times",
  "and you are STILL here. still clicking.",
  "alright",
  "well",
  "i guess we're doing this then",
  "i guess this is happening",
  "okay i'm panicking a little but in a good way??",
  "no wait i'm panicking in a normal way this is a LOT",
  "okay imma just process this for a second",
  "...okay i'm done processing",
  "okay you know what",
  "i'm just gonna leave this here",
  "happy birthday janice",
  "i can't believe my joke became a referendum on our friendship",
  "10/10 bit honestly. you win. i don't know what i'm doing anymore. bye",
];


/* ============================================================
   CODE LOGIC — full-yes path
   ============================================================

   This is written against the pseudocode you gave me, so the
   variable/function names below are my best guess at your real
   code. Rename to match (yesButton, showMessage, gameDone, etc.)
   when you paste this in.

   New state needed:
     let yesFinaleActive = false;
     let yesFinaleIndex = 0;

   The key idea: once yesClicks hits 22, DON'T remove the yes
   button or start the no route. Instead arm it — change its
   text to "yes (for real??)". The NEXT yes click is what kicks
   off YES_FINALE_MESSAGES, one message per click, same pattern
   as the no route.
   ============================================================ */

function handleYesClick() {
  if (gameDone || noRouteActive) return;

  // already inside the full-yes finale sequence — just advance it
  if (yesFinaleActive) {
    showMessage(YES_FINALE_MESSAGES[yesFinaleIndex]);
    yesFinaleIndex++;

    if (yesFinaleIndex >= YES_FINALE_MESSAGES.length) {
      gameDone = true;
      yesFinale();
    }
    return;
  }

  yesClicks++;

  // this is the click AFTER the 22nd scripted yes message —
  // i.e. she clicked the armed "yes (for real??)" button
  if (yesClicks > YES_MESSAGES.length) {
    yesFinaleActive = true;
    yesFinaleIndex = 0;
    showMessage(YES_FINALE_MESSAGES[yesFinaleIndex]);
    yesFinaleIndex++;
    return;
  }

  showMessage(YES_MESSAGES[yesClicks - 1]);

  // just hit the last scripted yes message — arm the finale
  // instead of killing the button / forcing the no route
  if (yesClicks === YES_MESSAGES.length) {
    yesButton.textContent = "yes (for real??)";
  }
}

function handleNoClick() {
  if (gameDone) return;

  if (!noRouteActive) {
    yesButton.remove();
    noMessages = yesClicks === 0
      ? NO_FULL_MESSAGES
      : buildNoShortMessages(yesClicks);   // <-- now a function call
    noRouteActive = true;
  }

  showMessage(noMessages[noClicks]);
  noClicks++;

  if (noClicks >= noMessages.length) {
    gameDone = true;
    runFinale();
  }
}

function yesFinale() {
  // mirror whatever runFinale() does visually for the no-path
  // ending. minimal version: lock the button, leave the last
  // message on screen. swap in a custom "the end" card if you
  // want a harder stop than the no-path gets.
  yesButton.disabled = true;
}


/* ============================================================
   INTEGRATION CHECKLIST
   ============================================================
   1. Paste NO_FULL_MESSAGES and YES_FINALE_MESSAGES into CONFIG.
   2. Replace your static NO_SHORT_MESSAGES array with the
      buildNoShortMessages(yesClicks) function — it's now
      generated at no-route-activation time instead of fixed.
   3. Update every place that referenced CONFIG.NO_SHORT_MESSAGES
      directly to call buildNoShortMessages(yesClicks) instead.
   4. Replace your yes-click and no-click handlers with the
      versions above (renaming to match your real variable names).
   5. Add yesFinale() — wire it to whatever runFinale() does
      visually if you want them to look the same.
   6. Add state: let yesFinaleActive = false; let yesFinaleIndex = 0;
   7. Change TARGET_DATE back to '2026-06-28T00:00:00' before deploying.
   8. Test all three paths: full no, partial yes -> no, full yes -> finale.
   ============================================================ */
