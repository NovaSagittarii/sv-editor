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

  // these two are at svblock level since
  // you need to know the time relative to the start
  // possibly pass time (instead of %) to function in the future?
  capture: (x, y) => x, // passthrough
  load: (x, y) => y, // set
};
Object.keys(Operations).forEach(operation => {
  const symbol = Symbol('sv:'+operation.toLowerCase());
  OperationEnum[operation.toUpperCase()] = symbol;
  OperationNames[symbol] = operation;
  Operations[symbol] = Operations[operation];
  // i feel like this aint very good but uhh well its readable at least???
});

class SvBlock {
  /**
   * Captured velocities
   * @type { {Object.<string, number[]>} }
   */
  static Captures = {};

  static Operation = OperationEnum;
  constructor(operation=SvBlock.Operation.SET, col=0, t=0, duration=0){
    // if(t !== Math.round(t)) throw `expected integer t, observed t=${t}`;
    this.x = col;
    this.operation = operation;
    this.func = new PFunc(this);
    this.t = t;
    this.duration = duration;
  }
  clone(){
    const n = new SvBlock(this.operation, this.x, this.t, this.duration);
    n.func = this.func;
    return n; // maybe Object.assign ? mayb
  }
  getStart(){
    return this.t;
  }
  getEnd(){
    return this.t + this.duration;
  }
  getX(){
    return this.x;
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
  setTime(start, end){
    this.t = start;
    this.duration = end - start;
  }
  setX(x){
    this.x = x;
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
      case SvBlock.Operation.CAPTURE: {
        // note: an inversion in the capture order will result in multiple
        // refreshes required to make the values propagate fully
        
        // capture velocities
        const segment = SvBlock.Captures[this.func.params[1]] = new Array(end - start);
        for(let t = start; t < end; t ++) {
          segment[t - start] = velocityArray[t];
        }
        return velocityArray; // just exit early
        // passthrough
        // func = Operations.add;
        // y = 0;
        // break;
      }
      case SvBlock.Operation.LOAD: {
        const segment = SvBlock.Captures[this.func.params[1]];
        if (segment === undefined || !segment) console.warn("undefined load!!", this);
        else {
          for(let t = start; t < end; t ++) {
            velocityArray[t] = segment[(t - start) % segment.length];
          }
        }
        return velocityArray; // just exit early
      }
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
