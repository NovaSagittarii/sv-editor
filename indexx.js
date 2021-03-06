/**
 *
 * physics style equation ptsd intensifies ;_;
 *
 */

frameRate(0);

var y = 0;      // Y Pos
var z = 0.25;   // ZOOM
var zR =64;     // ZOOM RECIPROCAL
var t = 0;      // time [ms of song]
var d = 3;      // divisor
var to = 0;     // start time offset (tp.t)
var yo = 500;   // y offset (visual)
var yt = 0;     // y translate (beat)
var yc = 0;     // y correction (when pointer is misaligned with divisors)
var fy = 0;    // first line y (correction for hovering)
var fl = 0;     // first line (calculation)
var ll = 0;     // last line (calculation)
var tp = {                  // using one timing point for now
    t: 200,     // start time of timing point
    bpm: 176,   // bpm of timing point
    speed: 100, // slider velocity
};
var mspb = 60000/tp.bpm;    // milliseconds per beat

var SNAPPING_MODE = "round";

var mp = false;
var tile = getImage("cute/PlainBlock");

var colors = {
    "1": [color(0, 0, 0)],
    "2": [color(0, 0, 0),color(255, 0, 0)],
    "3": [color(255, 0, 0),color(200,0,200),color(200,0,200)],
    "4": [color(0, 0, 0),color(0,0,255),color(255, 0, 0),color(0,0,255)]
};

var Column = function(x, w, t){
    this.keys = [];
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
        if(YRP > height){
            continue;
        }
        if(YRP <= 0){
            break;
        }
        rect(this.x, YRP-4, this.w, 8);
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
        //text(Math[SNAPPING_MODE](mouseMS/mspb*d)*mspb/d, mouseX, mouseY-25);

        rect(this.x, Math[SNAPPING_MODE]((mouseY-fy) / (mspb*z/d)) * (mspb/d*z) + fy - 4, this.w, 8);

        //text(Math[SNAPPING_MODE]((mouseY-fy) / (mspb*z/d)) * (mspb/d*z) + fy, mouseX, mouseY+15);

        if(mp){
            this.notes.push(Math[SNAPPING_MODE](mouseMS/mspb*d)*mspb/d);
            //this.notes.sort(function(a,b){return a-b});
            mp = false;
        }

        line(mouseX-15, mouseY, mouseX-5, mouseY);
        line(mouseX+15, mouseY, mouseX+5, mouseY);
    }
};
var C = [];
for(var i = 0; i < 4; i ++){
    C.push(new Column(75+i*70, 70, 0));
}
for(var i = 0; i < 3; i ++){
    C.push(new Column(420+i*50, 50, 1));
}

var LB_C = C[0].x - C[0].w/2 - 15, RB_C = C[C.length-1].x + C[C.length-1].w/2 + 15;
var ZERO_CP = (C[0].x - C[0].w/2 + C[C.length-1].x + C[C.length-1].w/2) / 2, ZERO_W = RB_C-LB_C-15;

textAlign(CENTER, CENTER);
rectMode(CENTER);
imageMode(CENTER);

var mousePressed = function(){
    mp = true;
};
var keyPressed = function(){
    if(keyCode === RIGHT){
        yt = Math.floor(yt * d - 1/d) / d;
    }
    if(keyCode === LEFT){
        yt = Math.ceil(yt * d + 1/d) / d;
    }
    if(keyCode === UP){
        d ++;
    }
    if(keyCode === DOWN){
        d --;
    }
    switch(keyCode){
        case 189: // -
            z = 16 / (++ zR);
            break;
        case 187: // =
            z = 16 / (-- zR);
    }
    d = constrain(d, 1, 4);
    yc = -yt%(1/d)*d;
};

var lastFrameMS = millis();
var draw = function() {
    background(255, 255, 255);

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
    text("Z="+zR, 350, 400);
    text(this.__frameRate.toFixed(1) + "fps", 350, 415);

    //t += millis() - lastFrameMS;
    t++;
    lastFrameMS = millis();
    mp = false;
};

enableContextMenu();
