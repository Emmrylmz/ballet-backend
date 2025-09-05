# # Multi-stage Dockerfile for different environments
# FROM node:23-alpine AS base
# WORKDIR /app

# # Copy package files
# COPY package*.json ./

# # Install dependencies (this will install correct platform binaries)
# RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM node:23-alpine AS development
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies including devDependencies
RUN npm install && npm cache clean --force

# Copy source code (node_modules is already installed with correct platform)
COPY . .

# Expose port
EXPOSE 8000

# Start development server
CMD ["npm", "run", "dev"]

