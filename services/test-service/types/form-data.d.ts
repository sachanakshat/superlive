declare module 'form-data' {
  export default class FormData {
    constructor();
    append(key: string, value: any, options?: any): void;
    getHeaders(): Record<string, string>;
    getBoundary(): string;
    getBuffer(): Buffer;
    getLengthSync(): number;
    getLength(callback: (err: Error | null, length: number) => void): void;
    submit(url: string, callback: (err: Error | null, res: any) => void): void;
    pipe<T extends NodeJS.WritableStream>(dest: T): T;
  }
} 