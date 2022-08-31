import { Note, LongNote } from './modules/Notes.mjs';
import * as osu from './modules/codecs/osuCodec.mjs';

// console.log(osu);

let inputFile = document.getElementsByTagName("input")[0];
let selectFile;
inputFile.addEventListener('change', event => {
  // console.log(event.srcElement.files);
  const files = Array.from(event.srcElement.files);
  if(files.length > 0){
    selectFile?.remove();
    selectFile = document.createElement('select');
    let defaultOption = document.createElement('option');
      defaultOption.innerText = "(select a file)";
      selectFile.append(defaultOption);
    files.forEach((file, i) => {
      if(file.name.endsWith('.osu')){
        const option = document.createElement('option');
        option.value = i;
        option.innerText = file.name;
        selectFile.append(option);
      }
    });
    selectFile.addEventListener('change', () => {
      console.log(selectFile.value);
      const file = files[selectFile.value];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        const data = reader.result;
        const proj = osu.decode(data);
        proj.loadResources(files);
        console.log(proj);
        project = proj; // expose to global scope
        project.openEditor();
        // project.svColumns[0].blocks[0].func.openEditor(); // TODO: editor later
      });
      reader.readAsText(file);
      selectFile.remove();
      inputFile.remove();
    });
    document.body.append(selectFile);
  }
});
