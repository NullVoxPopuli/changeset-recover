#!/usr/bin/env node

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

yargs(hideBin(process.argv))
  .command(
    ['$0'],
    'Generate changesets based on merges to the default branch',
    () => {},
    async () => {

    }
  )
  .help()
  .demandCommand().argv;

