declare module 'opentype.js' {
  export interface Font {
    unitsPerEm: number;
    charToGlyph(char: string): Glyph;
    getPath(text: string, x: number, y: number, fontSize: number, options?: any): Path;
    getAdvanceWidth(text: string, fontSize: number, options?: any): number;
  }
  
  export interface Glyph {
    advanceWidth: number;
  }
  
  export interface Path {
    toSVG(decimalPlaces?: number): string;
  }
  
  export function parse(buffer: ArrayBuffer): Font;
  
  export default {
    parse: parse,
  };
}


