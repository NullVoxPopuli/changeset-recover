#!/usr/bin/env ts-node
/* eslint-disable no-console */
/* eslint-disable n/shebang */

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

    const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

yargs(hideBin(process.argv))
  .command(
    ['sync-package-json'],
    /**
      * https://github.com/pnpm/pnpm/issues/5541
      */
    'Work around a compat issue with using YAML as package.json',
    () => {},
    async () => {
      // Looks like this package is compiled incorrectly?
      // double default? wat
      let { default: { default: write } } = await import('@pnpm/write-importer-manifest');
      let { readImporterManifestOnly: read } = await import('@pnpm/read-importer-manifest')
      let tmpLocation = await createTmp();

      let packagePath = path.join(__dirname, 'package.yaml');
      let standardPath = path.join(__dirname, 'package.json');
      
      await fs.cp(packagePath, path.join(tmpLocation, 'package.yaml'));

      // @ts-ignore
      let manifest = await read(tmpLocation);
      // @ts-ignore
      await write(standardPath, manifest);

      console.info(`${standardPath} written.`);
    }
  )
  .help()
  .demandCommand().argv;

export async function createTmp(prefix = 'this-feature-is-not-ready') {
  let prefixPath = path.join(os.tmpdir(), prefix);

  let tmpDirPath = await fs.mkdtemp(prefixPath);

  return tmpDirPath;
}
