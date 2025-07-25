FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy app files
COPY . .

# Create directory for database
RUN mkdir -p /app/data

# Environment variables
ENV NODE_ENV=production
ENV PROJECT_ROOT=/workspace

# The MCP server uses stdio, so we'll run it directly
CMD ["node", "src/index.js"]