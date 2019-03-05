// function quickSort(arr) {


// }

// function mergeSort() {

// }

// export default {
//   quickSort,
//   mergeSort,
// };


class Sorter {
  constructor() {
    this.history = [];
    this.bubble = this.bubble.bind(this);
    this.quick = this.quick.bind(this);
  }

  swap(arr, i, j) {
    // console.log({ arr, i, j });
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
    const partation = (list, lo, hi) => {
      const pivot = list[hi];
      let lastBiggerIndex = lo;
      for (let i = lo; i < hi; i++) {
        if (list[i] < pivot) {
          this.swap(list, i, lastBiggerIndex);
          lastBiggerIndex++;
        }
      }
      this.swap(list, lastBiggerIndex, hi);
      // const p = Math.floor((lo + hi) / 2);
      // const pivot = list[p];
      return lastBiggerIndex;
    };

    // shuffle(arr)
    function sort(list, lo, hi) {
      if (lo >= hi) {
        return;
      }
      const mid = partation(list, lo, hi);
      sort(list, lo, mid - 1);
      sort(list, mid + 1, hi);
    }

    sort(arr, 0, arr.length - 1);
    return arr;
  }

  merge(arr) {
    const mergeArr = (list, lo, mid, hi) => {
      const arr = [];
      let i = lo;
      let j = mid + 1;
      for (let cnt = lo; cnt <= hi; cnt++) {
        if (i > mid) {
          arr.push(list[j]);
        } else if (j > hi) {
          arr.push(list[i]);
        } else if (list[i] <= list[j]) {
          arr.push(list[i]);
          i++;
        } else if (list[j] < list[i]) {
          arr.push(list[j]);
          j++;
        }
      }
      // while (i <= mid && j <= hi) {
      //   if (list[i] <= list[j]) {
      //     arr.push(list[i]);
      //     i++;
      //   }
      //   if (list[j] < list[i]) {
      //     arr.push(list[j]);
      //     j++;
      //   }
      // }

      for (let k = lo; k <= hi; k++) {
        list[k] = arr[k - lo];
      }
    };
    // const partation = (list, lo, hi) => {

    // };
    const sort = (list, lo, hi) => {
      if (lo >= hi) {
        return;
      }
      const mid = Math.floor((lo + hi) / 2);
      sort(list, lo, mid);
      sort(list, mid + 1, hi);
      mergeArr(list, lo, mid, hi);
    };
    sort(arr, 0, arr.length - 1);
    return arr;
  }
}
export default Sorter;
