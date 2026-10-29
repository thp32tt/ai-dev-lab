# 대항해시대 II Browser M6 — Korean fleet speed, wind/current and 20-minute movement ticks
Date: 2026-10-29 KST

## Result
The web runtime now computes sailing speed from the user's Korean DOS save structures and advances the fleet with the original 60-unit axis accumulators on 20-minute game ticks.

## Korean-edition fleet layout
The English/reference save-layout offsets are not byte-compatible with this Korean save and were explicitly rejected after producing impossible fleet IDs and cargo values. M6 uses the Korean HORIEDIT-derived structures instead.

### Ship1 (9 bytes, per protagonist)
- +0 u16 current crew
- +2 current durability
- +3 maximum durability
- +4 current Tacking
- +5 current Power
- +6 loaded guns
- +7 ship instance/select
- +8 gun/status selection

### Ship2 (30 bytes, shared active slots)
Real-save value correlation identifies:
- +0 captain ID
- +1 condition/health
- +2 figurehead
- +3 u16 water
- +5 u16 food
- +7 u16 lumber
- +9 u16 shot
- +11 Lookout %
- +12 Navigation %
- +13 u16 load
- +15..+24 five u16 goods quantities
- +25..+29 five goods IDs

Examples from SAVE2:
- Caravela Latina: captain João, health100, water294, food394, Lookout25, Navigation50, load113.
- Brigantine: captain Rocco, health100, water774, food1074, Lookout25, Navigation50, load264.
- La Reale: captain Enrico, Lookout20, Navigation20, load0.

### Ship4 (25 model records × 12 bytes)
Known:
- +0 maximum Tacking
- +1 maximum Power
- +2 maximum crew / 10
- +3 minimum/required crew
- +4 u16 capacity
- +6 maximum guns
- +7 Sail Type

The +7 Sail Type interpretation was validated against all 25 official ship models:
[4,4,4,0,4,5,4,5,2,2,0,3,5,5,4,2,2,3,5,1,1,3,2,2,5]
Result: 25/25 exact.

### Captain attributes
Korean Person record (50 bytes):
- +29 Seamanship
- +36 Navigation Level
These are resolved through Ship2 captain ID.

## Exact sailing speed formula implemented
For every active ship, integer divisions truncate:
- row = abs(wind direction - heading)
- effective wind = max(3, wind speed) for oared ships, otherwise wind speed
- f = wind_table[row][sail_type] * current Power * effective wind / 150
- navigation ratio = min(100, Navigation% * current crew / minimum crew)
- f = f * navigation ratio / 100
- load factor = min(150, 180 - 100 * load / capacity)
- f = f * load factor / 100
- f = min(30, f + f * Navigation Level / 10)
- f = min(40, f * Seamanship / 75)
- if row is 3,4,5: f = current Tacking * f / 100
Fleet speed is the slowest active ship, minimum 2, except dead calm with no oared ship = 0.
Displayed knots = floor((speed + 1) / 2).

Known edge case not yet emulated byte-for-byte: the original 16-bit load-factor overflow behavior above a load of 327 units. The verified user fleets used in M6 are within the normal tested path for the limiting calculations.

## Speed validation
SAVE1 Catalina / Tunis:
- Galleon Rebellion
- crew120, Tacking60, Power65, Navigation20%, min crew45, capacity800, Seamanship79, Navigation Level8, Sail Type0
- port-region wind dir4 speed2, north heading
- individual speed truncates to 0 under headwind; fleet minimum speed => 2 = 1 knot

SAVE2 João / Danzig at the port-region sample:
- Caravela Latina speed15
- Brigantine speed15
- La Reale speed8
- fleet speed8 = 4 knots

At the actual departure cell (286,238):
- wind dir3 speed5
- north: limiting La Reale speed9 => 5 knots displayed
- east: ships 22 / 26 / 12, fleet speed12 => 6 knots

## 20-minute movement ticks
SeaRuntime now:
- adds heading vector × fleet speed
- adds current vector × current speed
- accumulates X/Y independently
- positive crossing >=60 advances +1 tile and subtracts60
- negative crossing <0 advances -1 tile and adds60
- respects 2×2 fleet coast collision
- preserves the blocked-axis accumulator at the edge
- advances the game clock by one 20-minute tick

## Firefox validation
SAVE2 Danzig:
1. load save at town position.
2. enter Harbor.
3. sail to (286,238).
4. initial north speed = 9 half-knots / 5 knots.
5. first north 20-minute tick is coast-blocked.
6. turn east: speed = 12 half-knots / 6 knots.
7. east accumulator: 12 -> 24 -> 36 -> 48 -> threshold.
8. at total tick 6, fleet moves (286,238) -> (287,238).
9. clock advances 1522-07-06 16:20 -> 18:20.
PASS.

## Regression
PASS:
- CHAR exact-reference test
- town walking/building test
- world map + sea-ship test
- exact Korean fleet/speed test
- Firefox M6 speed/tick validation

Status:
BROWSER_M6_INTERACTIVE
KOREAN_FLEET_LAYOUT=VALIDATED_FOR_SPEED_FIELDS
SAILING_SPEED=EXECUTING
WIND_CURRENT=EXECUTING
TWENTY_MINUTE_TICKS=EXECUTING
AXIS_ACCUMULATORS=EXECUTING
COAST_COLLISION=EXECUTING
FULL_GAME_BEHAVIOR=PARTIAL