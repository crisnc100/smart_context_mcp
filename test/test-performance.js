import { FileScanner } from '../src/fileScanner.js';
import { OptimizedFileScanner } from '../src/fileScanner-optimized.js';
import path from 'path';

async function testPerformance() {
  console.log('⚡ Performance Comparison Test\n');

  const testProjectPath = path.join(process.cwd(), 'test-project');
  
  // Test 1: Original FileScanner
  console.log('📊 Testing Original FileScanner...');
  const originalScanner = new FileScanner(testProjectPath);
  
  console.time('  Original scan time');
  const originalFiles = originalScanner.scanCodebase();
  console.timeEnd('  Original scan time');
  console.log(`  Files found: ${originalFiles.length}`);
  
  // Test 2: Optimized FileScanner (sync mode)
  console.log('\n📊 Testing Optimized FileScanner (sync mode)...');
  const optimizedSyncScanner = new OptimizedFileScanner(testProjectPath, {
    parallel: false,
    enableCache: true
  });
  
  console.time('  Optimized sync scan time');
  const optimizedSyncFiles = await optimizedSyncScanner.scanCodebase();
  console.timeEnd('  Optimized sync scan time');
  console.log(`  Files found: ${optimizedSyncFiles.length}`);
  console.log(`  Errors: ${optimizedSyncScanner.getErrors().length}`);
  
  // Test 3: Optimized FileScanner (async/parallel mode)
  console.log('\n📊 Testing Optimized FileScanner (parallel mode)...');
  const optimizedAsyncScanner = new OptimizedFileScanner(testProjectPath, {
    parallel: true,
    batchSize: 5,
    enableCache: true
  });
  
  console.time('  Optimized parallel scan time');
  const optimizedAsyncFiles = await optimizedAsyncScanner.scanCodebase();
  console.timeEnd('  Optimized parallel scan time');
  console.log(`  Files found: ${optimizedAsyncFiles.length}`);
  console.log(`  Errors: ${optimizedAsyncScanner.getErrors().length}`);
  
  // Test 4: Cache performance
  console.log('\n📊 Testing cache performance...');
  console.time('  Second scan with cache');
  const cachedFiles = await optimizedAsyncScanner.scanCodebase();
  console.timeEnd('  Second scan with cache');
  console.log(`  Files found: ${cachedFiles.length} (from cache)`);
  
  // Test 5: Large file handling
  console.log('\n📊 Testing large file handling...');
  const largeFileScanner = new OptimizedFileScanner(testProjectPath, {
    maxFileSize: 100 * 1024, // 100KB limit
    parallel: true
  });
  
  console.time('  Scan with file size limit');
  const limitedFiles = await largeFileScanner.scanCodebase();
  console.timeEnd('  Scan with file size limit');
  
  const skippedFiles = limitedFiles.filter(f => f.skipped);
  console.log(`  Files scanned: ${limitedFiles.length}`);
  console.log(`  Files skipped due to size: ${skippedFiles.length}`);
  if (skippedFiles.length > 0) {
    skippedFiles.forEach(f => {
      console.log(`    - ${f.path}: ${f.skipReason}`);
    });
  }
  
  // Compare results
  console.log('\n📊 Results Comparison:');
  console.log('  Feature extraction comparison:');
  
  // Pick a sample file for detailed comparison
  const sampleFile = 'src/services/notification.service.js';
  const originalFile = originalFiles.find(f => f.path === sampleFile);
  const optimizedFile = optimizedAsyncFiles.find(f => f.path === sampleFile);
  
  if (originalFile && optimizedFile) {
    console.log(`\n  Sample file: ${sampleFile}`);
    console.log(`    Original - Imports: ${originalFile.imports.length}, Exports: ${originalFile.exports.length}, Functions: ${originalFile.functions.length}`);
    console.log(`    Optimized - Imports: ${optimizedFile.imports.length}, Exports: ${optimizedFile.exports.length}, Functions: ${optimizedFile.functions.length}`);
    
    // Check if hash is available
    if (optimizedFile.hash) {
      console.log(`    File hash: ${optimizedFile.hash}`);
    }
  }
  
  // Memory usage
  console.log('\n📊 Memory Usage:');
  const memUsage = process.memoryUsage();
  console.log(`  RSS: ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
  
  // Error handling
  console.log('\n📊 Error Handling:');
  const errors = optimizedAsyncScanner.getErrors();
  if (errors.length > 0) {
    console.log(`  Errors encountered: ${errors.length}`);
    errors.forEach(err => {
      console.log(`    - ${err.file || err.pattern}: ${err.error}`);
    });
  } else {
    console.log('  No errors encountered');
  }
  
  console.log('\n✅ Performance tests complete!');
}

testPerformance().catch(console.error);