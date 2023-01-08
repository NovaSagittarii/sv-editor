import { PFunc } from './PFunc.mjs';

const OperationEnum = {};
const OperationNames = {};
const Operations = {
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
Object.keys(Operations).forEach(operation => {
  const symbol = Symbol('sv:'+operation.toLowerCase());
  OperationEnum[operation.toUpperCase()] = symbol;
  OperationNames[symbol] = operation;
  Operations[symbol] = Operations[operation];
  // i feel like this aint very good but uhh well its readable at least???
});

class SvBlock {
  static Operation = OperationEnum;
  constructor(operation=SvBlock.Operation.SET, col=0, t=0, duration=0){
    // if(t !== Math.round(t)) throw `expected integer t, observed t=${t}`;
    this.x = col;
    this.operation = operation;
    this.func = new PFunc(this);
    this.t = t;
    this.duration = duration;
  }
  getStart(){
    return this.t;
  }
  getEnd(){
    return this.t + this.duration;
  }
  setStart(t){
    this.t = t;
  }
  setEnd(t){
    this.duration = t - this.t;
  }
  setDuration(t){
    this.duration = t;
  }
  getLabel(){
    return OperationNames[this.operation] + "\n" + this.func.getLabel();
  }
  integrate(a, b){ return this.func.integrate(a-this.t, b-this.t); }
  evaluate(t){ return this.func.evaluate((t-this.t) / this.duration); }
  /*
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
  */
  applyOnto(velocityArray/*, resolution*/){ // TODO : resolution for fast rendering??
    // consider binary index tree?
    let start = this.t, end = start + this.duration;
    if(start !== Math.round(start) || end !== Math.round(end)) throw ["expected integer times", this];

    let y = null, func;
    switch(this.operation){
      case SvBlock.Operation.SET:
      case SvBlock.Operation.ADD:
      case SvBlock.Operation.SUBTRACT:
      case SvBlock.Operation.MULTIPLY:
      case SvBlock.Operation.DIVIDE:
      case SvBlock.Operation.INTENSIFY:
        func = Operations[this.operation];
        if(this.func.isConstant()) y = this.evaluate(start);
        break;
      case SvBlock.Operation.NORMALIZE:
        func = Operations.multiply;
        let displacement = 0;
        for(let x = Math.round(start); x < end; x ++) displacement += velocityArray[x];
        y = this.evaluate(start) * (end - start) / displacement;
        break;
    }
    for(let t = start; t < end; t ++){
      velocityArray[t] = func(velocityArray[t], y !== null ? y : this.evaluate(t));
    }
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
