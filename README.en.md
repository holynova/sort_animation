# Sort Lab

[Try it live](https://sort-animation.xiaosang.cc/) · [GitHub](https://github.com/holynova/sort_animation)

[中文](README.md)

Step through seven sorting algorithms with a monochrome solid bar chart. The first example opens paused on bubble sort comparing 8 with 3. Advance once to see the two values trade places.

![The first comparison with solid bars, operands, pseudocode and the array](assets/readme/screenshot-sorting.png)

## Reading the display

- Height encodes value. Solid rectangular bars share a baseline; white highlights the active operands. Switch to the 3D view and drag to turn the bars, or select an index to inspect it.
- A comparison sends sparks between the active tips. Swapping bars trail particle comets and landing rings. A merge write drops a stream from its labeled buffer index. The last operation sends a wave of bursts across the sorted tips. The plot rests when the effect ends.
- Each operation has a numerical explanation, its operands and the active line of pseudocode. Quicksort labels the pivot P. Merge sort explicitly shows buffer B in the merging interval when reading it. The array snapshot always shows working array A. A swap counts as two writes.
- Use Left and Right to step, Space to play or pause, and Home or End to jump. Scrub to any recorded operation. The chart has its own particle motion toggle. Reduced-motion preferences disable effects by default.
- Compare bubble, quick, merge, insertion, selection, heap and cocktail shaker sort on the same input of 2–500 elements.
- Enable sound in the header to hear the values as pitches. Comparisons play two notes, swaps cross-glide, and merge writes resolve to the destination pitch.

## Run locally

With Node.js 20 or later, run `npm ci`, `npm test` and `npm run build`. Open `dist/index.html` directly for offline use. For development, run `npm start` and open the address printed in the terminal.

The renderer draws transient event particles behind solid bars and their labels. The sorting engine records comparisons and mutations, with an array checkpoint every 256 operations for seeking.


Cloudflare Pages builds the `master` branch with `npm run build` after `git push origin master`.

<a href="https://sort-animation.xiaosang.cc/"><img src="assets/qr.png" width="112" alt="Scan to open on mobile"></a>
