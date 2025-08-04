# Fix for get_optimal_context Not Returning grepCommands

## The Problem
Line 439 filters out words < 3 characters, but "cart" and many programming terms are being excluded.

## Current Broken Code (lines 437-440):
```javascript
const keywords = args.task.toLowerCase()
  .split(/\s+/)
  .filter(word => word.length > 3 && !['what', 'where', 'when', 'does', 'work', 'find', 'show'].includes(word))
  .slice(0, 3);
```

## The Fix:
```javascript
// Better keyword extraction
const keywords = args.task.toLowerCase()
  .split(/\s+/)
  .filter(word => word.length > 2 && !['the', 'how', 'what', 'where', 'when', 'why', 'does', 'work', 'find', 'show', 'for', 'and', 'with'].includes(word))
  .slice(0, 5);

// Also extract camelCase and snake_case identifiers
const codeTerms = args.task.match(/\b([a-z]+(?:[A-Z][a-z]+)*|[A-Z][a-z]+(?:[A-Z][a-z]+)*|[a-z]+(?:_[a-z]+)+)\b/g) || [];

// Combine both
const allKeywords = [...new Set([...codeTerms, ...keywords])].slice(0, 5);
const pattern = allKeywords.join('|');
```

## Why It's Failing:
1. Filters out words <= 3 chars (excludes "cart", "api", "log", etc.)
2. No camelCase/snake_case extraction
3. Too few keywords (only 3)
4. Returns empty array when all words are filtered