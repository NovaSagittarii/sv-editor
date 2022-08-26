import { Project } from '../Project.mjs';
import { Note, LongNote } from '../Notes.mjs';

function decode(text){
  const project = new Project();
  text = text.replace(/\r/g, '');
  let state = null;
  for(const line of text.split('\n')){
    if(!line) continue;
    // console.log(line);
    let columnCount = 4;
    // if(/^\[[^\]]+\]$/.test(line)) state = line.replace(/[\[\]]/g, ''); // welp apparently regex is really slow... https://jsbench.me/sel7a2xeh1/1 ; it has the bonus of being easier to write tho haha
    if(line[0] === "[" && line[line.length-1] === "]"){
      if(state === "Difficulty") columnCount = project.metadata.CircleSize;
      state = line.substring(1, line.length-1);
    } else {
      let spaceAfterColonInDelimiter = 0;
      switch(state){
        case "General": // just setting up the metadata stuff
        case "Editor":
          spaceAfterColonInDelimiter = 1;
        case "Metadata":
        case "Difficulty":
          const delimiter = spaceAfterColonInDelimiter ? ': ' : ':'; // i cant believe the spacing aint consistent :sob:
          // console.log(state, `[${delimiter}]`);
          const data = line.split(delimiter);
          if(!(state in project.metadata)) project.metadata[state] = {};
          project.metadata[state][data[0]] = data[1];
          spaceAfterColonInDelimiter = 0; // if its NOT General or Editor, then it'll stay 0
          break;
        case "Events": // TODO: take the bg here and just throw the sb stuff into cache for export

          break;
        case "TimingPoints": { // TODO: separate BPM & SV here, probably the only codec stuff happens here haha

          break;
        } // doin the weird brace thingy in switch/case for scoping
        case "HitObjects": { // yeeters into the notes array
          /*
          RICE   - x,y,time,type=1  ,hitSound,objectParams,hitSample
          NOODLE - x,y,time,type=127,hitSound,endTime:hitSample

          hitSample format
          normalSet:additionSet:index:volume:filename
          0:0:0:0:   [default]
          */ // so inconsistent :c ... but at least i'm actually reading the osu! docs more carefully for once, sorta
          let n;
          const data = line.split(/[,:]/).map(x => isNaN(x) ? x : +x);
          const col = Math.min(Math.max(Math.floor(data[0] * columnCount / 512), 0), columnCount - 1);
          if(data[4] < 100){ // rice
            n = new Note(col, data[2]);
          } else { // noodle
            n = new LongNote(col, data[2], data[5]);
          }
          /* n.hitsound = data[3]
          n.sample = data[6+] */
          project.notes.push(n);
          break;
        }
      }
    }
  }
  return project;
}
function encode(project){
  // TODO: compile to osu :3c
}

export { encode, decode };
