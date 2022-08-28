import { EasingFunction } from './EasingFunction.mjs';




class MoveablePoint { // HTML interface for messing with PNode
  constructor(linked){
    this.parent = linked;
    this.htmlElement = document.createElement("div");
    this.htmlElement.classList.add('moveable-point');
    this.htmlElement.style.left = linked.x/10*200*5 + "px";
    this.htmlElement.style.bottom = linked.t/4 + "px";
    this.htmlElement.innerText = linked.x.toFixed(2) + 'x';
    this.htmlElement.addEventListener('click', () => { // yunno instead of adding eventlisteners onto stuff we can just listener for click and figure out the nearest thing from there too hmmm
      console.log(linked);
    });
  }
}
class PFuncEditor {
  constructor(linked){
    this.parent = linked;
    this.htmlElement = document.createElement("div");
    this.htmlElement.style = `border: 1px black solid;
overflow-y: scroll;
overflow-x: hidden;
height: 400px;
width: 1000x;`;
    let container = document.createElement("div");
    container.style = `position:relative`;
    container.style.height = linked.parent.duration/4 + "px";

    linked.nodes.forEach(node => {
      container.append(new MoveablePoint(node).htmlElement);
    })

    this.htmlElement.append(container);
    document.body.append(this.htmlElement);
  }
  destroy(){
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
    this.editor.destroy();
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
