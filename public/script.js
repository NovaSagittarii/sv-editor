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

let SNAPPING_MODE = "round";
let INVERTED_SCROLL = false;

const MODE_SELECT = 0, MODE_PLACE_NOTE = 1, MODE_PLACE_LONG_NOTE = 2;
let M = MODE_SELECT; // mode

let mp = false, mpx, mpy, mpMS, mr, mrx, mry, mrMS, mouseMS;
let sN = null;  // selectedNote
let clipboard = [];
const keys = {};

const COLUMN_FILL = "#202020";
const DSTROKE = ["#FFFFFF", "#FF0000", "#4444FF", "#CCCC00", "#777777", "#C800C8", "#8C008C", "#777777"];
//               1/1        1/2        1/4        1/8        1/16       1/3        1/6        1/12
const LINE_COLOR = DSTROKE[0];
const colors = {
  "1": [DSTROKE[0]],
  "2": [DSTROKE[0],DSTROKE[1]],
  "3": [DSTROKE[0],DSTROKE[5],DSTROKE[5]],
  "4": [DSTROKE[0],DSTROKE[2],DSTROKE[1],DSTROKE[2]],
  "6": [DSTROKE[0],DSTROKE[6],DSTROKE[5],DSTROKE[1],DSTROKE[6],DSTROKE[5]],
  "8": [DSTROKE[0],DSTROKE[3],DSTROKE[2],DSTROKE[3],DSTROKE[1],DSTROKE[3],DSTROKE[2],DSTROKE[3]],
  "12": [DSTROKE[0],DSTROKE[7],DSTROKE[6],DSTROKE[7],DSTROKE[5],DSTROKE[7],DSTROKE[1],DSTROKE[7],DSTROKE[6],DSTROKE[7],DSTROKE[5],DSTROKE[7]],
  "16": [DSTROKE[0],DSTROKE[4],DSTROKE[3],DSTROKE[4],DSTROKE[2],DSTROKE[4],DSTROKE[3],DSTROKE[4],DSTROKE[1],DSTROKE[4],DSTROKE[3],DSTROKE[4],DSTROKE[2],DSTROKE[4],DSTROKE[3],DSTROKE[4]],
};
const divisors = Object.keys(colors).map(e => parseInt(e));
const TimingPoint = function(to, mspb, m, ss, si, v, i, k){
  this.t = to;
  this.mspb = mspb > 0 ? mspb : -100/mspb;
  this.bpm = 60000/mspb;
  this.m = m;    // meter
  this.ss = ss;  // sample set
  this.si = si;  // sample index
  this.v = v|0;  // volume
  this.i = !!parseInt(i);  // inherited ?
  this.k = !!k;  // kiai ?
};
const Note = function(x, y, t, type, hs, et){
  this.t = t;
  this.ln = type > 100; // 1 - note, 128 - long_note
  this.hs = hs;
  this._t = et || t;
};
const Column = function(x, w, t){
  this.x = x;
  this.w = w;
  this.w2 = w/2;
  this.RB = x - w/2;
  this.LB = x + w/2;
  this.type = t;
  this.notes = [];
  this.th = Math.floor(tile.height * (w / tile.width)); // tile height
  this.thd2 = this.th/2;
  this.id = C.length;
};
Column.prototype.mouseOver = function(){
  return Math.abs(mouseX - this.x) < this.w2;
};
Column.prototype.draw = function() {
  fill(COLUMN_FILL);
  stroke(LINE_COLOR);
  strokeWeight(1);
  rect(this.x, 300, this.w, height*2);
  for(let j = fl; j < ll; j ++){
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
    const YRP = yo - (N.t - t + yt*mspb) * z;
    //rect(this.x, YRP-4, this.w, 8);
    if(!N.ln && YRP > height+100) break;
    if(YRP <= 0) continue;

    push();
    const sel = sN && sN[0] === N;
    if(sel){
      if(sN[2]){
        if(mouseIsPressed){
          if(!sN[3]) translate(mouseX - mpx, (mpMS-mouseMS) * z);
          tint(255, 150);
        }else{
          sN[2] = false;
        }
      }
      if(mr == 1 && mouseX!==mpx && mouseY!==mpy){ // when selected note gets released (assuming it got dragged)
        const t = (Math[SNAPPING_MODE](( (mouseMS-mpMS+N.t-(to % (mspb/d))) /mspb)*d)*mspb)/d + (to % (mspb/d));
        if(N.ln && sN[3]){
          N._t = Math.max(N.t, N._t-N.t+t);
          sN[3] = false;
        }else{
          N._t += t - N.t;
          N.t = t;
          if(!this.mouseOver()){ // shifting column of note
            for(let c = 0; c < C.length; c ++){
              if(C[c].mouseOver()){
                if(C[c].type != this.type) break; // column type (note/TP) mismatch
                C[c].notes.push(N);
                C[c].notes.sort((a,b) => a.t-b.t);
                this.notes.splice(j, 1);
                break;
              }
            }
          }
        }
      }
      if(!N.ln){
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
        if(mp == 1 && M == MODE_SELECT) sN = [N, this.id, true];
        if(mp == 3){ this.notes.splice(j, 1); TP.splice(TP.indexOf(N), 1); mp = false; sN = null; continue; }
        if(sel) sN[3] = true;
        tint(255, 150);
      }
      image(svTile, this.x, YRP - this.thd2, this.w, this.th);
      if(sel && sN[2] && mouseIsPressed) translate(-(mouseX - mpx), 0);
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
      textAlign(N.i ? RIGHT : LEFT, CENTER);
      //text(N.i ? (N.bpm.toFixed(2) + "bpm") : (N.mspb.toFixed(2) + "x"), N.i ? LB_C-5 : RB_C+5, YRP);
      text(N.i ? (N.bpm.toFixed(2) + "bpm") : (N.mspb.toFixed(2) + "x"), N.i ? LB_C-5 : RB_C+5, SongAudio.paused ? YRP : (TP[tp] == N) ? Math.min(YRP, yo) : Math.min(YRP, yo + 20*Math.abs(tp-TP.indexOf(N)))); // 20*Math.abs ensures only it gets Math.min'd when YRP is greater than yo. Allows transition smooth in, but hard snap out.
    }else{
      if(N.ln){
        const YRP_E = (sel && sN[3]) ? mouseY : (yo - (N._t - t + yt*mspb) * z);
        if(YRP_E > height+100) break;
        const YRP_C = (YRP+YRP_E)/2 - this.thd2; // yrender pos center

        if(this.mouseOver()){
          if(mouseY < YRP && mouseY > YRP_E){
            if(mp == 1 && M == MODE_SELECT) sN = [N, this.id, true];
            tint(255, 150);
          }
          if(mouseY < YRP_E && mouseY > YRP_E - this.th){
            if(mp == 1 && M == MODE_SELECT) sN = [N, this.id, true, 1];
            if(mp == 3){ this.notes.splice(j, 1); mp = false; sN = null; continue; }
            tint(255, 150);
          }
        }

        const LN_H = YRP - YRP_E - this.th; // long note height
        image(lnBody, this.x, YRP_C, this.w, LN_H);
        image(lnHead, this.x, YRP - this.thd2, this.w, this.th);

        if(sel){
          fill(255, 50);
          stroke(255, 100);
          strokeWeight(2);
          rect(this.x, YRP_C, this.w + 6, LN_H + this.th*2 + 6);
        }
        translate(this.x, YRP_E - this.thd2);
        scale(1, -1);
        image(lnHead, 0, 0, this.w, this.th);
      }else{
        if(this.mouseOver() && Math.abs(mouseY - YRP + this.thd2) < this.thd2){
          if(mp == 1 && M == MODE_SELECT) sN = [N, this.id, true];
          if(mp == 3){ this.notes.splice(j, 1); mp = false; sN = null; continue; }
          tint(255, 150);
        }
        image(tile, this.x, YRP - this.thd2, this.w, this.th);
      }
    }
    pop();
    // add different colors later ***
  }
};
Column.prototype.checkPlacement = function(){
  if(this.mouseOver()){
    stroke(LINE_COLOR);
    strokeWeight(2);
    //fill(0, 0, 0, 50 + Math.cos(frameCount/8)*20);
    //rect(this.x, Math.floor((mouseY+7.5) /mspb/z*d) *mspb*z/d + (yo%(mspb*z/d)) - 7.5, this.w, 15);
    //image(tile, this.x, Math[SNAPPING_MODE]((mouseY-fy) / (mspb*z/d)) * (mspb/d*z) + fy - this.thd2, this.w, this.th);

    text(~~mouseMS, mouseX, mouseY-15);
    //rect(this.x, Math[SNAPPING_MODE]((mouseY-fy) / (mspb*z/d)) * (mspb/d*z) + fy - this.thd2, this.w, this.th);

    if(sN === undefined){
      if(M == MODE_PLACE_NOTE && mp == 1){
        const t = (Math[SNAPPING_MODE](( (mouseMS-(to % (mspb/d))) /mspb)*d)*mspb)/d + (to % (mspb/d));
        if(this.type){
          const lTP = TP.filter(e => (e.t <= mouseMS)).reverse()[0];
          const nTP = new TimingPoint(t, lTP.i ? 1 : lTP.mspb, lTP.m, lTP.ss, lTP.si, lTP.v, false, lTP.k);
          TP.push(nTP);
          TP.sort((a,b) => a.t-b.t);
          this.notes.push(nTP);
        }else{
          this.notes.push(new Note(null, null, t, 0));
        }
        this.notes.sort((a,b) => a.t-b.t);
        mp = false;
      }
      if(M == MODE_PLACE_LONG_NOTE && mr == 1 && !this.type){
        const t = (Math[SNAPPING_MODE](( (mpMS-(to % (mspb/d))) /mspb)*d)*mspb)/d + (to % (mspb/d));
        const t_e = (Math[SNAPPING_MODE](( (mouseMS-(to % (mspb/d))) /mspb)*d)*mspb)/d + (to % (mspb/d));
        console.log(t, t_e);
        this.notes.push(new Note(null, null, t, 128, 0, t_e));
        this.notes.sort((a,b) => a.t-b.t);
        mr = false;
      }
    }

    line(mouseX-15, mouseY, mouseX-5, mouseY);
    line(mouseX+15, mouseY, mouseX+5, mouseY);
  }else if(mp && sN && sN[1] == this.id){
    sN = null;
  }
};
let C, TP = [], tp;
let state = 0;
let LB_C, RB_C, ZERO_CP, ZERO_W;

let sp_t; // scroll pause timeout
let tile, svTile, lnHead, lnBody;

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
  if(TP[tp].i){
    bpm = TP[tp].bpm;
    mspb = TP[tp].mspb;
    to = TP[tp].t;
    updateLineBuffers();
  }
}

function preload(){
  tile = loadImage('https://cdn.glitch.com/bbcc0f1c-4353-4f2e-808d-19c8ff47a165%2Fmania-note2.png?v=1570597631148'); //loadImage('/assets/mania-note2.png');
  svTile = loadImage('https://cdn.glitch.com/bbcc0f1c-4353-4f2e-808d-19c8ff47a165%2Fsv-note.png?v=1570675367228');
  lnHead = loadImage('https://cdn.glitch.com/bbcc0f1c-4353-4f2e-808d-19c8ff47a165%2Fmania-note2H.png?v=1570675914438');
  lnBody = loadImage('https://cdn.glitch.com/bbcc0f1c-4353-4f2e-808d-19c8ff47a165%2Fmania-note2L.png?v=1570675925075');
}
function setup() {
  createCanvas(windowWidth, windowHeight);
  background(255, 255, 255);
  frameRate(240);
  imageMode(CENTER);
  strokeCap(SQUARE);
  textAlign(CENTER, CENTER);
  textSize(100);
  rectMode(CENTER);
}
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
function draw() {
  switch(state){
    case 0:
      background(225);
      fill(255);
      text(".....".substring(0, (frameCount/30)%7), width/2, 200);
      break;
    case 1:
      background(225);
      fill(255);
      text("Parsing", width/2, 200);
    case 2:
      fill(255);
      background(225);
      if(SongAudio){
        text(`${SongAudio.currentTime.toFixed(1)} / ${SongAudio.duration.toFixed(1)}`, width/2, 200);
        if(C){
          state = 3;
          SongAudio.pause();
          SongAudio.controls = true;
          SongAudio.id = "SongAudio";
          document.body.append(SongAudio);
        }
      }
      break;
    case 3:
      background(70);
      mouseMS = (yo - mouseY)/z - yt*mspb + t;
      while(tp && t < TP[tp].t){
        tp --;
        updateTPInfo();
      }
      while(tp+1 < TP.length && t >= TP[tp+1].t){
        tp ++;
        updateTPInfo();
      }
      fl = Math.round(-yt + (t-to)/mspb)*d - flb;
      ll = Math.round(-yt + (t-to)/mspb)*d + llb;

      for(let i = 0; i < C.length; i ++) C[i].draw();
      for(let i = 0; i < C.length; i ++) C[i].drawNotes();
      for(let i = 0; i < C.length; i ++) C[i].checkPlacement();
      if(sN == null) sN = undefined;
      strokeWeight(1);
      stroke(LINE_COLOR);
      line(LB_C, yo-1, RB_C, yo-1);
      line(LB_C, yo+1, RB_C, yo+1);
      noStroke();
      fill(255, 200);
      rect(ZERO_CP, yo-(-t*d+(yt*d)*mspb)/d*z, ZERO_W, 3);
      textSize(12);
      text("Z="+zR, RB_C+100, 400);
      //text(frameRate().toFixed(1) + "fps", RB_C+100, 415);
      text(bpm.toFixed(2) + "bpm", RB_C+100, 430);
      text((TP[tp].i ? 1 : TP[tp].mspb).toFixed(2) + "x", RB_C + 100, 445);

      if(mouseIsPressed && M == MODE_SELECT){
        let mpy_a = mpy-(yt-mpyt)*mspb*z; // mpy adjusted
        stroke(255, 50);
        fill(255, 10);
        quad(mouseX, mouseY, mouseX, mpy_a, mpx, mpy_a, mpx, mouseY);
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
}
function mouseReleased(event){
  mr = event.button+1;
  mrx = mouseX;
  mry = mouseY;
  mrMS = mouseMS;
}
function mouseWheel(event) {
  if(state !== 3) return;
  if(sN && sN[0] instanceof TimingPoint && sN[3]){
    sN[0].mspb += (event.delta < 0 == INVERTED_SCROLL ? -1 : 1) / 10 * (keys[16]?5:1) / (keys[17]?10:1);
    return false;
  }else if(keys[17]){
    const temp_d = d;
    d = (event.delta > 0) ? d>>1 : d<<1;
    if(d < 1 || d > 16) d = temp_d; // REVERT !!
    updateLineBuffers();
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
    if(event.delta < 0 == INVERTED_SCROLL){
      if(SongAudio.paused && !sp_t){
        yt = Math.ceil(yt * d) / d - 1/d;
      }else{
        SongAudio.currentTime += mspb/d/1000;
        t = SongAudio.currentTime*1000;
      }
    }else{
      if(SongAudio.paused && !sp_t){
        yt = Math.round(yt * d) / d + 1/d;
      }else{
        SongAudio.currentTime -= mspb/d/1000;
        t = SongAudio.currentTime*1000;
      }
    }
  }
}
function keyPressed(){
  if(state !== 3) return;
  keys[keyCode] = true;
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
    case 39: yt = Math.ceil(yt * d) / d - 1/d; SongAudio.currentTime -= mspb/d/1000; break; // LEFT
    case 37: yt = Math.round(yt * d) / d + 1/d; SongAudio.currentTime += mspb/d/1000; break; // RIGHT
    case 38: d = divisors[divisors.indexOf(d)+1] || d; break; // UP
    case 40: d = divisors[divisors.indexOf(d)-1] || d; break; // DOWN
    case 46: // Del ete
      C.forEach(c => {
        if(c.x > Math.min(mpx, mrx) && c.x < Math.max(mpx, mrx)){
          for(let i = c.notes.length-1; i >= 0; i --){
            const n = c.notes[i];
            if(n.t > Math.min(mpMS, mrMS) && n.t < Math.max(mpMS, mrMS)){
              c.notes.splice(i, 1);
              if(c.type) TP.splice(TP.indexOf(n), 1);
            }
          }
        }
      });
      break;
    case 67: // C opy
      if(keys[17]){
        clipboard = C.map(c => (c.x > Math.min(mpx, mrx) && c.x < Math.max(mpx, mrx)) ? c.notes.filter(n => n.t > Math.min(mpMS, mrMS) && n.t < Math.max(mpMS, mrMS)) : []);
      }
      break;
    case 86: // V paste
      if(keys[17]){
        const clipboardFirst = Math.min(...clipboard.filter(c => c[0]).map(c => c[0].t)); // assuming no one uses a 65000k map xD
        const currentTime = t-yt*mspb;
        const offset = currentTime-clipboardFirst;
        const clipboard_offset = clipboard.map(c => c.length ? c.map(n => {n = Object.assign({}, n); n.t += offset; n._t += offset; return n}) : []);
        console.log(clipboard_offset);
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
    case 189: // -
      z = 16 / (++ zR);
      break;
    case 187: // =
      z = 16 / (-- zR);
  }
  updateLineBuffers();
  d = constrain(d, 1, 16);
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

let SongAudio;

function clearHTML(htmlElement){
  while (htmlElement.firstChild) htmlElement.removeChild(htmlElement.firstChild);
}

folder.addEventListener('change', e => {
  files.splice(0);
  clearHTML(folderContents);
  for (let file of Array.from(e.target.files)) {
    files[file.name] = file;

    const div = document.createElement('div');
    div.innerHTML = `${file.name} <div style="float:right">${(file.size/1024).toFixed(1)}KiB</div>`;
    div.className = "wrongExtension";
    if(file.name.includes('.osu')){
      const open = document.createElement('button');
      open.addEventListener('click', async () => {
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

        //                                                               ignoring :extras ***
        const Notes = d.split('\n\n\n')[1].split('\n').slice(1).map(e => e.split(':')[0].split(',').map(n => parseInt(n)));
        const TimingPoints = d.split('\n\n').filter(e => e.startsWith('[TimingPoints]'))[0].split('\n').slice(1).map(e => e.split(',').map(n => parseFloat(n) || parseInt(n)));
        const ColumnWidth = 512/Difficulty.CircleSize;

        C = [];
        yo = height - 150;
        // Add the columns (which notes will be added to)
        for(let i = 0; i < Difficulty.CircleSize; i ++) C.push(new Column(275+i*70, 70, 0));
        for(let i = 0; i < 3; i ++) C.push(new Column(345+(i+Difficulty.CircleSize)*70, 70, 1));
        calculateBoundaries();

        let TPC = 0;
        TimingPoints.forEach(e => {
          /*Offset, Milliseconds per Beat, Meter, Sample Set, Sample Index, Volume, Inherited, Kiai Mode*/
          const nTP = new TimingPoint(...e);
          TP.push(nTP);
          C[Difficulty.CircleSize + TPC%3].notes.push(nTP);
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

        tp = 0;
        mspb = TP[0].mspb;
        bpm = TP[0].bpm;
        t = to = TP[0].t;
        updateTPInfo();

        const parse = new FileReader();
        const parseStart = performance.now();
        parse.onload = async e => {
          const parseDone = performance.now();
          console.info(`Finished parsing audio file. Took ${Math.floor(performance.now() - parseStart)} ms.`);

          SongAudio = new Audio(e.target.result);
          SongAudio.onloadeddata = () => {
            console.info(`Finished loading audio file. Took ${Math.floor(performance.now() - parseDone)} ms.`);
            tp = 0;
            mspb = TP[0].mspb;
            bpm = TP[0].bpm;
            t = to = TP[0].t;
            SongAudio.currentTime = t/1000;
            updateTPInfo();
            SongAudio.play();
            state = 2;
          };
        };
        const audioPATH = d.split('\n').filter(e => e.startsWith('AudioFilename: '))[0].replace('AudioFilename: ', '');
        console.log("Audio file: " + audioPATH);
        parse.readAsDataURL(files[audioPATH]);
      });
      open.innerText = "Open";
      div.prepend(open);
      div.className = "valid";
      div.addEventListener('click', () => {
        console.log(file.name);
      });
    }
    folderContents.append(div);
  };
});

/*
  Exporting xpos: Math.floor((512/CS)*(0.5+COLUMN))
  TimingPoints: TP.map(p => `${Math.round(p.t)},${p.i ? p.mspb : -1/p.mspb*100},${p.m},${p.ss},${p.si},${p.v},${p.i+0},${p.k+0}`).join('\n')
*/
