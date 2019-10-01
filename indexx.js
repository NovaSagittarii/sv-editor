/**
 * 
 * physics style equation ptsd intensifies ;_;
 * 
 */

var y = 0;      // Y Pos
var z = 0.25;   // ZOOM
var t = 0;      // time
var d = 3;      // divisor
var to = 0;     // start time offset (tp.t)
var yo = 500;   // y offset (visual)
var yt = 0;     // y translate (beat)
var yc = 0;     // y correction (when pointer is misaligned with divisors)
var lo = 0;     // line offset
var tp = {
    t: 200,
    bpm: 176,
    speed: 100,
};
var mspb = 60000/tp.bpm;

var tile = getImage("cute/PlainBlock");

var colors = {
    "1": [color(0, 0, 0)],
    "2": [color(0, 0, 0),color(255, 0, 0)],
    "3": [color(255, 0, 0),color(200,0,200),color(200,0,200)],
    "4": [color(0, 0, 0),color(0,0,255),color(255, 0, 0),color(0,0,255)]
};

var column = function(x, w, t){
    this.keys = [];
    this.x = x;
    this.w = w;
    this.w2 = w/2;
    this.RB = x - w/2;
    this.LB = x + w/2;
    this.type = t;
    this.th = Math.floor(tile.height * (w / tile.width)); // tile height
};
column.prototype.draw = function() {
    noFill();
    stroke(0, 0, 0);
    rect(this.x, 300, this.w, height*2);
    for(var j = -10 - lo; j < 100*d - lo; j ++){
        var YRP = yo-(t-to+(j+yt*d)*mspb)/d*z; // Y RENDER POSITION
        if(YRP > height){
            continue;
        }
        if(YRP <= 0){
            break;
        }
        stroke(colors[d][Math.abs(j) % d]);
        line(this.LB, YRP, this.RB, YRP);
    }
};
column.prototype.checkPlacement = function(){
    if(Math.abs(mouseX - this.x) < this.w2){
        stroke(0, 0, 0, 100);
        fill(0, 0, 0, 150 + Math.cos(frameCount/16)*20);
        //rect(this.x, Math.floor((mouseY+7.5) /mspb/z*d) *mspb*z/d + (yo%(mspb*z/d)) - 7.5, this.w, 15);
        
        image(tile, this.x, (Math.floor((mouseY+7.5) /mspb/z*d)+yc) *mspb*z/d + (yo%(mspb*z/d)) - this.th/2, this.w, this.th);
        
        text(-((Math.floor(((mouseY+7.5) /mspb/z+yt)*d)+yc-(d-1))/d-5).toFixed(2), mouseX, mouseY-15);
    }
};
var C = [];
for(var i = 0; i < 4; i ++){
    C.push(new column(75+i*70, 70, 0));
}
for(var i = 0; i < 3; i ++){
    C.push(new column(420+i*50, 50, 1));
}

var LB_C = C[0].x - C[0].w/2 - 15, RB_C = C[C.length-1].x + C[C.length-1].w/2 + 15;
var ZERO_CP = (C[0].x - C[0].w/2 + C[C.length-1].x + C[C.length-1].w/2) / 2, ZERO_W = RB_C-LB_C-15;

textAlign(CENTER, CENTER);
rectMode(CENTER);
imageMode(CENTER);

var keyPressed = function(){
    if(keyCode === RIGHT){
        yt = Math.ceil(yt * d + 1/d) / d;
    }
    if(keyCode === LEFT){
        yt = Math.floor(yt * d - 1/d) / d;
    }
    if(keyCode === UP){
        d ++;
    }
    if(keyCode === DOWN){
        d --;
    }
    d = constrain(d, 1, 4);
    //lo = yt*d;
    yc = -yt%(1/d)*d;
};

var draw = function() {
    background(255, 255, 255);
    for(var i = 0; i < C.length; i ++){
        C[i].draw();
        C[i].checkPlacement();
    }
    stroke(0, 0, 0, 150);
    line(LB_C, yo-1, RB_C, yo-1);
    line(LB_C, yo+1, RB_C, yo+1);
    noStroke();
    fill(0, 0, 0, 255);
    rect(ZERO_CP, yo-(t-to+(yt*d)*mspb)/d*z, ZERO_W, 3);
};

enableContextMenu();
