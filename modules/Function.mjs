// its literally a function

class Function {
  // Square, Sine, Cosine, Triangle
  // static Quadratic = new EasingFunction("Quadratic", (x, y=x, t=0) => x+(y-x)*(t**2));
  constructor(name, extraParameters, f, g){
    this.name = name;
    this.id = Symbol(name);
    this.parameterNames = ["t0", "x0", ...extraParameters];
    // this.parameters = this.parameterNames.map(x => 0);
    this.func = f;
    this.getDetails = g;
  }
  getLabel(params){
    return this.getDetails(...params);
  }
  generateParameters(){
    return this.parameterNames.map(x => 0);
  }
  evaluate(t){
    return this.func(...arguments);
  }
  isConstant(){
    return this.name === "Constant";
  }
}

const Functions = {
  Constant: new Function("Constant", [],
    (t, t0, x0) => x0,
    (t0, x0) => `${x0.toPrecision(2)}`),
  Linear: new Function("Linear", ["x1", "x2"],
    (t, t0, x0, x, y) => (x0+x*(1-t)+y*t),
    (t0, x0, x, y) => `${(x+x0).toPrecision(2)} to ${(y+x0).toPrecision(2)}`),
};
Object.entries(Functions).forEach(([name, func]) => {
  Object.defineProperty(Function, name, {
    enumerable: false,
    configurable: false,
    writable: false,
    value: func
  });
});

/*
TODO: n point splines ??
https://github.com/Pomax/bezierjs/blob/master/dist/bezier.cjs
https://gist.github.com/nicholaswmin/c2661eb11cad5671d816
*/

export { Function, Functions };
export default Function;
