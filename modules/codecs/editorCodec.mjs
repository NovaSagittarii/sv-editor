import { Project, sortByTime } from '../Project.mjs';
import { Note, LongNote } from '../Notes.mjs';
import { TimingPoint } from '../TimingPoint.mjs';
import { SvBlock } from '../SvBlock.mjs';
import { SvBuilder } from '../SvBuilder.mjs';
import { Function } from '../Function.mjs';

const VERSION = 1;
const EXTENSION = "sf";

function decode(text){
  const {blocks, metadata, notes, timingPoints, resources} = JSON.parse(text);
  const project = new Project();
  project.metadata = metadata;
  project.resources = resources;
  project.blocks = blocks.map(blockdata => {
    const {duration, func, operation, t, x} = blockdata;
    const {type, params} = func;
    const block = new SvBlock(SvBlock.Operation[operation.toUpperCase()], x, t, duration);
    block.func.function = Function[type];
    block.func.params = params;
    return block;
  });
  project.notes = notes.map(n => "t$" in n ? new LongNote(n.x, n.t, n.t$) : new Note(n.x, n.t));
  project.timingPoints = timingPoints.map(n => new TimingPoint(n.t, n.bpm, n.meter));

  return project;
}
function encode(project){
  const {blocks, metadata, notes, timingPoints, resources} = project;
  const o = {
    blocks: blocks.map(block => {
      const {duration, func, operation, t, x} = block;
      // PFunc {function: Function, params: Array(2), editor: null, linked: SvBlock}
      return {
        duration,
        func: {
          type: func.function.name,
          params: func.params,
        },
        operation: operation.description.substring(3), // note: assumes Symbol.description follows format f'sv:{NAME}'
        t,
        x,
      };
    }),
    metadata,
    resources,
    notes: notes.map(n => n.clone()), // discard .projected property (data-only)
    timingPoints,
    version: VERSION,
  };
  console.log(o);
  return JSON.stringify(o);
}

export { encode, decode, EXTENSION };