# Changelog

All notable changes to Smart Context MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-09-03

### 🚀 Complete Transformation: AI Context Engineer

This is a major rewrite that transforms Smart Context from a file selector to an AI Context Engineer that generates complete context packages for LLMs.

### Added
- **NEW TOOL: `generate_context_package`** - Complete context generation with code extraction
- **ContextPackageGenerator** - 1100+ line engine that powers the AI Context Engineer
- **Real Code Extraction** - Extracts actual functions and code sections, not just file paths
- **Relationship Mapping** - Resolves imports to actual project files with full dependency graph
- **Error Pattern Detection** - Recognizes NaN, null, undefined patterns and suggests fixes
- **Git Co-change Analysis** - Shows files that commonly change together
- **Token Budget Management** - Smart allocation across different context sections
- **Structured Output** - JSON/object format optimized for AI consumption
- **Session Tracking** - Unique session IDs for learning opportunities
- **Fallback Context** - Handles vague queries gracefully
- **Test File Discovery** - Enhanced detection across multiple patterns and directories
- **Codex CLI Support** - TOML configuration format for OpenAI Codex

### Changed
- **Core Philosophy** - From "helping grep" to "engineering complete context"
- **Output Format** - From file lists to structured context packages
- **Relationship Extraction** - All paths normalized to absolute internally
- **Import Resolution** - Imports now resolve to actual project files
- **Token Efficiency** - Improved to 20-30% typical usage
- **Database Integration** - Enhanced for co-change pattern storage

### Fixed
- Path normalization issues across all helper methods
- Empty results when thresholds too high
- Import/export extraction accuracy
- Array spread bugs in relationships
- Database filename mismatches
- Token budget enforcement

### Technical Details
- Core implementation in `contextPackageGenerator.js`
- Comprehensive end-to-end test suite
- 100% test pass rate on demo project
- Works alongside grep, doesn't replace it

## [1.0.1] - 2025-01-27

### Added
- Query Enhancement System that understands implicit code patterns
- Function-first semantic matching with 0.4 weight priority
- File pattern matching for common code conventions (formatter, utils, etc.)
- Fallback mechanism to always show top results even below threshold
- Comprehensive test suite with 10+ difficult test cases

### Changed
- Lowered default relevance threshold from 0.3 to 0.15
- Enhanced function extraction with multiple regex patterns
- Improved semantic similarity calculation with code-specific priorities
- Better tokenization including camelCase variations

### Fixed
- Issue where files like `exerciseFormatters.ts` weren't found for queries like "exercise naming formatting variation names"
- Empty result sets when all files scored below threshold
- Missing function detection for arrow functions and TypeScript methods

## [1.0.0] - 2025-01-25

### Added
- Initial release of Smart Context MCP Server
- Intelligent file context selection for LLM coding tasks
- Semantic understanding of task descriptions
- Task-specific modes (debug, feature, refactor)
- Git history analysis for co-change patterns
- Learning system that improves from usage feedback
- Progressive context loading (immediate, expanded, comprehensive)
- Conversation tracking to avoid file repetition
- Project scope configuration for large codebases
- Setup wizard for easy configuration
- Cross-platform support (Windows, macOS, Linux)
- Pure JavaScript implementation (no native dependencies)
- Comprehensive test suite
- Full MCP (Model Context Protocol) compatibility

### Features
- `setup_wizard` - Interactive setup and configuration checking
- `get_optimal_context` - Smart file selection based on task
- `set_project_scope` - Configure include/exclude patterns
- `search_codebase` - Semantic search across files
- `record_session_outcome` - Feedback for learning
- `get_file_relationships` - Analyze file dependencies
- `analyze_git_patterns` - Extract co-change patterns
- `get_learning_insights` - View learned patterns
- `apply_user_overrides` - Manual context adjustments

### Documentation
- Comprehensive README with examples
- Installation guide for all platforms
- Troubleshooting guide for common issues
- Quick start guide
- Visual setup guide

### Performance
- ~85 files/second scanning speed
- <200ms response time with warm cache
- ~30KB memory per file
- 85%+ relevance accuracy

### Security
- MIT License
- No external API calls
- All processing done locally
- Respects .gitignore patterns

[1.0.0]: https://github.com/crisnc100/smart-context-mcp/releases/tag/v1.0.0