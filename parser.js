import { Note, LongNote } from './modules/Notes.mjs';
import * as osu from './modules/codecs/osuCodec.mjs';

console.log(osu);

document.getElementsByTagName("input")[0].addEventListener('change', event => {
  // console.log(event.srcElement.files);
  if(event.srcElement.files.length > 0){
    const file = event.srcElement.files[0]; // TODO: filename parse & difficulty selection
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      const data = reader.result;
      const proj = osu.decode(data);
      console.log(proj);
      project = proj; // expose to global scope
    });
    reader.readAsText(file);
  }
});
