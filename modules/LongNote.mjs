import Note from './Note.mjs';

class LongNote extends Note {
  constructor(x=0, t=0, endTime=1000){
    super(x, t);
    this.t$ = endTime; // using end anchor notation from regex for "end time"
  }
  getEnd(){
    return this.t$;
  }
}

export default LongNote;
export { LongNote };
