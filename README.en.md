# Sort Lab

[中文](README.md)

Step through seven sorting algorithms with a monochrome 3D dot plot. The first example opens paused on bubble sort comparing 8 with 3. Advance once to see the two values trade places.

![The first comparison with projected dots, operands, pseudocode and the array](assets/readme/screenshot-sorting.png)

## Reading the display

- White grains on a black field form the value columns. A braided orbit links the comparison operands. During a swap the grains travel in opposite directions and regroup. A merge write flows from its labeled buffer index into the destination. Drag horizontally to rotate, switch to the front view for a shared baseline, or select an index to inspect it.
- Each operation has a numerical explanation, its operands and the active line of pseudocode. Quicksort labels the pivot P. Merge sort explicitly shows buffer B in the merging interval when reading it. The array snapshot always shows working array A. A swap counts as two writes.
- Use Left and Right to step, Space to play or pause, and Home or End to jump. Scrub to any recorded operation. The chart has its own particle motion toggle. Reduced-motion preferences select still particles by default.
- Compare bubble, quick, merge, insertion, selection, heap and cocktail shaker sort on the same input of 2–500 elements.

## Run locally

With Node.js 20 or later, run `npm ci`, `npm test` and `npm run build`. Open `dist/index.html` directly for offline use. For development, run `npm start` and open the address printed in the terminal.

The renderer projects 3D samples onto a canvas. The sorting engine records comparisons and mutations, with an array checkpoint every 256 operations for seeking.
