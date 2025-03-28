import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

function customPack(): void {
  try {
    // Ensure tmp directory exists
    const tmpDir = path.join(process.cwd(), 'tmp', 'asyncapi');
    fs.mkdirSync(tmpDir, { recursive: true });

    // Run oclif pack without tar
    execSync('npx oclif pack win', { stdio: 'inherit' });

    // Run renaming script
    execSync('node scripts/releasePackagesRename.js', { stdio: 'inherit' });

    console.log('Packaging completed successfully');
  } catch (error) {
    console.error('Packaging failed:', error);
  }
}

customPack();
