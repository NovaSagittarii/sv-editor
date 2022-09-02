import { PFunc } from './PFunc.mjs';

const operationEnum = {};
const operations = {
  /*
  Operation: fn(x, y, n)
    x : current sv
    y : sv of block being applied
    n : notes in duration (maybe just all notes)
  */
  set: (x, y) => x,
  add: (x, y) => x+y,
  subtract: (x, y) => x-y,
  multiply: (x, y) => x*y,
  divide: (x, y) => x/y,
  intensify: (x) => x, // TODO
  normalize: (x) => x, // TODO
};
Object.keys(operations).forEach(operation => operationEnum[operation.toUpperCase()] = Symbol('sv:'+operation.toLowerCase()));

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
  offsetX(k){ this.func.nodes.forEach(node => node.x += k); }
  offsetT(k){ this.func.nodes.forEach(node => node.t += k); }
  scaleX(k){ this.func.nodes.forEach(node => node.x *= k); }
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
  applyOnto(otherSvBlock){

  }
}

export { SvBlock };
export default SvBlock;
