class EasingFunction {
  static Constant = new EasingFunction("Constant", (x, y=x, t=0) => x);
  static Linear = new EasingFunction("Linear", (x, y=x, t=0) => (x*(1-t)+y*t));
  static Quadratic = new EasingFunction("Quadratic", (x, y=x, t=0) => x+(y-x)*(t**2));
  constructor(name, f){
    this.name = name;
    this.id = Symbol(name);
    this.func = f; // P0, P1, t (t bound to [0,1]) ; do easing between (0,P0) and (1,P1)
  }
}

/*
TODO: n point splines ??
https://github.com/Pomax/bezierjs/blob/master/dist/bezier.cjs
https://gist.github.com/nicholaswmin/c2661eb11cad5671d816
*/

export { EasingFunction };
export default EasingFunction;
