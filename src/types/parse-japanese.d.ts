declare module 'parse-japanese' {
  export default class ParseJapanese {
    constructor(options?: { pos?: boolean; position?: boolean; dicDir?: string });
    parse(text: string, callback: (tree: any) => void): void;
  }
} 