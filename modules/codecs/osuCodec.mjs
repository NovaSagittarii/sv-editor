import { Project, sortByTime } from '../Project.mjs';
import { Note, LongNote } from '../Notes.mjs';
import { TimingPoint } from '../TimingPoint.mjs';
import { SvBlock } from '../SvBlock.mjs';

function decode(text){
  const project = new Project();
  text = text.replace(/\r/g, '');
  let state = null;
  let columnCount = 4;
  let bpm, sv, globalSvBlock = new SvBlock(SvBlock.Operation.SET);
  for(const line of text.split('\n')){
    if(!line) continue;
    // console.log(line);
    // if(/^\[[^\]]+\]$/.test(line)) state = line.replace(/[\[\]]/g, ''); // welp apparently regex is really slow... https://jsbench.me/sel7a2xeh1/1 ; it has the bonus of being easier to write tho haha
    if(line[0] === "[" && line[line.length-1] === "]"){
      if(state === "Difficulty") columnCount = +project.metadata.Difficulty.CircleSize;
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
        case "TimingPoints": { // separate BPM & SV here, probably the only codec stuff happens here haha
          /*
          time,beatLength,meter,sampleSet,sampleIndex,volume,uninherited,effects
          0int,1float,    2int, 3int,     4int,       5int,  6bool(0/1), 7int
          effects: bit0 - kiai, bit3 - ignore first barline
          */
          const data = line.split(',').map(x => isNaN(x) ? x : +x);
          const t = data[0];
          const uninherited = !!data[6];
          const mspb = Math.abs(data[1]);
          // TODO: implement other timingpoint data
          if(uninherited){ // scale to base bpm after we figure out whatever it is (assume basebpm:=1 initially)
            sv = bpm = 60000/mspb;
            if(bpm > 10 && bpm <= 5000) project.timingPoints.push(new TimingPoint(t, bpm, data[2]));
          }else{
            sv = bpm * (100/mspb); // equivalent bpm speed
          }
          globalSvBlock.setPoint(t, sv); // WARNING: some jank stuff might happen with points at the same time ??
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
          if(data[3] < 100){ // rice
            n = new Note(col, data[2]);
          } else { // noodle
            n = new LongNote(col, data[2], data[5]);
          }
          /* n.hitsound = data[3]
          n.sample = data[6+] */ // TODO: implement hitsounds
          project.notes.push(n);
          break;
        }
      }
    }
  }
  // post read processing (maybe move tp processing here if things break)
  sortByTime(project.notes);
  sortByTime(project.timingPoints);
  console.log(globalSvBlock);
  // base bpm
  const bpms = {};
  let baseBpm = 1;
  let baseBpmDuration = 0;
  const start = project.notes[0].t;
  let current = start;
  const end = project.notes[project.notes.length-1].getEnd();
  let prevBpm = null;
  for(const {t, bpm} of project.timingPoints.concat({t:end, bpm:0})){
    let x = prevBpm || bpm;
    bpms[x] = (bpms[x]||0) + (t-current);
    if(bpms[x] > baseBpmDuration){ // TODO: check baseBpm behavior when theres a tie
      baseBpm = x;
      baseBpmDuration = bpms[x];
    }
    // if(bpms[bpm] === (baseBpmDuration = Math.max(baseBpm, bpms[bpm]))) baseBpm = bpm; // lol
    current = t;
    prevBpm = bpm;
  }
  console.log(bpms, baseBpm); // WARNING : might be broken but works good enough for now
  let firstTimingPoint = project.timingPoints[0].t;
  globalSvBlock.scaleX(1/baseBpm);
  globalSvBlock.offsetT(-firstTimingPoint); // NOTE : might be okay to keep original offsets
  globalSvBlock.t = firstTimingPoint;
  globalSvBlock.duration = end-firstTimingPoint;
  project.svColumns[0].addBlock(globalSvBlock);
  return project;
}
function encode(project){
  // TODO: compile to osu :3c
}

export { encode, decode };
