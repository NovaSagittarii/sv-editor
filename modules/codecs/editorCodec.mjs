import { Project, sortByTime } from '../Project.mjs';
import { Note, LongNote } from '../Notes.mjs';
import { TimingPoint } from '../TimingPoint.mjs';
import { SvBlock } from '../SvBlock.mjs';
import { SvBuilder } from '../SvBuilder.mjs';

function decode(text){
  const {blocks, metadata, notes, timingPoints} = JSON.parse(text);
  //
}
function encode(project){
  const {blocks, metadata, notes, timingPoints} = project;
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
    notes: notes.map(n => n.clone()), // discard .projected property (data-only)
    timingPoints,
  };
  console.log(o);
  return JSON.stringify(o);
}

export { encode, decode };