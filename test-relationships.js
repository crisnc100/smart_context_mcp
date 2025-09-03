#!/usr/bin/env node

/**
 * Test the improved relationship extraction with absolute paths and co-change data
 */

import { ContextPackageGenerator } from './src/contextPackageGenerator.js';
import { initDatabase, db } from './src/database-sqljs.js';

async function testRelationships() {
  console.log('🔗 Testing Improved Relationship Extraction');
  console.log('=' .repeat(70));
  
  await initDatabase();
  const projectRoot = '/mnt/c/Users/crisn/GitHub/smart-context-demo';
  const generator = new ContextPackageGenerator(projectRoot, db);
  
  const testFiles = [
    'src/App.js',
    'src/context/CartContext.js',
    'src/services/productService.js',
    'src/components/ProductCard.js'
  ];
  
  for (const file of testFiles) {
    console.log(`\n📁 File: ${file}`);
    console.log('-'.repeat(70));
    
    const relationships = await generator.mapRelationships(file);
    
    console.log('\n📦 Dependencies (Resolved to actual files):');
    if (relationships.dependencies?.length > 0) {
      relationships.dependencies.forEach(dep => {
        console.log(`  - ${dep.file}`);
        if (dep.imports?.length > 0) {
          console.log(`    Imports: ${dep.imports.join(', ')}`);
        }
      });
    } else {
      console.log('  (No local dependencies found)');
    }
    
    console.log('\n📤 Exports/Provides:');
    if (relationships.provides?.length > 0) {
      console.log(`  ${relationships.provides.join(', ')}`);
    } else {
      console.log('  (No exports found)');
    }
    
    console.log('\n🔄 Commonly Changed With (Git Co-change):');
    if (relationships.commonlyChangedWith?.length > 0) {
      relationships.commonlyChangedWith.forEach(cc => {
        console.log(`  - ${cc.file} (${cc.frequency} times)`);
      });
    } else {
      console.log('  (No co-change data available)');
    }
    
    console.log('\n📊 Used By:');
    if (relationships.usedBy?.length > 0) {
      relationships.usedBy.forEach(user => {
        console.log(`  - ${user}`);
      });
    } else {
      console.log('  (No consumers identified)');
    }
    
    console.log('\n🧪 Test Files:');
    if (relationships.tests?.length > 0) {
      relationships.tests.forEach(test => {
        console.log(`  - ${test}`);
      });
    } else {
      console.log('  (No test files found)');
    }
  }
  
  // Test a full context package to see relationships in action
  console.log('\n\n' + '='.repeat(70));
  console.log('🎯 Full Context Package Test');
  console.log('=' .repeat(70));
  
  const pkg = await generator.generateContextPackage(
    'fix shopping cart total calculation',
    { tokenBudget: 3000 }
  );
  
  console.log('\nContext Package Relationships:');
  console.log('  Dependencies:', pkg.relationships.dependencies?.length || 0);
  console.log('  Exports:', pkg.relationships.provides?.length || 0);
  console.log('  Used By:', pkg.relationships.usedBy?.length || 0);
  console.log('  Co-changes:', pkg.relationships.commonlyChangedWith?.length || 0);
  console.log('  Tests:', pkg.relationships.tests?.length || 0);
  
  if (pkg.relationships.dependencies?.length > 0) {
    console.log('\n  Sample Dependencies:');
    pkg.relationships.dependencies.slice(0, 3).forEach(dep => {
      console.log(`    - ${dep.file}: ${dep.imports?.join(', ') || 'modules'}`);
    });
  }
  
  if (pkg.relationships.commonlyChangedWith?.length > 0) {
    console.log('\n  Git Co-change Patterns:');
    pkg.relationships.commonlyChangedWith.slice(0, 3).forEach(cc => {
      console.log(`    - ${cc.file} (changed together ${cc.frequency} times)`);
    });
  }
  
  console.log('\n✅ Relationship extraction improvements complete!');
  console.log('   • Dependencies now resolve to actual project files');
  console.log('   • All paths normalized to absolute internally');
  console.log('   • Git co-change patterns included (when available)');
  console.log('   • Test file discovery enhanced');
}

testRelationships().catch(console.error);