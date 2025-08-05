FROM node:20.16.0-bullseye

WORKDIR /usr/src/app

RUN apt-get clean && apt-get update \
  && apt-get install -y --no-install-recommends \
  git \
  unzip \
  vim \
  gettext-base

# Install global packages
RUN npm install -g pm2 @nestjs/cli

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
