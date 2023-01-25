import { Note, LongNote } from './Notes.mjs';
import { MouseButtons } from './Constants.mjs';
import * as Rendered from './PIXIRendering.mjs';
import SpriteRenderer from './PIXIRenderedSprites.mjs'
import { SvBlock } from './SvBlock.mjs';

import { Cull } from '@pixi-essentials/cull';

const Actions = Object.freeze({
  PlaceSVBlock: Symbol("place sv block"),
  MoveSelection: Symbol("move selected items"),
});

// console.log(Rendered);

class ProjectEditor {
  static Actions = Actions;
  constructor(linked){
    this.bounds = {
      noteLeft: 0,
      noteRight: 400,
      blockLeft: 400,
      blockRight: 650,
      resultLeft: 650,
      resultRight: 750,
      liveLeft: 750,
      liveRight: 1150
    };

    this.linked = linked;
    this.htmlElement = document.createElement("div");
    this.htmlElement.style = `position: absolute;
overflow:hidden;
width:100vw;
height:100vh;`;
    const app = this.app = new PIXI.Application({
        resizeTo: window,
        antialias: true,
        transparent: true,
        resolution: 1
      }
    );
    // const cull = new Cull({ recursive: true, toggle: 'renderable' });
    // cull.add(app.stage);
    // app.renderer.on('prerender', () => cull.cull(app.renderer.screen));

    this.sprites = new SpriteRenderer(app);
    const dynamic = this.dynamicStage = new PIXI.Container(); // editor side
    const projected = this.projectedStage = new PIXI.Container(); // result side
    this.t = 0;
    this.mouseX = this.mouseY = this.mouseT = 0;
    this.mouseOver = null;
    this.mouseAction = null;
    this.prevSnap = 0; // if we're gonna be rendering measurelines might as well use them :D
    this.nextSnap = 0;
    this.prevMeasure = 0;
    this.nextMeasure = 0;
    this.z = 0.01;
    this.subdivisions = 4;
    app.view.addEventListener('contextmenu', event => event.preventDefault());
    app.view.addEventListener('mousemove', e => {
      [this.mouseX, this.mouseY] = [e.offsetX, e.offsetY];
      this.refreshMousePosition();
      /*if(this.mouseOver) this.mouseOver.graphics.tint = 0xFFFFFF;
      if(e.offsetX < 400){
        let mouseCol = Math.floor(e.offsetX/400*this.linked.metadata.Difficulty.CircleSize);
        console.log(mouseCol, t);
        for(let note of this.notes){
          let bottomT = note.linked.t;
          let topT = note.linked.getEnd() + 40/this.z;
          if(mouseCol === note.linked.x && t > bottomT && t < topT){
            this.mouseOver = note;
            break;
          }
        }
      }else{

      }
      if(this.mouseOver) this.mouseOver.graphics.tint = 0x555555;*/
    });
    app.view.addEventListener('pointerdown', e => { // fix eventlisteners
      // console.log("pointerdown", e.offsetX, e.offsetY);
      if(this.mouseOver){

      }else{
        if(e.offsetX < this.bounds.noteRight){ // notes

        }else if(e.offsetX < this.bounds.blockRight){ // sv columns
          if(e.button === MouseButtons.LEFT) this.initiateMouseAction(Actions.PlaceSVBlock);
        }
      }
    });
    app.view.addEventListener('pointerup', e => {
      // console.log("pointerup", e.offsetX, e.offsetY, this.mouseAction)
      if(this.mouseOver && !this.mouseAction){

      }else{
        // if(e.offsetX < this.bounds.noteRight){ // notes
        // }else if(e.offsetX < this.bounds.blockRight){ // sv columns
        // }
        this.resolveMouseAction();
      }
    });
    app.view.addEventListener('wheel', e => {
      if(e.deltaY === 0) return; // displacement
      let up = e.deltaY < 0;
      if(e.ctrlKey){
        this.setTimeScale(this.z = up ? (this.z*2) : (this.z/2));
      }else{
        // if lines arent rendered completely cuz its zoomed out too much just use 1 second default (no ternary cuz thats unreadable)
        if(this.lines[this.lines.length-1].t < this.t){
          this.setTime(Math.max(0, this.t + (up ? -1 : 1)*1000*(e.shiftKey ? 10 : 1)));
        }else{
          if(e.altKey){
            this.setTime(this.t + (up ? -1 : 1));
          } else this.setTime(Math.max(0, this[(!up?"next":"prev")+(!e.shiftKey?"Snap":"Measure")]));
        }
      }
      e.preventDefault();
    });

    // app.view.addEventListener('keydown', e => { // keydown only fires on contenteditable stuff
    document.body.addEventListener('keydown', e => {
      if(e.keyCode>=32) console.log(e.keyCode);
      this.songAudio = this.linked.songAudio;
      switch(e.keyCode){
        case 32: // space
          if(this.songAudio.playing()){
            this.songAudio.pause();
            app.ticker.remove(this.syncTimeToAudio, this);
          }else{
            this.songAudio.seek(this.t/1000);
            this.songAudio.play();
            app.ticker.add(this.syncTimeToAudio, this);
          }
          break;
      }
    });

    this.lines = [...new Array(50)].map(x => {
      const line = new Rendered.Line();
      dynamic.addChild(line.graphics);
      return line;
    });

    this.notes = [];
    linked.notes.forEach(this.addNote.bind(this));

    this.blocks = [];
    linked.blocks.forEach(this.addBlock.bind(this));

    let line = new Rendered.Line().graphics;
    line.position.y = 1;
    line.scale.x = (this.bounds.resultRight - this.bounds.noteLeft) / line.width;
    line.scale.y = 3;
    line.alpha = 0.8;
    let line2 = new Rendered.Line().graphics;
    line2.position.set(this.bounds.liveLeft, 1);
    line2.scale.x = (this.bounds.liveRight - this.bounds.liveLeft) / line2.width;
    line2.scale.y = 3;
    line2.alpha = 1;

    projected.position.x = this.bounds.resultRight;
    projected.scale.x = 0.5;

    const result = this.resultGraphics = new PIXI.Graphics();
    result.position.set(this.bounds.resultLeft, 1);
    dynamic.addChild(result);

    this.refreshOutput();

    this.setTime();
    app.stage.addChild(dynamic, projected, line, line2);
    this.htmlElement.append(app.view);
    document.body.append(this.htmlElement);

    this.setTimeScale(0.32); // syncs everything
  }
  setTime(time){
    if(time !== undefined) this.t = time;
    this.app.stage.pivot.y = -(this.app.view.height-100);
    // this.dynamicStage.pivot.y = 40; // nudge up everything
    this.dynamicStage.position.y = this.t*this.z;
    this.projectedStage.position.y = this.displacement[~~this.t];

    let i = 0;
    let currentTimingPoint = this.linked.timingPoints[0]; // TODO: use something O(1) instead of O(n)
    while(i < this.linked.timingPoints.length){
      const timingPoint = this.linked.timingPoints[i];
      if(timingPoint.t > this.t) break;
      currentTimingPoint = timingPoint;
      i ++;
    }
    let t = this.t - 100/this.z;  // should be very bottom, y=zt; t=y/z
    // let prevTime = 0; // TODO: avoid rendering if they're too close
    // let prevY = 0;
    let mspb = 60000 / currentTimingPoint.bpm;
    t = Math.floor(t / mspb -1) * mspb + (currentTimingPoint.t)%mspb;
    let k = 0;
    let jStart = 0;
    this.nextSnap = this.nextMeasure = 0;
    this.lines.forEach((line, j) => { // TODO : lines are kinda buggy on variable bpm stuff
      let J = j - jStart;
      let time = t + 60000 / currentTimingPoint.bpm / this.subdivisions * J;
      let truncatedTime = ~~time;
      while(time > this.linked.timingPoints[i+1]?.t){
        i ++;
        currentTimingPoint = this.linked.timingPoints[i];
        time = t = currentTimingPoint.t;
        truncatedTime = ~~time;
        jStart = j;
        J = 0;
      }
      line.setType(Rendered.Line.colorSchemes[this.subdivisions][J % this.subdivisions]);
      line.setPosition(time, this.z);
      if(time < this.t-1.5) this.prevSnap = truncatedTime;
      if(time > this.t+1.5 && !this.nextSnap) this.nextSnap = truncatedTime;
      if(J % this.subdivisions === 0){
        if(time < this.t-1.5) this.prevMeasure = truncatedTime;
        if(time > this.t+1.5 && !this.nextMeasure) this.nextMeasure = truncatedTime;
      } // to get all measure snaps: this.lines.map(l => l.t)
    });

    // this.blocks.forEach(b => {
    //   const block = b.linked;
    //   const svBlockEditor = block.func.editor;
    //   if(svBlockEditor && this.t >= block.t && this.t <= block.t+block.duration){ // filter condition
    //     svBlockEditor.setTimeScale(this.z);
    //     svBlockEditor.setTime(this.t-block.t);
    //   }
    //   /* b.graphicsDebugDisplay.text = block.func.evaluate(this.t - block.t).toFixed(3) + 'x';
    //   b.graphicsDebugDisplay.position.y = -this.dynamicStage.position.y - b.graphics.position.y;
    //   b.graphicsDebugDisplay.anchor.set(0, 0); */
    // });

    // some tree structure seems appropriate for culling (esp since they dont move around much)
    if(this.renderedMinT === void 0 || (this.t < this.renderedMinT || this.t > this.renderedMaxT)) this.refreshCulling();
    this.refreshMousePosition();
  }
  refreshMousePosition(){
    const dy = this.mouseY - (this.app.view.height-100);
    this.mouseT = this.t - dy/this.z;
    this.mouseTAligned = this.getNearestLine(Math.floor(this.mouseT));
    this.refreshMouseAction();
  }
  refreshCulling(){ // return;
    const viewport = this.app.screen;
    const minY = viewport.y - 1000;
    const maxY = viewport.height + 500;
    this.renderedMinT = this.t - (maxY - (this.app.view.height-100))/this.z;
    this.renderedMaxT = this.t - (minY + (this.app.view.height-100))/this.z;
    this.notes.forEach(n => {
      const bounds = n.graphics.getBounds();
      n.graphics.renderable = n.graphics.interactive = n.graphics.interactiveChildren = n.linked.projected.graphics.renderable = bounds.y+bounds.height>=minY && bounds.y-bounds.height <= maxY;
    })
    this.blocks.forEach(n => {
      const bounds = n.graphics.getBounds();
      n.graphics.renderable = n.graphics.interactive = n.graphics.interactiveChildren = bounds.y+bounds.height>=minY && bounds.y-bounds.height <= maxY;
    })
    this.refreshResult();
  }
  setTimeScale(z){
    // y = zt
    /*this.t += this.t * (z-this.z) / z;
    this.app.stage.position.y = this.t*z;*/
    this.setTime(this.t + this.t * (z-this.z) / z);
    this.z = z;
    this.notes.forEach(n => n.setTimeScale(z));
    this.blocks.forEach(block => block.setTimeScale(z));
    this.refreshCulling();
  }
  syncTimeToAudio(){
    if(!this.songAudio) throw "audio file not found";
    this.setTime(this.songAudio.seek()*1000);
  }
  getNearestLine(t){ // TODO : binary search
    let newT = t;
    let diff = Infinity;
    for(let i = 0; i < this.lines.length; i ++){
      var newDiff = Math.abs(this.lines[i].t - t);
      if(newDiff <= diff){
        diff = newDiff;
        newT = this.lines[i].t;
      } else return newT;
    }
    return newT;
  }
  addNote(note){
    const n = Rendered.from(note);
    this.dynamicStage.addChild(n.graphics);
    const n2 = Rendered.from(note.clone());
    note.projected = n2;
    n2.setTimeScale(1); // TODO: uhh i'll sync this later
    this.projectedStage.addChild(n2.graphics);
    this.notes.push(n);
    return n;
  }
  addBlock(block){
    const b = Rendered.from(block, this);
    // b.graphics.position.x = this.bounds.blockLeft + 50*block.x;
    b.setTimeScale(this.z);
    this.dynamicStage.addChild(b.graphics);
    this.blocks.push(b);
    return b;
  }
  removeNote(note){
    // TODO: implement
  }
  removeBlock(block){ // TODO: binary search? or use map<int, Block>
    // call from RenderedObject since this only updates virtual objects and not the rendered ones
    let i = this.blocks.indexOf(block);
    if(i >= 0){
      this.blocks.splice(i, 1);
      this.linked.removeBlock(block.linked);
    } else console.warn("remove block -- block not found", block);
  }
  refreshOutput(){
    let _start = performance.now();
    this.linked.calculateSpeedOutput(); // TODO: only update portions instead of refreshing the entire thing
    this.displacement = [...new Array(this.linked.speed.length)];
    for(let i in this.displacement){
      this.displacement[i] = (this.displacement[i-1]||0) + Math.min(1e3, this.linked.speed[i]);
    }
    this.linked.notes.forEach(n => { // TODO: good question why its -1, probably some off by one error.. but fix that later
      n.projected.setTime(this.displacement[n.t-1]||0, n.t$&&this.displacement[n.t$-1]||0);
      n.projected.setTimeScale(1);
    });
    console.log("= total refresh time", 0|(performance.now()-_start), "ms")
    this.refreshResult();
  }
  refreshResult(){
    const result = this.resultGraphics;
    result.clear();
    result.pivot.set(0, 0);
    result.position.set(0, 0);
    result.scale.set(1, 1);
    result.lineStyle(2, "0x000000");
    const buffer = Math.floor(this.renderedMaxT-this.renderedMinT);
    const start = Math.max(0, Math.floor(this.renderedMinT - buffer));
    const end = Math.min(this.linked.speed.length, Math.floor(this.renderedMaxT + buffer));
    result.moveTo(Math.min(100, Math.max(0, this.linked.speed[start]*25)), 0);
    for(let i = start; i <= end; i ++){
      result.lineTo(Math.min(100, Math.max(0, this.linked.speed[i]*25)), i-start);
    }
    // result.pivot.set(0, result.height);
    result.position.set(this.bounds.resultLeft, ~~(-start*this.z));
    result.scale.set(1, -this.z);
  }
  initiateMouseAction(action, source=null){
    this.abortMouseAction();
    switch(action){
      case Actions.PlaceSVBlock: {
        const preview = Rendered.from(new SvBlock(), this);
        const x = Math.floor((this.mouseX-this.bounds.blockLeft)/((this.bounds.blockRight-this.bounds.blockLeft)/5));
        // preview.graphics.position.x = this.bounds.blockLeft + 50*x;
        preview.setX(x);
        preview.graphics.interactive = preview.graphics.interactiveChildren = false;
        preview.graphicsBody.tint = 0xaaccee;
        this.dynamicStage.addChild(preview.graphics);
        this.mouseAction = {
          type: action,
          x: x,
          t: this.mouseTAligned,
          preview: preview,
        };
        this.refreshMouseAction();
        break;
      }
      case Actions.MoveSelection: {
        const sources = [source || this.mouseOver];
        this.mouseAction = {
          type: action,
          mouseX: this.mouseX,
          mouseT: this.mouseTAligned,
          sources: sources,
          previews: sources.map(source => {
            const preview = Rendered.from(source.linked.clone(), this);
            preview.graphics.interactive = preview.graphics.interactiveChildren = false;
            preview.graphicsBody.tint = 0xff0000;
            this.dynamicStage.addChild(preview.graphics);
            return preview;
          }),
        };
        this.refreshMouseAction();
        break;
      }
    }
  }
  refreshMouseAction(){
    if(!this.mouseAction) return;
    switch(this.mouseAction.type){
      case Actions.PlaceSVBlock:
        if(this.mouseOver){
          // console.log(this.mouseOver.linked.x, this.mouseAction.x);
          if(this.mouseOver.linked.x === this.mouseAction.x) this.mouseTAligned = Math.max(this.mouseAction.t, this.mouseTAligned) >= this.mouseOver.getEnd() ? this.mouseOver.getEnd() : this.mouseOver.getStart(); // same column, so snap to closer to first
          else this.mouseTAligned = this.mouseT > (this.mouseOver.getStart()+this.mouseOver.getEnd())/2 ? this.mouseOver.getEnd() : this.mouseOver.getStart(); // diff column so snap to nearer side
        }
        this.mouseAction.preview.setTime(Math.min(this.mouseAction.t, this.mouseTAligned), Math.max(this.mouseAction.t, this.mouseTAligned));
        this.mouseAction.preview.setTimeScale(this.z);
        // console.log(this.mouseAction.preview);
        // console.log(this.mouseAction.t, this.mouseTAligned, this.mouseAction);
        break;
      case Actions.MoveSelection: {
        const {dx, dt} = this.mouseAction;
        this.mouseAction.dx = Math.round((this.mouseX - this.mouseAction.mouseX)/50);
        this.mouseAction.dt = this.mouseTAligned - this.mouseAction.mouseT;
        if(dx !== this.mouseAction.dx || dt !== this.mouseAction.dt){
          for(let i = 0; i < this.mouseAction.sources.length; i ++){
            const n = this.mouseAction.sources[i];
            this.mouseAction.previews[i].setX(n.getX() + this.mouseAction.dx);
            this.mouseAction.previews[i].setTime(n.getStart() + this.mouseAction.dt, n.getEnd() + this.mouseAction.dt);
            this.mouseAction.previews[i].setTimeScale(this.z);
          }
        }
        break;
      }
    }
  }
  resolveMouseAction(){ // process input
    if(!this.mouseAction) return;
    switch(this.mouseAction.type){
      case Actions.PlaceSVBlock:
        if(this.mouseAction.t !== this.mouseTAligned)
          this.linked.addBlock(new SvBlock(SvBlock.Operation.ADD, this.mouseAction.x, Math.min(this.mouseAction.t, this.mouseTAligned), Math.abs(this.mouseTAligned - this.mouseAction.t)));
        break;
      case Actions.MoveSelection:
        for(let i = 0; i < this.mouseAction.sources.length; i ++){
          const n = this.mouseAction.previews[i];
          this.mouseAction.sources[i].setX(n.getX());
          this.mouseAction.sources[i].setTime(n.getStart(), n.getEnd());
          this.mouseAction.sources[i].setTimeScale(this.z);
        }
        // for(const n of this.mouseAction.sources){
        //   // update position
        // }
        // console.log('dt', this.mouseAction.dt, 'dx', this.mouseAction.dx);
    }
    this.abortMouseAction();
  }
  abortMouseAction(){ // cleanup previews
    if(!this.mouseAction) return;
    switch(this.mouseAction.type){
      case Actions.PlaceSVBlock:
        this.mouseAction.preview.destroy();
        break;
      case Actions.MoveSelection:
        for(const p of this.mouseAction.previews) p.destroy();
    }
    this.mouseAction = null;
  }
}

class Project {
  static RESOURCE_BACKGROUND = "background";
  static RESOURCE_AUDIO = "audio";
  constructor(){
    this.metadata = {};
    this.resources = {
      background: null,
      audio: null,
    };
    this.notes = [];
    this.timingPoints = [];
    this.blocks = [];
    this.editor = null;
    this.songAudio = null;
  }
  openEditor(){
    if(this.editor) throw 'project editor already opened';
    this.editor = new ProjectEditor(this);
  }
  closeEditor(){
    this.editor?.destroy();
    this.editor = null;
  }
  setResource(k, v){
    this.resources[k] = v; // oop notation would be nice, it is a lil troll tho i think
  }
  loadResources(files){
    const audioFile = files.filter(x => x.name === this.resources.audio)[0];
    if(!audioFile) throw "audio file not found!";
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      this.songAudio = new Howl({
        src: reader.result,
        format: audioFile.name.split('.').pop().toLowerCase() // always give file extension: this is optional but helps
      });
      this.songAudio.once('load', () => console.log("Audio is loaded"));
    });
    reader.readAsDataURL(audioFile);
  }
  addBlock(){
    for(const block of arguments){
      this.blocks.push(block);
      this.editor?.addBlock(block);
    }
    // TODO: X shifting if collisions
  }
  removeBlock(){
    for(const block of arguments){
      let i = this.blocks.indexOf(block); // bin search?
      if(i >= 0){
        this.blocks.splice(i, 1);
      }
    }
  }
  calculateSpeedOutput(){
    this.editor?.app.stop();
    let _start = performance.now();
    this.blocks.sort((a,b) => a.x-b.x || a.t-b.t); // TODO : check for collisions ?? (currently assumes no collision)
    this.speed = [...new Array(this.notes[this.notes.length-1].getEnd())].map(() => 1);
    for(const block of this.blocks) block.applyOnto(this.speed);
    this.editor?.app.start();
    console.log("== total calculation time", 0|(performance.now()-_start), "ms")
  }
}

const sortByTime = arr => arr.sort((a,b) => a.t-b.t);

export default Project;
export { Project, ProjectEditor, sortByTime };
