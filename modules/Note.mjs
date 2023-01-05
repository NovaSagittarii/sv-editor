class Note {
  constructor(x=0, t=0){
    this.x = x;
    this.t = t;
    // this.hs = 0;
    // this.sample
  }
  getStart(){
    return this.t;
  }
  getEnd(){
    return this.t;
  }
}

export default Note;
export { Note };
