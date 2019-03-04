// import '../styles/normalize.scss';
import '../styles/style.scss';
import './sort';

window.onload = function () {
  function RandClass() {
    // this.name = 'Rand class';
  }

  RandClass.prototype = {
    randBetween(min, max) {
      if (typeof min === 'undefined') min = 0;
      if (typeof max === 'undefined') max = 100;
      return min + Math.floor(Math.random() * (max - min));
    },
    randArr(N, min, max) {
      if (typeof N === 'undefined') N = 15;
      if (typeof min === 'undefined') min = 0;
      if (typeof max === 'undefined') max = 100;
      const arr = [];
      for (let i = 0; i < N; i++) {
        arr.push(this.randBetween(min, max));
      }
      return arr;
    },
  };

  function DrawClass(canvasElem, settings) {
    if (canvasElem.tagName.toUpperCase() !== 'CANVAS') {
      console.log('错误的canvas元素');
      return;
    }
    if (typeof settings === 'undefined') {
      settings = {};
    }
    this.canvasElem = canvasElem;
    this.ctx = canvasElem.getContext('2d');
    this.width = canvasElem.width;
    this.height = canvasElem.height;
    this.color = 'rgba(255,0,0,0.3)';
    this.highlightColor = 'rgba(0,0,0,0.9)';
    this.ctx.fillStyle = this.color;
    // this.ctx.fillStyle = 'rgba(255,0,0,0.3)';
  }
  DrawClass.prototype = {
    plotFrame(frameData) {
      if (typeof frameData === 'undefined') {
        console.log(`没有frameData数据, curFrame = ${curFrame}`);
        return;
      }
      this.ctx.clearRect(0, 0, this.width, this.height);
      const widthStep = Math.floor(this.width / frameData.data.length);
      const columnRatio = 0.618;
      const heightRatio = 0.8;
      const max = Math.max.apply(null, frameData.data);
      // console.log('width=%d widthStep=%d length=%d', this.width, widthStep, frameData.data.length);
      for (let i = 0; i < frameData.data.length; i++) {
        const value = frameData.data[i];
        this.ctx.moveTo(i * widthStep, 0);
        const rectWidth = Math.max(1, Math.floor(columnRatio * widthStep));
        const rectHeight = Math.max(1, Math.floor(heightRatio * this.height * value / max));
        const offset = Math.floor((this.width - widthStep * frameData.data.length) / 2);
        if (frameData.highlight.indexOf(i) !== -1) {
          // 应高亮
          this.ctx.fillStyle = this.highlightColor;
          this.ctx.fillRect(offset + i * widthStep,
            this.height - rectHeight,
            rectWidth,
            rectHeight);
          this.ctx.fillStyle = this.color;
        } else {
          // var lightness = (1 - value / max) * 100 + '%';
          // var hue = (value / max) * 270;
          // this.ctx.fillStyle = 'hsl(' + hue + ',50%,50%)';
          // console.log('hsl(10,100%,' + lightness + ')');
          // console.log('hsl(' + hue + ',100%,80%)');
          // console.log(this.ctx.fillStyle);
          // this.fillStyle = 'hsl(150,20%,80%)';
          // this.fillStyle = 'hsl(150,20%,80%)';
          this.ctx.fillRect(offset + i * widthStep,
            this.height - rectHeight,
            rectWidth,
            rectHeight);
        }
      }
      oCurFrame.innerHTML = `当前步数:${curFrame}`;
    },
    plotHist(histArr, t, startIndex) {
      if (typeof startIndex === 'undefined') {
        startIndex = 0;
      }
      clearInterval(timer);
      curFrame = startIndex;
      if (typeof t === 'undefined') t = 300;
      const me = this;
      timer = setInterval(() => {
        me.plotFrame(histArr[curFrame]);
        curFrame++;
        if (curFrame >= histArr.length) {
          clearInterval(timer);
        }
      }, t);
    },
  };

  function SortClass() { }
  SortClass.prototype = {
    bubbleSort(arr, histArr) {
      // histArr = [];
      const len = arr.length;
      for (let i = 0; i < len; i++) {
        let isSwap = false;
        for (let j = 0; j < len - 1 - i; j++) {
          if (arr[j] > arr[j + 1]) {
            const temp = arr[j];
            arr[j] = arr[j + 1];
            arr[j + 1] = temp;
            isSwap = true;
            const hist = {
              data: arr.slice(),
              highlight: [j, j + 1],
            };
            histArr.push(hist);
          }
        }
        if (!isSwap) {
          return arr;
        }
      }
      return arr;
    },
    quickSort(arr, histArr) {
      // histArr = [];
      function swap(arr, i, j) {
        if (i === j) return;
        const temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
        // console.log(arr);
      }

      function partition(arr, lo, hi) {
        const pivot = arr[hi];
        let keyIndex = lo;
        for (let i = lo; i < hi; i++) {
          if (arr[i] < pivot) {
            swap(arr, i, keyIndex);
            //
            var hist = {
              data: arr.slice(),
              highlight: [i, keyIndex, hi],
            };
            histArr.push(hist);
            keyIndex++;
          }
        }
        swap(arr, keyIndex, hi);
        var hist = {
          data: arr.slice(),
          highlight: [keyIndex, hi],
        };
        histArr.push(hist);
        // keyIndex++;
        return keyIndex;
      }

      function sort(arr, lo, hi) {
        if (lo >= hi) {
          return;
        }
        const mid = partition(arr, lo, hi);
        sort(arr, lo, mid - 1);
        sort(arr, mid + 1, hi);
      }
      sort(arr, 0, arr.length - 1);
    },
    mergeSort(arr, histArr) {
      // histArr = [];
      const shadowArr = new Array(arr.length);
      // function swap(arr, i, j) {
      //     var temp = arr[i];
      //     arr[i] = arr[j];
      //     arr[j] = temp;
      // }
      function merge(arr, lo, mid, hi) {
        // 将arr分成 [lo,mid] [mid+1,hi]两部分来合并
        for (var i = lo; i <= hi; i++) {
          shadowArr[i] = arr[i];
        }
        let left = lo,
          right = mid + 1;
        for (var i = lo; i <= hi; i++) {
          if (left > mid) arr[i] = shadowArr[right++];
          else if (right > hi) arr[i] = shadowArr[left++];
          else if (shadowArr[left] > shadowArr[right]) arr[i] = shadowArr[right++];
          else {
            arr[i] = shadowArr[left++];
          }
          const hist = {
            data: arr.slice(),
            highlight: [left, right, i],
          };
          histArr.push(hist);
        }
      }

      function sort(arr, lo, hi) {
        if (lo >= hi) return;
        const mid = Math.floor((lo + hi) / 2);
        sort(arr, lo, mid);
        sort(arr, mid + 1, hi);
        merge(arr, lo, mid, hi);
      }
      sort(arr, 0, arr.length - 1);
      return arr;
    },
    heapSort(arr, histArr) {
      // histArr = [];
      arr.unshift('-');

      function swap(arr, i, j) {
        const temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
        const arrCopy = arr.slice();
        arrCopy.shift();
        const hist = {
          data: arrCopy,
          highlight: [i - 1, j - 1],
        };
        histArr.push(hist);
      }

      function sink(arr, index, maxIndex) {
        while (index * 2 <= maxIndex) {
          let maxSonIndex = index * 2;
          if (maxSonIndex < maxIndex) {
            if (arr[maxSonIndex] < arr[maxSonIndex + 1]) {
              maxSonIndex++;
            }
          }
          if (arr[index] < arr[maxSonIndex]) {
            swap(arr, index, maxSonIndex);
            index = maxSonIndex;
          } else {
            break;
          }
        }
      }
      // 构造一个堆
      // 从数组的中间开始,往index = 1处移动,每个都做下沉操作
      const len = arr.length;
      const startIndex = Math.floor((len - 1) / 2);
      for (var i = startIndex; i >= 1; i--) {
        sink(arr, i, len - 1);
      }
      // 取出堆顶(最大值),跟数组最后一个位置进行交换
      // 将交换后的堆顶元素下沉到合适的位置
      for (var i = len - 1; i > 1; i--) {
        swap(arr, 1, i);
        sink(arr, 1, i - 1);
      }
      arr.shift();
      return arr;
    },
    selectSort(arr, histArr) {
      function swap(arr, i, j) {
        const temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
        const hist = {
          data: arr.slice(),
          highlight: [i, j],
        };
        histArr.push(hist);
      }

      function findMaxIndex(arr, lo, hi) {
        let max = arr[lo],
          maxIndex = lo;
        for (let i = lo + 1; i <= hi; i++) {
          const hist = {
            data: arr.slice(),
            highlight: [i, maxIndex],
          };
          histArr.push(hist);
          if (arr[i] > max) {
            max = arr[i];
            maxIndex = i;
          }
        }
        return maxIndex;
      }
      const len = arr.length;
      for (let i = len - 1; i >= 0; i--) {
        // swap(arr, findMaxIndex(arr,0,len-i),len-i)
        swap(arr, i, findMaxIndex(arr, 0, i));
      }
      return arr;
    },
    cocktailSort(arr, histArr) {
      function swap(arr, i, j) {
        const temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
        const hist = {
          data: arr.slice(),
          highlight: [i, j],
        };
        histArr.push(hist);
      }

      function sort(arr) {
        let lo = 0,
          hi = arr.length - 1;
        while (lo < hi) {
          let isSwap = false;
          for (let i = lo; i <= hi - 1; i++) {
            if (arr[i] > arr[i + 1]) {
              swap(arr, i, i + 1);
              isSwap = true;
            }
          }
          if (!isSwap) break;
          hi--;
          for (let j = hi; j >= lo + 1; j--) {
            if (arr[j - 1] > arr[j]) {
              swap(arr, j, j - 1);
              isSwap = true;
            }
          }
          if (!isSwap) break;
          lo++;
        }
      }
      sort(arr);
      return arr;
    },
    insertSort(arr, histArr) {
      function swap(arr, i, j) {
        const temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
        const hist = {
          data: arr.slice(),
          highlight: [j],
        };
        histArr.push(hist);
      }
      const len = arr.length;
      for (let i = 1; i < len; i++) {
        const cur = arr[i];
        let index = i - 1;
        while (index >= 0) {
          if (arr[index] > cur) {
            swap(arr, index + 1, index);
          } else {
            break;
          }
          index--;
        }
      }
      return arr;
      // for (var i = 1; i < len; i++) {
      //     //从i-1开始向左找,找到第一个比他小的数字(其index是j),或者找到队列的头
      //     //把arr[i]暂存到temp中
      //     for (var j = i - 1; j >= 0; j--) {
      //         //如果找到比当前更小的
      //         //从把[j+1,i-1]区间,向后移1位
      //         if (arr[j] < arr[i]) {
      //             var temp = arr[i];
      //             for (var k = i - 1; k >= j + 1; k--) {
      //                 arr[k + 1] = arr[k];
      //                 var hist = {
      //                     data: arr.slice(),
      //                     highlight: [k, k + 1]
      //                 }
      //                 histArr.push(hist);
      //             }
      //             //把temp放到j+1这个位置
      //             arr[j + 1] = temp;
      //             var hist = {
      //                 data: arr.slice(),
      //                 highlight: [j + 1]
      //             }
      //             histArr.push(hist);
      //             break;
      //         }
      //     }
      // }
      // return arr;
    },
  };
  //--------------------------------------------------------------
  var btnPanel = document.getElementById('btn-panel'),
    inputN = document.getElementById('sample-num'),
    inputInterval = document.getElementById('interval'),
    selectSort = document.getElementById('select-sort'),
    oCurFrame = document.getElementById('cur-frame');
  let rand = new RandClass(),
    draw = new DrawClass(document.getElementById('my-canvas')),
    sort = new SortClass();
  // console.log(rand.name);
  // console.log(rand.randBetween(1, 100));
  // get settings
  // gen random arr
  var sampleArr = [],
    histArr = [],
    timer = null,
    curFrame = 0;
  initShow();
  // bind events
  btnPanel.addEventListener('click', handleBtns, false);
  selectSort.addEventListener('change', initShow, false);
  inputN.addEventListener('change', initShow, false);

  function initShow() {
    clearInterval(timer);
    sampleArr = rand.randArr(inputN.value, 1, 40);
    const sortFunc = getSortFuncPointer();
    histArr = [];
    sortFunc(sampleArr, histArr);
    draw.plotFrame(histArr[0]);
    document.getElementById('btn-pause').value = '暂停动画';
  }

  function handleBtns(event) {
    switch (event.target.id) {
      case 'btn-go':
        initShow();
        draw.plotHist(histArr, inputInterval.value, 0);
        document.getElementById('btn-pause').value = '暂停动画';
        break;
      case 'btn-pause':
        if (event.target.value === '暂停动画') {
          clearInterval(timer);
          event.target.value = '继续动画';
        } else {
          event.target.value = '暂停动画';
          draw.plotHist(histArr, inputInterval.value, curFrame);
        }
        break;
      case 'btn-next':
        clearInterval(timer);
        document.getElementById('btn-pause').value = '继续动画';
        curFrame++;
        if (curFrame >= histArr.length) {
          curFrame = histArr.length - 1;
          return;
        }
        draw.plotFrame(histArr[curFrame]);
        // curFrame++;
        break;
      case 'btn-prev':
        clearInterval(timer);
        document.getElementById('btn-pause').value = '继续动画';
        curFrame--;
        if (curFrame < 0) {
          curFrame = 0;
          return;
        }
        draw.plotFrame(histArr[curFrame]);
        break;
      case 'btn-first':
        document.getElementById('btn-pause').value = '继续动画';
        clearInterval(timer);
        curFrame = 0;
        draw.plotFrame(histArr[0]);
        break;
      case 'btn-last':
        document.getElementById('btn-pause').value = '继续动画';
        clearInterval(timer);
        curFrame = histArr.length - 1;
        draw.plotFrame(histArr[histArr.length - 1]);
        break;
    }
    event.stopPropagation();
  }

  function getSortFuncPointer() {
    let func = null;
    switch (selectSort.value) {
      case 'quickSort':
        func = sort.quickSort;
        break;
      case 'bubbleSort':
        func = sort.bubbleSort;
        break;
      case 'mergeSort':
        func = sort.mergeSort;
        break;
      case 'heapSort':
        func = sort.heapSort;
        break;
      case 'insertSort':
        func = sort.insertSort;
        break;
      case 'selectSort':
        func = sort.selectSort;
        break;
      case 'cocktailSort':
        func = sort.cocktailSort;
        break;
    }
    return func;
  }
};
