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

function exportProject(){
    x = project.codec.encode(project)
    console.log(x.length, "str length");
    download([x], "a.osu", {type: 'text/plain'});
}

function normalizeProjectExport(){
  // project.blocks[1].func.openEditor(); // TODO : setup promise stuff on openEditor since it takes some time to load
  // setTimeout( () => {
    project.blocks[1].func.editor.points.forEach(p => p.setX(1))
    exportProject();
  // }, 500);
}

function exportProjectCopy(){
  project.blocks.splice(1)
  exportProject();
}

function testSet(){
  project.blocks[0].applyOnto(project.speed=[...new Array(project.notes[project.notes.length-1].getEnd())].map(() => 1))
  return getCurrentOutputSpeed();
}

function getCurrentOutputSpeed(){
  return project.speed[~~project.editor.t]
}
