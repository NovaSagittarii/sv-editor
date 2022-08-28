import { SvBlock } from './SvBlock.mjs';

class SvColumn {
  constructor(){
    this.blocks = [];
  }
  addBlock(svBlock){
    this.blocks.push(svBlock); // TODO: check no intersection
  }
}

export { SvColumn };
