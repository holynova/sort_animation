import Sorter from './sort';
import { testSort } from './utils';

const log = console.log.bind(console);
function test() {
  const s = new Sorter();
  const arr = [3, 7, 5, 5, 4, 2, 6, 1, 3];
  log(s.merge(arr));
  testSort('bubble', s.bubble);
  testSort('quick', s.quick);
  testSort('merge', s.merge);
}


test()
;
