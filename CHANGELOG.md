# Changelog

All notable changes to Smart Context MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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