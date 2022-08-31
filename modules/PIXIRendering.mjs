import * as Notes from './Notes.mjs';
import SvColumn from './SvColumn.mjs';

class RenderedObject {
  constructor(linked){
    this.parent = linked;
    // this.z = 1;
  }
  setTimeScale(timeScale){
    // this.z = timeScale;
    return this.graphics.position.y = ~~(-this.parent.t * timeScale);
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
    this.parent = this;
    this.type = 1;
    const g = this.graphics = new PIXI.Graphics();
    g.beginFill(0x000000);
    g.drawRect(0, 0, 400, 1);
  }
  setType(i){
    if(this.type === i) return;
    this.type = i;
    const g = this.graphics;
    g.clear();
    g.beginFill(RenderedLine.colors[i]);
    g.drawRect(0, 0, 400, 1);
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
  constructor(linked){
    super(linked);
    const g = this.graphics = new PIXI.Graphics();
    g.beginFill(0x0077e6);
    g.drawRect(0, 0, 100, 40);

    g.pivot.set(0, g.height); // nudge up
    g.position.set(linked.x*100, -linked.t);
  }
}

class RenderedLongNote extends RenderedObject {
  constructor(linked){
    super(linked);
    const g = this.graphics = new PIXI.Container();
    const head = new PIXI.Graphics();
    head.beginFill(0x00e699);
    head.drawRect(0, 0, 100, 40);
    const tail = this.graphicsTail = new PIXI.Graphics();
    tail.beginFill(0x00b87a);
    tail.drawRect(0, 0, 100, 40);
    tail.position.y = -(linked.t$ - linked.t);
    const body = this.graphicsBody = new PIXI.Graphics();
    body.beginFill(0x00b87a);
    body.drawRect(15, 0, 70, 1);
    body.scale.y = tail.position.y - head.height - tail.height;

    g.addChild(body, head, tail);
    g.pivot.set(0, head.height); // nudge up so (0,0) is the visually the very bottom
    g.position.set(linked.x*100, -linked.t);
  }
  setTimeScale(timeScale){
    // this.z = timeScale;
    this.graphics.position.y = -this.parent.t * timeScale;
    this.graphicsTail.position.y = -(this.parent.t$ - this.parent.t) * timeScale;
    this.graphicsBody.scale.y = -(Math.abs(this.graphicsTail.position.y) - this.graphicsTail.height);
  }
}

class RenderedSvBlock extends RenderedObject {
  constructor(linked){
    super(linked);
    const g = this.graphics = new PIXI.Container();
    const body = this.graphicsBody = new PIXI.Graphics();
    body.beginFill(0xffba1a); // hsl(42, 100%, 55%)
    body.drawRect(0, 0, 50, 1);
    const tx = this.graphicsLabel = new PIXI.Text("sv:set", { // TODO: maybe use bitmaptext later
      fontName: "Arial",
      fontSize: 12,
      align: "right"
    }); /* TODO: render other types of sv block */
    tx.position.y = -tx.height;
    const line = this.graphicsLine = new PIXI.Graphics();
    this.renderThumbnail();
    body.addChild(line);
    g.addChild(body, tx);
  }
  renderThumbnail(){ // the thing shown on the rectangle for the svBlock
    const l = this.graphicsLine;
    let x;
    let y; // should be (t=0)
    l.lineStyle(1, 0x000000);
    l.moveTo(x=RenderedSvBlock.mapXToHorizontalPosition(this.parent.func.nodes[0].x), y=0);
    for(let node of this.parent.func.nodes){
      // if(-y > 1000) l.lineStyle(1, 0x000000);
      l.lineTo(x, y=RenderedSvBlock.mapTToVerticalPosition(node.t));
      l.lineTo(x=RenderedSvBlock.mapXToHorizontalPosition(node.x), y);
      console.log(x, y);
    }
    l.lineTo(x, y=RenderedSvBlock.mapTToVerticalPosition(this.parent.duration));
    console.log(x, y);
    this.graphicsLine.scale.y = 1/y;
  }
  static mapXToHorizontalPosition(x){
    return Math.min(Math.max(x*10, 5), 45);
  }
  static mapTToVerticalPosition(t){
    return -t/4;
  }
  setTimeScale(timeScale){
    this.graphics.position.y = -this.parent.t * timeScale;
    this.graphicsBody.scale.y = -this.parent.duration * timeScale;
  }
}

class RenderedSvColumn extends RenderedObject { // more like a container
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
}

function from(obj){
  if(obj instanceof Notes.LongNote) return new RenderedLongNote(obj);
  else if(obj instanceof Notes.Note) return new RenderedNote(obj);
  else if(obj instanceof Notes.SvBlock) return new RenderedSvBlock(obj);
  else if(obj instanceof SvColumn) return new RenderedSvColumn(obj);
  else return null;
}

export {
  RenderedLine as Line,
  RenderedNote as Note,
  RenderedLongNote as LongNote,
  RenderedSvBlock as SvBlock,
  RenderedSvColumn as SvColumn,
  from,
  RenderedObject
};
