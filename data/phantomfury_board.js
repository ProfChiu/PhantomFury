// Phantom Fury — real board data (Phase 1). Generated from the VASSAL ZonedGrid +
// a visual read of PhF_Board.jpeg on 2026-10-04. See meta.notes for confidence.
// Phase 2 folds this into the engine's data source of truth.
var PhantomFuryBoard = {
 "meta": {
  "game": "Phantom Fury",
  "boardImage": "PhF_Board.jpeg",
  "boardSize": [
   5271,
   3812
  ],
  "imageCrop": {
   "note": "2026-10-06: the owner re-cropped assets/PhF_Board.jpeg in Photoshop. Every coordinate in this file (and data/phantomfury_tracks.js) stays in the ORIGINAL scan's pixels (boardSize, the VASSAL space); the page subtracts this offset. Measured by image matching: a pure crop, no scaling (mean pixel difference < 0.4).",
   "x": 227,
   "y": 153,
   "w": 4851,
   "h": 3511
  },
  "source": "Locations and Street polygons: VASSAL module buildFile.xml ZonedGrid (exact). Egress, Blocks, circles: read off PhF_Board.jpeg 2026-10-04 (see notes).",
  "notes": [
   "Map is printed south-up: image top = map south. Start Zones 1-9 are the image-bottom row; EXIT egress is on zones 52-61 (image top) = the map's south edge [13.6.6].",
   "Blocks read from solid borders (dotted line = separation inside a Block). One consumer: Fanaticism [13.4.3.3]. Spot-verify during Phase 2 page calibration.",
   "locationLinks use the arrow pattern common to every Zone inspected (1-2-R chain, 1-1', 2-2', 1'-2', 1'-1'', 1-C, 1-OG, C-OG). Spot-verify in Phase 2.",
   "neighbouring computed geometrically (adjacent row bands, centres <=800px) and cross-checked against printed Egress lists: every Egress target is Adjacent or Neighbouring.",
   "Zone 27 has no VASSAL grid entry (no unit may enter it); centre is approximate."
  ]
 },
 "zones": [
  {
   "id": 1,
   "row": "A",
   "block": 0,
   "circle": "start",
   "centre": [
    887,
    3312
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 972,
     "y": 3382
    },
    {
     "id": "1",
     "type": "1",
     "x": 866,
     "y": 3394
    },
    {
     "id": "2",
     "type": "2",
     "x": 858,
     "y": 3284
    },
    {
     "id": "R",
     "type": "R",
     "x": 851,
     "y": 3188
    }
   ],
   "egress": [
    13,
    14
   ],
   "adjacent": [],
   "neighbouring": [
    13,
    14
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 2,
   "row": "A",
   "block": 4,
   "circle": "start",
   "centre": [
    1260,
    3266
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 1332,
     "y": 3341
    },
    {
     "id": "1",
     "type": "1",
     "x": 1226,
     "y": 3354
    },
    {
     "id": "2",
     "type": "2",
     "x": 1215,
     "y": 3249
    },
    {
     "id": "2'",
     "type": "2",
     "x": 1323,
     "y": 3236
    },
    {
     "id": "R",
     "type": "R",
     "x": 1203,
     "y": 3148
    }
   ],
   "egress": [
    14,
    13,
    15
   ],
   "adjacent": [
    3
   ],
   "neighbouring": [
    13,
    14,
    15
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "2",
     "2'"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 3,
   "row": "A",
   "block": 4,
   "circle": "start",
   "centre": [
    1708,
    3222
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 1781,
     "y": 3298
    },
    {
     "id": "1",
     "type": "1",
     "x": 1675,
     "y": 3310
    },
    {
     "id": "2",
     "type": "2",
     "x": 1660,
     "y": 3205
    },
    {
     "id": "2'",
     "type": "2",
     "x": 1770,
     "y": 3195
    },
    {
     "id": "R",
     "type": "R",
     "x": 1652,
     "y": 3103
    }
   ],
   "egress": [
    15,
    14,
    16
   ],
   "adjacent": [
    2,
    4
   ],
   "neighbouring": [
    14,
    15,
    16
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "2",
     "2'"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 4,
   "row": "A",
   "block": 4,
   "circle": "start",
   "centre": [
    2107,
    3179
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 2182,
     "y": 3256
    },
    {
     "id": "1",
     "type": "1",
     "x": 2074,
     "y": 3266
    },
    {
     "id": "2",
     "type": "2",
     "x": 2060,
     "y": 3163
    },
    {
     "id": "2'",
     "type": "2",
     "x": 2171,
     "y": 3149
    },
    {
     "id": "R",
     "type": "R",
     "x": 2050,
     "y": 3062
    }
   ],
   "egress": [
    16,
    15,
    17
   ],
   "adjacent": [
    3
   ],
   "neighbouring": [
    15,
    16,
    17
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "2",
     "2'"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 5,
   "row": "A",
   "block": 8,
   "circle": "start",
   "centre": [
    2549,
    3092
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 2623,
     "y": 3168
    },
    {
     "id": "1",
     "type": "1",
     "x": 2515,
     "y": 3180
    },
    {
     "id": "2",
     "type": "2",
     "x": 2502,
     "y": 3073
    },
    {
     "id": "2'",
     "type": "2",
     "x": 2612,
     "y": 3065
    },
    {
     "id": "R",
     "type": "R",
     "x": 2495,
     "y": 2973
    }
   ],
   "egress": [
    17,
    16,
    18
   ],
   "adjacent": [
    17
   ],
   "neighbouring": [
    16,
    18
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "2",
     "2'"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 6,
   "row": "A",
   "block": 9,
   "circle": "start",
   "centre": [
    2992,
    2966
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 3054,
     "y": 3009
    },
    {
     "id": "1",
     "type": "1",
     "x": 2944,
     "y": 3024
    },
    {
     "id": "2",
     "type": "2",
     "x": 2930,
     "y": 2918
    },
    {
     "id": "R",
     "type": "R",
     "x": 3041,
     "y": 2912
    }
   ],
   "egress": [
    18,
    19,
    17
   ],
   "adjacent": [
    7
   ],
   "neighbouring": [
    17,
    18,
    19
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 7,
   "row": "A",
   "block": 9,
   "circle": "start",
   "centre": [
    3407,
    3015
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 3499,
     "y": 3083
    },
    {
     "id": "1",
     "type": "1",
     "x": 3389,
     "y": 3095
    },
    {
     "id": "2",
     "type": "2",
     "x": 3376,
     "y": 2990
    },
    {
     "id": "R",
     "type": "R",
     "x": 3364,
     "y": 2891
    }
   ],
   "egress": [
    19,
    18,
    20
   ],
   "adjacent": [
    6
   ],
   "neighbouring": [
    10,
    11,
    18,
    19,
    20
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 8,
   "row": "A",
   "block": 10,
   "circle": "start",
   "centre": [
    4172,
    3147
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 4274,
     "y": 3207
    },
    {
     "id": "1",
     "type": "1",
     "x": 4168,
     "y": 3200
    },
    {
     "id": "2",
     "type": "2",
     "x": 4177,
     "y": 3095
    },
    {
     "id": "R",
     "type": "R",
     "x": 4069,
     "y": 3087
    }
   ],
   "egress": [
    11,
    10,
    12
   ],
   "adjacent": [
    9
   ],
   "neighbouring": [
    10,
    11,
    12,
    20,
    21,
    22
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 9,
   "row": "A",
   "block": 10,
   "circle": "start",
   "centre": [
    4514,
    3126
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 4573,
     "y": 3173
    },
    {
     "id": "1",
     "type": "1",
     "x": 4463,
     "y": 3183
    },
    {
     "id": "2",
     "type": "2",
     "x": 4455,
     "y": 3078
    },
    {
     "id": "R",
     "type": "R",
     "x": 4563,
     "y": 3072
    }
   ],
   "egress": [
    12,
    11
   ],
   "adjacent": [
    8
   ],
   "neighbouring": [
    10,
    11,
    12,
    21,
    22
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 10,
   "row": "B2",
   "block": 11,
   "circle": "white",
   "centre": [
    3832,
    2884
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 3892,
     "y": 2927
    },
    {
     "id": "1",
     "type": "1",
     "x": 3785,
     "y": 2942
    },
    {
     "id": "2",
     "type": "2",
     "x": 3769,
     "y": 2837
    },
    {
     "id": "R",
     "type": "R",
     "x": 3880,
     "y": 2828
    }
   ],
   "egress": [
    20,
    19,
    21
   ],
   "adjacent": [],
   "neighbouring": [
    7,
    8,
    9,
    19,
    20,
    21,
    22
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 11,
   "row": "B2",
   "block": 12,
   "circle": "white",
   "centre": [
    4166,
    2844
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 4229,
     "y": 2889
    },
    {
     "id": "1",
     "type": "1",
     "x": 4116,
     "y": 2902
    },
    {
     "id": "2",
     "type": "2",
     "x": 4104,
     "y": 2799
    },
    {
     "id": "R",
     "type": "R",
     "x": 4213,
     "y": 2788
    }
   ],
   "egress": [
    21,
    20,
    22
   ],
   "adjacent": [],
   "neighbouring": [
    7,
    8,
    9,
    19,
    20,
    21,
    22
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 12,
   "row": "B2",
   "block": 13,
   "circle": "white",
   "centre": [
    4484,
    2800
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 4546,
     "y": 2843
    },
    {
     "id": "1",
     "type": "1",
     "x": 4439,
     "y": 2858
    },
    {
     "id": "2",
     "type": "2",
     "x": 4423,
     "y": 2754
    },
    {
     "id": "R",
     "type": "R",
     "x": 4530,
     "y": 2743
    }
   ],
   "egress": [
    22,
    21
   ],
   "adjacent": [],
   "neighbouring": [
    8,
    9,
    20,
    21,
    22
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 13,
   "row": "B",
   "block": 1,
   "circle": "white",
   "centre": [
    874,
    2907
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 940,
     "y": 2987
    },
    {
     "id": "1",
     "type": "1",
     "x": 831,
     "y": 2998
    },
    {
     "id": "2",
     "type": "2",
     "x": 824,
     "y": 2890
    },
    {
     "id": "R",
     "type": "R",
     "x": 816,
     "y": 2791
    }
   ],
   "egress": [
    23,
    24
   ],
   "adjacent": [],
   "neighbouring": [
    1,
    2,
    23,
    24
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 14,
   "row": "B",
   "block": 5,
   "circle": "white",
   "centre": [
    1382,
    2840
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 1477,
     "y": 2894
    },
    {
     "id": "1",
     "type": "1",
     "x": 1363,
     "y": 2902
    },
    {
     "id": "2",
     "type": "2",
     "x": 1357,
     "y": 2800
    },
    {
     "id": "2'",
     "type": "2",
     "x": 1247,
     "y": 2810
    },
    {
     "id": "R",
     "type": "R",
     "x": 1465,
     "y": 2795
    }
   ],
   "egress": [
    24,
    23,
    25
   ],
   "adjacent": [
    15
   ],
   "neighbouring": [
    1,
    2,
    3,
    23,
    24,
    25
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "2",
     "2'"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 15,
   "row": "B",
   "block": 5,
   "circle": "white",
   "centre": [
    1775,
    2789
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 1870,
     "y": 2842
    },
    {
     "id": "1",
     "type": "1",
     "x": 1758,
     "y": 2852
    },
    {
     "id": "2",
     "type": "2",
     "x": 1750,
     "y": 2750
    },
    {
     "id": "2'",
     "type": "2",
     "x": 1640,
     "y": 2761
    },
    {
     "id": "R",
     "type": "R",
     "x": 1858,
     "y": 2738
    }
   ],
   "egress": [
    26,
    25,
    24
   ],
   "adjacent": [
    14,
    16
   ],
   "neighbouring": [
    2,
    3,
    4,
    24,
    25,
    26
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "2",
     "2'"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 16,
   "row": "B",
   "block": 5,
   "circle": "white",
   "centre": [
    2154,
    2755
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 2246,
     "y": 2808
    },
    {
     "id": "1",
     "type": "1",
     "x": 2140,
     "y": 2820
    },
    {
     "id": "2",
     "type": "2",
     "x": 2129,
     "y": 2713
    },
    {
     "id": "2'",
     "type": "2",
     "x": 2019,
     "y": 2723
    },
    {
     "id": "R",
     "type": "R",
     "x": 2237,
     "y": 2709
    }
   ],
   "egress": [
    26,
    25
   ],
   "adjacent": [
    15
   ],
   "neighbouring": [
    3,
    4,
    5,
    25,
    26
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "2",
     "2'"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 17,
   "row": "B",
   "block": 8,
   "circle": "white",
   "centre": [
    2499,
    2721
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 2572,
     "y": 2799
    },
    {
     "id": "1",
     "type": "1",
     "x": 2465,
     "y": 2809
    },
    {
     "id": "2",
     "type": "2",
     "x": 2454,
     "y": 2703
    },
    {
     "id": "2'",
     "type": "2",
     "x": 2561,
     "y": 2691
    },
    {
     "id": "R",
     "type": "R",
     "x": 2442,
     "y": 2601
    }
   ],
   "egress": [
    26,
    28
   ],
   "adjacent": [
    5
   ],
   "neighbouring": [
    4,
    6,
    26,
    28
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "2",
     "2'"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 18,
   "row": "B",
   "block": 14,
   "circle": "white",
   "centre": [
    2952,
    2620
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 3026,
     "y": 2691
    },
    {
     "id": "1",
     "type": "1",
     "x": 2921,
     "y": 2709
    },
    {
     "id": "2",
     "type": "2",
     "x": 2905,
     "y": 2604
    },
    {
     "id": "2'",
     "type": "2",
     "x": 3015,
     "y": 2592
    },
    {
     "id": "R",
     "type": "R",
     "x": 2895,
     "y": 2502
    }
   ],
   "egress": [
    28,
    29
   ],
   "adjacent": [
    28
   ],
   "neighbouring": [
    5,
    6,
    7,
    29
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "2",
     "2'"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 19,
   "row": "B",
   "block": 15,
   "circle": "white",
   "centre": [
    3420,
    2569
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 3512,
     "y": 2634
    },
    {
     "id": "1",
     "type": "1",
     "x": 3406,
     "y": 2650
    },
    {
     "id": "2",
     "type": "2",
     "x": 3388,
     "y": 2544
    },
    {
     "id": "R",
     "type": "R",
     "x": 3374,
     "y": 2448
    }
   ],
   "egress": [
    29,
    28,
    30
   ],
   "adjacent": [
    29
   ],
   "neighbouring": [
    6,
    7,
    10,
    11,
    28,
    30,
    31
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 20,
   "row": "B",
   "block": 16,
   "circle": "white",
   "centre": [
    3749,
    2518
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 3843,
     "y": 2582
    },
    {
     "id": "1",
     "type": "1",
     "x": 3734,
     "y": 2599
    },
    {
     "id": "2",
     "type": "2",
     "x": 3718,
     "y": 2494
    },
    {
     "id": "R",
     "type": "R",
     "x": 3701,
     "y": 2395
    }
   ],
   "egress": [
    30,
    29,
    31
   ],
   "adjacent": [
    30
   ],
   "neighbouring": [
    7,
    8,
    10,
    11,
    12,
    29,
    31,
    32
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 21,
   "row": "B",
   "block": 17,
   "circle": "white",
   "centre": [
    4087,
    2469
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 4180,
     "y": 2534
    },
    {
     "id": "1",
     "type": "1",
     "x": 4072,
     "y": 2549
    },
    {
     "id": "2",
     "type": "2",
     "x": 4055,
     "y": 2446
    },
    {
     "id": "R",
     "type": "R",
     "x": 4040,
     "y": 2347
    }
   ],
   "egress": [
    31,
    30,
    32
   ],
   "adjacent": [
    31
   ],
   "neighbouring": [
    8,
    9,
    10,
    11,
    12,
    29,
    30,
    32
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 22,
   "row": "B",
   "block": 18,
   "circle": "white",
   "centre": [
    4420,
    2418
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 4496,
     "y": 2491
    },
    {
     "id": "1",
     "type": "1",
     "x": 4387,
     "y": 2509
    },
    {
     "id": "2",
     "type": "2",
     "x": 4375,
     "y": 2402
    },
    {
     "id": "2'",
     "type": "2",
     "x": 4482,
     "y": 2387
    },
    {
     "id": "R",
     "type": "R",
     "x": 4361,
     "y": 2303
    }
   ],
   "egress": [
    32,
    31
   ],
   "adjacent": [
    32
   ],
   "neighbouring": [
    8,
    9,
    10,
    11,
    12,
    30,
    31
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "2",
     "2'"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 23,
   "row": "C",
   "block": 2,
   "circle": "white",
   "centre": [
    833,
    2507
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 920,
     "y": 2582
    },
    {
     "id": "1",
     "type": "1",
     "x": 813,
     "y": 2587
    },
    {
     "id": "2",
     "type": "2",
     "x": 803,
     "y": 2480
    },
    {
     "id": "R",
     "type": "R",
     "x": 796,
     "y": 2379
    }
   ],
   "egress": [
    33,
    34
   ],
   "adjacent": [],
   "neighbouring": [
    13,
    14,
    33,
    34
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 24,
   "row": "C",
   "block": 6,
   "circle": "white",
   "centre": [
    1252,
    2501
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 1366,
     "y": 2542
    },
    {
     "id": "1",
     "type": "1",
     "x": 1259,
     "y": 2551
    },
    {
     "id": "2",
     "type": "2",
     "x": 1246,
     "y": 2446
    },
    {
     "id": "R",
     "type": "R",
     "x": 1138,
     "y": 2466
    }
   ],
   "egress": [
    34,
    33,
    35
   ],
   "adjacent": [
    25
   ],
   "neighbouring": [
    13,
    14,
    15,
    33,
    34,
    35
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 25,
   "row": "C",
   "block": 6,
   "circle": "white",
   "centre": [
    1610,
    2452
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 1724,
     "y": 2495
    },
    {
     "id": "1",
     "type": "1",
     "x": 1617,
     "y": 2503
    },
    {
     "id": "2",
     "type": "2",
     "x": 1605,
     "y": 2396
    },
    {
     "id": "R",
     "type": "R",
     "x": 1496,
     "y": 2412
    }
   ],
   "egress": [
    35,
    36,
    34
   ],
   "adjacent": [
    24
   ],
   "neighbouring": [
    14,
    15,
    16,
    34,
    35,
    36
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 26,
   "row": "C",
   "block": 19,
   "circle": "mosque",
   "centre": [
    2109,
    2413
   ],
   "locations": [
    {
     "id": "OG",
     "type": "OG",
     "x": 2274,
     "y": 2429
    },
    {
     "id": "1",
     "type": "1",
     "x": 2165,
     "y": 2440
    },
    {
     "id": "1'",
     "type": "1",
     "x": 2058,
     "y": 2455
    },
    {
     "id": "1\"",
     "type": "1",
     "x": 1952,
     "y": 2468
    },
    {
     "id": "2",
     "type": "2",
     "x": 2155,
     "y": 2336
    },
    {
     "id": "2'",
     "type": "2",
     "x": 2049,
     "y": 2349
    }
   ],
   "egress": [],
   "adjacent": [],
   "neighbouring": [
    15,
    16,
    17,
    35,
    36
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "1",
     "1'"
    ],
    [
     "2",
     "2'"
    ],
    [
     "1'",
     "2'"
    ],
    [
     "1'",
     "1\""
    ],
    [
     "1",
     "OG"
    ]
   ]
  },
  {
   "id": 27,
   "row": "C",
   "block": -1,
   "circle": "none",
   "centre": [
    2700,
    2200
   ],
   "locations": [],
   "egress": [],
   "special": "open ground; no Locations; no unit may enter [12.4.2]; neither side can Control it [4.1.4]",
   "adjacent": [],
   "neighbouring": [],
   "locationLinks": []
  },
  {
   "id": 28,
   "row": "C",
   "block": 14,
   "circle": "white",
   "centre": [
    2949,
    2259
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 3025,
     "y": 2335
    },
    {
     "id": "1",
     "type": "1",
     "x": 2917,
     "y": 2348
    },
    {
     "id": "2",
     "type": "2",
     "x": 2903,
     "y": 2241
    },
    {
     "id": "2'",
     "type": "2",
     "x": 3010,
     "y": 2227
    },
    {
     "id": "R",
     "type": "R",
     "x": 2888,
     "y": 2143
    }
   ],
   "egress": [
    37,
    38
   ],
   "adjacent": [
    18,
    37
   ],
   "neighbouring": [
    17,
    19,
    38
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "2",
     "2'"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 29,
   "row": "C",
   "block": 15,
   "circle": "white",
   "centre": [
    3374,
    2209
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 3464,
     "y": 2276
    },
    {
     "id": "1",
     "type": "1",
     "x": 3359,
     "y": 2290
    },
    {
     "id": "2",
     "type": "2",
     "x": 3344,
     "y": 2185
    },
    {
     "id": "R",
     "type": "R",
     "x": 3330,
     "y": 2086
    }
   ],
   "egress": [
    38,
    37,
    39
   ],
   "adjacent": [
    19,
    38
   ],
   "neighbouring": [
    18,
    20,
    21,
    37,
    39,
    40
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 30,
   "row": "C",
   "block": 16,
   "circle": "white",
   "centre": [
    3708,
    2165
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 3799,
     "y": 2233
    },
    {
     "id": "1",
     "type": "1",
     "x": 3692,
     "y": 2246
    },
    {
     "id": "2",
     "type": "2",
     "x": 3679,
     "y": 2141
    },
    {
     "id": "R",
     "type": "R",
     "x": 3661,
     "y": 2041
    }
   ],
   "egress": [
    39,
    38,
    40
   ],
   "adjacent": [
    20,
    39
   ],
   "neighbouring": [
    19,
    21,
    22,
    38,
    40,
    41
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 31,
   "row": "C",
   "block": 17,
   "circle": "white",
   "centre": [
    4042,
    2110
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 4132,
     "y": 2176
    },
    {
     "id": "1",
     "type": "1",
     "x": 4027,
     "y": 2191
    },
    {
     "id": "2",
     "type": "2",
     "x": 4012,
     "y": 2085
    },
    {
     "id": "R",
     "type": "R",
     "x": 3995,
     "y": 1986
    }
   ],
   "egress": [
    40,
    39,
    41
   ],
   "adjacent": [
    21,
    40
   ],
   "neighbouring": [
    19,
    20,
    22,
    38,
    39,
    41
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 32,
   "row": "C",
   "block": 18,
   "circle": "white",
   "centre": [
    4373,
    2066
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 4450,
     "y": 2138
    },
    {
     "id": "1",
     "type": "1",
     "x": 4341,
     "y": 2153
    },
    {
     "id": "2",
     "type": "2",
     "x": 4327,
     "y": 2050
    },
    {
     "id": "2'",
     "type": "2",
     "x": 4436,
     "y": 2038
    },
    {
     "id": "R",
     "type": "R",
     "x": 4312,
     "y": 1949
    }
   ],
   "egress": [
    41,
    40
   ],
   "adjacent": [
    22,
    41
   ],
   "neighbouring": [
    20,
    21,
    39,
    40
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "2",
     "2'"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 33,
   "row": "D",
   "block": 3,
   "circle": "white",
   "centre": [
    796,
    2137
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 882,
     "y": 2209
    },
    {
     "id": "1",
     "type": "1",
     "x": 776,
     "y": 2217
    },
    {
     "id": "2",
     "type": "2",
     "x": 769,
     "y": 2111
    },
    {
     "id": "R",
     "type": "R",
     "x": 757,
     "y": 2011
    }
   ],
   "egress": [
    42,
    43
   ],
   "adjacent": [],
   "neighbouring": [
    23,
    24,
    42,
    43
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 34,
   "row": "D",
   "block": 7,
   "circle": "white",
   "centre": [
    1160,
    2106
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 1232,
     "y": 2183
    },
    {
     "id": "1",
     "type": "1",
     "x": 1128,
     "y": 2196
    },
    {
     "id": "2",
     "type": "2",
     "x": 1115,
     "y": 2088
    },
    {
     "id": "2'",
     "type": "2",
     "x": 1223,
     "y": 2074
    },
    {
     "id": "R",
     "type": "R",
     "x": 1102,
     "y": 1988
    }
   ],
   "egress": [
    43,
    42,
    44
   ],
   "adjacent": [
    35
   ],
   "neighbouring": [
    23,
    24,
    25,
    42,
    43,
    44
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "2",
     "2'"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 35,
   "row": "D",
   "block": 7,
   "circle": "white",
   "centre": [
    1508,
    2072
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 1581,
     "y": 2150
    },
    {
     "id": "1",
     "type": "1",
     "x": 1475,
     "y": 2161
    },
    {
     "id": "2",
     "type": "2",
     "x": 1461,
     "y": 2051
    },
    {
     "id": "2'",
     "type": "2",
     "x": 1571,
     "y": 2044
    },
    {
     "id": "R",
     "type": "R",
     "x": 1453,
     "y": 1953
    }
   ],
   "egress": [
    44,
    43,
    45
   ],
   "adjacent": [
    34
   ],
   "neighbouring": [
    24,
    25,
    26,
    43,
    44,
    45
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "2",
     "2'"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 36,
   "row": "D",
   "block": 20,
   "circle": "white",
   "centre": [
    2098,
    2024
   ],
   "locations": [
    {
     "id": "OG",
     "type": "OG",
     "x": 2232,
     "y": 2082
    },
    {
     "id": "1",
     "type": "1",
     "x": 2123,
     "y": 2091
    },
    {
     "id": "1'",
     "type": "1",
     "x": 2016,
     "y": 2103
    },
    {
     "id": "2",
     "type": "2",
     "x": 2110,
     "y": 1984
    },
    {
     "id": "2'",
     "type": "2",
     "x": 2007,
     "y": 1999
    },
    {
     "id": "R",
     "type": "R",
     "x": 2102,
     "y": 1886
    }
   ],
   "egress": [
    45,
    46,
    44
   ],
   "adjacent": [],
   "neighbouring": [
    25,
    26,
    44,
    45,
    46
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "1",
     "1'"
    ],
    [
     "2",
     "2'"
    ],
    [
     "1'",
     "2'"
    ],
    [
     "1",
     "OG"
    ]
   ]
  },
  {
   "id": 37,
   "row": "D",
   "block": 14,
   "circle": "white",
   "centre": [
    2900,
    1910
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 2975,
     "y": 1984
    },
    {
     "id": "1",
     "type": "1",
     "x": 2871,
     "y": 2001
    },
    {
     "id": "2",
     "type": "2",
     "x": 2853,
     "y": 1892
    },
    {
     "id": "2'",
     "type": "2",
     "x": 2960,
     "y": 1878
    },
    {
     "id": "R",
     "type": "R",
     "x": 2840,
     "y": 1793
    }
   ],
   "egress": [
    47,
    46,
    48
   ],
   "adjacent": [
    28
   ],
   "neighbouring": [
    29,
    46,
    47,
    48,
    49
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "2",
     "2'"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 38,
   "row": "D",
   "block": 15,
   "circle": "white",
   "centre": [
    3312,
    1856
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 3402,
     "y": 1922
    },
    {
     "id": "1",
     "type": "1",
     "x": 3296,
     "y": 1936
    },
    {
     "id": "2",
     "type": "2",
     "x": 3282,
     "y": 1832
    },
    {
     "id": "R",
     "type": "R",
     "x": 3266,
     "y": 1733
    }
   ],
   "egress": [
    48,
    47,
    49
   ],
   "adjacent": [
    29
   ],
   "neighbouring": [
    28,
    30,
    31,
    47,
    48,
    49
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 39,
   "row": "D",
   "block": 16,
   "circle": "white",
   "centre": [
    3646,
    1812
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 3738,
     "y": 1879
    },
    {
     "id": "1",
     "type": "1",
     "x": 3631,
     "y": 1892
    },
    {
     "id": "2",
     "type": "2",
     "x": 3616,
     "y": 1787
    },
    {
     "id": "R",
     "type": "R",
     "x": 3600,
     "y": 1688
    }
   ],
   "egress": [
    49,
    48,
    50
   ],
   "adjacent": [
    30
   ],
   "neighbouring": [
    29,
    31,
    32,
    48,
    49,
    50
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 40,
   "row": "D",
   "block": 17,
   "circle": "white",
   "centre": [
    3979,
    1758
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 4069,
     "y": 1825
    },
    {
     "id": "1",
     "type": "1",
     "x": 3964,
     "y": 1842
    },
    {
     "id": "2",
     "type": "2",
     "x": 3948,
     "y": 1730
    },
    {
     "id": "R",
     "type": "R",
     "x": 3934,
     "y": 1634
    }
   ],
   "egress": [
    50,
    49,
    51
   ],
   "adjacent": [
    31
   ],
   "neighbouring": [
    29,
    30,
    32,
    49,
    50,
    51
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 41,
   "row": "D",
   "block": 18,
   "circle": "white",
   "centre": [
    4324,
    1711
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 4398,
     "y": 1787
    },
    {
     "id": "1",
     "type": "1",
     "x": 4293,
     "y": 1799
    },
    {
     "id": "2",
     "type": "2",
     "x": 4279,
     "y": 1694
    },
    {
     "id": "2'",
     "type": "2",
     "x": 4385,
     "y": 1678
    },
    {
     "id": "R",
     "type": "R",
     "x": 4263,
     "y": 1595
    }
   ],
   "egress": [
    51,
    50
   ],
   "adjacent": [
    32
   ],
   "neighbouring": [
    30,
    31,
    50,
    51
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "2",
     "2'"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 42,
   "row": "E",
   "block": 21,
   "circle": "white",
   "centre": [
    780,
    1720
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 852,
     "y": 1795
    },
    {
     "id": "1",
     "type": "1",
     "x": 746,
     "y": 1805
    },
    {
     "id": "2",
     "type": "2",
     "x": 734,
     "y": 1703
    },
    {
     "id": "2'",
     "type": "2",
     "x": 842,
     "y": 1691
    },
    {
     "id": "R",
     "type": "R",
     "x": 724,
     "y": 1605
    }
   ],
   "egress": [
    52,
    53
   ],
   "adjacent": [
    43
   ],
   "neighbouring": [
    33,
    34,
    52,
    53
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "2",
     "2'"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 43,
   "row": "E",
   "block": 21,
   "circle": "white",
   "centre": [
    1137,
    1683
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 1207,
     "y": 1757
    },
    {
     "id": "1",
     "type": "1",
     "x": 1102,
     "y": 1772
    },
    {
     "id": "2",
     "type": "2",
     "x": 1092,
     "y": 1664
    },
    {
     "id": "2'",
     "type": "2",
     "x": 1201,
     "y": 1654
    },
    {
     "id": "R",
     "type": "R",
     "x": 1084,
     "y": 1568
    }
   ],
   "egress": [
    53,
    52,
    54
   ],
   "adjacent": [
    42,
    44
   ],
   "neighbouring": [
    33,
    34,
    35,
    52,
    53,
    54
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "2",
     "2'"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 44,
   "row": "E",
   "block": 21,
   "circle": "white",
   "centre": [
    1482,
    1650
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 1557,
     "y": 1727
    },
    {
     "id": "1",
     "type": "1",
     "x": 1448,
     "y": 1738
    },
    {
     "id": "2",
     "type": "2",
     "x": 1437,
     "y": 1631
    },
    {
     "id": "2'",
     "type": "2",
     "x": 1544,
     "y": 1622
    },
    {
     "id": "R",
     "type": "R",
     "x": 1425,
     "y": 1530
    }
   ],
   "egress": [
    54,
    53,
    55
   ],
   "adjacent": [
    43
   ],
   "neighbouring": [
    34,
    35,
    36,
    53,
    54,
    55
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "2",
     "2'"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 45,
   "row": "E",
   "block": 22,
   "circle": "white",
   "centre": [
    1887,
    1595
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 1962,
     "y": 1674
    },
    {
     "id": "1",
     "type": "1",
     "x": 1852,
     "y": 1684
    },
    {
     "id": "2",
     "type": "2",
     "x": 1840,
     "y": 1578
    },
    {
     "id": "2'",
     "type": "2",
     "x": 1948,
     "y": 1564
    },
    {
     "id": "R",
     "type": "R",
     "x": 1831,
     "y": 1475
    }
   ],
   "egress": [
    55,
    54,
    56
   ],
   "adjacent": [
    46
   ],
   "neighbouring": [
    35,
    36,
    54,
    55,
    56
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "2",
     "2'"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 46,
   "row": "E",
   "block": 22,
   "circle": "white",
   "centre": [
    2291,
    1555
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 2365,
     "y": 1634
    },
    {
     "id": "1",
     "type": "1",
     "x": 2260,
     "y": 1642
    },
    {
     "id": "2",
     "type": "2",
     "x": 2245,
     "y": 1536
    },
    {
     "id": "2'",
     "type": "2",
     "x": 2354,
     "y": 1524
    },
    {
     "id": "R",
     "type": "R",
     "x": 2232,
     "y": 1439
    }
   ],
   "egress": [
    56,
    55,
    57
   ],
   "adjacent": [
    45
   ],
   "neighbouring": [
    36,
    37,
    55,
    56,
    57
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "2",
     "2'"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 47,
   "row": "E",
   "block": 23,
   "circle": "white",
   "centre": [
    2789,
    1511
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 2864,
     "y": 1586
    },
    {
     "id": "1",
     "type": "1",
     "x": 2761,
     "y": 1601
    },
    {
     "id": "2",
     "type": "2",
     "x": 2744,
     "y": 1493
    },
    {
     "id": "2'",
     "type": "2",
     "x": 2849,
     "y": 1478
    },
    {
     "id": "R",
     "type": "R",
     "x": 2726,
     "y": 1396
    }
   ],
   "egress": [
    57,
    56,
    58
   ],
   "adjacent": [
    48
   ],
   "neighbouring": [
    37,
    38,
    56,
    57,
    58
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "2",
     "2'"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 48,
   "row": "E",
   "block": 23,
   "circle": "white",
   "centre": [
    3185,
    1464
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 3258,
     "y": 1538
    },
    {
     "id": "1",
     "type": "1",
     "x": 3153,
     "y": 1556
    },
    {
     "id": "2",
     "type": "2",
     "x": 3139,
     "y": 1443
    },
    {
     "id": "2'",
     "type": "2",
     "x": 3247,
     "y": 1434
    },
    {
     "id": "R",
     "type": "R",
     "x": 3130,
     "y": 1347
    }
   ],
   "egress": [
    58,
    57,
    59
   ],
   "adjacent": [
    47,
    49
   ],
   "neighbouring": [
    37,
    38,
    39,
    57,
    58,
    59
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "2",
     "2'"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 49,
   "row": "E",
   "block": 23,
   "circle": "white",
   "centre": [
    3500,
    1418
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 3573,
     "y": 1495
    },
    {
     "id": "1",
     "type": "1",
     "x": 3469,
     "y": 1504
    },
    {
     "id": "2",
     "type": "2",
     "x": 3459,
     "y": 1399
    },
    {
     "id": "2'",
     "type": "2",
     "x": 3559,
     "y": 1387
    },
    {
     "id": "R",
     "type": "R",
     "x": 3440,
     "y": 1304
    }
   ],
   "egress": [
    59,
    58,
    60
   ],
   "adjacent": [
    48
   ],
   "neighbouring": [
    37,
    38,
    39,
    40,
    58,
    59,
    60
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "2",
     "2'"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 50,
   "row": "E",
   "block": 24,
   "circle": "white",
   "centre": [
    3915,
    1283
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 3910,
     "y": 1448
    },
    {
     "id": "1",
     "type": "1",
     "x": 3888,
     "y": 1342
    },
    {
     "id": "1'",
     "type": "1",
     "x": 3997,
     "y": 1322
    },
    {
     "id": "2",
     "type": "2",
     "x": 3871,
     "y": 1237
    },
    {
     "id": "2'",
     "type": "2",
     "x": 3974,
     "y": 1216
    },
    {
     "id": "R",
     "type": "R",
     "x": 3850,
     "y": 1135
    }
   ],
   "egress": [
    60,
    59,
    61
   ],
   "adjacent": [
    51
   ],
   "neighbouring": [
    39,
    40,
    41,
    59,
    60,
    61
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "1",
     "1'"
    ],
    [
     "2",
     "2'"
    ],
    [
     "1'",
     "2'"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 51,
   "row": "E",
   "block": 24,
   "circle": "white",
   "centre": [
    4248,
    1230
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 4243,
     "y": 1394
    },
    {
     "id": "1",
     "type": "1",
     "x": 4222,
     "y": 1289
    },
    {
     "id": "1'",
     "type": "1",
     "x": 4330,
     "y": 1271
    },
    {
     "id": "2",
     "type": "2",
     "x": 4203,
     "y": 1182
    },
    {
     "id": "2'",
     "type": "2",
     "x": 4308,
     "y": 1164
    },
    {
     "id": "R",
     "type": "R",
     "x": 4185,
     "y": 1082
    }
   ],
   "egress": [
    61,
    60
   ],
   "adjacent": [
    50
   ],
   "neighbouring": [
    40,
    41,
    60,
    61
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "1",
     "1'"
    ],
    [
     "2",
     "2'"
    ],
    [
     "1'",
     "2'"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 52,
   "row": "F",
   "block": 25,
   "circle": "white",
   "centre": [
    733,
    1181
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 715,
     "y": 1343
    },
    {
     "id": "1",
     "type": "1",
     "x": 703,
     "y": 1239
    },
    {
     "id": "1'",
     "type": "1",
     "x": 807,
     "y": 1226
    },
    {
     "id": "2",
     "type": "2",
     "x": 693,
     "y": 1130
    },
    {
     "id": "2'",
     "type": "2",
     "x": 799,
     "y": 1118
    },
    {
     "id": "R",
     "type": "R",
     "x": 682,
     "y": 1029
    }
   ],
   "egress": [
    "EXIT"
   ],
   "adjacent": [
    53
   ],
   "neighbouring": [
    42,
    43
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "1",
     "1'"
    ],
    [
     "2",
     "2'"
    ],
    [
     "1'",
     "2'"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 53,
   "row": "F",
   "block": 25,
   "circle": "white",
   "centre": [
    1076,
    1148
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 1057,
     "y": 1312
    },
    {
     "id": "1",
     "type": "1",
     "x": 1045,
     "y": 1205
    },
    {
     "id": "1'",
     "type": "1",
     "x": 1152,
     "y": 1193
    },
    {
     "id": "2",
     "type": "2",
     "x": 1036,
     "y": 1095
    },
    {
     "id": "2'",
     "type": "2",
     "x": 1140,
     "y": 1088
    },
    {
     "id": "R",
     "type": "R",
     "x": 1024,
     "y": 998
    }
   ],
   "egress": [
    "EXIT"
   ],
   "adjacent": [
    52,
    54
   ],
   "neighbouring": [
    42,
    43,
    44
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "1",
     "1'"
    ],
    [
     "2",
     "2'"
    ],
    [
     "1'",
     "2'"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 54,
   "row": "F",
   "block": 25,
   "circle": "white",
   "centre": [
    1421,
    1126
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 1402,
     "y": 1287
    },
    {
     "id": "1",
     "type": "1",
     "x": 1392,
     "y": 1183
    },
    {
     "id": "1'",
     "type": "1",
     "x": 1498,
     "y": 1172
    },
    {
     "id": "2",
     "type": "2",
     "x": 1380,
     "y": 1073
    },
    {
     "id": "2'",
     "type": "2",
     "x": 1485,
     "y": 1065
    },
    {
     "id": "R",
     "type": "R",
     "x": 1367,
     "y": 979
    }
   ],
   "egress": [
    "EXIT"
   ],
   "adjacent": [
    53
   ],
   "neighbouring": [
    43,
    44,
    45
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "1",
     "1'"
    ],
    [
     "2",
     "2'"
    ],
    [
     "1'",
     "2'"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 55,
   "row": "F",
   "block": 26,
   "circle": "white",
   "centre": [
    1819,
    1075
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 1799,
     "y": 1235
    },
    {
     "id": "1",
     "type": "1",
     "x": 1791,
     "y": 1135
    },
    {
     "id": "1'",
     "type": "1",
     "x": 1895,
     "y": 1118
    },
    {
     "id": "2",
     "type": "2",
     "x": 1781,
     "y": 1022
    },
    {
     "id": "2'",
     "type": "2",
     "x": 1884,
     "y": 1014
    },
    {
     "id": "R",
     "type": "R",
     "x": 1765,
     "y": 925
    }
   ],
   "egress": [
    "EXIT"
   ],
   "adjacent": [
    56
   ],
   "neighbouring": [
    44,
    45,
    46
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "1",
     "1'"
    ],
    [
     "2",
     "2'"
    ],
    [
     "1'",
     "2'"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 56,
   "row": "F",
   "block": 26,
   "circle": "white",
   "centre": [
    2222,
    1039
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 2204,
     "y": 1202
    },
    {
     "id": "1",
     "type": "1",
     "x": 2192,
     "y": 1094
    },
    {
     "id": "1'",
     "type": "1",
     "x": 2300,
     "y": 1084
    },
    {
     "id": "2",
     "type": "2",
     "x": 2181,
     "y": 989
    },
    {
     "id": "2'",
     "type": "2",
     "x": 2286,
     "y": 977
    },
    {
     "id": "R",
     "type": "R",
     "x": 2169,
     "y": 888
    }
   ],
   "egress": [
    "EXIT"
   ],
   "adjacent": [
    55
   ],
   "neighbouring": [
    45,
    46,
    47
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "1",
     "1'"
    ],
    [
     "2",
     "2'"
    ],
    [
     "1'",
     "2'"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 57,
   "row": "F",
   "block": 27,
   "circle": "white",
   "centre": [
    2743,
    983
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 2726,
     "y": 1145
    },
    {
     "id": "1",
     "type": "1",
     "x": 2716,
     "y": 1040
    },
    {
     "id": "1'",
     "type": "1",
     "x": 2819,
     "y": 1029
    },
    {
     "id": "2",
     "type": "2",
     "x": 2702,
     "y": 932
    },
    {
     "id": "2'",
     "type": "2",
     "x": 2810,
     "y": 920
    },
    {
     "id": "R",
     "type": "R",
     "x": 2687,
     "y": 833
    }
   ],
   "egress": [
    "EXIT"
   ],
   "adjacent": [
    58
   ],
   "neighbouring": [
    46,
    47,
    48
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "1",
     "1'"
    ],
    [
     "2",
     "2'"
    ],
    [
     "1'",
     "2'"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 58,
   "row": "F",
   "block": 27,
   "circle": "white",
   "centre": [
    3085,
    938
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 3078,
     "y": 1101
    },
    {
     "id": "1",
     "type": "1",
     "x": 3059,
     "y": 996
    },
    {
     "id": "1'",
     "type": "1",
     "x": 3163,
     "y": 980
    },
    {
     "id": "2",
     "type": "2",
     "x": 3041,
     "y": 890
    },
    {
     "id": "2'",
     "type": "2",
     "x": 3148,
     "y": 869
    },
    {
     "id": "R",
     "type": "R",
     "x": 3023,
     "y": 790
    }
   ],
   "egress": [
    "EXIT"
   ],
   "adjacent": [
    57,
    59
   ],
   "neighbouring": [
    47,
    48,
    49
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "1",
     "1'"
    ],
    [
     "2",
     "2'"
    ],
    [
     "1'",
     "2'"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 59,
   "row": "F",
   "block": 27,
   "circle": "white",
   "centre": [
    3374,
    877
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 3382,
     "y": 1042
    },
    {
     "id": "1",
     "type": "1",
     "x": 3353,
     "y": 938
    },
    {
     "id": "1'",
     "type": "1",
     "x": 3460,
     "y": 907
    },
    {
     "id": "2",
     "type": "2",
     "x": 3326,
     "y": 833
    },
    {
     "id": "2'",
     "type": "2",
     "x": 3426,
     "y": 806
    },
    {
     "id": "R",
     "type": "R",
     "x": 3298,
     "y": 736
    }
   ],
   "egress": [
    "EXIT"
   ],
   "adjacent": [
    58
   ],
   "neighbouring": [
    48,
    49,
    50
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "1",
     "1'"
    ],
    [
     "2",
     "2'"
    ],
    [
     "1'",
     "2'"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 60,
   "row": "F",
   "block": 28,
   "circle": "white",
   "centre": [
    3818,
    808
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 3905,
     "y": 871
    },
    {
     "id": "1",
     "type": "1",
     "x": 3802,
     "y": 902
    },
    {
     "id": "2",
     "type": "2",
     "x": 3767,
     "y": 800
    },
    {
     "id": "2'",
     "type": "2",
     "x": 3874,
     "y": 764
    },
    {
     "id": "R",
     "type": "R",
     "x": 3742,
     "y": 703
    }
   ],
   "egress": [
    "EXIT"
   ],
   "adjacent": [
    61
   ],
   "neighbouring": [
    49,
    50,
    51
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "2",
     "2'"
    ],
    [
     "1",
     "C"
    ]
   ]
  },
  {
   "id": 61,
   "row": "F",
   "block": 28,
   "circle": "white",
   "centre": [
    4164,
    704
   ],
   "locations": [
    {
     "id": "C",
     "type": "C",
     "x": 4249,
     "y": 767
    },
    {
     "id": "1",
     "type": "1",
     "x": 4150,
     "y": 794
    },
    {
     "id": "2",
     "type": "2",
     "x": 4116,
     "y": 697
    },
    {
     "id": "2'",
     "type": "2",
     "x": 4218,
     "y": 665
    },
    {
     "id": "R",
     "type": "R",
     "x": 4088,
     "y": 599
    }
   ],
   "egress": [
    "EXIT"
   ],
   "adjacent": [
    60
   ],
   "neighbouring": [
    50,
    51
   ],
   "locationLinks": [
    [
     "1",
     "2"
    ],
    [
     "2",
     "R"
    ],
    [
     "2",
     "2'"
    ],
    [
     "1",
     "C"
    ]
   ]
  }
 ],
 "streets": [
  {
   "id": 1,
   "polygon": [
    [
     738,
     3231
    ],
    [
     766,
     3230
    ],
    [
     781,
     3486
    ],
    [
     941,
     3475
    ],
    [
     942,
     3499
    ],
    [
     761,
     3517
    ]
   ],
   "centre": [
    822,
    3406
   ],
   "adjacentZones": [
    1,
    2,
    13
   ]
  },
  {
   "id": 2,
   "polygon": [
    [
     1087,
     3460
    ],
    [
     1069,
     3236
    ],
    [
     1124,
     3231
    ],
    [
     1138,
     3452
    ],
    [
     1397,
     3426
    ],
    [
     1398,
     3447
    ],
    [
     943,
     3499
    ],
    [
     939,
     3472
    ]
   ],
   "centre": [
    1137,
    3403
   ],
   "adjacentZones": [
    1,
    2,
    3,
    13,
    14
   ]
  },
  {
   "id": 3,
   "polygon": [
    [
     1397,
     3425
    ],
    [
     1799,
     3381
    ],
    [
     1800,
     3409
    ],
    [
     1398,
     3448
    ]
   ],
   "centre": [
    1598,
    3416
   ],
   "adjacentZones": [
    2,
    3,
    4,
    14
   ]
  },
  {
   "id": 4,
   "polygon": [
    [
     1799,
     3378
    ],
    [
     2183,
     3337
    ],
    [
     2188,
     3368
    ],
    [
     1802,
     3409
    ]
   ],
   "centre": [
    1993,
    3373
   ],
   "adjacentZones": [
    3,
    4,
    5,
    15,
    16
   ]
  },
  {
   "id": 5,
   "polygon": [
    [
     2184,
     3335
    ],
    [
     2392,
     3315
    ],
    [
     2370,
     3113
    ],
    [
     2421,
     3108
    ],
    [
     2443,
     3312
    ],
    [
     2640,
     3294
    ],
    [
     2642,
     3321
    ],
    [
     2189,
     3366
    ]
   ],
   "centre": [
    2410,
    3270
   ],
   "adjacentZones": [
    4,
    5,
    16,
    17
   ]
  },
  {
   "id": 6,
   "polygon": [
    [
     2641,
     3289
    ],
    [
     2814,
     3278
    ],
    [
     2791,
     2989
    ],
    [
     2859,
     2984
    ],
    [
     2874,
     3126
    ],
    [
     3131,
     3158
    ],
    [
     3130,
     3191
    ],
    [
     2842,
     3156
    ],
    [
     2853,
     3296
    ],
    [
     2646,
     3321
    ]
   ],
   "centre": [
    2858,
    3179
   ],
   "adjacentZones": [
    5,
    6,
    7,
    17,
    18
   ]
  },
  {
   "id": 7,
   "polygon": [
    [
     3134,
     3161
    ],
    [
     3481,
     3202
    ],
    [
     3481,
     3233
    ],
    [
     3132,
     3190
    ]
   ],
   "centre": [
    3307,
    3196
   ],
   "adjacentZones": [
    6,
    7,
    10,
    19
   ]
  },
  {
   "id": 8,
   "polygon": [
    [
     3487,
     3200
    ],
    [
     3697,
     3222
    ],
    [
     3685,
     3144
    ],
    [
     3728,
     3141
    ],
    [
     3729,
     3234
    ],
    [
     4054,
     3261
    ],
    [
     4052,
     3290
    ],
    [
     3488,
     3237
    ]
   ],
   "centre": [
    3740,
    3216
   ],
   "adjacentZones": [
    7,
    8,
    10,
    11
   ]
  },
  {
   "id": 9,
   "polygon": [
    [
     4056,
     3265
    ],
    [
     4596,
     3307
    ],
    [
     4594,
     3340
    ],
    [
     4053,
     3292
    ]
   ],
   "centre": [
    4325,
    3301
   ],
   "adjacentZones": [
    8,
    9,
    11,
    12
   ]
  },
  {
   "id": 10,
   "polygon": [
    [
     4597,
     3309
    ],
    [
     4799,
     3322
    ],
    [
     4763,
     3091
    ],
    [
     4795,
     3089
    ],
    [
     4832,
     3359
    ],
    [
     4597,
     3339
    ]
   ],
   "centre": [
    4730,
    3252
   ],
   "adjacentZones": [
    8,
    9,
    12
   ]
  },
  {
   "id": 11,
   "polygon": [
    [
     3651,
     2895
    ],
    [
     3706,
     2890
    ],
    [
     3719,
     3027
    ],
    [
     3896,
     3005
    ],
    [
     3900,
     3033
    ],
    [
     3722,
     3051
    ],
    [
     3728,
     3142
    ],
    [
     3685,
     3144
    ]
   ],
   "centre": [
    3751,
    3023
   ],
   "adjacentZones": [
    7,
    8,
    10,
    11,
    19,
    20
   ]
  },
  {
   "id": 12,
   "polygon": [
    [
     3902,
     3032
    ],
    [
     4178,
     3002
    ],
    [
     4174,
     2969
    ],
    [
     3897,
     3004
    ]
   ],
   "centre": [
    4038,
    3002
   ],
   "adjacentZones": [
    7,
    8,
    9,
    10,
    11,
    12,
    20,
    21
   ]
  },
  {
   "id": 13,
   "polygon": [
    [
     4186,
     2998
    ],
    [
     4536,
     2961
    ],
    [
     4532,
     2920
    ],
    [
     4180,
     2969
    ]
   ],
   "centre": [
    4358,
    2962
   ],
   "adjacentZones": [
    8,
    9,
    10,
    11,
    12,
    21,
    22
   ]
  },
  {
   "id": 14,
   "polygon": [
    [
     4796,
     3083
    ],
    [
     4763,
     3089
    ],
    [
     4740,
     2936
    ],
    [
     4539,
     2956
    ],
    [
     4532,
     2925
    ],
    [
     4733,
     2900
    ],
    [
     4709,
     2756
    ],
    [
     4751,
     2747
    ]
   ],
   "centre": [
    4695,
    2924
   ],
   "adjacentZones": [
    8,
    9,
    11,
    12,
    22
   ]
  },
  {
   "id": 15,
   "polygon": [
    [
     713,
     2916
    ],
    [
     750,
     2913
    ],
    [
     767,
     3226
    ],
    [
     738,
     3228
    ]
   ],
   "centre": [
    742,
    3071
   ],
   "adjacentZones": [
    1,
    2,
    13,
    23
   ]
  },
  {
   "id": 16,
   "polygon": [
    [
     1045,
     2867
    ],
    [
     1093,
     2861
    ],
    [
     1102,
     3016
    ],
    [
     1351,
     2990
    ],
    [
     1357,
     3037
    ],
    [
     1107,
     3064
    ],
    [
     1119,
     3232
    ],
    [
     1070,
     3239
    ]
   ],
   "centre": [
    1156,
    3038
   ],
   "adjacentZones": [
    1,
    2,
    3,
    13,
    14,
    23,
    24
   ]
  },
  {
   "id": 17,
   "polygon": [
    [
     1358,
     3041
    ],
    [
     1759,
     2996
    ],
    [
     1753,
     2943
    ],
    [
     1350,
     2987
    ]
   ],
   "centre": [
    1555,
    2992
   ],
   "adjacentZones": [
    2,
    3,
    4,
    14,
    15,
    24,
    25
   ]
  },
  {
   "id": 18,
   "polygon": [
    [
     1761,
     2997
    ],
    [
     2162,
     2952
    ],
    [
     2156,
     2899
    ],
    [
     1753,
     2943
    ]
   ],
   "centre": [
    1958,
    2948
   ],
   "adjacentZones": [
    3,
    4,
    5,
    14,
    15,
    16,
    17,
    25,
    26
   ]
  },
  {
   "id": 19,
   "polygon": [
    [
     2165,
     2951
    ],
    [
     2344,
     2931
    ],
    [
     2367,
     3109
    ],
    [
     2420,
     3102
    ],
    [
     2386,
     2718
    ],
    [
     2324,
     2726
    ],
    [
     2338,
     2880
    ],
    [
     2157,
     2897
    ]
   ],
   "centre": [
    2313,
    2914
   ],
   "adjacentZones": [
    4,
    5,
    15,
    16,
    17,
    26
   ]
  },
  {
   "id": 20,
   "polygon": [
    [
     2786,
     2990
    ],
    [
     2854,
     2983
    ],
    [
     2839,
     2852
    ],
    [
     3085,
     2819
    ],
    [
     3075,
     2766
    ],
    [
     2831,
     2793
    ],
    [
     2811,
     2647
    ],
    [
     2742,
     2652
    ]
   ],
   "centre": [
    2878,
    2813
   ],
   "adjacentZones": [
    5,
    6,
    7,
    17,
    18,
    19,
    28
   ]
  },
  {
   "id": 21,
   "polygon": [
    [
     3290,
     2732
    ],
    [
     3080,
     2763
    ],
    [
     3089,
     2819
    ],
    [
     3498,
     2760
    ],
    [
     3488,
     2707
    ],
    [
     3341,
     2726
    ],
    [
     3314,
     2540
    ],
    [
     3264,
     2545
    ]
   ],
   "centre": [
    3296,
    2699
   ],
   "adjacentZones": [
    6,
    7,
    10,
    18,
    19,
    20,
    28,
    29
   ]
  },
  {
   "id": 22,
   "polygon": [
    [
     3626,
     2683
    ],
    [
     3486,
     2703
    ],
    [
     3497,
     2762
    ],
    [
     3635,
     2742
    ],
    [
     3653,
     2891
    ],
    [
     3708,
     2883
    ],
    [
     3691,
     2733
    ],
    [
     3839,
     2713
    ],
    [
     3829,
     2660
    ],
    [
     3678,
     2675
    ],
    [
     3650,
     2503
    ],
    [
     3600,
     2509
    ]
   ],
   "centre": [
    3658,
    2705
   ],
   "adjacentZones": [
    7,
    10,
    11,
    19,
    20,
    21,
    29,
    30
   ]
  },
  {
   "id": 23,
   "polygon": [
    [
     3955,
     2643
    ],
    [
     3827,
     2656
    ],
    [
     3838,
     2717
    ],
    [
     4163,
     2671
    ],
    [
     4153,
     2618
    ],
    [
     4006,
     2637
    ],
    [
     3979,
     2443
    ],
    [
     3927,
     2452
    ]
   ],
   "centre": [
    3981,
    2605
   ],
   "adjacentZones": [
    8,
    10,
    11,
    12,
    19,
    20,
    21,
    22,
    30,
    31
   ]
  },
  {
   "id": 24,
   "polygon": [
    [
     4296,
     2600
    ],
    [
     4155,
     2617
    ],
    [
     4163,
     2674
    ],
    [
     4514,
     2626
    ],
    [
     4504,
     2573
    ],
    [
     4336,
     2595
    ],
    [
     4308,
     2414
    ],
    [
     4268,
     2420
    ]
   ],
   "centre": [
    4318,
    2565
   ],
   "adjacentZones": [
    8,
    9,
    10,
    11,
    12,
    20,
    21,
    22,
    31,
    32
   ]
  },
  {
   "id": 25,
   "polygon": [
    [
     4513,
     2629
    ],
    [
     4686,
     2607
    ],
    [
     4708,
     2750
    ],
    [
     4747,
     2746
    ],
    [
     4689,
     2345
    ],
    [
     4647,
     2352
    ],
    [
     4672,
     2549
    ],
    [
     4498,
     2567
    ]
   ],
   "centre": [
    4645,
    2568
   ],
   "adjacentZones": [
    9,
    11,
    12,
    21,
    22,
    32
   ]
  },
  {
   "id": 26,
   "polygon": [
    [
     674,
     2462
    ],
    [
     715,
     2459
    ],
    [
     735,
     2680
    ],
    [
     886,
     2672
    ],
    [
     889,
     2716
    ],
    [
     741,
     2728
    ],
    [
     750,
     2915
    ],
    [
     713,
     2917
    ]
   ],
   "centre": [
    763,
    2694
   ],
   "adjacentZones": [
    1,
    13,
    14,
    23,
    24,
    33
   ]
  },
  {
   "id": 27,
   "polygon": [
    [
     1018,
     2494
    ],
    [
     1066,
     2488
    ],
    [
     1079,
     2649
    ],
    [
     1277,
     2632
    ],
    [
     1280,
     2677
    ],
    [
     1081,
     2700
    ],
    [
     1093,
     2856
    ],
    [
     1040,
     2861
    ],
    [
     1030,
     2709
    ],
    [
     885,
     2717
    ],
    [
     880,
     2672
    ],
    [
     1025,
     2658
    ]
   ],
   "centre": [
    1063,
    2676
   ],
   "adjacentZones": [
    2,
    13,
    14,
    23,
    24,
    25,
    33,
    34
   ]
  },
  {
   "id": 28,
   "polygon": [
    [
     1281,
     2680
    ],
    [
     1621,
     2637
    ],
    [
     1619,
     2592
    ],
    [
     1274,
     2630
    ]
   ],
   "centre": [
    1449,
    2635
   ],
   "adjacentZones": [
    13,
    14,
    15,
    23,
    24,
    25,
    34,
    35
   ]
  },
  {
   "id": 29,
   "polygon": [
    [
     1626,
     2641
    ],
    [
     2114,
     2584
    ],
    [
     2110,
     2536
    ],
    [
     1869,
     2559
    ],
    [
     1853,
     2408
    ],
    [
     1801,
     2412
    ],
    [
     1810,
     2569
    ],
    [
     1619,
     2591
    ]
   ],
   "centre": [
    1850,
    2538
   ],
   "adjacentZones": [
    14,
    15,
    16,
    24,
    25,
    26,
    35,
    36
   ]
  },
  {
   "id": 30,
   "polygon": [
    [
     2072,
     2588
    ],
    [
     2306,
     2564
    ],
    [
     2325,
     2723
    ],
    [
     2381,
     2719
    ],
    [
     2366,
     2549
    ],
    [
     2560,
     2531
    ],
    [
     2553,
     2484
    ],
    [
     2431,
     2498
    ],
    [
     2403,
     2316
    ],
    [
     2340,
     2324
    ],
    [
     2361,
     2502
    ],
    [
     2065,
     2538
    ]
   ],
   "centre": [
    2347,
    2528
   ],
   "adjacentZones": [
    5,
    15,
    16,
    17,
    18,
    26,
    36
   ]
  },
  {
   "id": 31,
   "polygon": [
    [
     2677,
     2272
    ],
    [
     2768,
     2260
    ],
    [
     2813,
     2646
    ],
    [
     2741,
     2652
    ],
    [
     2717,
     2511
    ],
    [
     2554,
     2527
    ],
    [
     2549,
     2489
    ],
    [
     2702,
     2467
    ]
   ],
   "centre": [
    2690,
    2478
   ],
   "adjacentZones": [
    5,
    6,
    16,
    17,
    18,
    26,
    28,
    37
   ]
  },
  {
   "id": 32,
   "polygon": [
    [
     3214,
     2193
    ],
    [
     3263,
     2186
    ],
    [
     3314,
     2537
    ],
    [
     3263,
     2545
    ]
   ],
   "centre": [
    3264,
    2365
   ],
   "adjacentZones": [
    18,
    19,
    20,
    28,
    29,
    30,
    37,
    38
   ]
  },
  {
   "id": 33,
   "polygon": [
    [
     3542,
     2135
    ],
    [
     3591,
     2128
    ],
    [
     3648,
     2506
    ],
    [
     3595,
     2513
    ]
   ],
   "centre": [
    3594,
    2320
   ],
   "adjacentZones": [
    10,
    19,
    20,
    21,
    29,
    30,
    31,
    38,
    39
   ]
  },
  {
   "id": 34,
   "polygon": [
    [
     3877,
     2108
    ],
    [
     3926,
     2101
    ],
    [
     3977,
     2444
    ],
    [
     3928,
     2451
    ]
   ],
   "centre": [
    3927,
    2276
   ],
   "adjacentZones": [
    10,
    11,
    19,
    20,
    21,
    22,
    29,
    30,
    31,
    32,
    39,
    40
   ]
  },
  {
   "id": 35,
   "polygon": [
    [
     4218,
     2076
    ],
    [
     4258,
     2071
    ],
    [
     4305,
     2414
    ],
    [
     4268,
     2417
    ]
   ],
   "centre": [
    4262,
    2244
   ],
   "adjacentZones": [
    11,
    12,
    20,
    21,
    22,
    30,
    31,
    32,
    40,
    41
   ]
  },
  {
   "id": 36,
   "polygon": [
    [
     4598,
     2023
    ],
    [
     4641,
     2020
    ],
    [
     4692,
     2346
    ],
    [
     4644,
     2351
    ]
   ],
   "centre": [
    4644,
    2185
   ],
   "adjacentZones": [
    12,
    21,
    22,
    31,
    32,
    41
   ]
  },
  {
   "id": 37,
   "polygon": [
    [
     648,
     2100
    ],
    [
     688,
     2096
    ],
    [
     714,
     2459
    ],
    [
     675,
     2462
    ]
   ],
   "centre": [
    681,
    2279
   ],
   "adjacentZones": [
    23,
    24,
    33,
    34,
    42
   ]
  },
  {
   "id": 38,
   "polygon": [
    [
     987,
     2119
    ],
    [
     1040,
     2113
    ],
    [
     1054,
     2283
    ],
    [
     1248,
     2263
    ],
    [
     1253,
     2316
    ],
    [
     1058,
     2342
    ],
    [
     1068,
     2489
    ],
    [
     1014,
     2491
    ]
   ],
   "centre": [
    1090,
    2302
   ],
   "adjacentZones": [
    14,
    23,
    24,
    25,
    33,
    34,
    35,
    43
   ]
  },
  {
   "id": 39,
   "polygon": [
    [
     1249,
     2261
    ],
    [
     1593,
     2225
    ],
    [
     1599,
     2278
    ],
    [
     1253,
     2314
    ]
   ],
   "centre": [
    1424,
    2270
   ],
   "adjacentZones": [
    14,
    15,
    23,
    24,
    25,
    34,
    35,
    44
   ]
  },
  {
   "id": 40,
   "polygon": [
    [
     1592,
     2225
    ],
    [
     1771,
     2206
    ],
    [
     1756,
     2033
    ],
    [
     1809,
     2027
    ],
    [
     1826,
     2202
    ],
    [
     2075,
     2172
    ],
    [
     2081,
     2225
    ],
    [
     1834,
     2249
    ],
    [
     1848,
     2406
    ],
    [
     1802,
     2410
    ],
    [
     1781,
     2254
    ],
    [
     1598,
     2277
    ]
   ],
   "centre": [
    1814,
    2224
   ],
   "adjacentZones": [
    15,
    16,
    24,
    25,
    26,
    35,
    36,
    45
   ]
  },
  {
   "id": 41,
   "polygon": [
    [
     2073,
     2174
    ],
    [
     2319,
     2144
    ],
    [
     2296,
     1961
    ],
    [
     2360,
     1955
    ],
    [
     2405,
     2321
    ],
    [
     2345,
     2326
    ],
    [
     2327,
     2193
    ],
    [
     2079,
     2221
    ]
   ],
   "centre": [
    2276,
    2162
   ],
   "adjacentZones": [
    16,
    17,
    26,
    36,
    46
   ]
  },
  {
   "id": 42,
   "polygon": [
    [
     2645,
     1922
    ],
    [
     2726,
     1912
    ],
    [
     2770,
     2260
    ],
    [
     2685,
     2272
    ]
   ],
   "centre": [
    2706,
    2092
   ],
   "adjacentZones": [
    18,
    28,
    36,
    37,
    47
   ]
  },
  {
   "id": 43,
   "polygon": [
    [
     3164,
     1853
    ],
    [
     3211,
     1845
    ],
    [
     3263,
     2187
    ],
    [
     3213,
     2192
    ]
   ],
   "centre": [
    3213,
    2019
   ],
   "adjacentZones": [
    19,
    28,
    29,
    30,
    37,
    38,
    39,
    48
   ]
  },
  {
   "id": 44,
   "polygon": [
    [
     3493,
     1796
    ],
    [
     3541,
     1790
    ],
    [
     3591,
     2131
    ],
    [
     3541,
     2136
    ]
   ],
   "centre": [
    3542,
    1963
   ],
   "adjacentZones": [
    19,
    20,
    29,
    30,
    31,
    38,
    39,
    40,
    48,
    49
   ]
  },
  {
   "id": 45,
   "polygon": [
    [
     3824,
     1739
    ],
    [
     3874,
     1735
    ],
    [
     3926,
     2104
    ],
    [
     3876,
     2109
    ]
   ],
   "centre": [
    3875,
    1922
   ],
   "adjacentZones": [
    20,
    21,
    29,
    30,
    31,
    32,
    38,
    39,
    40,
    41,
    49
   ]
  },
  {
   "id": 46,
   "polygon": [
    [
     4167,
     1704
    ],
    [
     4204,
     1703
    ],
    [
     4257,
     2072
    ],
    [
     4221,
     2076
    ]
   ],
   "centre": [
    4212,
    1889
   ],
   "adjacentZones": [
    21,
    22,
    30,
    31,
    32,
    39,
    40,
    41
   ]
  },
  {
   "id": 47,
   "polygon": [
    [
     4551,
     1666
    ],
    [
     4600,
     1662
    ],
    [
     4641,
     2023
    ],
    [
     4598,
     2027
    ]
   ],
   "centre": [
    4598,
    1844
   ],
   "adjacentZones": [
    22,
    31,
    32,
    40,
    41
   ]
  },
  {
   "id": 48,
   "polygon": [
    [
     614,
     1693
    ],
    [
     659,
     1693
    ],
    [
     675,
     1893
    ],
    [
     817,
     1878
    ],
    [
     825,
     1936
    ],
    [
     678,
     1949
    ],
    [
     690,
     2096
    ],
    [
     647,
     2100
    ]
   ],
   "centre": [
    701,
    1905
   ],
   "adjacentZones": [
    23,
    33,
    34,
    42,
    43
   ]
  },
  {
   "id": 49,
   "polygon": [
    [
     817,
     1880
    ],
    [
     1212,
     1839
    ],
    [
     1215,
     1893
    ],
    [
     1025,
     1910
    ],
    [
     1039,
     2111
    ],
    [
     987,
     2118
    ],
    [
     972,
     1923
    ],
    [
     823,
     1936
    ]
   ],
   "centre": [
    1011,
    1951
   ],
   "adjacentZones": [
    23,
    24,
    33,
    34,
    35,
    42,
    43,
    44
   ]
  },
  {
   "id": 50,
   "polygon": [
    [
     1210,
     1839
    ],
    [
     1547,
     1803
    ],
    [
     1553,
     1859
    ],
    [
     1216,
     1893
    ]
   ],
   "centre": [
    1382,
    1848
   ],
   "adjacentZones": [
    34,
    35,
    42,
    43,
    44,
    45
   ]
  },
  {
   "id": 51,
   "polygon": [
    [
     1548,
     1807
    ],
    [
     1726,
     1789
    ],
    [
     1706,
     1596
    ],
    [
     1758,
     1593
    ],
    [
     1779,
     1781
    ],
    [
     2026,
     1755
    ],
    [
     2032,
     1811
    ],
    [
     1787,
     1828
    ],
    [
     1809,
     2030
    ],
    [
     1755,
     2035
    ],
    [
     1729,
     1837
    ],
    [
     1554,
     1856
    ]
   ],
   "centre": [
    1767,
    1810
   ],
   "adjacentZones": [
    35,
    36,
    44,
    45,
    46
   ]
  },
  {
   "id": 52,
   "polygon": [
    [
     2023,
     1754
    ],
    [
     2173,
     1739
    ],
    [
     2476,
     1710
    ],
    [
     2482,
     1766
    ],
    [
     2337,
     1779
    ],
    [
     2360,
     1955
    ],
    [
     2298,
     1960
    ],
    [
     2278,
     1787
    ],
    [
     2030,
     1806
    ]
   ],
   "centre": [
    2273,
    1806
   ],
   "adjacentZones": [
    26,
    36,
    37,
    45,
    46,
    47
   ]
  },
  {
   "id": 53,
   "polygon": [
    [
     2476,
     1711
    ],
    [
     2618,
     1697
    ],
    [
     2591,
     1511
    ],
    [
     2664,
     1502
    ],
    [
     2693,
     1690
    ],
    [
     2905,
     1661
    ],
    [
     2911,
     1713
    ],
    [
     2706,
     1740
    ],
    [
     2728,
     1912
    ],
    [
     2646,
     1926
    ],
    [
     2625,
     1754
    ],
    [
     2483,
     1768
    ]
   ],
   "centre": [
    2670,
    1715
   ],
   "adjacentZones": [
    28,
    37,
    46,
    47,
    48
   ]
  },
  {
   "id": 54,
   "polygon": [
    [
     2906,
     1662
    ],
    [
     3320,
     1608
    ],
    [
     3327,
     1655
    ],
    [
     3187,
     1671
    ],
    [
     3212,
     1848
    ],
    [
     3161,
     1856
    ],
    [
     3137,
     1681
    ],
    [
     2913,
     1715
    ]
   ],
   "centre": [
    3145,
    1712
   ],
   "adjacentZones": [
    28,
    29,
    37,
    38,
    39,
    47,
    48,
    49
   ]
  },
  {
   "id": 55,
   "polygon": [
    [
     3318,
     1606
    ],
    [
     3651,
     1566
    ],
    [
     3658,
     1613
    ],
    [
     3518,
     1629
    ],
    [
     3541,
     1792
    ],
    [
     3494,
     1798
    ],
    [
     3472,
     1635
    ],
    [
     3331,
     1655
    ]
   ],
   "centre": [
    3498,
    1662
   ],
   "adjacentZones": [
    29,
    30,
    38,
    39,
    40,
    48,
    49,
    50
   ]
  },
  {
   "id": 56,
   "polygon": [
    [
     3647,
     1565
    ],
    [
     3803,
     1543
    ],
    [
     3764,
     1320
    ],
    [
     3807,
     1314
    ],
    [
     3849,
     1533
    ],
    [
     3987,
     1514
    ],
    [
     3994,
     1561
    ],
    [
     3850,
     1583
    ],
    [
     3872,
     1733
    ],
    [
     3826,
     1738
    ],
    [
     3804,
     1593
    ],
    [
     3657,
     1613
    ]
   ],
   "centre": [
    3822,
    1551
   ],
   "adjacentZones": [
    30,
    31,
    38,
    39,
    40,
    41,
    49,
    50,
    51
   ]
  },
  {
   "id": 57,
   "polygon": [
    [
     3985,
     1513
    ],
    [
     4130,
     1490
    ],
    [
     4098,
     1238
    ],
    [
     4134,
     1232
    ],
    [
     4174,
     1478
    ],
    [
     4352,
     1461
    ],
    [
     4357,
     1504
    ],
    [
     4178,
     1522
    ],
    [
     4205,
     1704
    ],
    [
     4170,
     1709
    ],
    [
     4143,
     1531
    ],
    [
     3995,
     1559
    ]
   ],
   "centre": [
    4160,
    1495
   ],
   "adjacentZones": [
    31,
    32,
    39,
    40,
    41,
    50,
    51
   ]
  },
  {
   "id": 58,
   "polygon": [
    [
     4349,
     1462
    ],
    [
     4523,
     1452
    ],
    [
     4449,
     1137
    ],
    [
     4490,
     1125
    ],
    [
     4578,
     1471
    ],
    [
     4597,
     1663
    ],
    [
     4550,
     1669
    ],
    [
     4523,
     1491
    ],
    [
     4354,
     1504
    ]
   ],
   "centre": [
    4490,
    1442
   ],
   "adjacentZones": [
    32,
    40,
    41,
    50,
    51
   ]
  },
  {
   "id": 59,
   "polygon": [
    [
     840,
     1422
    ],
    [
     648,
     1438
    ],
    [
     622,
     1192
    ],
    [
     572,
     1198
    ],
    [
     615,
     1695
    ],
    [
     658,
     1696
    ],
    [
     644,
     1493
    ],
    [
     848,
     1473
    ]
   ],
   "centre": [
    681,
    1451
   ],
   "adjacentZones": [
    42,
    43,
    52,
    53
   ]
  },
  {
   "id": 60,
   "polygon": [
    [
     1182,
     1387
    ],
    [
     842,
     1420
    ],
    [
     848,
     1474
    ],
    [
     1186,
     1436
    ]
   ],
   "centre": [
    1014,
    1429
   ],
   "adjacentZones": [
    42,
    43,
    44,
    52,
    53,
    54
   ]
  },
  {
   "id": 61,
   "polygon": [
    [
     1506,
     1351
    ],
    [
     1180,
     1383
    ],
    [
     1187,
     1442
    ],
    [
     1511,
     1410
    ]
   ],
   "centre": [
    1346,
    1396
   ],
   "adjacentZones": [
    43,
    44,
    45,
    53,
    54,
    55
   ]
  },
  {
   "id": 62,
   "polygon": [
    [
     1949,
     1303
    ],
    [
     1730,
     1323
    ],
    [
     1706,
     1086
    ],
    [
     1647,
     1092
    ],
    [
     1675,
     1331
    ],
    [
     1507,
     1350
    ],
    [
     1512,
     1407
    ],
    [
     1685,
     1391
    ],
    [
     1708,
     1601
    ],
    [
     1757,
     1597
    ],
    [
     1735,
     1386
    ],
    [
     1954,
     1362
    ]
   ],
   "centre": [
    1714,
    1352
   ],
   "adjacentZones": [
    44,
    45,
    46,
    54,
    55,
    56
   ]
  },
  {
   "id": 63,
   "polygon": [
    [
     2390,
     1253
    ],
    [
     1948,
     1300
    ],
    [
     1956,
     1359
    ],
    [
     2395,
     1312
    ]
   ],
   "centre": [
    2172,
    1306
   ],
   "adjacentZones": [
    45,
    46,
    55,
    56
   ]
  },
  {
   "id": 64,
   "polygon": [
    [
     2854,
     1195
    ],
    [
     2625,
     1225
    ],
    [
     2601,
     1001
    ],
    [
     2523,
     1010
    ],
    [
     2547,
     1234
    ],
    [
     2387,
     1252
    ],
    [
     2394,
     1311
    ],
    [
     2553,
     1295
    ],
    [
     2589,
     1515
    ],
    [
     2664,
     1506
    ],
    [
     2635,
     1277
    ],
    [
     2859,
     1254
    ]
   ],
   "centre": [
    2603,
    1256
   ],
   "adjacentZones": [
    46,
    47,
    48,
    56,
    57,
    58
   ]
  },
  {
   "id": 65,
   "polygon": [
    [
     3177,
     1151
    ],
    [
     2850,
     1196
    ],
    [
     2858,
     1250
    ],
    [
     3183,
     1211
    ]
   ],
   "centre": [
    3017,
    1202
   ],
   "adjacentZones": [
    47,
    48,
    49,
    57,
    58,
    59
   ]
  },
  {
   "id": 66,
   "polygon": [
    [
     3497,
     1082
    ],
    [
     3296,
     1139
    ],
    [
     3173,
     1154
    ],
    [
     3182,
     1208
    ],
    [
     3305,
     1197
    ],
    [
     3503,
     1142
    ]
   ],
   "centre": [
    3326,
    1154
   ],
   "adjacentZones": [
    48,
    49,
    50,
    57,
    58,
    59,
    60
   ]
  },
  {
   "id": 67,
   "polygon": [
    [
     3903,
     958
    ],
    [
     3741,
     1010
    ],
    [
     3676,
     787
    ],
    [
     3611,
     803
    ],
    [
     3673,
     1030
    ],
    [
     3483,
     1084
    ],
    [
     3502,
     1144
    ],
    [
     3714,
     1084
    ],
    [
     3762,
     1324
    ],
    [
     3807,
     1316
    ],
    [
     3754,
     1064
    ],
    [
     3921,
     1019
    ]
   ],
   "centre": [
    3712,
    1052
   ],
   "adjacentZones": [
    49,
    50,
    51,
    58,
    59,
    60,
    61
   ]
  },
  {
   "id": 68,
   "polygon": [
    [
     4210,
     867
    ],
    [
     3897,
     959
    ],
    [
     3913,
     1021
    ],
    [
     4059,
     981
    ],
    [
     4095,
     1235
    ],
    [
     4136,
     1236
    ],
    [
     4092,
     967
    ],
    [
     4228,
     928
    ]
   ],
   "centre": [
    4079,
    1024
   ],
   "adjacentZones": [
    50,
    51,
    60,
    61
   ]
  },
  {
   "id": 69,
   "polygon": [
    [
     4424,
     852
    ],
    [
     4337,
     595
    ],
    [
     4301,
     608
    ],
    [
     4369,
     818
    ],
    [
     4210,
     863
    ],
    [
     4227,
     930
    ],
    [
     4385,
     884
    ],
    [
     4451,
     1143
    ],
    [
     4489,
     1131
    ]
   ],
   "centre": [
    4355,
    869
   ],
   "adjacentZones": [
    50,
    51,
    60,
    61
   ]
  },
  {
   "id": 70,
   "polygon": [
    [
     803,
     939
    ],
    [
     799,
     895
    ],
    [
     551,
     921
    ],
    [
     574,
     1200
    ],
    [
     620,
     1196
    ],
    [
     599,
     956
    ]
   ],
   "centre": [
    658,
    1018
   ],
   "adjacentZones": [
    52,
    53
   ]
  },
  {
   "id": 71,
   "polygon": [
    [
     1136,
     908
    ],
    [
     1132,
     864
    ],
    [
     799,
     896
    ],
    [
     803,
     940
    ]
   ],
   "centre": [
    968,
    902
   ],
   "adjacentZones": [
    52,
    53,
    54
   ]
  },
  {
   "id": 72,
   "polygon": [
    [
     1452,
     877
    ],
    [
     1448,
     833
    ],
    [
     1131,
     862
    ],
    [
     1137,
     905
    ]
   ],
   "centre": [
    1292,
    869
   ],
   "adjacentZones": [
    53,
    54,
    55
   ]
  },
  {
   "id": 73,
   "polygon": [
    [
     1925,
     825
    ],
    [
     1922,
     782
    ],
    [
     1442,
     831
    ],
    [
     1449,
     878
    ],
    [
     1618,
     861
    ],
    [
     1645,
     1094
    ],
    [
     1702,
     1089
    ],
    [
     1676,
     850
    ]
   ],
   "centre": [
    1672,
    901
   ],
   "adjacentZones": [
    54,
    55,
    56
   ]
  },
  {
   "id": 74,
   "polygon": [
    [
     2295,
     786
    ],
    [
     2291,
     747
    ],
    [
     1921,
     779
    ],
    [
     1924,
     824
    ]
   ],
   "centre": [
    2108,
    784
   ],
   "adjacentZones": [
    55,
    56
   ]
  },
  {
   "id": 75,
   "polygon": [
    [
     2777,
     735
    ],
    [
     2773,
     680
    ],
    [
     2526,
     722
    ],
    [
     2288,
     745
    ],
    [
     2293,
     784
    ],
    [
     2496,
     767
    ],
    [
     2523,
     1012
    ],
    [
     2598,
     1004
    ],
    [
     2567,
     763
    ]
   ],
   "centre": [
    2538,
    801
   ],
   "adjacentZones": [
    56,
    57,
    58
   ]
  },
  {
   "id": 76,
   "polygon": [
    [
     3119,
     683
    ],
    [
     3107,
     625
    ],
    [
     2769,
     681
    ],
    [
     2776,
     736
    ]
   ],
   "centre": [
    2943,
    681
   ],
   "adjacentZones": [
    57,
    58,
    59
   ]
  },
  {
   "id": 77,
   "polygon": [
    [
     3370,
     634
    ],
    [
     3358,
     583
    ],
    [
     3102,
     626
    ],
    [
     3117,
     685
    ]
   ],
   "centre": [
    3237,
    632
   ],
   "adjacentZones": [
    57,
    58,
    59,
    60
   ]
  },
  {
   "id": 78,
   "polygon": [
    [
     3782,
     537
    ],
    [
     3767,
     494
    ],
    [
     3567,
     547
    ],
    [
     3354,
     584
    ],
    [
     3367,
     633
    ],
    [
     3551,
     597
    ],
    [
     3614,
     804
    ],
    [
     3674,
     786
    ],
    [
     3616,
     579
    ]
   ],
   "centre": [
    3588,
    618
   ],
   "adjacentZones": [
    58,
    59,
    60,
    61
   ]
  },
  {
   "id": 79,
   "polygon": [
    [
     4055,
     460
    ],
    [
     4040,
     417
    ],
    [
     3764,
     494
    ],
    [
     3777,
     537
    ]
   ],
   "centre": [
    3909,
    477
   ],
   "adjacentZones": [
    60,
    61
   ]
  },
  {
   "id": 80,
   "polygon": [
    [
     4335,
     596
    ],
    [
     4256,
     360
    ],
    [
     4039,
     421
    ],
    [
     4051,
     459
    ],
    [
     4238,
     410
    ],
    [
     4301,
     608
    ]
   ],
   "centre": [
    4203,
    476
   ],
   "adjacentZones": [
    60,
    61
   ]
  }
 ],
 "tracks": {
  "Score": [
   [
    "Score0",
    4797,
    1070
   ],
   [
    "Score1",
    4897,
    1101
   ],
   [
    "Score2",
    4953,
    1184
   ],
   [
    "Score3",
    4952,
    1283
   ],
   [
    "Score4",
    4897,
    1366
   ],
   [
    "Score5",
    4800,
    1396
   ],
   [
    "Score6",
    4702,
    1364
   ],
   [
    "Score7",
    4641,
    1284
   ],
   [
    "Score8",
    4642,
    1183
   ],
   [
    "Score9",
    4702,
    1104
   ]
  ],
  "Turn": [
   [
    "Turn1",
    4757,
    442
   ],
   [
    "Turn2",
    4841,
    477
   ],
   [
    "Turn3",
    4904,
    536
   ],
   [
    "Turn4",
    4935,
    621
   ],
   [
    "Turn5",
    4937,
    709
   ],
   [
    "Turn6",
    4903,
    791
   ],
   [
    "Turn7",
    4842,
    850
   ],
   [
    "Turn8",
    4760,
    888
   ],
   [
    "Turn9",
    4670,
    887
   ],
   [
    "Turn10",
    4583,
    853
   ],
   [
    "Turn11",
    4523,
    791
   ],
   [
    "Turn12",
    4489,
    706
   ],
   [
    "Turn13",
    4491,
    619
   ],
   [
    "Turn14",
    4522,
    537
   ],
   [
    "Turn15",
    4583,
    470
   ],
   [
    "Turn16",
    4668,
    441
   ]
  ],
  "Iraqi Starting Zone": [
   [
    "Iraqi Reinforcements",
    2010,
    3541
   ],
   [
    "Iraqi Reinforcements",
    2102,
    3543
   ],
   [
    "Iraqi Reinforcements",
    2193,
    3538
   ]
  ],
  "Hornet": [
   [
    "Hornet0",
    558,
    2607
   ],
   [
    "Hornet1",
    559,
    2679
   ]
  ],
  "SuperCobra": [
   [
    "SuperCobra0",
    558,
    2827
   ],
   [
    "SuperCobra1",
    559,
    2900
   ],
   [
    "SuperCobra2",
    558,
    2974
   ]
  ],
  "DragonEye": [
   [
    "DragonEye0",
    557,
    3114
   ],
   [
    "DragonEye1",
    558,
    3194
   ],
   [
    "DragonEye2",
    558,
    3266
   ],
   [
    "DragonEye3",
    557,
    3343
   ],
   [
    "DragonEye4",
    556,
    3418
   ]
  ],
  "Battalion Starting Zone": [
   [
    "Battalion Reinforcements",
    3129,
    3350
   ],
   [
    "Battalion Reinforcements",
    3218,
    3352
   ],
   [
    "Battalion Reinforcements",
    3317,
    3349
   ]
  ],
  "Company Starting Zone": [
   [
    "Company Reinforcements",
    2847,
    3541
   ],
   [
    "Company Reinforcements",
    3123,
    3542
   ],
   [
    "Company Reinforcements",
    3411,
    3542
   ]
  ],
  "Armor Starting Zone": [
   [
    "Armor Reinforcements",
    4078,
    3483
   ],
   [
    "Armor Reinforcements",
    4170,
    3484
   ]
  ]
 },
 "streetTargets": [
  {
   "targets": [
    17,
    28,
    37,
    46
   ],
   "approx": [
    2620,
    2240
   ]
  },
  {
   "targets": [
    28,
    37
   ],
   "approx": [
    2540,
    1980
   ]
  },
  {
   "targets": [
    28,
    37,
    46
   ],
   "approx": [
    2540,
    2620
   ]
  },
  {
   "targets": [
    17,
    26,
    36,
    46
   ],
   "approx": [
    2560,
    2210
   ]
  },
  {
   "targets": [
    26,
    36
   ],
   "approx": [
    2530,
    2380
   ]
  },
  {
   "targets": [
    26,
    36,
    46
   ],
   "approx": [
    2560,
    2620
   ]
  },
  {
   "targets": [
    46
   ],
   "approx": [
    2590,
    2790
   ]
  },
  {
   "targets": [
    17
   ],
   "approx": [
    2650,
    1130
   ]
  }
 ],
 "counters": {
  "marines": {
   "total": 15,
   "cf": [
    4,
    5,
    6
   ],
   "mc": 4,
   "startSquads": 9,
   "company": 3,
   "battalion": 3,
   "note": "CF distribution across the 15 physical counters is not stated in the rulebook; confirm from the physical game / companion sheet before the engine's Setup draw is finalised."
  },
  "iif": {
   "count": 3,
   "cf": 4
  },
  "caat": {
   "count": 4,
   "ammoUses": 4,
   "explosivesUses": 1
  },
  "abrams": {
   "count": 1,
   "cf": 8,
   "note": "A second Abrams exists only in the Historical Variant / Optional rules."
  },
  "insurgents": {
   "types": [
    "Guerillas",
    "Martyrs"
   ],
   "cf": [
    1,
    2,
    3,
    4
   ],
   "idSymbols": [
    "triangle",
    "circle",
    "square",
    "diamond"
   ],
   "note": "One counter = one unit, Guerillas on one side, Martyrs on the other [5.2.1]. Physical pool size not stated in the rulebook."
  },
  "activationMarkers": {
   "normal": "Activated Zone",
   "fortified": "Activated Strongpoint",
   "start": "Activated Start Zone",
   "strongpointChoice": [
    1,
    2,
    3,
    4
   ],
   "note": "For each Strongpoint marker added, one Activated Zone marker is removed [6.1.2]."
  },
  "support": {
   "dragonEye": {
    "success": [
     0,
     8
    ],
    "max": 4
   },
   "superCobra": {
    "success": [
     0,
     6
    ],
    "max": 2
   },
   "hornet": {
    "success": [
     0,
     4
    ],
    "max": 1
   }
  }
 }
};
if (typeof module !== 'undefined') module.exports = PhantomFuryBoard;
