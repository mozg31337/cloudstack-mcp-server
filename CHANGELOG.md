# Changelog

All notable changes to the CloudStack MCP Server project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.3] - 2025-06-18

### Changed
- **License Change**: Changed from MIT to Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
- **License Restrictions**: Now prohibits commercial use while allowing personal, educational, and non-profit usage
- **Documentation Cleanup**: Removed internal versioning information from public README
- **Vibe Coding Disclaimer**: Added warning about AI-assisted development and production deployment considerations

### Documentation
- Updated LICENSE file with CC BY-NC-SA 4.0 terms
- Updated package.json license field
- Updated README.md license badge and section
- Added important notice about vibe coding methodology

## [1.1.2] - 2025-06-18

### Added
- **Comprehensive API Coverage Analysis**: Detailed analysis document comparing our capabilities vs CloudStack API
- **Enhanced Documentation**: Complete tool mapping table with all 29 MCP tools
- **Coverage Metrics**: 35-40% CloudStack API coverage analysis with growth tracking
- **Enterprise Readiness Assessment**: Functional coverage by category and use case

### Changed
- **Updated API Documentation**: Complete mapping of all current tools to CloudStack APIs
- **Enhanced README**: Added API coverage highlights and analysis references
- **Improved Cross-References**: Better documentation navigation and discoverability

### Documentation
- Created `docs/API-COVERAGE-ANALYSIS.md` with comprehensive capability comparison
- Updated API mapping table in `docs/API.md` with all current tools
- Added API coverage section to README with enterprise readiness highlights

## [1.1.1] - 2025-06-18

### Changed
- **Improved Build Process**: Enhanced preversion hooks for quality assurance
- **Enhanced Version Sync**: Better logging with before/after version comparison
- **Build Automation**: Automatic typecheck before version bumps

### Technical
- Refined version management workflow
- Improved version sync script output
- Streamlined build pipeline

## [1.1.0] - 2025-06-18

### Added
- **Complete Virtual Machine Management**: Migration, scaling, password management, NIC operations
- **Advanced Volume Management**: Volume migration, extraction, upload, metrics monitoring
- **Full Network Management**: Network lifecycle, IP management, NAT, port forwarding, ACLs
- **20+ New MCP Tools**: Expanded from 9 to 29 total tools for comprehensive CloudStack management
- **50+ New API Methods**: Extended CloudStack client with 60+ total API method implementations
- **Enhanced Error Handling**: Comprehensive validation and user-friendly error messages
- **Async Job Tracking**: Proper handling of long-running CloudStack operations
- **Response Formatting**: User-friendly output formatting for all operations

### Changed
- **Major Capability Expansion**: From basic listing operations to full infrastructure management
- **API Coverage**: Increased from ~5% to comprehensive coverage of VM, Volume, and Network APIs
- **Tool Count**: Expanded from 9 basic tools to 29 enterprise-ready management tools

### Technical
- **TypeScript Build**: Clean compilation with no errors
- **Test Infrastructure**: Fixed Jest configuration for ES module support
- **Code Quality**: ESLint compliance with CloudStack API type flexibility
- **Documentation**: Updated API documentation with complete tool reference

## [1.0.0] - 2025-06-18

### Added
- **Initial Release**: Basic CloudStack MCP Server implementation
- **Core Infrastructure**: MCP server setup with Claude Desktop integration
- **Basic Operations**: Initial listing tools for VMs, networks, volumes, snapshots
- **Authentication**: HMAC-SHA1 CloudStack API authentication
- **Configuration**: Multi-environment CloudStack configuration support
- **Testing Framework**: Jest-based testing infrastructure
- **Documentation**: Initial API documentation and setup guides

### Features
- 9 Basic MCP Tools: listing operations for infrastructure discovery
- 10 Core API Methods: foundational CloudStack API integration
- Configuration Management: environment-based CloudStack connection handling
- Error Handling: basic error management and logging
- TypeScript Implementation: full type safety and modern JavaScript features

---

## Version History Summary

- **v1.1.0**: Major feature milestone - Complete VM, Volume, and Network management
- **v1.0.0**: Initial release - Basic CloudStack integration and listing operations

## Versioning Strategy

**X.Y.Z Format:**
- **X (Major)**: Breaking changes, complete rewrites, major architectural changes
- **Y (Minor)**: Major functions and milestones, significant new feature sets
- **Z (Patch)**: Patches, fixes, feature improvements, individual tool additions