#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Read package.json version
const packageJsonPath = join(projectRoot, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

// Update server.ts version
const serverTsPath = join(projectRoot, 'src', 'server.ts');
let serverContent = readFileSync(serverTsPath, 'utf8');

// Replace version in server.ts
const versionRegex = /version: ['"][\d.]+['"],/;
const newVersionLine = `version: '${version}',`;

if (versionRegex.test(serverContent)) {
  const oldVersionMatch = serverContent.match(versionRegex);
  const oldVersion = oldVersionMatch ? oldVersionMatch[0].match(/[\d.]+/)[0] : 'unknown';
  
  serverContent = serverContent.replace(versionRegex, newVersionLine);
  writeFileSync(serverTsPath, serverContent, 'utf8');
  console.log(`✅ Updated server.ts version: ${oldVersion} → ${version}`);
} else {
  console.log('❌ Could not find version line in server.ts');
  console.log('Expected format: version: \'X.Y.Z\',');
  process.exit(1);
}

console.log(`📦 Version sync complete: ${version}`);