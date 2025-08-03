# Smart-Context + Grep Usage Examples

## How It Works Together

Smart-Context analyzes your query → Identifies relevant files → Generates optimized grep patterns → You get precise code results

## Real-World Usage Scenarios

### Scenario 1: Understanding a Feature

**Without Smart-Context:**
```bash
# Multiple attempts to find the right pattern
grep -r "cart" .
# Too many results, try again
grep -r "addToCart" src/
# Still not finding the flow, try again
grep -r "CartContext" src/
```

**With Smart-Context + Grep:**
```javascript
// One command gives you the optimized search
smart_grep({query: "how does cart functionality work"})

// Returns:
{
  "command": "grep -n -C 3 'addToCart|removeFromCart|cartItems' src/context/CartContext.js src/pages/Products.js src/components/CartItem.js",
  "explanation": "Searching core cart methods in files ranked by relevance"
}

// Execute the command
$ grep -n -C 3 'addToCart|removeFromCart|cartItems' src/context/CartContext.js src/pages/Products.js
```

### Scenario 2: Debugging an Error

**Without Smart-Context:**
```bash
# Guessing where the problem might be
grep -r "NaN" .
grep -r "price" . | grep -i total
grep -r "getTotalPrice" .
```

**With Smart-Context + Grep:**
```javascript
smart_grep({query: "cart total showing NaN error"})

// Returns focused search:
{
  "command": "grep -n -C 5 'price.*quantity|total.*price|parseFloat|Number' src/context/CartContext.js src/utils/formatters.js",
  "patterns": {
    "primary": ["price.*quantity", "parseFloat|Number"],
    "explanation": "Searching for calculations that could produce NaN"
  }
}
```

### Scenario 3: Adding a New Feature

**Without Smart-Context:**
```bash
# Don't know what to look for as a template
grep -r "similar feature?" .
# Try to find patterns manually
find . -name "*cart*"
grep -r "Provider" src/
```

**With Smart-Context + Grep:**
```javascript
smart_grep({query: "implement wishlist feature like cart"})

// Returns:
{
  "command": "grep -n -B 2 -A 2 'CartProvider|CartContext|useCart' src/context/CartContext.js src/App.js",
  "explanation": "Showing cart implementation as template for wishlist",
  "tips": [
    "Copy CartContext.js structure for WishlistContext.js",
    "Follow the same provider pattern in App.js",
    "Replicate the custom hook pattern (useCart → useWishlist)"
  ]
}
```

### Scenario 4: Finding Authentication Points

**Without Smart-Context:**
```bash
grep -r "auth" . # Too broad
grep -r "login" src/ # Missing other auth methods
grep -r "token" . # Too many false positives
```

**With Smart-Context + Grep:**
```javascript
smart_grep({query: "where is authentication implemented"})

// Returns comprehensive search:
{
  "command": "grep -n -C 2 'login|logout|authenticate|currentUser|token' src/context/AuthContext.js src/services/authService.js src/components/Header.js",
  "patterns": {
    "primary": ["login|logout|authenticate", "currentUser|isAuthenticated"],
    "secondary": ["token|session", "verify|validate"]
  },
  "alternatives": [
    {
      "command": "grep -r -l 'useAuth' src/",
      "description": "Find all components using authentication"
    }
  ]
}
```

## Integration Workflow

### Step 1: Smart-Context Analyzes
```javascript
// User asks a question
"How do I add authentication check before adding to cart?"

// Smart-Context understands:
- Intent: implement security feature
- Concepts: [authentication, cart]
- Files needed: AuthContext, CartContext, Products
```

### Step 2: Generate Targeted Search
```javascript
// Smart-Context generates:
{
  "primary_search": "grep -n 'addToCart|useAuth' src/pages/Products.js src/context/CartContext.js",
  "check_pattern": "grep -n 'currentUser|isAuthenticated' src/context/AuthContext.js",
  "integration_points": "grep -n 'CartProvider|AuthProvider' src/App.js"
}
```

### Step 3: Execute and Understand
```bash
# Run the commands
$ grep -n 'addToCart|useAuth' src/pages/Products.js
# See exactly where to add the auth check

$ grep -n 'currentUser|isAuthenticated' src/context/AuthContext.js  
# Find the auth methods to use
```

## Advanced Patterns

### Pattern 1: Multi-Step Investigation
```javascript
// Start broad
smart_grep({query: "payment processing", maxFiles: 10})

// Then narrow based on results
smart_grep({query: "stripe payment integration", maxFiles: 3})
```

### Pattern 2: Learning from Success
```javascript
// After finding useful results
smart_context.recordSuccess({
  query: "cart functionality",
  pattern: "addToCart|removeFromCart",
  files: ["CartContext.js"]
})
// Future searches for cart will prioritize these patterns
```

### Pattern 3: Combining with Other Tools
```javascript
// Use smart_grep first
const grepCmd = await smart_grep({query: "api endpoints"})

// Then use git to see history
`git log -p --grep="api" -- ${grepCmd.files[0]}`
```

## Benefits in Practice

### Before: Multiple Attempts
```bash
grep -r "feature" .          # Too broad
grep -r "specific" src/       # Wrong pattern  
grep -r "actual" src/comp/    # Wrong directory
grep -rn "correct" src/lib/   # Finally found it
```

### After: One Smart Command
```javascript
smart_grep({query: "find feature implementation"})
// Returns: grep -n -C 3 'exact|patterns' correct/files.js
```

### Time Saved
- **Discovery**: 5-10 grep attempts → 1 smart command
- **Accuracy**: 50% relevant results → 90% relevant results  
- **Context**: Manual file finding → Automatic relevance ranking
- **Learning**: Repeat searches → Improved over time

## Command Reference

### Basic Usage
```javascript
smart_grep({
  query: "your question here"
})
```

### With Options
```javascript
smart_grep({
  query: "complex feature",
  maxFiles: 3,           // Limit scope
  includeContext: true,  // Add -C flag
  projectRoot: "./src"   // Specific directory
})
```

### Response Structure
```javascript
{
  command: "ready-to-run grep command",
  files: [{path, relevance, reason}],
  patterns: {primary: [...], secondary: [...]},
  alternatives: [{command, description}],
  tips: ["helpful suggestions"]
}
```

## Best Practices

1. **Start with smart_grep** for exploration
2. **Use returned command** directly in terminal
3. **Try alternatives** if primary doesn't work
4. **Record success** to improve future searches
5. **Combine with grep** for detailed investigation

## Integration with Claude Code

When Claude Code uses this hybrid approach:

1. **Query Analysis**: "I need to fix the cart total calculation"
2. **Smart-Context**: Ranks CartContext.js (90%), formatters.js (70%)
3. **Grep Generation**: `grep -n -C 5 'getTotalPrice|price.*quantity' [files]`
4. **Code Display**: Shows actual implementation with line numbers
5. **Solution**: Claude can now see and fix the exact problem

This combination gives Claude Code:
- **Intelligence** from smart-context (what to search)
- **Precision** from grep (actual code)
- **Efficiency** by searching only relevant files
- **Context** through ranked importance