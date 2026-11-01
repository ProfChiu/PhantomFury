// Phantom Fury — catalogue of the character art in assets/characters/.
// One record per image: who is drawn, how it is framed, what they are doing,
// its pixel size, and where the page uses it today (empty = not yet used).
// Framing: "head" (face only), "bust" (head and chest), "full" (whole figure),
// "scene" (figure with furniture or other people). Paths are relative to
// game/index.html. Data only: no DOM, nothing here is read by the engine.
var PhantomFuryAssets = {
  dir: "../assets/characters/",
  characters: {
    // Hendrix — the combat cameo on fire and assault steps
    "hendrix-rifle-kneeling-fire.png":   { who: "hendrix", framing: "full",  pose: "kneeling, firing rifle",  w: 493, h: 568,  usedBy: ["director CAMEOS.fire", "index #lesson-cameo"] },
    "hendrix-rifle-standing-firing.png": { who: "hendrix", framing: "full",  pose: "standing, firing rifle",  w: 395, h: 503,  usedBy: ["director CAMEOS.assault"] },

    // Walsh — the lesson guide: faces and busts
    "walsh-face-smiling.png":            { who: "walsh", framing: "head",  pose: "smiling, talking",        w: 304, h: 483,  usedBy: ["director talk", "index #guide-img"] },
    "walsh-head-grinning.png":           { who: "walsh", framing: "head",  pose: "grinning",                w: 228, h: 267,  usedBy: [] },
    "walsh-head-portrait-calm.png":      { who: "walsh", framing: "head",  pose: "calm smile",              w: 334, h: 503,  usedBy: ["director focus"] },
    "walsh-bust-calm.png":               { who: "walsh", framing: "bust",  pose: "calm, eyes closed",       w: 254, h: 347,  usedBy: ["director think"] },
    "walsh-bust-hand-signals.png":       { who: "walsh", framing: "bust",  pose: "hand signals, pointing",  w: 843, h: 841,  usedBy: ["director point", "index .chapters-guide"] },
    "walsh-bust-laughing-side.png":      { who: "walsh", framing: "bust",  pose: "laughing, side view",     w: 266, h: 297,  usedBy: ["director grin"] },
    "walsh-bust-laughing.png":           { who: "walsh", framing: "bust",  pose: "laughing, eyes closed",   w: 370, h: 422,  usedBy: [] },
    "walsh-bust-smile.png":              { who: "walsh", framing: "bust",  pose: "soft smile",              w: 354, h: 477,  usedBy: [] },
    "walsh-bust-surprised.png":          { who: "walsh", framing: "bust",  pose: "surprised, open mouth",   w: 406, h: 498,  usedBy: [] },
    "walsh-bust-angry.png":              { who: "walsh", framing: "bust",  pose: "angry, stern",            w: 406, h: 478,  usedBy: [] },
    "walsh-bust-thinking.png":           { who: "walsh", framing: "bust",  pose: "thinking",                w: 262, h: 349,  usedBy: [] },
    "walsh-bust-portrait-confident.png": { who: "walsh", framing: "bust",  pose: "confident",               w: 354, h: 405,  usedBy: [] },
    "walsh-bust-portrait-focused.png":   { who: "walsh", framing: "bust",  pose: "focused",                 w: 505, h: 495,  usedBy: [] },
    "walsh-bust-portrait-regular.png":   { who: "walsh", framing: "bust",  pose: "neutral",                 w: 337, h: 456,  usedBy: [] },
    "walsh-bust-portrait-surprised.png": { who: "walsh", framing: "bust",  pose: "surprised",               w: 390, h: 480,  usedBy: ["director wow"] },
    "walsh-canteen-drink-bust.png":      { who: "walsh", framing: "bust",  pose: "drinking from canteen",   w: 491, h: 513,  usedBy: [] },

    // Walsh — whole figure
    "walsh-standing-front.png":          { who: "walsh", framing: "full",  pose: "standing, front",         w: 633, h: 1593, usedBy: [] },
    "walsh-standing-profile.png":        { who: "walsh", framing: "full",  pose: "standing, profile",       w: 501, h: 1592, usedBy: [] },
    "walsh-standing-confident.png":      { who: "walsh", framing: "full",  pose: "standing, hands on hips", w: 391, h: 806,  usedBy: [] },
    "walsh-standing-kit.png":            { who: "walsh", framing: "full",  pose: "standing, full kit",      w: 488, h: 959,  usedBy: [] },
    "walsh-standing-rifle.png":          { who: "walsh", framing: "full",  pose: "standing, aiming rifle",  w: 529, h: 716,  usedBy: [] },
    "walsh-standing-snack.png":          { who: "walsh", framing: "full",  pose: "standing, eating snack",  w: 340, h: 975,  usedBy: [] },
    "walsh-kneeling-rifle.png":          { who: "walsh", framing: "full",  pose: "kneeling, aiming rifle",  w: 514, h: 548,  usedBy: [] },
    "walsh-kneel-tablet-drone.png":      { who: "walsh", framing: "full",  pose: "kneeling, flying drone",  w: 298, h: 364,  usedBy: ["director drone"] },
    "walsh-barrier-leap.png":            { who: "walsh", framing: "full",  pose: "leaping a barrier",       w: 375, h: 661,  usedBy: [] },

    // Walsh — off-duty scenes
    "walsh-bunk-phone.png":              { who: "walsh", framing: "scene", pose: "bunk bed, on phone",      w: 427, h: 411,  usedBy: [] },
    "walsh-bunk-sleeping.png":           { who: "walsh", framing: "scene", pose: "bunk bed, asleep",        w: 408, h: 428,  usedBy: [] },
    "walsh-cot-sleeping.png":            { who: "walsh", framing: "scene", pose: "cot, asleep",             w: 952, h: 551,  usedBy: [] },
    "walsh-crates-seated.png":           { who: "walsh", framing: "scene", pose: "sitting on crates",       w: 818, h: 1594, usedBy: [] },
    "walsh-desk-writing.png":            { who: "walsh", framing: "scene", pose: "desk, writing",           w: 706, h: 533,  usedBy: [] },
    "walsh-writing-letter.png":          { who: "walsh", framing: "scene", pose: "writing a letter",        w: 392, h: 450,  usedBy: [] },
    "walsh-ironing.png":                 { who: "walsh", framing: "scene", pose: "ironing uniform",         w: 725, h: 573,  usedBy: [] },
    "walsh-table-meal.png":              { who: "walsh", framing: "scene", pose: "eating at a table",       w: 698, h: 1003, usedBy: [] },
    "walsh-mess-table-group.png":        { who: "walsh", framing: "scene", pose: "mess table with squad",   w: 593, h: 441,  usedBy: [] },
    "walsh-card-game-group.png":         { who: "walsh", framing: "scene", pose: "card game with squad",    w: 805, h: 493,  usedBy: [] },
    "walsh-washing-face.png":            { who: "walsh", framing: "scene", pose: "washing face at sink",    w: 579, h: 693,  usedBy: [] },
    "walsh-water-cooler.png":            { who: "walsh", framing: "scene", pose: "lockers, water cooler",   w: 378, h: 417,  usedBy: [] },
    "walsh-weapon-cleaning.png":         { who: "walsh", framing: "scene", pose: "cleaning a weapon",       w: 717, h: 732,  usedBy: [] }
  }
};
