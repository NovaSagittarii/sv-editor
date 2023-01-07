import { Function, Functions } from './Function.mjs';
import { RenderedObject } from './PIXIRendering.mjs';
import { SvBlock } from './SvBlock.mjs';

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
        this.setPosition(this.x + e.screenX - screenX, this.y + e.screenY - screenY);
      }, {once: true});
    });
    const buttonClose = document.createElement("button");
    buttonClose.innerText = 'x';
    buttonClose.style.background = 'red';
    buttonClose.addEventListener('click', () => {
      this.linked.closeEditor();
    }, {once: true});

    const [config, operation, functionFamily] = [...new Array(3)].map(() => document.createElement('div'));

    const operationInput = document.createElement('select');
    Object.entries(SvBlock.Operation).forEach(([operationName, operation]) => {
      const option = document.createElement('option'); // TODO: move PFuncEditor into SvBlockEditor or some mix, this feels a bit too scuffed
      option.selected = operation === renderedSvBlock.linked.operation;
      option.innerText = operationName.toLowerCase();
      option.value = operationName;
      operationInput.append(option);
    });
    operationInput.addEventListener('change', () => {
      renderedSvBlock.linked.operation = SvBlock.Operation[operationInput.value];
      this.refresh();
    });

    const [operationLabel, functionFamilyLabel] = [...new Array(2)].map(() => document.createElement('span'));
    operationLabel.innerText = "Operation";
    functionFamilyLabel.innerText = "Function";

    operation.append(operationLabel, operationInput);
    const functionFamilyInput = document.createElement('select');
    Object.entries(Functions).forEach(([functionName, func]) => {
      const option = document.createElement('option');
      option.selected = func === this.linked.function;
      option.innerText = functionName;
      option.value = functionName;
      functionFamilyInput.append(option);
    });
    functionFamilyInput.addEventListener('change', () => {
      this.linked.function = Functions[functionFamilyInput.value];
      this.linked.params = Object.assign(this.linked.function.generateParameters(), this.linked.params);
      this.updateSliders(sliders);
    });
    functionFamily.append(functionFamilyLabel, functionFamilyInput);
    config.append(operation, functionFamily);

    const sliders = document.createElement('div');
    this.updateSliders(sliders);

    this.htmlElement.append(buttonMove, buttonClose, config, sliders);
    document.body.append(this.htmlElement);
  }
  destroy(){
    // this.app.destroy(true);
    this.htmlElement.remove();
  }
  updateSliders(slidersDiv){
    slidersDiv.replaceChildren();
    this.linked.function.parameterNames.forEach((name, i) => {
      const div = document.createElement('div');
      div.classList.add('parameter');
      const label = document.createElement('span');
      label.classList.add('parameter_name');
      label.innerText = name;
      const [slider, textarea] = [... new Array(2)].map(() => document.createElement('input'));
      slider.classList.add('parameter_range');
      slider.type = "range";
      slider.min = "-4";
      slider.max = "4";
      slider.step = "0.01";
      slider.value = textarea.value = this.linked.params[i];
      slider.addEventListener('input', () => {
        this.linked.params[i] = textarea.value = slider.valueAsNumber;
        this.refresh();
      });
      textarea.classList.add('parameter_field');
      textarea.addEventListener('change', () => {
        if(isNaN(+textarea.value)) textarea.value = slider.value;
      })
      textarea.addEventListener('input', () => {
        if(!isNaN(+textarea.value)){
          this.linked.params[i] = slider.value = +textarea.value;
          this.refresh();
        }
      })
      div.append(label, slider, textarea);
      slidersDiv.append(div);
    });
    this.refresh();
  }
  refresh(){
    this.renderedSvBlock.render(); // TODO : setup delay to avoid consecutive rerender
  }
  setPosition(x, y){
    this.htmlElement.style.left = (this.x = x) + "px";
    this.htmlElement.style.top = (this.y = y) + "px";
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
