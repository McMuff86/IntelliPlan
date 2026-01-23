FROM mcr.microsoft.com/devcontainers/typescript-node:1-20-bookworm

# Install additional dependencies
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends postgresql-client jq

# Install pnpm globally
RUN npm install -g pnpm
