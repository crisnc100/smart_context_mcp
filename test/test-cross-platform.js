import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing Cross-Platform Path Handling\n');

// Test different path formats
const testPaths = {
  windows: [
    'C:\\Users\\test\\project',
    'C:/Users/test/project',
    'C:\\\\Users\\\\test\\\\project',
    '.\\src\\index.js',
    'src\\components\\App.js'
  ],
  unix: [
    '/home/user/project',
    '/Users/test/project',
    './src/index.js',
    'src/components/App.js'
  ]
};

console.log('Platform:', process.platform);
console.log('Path separator:', path.sep);
console.log('');

// Test path normalization
console.log('📁 Path Normalization Tests:');
console.log('-'.repeat(50));

const allPaths = [...testPaths.windows, ...testPaths.unix];
allPaths.forEach(testPath => {
  console.log(`Input:      ${testPath}`);
  console.log(`Normalized: ${path.normalize(testPath)}`);
  console.log(`Resolved:   ${path.resolve(testPath)}`);
  console.log('');
});

// Test path joining
console.log('🔗 Path Joining Tests:');
console.log('-'.repeat(50));

const baseDir = process.platform === 'win32' ? 'C:\\Projects' : '/home/user/projects';
const joinTests = [
  ['src', 'index.js'],
  ['src', '..', 'test', 'test.js'],
  ['./src', 'components', 'App.js']
];

joinTests.forEach(parts => {
  const joined = path.join(baseDir, ...parts);
  console.log(`Join(${baseDir}, ${parts.join(', ')}):`);
  console.log(`  Result: ${joined}`);
});

// Test relative paths
console.log('\n📍 Relative Path Tests:');
console.log('-'.repeat(50));

const from = process.platform === 'win32' ? 'C:\\Projects\\app\\src' : '/projects/app/src';
const to = process.platform === 'win32' ? 'C:\\Projects\\app\\test' : '/projects/app/test';
console.log(`From: ${from}`);
console.log(`To:   ${to}`);
console.log(`Relative: ${path.relative(from, to)}`);

// Test PROJECT_ROOT handling
console.log('\n🌍 PROJECT_ROOT Environment Tests:');
console.log('-'.repeat(50));

const testRoots = process.platform === 'win32' ? [
  'C:\\Users\\test\\my-project',
  'C:/Users/test/my-project',
  '.',
  './my-project',
  '~/my-project'
] : [
  '/home/user/my-project',
  '.',
  './my-project',
  '~/my-project'
];

testRoots.forEach(root => {
  console.log(`Input:    ${root}`);
  console.log(`Resolved: ${path.resolve(root)}`);
  console.log(`IsAbsolute: ${path.isAbsolute(root)}`);
  console.log('');
});

// Test file extension handling
console.log('📄 File Extension Tests:');
console.log('-'.repeat(50));

const files = [
  'index.js',
  'App.tsx',
  'README.md',
  '.gitignore',
  'file.test.js',
  'no-extension'
];

files.forEach(file => {
  console.log(`File: ${file}`);
  console.log(`  Extension: ${path.extname(file)}`);
  console.log(`  Basename: ${path.basename(file)}`);
  console.log(`  Without ext: ${path.basename(file, path.extname(file))}`);
});

console.log('\n✅ Cross-platform path handling tests complete!');