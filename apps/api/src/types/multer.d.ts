declare module 'multer' {
  import { Request } from 'express';

  interface File {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    destination: string;
    filename: string;
    path: string;
    buffer: Buffer;
  }

  interface StorageEngine {
    _handleFile(req: Request, file: File, cb: (error: Error | null, info?: Partial<File>) => void): void;
    _removeFile(req: Request, file: File, cb: (error: Error | null) => void): void;
  }

  interface DiskStorageOptions {
    destination?: string | ((req: Request, file: File, cb: (error: Error | null, destination: string) => void) => void);
    filename?: (req: Request, file: File, cb: (error: Error | null, filename: string) => void) => void;
  }

  function diskStorage(options: DiskStorageOptions): StorageEngine;

  interface Multer {
    (): any;
    diskStorage(options: DiskStorageOptions): StorageEngine;
  }

  const multer: Multer;
  export default multer;
  export { diskStorage, File, StorageEngine, DiskStorageOptions };
}

declare namespace Express {
  namespace Multer {
    type File = import('multer').File;
  }
}
