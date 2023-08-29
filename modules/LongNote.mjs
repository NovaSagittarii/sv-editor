import Note from './Note.mjs';

// TODO: hmm having svblock.duration while notes use endtime (from osu file format) does not very good

class LongNote extends Note {
  constructor(x=0, t=0, endTime=1000){
    super(x, t);
    this.t$ = endTime; // using end anchor notation from regex for "end time"
  }
  setEnd(t){
    this.t$ = t;
  }
  setTime(start, end){
    this.t = start;
    this.t$ = end;
  }
  addTime(dt){
    this.t += dt;
    this.t$ += dt;
  }
  getEnd(){
    return this.t$;
  }
  clone(){
    return new LongNote(this.x, this.t, this.t$);
  }
}

export default LongNote;
export { LongNote };
