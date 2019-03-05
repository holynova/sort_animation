// function quickSort(arr) {


// }

// function mergeSort() {

// }

// export default {
//   quickSort,
//   mergeSort,
// };
import { testSort } from './utils';

class Sorter {
  constructor() {
    this.history = [];
    this.bubble = this.bubble.bind(this);
  }

  swap(arr, i, j) {
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }

  init() {
    this.history = [];
  }

  bubble(arr) {
    for (let max = arr.length; max > 0; max--) {
      for (let i = 0; i < max - 1; i++) {
        if (arr[i] > arr[i + 1]) {
          this.swap(arr, i, i + 1);
        }
      }
    }
    return arr;
  }

  quick(arr) {

  }

  merge(arr) {

  }
}

const log = console.log.bind(console);
function test() {
  const s = new Sorter();
  // const arr = [3, 7, 5, 5, 4, 2, 6, 1, 3];
  // log(s.bubble(arr));
  testSort('bubble', s.bubble);
}


test()
;
