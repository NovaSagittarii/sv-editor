import { PFunc } from './PFunc.mjs';

const operationEnum = {};
const operations = {
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
  constructor(operation){
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

  }
  applyOnto(otherSvBlock){

  }
}

export { SvBlock };
export default SvBlock;
