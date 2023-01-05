// its literally a function

class Function {
  static Constant = new Function("Constant", [],
    (t, t0, x0) => x0,
    (t0, x0) => `${x0}`);
  static Linear = new Function("Linear", ["x1", "x2"],
    (t, t0, x0, x, y) => (x*(1-t)+y*t),
    (t0, x0, x, y) => `${x} to ${y}`);
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
    return this.getDetails(...params.map(x => x.toFixed(2)));
  }
  generateParameters(){
    return this.parameterNames.map(x => 0);
  }
  evaluate(t){
    return this.func(...arguments);
  }
}

/*
TODO: n point splines ??
https://github.com/Pomax/bezierjs/blob/master/dist/bezier.cjs
https://gist.github.com/nicholaswmin/c2661eb11cad5671d816
*/

export { Function };
export default Function;
