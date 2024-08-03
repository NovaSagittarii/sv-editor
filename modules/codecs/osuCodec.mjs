import { Project, sortByTime } from '../Project.mjs';
import { Note, LongNote } from '../Notes.mjs';
import { TimingPoint } from '../TimingPoint.mjs';
import { SvBlock } from '../SvBlock.mjs';
import { SvBuilder } from '../SvBuilder.mjs';

// const VERSION = 1;
const EXTENSION = "osu";

function calculateBaseBpm(project){
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
  // console.log(bpms, baseBpm); // WARNING : might be broken but works good enough for now
  return {bpms, baseBpm};
}

function decode(text){
  const project = new Project();
  text = text.replace(/\r/g, '');
  let state = null;
  let columnCount = 4;
  let start = Infinity, end = -Infinity;
  let bpm, sv, velocity = new SvBuilder, normalization = new SvBuilder;
  for(const line of text.split('\n')){
    if(!line) continue;
    // console.log(line);
    // if(/^\[[^\]]+\]$/.test(line)) state = line.replace(/[\[\]]/g, ''); // welp apparently regex is really slow... https://jsbench.me/sel7a2xeh1/1 ; it has the bonus of being easier to write tho haha
    if(!project.metadata.fileFormat) project.metadata.fileFormat = line;
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
          if(!(state in project.metadata)) project.metadata[state] = "";
          project.metadata[state] += line + "\n";
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
            sv = 100/mspb; // what is speed is
            // TODO : add option for parsing clamping
            // sv = Math.min(Math.max(100/mspb, 0.01), 10); // osu 0.01-10.00 clamping
            sv = bpm * sv; // equivalent bpm speed
          }
          velocity.addPoint(t, sv); // WARNING: some jank stuff might happen with points at the same time ??
          break;
        } // doin the weird brace thingy in switch/case for scoping
        case "HitObjects": { // yeeters into the notes array
          /*
          RICE   - x,y,time,type=1  ,hitSound,objectParams,hitSample
          NOODLE - x,y,time,type=128,hitSound,endTime:hitSample

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
          start = Math.min(start, n.getStart());
          end = Math.max(end, n.getEnd());
          /* n.hitsound = data[3]
          n.sample = data[6+] */ // TODO: implement hitsounds
          project.notes.push(n);
          break;
        }
      }
    }
  }

  project.setResource(Project.RESOURCE_AUDIO, project.metadata.General.AudioFilename);

  // post read processing (maybe move tp processing here if things break)
  sortByTime(project.notes);
  sortByTime(project.timingPoints);
  velocity.sort();

  // globalSvBlock.snapToMs({useSelfForUnknown: true});
  // console.log(globalSvBlock);

  // base bpm
  const baseBpm = calculateBaseBpm(project).baseBpm;
  let firstTimingPoint = project.timingPoints[0].t;
  velocity.scaleX(1/baseBpm);

  // normalization
  // const globalSvBlock = new SvBlock(SvBlock.Operation.SET);
  // const globalNormalizationBlock = new SvBlock(SvBlock.Operation.NORMALIZE, 4);
  const notePositions = [...new Set(project.notes.map(x => [x.t, x.t$]).flat().filter(x => x !== void 0))].sort((a,b)=>a-b); // splits

  if(notePositions[0] > firstTimingPoint) notePositions.unshift(firstTimingPoint);

  // console.log(notePositions);

  // const speeds = globalSvBlock.func;
  for(let i = 0; i < notePositions.length-1; i ++){
    const normalized = notePositions[i+1] - notePositions[i];
    const observed = velocity.integrate(notePositions[i], notePositions[i+1]);
    // console.log(notePositions[i], notePositions[i+1], normalized, observed, observed/normalized);
    const average = observed/normalized;
    // // globalSvBlock.scaleX(1/average, notePositions[i]-notePositions[0], notePositions[i+1]-notePositions[0]);
    // globalNormalizationBlock.setPoint(notePositions[i]-notePositions[0], average);
    normalization.addPoint(notePositions[i], average);
  }

  // globalSvBlock.offsetT(-Math.floor(firstTimingPoint)); // NOTE : might be okay to keep original offsets
  // globalSvBlock.func.nodes[0].t = 0;
  // globalSvBlock.t = Math.floor(firstTimingPoint);
  // globalSvBlock.duration = end-firstTimingPoint;
  // globalNormalizationBlock.t = notePositions[0];
  // globalNormalizationBlock.duration = notePositions[notePositions.length-1] - notePositions[0];

  /*const blocks = [globalSvBlock];
  let splits = [...new Set(project.notes.map(x => [x.t, x.t$]).flat().filter(x => x !== void 0 && x > firstTimingPoint ))].sort((a,b)=>a-b);
  let prev = null;
  for(let i = 0; i < splits.length; i += 10){
    blocks.push(blocks[blocks.length-1].splice(splits[i]-splits[prev]||firstTimingPoint));
    prev = i;
  }
  blocks.forEach(block => project.svColumns[0].addBlock(block));*/

  // project.addBlock(globalSvBlock);
  // project.addBlock(globalNormalizationBlock); // TODO: do that [...arguments] thingy
  // console.log(velocity, normalization);
  velocity.cull();
  // normalization.cull(); // TODO: export using known note positions
  project.addBlock(...velocity.exportAsBlocks(SvBlock.Operation.SET, 0, end));
  project.addBlock(...normalization.exportAsBlocks(SvBlock.Operation.NORMALIZE, 4, end));
  return project;
}
function encode(project){
  project.calculateSpeedOutput();

  // TODO: compile to osu :3c
  const m = project.metadata; // alias cuz dont wanna type all of it out :skull:
  let raw = `${m.fileFormat}`;
  [{ section: "General", delimiter: ': ' },
  { section: "Editor", delimiter: ': ' },
  { section: "Metadata", delimiter: ':' },
  { section: "Difficulty", delimiter: ':' }].forEach(({section, delimiter}) => {
    raw += `\n\n[${section}]\n` + Object.entries(m[section]).map(x => x.join(delimiter)).join('\n');
  });
  raw += `\n\n[Events]\n` + m.Events;

  raw += `\n[TimingPoints]`;
  let tp = -1, currentTimingPoint;
  let bpmChanged = false;
  let prevSpeed = null;
  let spike = false;
  let nextBarline, barlineInterval;
  const baseBpm = calculateBaseBpm(project).baseBpm;

  raw += `\n0,${60000/baseBpm},${4},2,0,30,1,0`; // osu dies on green tp without red tp to use
  for(let t = Math.min(project.notes[0].t, Math.floor(project.timingPoints[0].t+1)); t < project.speed.length; t ++){
    // if(t > 10000) break;

    let uninherited, inherited;
    while(tp<0 || project.timingPoints[tp+1]?.t <= t){
      tp ++;
      currentTimingPoint = project.timingPoints[tp];
      // TODO : export other properties of timingpoint
      uninherited = `\n${currentTimingPoint.t},${60000/currentTimingPoint.bpm},${currentTimingPoint.meter},2,0,30,1,0`;
      /*
      time,beatLength,meter,sampleSet,sampleIndex,volume,uninherited,effects
      0int,1float,    2int, 3int,     4int,       5int,  6bool(0/1), 7int
      effects: bit0 - kiai, bit3 - ignore first barline
      */
      // prevSpeed = null;  
      nextBarline = currentTimingPoint.t;
      barlineInterval = (60000/currentTimingPoint.bpm)*currentTimingPoint.meter;
    }
    // let exportSpeed = project.speed[t] / (currentTimingPoint.bpm / baseBpm);
    let exportSpeed = project.speed[t] / currentTimingPoint.bpm * baseBpm;
    const showLine = Math.floor(nextBarline) === t;
    if(showLine){
      nextBarline += barlineInterval;
      console.log(t);
      bpmChanged = true; // make sure a redline is exported
    }

    while (t > Math.floor(nextBarline)) nextBarline += barlineInterval;
    // update nextBarline in case one was missed (see linear ring - cache)

    if(prevSpeed === exportSpeed){
      // necessary to reset bpm (if needed)
      // raw += (uninherited||"") + (inherited||"");
      if(!showLine) continue;
    } prevSpeed = exportSpeed;
    if(exportSpeed >= 0.01 && exportSpeed <= 10){ // TODO : accumulator so its not so dumb
      // within the bounds of the clamp
      if(bpmChanged){ // only reset bpm if we're all good again to be using current bpm
        // console.log(t);
        // TODO : change bpm onto original snap once possible (so the lines arent dumb)
        uninherited = `\n${t},${60000/currentTimingPoint.bpm},${currentTimingPoint.meter},2,0,30,1,${showLine?0:8}`;
        bpmChanged = false;
      }
      spike = false;
      inherited = `\n${t},${-100/exportSpeed},${currentTimingPoint.meter},2,0,30,0,0`;
    }else{
      // console.log(exportSpeed, t);
      // something 0.01x (100) or 10x (0.1) that we can reach
      const coef = 0.1;//Math.max(0.1, Math.random()*100);
      let bpm = Math.min(Math.max(project.speed[t], 0.0001), 100+0*14000) * baseBpm  * coef; // speed = bpm/baseBpm ;; bpm = speed * base BPM
      if(project.speed[t] >= 200){
        if(spike) continue;
        bpm = 10000;
        spike = true;
      }else spike = false;
      // const sv = project.speed[t] / bpm * baseBpm;
      // const sv = SP / (SP * baseBpm * coef) * baseBpm = 1/ coef;
      const sv = 1 / coef;
      if(sv < 0.01 || sv > 10) console.warn("bruh wtf", bpm, coef, sv, t);
      uninherited = `\n${t},${60000/bpm},${currentTimingPoint.meter},2,0,30,1,${showLine?0:8}`;
      inherited = `\n${t},${-100/sv},${currentTimingPoint.meter},2,0,30,0,0`;
      bpmChanged = true;
    }
    // if(uninherited) bpmChanged = true;
    // if(uninherited) console.log(uninherited, inherited, bpmChanged);
    raw += (uninherited||"") + (inherited||"");
  }

  raw += `\n\n\n[HitObjects]\n` + project.notes.map(note => {
    // TODO: export other properties of hitobject
    let x = 0|((512/m.Difficulty.CircleSize)*(0.5+note.x));
    let t = 0|note.t;
    let tail = note instanceof LongNote ? `128,0,${note.t$}:` : '1,0,';
    let hitSample = '0:0:0:0:';
    return `${x},192,${t},${tail}${hitSample}`;
  }).join('\n');
  return raw;
}

export { encode, decode, EXTENSION };
