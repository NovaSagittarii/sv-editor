import { Note, LongNote } from './Notes.mjs';
import { SvColumn } from './SvColumn.mjs';

class Project {
  constructor(){
    this.metadata = {};
    this.notes = [];
    this.timingPoints = [];
    this.svColumns = [...new Array(5)].map(x => new SvColumn());
  }
}

const sortByTime = arr => arr.sort((a,b) => a.t-b.t);

export default Project;
export { Project, sortByTime };
