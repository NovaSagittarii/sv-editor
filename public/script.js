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
let tp = {                  // using one timing point for now
    t: 0,     // start time of timing point
    bpm: 176,   // bpm of timing point
    speed: 100, // slider velocity
};
let mspb = 60000/tp.bpm;    // milliseconds per beat

const SNAPPING_MODE = "round";
let tile;

let mp = false;

const colors = {
    "1": ["#000000"],
    "2": ["#000000","#FF0000"],
    "3": ["#FF0000","#C800C8","#C800C8"],
    "4": ["#000000","#0000FF","#FF0000","#0000FF"]
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
};
Column.prototype.draw = function() {
    noFill();
    stroke(0, 0, 0);
    rect(this.x, 300, this.w, height*2);
    for(var j = fl; j < ll; j ++){
        var YRP = yo-(to-t*d+(j+yt*d)*mspb)/d*z; // Y RENDER POSITION
        if(YRP > height){
            continue;
        }
        if(YRP <= 0){
            fy = YRP;// + mspb/d*z;
            break;
        }
        stroke(colors[d][Math.abs(j) % d]);
        line(this.LB, YRP, this.RB, YRP);

        //text((to+(j/d)*mspb), this.x, YRP-6);
    }
    noStroke();
    fill(0);
    for(var j = 0; j < this.notes.length; j ++){
        var YRP = yo - (this.notes[j] - (t+to) + yt*mspb) * z;
        //rect(this.x, YRP-4, this.w, 8);
        if(YRP > height+100){
            continue;
        }
        if(YRP <= 0){
            break;
        }
        image(tile, this.x, YRP - this.th/2, this.w, this.th);
        //text(this.notes[j], this.x, YRP-15);
    }
};
Column.prototype.checkPlacement = function(){
    if(Math.abs(mouseX - this.x) < this.w2){
        stroke(0, 0, 0, 100);
        fill(0, 0, 0, 150 + Math.cos(frameCount/16)*20);
        //rect(this.x, Math.floor((mouseY+7.5) /mspb/z*d) *mspb*z/d + (yo%(mspb*z/d)) - 7.5, this.w, 15);
        //image(tile, this.x, (Math.floor((mouseY) /mspb/z*d)+yc) *mspb*z/d + (yo%(mspb*z/d)) - this.th/2, this.w, this.th);

        var mouseMS = (yo - mouseY)/z - yt*mspb + to+t;
        text(~~mouseMS, mouseX, mouseY-15);
        rect(this.x, Math[SNAPPING_MODE]((mouseY-fy) / (mspb*z/d)) * (mspb/d*z) + fy - 4, this.w, 8);

        if(mp){
            this.notes.push(Math[SNAPPING_MODE](mouseMS/mspb*d)*mspb/d);
            this.notes.sort((a,b) => a-b);
            mp = false;
        }

        line(mouseX-15, mouseY, mouseX-5, mouseY);
        line(mouseX+15, mouseY, mouseX+5, mouseY);
    }
};
let C = [];
let state = 0;
let LB_C, RB_C, ZERO_CP, ZERO_W;

function preload(){
  tile = loadImage('https://cdn.glitch.com/bbcc0f1c-4353-4f2e-808d-19c8ff47a165%2Fmania-note2.png?v=1570597631148'); //loadImage('/assets/mania-note2.png');
}
function setup() {
	createCanvas(windowWidth, windowHeight);
	background(255, 255, 255);
  frameRate(240);
  imageMode(CENTER);
  textAlign(CENTER, CENTER);
  textSize(100);
  rectMode(CENTER);

  // strictly 4k only for now ***
  for(let i = 0; i < 4; i ++) C.push(new Column(75+i*70, 70, 0));
  for(let i = 0; i < 3; i ++) C.push(new Column(420+i*50, 50, 1));

  LB_C = C[0].x - C[0].w/2 - 15;
  RB_C = C[C.length-1].x + C[C.length-1].w/2 + 15;
  ZERO_CP = (C[0].x - C[0].w/2 + C[C.length-1].x + C[C.length-1].w/2) / 2;
  ZERO_W = RB_C-LB_C-15;
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
      if(AudioSource) text(`${AudioSource.currentTime().toFixed(1)} / ${AudioSource.buffer.duration.toFixed(1)}`, width/2, 200);

      state = 3;
      break;
    case 3:
      fl = Math.round(-yt + t/mspb)*d - 10;
      ll = Math.round(-yt + t/mspb)*d + 100;

      for(var i = 0; i < C.length; i ++){
        C[i].draw();
        C[i].checkPlacement();
      }
      stroke(0, 0, 0, 150);
      line(LB_C, yo-1, RB_C, yo-1);
      line(LB_C, yo+1, RB_C, yo+1);
      noStroke();
      fill(0, 0, 0, 255);
      rect(ZERO_CP, yo-(to-t*d+(yt*d)*mspb)/d*z, ZERO_W, 3);
      textSize(12);
      text("Z="+zR, RB_C+100, 400);
      text(frameRate().toFixed(1) + "fps", RB_C+100, 415);

      if(AudioSource) t = 1000*AudioSource.currentTime() || 0;
      mp = false;
      break;
  }
}
function mousePressed(){
  mp = true;
};
function keyPressed(){
  switch(keyCode){
    case 32: stop(); break;
    case 39: yt = Math.floor(yt * d - 1/d) / d; break; // LEFT
    case 37: yt = Math.ceil(yt * d + 1/d) / d; break; // RIGHT
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
};

const files = [];

const uploadDiv = document.getElementById('upload');
const folder = document.getElementById('folder');
const folderContents = document.getElementById('folderContents');

const AudioContext = window.AudioContext || window.webkitAudioContext;
const ctx = new AudioContext();
let AudioSource, AudioBuffer;

ctx.resume();

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
        const d = (await new Response(file).text()).replace(/\r/g,''); // purge le CARRIAGE RETURN \r
        if(d.split('\n').filter(e => e.startsWith('Mode: '))[0][6] != "3"){
          state = 0;
          uploadDiv.style.marginTop = 0;
          div.className = "invalid";
          div.removeChild(div.firstChild);
          alert("Wrong mode");
          return;
        }
        const Difficulty = {};
        d.split('\n\n').filter(e => e.startsWith('[Difficulty]'))[0].split('\n').slice(1).map(e => e.split(':')).map(e => Difficulty[e[0]] = e[1]);
        console.log(Difficulty);
        const Notes = d.split('\n\n\n')[1].split('\n').slice(1);
        const TimingPoints = d.split('\n\n').filter(e => e.startsWith('[TimingPoints]'))[0].split('\n').slice(1).map(e => e.split(','));
        const ColumnWidth = 512/Difficulty.CircleSize;

        console.log(TimingPoints);

        mspb = TimingPoints[0][1];
        to = TimingPoints[0][0];
        yo = height - 100;

        Notes.map(e => e.split(',')).forEach(e => {
          /* x,y,time,type,hitSound,endTime:extras */
          C[Math.floor(e[0] / ColumnWidth)].notes.push(e[2]);
        });

        const parse = new FileReader();
        parse.onload = async e => {
          AudioBuffer = await ctx.decodeAudioData(e.target.result);
          play();
          state = 2;
        };
        const audioPATH = d.split('\n').filter(e => e.startsWith('AudioFilename: '))[0].split(' ')[1];
        console.log("Audio file: " + audioPATH);
        parse.readAsArrayBuffer(files[audioPATH]);
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

function play(s){
  AudioSource = ctx.createBufferSource();
  AudioSource.buffer = AudioBuffer;
  AudioSource.connect(ctx.destination);
  AudioSource.start(0, s || 0);
  AudioSource.startTime = ctx.currentTime - (s||0);
  AudioSource.currentTime = function(){
    return Math.min(ctx.currentTime - this.startTime, this.buffer.duration);
  };
}
function stop(ms){
  AudioSource.stop();
}

/*
  Exporting xpos: Math.floor((512/CS)*(0.5+COLUMN))
*/
