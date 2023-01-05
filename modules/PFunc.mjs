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
    buttonMove.innerText = '\u25a2';
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
    const app = this.app = new PIXI.Application({
        width: 400,
        height: 400,
        antialias: true,
        transparent: true,
        resolution: 1
      }
    );
    this.selectedNode = null;
    this.t = 0;
    this.z = 0.01;
    // app.stage.pivot.y = -390;
    app.view.style.border = "1px black solid";
    app.view.addEventListener('mousemove', this.updateMousePosition.bind(this));
    app.view.addEventListener('click', () => {
      // TODO : binary search
      let nearest = 0;
      let dist = Infinity;
      for(const point of this.points){
        let newDist = Math.abs(this.mouseT - point.linked.t) + Math.abs(this.mouseX - point.linked.x); // TODO: maybe use physical distance later
        if(newDist < dist){
          dist = newDist;
          nearest = point;
        }else break;
      }
      this.select(nearest);
    });
    app.view.addEventListener('wheel', e => {
      if(e.deltaY === 0) return; // displacement
      let up = e.deltaY < 0;
      /* if(e.ctrlKey){
        this.setTimeScale(this.z = up ? (this.z*2) : (this.z/2));
      }else{
        this.t = Math.max(0, this.t + (up ? -1 : 1)*1000);
      } */ // these are controlled by the projectEditor now
      if(e.ctrlKey){ // make it move
        if(this.selectedNode){
          this.selectedNode.setTime(Math.min(Math.max(this.mouseT, (this.selectedNode.prev.linked.t+1)||0), (this.selectedNode.next.linked.t-1)||this.selectedNode.linked.t));
          this.selectedNode.setTimeScale(this.z);
        }
      }else{
        if(!this.selectedNode) this.select(this.points[0]);
        this.select(this.selectedNode[up ? 'next' : 'prev']);
      }
      e.preventDefault();
    });

    // TODO: move keyEvents to the projectEditor
    document.body.addEventListener('keydown', e => {
      if(e.altKey) this.snapToNearestLine = false;
    });
    document.body.addEventListener('keyup', e => {
      if(!e.altKey) this.snapToNearestLine = true;
    });

    const dynamicStage = this.dynamicStage = new PIXI.Container();
    dynamicStage.pivot.y = -390;
    const pointer = this.pointer = new PIXI.Container();
    pointer.pivot.set(0, -2); // align top of pointer to bottom of squares
    const pointerLine = new PIXI.Graphics();
    pointerLine.beginFill(0x000000);
    pointerLine.drawRect(2, 0, 5, 1);
    pointerLine.drawRect(-2, 0, -5, 1);
    const pointerText = this.pointerText = new PIXI.Text("0", {
      fontName: "Arial",
      fontSize: 12,
      align: "right"
    });
    pointerText.anchor.set(0, 1);
    pointer.addChild(pointerLine, pointerText);
    app.stage.addChild(pointer, dynamicStage);

    let prev;
    this.points = linked.nodes.map((node,i) => {
      const mp = new MoveablePoint(node, this); //, i<2?0xF00000:0x000000);
      if(prev){
        prev.setNext(mp);
        mp.setPrev(prev);
      }
      prev = mp;

      dynamicStage.addChild(mp.graphics);
      mp.setTimeScale(this.z);
      return mp;
    });

    this.htmlElement.append(buttonMove, buttonClose, app.view);
    document.body.append(this.htmlElement);
  }
  select(moveablePoint){
    if(!moveablePoint) return;
    if(this.selectedNode) this.selectedNode.deselect();
    moveablePoint.select();
    this.selectedNode = moveablePoint;
  }
  deselect(moveablePoint){
    if(this.selectedNode == moveablePoint){
      moveablePoint.deselect();
      this.selectedNode = null;
    }
  }
  updateCamera(){
    this.dynamicStage.position.y = this.t*this.z;
  }
  setTime(t){
    this.t = t;
    this.updateCamera();
    this.updateMousePosition();
  }
  setTimeScale(z){ // y = zt, dy=(tdz); dt = tdz/z
    // this.t += this.t * (z-this.z) / z;
    this.z = z;
    this.updateCamera();
    this.points.forEach(mp => mp.setTimeScale(z));
  }
  destroy(){
    this.app.destroy(true);
    this.htmlElement.remove();
  }
  updateMousePosition(mouseEvent){
    if(mouseEvent instanceof window.MouseEvent){ // use this to track where mouse is
      this.mouseEventX = mouseEvent.offsetX;
      this.mouseEventY = mouseEvent.offsetY;
    }
    this.mouseT = this.t - (this.mouseEventY - this.app.screen.height)/this.z;
    if(this.snapToNearestLine && this.projectEditor) this.mouseT = this.projectEditor.getNearestLine(this.mouseT + this.renderedSvBlock.linked.t) - this.renderedSvBlock.linked.t;
    this.mouseX = this.mouseEventX / 100;
    this.pointer.position.set(this.mouseEventX, this.app.screen.height + (this.t-this.mouseT)*this.z);
    this.pointerText.text = ~~this.mouseT;
  }
  updatePoint(moveablePoint){
    this.renderedSvBlock.renderThumbnail(); // TODO : setup delay to avoid consecutive rerender
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
    throw 'not implemented';
    if(this.editor) throw 'pfunc editor already opened';
    this.editor = new PFuncEditor(this, renderedSvBlock, baseEditor);
    if(baseEditor){
      this.editor.setTime(baseEditor.t);
      this.editor.setTimeScale(baseEditor.z);
    }
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
