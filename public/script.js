// payloads https://drive.google.com/open?id=1BQy025dJHiwYGA-YEaduG7mjwIfmWAta

let y = 0;      // Y Pos
let z = .5;   // ZOOM
let zR =32;     // ZOOM RECIPROCAL
let t = 0;      // time [ms of song]
let d = 2;      // divisor
let to = 0;     // start time offset (tp.t)
let yo = 500;   // y offset (visual)
let yt = 0;     // y translate (beat)
let yc = 0;     // y correction (when pointer is misaligned with divisors)
let fy = 0;    // first line y (correction for hovering)
let fl = 0;     // first line (calculation)
let ll = 0;     // last line (calculation)
let flb = 0;    // first line buffer
let llb = 0;    // last line buffer
let mspb;       // milliseconds per beat
let bpm;
let live_sv;

const SETTINGS = {
  SNAPPING_MODE: "round",
  INVERTED_SCROLL: false,
  SHOW_TIMINGPOINTS: true,
  SHOW_FRAMERATE: true,
  ENABLE_PNOTES: true,
}

const MODE_NAMES = ["SELECT", "NOTE", "LNOTE"];
const MODE_SELECT = 0, MODE_PLACE_NOTE = 1, MODE_PLACE_LONG_NOTE = 2;
let M = MODE_SELECT; // mode

let mp = false, mpx, mpy, mpMS, mr, mrx, mry, mrMS, mouseMS;
let TSS, TSE, TSL, TSR; // time selection start/end, left/right (Math.min/max of mpMS/mrMS)
let sN = null;  // selectedNote
let NS = {}; // Note Selection
let NSl = 0; // Note Selection size (length?)
let clipboard = [];
let _nid = 1;
const mapdata = {};
const keys = {};

const COLUMN_FILL = "#000";
const DSTROKE = ["#FFF", "#F00", "#44F", "#CC0", "#777", "#C800C8", "#8C008C", "#777", "#FAA", "#FBB", "#AFF", "#4ED", "#AAA", "#555"];
//               1/1     1/2     1/4     1/8     1/16    1/3        1/6        1/12    1/5     2/5     1/10    1/20    1/24    1/32

//
// "#FAA", "#FBB", "#FAF", "#7FF"];  RuleBlazing's pink/purple/cyan 5/10/20 theme xD
// "#940", "#B60", "#C80", "#FB0"];  brown "muddy" 5/10/20 theme
// 1/5     2/5     1/10    1/20

const PSTROKE = "#FCC";
const LINE_COLOR = DSTROKE[0];
const colors = {
  "1": [0],
  "2": [0,1],
  "3": [0,5,5],
  "4": [0,2,1,2],
  "5": [0,8,9,8,9],
  "6": [0,6,5,1,6,5],
  "8": [0,3,2,3,1,3,2,3],
  "10": [0,10,8,10,9,10,8,10,9,10],
  "12": [0,7,6,7,5,7,1,7,6,7,5,7],
  "16": [0,4,3,4,2,4,3,4,1,4,3,4,2,4,3,4],
  "20": [0,11,10,11,8,11,10,11,9,11,10,11,8,11,10,11,9,11,10,11],
  "24": [],
  "32": []
};
colors[24].push(...[...colors[12].join(',12,').split(',').map(e => parseInt(e)), 12]);
colors[32].push(...[...colors[16].join(',13,').split(',').map(e => parseInt(e)), 13]);
Object.keys(colors).forEach(k => colors[k] = colors[k].map(e => DSTROKE[e]));
const ColumnNote = {
  "1": [0],
  "2": [0, 0],
  "3": [0, 1, 0],
  "4": [0, 1, 1, 0],
  "5": [0, 1, 2, 1, 0],
  "6": [0, 1, 0, 0, 1, 0],
  "7": [0, 1, 0, 2, 0, 1, 0],
  "8": [0, 1, 1, 0, 0, 1, 1, 0],
  "9": [0, 1, 1, 0, 2, 0, 1, 1, 0]
};
let FRV = 0; // frameRate value
const FRB = [...new Array(100)].map(e => 0); // frameRate buffer
const divisors = Object.keys(colors).map(e => parseInt(e));
const snap = (ms) => (Math[SETTINGS.SNAPPING_MODE](( (ms-(to % (mspb/d))) /mspb)*d)*mspb)/d + (to % (mspb/d));
const TimingPoint = function(to, mspb, m, ss, si, v, i, k){
  this.t = to;
  this.mspb = mspb > 0 ? mspb : -100/mspb
  this.bpm = TP.length ? TP[TP.length-1].bpm : 1;
  this.m = m;    // meter
  this.ss = ss;  // sample set
  this.si = si;  // sample index
  this.v = v|0;  // volume
  this.i = !!parseInt(i);  // inherited ?
  this.k = !!k;  // kiai ?
  this._id = (_nid ++).toString(36);
  if(this.i) this.bpm = Float64Array.of(60000/mspb);
};
TimingPoint.prototype.export = function(mode){
  switch(mode){
    case ".osu":
      return `${Math.round(this.t)},${this.i ? this.mspb : -1/this.mspb*100},${this.m},${this.ss},${this.si},${this.v},${this.i+0},${this.k+0}`;
      break;
  }
};
TimingPoint.prototype.withinTS = function(){
  return !isNaN(TSE) && this.t > TSS && this.t < TSE;
};
const Note = function(x, y, t, type, hs, et){
  this.x = x;
  this.t = t;
  this.ln = type > 100; // 1 - note, 128 - long_note
  this.hs = hs || 0;
  this._t = this.ln && et || t;
  this._id = (_nid ++).toString(36);
};
Note.prototype.export = function(mode){
  const KC = C.length-3;
  switch(mode){
    case ".osu":
      return `${Math.floor((512/KC)*(0.5+this.x))},192,${Math.floor(this.t)},${this.ln?128:1},${this.hs},${this.ln?Math.floor(this._t):0}:0:0:0:0:`;
      break;
  }
};
Note.prototype.withinTS = function(){ // within Time Selection (TSS/TSE)
  return !isNaN(TSE) && ((this._t > TSS && this._t < TSE) || (this.t > TSS && this.t < TSE));
};
Note.prototype.select = TimingPoint.prototype.select = function(){
  if(!NS[this._id]) NSl ++;
  NS[this._id] = this;
};
Note.prototype.deselect = TimingPoint.prototype.deselect = function(){
  if(NS[this._id]) NSl --;
  delete NS[this._id]; // remove from NoteSelection
};
Note.prototype.selected = TimingPoint.prototype.selected = function(){ // if in NoteSelection
  return !!NS[this._id];
};
const Column = function(x, w, t){
  this.x = x;
  this.x2 = x + 800;
  this.w = w;
  this.w2 = w/2;
  this.RB = x - w/2;
  this.LB = x + w/2;
  this.type = t;
  this.notes = [];
  this.id = C.length;
  this.th = 0; // tile height
  this.thd2 = 0;
};
Column.prototype.calculateTileHeight = function(){
  const Tile = this.type ? I.svTile[0] : I.tile[ColumnNote[C.length-3][this.id]];
  this.th = Math.floor(Tile.height * (this.w / Tile.width));
  this.thd2 = this.th/2;
};
Column.prototype.mouseOver = function(){
  return Math.abs(mouseX - this.x) < this.w2;
};
Column.prototype.draw = function() {
  fill(COLUMN_FILL);
  stroke(LINE_COLOR);
  strokeWeight(1);
  rect(this.x, 300, this.w, height*2);
  for(let j = fl; j < Math.min(fl+200+zR, ll); j ++){
    const YRP = yo-((to-t)*d+(j+yt*d)*mspb)/d*z; // Y RENDER POSITION
    if(YRP > height) continue;
    if(YRP <= 0){
      fy = YRP;// + mspb/d*z;
      break;
    }
    strokeWeight(Math.abs(j) % d ? 1 : 3);
    stroke(colors[d][Math.abs(j) % d]);
    line(this.LB, YRP, this.RB, YRP);
  }
};
Column.prototype.drawNotes = function() {
  noStroke();
  fill(0);
  for(let j = this.notes.length-1; j >= 0; j --){
    const N = this.notes[j];
    const YRP = Math.round(yo - (N.t - t + yt*mspb) * z);
    //rect(this.x, YRP-4, this.w, 8);
    if(!N.ln && YRP > height+100) break;
    if(YRP <= 0) continue;

    push();
    const sel = sN && sN[0] === N; // ifSelected determination & drawing things?
    const withinSelection = NS[N._id] !== undefined || (mouseIsPressed && M === MODE_SELECT && this.withinTS() && N.withinTS());
    if(sN && !sN[3] && mouseIsPressed && withinSelection){
      translate(0, (mpMS-mouseMS) * z);
      if(this.type) push();
      translate(mouseX - mpx, 0);
    }
    if(sel){
      if(sN[2]){
        if(mouseIsPressed){
          tint(255, 150);
        }else{
          sN[2] = false;
        }
      }
      if(mr == 1 && mouseX!==mpx && mouseY!==mpy){ // when selected note gets released (assuming it got dragged)
        if(N.ln && sN[3]){ // modify LN-end
          N._t = SETTINGS.ENABLE_PNOTES ? snap(mouseMS) : Math.max(N.t, snap(mouseMS));
          sN[3] = false;
        }else{ // shift selection
          const relativeShift = snap(mouseMS-mpMS + N.t) - N.t;
          if(NSl > 1){
            for(let id in NS){
              NS[id].t += relativeShift;
              NS[id]._t += relativeShift;
            }
            C.map(c => c.notes.sort((a,b) => a.t-b.t));
          }else{
            N._t = snap(mouseMS-mpMS + N._t + 1);
            N.t += relativeShift;
            if(!this.mouseOver()){ // shifting column of note
              for(let c = 0; c < C.length; c ++){
                if(C[c].mouseOver()){
                  if(C[c].type != this.type) break; // column type (note/TP) mismatch
                  N.x = c.id;
                  C[c].notes.push(N);
                  C[c].notes.sort((a,b) => a.t-b.t);
                  this.notes.splice(j, 1);
                  break;
                }
              }
            }
          }
        }
      }
      if(!N.ln){
        fill(255, 150);
        text(Math.round(N.t), this.x, YRP - this.th*1.5);
        noFill();
        stroke(255, 100);
        rect(this.x, YRP - this.thd2, this.w + 6, this.th + 6);
      }
      if(this.type){

      }
    }
    if(this.type){
      if(sel) sN[3] = false;
      if(this.mouseOver() && Math.abs(mouseY - YRP + this.thd2) < this.thd2){
        if(mp == 1 && M === MODE_SELECT){
          sN = [N, this.id, true];
          if(!NSl || keys[17]) N[N.selected() ? "deselect" : "select"]();
        }
        if(mp == 3){
          this.notes.splice(j, 1);
          if(TP.indexOf(N) <= tp) tp --;
          TP.splice(TP.indexOf(N), 1);
          mp = false;
          sN = null; // deleting notes
          N.deselect();
          continue;
        }
        if(sel) sN[3] = true;
      }
      image(I[withinSelection ? "svTileWS" : "svTile"][0], this.x, YRP - this.thd2, this.w, this.th);
      if(sN && !sN[3] && withinSelection && mouseIsPressed) pop(); // lock x-axis
      stroke(N.i ? "#FF0000" : "#00FF00");
      strokeWeight(1);
      line(LB_C + (!N.i*15), YRP, RB_C, YRP);
      if(sel) line(LB_C + (!N.i*15), YRP+1, RB_C, YRP+1);
      /*stroke(255, 100);
      fill(0);
      textAlign(CENTER, BOTTOM);
      text(N.i ? (N.bpm.toFixed(2) + "bpm") : (N.mspb.toFixed(2) + "x"), this.x, YRP);*/
      fill(LINE_COLOR);
      noStroke();
      textAlign(LEFT, CENTER);
      //text(N.i ? (N.bpm.toFixed(2) + "bpm") : (N.mspb.toFixed(2) + "x"), N.i ? LB_C-5 : RB_C+5, YRP);
      text(N.i ? (N.bpm[0].toFixed(2) + "bpm") : (N.mspb.toFixed(2) + "x"), N.i ? RB_C+45 : RB_C+5, SongAudio.paused ? YRP : (TP[tp] == N) ? Math.min(YRP, yo) : Math.min(YRP, yo + 20*Math.abs(tp-TP.indexOf(N)))); // 20*Math.abs ensures only it gets Math.min'd when YRP is greater than yo. Allows transition smooth in, but hard snap out.
    }else{
      if(N.ln){ //  adding note to the selection (more accurately- setting the note as the selected note)
        const YRP_E = (sel && sN[3]) ? mouseY : (yo - (N._t - t + yt*mspb) * z);
        if(YRP_E > height+100) break;
        const YRP_C = (YRP+YRP_E)/2 - this.thd2; // yrender pos center

        const PNOTE = N.t > N._t;
        const YHB_S = PNOTE ? YRP_E : YRP; // Y hitbox start (bottom)
        const YHB_E = PNOTE ? YRP-this.th : YRP_E-this.th; // Y hitbox end (top)
        if(this.mouseOver()){
          if(mouseY < YHB_S && mouseY > YHB_E){
            if(mp == 1 && M === MODE_SELECT){
              sN = [N, this.id, true, (mouseY < YHB_E+this.th)+0]; // sN[3] if the tail is selected
              if(!NSl || keys[17]) N[N.selected() ? "deselect" : "select"]();
            }
            if(mp == 3){
              N.deselect();
              this.notes.splice(j, 1);
              mp = false;
              sN = null;
              continue;
            }
            tint(255, 150);
          }
        }

        const LN_H = YRP - YRP_E - this.th; // long note height
        image(I[withinSelection ? "lnBodyWS" : "lnBody"][ColumnNote[C.length-3][this.id]], this.x, YRP_C, this.w, LN_H);
        image(I[withinSelection ? "lnHeadWS" : "lnHead"][ColumnNote[C.length-3][this.id]], this.x, YRP - this.thd2, this.w, this.th);

        if(sel){
          fill(255, 150);
          text(Math.round(N.t), this.x, YRP + this.thd2);
          text(Math.round(N._t), this.x, YRP_E - this.th*1.5);
          fill(255, 50);
          stroke(255, 100);
          strokeWeight(2);
          rect(this.x, YRP_C, this.w + 6, LN_H + this.th*2 + 6 - PNOTE*2*this.th);
        }
        translate(this.x, YRP_E - this.thd2);
        scale(1, -1);
        image(I[withinSelection ? "lnHeadWS" : "lnHead"][ColumnNote[C.length-3][this.id]], 0, 0, this.w, this.th);
      }else{
        if(this.mouseOver() && Math.abs(mouseY - YRP + this.thd2) < this.thd2){
          if(mp == 1 && M === MODE_SELECT){
            sN = [N, this.id, true];
            if(!NSl || keys[17]) N[N.selected() ? "deselect" : "select"]();
          }
          if(mp == 3){
            N.deselect();
            this.notes.splice(j, 1);
            mp = false;
            sN = null;
            continue;
          }
          tint(255, 150);
        }
        image(I[withinSelection ? "tileWS" : "tile"][ColumnNote[C.length-3][this.id]], this.x, YRP - this.thd2, this.w, this.th);
      }
    }
    pop();
  }
};
Column.prototype.checkPlacement = function(){
  if(this.mouseOver()){
    stroke(LINE_COLOR);
    strokeWeight(2);
    //fill(0, 0, 0, 50 + Math.cos(frameCount/8)*20);
    //rect(this.x, Math.floor((mouseY+7.5) /mspb/z*d) *mspb*z/d + (yo%(mspb*z/d)) - 7.5, this.w, 15);
    //image(tile, this.x, Math[SETTINGS.SNAPPING_MODE]((mouseY-fy) / (mspb*z/d)) * (mspb/d*z) + fy - this.thd2, this.w, this.th);

    text(~~mouseMS, mouseX, mouseY-15);
    //rect(this.x, Math[SETTINGS.SNAPPING_MODE]((mouseY-fy) / (mspb*z/d)) * (mspb/d*z) + fy - this.thd2, this.w, this.th);

    if(M === MODE_PLACE_NOTE && !keys[16] && mp == 1){ // SHIFT(16) held for LN
      const t = (Math[SETTINGS.SNAPPING_MODE](( (mouseMS-(to % (mspb/d))) /mspb)*d)*mspb)/d + (to % (mspb/d));
      if(this.type){
        const lTP = TP.filter(e => (e.t <= mouseMS)).reverse()[0];
        const nTP = new TimingPoint(t, lTP.i ? 1 : lTP.mspb, lTP.m, lTP.ss, lTP.si, lTP.v, false, lTP.k);
        TP.push(nTP);
        TP.sort((a,b) => a.t-b.t);
        this.notes.push(nTP);
      }else{
        this.notes.push(new Note(this.id, null, t, 0));
      }
      this.notes.sort((a,b) => a.t-b.t);
      mp = false;
    }
    if((M === MODE_PLACE_LONG_NOTE || (M === MODE_PLACE_NOTE && keys[16])) && mr == 1 && !this.type){
      const t = (Math[SETTINGS.SNAPPING_MODE](( (mpMS-(to % (mspb/d))) /mspb)*d)*mspb)/d + (to % (mspb/d));
      const t_e = (Math[SETTINGS.SNAPPING_MODE](( (mouseMS-(to % (mspb/d))) /mspb)*d)*mspb)/d + (to % (mspb/d));
      console.log(t, t_e);
      this.notes.push(new Note(this.id, null, t, 128, 0, t_e));
      this.notes.sort((a,b) => a.t-b.t);
      mr = false;
    }

    line(mouseX-15, mouseY, mouseX-5, mouseY);
    line(mouseX+15, mouseY, mouseX+5, mouseY);
  }else if(mp && sN && sN[1] == this.id){
    sN = null; // clicking on something outside the selection i guess
  }else if(mp && !sN){
    if(!keys[17]){ // if CTRL is not held
      Object.keys(NS).map(k => delete NS[k]); // NSl --
      NSl = 0;
    }
  }
};
Column.prototype.withinTS = function(){ // if column is horizontally present in the dragged "time" selection
  return !isNaN(TSL) && this.x > TSL && this.x < TSR;
};
Column.prototype.renderSV = function(){
  if(this.type) return;
  for(let j = this.notes.length-1; j >= 0; j --){
    const N = this.notes[j];
    //const YRP = Math.round(yo - (N.t - t + yt*mspb) * z);
    const YRP = Math.round(yo + ( TP[tp].$t + (t-yt*mspb-TP[tp].t)*(TP[tp].$mspb) - N.$t) * z);
    if(N._t < t) break; // if past the time, then it is "hit"
    if(YRP <= 0) continue;

    if(N.ln){
      const YRP_E = Math.round(yo + ( TP[tp].$t + (t-yt*mspb-TP[tp].t)*(TP[tp].$mspb) - N.$_t) * z);
      if(YRP_E > height+100) break;
      const YRP_C = (YRP+YRP_E)/2 - this.thd2; // yrender pos center
      const LN_H = YRP - YRP_E - this.th; // long note height
      image(I["lnBody"][ColumnNote[C.length-3][this.id]], this.x2, YRP_C, this.w, LN_H);
      image(I["lnHead"][ColumnNote[C.length-3][this.id]], this.x2, YRP - this.thd2, this.w, this.th);
      push();
      translate(this.x2, YRP_E - this.thd2);
      scale(1, -1);
      image(I["lnHead"][ColumnNote[C.length-3][this.id]], 0, 0, this.w, this.th);
      pop();
    }else{
      image(I["tile"][ColumnNote[C.length-3][this.id]], this.x2, YRP - this.thd2, this.w, this.th);
    }
  }
};

let C, TP = [], tp;
let state = 0;
let LB_C, RB_C, ZERO_CP, ZERO_W;

let sp_t; // scroll pause timeout
let tile, svTile, lnHead, lnBody, wsTile;
const I = {};

function getBPMBaseline(){
    TP.sort((a,b) => a.t-b.t);
    let $tp = 0;
    const counter = {};
    [].concat(...C.map(c => c.type ? [] : c.notes)).map(n => n.t).sort((a,b) => a-b).forEach(T => {
        while($tp < TP.length-1 && T > TP[$tp].t) $tp ++;
        counter[TP[$tp].bpm] = (counter[TP[$tp].bpm] || 0) + 1;
    });
    return parseFloat(Object.keys(counter).map(e => [counter[e], e]).sort((a,b) => b[0] - a[0])[0][1]);
}
function cacheTP(){ // no idea if this is the most efficient or optimised but it should work. (hopefully)
  const bpm0 = getBPMBaseline();
  TP.sort((a,b) => a.t-b.t);
  TP[0].$t = 0;
  // calculate "relative speed" of timingpoints
  for(let i = 0; i < TP.length; i ++) TP[i].$mspb = Math.min((TP[i].i ? 1 : TP[i].mspb) * TP[i].bpm[0] / bpm0, 1e6);
  // calculate "apparent time" of timingpoints
  for(let i = 1; i < TP.length; i ++) TP[i].$t = TP[i-1].$t + (TP[i].t - TP[i-1].t) * Math.min(TP[i-1].$mspb, 1e6);
  // calculate "apparent time" of notes
  let i;
  C.filter(c => !c.type).forEach(c => {
    c.notes.sort((a,b) => a._t-b._t);
    i = TP.length-1;
    for(let n = c.notes.length-1; n >= 0; n --){
      const N = c.notes[n];
      while(i && N._t < TP[i].t){
        i --;
      }
      N.$_t = TP[i].$t + (N._t - TP[i].t) * TP[i].$mspb;
    }

    c.notes.sort((a,b) => a.t-b.t);
    i = TP.length-1;
    for(let n = c.notes.length-1; n >= 0; n --){
      const N = c.notes[n];
      while(i && N.t < TP[i].t && i){
        i --;
      }
      N.$t = TP[i].$t + (N.t - TP[i].t) * TP[i].$mspb;
    }
  });
}
function calculateBoundaries(){
  LB_C = C[0].x - C[0].w/2 - 15;
  RB_C = C[C.length-1].x + C[C.length-1].w/2 + 15;
  ZERO_CP = (C[0].x - C[0].w/2 + C[C.length-1].x + C[C.length-1].w/2) / 2;
  ZERO_W = RB_C-LB_C-15;
}
function updateLineBuffers(){
  flb = (155/mspb*zR*d>>3); // *3  * 414 [*2] xd
  llb = (1863/mspb*zR*d>>5);// *14 * 414
}
function updateTPInfo(){
  bpm = TP[tp].bpm[0];
  mspb = 60000/TP[tp].bpm[0];
  if(TP[tp].i){
    to = TP[tp].t;
    updateLineBuffers();
  }
}
function preload(){
  I.tile = ['https://cdn.glitch.com/bbcc0f1c-4353-4f2e-808d-19c8ff47a165%2Fmania-note1.png?v=1575240010874', 'https://cdn.glitch.com/bbcc0f1c-4353-4f2e-808d-19c8ff47a165%2Fmania-note2.png?v=1570597631148', 'https://cdn.glitch.com/bbcc0f1c-4353-4f2e-808d-19c8ff47a165%2Fmania-noteS.png?v=1575244041951']; //'/assets/mania-note2.png');
  I.svTile = ['https://cdn.glitch.com/bbcc0f1c-4353-4f2e-808d-19c8ff47a165%2Fsv-note.png?v=1570675367228'];
  I.lnHead = ['https://cdn.glitch.com/bbcc0f1c-4353-4f2e-808d-19c8ff47a165%2Fmania-note1H.png?v=1575240017358', 'https://cdn.glitch.com/bbcc0f1c-4353-4f2e-808d-19c8ff47a165%2Fmania-note2H.png?v=1570675914438', 'https://cdn.glitch.com/bbcc0f1c-4353-4f2e-808d-19c8ff47a165%2Fmania-noteSH.png?v=1575244053926'];
  I.lnBody = ['https://cdn.glitch.com/bbcc0f1c-4353-4f2e-808d-19c8ff47a165%2Fmania-note1L.png?v=1575240026387', 'https://cdn.glitch.com/bbcc0f1c-4353-4f2e-808d-19c8ff47a165%2Fmania-note2L.png?v=1570675925075', 'https://cdn.glitch.com/bbcc0f1c-4353-4f2e-808d-19c8ff47a165%2Fmania-noteSL.png?v=1575244059699'];
  Object.keys(I).map(k => I[k].forEach((_, i) => I[k][i] = loadImage(_)));
}
function setup() {
  const canvas = createCanvas(windowWidth-225, windowHeight-30);
  canvas.parent('canvas-wrapper');

  // render the "withinSelection" image
  /*push();
  clear();
  tint(255, 100);
  image(svTile, 0, 0);
  wsTile = get(0, 0, svTile.width, svTile.height);
  pop();*/
  Object.keys(I).map(k => {
    I[k+"WS"] = [];
    I[k].forEach((img, i) => {
      push();
      clear();
      image(img, 0, 0);
      tint(255, 128, 0, 200);
      image(img, 0, 0);
      I[k+"WS"][i] = get(0, 0, img.width, img.height);
      pop();
    })
  });


  frameRate(240);
  imageMode(CENTER);
  strokeCap(SQUARE);
  textAlign(CENTER, CENTER);
  textSize(100);
  rectMode(CENTER);
}
function windowResized() {
  resizeCanvas(windowWidth-225, windowHeight-30);
}
function draw() {
  switch(state){
    case 0:
      clear();
      fill(255);
      text(".....".substring(0, (frameCount/30)%7), width/2, 200);
      break;
    case 1:
      clear();
      fill(255);
      text("Parsing", width/2, height/2);
      text(("▁▂▃▄▅▆▇█▉▊▋▌▍▎▏▎▍▌▋▊▉█▇▆▅▄▃▂")[frameCount%28], 100, 100);
    case 2:
      clear();
      fill(255);
      text("Parsing", width/2, height/2);
      text(("▖▙▗▟▝▜▘▛")[frameCount%8], 100, 100);
      break;
    case 3:
      clear();
      if(yt){ // immediately update SongAudio.currentTime to update the waveform display
        SongAudio.currentTime = (t - yt*mspb)/1000;
        t -= yt*mspb;
        yt = 0;
      }
      mouseMS = (yo - mouseY)/z - yt*mspb + t;
      while(tp && t-yt*mspb < TP[tp].t){
        tp --;
        updateTPInfo();
      }
      while(tp+1 < TP.length && t-yt*mspb >= TP[tp+1].t){
        tp ++;
        updateTPInfo();
      }
      fl = Math.round(-yt + (t-to)/mspb)*d - flb;
      ll = Math.round(-yt + (t-to)/mspb)*d + llb;

      let lastCol = C.length - (!SETTINGS.SHOW_TIMINGPOINTS)*3;
      for(let i = 0; i < lastCol; i ++) C[i].draw();
      for(let i = 0; i < lastCol; i ++) C[i].drawNotes();
      for(let i = 0; i < lastCol; i ++) C[i].checkPlacement();
      if(live_sv) for(let i = 0; i < C.length-3; i ++) C[i].renderSV();
      if(SETTINGS.SHOW_TIMINGPOINTS){
        let LXRP, LYRP, LXRP2, LYRP2;
        const t_i = (yo - (height+100)) / z - yt*mspb + t;
        const t_f = yo / z - yt*mspb + t;
        for(let i = TP.length-1; i >= 0; i --){
          const N = TP[i];
          if(N.t > t_f) continue;
          if(N.t <= t_i) break;
          const XRP = Math.round(RB_C+70 + (N.mspb-1)*15);
          const YRP = Math.round(yo - (N.t - t + yt*mspb) * z);
          push();
          stroke((N.mspb<1||N.mspb>=4) ? 255 : 0, N.mspb<0.7 ? 255-1.4*(0.7-N.mspb)*255 : 255, N.mspb>1?100*N.mspb:0);
          //ellipse(XRP, YRP, 2, 2);
          strokeWeight(1);
          line(XRP, YRP, XRP, LYRP||(YRP-30));
          line(XRP, LYRP, LXRP, LYRP);
          stroke(255);
          if(i % 2 && Math.abs(XRP-LXRP2) < 1){
            const XPOS = Math.floor((XRP*(YRP-LYRP)+LXRP*(LYRP-LYRP2))/(YRP-LYRP2));
            drawingContext.setLineDash([2, 2]);
            line(XPOS, YRP, XPOS, LYRP2);
          }
          pop();
          LXRP2 = LXRP;
          LYRP2 = LYRP;
          LXRP = XRP;
          LYRP = YRP;
        }
      }
      if(sN == null) sN = undefined; // something about transitions
      strokeWeight(4);
      stroke(PSTROKE);
      line(LB_C, yo+1, RB_C, yo+1);
      line(LB_C+800, yo+1, RB_C+800, yo+1);
      line(RB_C+55, yo+1, RB_C+205, yo+1);
      strokeWeight(1);
      line(RB_C+70, yo-3, RB_C+70, yo+6);   // 1.00x
      line(RB_C+55, yo-3, RB_C+55, yo+6);   // 0.00x
      line(RB_C+205, yo-4, RB_C+205, yo+7); // 10.00x
      line(RB_C+115, yo-3, RB_C+115, yo+6); // 4.00x
      noStroke(255, 100);
      fill(255, 100);
      rect(ZERO_CP, yo-(-t*d+(yt*d)*mspb)/d*z, ZERO_W, 3);
      textSize(12);
      //text(frameRate().toFixed(1)+"FPS", RB_C+100, 355);
      push();
      textAlign(RIGHT, CENTER);
      /*text("D=1/"+d, RB_C+100, 385);
      text("Z="+zR, RB_C+100, 400);
      text(bpm.toFixed(2) + "bpm", RB_C+100, 430);
      if(!TP[tp].i) text((bpm * TP[tp].mspb).toFixed(2) + "bpm [a]", RB_C + 100, 445);
      text((TP[tp].i ? 1 : TP[tp].mspb).toFixed(2) + "x", RB_C + 100, 460);
      text("tpid="+tp, RB_C+100, 475);
      text("tpmax="+TP.length, RB_C+100, 490);*/
      text("D :\nZ :\nbpm :\n|\nsv :\ntpid :\ntpmax :\nNSl :", RB_C+285, 490);
      textAlign(LEFT, CENTER);
      text(`1/${d}\n${zR}\n${bpm.toFixed(2)} bpm\n${TP[tp].i ? "" : ((bpm * TP[tp].mspb).toFixed(2) + " bpm [a]")}\n${(TP[tp].$mspb ? TP[tp].$mspb.toFixed(2) : "?.??") + "x"}\n${tp}\n${TP.length-1}\n${NSl}`, RB_C+290, 490);
      text(Math.floor(t-yt*mspb), RB_C+215, yo);
      if(SETTINGS.SHOW_FRAMERATE){
        fill(255);
        FRV += ~~frameRate();
        FRV -= FRB.splice(0, 1);
        FRB.push(~~frameRate());
        text((FRV/100).toFixed(1), width-30, height-10);
      }
      pop();

      /*push();
      textSize(24);
      textAlign(RIGHT, CENTER);
      pop();*/

      if(M === MODE_SELECT && !sN && mouseIsPressed){ // draw box around immediately focused note
        let mpy_a = mpy-(yt-mpyt)*mspb*z; // mpy adjusted
        stroke(255, 50);
        fill(255, 10);
        quad(mouseX, mouseY, mouseX, mpy_a, mpx, mpy_a, mpx, mouseY);
        if(pmouseX !== mouseX){
          TSL = Math.min(mouseX, mpx);
          TSR = Math.max(mouseX, mpx);
        }
        if(pmouseY !== mouseY){
          TSS = Math.min(mouseMS, mpMS);
          TSE = Math.max(mouseMS, mpMS);
        }
      }
      if(SongAudio && !SongAudio.ended && !SongAudio.paused) t = 1000*SongAudio.currentTime || 0;
      mp = mr = false;
      break;
  }
}
function mousePressed(event){
  mp = event.button+1;
  mpx = mouseX;
  mpy = mouseY;
  mpyt = yt;
  mpMS = mouseMS;
  TSS = TSE = null;
}
function mouseReleased(event){
  mr = event.button+1;
  mrx = mouseX;
  mry = mouseY;
  mrMS = mouseMS;
  TSS = Math.min(mpMS, mrMS);
  TSE = Math.max(mpMS, mrMS);
  TSL = Math.min(mpx, mrx);
  TSR = Math.max(mpx, mrx);
  if(C && M === MODE_SELECT){
    C.filter(c => c.withinTS()).map(c => c.notes.filter(n => n.withinTS()).map(n => NS[n._id] = n));
    NSl = Object.keys(NS).length;
  }
}
function mouseWheel(event) {
  if(state !== 3) return;
  if(sN && sN[0] instanceof TimingPoint && sN[3]){ // SV editing
    sN[0].mspb += (event.delta < 0 == SETTINGS.INVERTED_SCROLL ? -1 : 1) / 10 * (keys[16]?10:1) / (keys[17]?10:1);
    return false;
  }else if(keys[17]){
    const temp_d = d;
    d = (event.delta > 0) ? d>>1 : d<<1;
    if(!colors[d]) d = temp_d; // REVERT !!
    updateLineBuffers();
    return false;
  }else if(keys[18]){
    if(sN){ // 1ms ALT shifting on immediately focused note
      sN[0].t += ((event.delta < 0 == SETTINGS.INVERTED_SCROLL) ? 1 : -1) * (keys[16] ? 10 : 1);
      sN[0]._t += ((event.delta < 0 == SETTINGS.INVERTED_SCROLL) ? 1 : -1) * (keys[16] ? 10 : 1);
    }
    return false;
  }else{
    if(!SongAudio.paused && !sp_t){
      SongAudio.pause();
      sp_t = true;
    }
    if(SongAudio.paused && sp_t){
      clearTimeout(sp_t);
      sp_t = setTimeout(() => {
        sp_t = 0;
        SongAudio.play();
      }, 150);
    }
    moveSongPointer(event.delta < 0 == SETTINGS.INVERTED_SCROLL, keys[16]);
  }
}
function moveSongPointer(scrollDirection, measureIntervalOverride){
  snapTime();
  const _d = measureIntervalOverride ? 1 : d;
  if(scrollDirection){
    if(SongAudio.paused && !sp_t){
      yt = Math.ceil(yt * _d) / _d - 1/_d;
    }else{
      SongAudio.currentTime += mspb/_d/1000;
      t = SongAudio.currentTime*1000;
    }
  }else{
    if(SongAudio.paused && !sp_t){
      yt = Math.round(yt * _d) / _d + 1/_d;
    }else{
      SongAudio.currentTime -= mspb/_d/1000;
      t = SongAudio.currentTime*1000;
    }
  }
  bpm = TP[tp].bpm[0];
}
function keyPressed(){
  if(state !== 3) return;
  keys[keyCode] = true;
  const temp_d = d
  switch(keyCode){
    case 32:
      if(SongAudio.paused){
        SongAudio.play();
        SongAudio.currentTime = (t - yt*mspb)/1000;
        yt = 0;
      }else{
        SongAudio.pause();
        snapTime();
      }
      break;
    case 33: moveSongPointer(true, true); break; // PAGE UP (one measure forward)
    case 34: moveSongPointer(false, true); break; // PAGE DOWN (one measure backwards)
    case 39: yt = Math.ceil(yt * d) / d - 1/d; SongAudio.currentTime -= mspb/d/1000; break; // LEFT
    case 37: yt = Math.round(yt * d) / d + 1/d; SongAudio.currentTime += mspb/d/1000; break; // RIGHT
    case 38: d = divisors[divisors.indexOf(d)+1] || d; break; // UP
    case 40: d = divisors[divisors.indexOf(d)-1] || d; break; // DOWN
    case 46: // Del ete
      C.forEach(c => {
        if(c.withinTS()){
          for(let i = c.notes.length-1; i >= 0; i --){
            const n = c.notes[i];
            if(n.withinTS()){
              c.notes.splice(i, 1);
              n.deselect();
              if(c.type) TP.splice(TP.indexOf(n), 1);
            }
          }
        }
      });
      if(tp >= TP.length) tp = TP.length-1; // make sure it doesnt access deleted timingpoints
      break;
    case 67: // C opy
      if(keys[17]){
        clipboard = C.map(c => c.withinTS() ? c.notes.filter(n => NS[n._id]).map(n => n.export('.osu')) : []);
      }
      break;
    case 86: // V paste
      if(keys[17]){
        // convert text to objects
        const cb = clipboard.slice(0);
        const clipboardObjects = cb.splice(0, C.length-3).map(c => c.map(n => n = new Note(...(n+":").split(':')[0].split(',').map(e => parseInt(e))))).concat(cb.map(c => c.map(n => n = new TimingPoint(...(n.split(',').map(e => parseFloat(e) || parseInt(e)))))));
        clipboardObjects.map(c => c.forEach(n => n.x = clipboardObjects.indexOf(c)));
        // console.log(clipboardObjects);
        // continue from there ...
        const clipboardFirst = Math.min(...clipboardObjects.filter(c => c[0]).map(c => c[0].t)); // assuming no one uses a 65000k map xD
        const currentTime = t-yt*mspb;
        const offset = currentTime-clipboardFirst;
        const clipboard_offset = clipboardObjects.map(c => c.length ? c.map(n => {n.t += offset; n._t += offset; return n}) : []);
        // console.log(clipboard_offset);
        C.map(c => {
          const N = clipboard_offset[c.id];
          c.notes.push(...N);
          if(c.type){
            TP.push(...N);
            TP.sort((a,b) => a.t-b.t);
          }
          c.notes.sort((a,b) => a.t-b.t);
        });
      }
      break;
    case 88: // X cut
      if(keys[17]){
        clipboard = C.map(c => c.withinTS() ? c.notes.filter(n => NS[n._id]).map(n => n.export('.osu', c)) : []);
        C.forEach(c => {
          if(c.withinTS()){
            for(let i = c.notes.length-1; i >= 0; i --){
              const n = c.notes[i];
              if(n.withinTS()){
                c.notes.splice(i, 1);
                n.deselect();
                if(c.type) TP.splice(TP.indexOf(n), 1);
              }
            }
          }
        });
        if(tp >= TP.length) tp = TP.length-1; // make sure it doesnt access deleted timingpoints
      }
      break;
    case 189: // -
      z = 16 / (++ zR);
      break;
    case 187: // =
      z = 16 / (-- zR);
  }
  updateLineBuffers();
  if(!colors[d]) d = temp_d; // REVERT !!
  yc = -yt%(1/d)*d;
  return false;
};
function keyReleased(){
  delete keys[keyCode];
}
function snapTime(){
  const msOffset = (t-to) % (mspb/d);
  t -= msOffset;
  yt = -msOffset/mspb;
}

const files = [];

const uploadDiv = document.getElementById('upload');
const folder = document.getElementById('folder');
const folderContents = document.getElementById('folderContents');
const sideMenu = document.getElementById('sidemenu');
const disabled = document.getElementById('disableCover');

sideMenu.style.transform = "translateX(-100%)";
File.prototype.slice = Blob.prototype.slice;

var SongAudio;
const wavesurfer = WaveSurfer.create({
  backgroundColor: "#FFFFFF30",
  cursorColor: "#FFFFFF",
  progressColor: "#0000FFA0",
  waveColor: "#FFFFFF30",
  container: '#waveform',
  scrollParent: true,
  height: 30,
  backend: 'MediaElement',
  plugins: [
    WaveSurfer.cursor.create({
      showTime: true,
      opacity: 1,
      customShowTimeStyle: {
        'background-color': '#000',
        color: '#fff',
        padding: '2px',
        'font-size': '10px'
      }
    })
  ]
});

function clearHTML(htmlElement){
  while (htmlElement.firstChild) htmlElement.removeChild(htmlElement.firstChild);
}
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

folder.addEventListener('change', e => {
  const FileArray = Array.from(e.target.files);
  console.log(FileArray);
  const ff = FileArray[0]; // first File
  if(FileArray.length == 1 && (ff.name.endsWith('.osz') || ff.name.endsWith('.zip'))){
    disabled.style.display = "block";
    JSZip.loadAsync(ff).then(zip => {
      FileArray.splice(0);
      const l = Object.keys(zip.files).length-1;
      let k = l;
      zip.forEach((relativePath, ZipObject) => {
        ZipObject.async('blob').then(data => {
          FileArray.push(new File([data], ZipObject.name));
          addFile(FileArray[FileArray.length - 1]);
          toggleUploadText.innerHTML = `Reading... ${l-k+1}/${l+1} (${((l-k+1)/(l+1)*100).toFixed(2)}%)`
          console.log(`${k}. Read ${ZipObject.name} from ${ff.name}`);
          if(!(k--)){
            listFiles(FileArray);
            disabled.style.display = "none";
          }
        });
      });
    });
  }
  listFiles(FileArray);
});
function addFile(file){
  const div = document.createElement('div');
  div.innerHTML = `${file.name} <div style="float:right">${(file.size/1024).toFixed(1)}KiB</div>`;
  div.className = "wrongExtension";
  if(file.name.includes('.osu')){
    const open = document.createElement('button');
    open.addEventListener('click', () => parseFile(file));
    open.innerText = "Open";
    div.prepend(open);
    div.className = "valid";
    div.addEventListener('click', () => {
      console.log(file.name);
    });
  }
  folderContents.append(div);
}
function listFiles(FileArray){
  files.splice(0);
  clearHTML(folderContents);
  for (let file of FileArray) {
    files[file.name] = file;
    addFile(file);
  };
}
async function parseFile(file){
  uploadDiv.style.marginTop = -uploadDiv.offsetHeight + 'px';
  state = 1;
  const readStart = performance.now();
  const d = (await new Response(file).text()).replace(/\r/g,''); // purge le CARRIAGE RETURN \r
  console.info(`Finished reading map file.   Took ${Math.floor(performance.now() - readStart)} ms.`);
  if(d.split('\n').filter(e => e.startsWith('Mode: '))[0][6] != "3"){
    state = 0;
    uploadDiv.style.marginTop = 0;
    div.className = "invalid";
    div.removeChild(div.firstChild);
    alert("Wrong mode");
    return;
  }
  const Difficulty = {};
  d.split('\n\n').filter(e => e.startsWith('[Difficulty]'))[0].split('\n').slice(1).map(e => e.split(':')).map(e => Difficulty[e[0]] = parseInt(e[1]));
  console.log(Difficulty);

  mapdata.filename = file.name;
  mapdata.Difficulty = Difficulty;
  mapdata.header = d.split('[TimingPoints]')[0];
  sideMenu.style.transform = "";

  //                                                               ignoring :extras ***
  const Notes = d.split('\n\n\n')[1].split('\n').slice(1).map(e => e.split(':')[0].split(',').map(n => parseInt(n)));
  const TimingPoints = d.split('\n\n').filter(e => e.startsWith('[TimingPoints]'))[0].split('\n').slice(1).map(e => e.split(',').map(n => parseFloat(n) || parseInt(n)));
  const ColumnWidth = 512/Difficulty.CircleSize;

  C = [];
  yo = height - 150;
  // Add the columns (which notes will be added to)
  for(let i = 0; i < Difficulty.CircleSize; i ++) C.push(new Column(30+50+i*70, 70, 0));
  for(let i = 0; i < 3; i ++) C.push(new Column(30+120+(i+Difficulty.CircleSize)*70, 70, 1));
  C.map(e => e.calculateTileHeight());
  calculateBoundaries();

  let TPC = 0;
  TimingPoints.forEach(e => {
    /*Offset, Milliseconds per Beat, Meter, Sample Set, Sample Index, Volume, Inherited, Kiai Mode*/
    const nTP = new TimingPoint(...e);
    TP.push(nTP);
    C[Difficulty.CircleSize/* + TPC%3*/].notes.push(nTP);
    TPC ++;
  });
  Notes.forEach(e => {
    /* x,y,time,type,hitSound,endTime:extras */
    try {
      C[Math.floor(e[0] / ColumnWidth)].notes.push(new Note(...e));
    } catch (error) {
      console.warn("Invalid note format: ", e);
    }
  });
  C.map(c => c.notes.forEach(n => n.x = c.id));

  tp = 0;
  mspb = TP[0].mspb;
  bpm = TP[0].bpm[0];
  t = to = TP[0].t;
  updateTPInfo();

  await sleep(500); // allow for transition to happen before the lag (due to parsing) kicks in
  const parse = new FileReader();
  const parseStart = performance.now();
  parse.onload = async e => {
    const loadStart = performance.now();
    console.info(`Finished parsing audio file. Took ${Math.floor(performance.now() - parseStart)} ms.`);
    SongAudio = new Audio(e.target.result.replace("data:application/octet-stream;base64,", "data:audio/mp3;base64,").replace("data:;base64,", "data:audio/mp3;base64,"));
    SongAudio.onloadeddata = () => {
      console.info(`Finished loading audio file. Took ${Math.floor(performance.now() - loadStart)} ms.`);
      tp = 0;
      mspb = TP[0].mspb;
      bpm = TP[0].bpm[0];
      t = to = TP[0].t;
      SongAudio.currentTime = t/1000;
      updateTPInfo();
      state = 1;
    };
    const renderStart = performance.now();
    wavesurfer.load(SongAudio);
    wavesurfer.on('waveform-ready', () => {
      console.info(`Finished rendering waveforms. Took ${Math.floor(performance.now() - renderStart)} ms.`);
      wavesurfer.zoom(window.width/SongAudio.duration);
      extras.view.exec();
      state = 3;
      SongAudio.pause();
      SongAudio.controls = true;
      SongAudio.preload = "auto";
      SongAudio.id = "SongAudio";
      document.body.append(SongAudio);
    });
    wavesurfer.on('seek', () => {
      yt = 0;
      t = SongAudio.currentTime*1000;
    })
  };
  const audioPATH = d.split('\n').filter(e => e.startsWith('AudioFilename: '))[0].replace('AudioFilename: ', '');
  console.log("Audio file: " + audioPATH);
  try {
    const bgPATH = mapdata.header.split('\n[').filter(e => e.startsWith('Events]\n'))[0].split('\n').filter(e => e.startsWith('0,0,'))[0].replace('0,0,"', '').replace('",0,0', '');
    console.log(bgPATH);
    if(files[bgPATH]){
      const divBG = document.getElementById('bg');
      const bgURL = URL.createObjectURL(files[bgPATH]);
      divBG.style.backgroundImage = `url("${bgURL}")`;
    }
  }catch(error){ console.info("Cannot find map background"); console.error(error); }
  parse.readAsDataURL(files[audioPATH].slice(0));
  document.title = "editing | " + mapdata.filename;
}

/* toggling the webkitdirectory input */
const toggleUploadText = document.getElementById('toggleUploadText');
document.getElementById('toggleUploadFolder').addEventListener('click', () => {
  const T = folder.getAttribute('webkitdirectory') === null;
  folder[T ? 'setAttribute' : 'removeAttribute']('webkitdirectory', '');
  toggleUploadText.innerHTML = T ? "Upload <strong>song</strong> folder." : "Upload <strong>.osz</strong> file.";
});

/* sidebar menu mode js */
const modes = sideMenu.getElementsByTagName('div');
function setMode(HTMLObject){
  for(let i = 0; i < modes.length; i ++) modes[i].className = "";
  HTMLObject.className = "selected";
  M = parseInt(HTMLObject.getAttribute('m'));
}
for(let i = 0; i < modes.length; i ++) modes[i].addEventListener('click', HTMLObject => setMode(HTMLObject.srcElement));

function download(data, fileName, fileOptions) {
  const _file = new File(data, fileName, fileOptions);
  const _link = document.createElement('a');
  _link.href = URL.createObjectURL(_file);
  _link.download = fileName;
  console.log(_link.href);
  _link.click();
  alert("Download started");
  URL.revokeObjectURL(_file);
}

const extras = {
  "SVprune": {
    desc: "Selects all TimingPoint(s) that are insignificant SV-wise and deletes them. (threshold 0.01ms)",
    exec: function(){
      TP.sort((a,b) => a.t-b.t);
      Object.keys(NS).map(k => delete NS[k]);
      NSl = 0;
      _t = TP[0].t;
      _tp = 0;
      for(let i = 1; i < TP.length-1; i ++){
      	const sv = TP[i];
      	const k = sv.i ? 1 : sv.mspb;
      	const k0 = TP[_tp].i ? 1 : TP[_tp].mspb;
      	_t += (TP[i].t - TP[i-1].t) * k;
      	if((TP[i+1].t - TP[_tp+1].t) * Math.abs(k - k0) < 0.01){
      		if(!sv.i){
            sv.select();
            /*C.filter(c => c.type).filter(c => c.notes.indexOf(sv)+1).forEach(c => c.notes.splice(c.notes.indexOf(sv), 1));
            TP.splice(i, 1);*/
            continue;
          }
        }else{
          _tp = i;
        }
      	//sv._t = _t;
      }
      console.log("Found %s TimingPoint(s) below threshold", NSl);
      C.forEach(c => {
        for(let i = c.notes.length-1; i >= 0; i --){
          const n = c.notes[i];
          if(n.selected()){
            c.notes.splice(i, 1);
            n.deselect();
            if(c.type) TP.splice(TP.indexOf(n), 1);
          }
        }
      });
    }
  },
  "TPexp": {
    desc: "Exports all TimingPoint(s) in .osu format",
    exec: function(){
      console.log(TP.map(p => `${Math.round(p.t)},${p.i ? p.mspb : -1/p.mspb*100},${p.m},${p.ss},${p.si},${p.v},${p.i+0},${p.k+0}`).join('\n'));
    }
  },
  "Nexp": {
    desc: "Exports all Note(s) in .osu format",
    exec: function(){
      console.log(C.slice(0, C.length-3).map(c => c.notes).reduce((a,b) => a.concat(b)).sort((a,b) => a.t-b.t).map(n => n.export('.osu')).join('\n'));
    }
  },
  "oEXP": {
    desc: "Exports edited file as .osu file (starts download)",
    exec: function(){
      download([`${mapdata.header}[TimingPoints]\n${TP.map(p => `${Math.round(p.t)},${p.i ? p.mspb : -1/p.mspb*100},${p.m},${p.ss},${p.si},${p.v},${p.i+0},${p.k+0}`).join('\n')}\n\n\n[HitObjects]\n${C.slice(0, C.length-3).map(c => c.notes).reduce((a,b) => a.concat(b)).sort((a,b) => a.t-b.t).map(n => n.export('.osu')).join('\n')}`], mapdata.filename, {type: 'text/plain'});
    }
  },
  "view": {
    desc: "view sv",
    exec: function(){
      cacheTP();
      live_sv = true;
    }
  }
};
for(let i in extras){
  const div = document.createElement('div');
  tippy(div, {
    arrow: false,
    content: extras[i].desc,
    placement: 'bottom'
  });
  div.innerText = i;
  div.addEventListener('click', extras[i].exec);
  sideMenu.append(div);
}

/*
  Exporting xpos: Math.floor((512/CS)*(0.5+COLUMN))
  TimingPoints: TP.map(p => `${Math.round(p.t)},${p.i ? p.mspb : -1/p.mspb*100},${p.m},${p.ss},${p.si},${p.v},${p.i+0},${p.k+0}`).join('\n')
*/
