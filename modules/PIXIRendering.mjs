import * as Notes from './Notes.mjs';

class RenderedObject {
  constructor(linked){
    this.parent = linked;
    // this.z = 1;
  }
  setTimeScale(timeScale){
    // this.z = timeScale;
    this.graphics.position.y = ~~(-this.parent.t * timeScale);
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
console.log(measurelines);

class RenderedLine extends RenderedObject {
  static colorSchemes = measurelines;
  static colors = [null, 0x000000, 0xf26250, 0xb74fa9, 0x37aedc, 0x686868, 0xf8d44f, 0xf8d44f, 0xf8d44f];
  constructor(){
    super();
    this.parent = this;
    const g = this.graphics = new PIXI.Graphics();
    g.beginFill(0x000000);
    g.drawRect(0, 0, 400, 1);
  }
  setType(i){
    const g = this.graphics;
    g.clear();
    g.beginFill(RenderedLine.colors[i]);
    g.drawRect(0, 0, 400, 1);
  }
  setPosition(t, z){
    this.t = t;
    this.setTimeScale(z);
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

function from(note){
  if(note instanceof Notes.LongNote) return new RenderedLongNote(note);
  else if(note instanceof Notes.Note) return new RenderedNote(note);
  else return null;
}

export { RenderedLine as Line, RenderedNote as Note, RenderedLongNote as LongNote, from, RenderedObject };
