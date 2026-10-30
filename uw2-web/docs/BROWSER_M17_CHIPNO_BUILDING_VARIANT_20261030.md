# Browser M17 — exact church/mosque GRAPH selection

Date: 2026-10-30 KST

## Confirmed original behavior

The Korean MAIN.EXE building dispatcher at file 0xE108 normally selects GRAPH
record buildingId+6 and draws it at (104,16).

For building id 10, MAIN.EXE first calls far routine 1F70:CDC3. That routine:
1. opens C:CHIP_NO.DAT through the common file loader,
2. reads the 100-byte table,
3. indexes it with the current port id stored at 0x0C3A,
4. returns 1 only when the selected byte equals 2.

If and only if the return is non-zero and building id is 10, the dispatcher uses
GRAPH #20 instead of GRAPH #16.

CHIP_NO.DAT is exactly 100 bytes. Value 2 occurs at ports:
2,4,5,18,19,20,21,22,25,72,73,74,75,76,77,78,79,80.

These include Istanbul, Algiers, Tunis, Alexandria, Jaffa, Beirut, Aden, Cairo,
Basra, Mecca and other matching ports in the Korean data.

## Web-port correction

- load GRAPH records #6..#21 rather than only #6..#17.
- select GRAPH #20 for building id 10 when CHIP_NO[currentPort] == 2.
- otherwise preserve the exact buildingId+6 rule.
- expose the selected GRAPH record in the debug state for verification.

## Evidence guards

The layout regression test pins:
- MAIN.EXE dispatcher bytes at 0xE11C,
- the current-port table comparison at 0x318ED,
- the C:CHIP_NO.DAT filename at 0x3B39E,
- selector outcomes for normal and bank-2 ports.

HORIEDIT.C is not used as evidence.