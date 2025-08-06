FROM node:22.9.0-bullseye

WORKDIR /usr/src/app

RUN apt-get clean && apt-get update \
  && apt-get install -y --no-install-recommends \
  git \
  unzip \
  vim \
  gettext-base

# Upgrade npm to 11.5.2 and install global packages
RUN npm install -g npm@11.5.2 pm2 @nestjs/cli

# Copy package files
COPY package*.json ./

# Install dependencies (skip prepare script for Docker build)
RUN npm install --legacy-peer-deps --ignore-scripts

# Copy TypeScript configuration files
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Copy source code
COPY . .

# Build the application
RUN npm run build

EXPOSE 3000

# Default command for production
CMD ["npm", "run", "start:prod"]
