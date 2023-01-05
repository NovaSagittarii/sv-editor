import { PFunc } from './PFunc.mjs';

const operationEnum = {};
const operationNames = {};
const operations = {
  /*
  Operation: fn(x, y)
    x[] : current sv
    y[] : sv of block being applied
  */
  set: (x, y) => y,
  add: (x, y) => x+y,
  subtract: (x, y) => x-y,
  multiply: (x, y) => x*y,
  divide: (x, y) => x/y,
  intensify: (x) => x, // TODO
  normalize: (x) => x, // TODO
};
Object.keys(operations).forEach(operation => {
  const symbol = Symbol('sv:'+operation.toLowerCase());
  operationEnum[operation.toUpperCase()] = symbol;
  operationNames[symbol] = operation;
  operations[symbol] = operations[operation];
  // i feel like this aint very good but uhh well its readable at least???
});

class SvBlock {
  static Operation = operationEnum;
  constructor(operation=SvBlock.Operation.SET, col=0, t=0, duration=0){
    // if(t !== Math.round(t)) throw `expected integer t, observed t=${t}`;
    this.x = col;
    this.operation = operation;
    this.func = new PFunc(this);
    this.t = t;
    this.duration = duration;
  }
  getLabel(){
    return operationNames[this.operation] + " " + this.func.getLabel();
  }
  integrate(a, b){ return this.func.integrate(a-this.t, b-this.t); }
  evaluate(t){ return this.func.evaluate(t-this.t); }
  setPoint(t, x){
    this.func.setPoint(t, x);
  }
  offsetX(k){
    this.func.nodes.forEach(node => node.x += k);
  }
  offsetT(k){ this.func.nodes.forEach(node => node.t += k); }
  scaleX(k, a, b){
    if(a !== void 0 && b !== void 0){
      b -= 1;
      this.func.setPoint(a, this.func.evaluate(a)*k);
      this.func.setPoint(b, this.func.evaluate(b));
      for(const node of this.func.nodes)
        if(node.x > a || node.y < b)
          node.x *= k;
    }else this.func.nodes.forEach(node => node.x *= k);
  }
  scaleT(k){ this.func.nodes.forEach(node => node.t *= k); }
  splice(t){ // cuts off second half from instance and returns it
    if(t < 0 || t > this.duration) throw 'invalid splice range';
    const remainder = new SvBlock(this.operation);
    remainder.duration = this.duration - t;
    remainder.t = this.t + t;
    remainder.func = this.func.splice(t);
    remainder.func.linked = remainder;
    this.duration = t;
    return remainder;
  }
  applyOnto(velocityArray/*, resolution*/){ // TODO : resolution for fast rendering??
    let _start = performance.now(), _prep = 0, _apply = 0;
    const nodes = this.func.nodes;

    let appliedValues = [...new Array(Math.ceil(this.duration))];
    ((T, DURATION) => {
      let sum = 0;
      let i = 0;
      let t, a, b;
      let localOffset = 1-(T%1);
      let globalOffset = Math.floor(T)+1; // idk why but its off by 1 (shift it all down 1 and then its all good)
      let largestSum = 0;
      for(let k = 0; k < DURATION; k ++){
        sum = this.evaluate(k);
        // t = a = localOffset+k;
        // b = a + 1;
        // while(nodes[i+1]?.t <= t) i ++;
        // while(nodes[i+1]?.t < b){
        //   sum += Math.min((nodes[i+1].t-t) * nodes[i].x, 1e6*1e4);
        //   t = nodes[i+1].t;
        //   i ++;
        // }
        // if(t < b) sum += Math.max(0, b-t) * nodes[i].x;
        appliedValues[globalOffset+k] = sum;
        if(sum > largestSum) largestSum = sum;
      }
      console.log("largest value over 1ms", largestSum);
    })(this.t, this.duration);

    for(let i = 0; i < nodes.length; i ++){ // NOTE TODO : handle decimal point times!!!
      let node = nodes[i];
      let start = node.t + this.t;
      let end = (nodes[i+1]?.t || this.duration) + this.t;
      let func = x => x;
      let y = node.x; // TODO : easing behaviors here

      let _start = performance.now();
      switch(this.operation){
        case SvBlock.Operation.SET:
        case SvBlock.Operation.ADD:
        case SvBlock.Operation.SUBTRACT:
        case SvBlock.Operation.MULTIPLY:
        case SvBlock.Operation.DIVIDE:
        case SvBlock.Operation.INTENSIFY:
          func = operations[this.operation];
          // y = undefined;
          break;
        case SvBlock.Operation.NORMALIZE:
          func = operations.multiply;
          let displacement = 0;
          for(let x = Math.round(start); x < end; x ++) displacement += velocityArray[x];
          y = y*(end - start) / displacement;
          appliedValues = [];
          break;
      }
      _prep += performance.now() - _start;
      _start = performance.now();
      // if(i < 10) console.log(start, end, y);
      // if(y === null) throw {error: "y val was not set", obj: this};
      for(let t = Math.round(start); t < end; t ++){
        // velocityArray[t] = func(velocityArray[t], y);
        // velocityArray[t] = func(velocityArray[t], y !== undefined ? y : values[Math.round(t-this.t)]);
        velocityArray[t] = func(velocityArray[t], appliedValues[t] !== undefined ? appliedValues[t] : y);
      }
      _apply += performance.now() - _start;
    }
    // console.log(velocityArray.slice(0, 100));
    console.log("-- prep total", 0|_prep, "ms");
    console.log("-- apply total", 0|_apply, "ms");
    console.log(this.operation, "took", 0|(performance.now() - _start), "ms", `applied ${nodes.length} nodes`);
    return velocityArray;
  }
  snapToMs(opts){
    /*
      bool: useSelfForUnknown: when snapping but theres undefined parts
    */
    this.func.snapToMs(this.t, opts);
  }
}

export { SvBlock };
export default SvBlock;
