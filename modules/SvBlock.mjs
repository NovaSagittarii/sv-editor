import { PFunc } from './PFunc.mjs';

const operationEnum = {};
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
  operations[symbol] = operations[operation];
  // i feel like this aint very good but uhh well its readable at least???
});

class SvBlock {
  static Operation = operationEnum;
  constructor(operation=SvBlock.Operation.SET, col=0){
    this.x = col;
    this.operation = operation;
    this.func = new PFunc(this);
    this.t = 0;
    this.duration = 0;
  }
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
    /*for(const [t, x, d] of this.func.range()){
      velocityArray[t] = operations[this.operation](velocityArray[t], x, (t-x.t)/d);
    }*/ // cant do step by step since not all function (normalize) are local
    // prefix sum is a cool antiderivative
    //let velocityArray
    let _start = performance.now(), _prep = 0, _apply = 0, _ct = 0;
    const nodes = this.func.nodes;
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
          break;
        case SvBlock.Operation.NORMALIZE:
          func = operations.multiply;
          let displacement = 0;
          for(let x = start; x < end; x ++) displacement += velocityArray[x];
          y = y*(end - start) / displacement;
          break;
      }
      _prep += performance.now() - _start;
      _start = performance.now();
      if(i < 10) console.log(start, end, y);
      for(let t = Math.round(start); t < end; t ++){
        velocityArray[t] = func(velocityArray[t], y);
      }
      _apply += performance.now() - _start;
      _ct += 1;
    }
    console.log("-- prep total", 0|_prep, "ms");
    console.log("-- apply total", 0|_apply, "ms");
    console.log(this.operation, "took", 0|(performance.now() - _start), "ms", `applied ${_ct} nodes`);
    return velocityArray;
    /*let i = 0;
    let curr, next;
    let v0, v1;
    const nodes = this.func.nodes;
    for(let t = 0; t < velocityArray.length; t ++){
      while(t >= nodes[i+1]?.t){
        i ++;
        curr = nodes[i].t;

      }
      velocityArray[t] = nodes[i].x;
    }
    return velocityArray;*/
  }
}

export { SvBlock };
export default SvBlock;
