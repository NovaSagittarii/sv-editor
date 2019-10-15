let y = 0;      // Y Pos
let z = 0.25;   // ZOOM
let zR =64;     // ZOOM RECIPROCAL
let t = 0;      // time [ms of song]
let d = 2;      // divisor
let to = 0;     // start time offset (tp.t)
let yo = 500;   // y offset (visual)
let yt = 0;     // y translate (beat)
let yc = 0;     // y correction (when pointer is misaligned with divisors)
let fy = 0;    // first line y (correction for hovering)
let fl = 0;     // first line (calculation)
let ll = 0;     // last line (calculation)
let mspb;       // milliseconds per beat
let bpm;

let SNAPPING_MODE = "round";
let INVERTED_SCROLL = false;

let mp = false;
let sN = null;  // selectedNote
const keys = {};

const colors = {
  "1": ["#000000"],
  "2": ["#000000","#FF0000"],
  "3": ["#FF0000","#C800C8","#C800C8"],
  "4": ["#000000","#0000FF","#FF0000","#0000FF"]
};
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
Column.prototype.draw = function() {
  noFill();
  stroke(0, 0, 0);
  rect(this.x, 300, this.w, height*2);
  for(let j = fl; j < ll; j ++){
    const YRP = yo-((to-t)*d+(j+yt*d)*mspb)/d*z; // Y RENDER POSITION
    if(YRP > height) continue;
    if(YRP <= 0){
      fy = YRP;// + mspb/d*z;
      break;
    }
    stroke(colors[d][Math.abs(j) % d]);
    line(this.LB, YRP, this.RB, YRP);
  }
  noStroke();
  fill(0);
  for(var j = this.notes.length-1; j >= 0; j --){
    const N = this.notes[j];
    const YRP = yo - (N.t - t + yt*mspb) * z;
    //rect(this.x, YRP-4, this.w, 8);
    if(!N.ln && YRP > height+100) break;
    if(YRP <= 0) continue;

    push();
    if(sN && sN[0] == j && sN[1] == this.id) tint(0, 155);
    if(this.type){
      if(Math.abs(mouseX - this.x) < this.w2 && Math.abs(mouseY - YRP + this.thd2) < this.thd2){
        if(mp == 1) sN = [j, this.id];
        if(mp == 3){ this.notes.splice(j, 1); mp = false; continue; }
        tint(255, 100);
      }
      image(svTile, this.x, YRP - this.thd2, this.w, this.th);
      stroke(N.i ? "#FF0000" : "#00FF00");
      strokeWeight(2);
      line(LB_C, YRP, RB_C, YRP);
      stroke(255, 100);
      fill(0);
      textAlign(CENTER, BOTTOM);
      text(N.i ? (N.bpm.toFixed(2) + "bpm") : (N.mspb.toFixed(2) + "x"), this.x, YRP);
    }else{
      if(N.ln){
        const YRP_E = yo - (N._t - t + yt*mspb) * z;
        if(YRP_E > height+100) break;

        if(Math.abs(mouseX - this.x) < this.w2 && mouseY > YRP-this.thd2 && mouseY < YRP_E){
          if(mp == 1) sN = [j, this.id];
          if(mp == 3){ this.notes.splice(j, 1); mp = false; continue; }
          tint(255, 100);
        }

        const LN_H = YRP - YRP_E - this.th; // long note height
        image(lnBody, this.x, (YRP+YRP_E)/2 - this.thd2, this.w, LN_H);
        image(lnHead, this.x, YRP - this.thd2, this.w, this.th);
        translate(this.x, YRP_E - this.thd2);
        scale(1, -1);
        image(lnHead, 0, 0, this.w, this.th);
      }else{
        if(Math.abs(mouseX - this.x) < this.w2 && Math.abs(mouseY - YRP + this.thd2) < this.thd2){
          if(mp == 1) sN = [j, this.id];
          if(mp == 3){ this.notes.splice(j, 1); mp = false; continue; }
          tint(255, 100);
        }
        image(tile, this.x, YRP - this.thd2, this.w, this.th);
      }
    }
    pop();
    // add different colors later ***
  }
};
Column.prototype.checkPlacement = function(){
  if(Math.abs(mouseX - this.x) < this.w2){
    stroke(0, 0, 0, 100);
    fill(0, 0, 0, 50 + Math.cos(frameCount/8)*20);
    //rect(this.x, Math.floor((mouseY+7.5) /mspb/z*d) *mspb*z/d + (yo%(mspb*z/d)) - 7.5, this.w, 15);
    //image(tile, this.x, Math[SNAPPING_MODE]((mouseY-fy) / (mspb*z/d)) * (mspb/d*z) + fy - this.thd2, this.w, this.th);

    var mouseMS = (yo - mouseY)/z - yt*mspb + t;
    text(~~mouseMS, mouseX, mouseY-15);
    //rect(this.x, Math[SNAPPING_MODE]((mouseY-fy) / (mspb*z/d)) * (mspb/d*z) + fy - this.thd2, this.w, this.th);

    if(mp == 1 && !sN){
      const t = (Math[SNAPPING_MODE](( (mouseMS-(to % (mspb/d))) /mspb)*d)*mspb)/d + (to % (mspb/d));
      if(this.type){
        // SV Notes unsupporting for now.
      }else{
        this.notes.push(new Note(null, null, t, 0));
      }
      this.notes.sort((a,b) => a.t-b.t);
      mp = false;
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

let tile, svTile, lnHead, lnBody;

function calculateBoundaries(){
  LB_C = C[0].x - C[0].w/2 - 15;
  RB_C = C[C.length-1].x + C[C.length-1].w/2 + 15;
  ZERO_CP = (C[0].x - C[0].w/2 + C[C.length-1].x + C[C.length-1].w/2) / 2;
  ZERO_W = RB_C-LB_C-15;
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
  textAlign(CENTER, CENTER);
  textSize(100);
  rectMode(CENTER);
}
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
function draw() {
  background(225);
  switch(state){
    case 0:
      fill(255);
      text(".....".substring(0, (frameCount/30)%7), width/2, 200);
      break;
    case 1:
      fill(255);
      text("Parsing", width/2, 200);
    case 2:
      fill(255);
      if(SongAudio){
        text(`${SongAudio.currentTime.toFixed(1)} / ${SongAudio.duration.toFixed(1)}`, width/2, 200);
        if(C){
          state = 3;
          SongAudio.pause();
        }
      }
      break;
    case 3:
      if(tp && t < TP[tp].t){
        tp --;
        if(TP[tp].i){
          bpm = TP[tp].bpm;
          mspb = TP[tp].mspb;
          to = TP[tp].t;
        }
      }
      if(tp+1 < TP.length && t >= TP[tp+1].t){
        tp ++;
        if(TP[tp].i){
          bpm = TP[tp].bpm;
          mspb = TP[tp].mspb;
          to = TP[tp].t;
        }
      }

      fl = Math.round(-yt + (t-to)/mspb)*d - 10;
      ll = Math.round(-yt + (t-to)/mspb)*d + 100;

      for(var i = C.length-1; i >= 0; i --){
        C[i].draw();
        C[i].checkPlacement();
      }
      strokeWeight(1);
      stroke(0, 0, 0);
      line(LB_C, yo-1, RB_C, yo-1);
      line(LB_C, yo+1, RB_C, yo+1);
      noStroke();
      fill(0, 0, 0, 255);
      rect(ZERO_CP, yo-(-t*d+(yt*d)*mspb)/d*z, ZERO_W, 3);
      textSize(12);
      text("Z="+zR, RB_C+100, 400);
      //text(frameRate().toFixed(1) + "fps", RB_C+100, 415);
      text(bpm.toFixed(2) + "bpm", RB_C+100, 430);
      text((TP[tp].i ? 1 : TP[tp].mspb).toFixed(2) + "x", RB_C + 100, 445);

      if(SongAudio && !SongAudio.ended && !SongAudio.paused) t = 1000*SongAudio.currentTime || 0;
      mp = false;
      break;
  }
}
function mousePressed(event){
  mp = event.button+1;
  sN = null;
}
function mouseWheel(event) {
  if(state !== 3) return;
  if(keys[17]){
    d = constrain((event.delta > 0) ? d>>1 : d<<1, 1, 4);
    return false;
  }
  if(event.delta < 0 == INVERTED_SCROLL){
    if(SongAudio.paused){
      yt = Math.floor(yt * d - 1 / d) / d;
    }else{
      SongAudio.currentTime += mspb/d/1000;
    }
  }else{
    if(SongAudio.paused){
      yt = Math.ceil(yt * d + 1 / d) / d;
    }else{
      SongAudio.currentTime -= mspb/d/1000;
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
    case 39: yt = Math.floor(yt * d - 1/d) / d; SongAudio.currentTime -= mspb/d/1000; break; // LEFT
    case 37: yt = Math.ceil(yt * d + 1/d) / d; SongAudio.currentTime += mspb/d/1000; break; // RIGHT
    case 38: d ++; break; // UP
    case 40: d --; break; // DOWN
    case 189: // -
      z = 16 / (++ zR);
      break;
    case 187: // =
      z = 16 / (-- zR);
  }
  d = constrain(d, 1, 4);
  yc = -yt%(1/d)*d;
  return false;
};
function keyReleased(){
  delete keys[keyCode];
}
function snapTime(){
  const msOffset = (SongAudio.currentTime*1000 - to) % (mspb/d);
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
        const TimingPoints = d.split('\n\n').filter(e => e.startsWith('[TimingPoints]'))[0].split('\n').slice(1).map(e => e.split(',').map(n => parseFloat(n) || n));
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
        to = TP[0].t;

        const parse = new FileReader();
        const parseStart = performance.now();
        parse.onload = async e => {
          const parseDone = performance.now();
          console.info(`Finished parsing audio file. Took ${Math.floor(performance.now() - parseStart)} ms.`);

          SongAudio = new Audio(e.target.result);
          SongAudio.onloadeddata = () => {
            console.info(`Finished loading audio file. Took ${Math.floor(performance.now() - parseDone)} ms.`);
            snapTime();
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
*/
