// its literally a function

function round(exportSpeed){
  if(exportSpeed < 0.3) return Math.round(exportSpeed*20)/20;
  else if(exportSpeed < 2) return Math.round(exportSpeed*10)/10;
  else if(exportSpeed < 10) return Math.round(exportSpeed*5)/5;
  else return Math.round(exportSpeed)/exportSpeed;
}

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
    (t0, x0) => `= ${x0.toPrecision(2)}`),
  Linear: new Function("Linear", ["x1", "x2"],
    (t, t0, x0, x, y) => round(x0+x*(1-t)+y*t),
    (t0, x0, x, y) => `${(x+x0).toPrecision(2)} > ${(y+x0).toPrecision(2)}`),
  Sine: new Function("Sine", ["A", "f"],
    (t, t0, x0, A, f) => round(x0+A*Math.sin(((t+t0)*Math.PI*2*f))),
    (t0, x0, A, f) => `sin ${f.toPrecision(2)}Hz\n${(x0-A).toPrecision(2)}~${(x0+A).toPrecision(2)}`),
  Square: new Function("Square", ["A", "f", "DC"],
    (t, t0, x0, A, f, DC) => x0+((((t+t0)*f)%1)<DC?A:0),
    (t0, x0, A, f, DC) => `sqr ${f.toPrecision(2)}Hz\n${(x0).toPrecision(2)}~${(x0+A).toPrecision(2)}\n${(DC*100).toPrecision(3)}%`),
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
