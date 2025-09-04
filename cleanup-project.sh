#!/bin/bash

echo "🧹 Cleaning up Smart Context v2.0.0 Project"
echo "==========================================="

# Create directories for organization
mkdir -p archive/old-versions
mkdir -p archive/test-scripts
mkdir -p tests/demos

echo ""
echo "📁 Moving old database versions to archive..."
mv src/database-concurrent.js archive/old-versions/ 2>/dev/null
mv src/database-simple.js archive/old-versions/ 2>/dev/null
mv src/database-working.js archive/old-versions/ 2>/dev/null
# Keep database.js and database-sqljs.js (they're used)

echo "📁 Moving old fileScanner versions to archive..."
mv src/fileScanner-optimized.js archive/old-versions/ 2>/dev/null
# Keep fileScanner.js and fileScanner-scoped.js (they're used)

echo "📁 Moving old contextAnalyzer versions to archive..."
mv src/contextAnalyzer-fixed.js archive/old-versions/ 2>/dev/null
mv src/contextAnalyzer-pure.js archive/old-versions/ 2>/dev/null
# Keep contextAnalyzer.js (it's used)

echo "📁 Organizing test files..."
# Keep main tests
echo "  Keeping: test-e2e-context-package.js (comprehensive e2e tests)"
echo "  Keeping: test-relationships.js (relationship extraction tests)"

# Move demo tests to demos folder
mv test-demo-project.js tests/demos/ 2>/dev/null
mv demo-debug-scenario.js tests/demos/ 2>/dev/null
mv compare-with-grep.js tests/demos/ 2>/dev/null

# Move one-off debug tests to archive
mv test-comprehensive.js archive/test-scripts/ 2>/dev/null
mv test-context-package.js archive/test-scripts/ 2>/dev/null
mv test-context-simple.js archive/test-scripts/ 2>/dev/null
mv test-debug.js archive/test-scripts/ 2>/dev/null
mv test-final.js archive/test-scripts/ 2>/dev/null
mv test-paths.js archive/test-scripts/ 2>/dev/null
mv test-semantic.js archive/test-scripts/ 2>/dev/null
mv test-simple.js archive/test-scripts/ 2>/dev/null

echo "📁 Cleaning up temp files..."
rm -rf temp-validation/

echo ""
echo "✅ Cleanup Summary:"
echo "  • Old database versions → archive/old-versions/"
echo "  • Old scanner/analyzer versions → archive/old-versions/"
echo "  • One-off test scripts → archive/test-scripts/"
echo "  • Demo scripts → tests/demos/"
echo "  • Temp validation files → removed"
echo ""
echo "📝 Files kept in src/:"
echo "  • Core: index.js, contextPackageGenerator.js"
echo "  • Database: database.js, database-sqljs.js"
echo "  • Scanners: fileScanner.js, fileScanner-scoped.js"
echo "  • Analysis: contextAnalyzer.js, semanticSearch.js, smartGrep.js"
echo "  • Git: gitAnalyzer.js"
echo "  • Utils: learning.js, conversationTracker.js, logger.js, config.js"
echo ""
echo "🎯 Project is now clean and organized for v2.0.0!"