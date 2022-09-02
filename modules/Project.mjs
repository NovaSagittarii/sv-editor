import { Note, LongNote } from './Notes.mjs';
import * as Rendered from './PIXIRendering.mjs';

// console.log(Rendered);

class ProjectEditor {
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
    const dynamic = this.dynamicStage = new PIXI.Container();
    this.t = 0;
    this.prevSnap = 0; // if we're gonna be rendering measurelines might as well use them :D
    this.nextSnap = 0;
    this.prevMeasure = 0;
    this.nextMeasure = 0;
    this.z = 0.01;
    this.subdivisions = 4;
    /*app.view.addEventListener('mousemove', e => {
      if(this.mouseOver) this.mouseOver.graphics.tint = 0xFFFFFF;
      const dy = e.offsetY - (project.editor.app.view.height-100);
      const t = this.mouseT = this.t - dy/this.z;
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
      if(this.mouseOver) this.mouseOver.graphics.tint = 0x555555;
    });
    app.view.addEventListener('click', e => {
      console.log(e.offsetX, e.offsetY);
      if(e.offsetX < 400){ // notes

      }else if(e.offsetX < 400+50*5){ // sv columns

      }
    });*/
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

    this.notes = linked.notes.map(note => {
      const n = Rendered.from(note);
      dynamic.addChild(n.graphics);
      return n;
    }); // TODO: implement and use this.addNote instead

    this.blocks = [];
    linked.blocks.forEach(this.addBlock.bind(this));

    let line = new Rendered.Line().graphics;
    line.position.y = 1;
    line.scale.x = (this.bounds.resultRight - this.bounds.noteLeft) / line.width;
    line.scale.y = 3;
    line.alpha = 0.8;

    this.setTime();
    app.stage.addChild(dynamic, line);
    this.htmlElement.append(app.view);
    document.body.append(this.htmlElement);

    this.setTimeScale(0.32); // syncs everything
  }
  setTime(time){
    if(time !== undefined) this.t = time;
    this.app.stage.pivot.y = -(this.app.view.height-100);
    // this.dynamicStage.pivot.y = 40; // nudge up everything
    this.dynamicStage.position.y = this.t*this.z;

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

    this.blocks.forEach(b => {
      const block = b.linked;
      const svBlockEditor = block.func.editor;
      if(svBlockEditor && this.t >= block.t && this.t <= block.t+block.duration){ // filter condition
        svBlockEditor.setTimeScale(this.z);
        svBlockEditor.setTime(this.t-block.t);
      }
      b.graphicsDebugDisplay.text = block.func.evaluate(this.t - block.t).toFixed(3) + 'x';
      b.graphicsDebugDisplay.position.y = -this.dynamicStage.position.y;
      b.graphicsDebugDisplay.anchor.set(0, 0);
    });

    // some tree structure seems appropriate for culling (esp since they dont move around much)
    if(this.renderedMinT === void 0 || (this.t < this.renderedMinT || this.t > this.renderedMaxT)){
      this.refreshCulling();
    }
  }
  refreshCulling(){ // return;
    const viewport = this.app.screen;
    const minY = viewport.y - 1000;
    const maxY = viewport.height + 500;
    this.renderedMinT = this.t - (maxY - (this.app.view.height-100))/this.z;
    this.renderedMaxT = this.t - (minY + (this.app.view.height-100))/this.z;
    this.notes.forEach(n => {
      const bounds = n.graphics.getBounds();
      n.graphics.renderable = bounds.y+bounds.height>=minY &&
        bounds.y-bounds.height <= maxY;
    })
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

  }
  addBlock(block){
    const b = Rendered.from(block, this);
    b.graphics.position.x = this.bounds.blockLeft + 50*block.x;
    this.dynamicStage.addChild(b.graphics);
    this.blocks.push(b);
    return b;
  }
}

class Project {
  constructor(){
    this.metadata = {};
    this.notes = [];
    this.timingPoints = [];
    this.blocks = [];
    this.editor = null;
    this.songAudio = null;
  }
  openEditor(){
    this.editor = new ProjectEditor(this);
  }
  closeEditor(){
    this.editor?.destroy();
    this.editor = null;
  }
  loadResources(files){
    const audioFile = files.filter(x => x.name === this.metadata.General.AudioFilename)[0];
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
  addBlock(block){
    this.blocks.push(block);
    this.editor?.addBlock(block);
    // TODO: X shifting if collisions
  }
}

const sortByTime = arr => arr.sort((a,b) => a.t-b.t);

export default Project;
export { Project, ProjectEditor, sortByTime };
