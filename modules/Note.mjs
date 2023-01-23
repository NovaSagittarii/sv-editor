class Note {
  constructor(x=0, t=0){
    this.x = x;
    this.t = t;
    // this.hs = 0;
    // this.sample // TODO: these maybe?
  }
  getStart(){
    return this.t;
  }
  getEnd(){
    return this.t;
  }
  setStart(t){
    this.t = t;
  }
  setEnd(t){
    this.t = t;
  }
  clone(){
    return new Note(this.x, this.y);
  }
}

export default Note;
export { Note };
