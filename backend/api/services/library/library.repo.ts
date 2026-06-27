// File access for the run library. The storage seam — fs today.

import fs from "node:fs";

export interface LibraryRepo {
  /** File size in bytes, or null if the path isn't an existing file. */
  statFile(filePath: string): Promise<number | null>;
  openStream(filePath: string): fs.ReadStream;
}

export const fileLibraryRepo: LibraryRepo = {
  statFile: (filePath) =>
    new Promise((resolve) => {
      fs.stat(filePath, (err, stat) => resolve(err || !stat.isFile() ? null : stat.size));
    }),
  openStream: (filePath) => fs.createReadStream(filePath),
};
