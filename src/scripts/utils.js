
const log = console.log.bind(console);
const between = (min = 0, max = 100) => min + Math.floor(Math.random() * (max - min));
// const log = console.log.bind(console)
const rand = {
  between,
  list: (N = 100, min = 0, max = 100) => {
    const arr = [];
    for (let i = 0; i < N; i++) {
      arr.push(between(min, max));
    }
    return arr;
  },
};


function testSort(name = 'foo', func1, cnt = 100, timeLimit = 3000) {
  const start = new Date().getTime();
  const func2 = arr => arr.sort((a, b) => a - b);
  // const cnt = 100;
  let pass = 0;
  let total = 0;
  for (let i = 0; i < cnt; i++) {
    total++;
    const testCase = rand.list(9999, 0, 9999);
    const r1 = JSON.stringify(func1([...testCase]));
    const r2 = JSON.stringify(func2([...testCase]));
    if (r1 === r2) {
      pass++;
    }
    const now = Date.now();
    if (now - start > timeLimit) {
      break;
    }
  }
  log(`${name}:${pass}/${total} = ${pass / total * 100}% cases pass`);
  return pass === total;
}


export {
  rand,
  testSort,
};
