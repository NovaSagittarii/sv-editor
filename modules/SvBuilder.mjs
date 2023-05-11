import { sortByTime } from './Project.mjs';
import { SvBlock } from './SvBlock.mjs';

class Point {
  constructor(t, x){
    this.x = x;
    this.t = t;
  }
}

class SvBuilder {
  constructor(){
    this.sorted = true;
    this.aligned = true;
    this.points = [];
  }
  addPoint(t, x){
    this.sorted = false;
    if(t !== Math.round(t)) this.aligned = false;
    this.points.push(new Point(t, x));
  }
  sort(){
    sortByTime(this.points);
    this.sorted = true;
  }
  cull(){
    if(!this.sorted) this.sort();
    for(let i = this.points.length-1; i > 0; i --){
      if(this.points[i].x == this.points[i-1].x) this.points.splice(i, 1);
    }
  }
  scaleX(k){
    for(const point of this.points) point.x *= k;
  }
  integrate(a, b){
    console.log(a,b);
    if(!this.sorted) this.sort();

    let l = 0, r = this.points.length-1, m, lm=0;
    while(l <= r){
      m = ~~((l+r)/2); // t----  A t1---  B
      // console.log(l, r, m);
      if(this.points[m+1]?.t > a) r = (lm = m)-1;
      else if(this.points[m+1]?.t < a) l = (lm = m)+1;
      else if(this.points[m+1]?.t == a) {
        lm = m+1;
        break;
      } else break;
    }
    // console.log(a, this.points.slice(lm-2,lm+4), this.points[lm]);
    let sum = 0;
    let t = a, nt; // b -= 1;
    for(let i = lm; t < b; i ++){
      nt = Math.max(t, Math.min(b, i+1 < this.points.length ? this.points[i+1].t : b));
      // if(help)console.log(t, nt, '->', Math.max(0, nt-t), "@", this.points[i].x);
      sum += (nt-t) * this.points[i].x;
      t = nt;
    }
    return sum;
  }
  align(){
    let temp = [];
    let t = Math.floor(this.points[0].t);
    let carry = (this.points[0].t - t) * this.points[0].x;
    // ... 1----2----3----4----5---- ...
    //       aaabbbbbbbbbbcc
    //       aaacc
    //       dd
    for(let i = 0; i < this.points.length-1; i ++){
      let velocity = this.points[i].x;
      let curr = this.points[i].t;
      let next = this.points[i+1].t;
      if(Math.floor(curr) === Math.floor(next)){
        // section d
        carry += velocity * (next - t);
        t = next;
      }else{
        // section a
        if(curr !== Math.round(curr)){
          carry += velocity * (Math.ceil(curr) - t);
          t = Math.ceil(curr);
        }

        if(carry){
          temp.push(new Point(t-1, carry));
          carry = 0;
        }
        // section b
        if(Math.floor(next) > t){
          temp.push(new Point(t, velocity));
          t = Math.floor(next);
        }

        // section c
        if(next !== Math.round(next)){
          carry += velocity * (next - t);
        }
      }
    }
    this.points.splice(0);
    this.points = temp;
    // if(carry) console.warn("residual at end", {carry, t});
    this.aligned = true;
  }
  *exportAsBlocks(operation, col, endTime){
    if(!this.sorted) this.sort();
    if(!this.aligned) this.align();
    if(endTime === undefined) endTime = this.points[this.points.length-1].t + 10000;
    // SvBlock constructor(operation=SvBlock.Operation.SET, col=0, t=0, duration=0){
    for(let i = 0; i < this.points.length; i ++){
      const svBlock = new SvBlock(operation, col, this.points[i].t, (i+1 < this.points.length ? this.points[i+1]?.t : endTime) - this.points[i].t);
      svBlock.func.set([0, this.points[i].x]); // [t0, x0]
      if(svBlock.duration > 0) yield svBlock; // NOTE: duplicate will be generated
      else console.warn("suppressing svBlocks at same time", svBlock);
    }
  }
}

export default SvBuilder;
export { SvBuilder };
