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
    this.z = 0.01;
    this.subdivisions = 4;
    app.view.addEventListener('wheel', e => {
      if(e.deltaY === 0) return; // displacement
      let up = e.deltaY < 0;
      if(e.ctrlKey){
        this.setTimeScale(this.z = up ? (this.z*2) : (this.z/2));
      }else{
        this.setTime(Math.max(0, this.t + (up ? -1 : 1)*1000));
      }
      e.preventDefault();
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

    let line = new Rendered.Line().graphics;

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
    let mspb = 60000 / currentTimingPoint.bpm;
    t = Math.floor(t / mspb) * mspb + (currentTimingPoint.t)%mspb;
    let k = 0;
    let jStart = 0;
    this.lines.forEach((line, j) => {
      const J = j - jStart;
      let time = t + 60000 / currentTimingPoint.bpm / this.subdivisions * J;
      if(time > this.parent.timingPoints[i+1]?.t){
        i ++;
        currentTimingPoint = this.parent.timingPoints[i];
        t = currentTimingPoint.t;
      }
      line.setType(Rendered.Line.colorSchemes[this.subdivisions][J % this.subdivisions]);
      line.setPosition(time, this.z);
    });
  }
  setTimeScale(z){
    /*this.t += this.t * (z-this.z) / z;
    this.app.stage.position.y = this.t*z;*/
    this.setTime(this.t + this.t * (z-this.z) / z);
    this.z = z;
    this.notes.forEach(n => n.setTimeScale(z));
  }
}

class Project {
  constructor(){
    this.metadata = {};
    this.notes = [];
    this.timingPoints = [];
    this.svColumns = [...new Array(5)].map(x => new SvColumn());
    this.editor = null;
  }
  openEditor(){
    this.editor = new ProjectEditor(this);
  }
  closeEditor(){
    this.editor?.destroy();
    this.editor = null;
  }
}

const sortByTime = arr => arr.sort((a,b) => a.t-b.t);

export default Project;
export { Project, ProjectEditor, sortByTime };
