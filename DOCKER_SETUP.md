# Docker Support for Smart Context MCP Server

## Running Smart Context in Docker

### Quick Start

1. **Build the image**:
```bash
docker build -t smart-context-mcp .
```

2. **Run for your project**:
```bash
docker run -it \
  -v /path/to/your/project:/workspace:ro \
  -v smart-context-data:/app/data \
  -e PROJECT_ROOT=/workspace \
  smart-context-mcp
```

### Using Docker Compose

1. **Set your project path**:
```bash
export PROJECT_PATH=/path/to/your/project
```

2. **Run**:
```bash
docker-compose up
```

## Claude Desktop Configuration for Docker

Since MCP servers communicate via stdio, you'll need to use a wrapper script:

### Option 1: Docker Wrapper Script

Create `smart-context-docker.sh`:
```bash
#!/bin/bash
docker run -i \
  -v "$PROJECT_ROOT:/workspace:ro" \
  -v smart-context-data:/app/data \
  -e PROJECT_ROOT=/workspace \
  smart-context-mcp
```

Then in Claude Desktop config:
```json
{
  "mcpServers": {
    "smart-context": {
      "command": "/path/to/smart-context-docker.sh",
      "env": {
        "PROJECT_ROOT": "/path/to/your/project"
      }
    }
  }
}
```

### Option 2: Docker Compose Wrapper

Create `smart-context-compose.sh`:
```bash
#!/bin/bash
cd /path/to/smart-context-mcp
PROJECT_PATH="$PROJECT_ROOT" docker-compose run --rm smart-context
```

## Benefits of Docker

1. **Consistent Environment**: Same behavior across all platforms
2. **Isolation**: No need to install Node.js locally
3. **Data Persistence**: Learning data stored in Docker volume
4. **Easy Updates**: Just pull the latest image
5. **Multiple Versions**: Run different versions for different projects

## Limitations

1. **Performance**: Slightly slower than native due to volume mounting
2. **Platform Paths**: Need to handle path translation for Windows
3. **Interactive Mode**: MCP stdio requires `-it` flags

## Production Docker Image

For a production-ready image, use multi-stage build:

```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run test

# Production stage
FROM node:18-alpine
RUN apk add --no-cache tini
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY --from=builder /app/src ./src
COPY --from=builder /app/bin ./bin
COPY --from=builder /app/config ./config

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/index.js"]
```

## Docker Hub Distribution

Once published to Docker Hub:
```bash
docker pull smartcontext/mcp-server:latest
```

Then users can run without building:
```bash
docker run -it \
  -v $(pwd):/workspace:ro \
  smartcontext/mcp-server:latest
```