import { Note, LongNote } from './modules/Notes.mjs';
import * as osu from './modules/codecs/osuCodec.mjs';
// console.log(osu);

// folder input
(() => {
  let inputFile = document.getElementById('folder');
  let selectFile;
  inputFile.addEventListener('change', (event) => {
    // console.log(event.srcElement.files);
    const files = Array.from(event.target.files);
    if(files.length > 0){
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
        selectFile.remove();
        inputFile.remove();
      });
      document.body.append(selectFile);
    }
  });
})();

// zip file input
(() => {
  let inputFile = document.getElementById('zip');
  let selectFile;
  inputFile.addEventListener('change', async (event) => {
    // console.log(event.srcElement.files);
    const zipfile = event.target.files[0];
    if (!zipfile) {
      return;
    }
    // if we successfully loaded the zip, use jszip to unpack files
    // see https://stuk.github.io/jszip/documentation/examples/read-local-file-api.html
    try {
      selectFile?.remove();
      // create a secondary select element to select the specific difficulty of
      // the beatmap that we want to edit
      {
        selectFile = document.createElement('select');
        let defaultOption = document.createElement('option');
        defaultOption.innerText = '(select a file)';
        selectFile.append(defaultOption);
      }

      const jsZip = await JSZip.loadAsync(zipfile);

      jsZip
        .filter((_, file) => file.name.endsWith('.osu'))
        .forEach((file) => {
          const option = document.createElement('option');
          // we can use name to access the dictionary instead of an index
          // console.log(relativePath, zipEntry);
          option.value = file.name;
          option.innerText = file.name;
          selectFile.append(option);
        });

      // when the selected file is changed
      selectFile.addEventListener('change', async () => {
        // console.log(selectFile.value);
        const file = jsZip.files[selectFile.value];
        // console.log(file)
        // console.log('file stuff', file);

        let _start = performance.now();
        const data = await file.async('text');
        // console.log(data);
        const proj = osu.decode(data);
        // console.log(Array.from(zip.files));
        await proj.loadResourcesZip(jsZip);
        console.log(proj);
        project = proj; // expose to global scope
        project.codec = osu; // expose more stuff to global scope
        console.log(0|(performance.now()-_start), "ms file load time");
        _start = performance.now();
        project.openEditor();
        console.log(0|(performance.now()-_start), "ms to open editor");

        selectFile.remove();
        inputFile.remove();
      });
      document.body.append(selectFile);
    } catch (e) {
      console.error(e);
    }
  });
})();
