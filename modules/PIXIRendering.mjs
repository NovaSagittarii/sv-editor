import * as Notes from './Notes.mjs';
import SvBlock from './SvBlock.mjs';
import {OutlineFilter} from './OutlineFilter.mjs';
import { MouseButtons } from './Constants.mjs';

class RenderedObject {
  constructor(linked={}){
    this.linked = linked; // TODO: disconnect RenderedObject from Object? (other way might make more sense)

    this.selected = false;
    this.graphics = null;
    // this.z = 1;
  }
  getStart(){
    return this.linked.getStart();
  }
  getEnd(){
    return this.linked.getEnd();
  }
  setTimeScale(timeScale){
    // this.z = timeScale;
    return this.graphics.position.y = ~~(-this.getStart() * timeScale);
  }
  select(){
    this.selected = true;
    if(this.graphics){
      this.graphics.tint = 0xAADDDD;
      this.graphics.filters = [new OutlineFilter(1, 0xd69600)];
    }
    return this;
  }
  deselect(){
    this.selected = false;
    if(this.graphics){
      this.graphics.tint = 0xFFFFFF;
      this.graphics.filters = [];
    }
    return this;
  }
  destroy(){
    this.graphics.parent.removeChild(this.graphics);
  }
}

const measurelines = [null, [1]]
function measureline(x){
  if(x in measurelines) return measurelines[x];
  for(let d = 2; d <= x; d ++){
    if(x/d%1 === 0){
      let z = measureline(x/d).slice(0);
      if(!(x in measurelines)) measurelines[x] = z;
      for(let i = z.length; i > 0; i --) z.splice(i, 0, ...[...new Array(d-1)].map(() => x));
      return z;
    }
  }
} // scuffed procedural way to generate them
for(let i = 1; i < 100; i++) measureline(i);
// console.log(measurelines);

class RenderedLine extends RenderedObject {
  static colorSchemes = measurelines;
  static colors = [null, 0x000000, 0xf26250, 0xb74fa9, 0x37aedc, 0x686868, 0xf8d44f, 0xf8d44f, 0xf8d44f];
  constructor(){
    super();
    this.linked = null;
    this.type = 1;
    this.t = 0;
    const g = this.graphics = new PIXI.Graphics();
    g.beginFill(0x000000);
    g.drawRect(0, 0, 400, 1);
    g.endFill();
  }
  setType(i){
    if(this.type === i) return;
    this.type = i;
    const g = this.graphics;
    g.clear();
    g.beginFill(RenderedLine.colors[i]);
    g.drawRect(0, 0, 400, 1);
    g.endFill();
  }
  setTimeScale(timeScale){
    // this.z = timeScale;
    return this.graphics.position.y = ~~(-this.t * timeScale);
  }
  setPosition(t, z){
    this.t = ~~t;
    return this.setTimeScale(z);
  }
  static calculatePosition(t, z){
    return (~~t)*z;
  }
}

class RenderedNote extends RenderedObject {
  constructor(linked, editor){
    super(linked);
    let g;
    if(editor){
      g = this.graphics = new PIXI.Sprite(editor.sprites.Note);
    }else{
      g = this.graphics = new PIXI.Graphics();
      g.beginFill(0x0077e6);
      g.drawRect(0, 0, 100, 40);
    }
    g.pivot.set(0, g.height); // nudge up
    g.position.set(this.linked.x*100, -this.linked.t);
  }
  setTime(t){ // method for live replay
    // this.graphics.position.y = -(this.t = t);
    this.linked.setTime(t);
  }
}

class RenderedLongNote extends RenderedObject {
  constructor(linked, editor){
    super(linked);
    const g = this.graphics = new PIXI.Container();
    let head, tail, body;
    if(editor){
      head = new PIXI.Sprite(editor.sprites.LongNoteHead);
      tail = new PIXI.Sprite(editor.sprites.LongNoteTail);
      body = new PIXI.Sprite(editor.sprites.LongNoteBody);
    }else{
      head = new PIXI.Graphics();
      head.beginFill(0x00e699);
      head.drawRect(0, 0, 100, 40);
      tail = this.graphicsTail = new PIXI.Graphics();
      tail.beginFill(0x00b87a);
      tail.drawRect(0, 0, 100, 40);
      body = this.graphicsBody = new PIXI.Graphics();
      body.beginFill(0x00b87a);
      body.drawRect(15, 0, 70, 1);
    }

    // tail.position.y = -(this.t$ - this.t);
    // body.scale.y = tail.position.y - head.height - tail.height;

    g.addChild(body, head, tail);
    g.pivot.set(0, head.height); // nudge up so (0,0) is the visually the very bottom
    g.position.set(this.linked.x*100, -this.linked.t);
  }
  setTime(start, end){
    this.linked.setTime(start, end);
  }
  setTimeScale(timeScale){
    // this.z = timeScale;
    this.graphics.position.y = ~~(-this.linked.t * timeScale);
    this.graphicsTail.position.y = ~~(-(this.linked.t$ - this.linked.t) * timeScale);
    this.graphicsBody.scale.y = ~~(-(Math.abs(this.graphicsTail.position.y) - this.graphicsTail.height));
    this.graphicsBody.visible = Math.abs(Math.abs(this.graphicsTail.position.y)-Math.abs(this.graphics.position.y)) > this.graphicsTail.height;
  }
}

class RenderedSvBlock extends RenderedObject {
  constructor(linked, baseEditor){
    super(linked);
    const g = this.graphics = new PIXI.Container();
    // g.filters = [new OutlineFilter(1, 0xd69600)]; // TODO: don't use a filter and just redraw the rect
    const body = this.graphicsBody = new PIXI.Graphics();
    body.beginFill(0xffba1a); // hsl(42, 100%, 55%)
    // body.lineStyle(1, 0xd69600); // hsl(42, 100%, 42%)
    body.drawRect(0, 0, 25, 1);
    body.beginFill(0xefaa0a);
    body.drawRect(25, 0, 25, 1);
    body.alpha = 0.5; // to check for overlap
    if(baseEditor){
      g.pivot.x = -baseEditor.bounds.blockLeft;
    }
    /*this.graphicsDebugDisplay = new PIXI.Text("", {
      fontName: "Arial",
      fontSize: 12,
      align: "center"
    });*/
    const tx = this.graphicsLabel = new PIXI.Text(linked.getLabel(), { // TODO: maybe use bitmaptext later
      fontName: "Arial",
      fontSize: 12,
      align: "left"
    }); // TODO: render other types of sv block
    tx.position.y = -tx.height;
    const line = this.graphicsLine = new PIXI.Graphics();
    this.render();
    body.addChild(line);
    g.addChild(body, tx); //, this.graphicsDebugDisplay
    body.interactive = true;
    body.on('pointerover', () => {
      body.alpha = 1;
      if(baseEditor && !baseEditor.mouseOver) baseEditor.updateMouseOver(this);
    });
    body.on('pointerout', () => {
      body.alpha = 0.5;
      if(baseEditor?.mouseOver == this) baseEditor.updateMouseOver(null);
    });
    body.on('pointerdown', e => {
      console.log("[svblock] tap!", e.data.button, e.data.buttons);
      switch(e.data.button){
        case MouseButtons.LEFT:
          baseEditor.initiateMouseAction(baseEditor.constructor.Actions.MoveSelection);
          console.log(linked.getEnd(), baseEditor.mouseT);
          break;
        case MouseButtons.MIDDLE:
          this.destroy(baseEditor);
          break;
        case MouseButtons.RIGHT:
          if(!this.linked.func.editor){
            this.linked.func.openEditor(this, baseEditor);
            this.linked.func.editor.setPosition(e.data.global.x, e.data.global.y);
          }else{
            this.linked.func.closeEditor();
          }
      }
    });
  }
  render(){ // the thing shown on the rectangle for the svBlock
    this.graphicsLabel.text = this.linked.getLabel();
    return; // TODO: implement render
    const l = this.graphicsLine;
    l.clear();
    let x;
    let y; // should be (t=0)
    l.lineStyle(1, 0x000000);
    l.moveTo(x=RenderedSvBlock.mapXToHorizontalPosition(this.linked.func.nodes[0].x), y=0);
    for(let node of this.linked.func.nodes){
      // if(-y > 1000) l.lineStyle(1, 0x000000);
      l.lineTo(x, y=RenderedSvBlock.mapTToVerticalPosition(node.t));
      l.lineTo(x=RenderedSvBlock.mapXToHorizontalPosition(node.x), y);
      // console.log(x, y);
    }
    l.lineTo(x, y=RenderedSvBlock.mapTToVerticalPosition(this.linked.duration));
    // console.log(x, y);
    this.graphicsLine.scale.y = 1/y;
  }
  static mapXToHorizontalPosition(x){
    return ~~(Math.min(Math.max(x*20, 0), 40)+5);
  }
  static mapTToVerticalPosition(t){
    return ~~(-t/4);
  }
  setTime(start, end){
    this.linked.setTime(start, end);
  }
  setTimeScale(timeScale){
    this.graphics.position.x = this.linked.x * 50; // TODO : dont hardcode width
    this.graphics.position.y = -this.linked.t * timeScale;
    const height = this.graphicsBody.scale.y = -this.linked.duration * timeScale;
    this.graphics.visible = Math.abs(height) >= 1;
  }
  getX(){
    return this.linked.getX();
  }
  setX(x){
    this.linked.setX(x);
  }
  destroy(baseEditor){
    RenderedObject.prototype.destroy.call(this);
    if(baseEditor?.mouseOver == this) baseEditor.mouseOver = null;
    if(baseEditor) baseEditor.removeBlock(this);
  }
}

class RenderedUIAttachment {
  constructor(){
    this.attachedTo = null;
    // this.graphics =
  }
}

/* class RenderedSvColumn extends RenderedObject { // more like a container
  constructor(linked){
    super(linked);
    const g = this.graphics = new PIXI.Container();
    this.blocks = [];
    linked.blocks.forEach(block => {
      const b = new RenderedSvBlock(block);
      this.blocks.push(b);
      g.addChild(b.graphics);
    })
  }
  addBlock(svBlock){
    const b = new RenderedSvBlock(svBlock);
    this.blocks.push(b);
    g.addChild(b.graphics);
  }
  setTimeScale(timeScale){
    this.blocks.forEach(block => block.setTimeScale(timeScale));
  }
} */

function from(obj, baseEditor){
  if(obj instanceof Notes.LongNote) return new RenderedLongNote(obj, baseEditor);
  else if(obj instanceof Notes.Note) return new RenderedNote(obj, baseEditor);
  else if(obj instanceof Notes.SvBlock) return new RenderedSvBlock(obj, baseEditor);
  else return null;
}

export {
  RenderedLine as Line,
  RenderedNote as Note,
  RenderedLongNote as LongNote,
  RenderedSvBlock as SvBlock,
  from,
  RenderedObject
};
