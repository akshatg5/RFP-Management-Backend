# Use Node.js LTS version
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy TypeScript config
COPY tsconfig.json ./

# Copy source code
COPY src ./src

# Install TypeScript and ts-node globally
RUN npm install -g typescript ts-node

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 5000

# Start the application
CMD ["node", "dist/index.js"]