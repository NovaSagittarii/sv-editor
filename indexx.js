var y = 0;      // Y Pos
var z = 0.25;   // ZOOM
var t = 1;      // time
var d = 3;      // divisor
var to = 0;     // start time offset (tp.t)
var yo = 500;   // y offset (visual)
var yt = 1;     // y translate (beat)
var tp = {
    t: 200,
    bpm: 176,
    speed: 100,
};
var mspb = 60000/tp.bpm;

var column = function(x, w){
    this.keys = [];
    this.x = x;
    this.w = w;
    this.RB = x - w/2;
    this.LB = x + w/2;
};
var C = [];
for(var i = 0; i < 4; i ++){
    C.push(new column(75+i*70, 70));
}
for(var i = 0; i < 3; i ++){
    C.push(new column(420+i*50, 50));
}

var LB_C = C[0].x - C[0].w/2 - 15, RB_C = C[C.length-1].x + C[C.length-1].w/2 + 15;
var ZERO_CP = (C[0].x - C[0].w/2 + C[C.length-1].x + C[C.length-1].w/2) / 2, ZERO_W = RB_C-LB_C-15;


var colors = {
    "1": [color(0, 0, 0)],
    "2": [color(0, 0, 0),color(255, 0, 0)],
    "3": [color(255, 0, 0),color(200,0,200),color(200,0,200)],
    "4": [color(0, 0, 0),color(0,0,255),color(255, 0, 0),color(0,0,255)]
};

textAlign(CENTER, CENTER);
rectMode(CENTER);

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
    d = constrain(d, 1, 4);
};

var draw = function() {
    background(255, 255, 255);
    for(var i = 0; i < C.length; i ++){
        noFill();
        stroke(0, 0, 0);
        var c = C[i];
        rect(c.x, 300, c.w, height*2);
        for(var j = -10; j < 100*d; j ++){
            var YRP = yo-(t-to+(j+yt*d)*mspb)/d*z; // Y RENDER POSITION
            if(YRP > height){
                continue;
            }
            if(YRP <= 0){
                break;
            }
            stroke(colors[d][Math.abs(j) % d]);
            line(c.LB, YRP, c.RB, YRP);
        }
    }
    stroke(0, 0, 0, 150);
    line(LB_C, yo-1, RB_C, yo-1);
    line(LB_C, yo+1, RB_C, yo+1);
    noStroke();
    fill(0, 0, 0, 255);
    rect(ZERO_CP, yo-(t-to+(yt*d)*mspb)/d*z+1, ZERO_W, 3);
};

enableContextMenu();
