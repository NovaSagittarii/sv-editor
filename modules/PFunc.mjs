import { Function } from './Function.mjs';
import { RenderedObject } from './PIXIRendering.mjs';

class PFuncEditor {
  constructor(linked, renderedSvBlock, projectEditor){
    this.linked = linked;
    this.renderedSvBlock = renderedSvBlock;
    this.projectEditor = projectEditor;
    this.snapToNearestLine = true;

    this.htmlElement = document.createElement("div");
    this.htmlElement.style = `position: absolute; background: #f3f3ed80`;
    const buttonMove = document.createElement("button");
    this.x = 0;
    this.y = 0;
    buttonMove.innerText = this.linked.getLabel();
    buttonMove.addEventListener('mousedown', e => {
      let {screenX, screenY} = e;
      document.body.addEventListener('mouseup', e => {
        this.htmlElement.style.left = (this.x += e.screenX - screenX) + 'px';
        this.htmlElement.style.top = (this.y += e.screenY - screenY) + 'px';
      }, {once: true});
    });
    const buttonClose = document.createElement("button");
    buttonClose.innerText = 'x';
    buttonClose.style.background = 'red';
    buttonClose.addEventListener('click', () => {
      this.linked.closeEditor();
    }, {once: true});

    const sliders = document.createElement('div');
    this.linked.function.parameterNames.forEach((name, i) => {
      const [div, label] = [...new Array(2)].map(() => document.createElement('div'));
      label.innerText = name;
      const [slider, textarea] = [... new Array(2)].map(() => document.createElement('input'));
      slider.type = "range";
      slider.min = "-4";
      slider.max = "4";
      slider.step = "0.01";
      slider.value = textarea.value = this.linked.params[i];
      slider.addEventListener('input', () => {
        this.linked.params[i] = textarea.value = slider.valueAsNumber;
        this.refresh();
      });
      textarea.addEventListener('input', () => {
        if(isNaN(textarea.value)) textarea.value = slider.value;
        else this.linked.params[i] = slider.value = textarea.valueAsNumber;
        this.refresh();
      })
      div.append(label, slider, textarea);
      sliders.append(div);
    });

    this.htmlElement.append(buttonMove, buttonClose, sliders);
    document.body.append(this.htmlElement);
  }
  destroy(){
    // this.app.destroy(true);
    this.htmlElement.remove();
  }
  refresh(){
    this.renderedSvBlock.render(); // TODO : setup delay to avoid consecutive rerender
  }
}

// piecewise function (desmos would be pretty cool except i have some weird operations that not sure if i can define well)
class PFunc {
  constructor(parent){
    this.function = Function.Constant;
    this.params = this.function.generateParameters();
    this.editor = null;
    this.linked = parent;
  }
  isConstant(){
    return this.function.isConstant();
  }
  getLabel(){
    return this.function.getLabel(this.params);
  }
  integrate(a, b){
    // do desmos stuff here maybe
    let sum = 0;
    for(let t = a; t < b; t ++) sum += Math.min(evaluate(t), 1e6*1e4);
    return sum;
  }
  evaluate(t){
    return this.function.evaluate(t, ...this.params);
  }
  *range(start=0, end=this.linked.duration){
    throw 'not implemented';
    let i = 0;
    let t = start;
    while(t < end){
      while(this.nodes[i+1] && this.nodes[i+1].t <= t) i ++;
      yield [t, this.nodes[i].easing.func(this.nodes[i].x, this.nodes[i+1]?.x, (t-this.nodes[i].t)/(this.nodes[i+1]?.t-this.nodes[i].t)), (this.nodes[i+1]?.t||this.linked.duration) - this.nodes[i].t];
      t++; // i cant believe i forgot this line the first time and didnt notice it... smh infinite generator loop
    }
  }
  openEditor(renderedSvBlock, baseEditor){ // why look for a framework or library when you can do it yourself ... it's a cool exercise tho
    // throw 'not implemented';
    if(this.editor) throw 'pfunc editor already opened';
    this.editor = new PFuncEditor(this, renderedSvBlock, baseEditor);
    /*if(baseEditor){
      this.editor.setTime(baseEditor.t);
      this.editor.setTimeScale(baseEditor.z);
    }*/
  }
  closeEditor(){
    this.editor?.destroy();
    this.editor = null;
  }
  set(args){
    for(const k in this.params) this.params[k] = args[k] || 0;
  }
  update(args){
    for(const k in this.params) this.params[k] = k in args ? args[k] : this.params[k];
  }
  toLatex(){
    throw 'not implemented';
    // for desmos calculations ~~cuz numerical piecewise is terrible for performance~~ (or maybe misusing yield?, yes turned out to be misuing yield)
    // f\left(x\right)=\left\{0<x<1:4,1<x<2:3\right\}
    let piecewise = "";
    for(let i = 0; i < this.nodes.length; i ++){
      const node = this.nodes[i];
      const end = this.nodes[i+1]?.t||this.linked.duration;
      piecewise += `${(node.t/1000).toFixed(3)}<x\\le${(end/1000).toFixed(3)}:${Math.min(30, node.x).toFixed(2)},`;
    }
    return `f\\left(x\\right)=\\left\\{${piecewise.replace(/,$/, '')}\\right\\}`;
  }
}

export { PFunc, Function };
export default PFunc;
