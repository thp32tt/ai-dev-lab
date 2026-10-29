# 대항해시대 II Browser M5 — Exact Korean CHAR sprites and saved townspeople
Date: 2026-10-29 KST

## Result
The browser runtime now renders the user's real Korean DOS walking sprites instead of diagnostic player markers, and restores the saved eight-townsperson table.

## Exact CHAR.LZW structure
User artifact decodes to seven LS11 chunks:
- CHAR.000..005: 5,120 bytes each = 8 frames each.
- CHAR.006: 15,360 bytes = 24 townspeople frames.
- Each frame is 640 bytes = four 16x16 quadrants.
- Each quadrant is 1,280 bits / 160 bytes:
  - four colour planes, 256 bits each;
  - one transparency plane, 256 bits.
- For every quadrant/pixel, colour index is assembled MSB-first across the four colour planes.
- Transparency bit 1 means transparent.

Exact character palette indexes used by the shipped extractor:
0=#000000
2=#00A261
4=#D34100
6=#F3A261
8=#0041D3
10=#00A2F3
12=#D361A2
14=#F3E3D3

## Independent pixel validation
The browser-decoded user artifact was compared as complete RGBA sheets against independently extracted reference PNGs.
- hero0 256x32 RGBA SHA-256: 418d02fdc8c343c7e3accd73d07ff90fa11badaebf289d6931f956722be43d55
- hero1 256x32 RGBA SHA-256: fc92cae6c92f1643498d42554f4b47f4c81656c77048d3154cc9a0a2867d7757
- folk/char6 768x32 RGBA SHA-256: 9d1c545a76fb3e3747559bd30121b067f2a70b15b39fcce612718b375ce9bfa3
All three exact hashes match.

Hero frame order:
- 0,1 up
- 2,3 left
- 4,5 down
- 6,7 right

## Saved townspeople
The actor table is saveBase+0x18, eight records x three bytes:
- +0 x, 0xff inactive
- +1 y, 0xff inactive
- +2 direction for walker / type for fixed actor
Slots 0..3 are walkers; 4..7 fixed actors.

Example SAVE1 actor table:
[55,93,1], [20,89,3], [11,74,3], [15,93,1],
[38,90,0], [18,89,1], [255,255,2], [9,74,3].

Browser now:
- renders visible saved actors from char6;
- applies exact frame selection:
  walker = 2*((slot&1)*4 + direction) + ((x+y)&1)
  fixed = 16 + 2*type + animationParity;
- blocks the player against actors within one tile;
- includes actors in wall-around path checks;
- advances walkers with original probabilities:
  10% direction re-roll; 1/3 move attempt; blocked step turns -1/0/+1.

## Firefox validation
SAVE1 Tunis:
- exact Catalina sprite appears at saved map (16,89).
- down frame displayed on load.
- ArrowLeft moves to (15,89), facing left, stepParity=1 and the correct left animation frame is shown.
- saved townspeople visible at their saved coordinates; fixed dog/old man/walkers are represented by real char6 frames.
- diagnostic yellow player rectangle is no longer used.

## Regression
PASS:
- exact-reference CHAR test
- town walking/building test
- world-map/sea test
- existing sail/world-map functions remain intact.

Status:
BROWSER_M5_INTERACTIVE
KOREAN_CHAR_EXACT=PASS
HERO_SPRITES=EXECUTING
SAVED_TOWNSPEOPLE=EXECUTING
TOWNSPERSON_COLLISION=EXECUTING
TOWNSPERSON_WALKING=EXECUTING
FULL_GAME_BEHAVIOR=PARTIAL