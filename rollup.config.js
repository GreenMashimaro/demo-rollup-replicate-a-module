import path from 'path';
import fs from 'fs/promises';
import commonjs from '@rollup/plugin-commonjs';

// we are determining these once upfront to improve performance
// you could also likely use path.join instead of path.resolve for even better performance
const srcPath = path.resolve(__dirname, 'src')
const commonFileId = path.resolve(srcPath, 'common.js');
const commonFileContentPromise = fs.readFile(commonFileId, 'utf8');
const aId = path.resolve(srcPath, 'a.js');
const bId = path.resolve(srcPath, 'b.js');

export default {
  input: {
    'a': 'src/a.js',
    'b': 'src/b.js'
  },
  plugins: [
    commonjs(),
    {
      name: 'duplicate-file',
      // To work correctly, this plugin needs to be placed before other plugins that perform 
      async resolveId(source, importer) {
        if (importer && (await this.resolve(source, importer, {skipSelf: true})).id === commonFileId) {
          switch (importer) {
            case aId:
              // if we import from one of the entry points, we attach the entrypoint as a "query parameter"
              // to the file name. That way, Rollup treats common.js as different files depending on the
              // importer. You could also implement a different logic here like appending just the top-level
              // directory name of the importer so that all importers in the same top-level directory share the
              // same version of the file.
              return `${commonFileId}?${aId}`;
            case bId:
              return `${commonFileId}?${bId}`;
            default:
              // all other importers will receive a shared copy of the file
              return commonFileId;
          }
        }
      },
      // We manually need to implement a loader for the file as Rollup does not know
      // we are referring to the same file everywhere.
      load(id) {
        if (id.startsWith(`${commonFileId}?`)) {
          return commonFileContentPromise;
        }
      }
    },
  ],
  output: {
    dir: 'dist',
    format: 'es'
  }
};