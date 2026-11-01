// Phantom Fury — the board's edge tracks and reserve boxes, where the
// tabletop game keeps its markers and waiting pieces. Every point is the
// VASSAL module's own snap point (source/PhantomFury_2nd_Edition/buildFile.xml,
// Zones "Turn", "Score", "Hornet", "SuperCobra", "DragonEye" and the four
// "... Starting Zone" boxes), in ORIGINAL-scan pixels (5271 x 3812), the same
// space as data/phantomfury_board.js; the page subtracts the crop.
//   turn[i]        Game Turn marker on Turn i+1 (the date wheel)
//   score[i]       VP units marker on i (the VP wheel's outer ring)
//   scoreCentre    VP tens marker: sits in the wheel's centre and points at
//                  0 / 10 / 20 / 30; its +/- face is the sign
//   missions.*[i]  Mission marker after i successful Missions [9.2.1]
//   boxes.*        reserve boxes, one slot per waiting piece [10.1-10.4]
var PhantomFuryTracks = {
 "turn": [
  [
   4757,
   442
  ],
  [
   4841,
   477
  ],
  [
   4904,
   536
  ],
  [
   4935,
   621
  ],
  [
   4937,
   709
  ],
  [
   4903,
   791
  ],
  [
   4842,
   850
  ],
  [
   4760,
   888
  ],
  [
   4670,
   887
  ],
  [
   4583,
   853
  ],
  [
   4523,
   791
  ],
  [
   4489,
   706
  ],
  [
   4491,
   619
  ],
  [
   4522,
   537
  ],
  [
   4583,
   470
  ],
  [
   4668,
   441
  ]
 ],
 "score": [
  [
   4797,
   1070
  ],
  [
   4897,
   1101
  ],
  [
   4953,
   1184
  ],
  [
   4952,
   1283
  ],
  [
   4897,
   1366
  ],
  [
   4800,
   1396
  ],
  [
   4702,
   1364
  ],
  [
   4641,
   1284
  ],
  [
   4642,
   1183
  ],
  [
   4702,
   1104
  ]
 ],
 "scoreCentre": [
  4798,
  1234
 ],
 "missions": {
  "hornet": [
   [
    558,
    2607
   ],
   [
    559,
    2679
   ]
  ],
  "superCobra": [
   [
    558,
    2827
   ],
   [
    559,
    2900
   ],
   [
    558,
    2974
   ]
  ],
  "dragonEye": [
   [
    557,
    3114
   ],
   [
    558,
    3194
   ],
   [
    558,
    3266
   ],
   [
    557,
    3343
   ],
   [
    556,
    3418
   ]
  ]
 },
 "boxes": {
  "iif": [
   [
    2010,
    3541
   ],
   [
    2102,
    3543
   ],
   [
    2193,
    3538
   ]
  ],
  "battalion": [
   [
    3129,
    3350
   ],
   [
    3218,
    3352
   ],
   [
    3317,
    3349
   ]
  ],
  "company": [
   [
    2847,
    3541
   ],
   [
    3123,
    3542
   ],
   [
    3411,
    3542
   ]
  ],
  "abrams": [
   [
    4078,
    3483
   ],
   [
    4170,
    3484
   ]
  ]
 }
};
