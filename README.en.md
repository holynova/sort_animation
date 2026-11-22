# Sort Effect

[中文](README.md)

A browser instrument that turns seven sorting algorithms into audiovisual performances. Element values determine pitch and column height. Comparisons light up the active columns, writes release particles, and the final sweep resolves into an ascending arpeggio.

![Aurora Pulse, transport controls and the sound world library](assets/readme/screenshot-sorting.png)

| World | Sound and motion | Tempo |
| --- | --- | --- |
| Aurora Pulse | Glass synths, prismatic columns and stardust curtains | 108 BPM |
| Abyssal Echo | Bell overtones, long echoes, bubbles and ripples | 82 BPM |
| Solar Flare | Triangle plucks, punchy percussion and ember trails | 132 BPM |

Play quick, merge, heap, bubble, insertion, selection or cocktail sort with 2–500 samples. Switch worlds mid-performance to keep the same data and position. Scrub, step or jump to inspect individual operations. Continuous playback advances to the next world with a fresh shuffle.

Space plays or pauses. Left and Right step through operations. Home and End jump to the endpoints. R shuffles, M toggles sound and F toggles immersive mode. The keyboard panel includes a reduced-motion control.

## Run locally

With Node.js 20 or later, run `npm ci` and `npm start`, then open the address printed by the server. Run `npm test` to verify ordering and scrubbing. Run `npm run build` to generate `dist/`. Open `dist/index.html` directly for offline playback, or serve the directory from a static host.

The renderer uses Canvas 2D, bundled scene art and Web Audio synthesis. The timeline stores operations and periodic checkpoints so individual steps remain accessible with large arrays.
