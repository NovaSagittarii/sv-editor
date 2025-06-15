function download(data, fileName, fileOptions) {
  const _file = new File(data, fileName, fileOptions);
  const _link = document.createElement('a');
  _link.href = URL.createObjectURL(_file);
  _link.download = fileName;
  // console.log(_link.href);
  _link.click();
  // alert("Download started");
  URL.revokeObjectURL(_file);
}

function exportProject(codec='osuCodec'){
    x = codecs[codec].encode(project)
    console.log(x.length, "str length");
    download([x], project.getName() + "." + codecs[codec].EXTENSION, {type: 'text/plain'});
}

function normalizeProjectExport(){
  // project.blocks[1].func.openEditor(); // TODO : setup promise stuff on openEditor since it takes some time to load
  // setTimeout( () => {
    // project.blocks[1].func.editor.points.forEach(p => p.setX(1))
    project.blocks.filter(b => b.x == 4).forEach(b => b.func.set([0, 1]));
    exportProject();
  // }, 500);
}

/**
 * Decodes timestamp to milliseconds since start, returns null if failed.
 * @param {string} s in the form MM:SS:sss.*
 */
function decodeTime(s) {
  const ret = s.match(/^\s*(\d{2}):(\d{2}):(\d{3}).*$/);
  if (!ret) return null;
  const [_, min, sec, ms] = ret;
  return 60000 * +min + 1000 * +sec + +ms;
}

// function exportProjectCopy(){
//   project.blocks.splice(1)
//   exportProject();
// }

// function testSet(){
//   project.blocks[0].applyOnto(project.speed=[...new Array(project.notes[project.notes.length-1].getEnd())].map(() => 1))
//   return getCurrentOutputSpeed();
// }

function getCurrentOutputSpeed(){
  return project.speed[~~project.editor.t]
}

window.addEventListener('load', () => {
  const helperUtils = [
    {
      name: "Refresh",
      callback: () => project.editor.refreshOutput(),
    },
    {
      name: "Export osz",
      callback: () => exportProject('osuCodec'),
    },
    {
      name: "Export sf",
      callback: () => exportProject('editorCodec'),
    },
    {
      name: "Goto",
      callback: async () => {
        let t = decodeTime(await window.navigator.clipboard.readText());
        if (!isNaN(t)) project.editor.setTime(t);
      },
    },
  ];
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.top = 0;
  container.style.display = "flex";
  container.style.gap = "5px";
  container.style.zIndex = 100;
  document.body.append(container);
  for(const {name, callback} of helperUtils){
    const button = document.createElement("button");
    button.innerText = name;
    button.style.padding = "0.5em";
    button.addEventListener('click', () => callback());
    container.append(button);
  }
  // setInterval(() => {
  //   if(project?.editor && project?.editor?.songAudio?.playing() === false) project.editor.refreshOutput()
  // }, 1000);
});