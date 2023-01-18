
class SpriteRenderer {
  constructor(app){
    const g = new PIXI.Graphics();
    g.beginFill(0x0077e6);
    g.drawRect(0, 0, 100, 40);
    g.endFill();

    this.Note = app.renderer.generateTexture(g);

    g.clear();
    g.beginFill(0x00e699);
    g.drawRect(0, 0, 100, 40);
    g.endFill();
    this.LongNoteHead = app.renderer.generateTexture(g);

    g.clear();
    g.beginFill(0x00b87a);
    g.drawRect(0, 0, 100, 40);
    g.endFill();
    this.LongNoteTail = app.renderer.generateTexture(g);

    g.clear();
    g.beginFill(0x00b87a);
    g.drawRect(0, 0, 1, 1); // uhh something about dont get over trimmed
    g.drawRect(70-2, 0, 1, 1); // welp might as well make it symmetrical
    g.drawRect(15, 0, 70, 1);
    g.endFill();
    this.LongNoteBody = app.renderer.generateTexture(g);
  }
}

export { SpriteRenderer };
export default SpriteRenderer;
