import { Note, LongNote } from './Notes.mjs';
import { SvColumn } from './SvColumn.mjs';
import * as Rendered from './PIXIRendering.mjs';

// console.log(Rendered);

class ProjectEditor {
  constructor(linked){
    this.parent = linked;
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
          this.setTime(Math.max(0, this[(!up?"next":"prev")+(!e.shiftKey?"Snap":"Measure")]));
        }
      }
      e.preventDefault();
    });

    // app.view.addEventListener('keydown', e => { // keydown only fires on contenteditable stuff
    document.body.addEventListener('keydown', e => {
      if(e.keyCode>=32) console.log(e.keyCode);
      this.songAudio = this.parent.songAudio;
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
    });

    this.svColumns = linked.svColumns.map((svColumn, i) => {
      const col = Rendered.from(svColumn);
      col.graphics.position.x = 400+i*100;
      dynamic.addChild(col.graphics);
      return col;
    });

    let line = new Rendered.Line().graphics;
    line.position.y = 1;
    line.scale.y = 3;
    line.alpha = 0.8;

    this.setTime();
    app.stage.addChild(dynamic, line);
    this.htmlElement.append(app.view);
    document.body.append(this.htmlElement);
  }
  setTime(time){
    if(time !== undefined) this.t = time;
    this.app.stage.pivot.y = -(this.app.view.height-100);
    // this.dynamicStage.pivot.y = 40; // nudge up everything
    this.dynamicStage.position.y = this.t*this.z;

    let i = 0;
    let currentTimingPoint = this.parent.timingPoints[0]; // TODO: use something O(1) instead of O(n)
    while(i < this.parent.timingPoints.length){
      const timingPoint = this.parent.timingPoints[i];
      if(timingPoint.t > this.t) break;
      currentTimingPoint = timingPoint;
      i ++;
    }
    let t = this.t - 100/this.z;  // should be very bottom, y=zt; t=y/z
    // let prevTime = 0; // TODO: avoid rendering if they're too close
    // let prevY = 0;
    let mspb = 60000 / currentTimingPoint.bpm;
    t = Math.floor(t / mspb) * mspb + (currentTimingPoint.t)%mspb;
    let k = 0;
    let jStart = 0;
    this.nextSnap = this.nextMeasure = 0;
    this.lines.forEach((line, j) => {
      const J = j - jStart;
      let time = t + 60000 / currentTimingPoint.bpm / this.subdivisions * J;
      let truncatedTime = ~~time;
      if(time > this.parent.timingPoints[i+1]?.t){
        i ++;
        currentTimingPoint = this.parent.timingPoints[i];
        t = currentTimingPoint.t;
      }
      line.setType(Rendered.Line.colorSchemes[this.subdivisions][J % this.subdivisions]);
      line.setPosition(time, this.z);
      if(time < this.t-1) this.prevSnap = truncatedTime;
      if(time > this.t+1 && !this.nextSnap) this.nextSnap = truncatedTime;
      if(J % this.subdivisions === 0){
        if(time < this.t-1) this.prevMeasure = truncatedTime;
        if(time > this.t+1 && !this.nextMeasure) this.nextMeasure = truncatedTime;
      } // to get all measure snaps: this.lines.map(l => l.t)
    });
  }
  setTimeScale(z){
    /*this.t += this.t * (z-this.z) / z;
    this.app.stage.position.y = this.t*z;*/
    this.setTime(this.t + this.t * (z-this.z) / z);
    this.z = z;
    this.notes.forEach(n => n.setTimeScale(z));
    this.svColumns.forEach(svColumn => svColumn.setTimeScale(z));
  }
  syncTimeToAudio(){
    if(!this.songAudio) throw "audio file not found";
    this.setTime(this.songAudio.seek()*1000);
  }
}

class Project {
  constructor(){
    this.metadata = {};
    this.notes = [];
    this.timingPoints = [];
    this.svColumns = [...new Array(5)].map(x => new SvColumn());
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
}

const sortByTime = arr => arr.sort((a,b) => a.t-b.t);

export default Project;
export { Project, ProjectEditor, sortByTime };
