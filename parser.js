import { Note, LongNote } from './modules/Notes.mjs';
import * as osu from './modules/codecs/osuCodec.mjs';
// console.log(osu);

// PIXI setup
/*PIXI.BitmapFont.from('Arial', {
  fontName: "Arial",
  fontSize: 12,
  chars: [['a', 'z'], ['A', 'Z'], "!@#$%^&*()~{}[],.<>/ "],
});*/


let selectFile;
function parseFiles(files){
  console.log(files);
  selectFile?.remove();
  // create a secondary select element to select the specific difficulty of
  // the beatmap that we want to edit
  selectFile = document.createElement('select');
  let defaultOption = document.createElement('option');
  defaultOption.innerText = '(select a file)';
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
    // console.log(selectFile.value);
    const file = files[selectFile.value];
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      let _start = performance.now();
      const data = reader.result;
      const proj = osu.decode(data);
      proj.loadResources(files);
      console.log(proj);
      project = proj; // expose to global scope
      project.codec = osu; // expose more stuff to global scope
      console.log(0|(performance.now()-_start), "ms file load time");
      _start = performance.now();
      project.openEditor();
      console.log(0|(performance.now()-_start), "ms to open editor");
    });
    reader.readAsText(file);
    document.getElementById("loader").style.display = "none";
    // selectFile.remove();
    // inputFile.remove();
  });
  document.getElementById("loader").append(selectFile);
}

// folder input
(() => {
  let inputFile = document.getElementById('folder');
  inputFile.addEventListener('change', (event) => {
    // console.log(event.srcElement.files);
    const files = Array.from(event.target.files);
    if(files.length > 0){
      parseFiles(files);
    }
  });
})();

// zip file input
(() => {
  let inputFile = document.getElementById('zip');
  inputFile.addEventListener('change', async (event) => {
    // console.log(event.srcElement.files);
    const zipfile = event.target.files[0];
    if (!zipfile) {
      return;
    }
    // if we successfully loaded the zip, use jszip to unpack files
    // see https://stuk.github.io/jszip/documentation/examples/read-local-file-api.html
    // convert to file to treat as if it were a folder upload :: https://stackoverflow.com/a/42589217
    const jsZip = await Promise.all((await JSZip.loadAsync(zipfile))
      .filter(()=>true)
      .map(async n => new File([await n.async('blob')], n.name))
    );
    parseFiles(jsZip);
  });
})();

(() => {
  const rad = document.getElementsByClassName("fileType");
  for (let i = 0; i < rad.length; i++) {
    rad[i].addEventListener("change", () => {
      if (rad[i].value === "folder") {
        document.getElementById("zipSelector").style.display = "none";
        document.getElementById("folderSelector").style.display = "block";
      } else {
        document.getElementById("zipSelector").style.display = "block";
        document.getElementById("folderSelector").style.display = "none";
      }
    });
  }
})();
