function beans(){
  var snd = new Howl({
    src: ["https://cdn.glitch.global/b040b548-0b90-4fed-8f1b-7160d1dc0dfd/audio.mp3?v=1650903320643"]
  })
snd.once('load', function(){
  snd.play();
});
}

var data, sound;
document.getElementsByTagName("input")[0].addEventListener('change', onChange);
function onChange(event) { /** https://github.com/goldfire/howler.js/issues/724#issuecomment-383418309 **/
  console.log(event.srcElement.files);
  if (event.srcElement.files.length > 0) {
    var file = event.srcElement.files[0];
    var reader = new FileReader();
    reader.addEventListener('load', function() {
      data = reader.result;
      sound = new Howl({
        src: data,
        format: file.name.split('.').pop().toLowerCase() // always give file extension: this is optional but helps
      });
      sound.once('load', () => sound.play());
    });
    reader.readAsDataURL(file);
  }
}
