
(function(global){
  // Utility to clone array
  function clone(arr){ return arr.slice(); }

  // Instrumentation wrapper
  function instrument(fn){
    return function(arr, compare, options){
      const a = clone(arr);
      let comparisons = 0;
      const start = performance.now();
      const res = fn(a, (x,y)=>{
        comparisons++;
        return compare(x,y);
      }, options || {});
      const end = performance.now();
      // Simulate memory usage: base + n * factor + algorithm overhead
      const n = arr.length;
      const memorySim = Math.round( (50 + n * (fn.memoryFactor || 0.02) + (fn.overhead || 0)) );
      return { result: res, timeMs: Math.max(0, end - start), comparisons, memorySim };
    };
  }

  // Default compare for numeric or text
  function numericCompare(a,b){ return Number(a) - Number(b); }
  function textCompare(a,b){ return String(a).localeCompare(String(b)); }

  // Bubble Sort
  function bubbleSort(arr, cmp){
    const n = arr.length;
    for(let i=0;i<n-1;i++){
      for(let j=0;j<n-1-i;j++){
        if(cmp(arr[j+1], arr[j]) < 0){
          [arr[j], arr[j+1]] = [arr[j+1], arr[j]];
        }
      }
    }
    return arr;
  }
  bubbleSort.memoryFactor = 0.02;
  bubbleSort.overhead = 20;

  // Insertion Sort
  function insertionSort(arr, cmp){
    for(let i=1;i<arr.length;i++){
      let key = arr[i];
      let j = i-1;
      while(j>=0 && cmp(key, arr[j]) < 0){
        arr[j+1] = arr[j];
        j--;
      }
      arr[j+1] = key;
    }
    return arr;
  }
  insertionSort.memoryFactor = 0.01;
  insertionSort.overhead = 10;

  // Merge Sort
  function mergeSort(arr, cmp){
    if(arr.length <= 1) return arr;
    const mid = Math.floor(arr.length/2);
    const left = mergeSort(arr.slice(0,mid), cmp);
    const right = mergeSort(arr.slice(mid), cmp);
    return merge(left, right, cmp);
  }
  function merge(left, right, cmp){
    const res = [];
    let i=0,j=0;
    while(i<left.length && j<right.length){
      if(cmp(left[i], right[j]) <= 0) res.push(left[i++]);
      else res.push(right[j++]);
    }
    while(i<left.length) res.push(left[i++]);
    while(j<right.length) res.push(right[j++]);
    return res;
  }
  mergeSort.memoryFactor = 0.05;
  mergeSort.overhead = 40;

  // Quick Sort (Lomuto)
  function quickSort(arr, cmp){
    function qs(a, lo, hi){
      if(lo >= hi) return;
      const p = partition(a, lo, hi);
      qs(a, lo, p-1);
      qs(a, p+1, hi);
    }
    function partition(a, lo, hi){
      const pivot = a[hi];
      let i = lo;
      for(let j=lo;j<hi;j++){
        if(cmp(a[j], pivot) < 0){
          [a[i], a[j]] = [a[j], a[i]];
          i++;
        }
      }
      [a[i], a[hi]] = [a[hi], a[i]];
      return i;
    }
    qs(arr, 0, arr.length-1);
    return arr;
  }
  quickSort.memoryFactor = 0.03;
  quickSort.overhead = 30;

  // Hybrid Improved Model: Merge Sort for large partitions, Insertion for small
  function hybridSort(arr, cmp, options){
    const threshold = options && options.threshold ? options.threshold : 32;
    function hs(a){
      if(a.length <= threshold) return insertionSort(a, cmp);
      const mid = Math.floor(a.length/2);
      const left = hs(a.slice(0,mid));
      const right = hs(a.slice(mid));
      return merge(left, right, cmp);
    }
    return hs(arr);
  }
  hybridSort.memoryFactor = 0.04;
  hybridSort.overhead = 25;

  // Expose instrumented algorithms
  global.Sorting = {
    bubble: instrument(bubbleSort),
    insertion: instrument(insertionSort),
    merge: instrument(mergeSort),
    quick: instrument(quickSort),
    hybrid: instrument(hybridSort),
    numericCompare,
    textCompare
  };

})(window);
