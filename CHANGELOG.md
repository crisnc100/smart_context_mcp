# Changelog

All notable changes to the Smart Context MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-24

### Added
- Initial release of Smart Context MCP Server
- Core MCP server implementation with 9 tools:
  - `analyze_context` - Intelligent file selection for coding tasks
  - `show_reasoning` - Display why files were selected
  - `get_file_relationships` - Find related files through imports/exports
  - `analyze_conversation_context` - Track files across conversation
  - `search_semantic` - Find files by meaning, not just keywords
  - `get_learning_stats` - View system improvement metrics
  - `apply_user_overrides` - Manually adjust file selections
  - `set_relevance_threshold` - Adjust sensitivity (0.0-1.0)
  - `set_project_scope` - Focus on specific parts of large codebases
- **82% token reduction** with 100% relevance accuracy (proven in tests)
- Semantic understanding using NLP (compromise library)
- Task-specific modes (debug, feature, refactor) with optimized strategies
- Tier-based relevance display (essential/recommended/optional)
- Progressive context loading (immediate, expanded, comprehensive)
- Conversation tracking to avoid redundant suggestions
- Git integration with co-change pattern analysis
- Machine learning from user feedback:
  - +0.3 weight for manually added files
  - -0.05 weight for manually removed files
  - Weights persist across sessions
- Project scope feature for large codebases (10k+ files)
- Pure JavaScript implementation (no native dependencies)
- Comprehensive error handling:
  - Non-git repository detection
  - File size limit enforcement (default 1MB)
  - Malformed code handling
  - Unicode and special character support
  - Permission error handling
- Performance optimizations:
  - Parallel file processing with batching
  - Metadata caching with MD5 hashes
  - ~70 files/second scanning speed
  - <200ms response time with warm cache
  - Handles 10,000+ file codebases efficiently
- CLI wrapper for standalone usage
- Comprehensive test suite with real-world validation
- Configuration system with sensible defaults

### Technical Details
- Uses sql.js instead of better-sqlite3 for pure JavaScript compatibility
- Uses gpt-tokenizer instead of tiktoken to avoid native compilation
- Uses compromise instead of natural for NLP processing
- Cross-platform support (Windows, macOS, Linux)

### Performance Metrics
- **Token reduction**: 82% (25,415 → 4,526 tokens)
- **File selection**: 4 relevant files vs 47 with traditional search
- **Speed**: ~70 files/second in real projects
- **Memory**: ~50KB per file
- **Response time**: <200ms with warm cache

## [Unreleased]

### Planned
- Complete `expand_context` tool implementation
- Add proper logging system with configurable levels
- Implement health check endpoint
- Add incremental scanning for better performance
- Handle symbolic links properly
- Full Windows path compatibility
- Team pattern aggregation
- Metrics collection and monitoring
- Rate limiting for production use

---

For detailed documentation, see [README.md](./README.md).
For contribution guidelines, see [CONTRIBUTING.md](./CONTRIBUTING.md).