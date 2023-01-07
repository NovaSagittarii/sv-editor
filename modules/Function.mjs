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
  Sine: new Function("Sine", ["A", "f"],
    (t, t0, x0, A, f) => x0+A*Math.sin(((t+t0)*Math.PI*2*f)),
    (t0, x0, A, f) => `sin ${(x0-A).toPrecision(2)} to ${(x0+A).toPrecision(2)} @ ${f.toPrecision(2)}Hz`),
  Square: new Function("Square", ["A", "f", "DC"],
    (t, t0, x0, A, f, DC) => x0+((((t+t0)*f)%1)<DC?A:0),
    (t0, x0, A, f, DC) => `sqr ${(x0).toPrecision(2)} to ${(x0+A).toPrecision(2)} @ ${f.toPrecision(2)}Hz ${(DC*100).toPrecision(3)}%`),
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
