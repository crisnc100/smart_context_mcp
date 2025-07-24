#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Read current version
const packageJson = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const currentVersion = packageJson.version;

// Get version bump type from command line
const bumpType = process.argv[2] || 'patch';
const validTypes = ['major', 'minor', 'patch', 'prerelease'];

if (!validTypes.includes(bumpType)) {
  console.error(`Invalid version bump type: ${bumpType}`);
  console.error(`Valid types are: ${validTypes.join(', ')}`);
  process.exit(1);
}

// Calculate new version
const [major, minor, patch] = currentVersion.split('.').map(Number);
let newVersion;

switch (bumpType) {
  case 'major':
    newVersion = `${major + 1}.0.0`;
    break;
  case 'minor':
    newVersion = `${major}.${minor + 1}.0`;
    break;
  case 'patch':
    newVersion = `${major}.${minor}.${patch + 1}`;
    break;
  case 'prerelease':
    if (currentVersion.includes('-')) {
      const [base, pre] = currentVersion.split('-');
      const preNum = parseInt(pre.split('.').pop()) || 0;
      newVersion = `${base}-${preNum + 1}`;
    } else {
      newVersion = `${currentVersion}-1`;
    }
    break;
}

console.log(`Bumping version from ${currentVersion} to ${newVersion}`);

// Update package.json
packageJson.version = newVersion;
writeFileSync(
  path.join(rootDir, 'package.json'),
  JSON.stringify(packageJson, null, 2) + '\n'
);

// Update VERSION file
writeFileSync(path.join(rootDir, 'VERSION'), newVersion + '\n');

// Update CHANGELOG.md
const changelog = readFileSync(path.join(rootDir, 'CHANGELOG.md'), 'utf8');
const date = new Date().toISOString().split('T')[0];
const newChangelog = changelog.replace(
  '## [Unreleased]',
  `## [Unreleased]\n\n## [${newVersion}] - ${date}`
);
writeFileSync(path.join(rootDir, 'CHANGELOG.md'), newChangelog);

// Git operations
try {
  execSync('git add package.json VERSION CHANGELOG.md', { cwd: rootDir });
  execSync(`git commit -m "chore: bump version to ${newVersion}"`, { cwd: rootDir });
  execSync(`git tag -a v${newVersion} -m "Version ${newVersion}"`, { cwd: rootDir });
  
  console.log(`✅ Version bumped to ${newVersion}`);
  console.log(`📌 Created git tag: v${newVersion}`);
  console.log('\nTo publish this version:');
  console.log('  1. Push changes: git push && git push --tags');
  console.log('  2. Publish to npm: npm publish');
} catch (error) {
  console.error('❌ Git operations failed:', error.message);
  console.log('\nChanges have been made to files, but not committed.');
}