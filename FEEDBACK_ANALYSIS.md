# User Feedback Analysis - Claude Code CLI

## Feedback Summary
User searched for "exercise naming formatting variation names" but Smart Context failed to find `exerciseFormatters.ts` which contained the relevant functions.

## Issues Identified

### 1. **Poor Semantic Search**
- Only 50% similarity score for relevant files
- Didn't recognize programming concepts like function names
- Query: "exercise naming formatting variation names"
- Target: `constructExerciseName`, `formatOptionName` functions

### 2. **Over-Conservative Filtering**
- 0 files included despite 8000 token budget
- Default minRelevanceScore (0.3) too high
- All files filtered out as "low relevance"

### 3. **Lack of Code-Aware Search**
- Doesn't parse function/class names
- Misses camelCase patterns
- No AST analysis for better matching

## Root Causes

1. **Semantic Search Limitations**
   - Current implementation uses basic NLP (compromise.js)
   - Treats code like natural language text
   - Doesn't understand programming patterns

2. **Fixed Thresholds**
   - Hard-coded 0.3 minimum relevance
   - No adaptive scoring based on results
   - Binary include/exclude decision

3. **Missing Code Intelligence**
   - No function/class name indexing
   - No camelCase tokenization
   - No import/export graph analysis

## Immediate Fixes for v1.1

### 1. **Lower Default Threshold**
```javascript
// In contextAnalyzer-pure.js
minRelevanceScore = config.get('context.minRelevanceScore', 0.15) // Was 0.3
```

### 2. **Add Function Name Extraction**
```javascript
// In fileScanner.js - Extract function names
const functionPattern = /(?:function|const|let|var)\s+(\w+)\s*[=:]/g;
const classPattern = /class\s+(\w+)/g;
const exportPattern = /export\s+(?:function|const|class)\s+(\w+)/g;
```

### 3. **Improve Query Analysis**
```javascript
// In semanticSearch.js - Handle camelCase
function tokenizeCamelCase(text) {
  return text.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
}
```

### 4. **Add Fallback Strategy**
```javascript
// If no files meet threshold, include top N anyway
if (included.length === 0 && sortedFiles.length > 0) {
  const topFiles = sortedFiles.slice(0, 5);
  // Include with warning about low scores
}
```

## Long-term Improvements (v2.0)

### 1. **AST-Based Indexing**
- Use @babel/parser or typescript compiler API
- Index function names, classes, exports
- Build proper symbol table

### 2. **Hybrid Search**
- Combine semantic + keyword + AST search
- Weight different signals appropriately
- Learn optimal weights from feedback

### 3. **Smart Thresholds**
- Dynamic threshold based on result distribution
- If best score is 0.5, adjust threshold to 0.3
- Never return empty results if files exist

### 4. **Better Feedback Loop**
- Show why files were excluded
- Suggest alternative queries
- Learn from user selections

## Comparison with Grep

User found Grep more effective because:
- Direct pattern matching
- No relevance filtering
- Immediate results

Smart Context should complement, not replace, direct search tools.

## Action Items

1. **v1.0.1 Hotfix**
   - Lower default threshold to 0.15
   - Add camelCase tokenization
   - Never return empty results

2. **v1.1 Update**
   - Add function/class name extraction
   - Implement fallback strategy
   - Improve feedback messages

3. **v2.0 Roadmap**
   - Full AST parsing
   - Hybrid search system
   - Learning from outcomes