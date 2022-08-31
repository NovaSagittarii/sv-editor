import { EasingFunction } from './EasingFunction.mjs';
import { RenderedObject } from './PIXIRendering.mjs';



class MoveablePoint extends RenderedObject { // HTML interface for messing with PNode
  constructor(linked, color){
    super(linked);
    this.z = 1;
    const g = this.graphics = new PIXI.Graphics();

    g.beginFill(color || 0x000000);
    // g.lineStyle(5, 0xFF0000);
    g.drawRect(0, 0, 10, 10);
    g.position.x = Math.min(Math.max(linked.x*100, 0), 390);
    g.position.y = -linked.t;

    const g2 = this.graphicsLine = new PIXI.Graphics();
    g2.beginFill(0x00FFDF);
    g2.drawRect(0, 0, 1, 1);
    g2.position.set(5, 0); // maybe do curves later
    g.addChild(g2);
  }
  setNext(moveablePoint){
    this.next = moveablePoint;
    this.setEasingLine();
  }
  setTimeScale(timeScale){
    this.z = timeScale;
    this.graphics.position.y = -this.parent.t * timeScale;
    this.setEasingLine(timeScale);
  }
  setEasingLine(){
    if(this.next) this.graphicsLine.scale.y = -Math.max(0, (this.next.parent.t - this.parent.t) * this.z - 10);
  }
}
class PFuncEditor {
  constructor(linked){
    this.parent = linked;
    this.htmlElement = document.createElement("div");
    this.htmlElement.style = `border: 1px black solid;
position: absolute;`;

    const app = this.app = new PIXI.Application({
        width: 400,
        height: 400,
        antialias: true,
        transparent: true,
        resolution: 1
      }
    );
    this.t = 0;
    this.z = 0.01;
    app.stage.pivot.y = -390;
    app.view.addEventListener('wheel', e => {
      if(e.deltaY === 0) return; // displacement
      let up = e.deltaY < 0;
      if(e.ctrlKey){
        this.setTimeScale(this.z = up ? (this.z*2) : (this.z/2));
      }else{
        this.t = Math.max(0, this.t + (up ? -1 : 1)*1000);
        app.stage.position.y = this.t*this.z;
      }
      e.preventDefault();
    });

    let prev;
    this.points = linked.nodes.map((node,i) => {
      const mp = new MoveablePoint(node, i<2?0xF00000:0x000000);
      if(prev) prev.setNext(mp);
      prev = mp;

      app.stage.addChild(mp.graphics);
      mp.setTimeScale(this.z);
      return mp;
    });

    this.htmlElement.append(app.view);
    document.body.append(this.htmlElement);
  }
  setTimeScale(z){ // y = zt, dy=(tdz); dt = tdz/z
    this.t += this.t * (z-this.z) / z;
    this.app.stage.position.y = this.t*z;
    this.z = z;
    this.points.forEach(mp => mp.setTimeScale(z));
  }
  destroy(){
    this.app.destroy(true);
    this.htmlElement.remove();
  }
}

class PNode { // using x(t) so i confused myself less
  constructor(t, x){
    this.t = t;
    this.x = x;
    this.easing = EasingFunction.Constant;
  }
}

// piecewise function (desmos would be pretty cool except i have some weird operations that not sure if i can define well)
class PFunc {
  constructor(parent){
    this.nodes = [];
    this.editor = null;
    this.parent = parent;
  }
  openEditor(){ // why look for a framework or library when you can do it yourself ... it's a cool exercise tho
    this.editor = new PFuncEditor(this);
  }
  closeEditor(){
    this.editor?.destroy();
    this.editor = null;
  }
  setPoint(t, x){
    const n = this.nodes.filter(n => n.t === t)[0];
    if(n) n.x = x;
    else this.nodes.push(new PNode(t, x));
  }
}

export { PFunc, PNode, EasingFunction };
export default PFunc;
