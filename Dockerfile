FROM rust:1.83-bookworm

# Install system dependencies for Tauri
RUN apt-get update && apt-get install -y \
    libwebkit2gtk-4.1-dev \
    build-essential \
    curl \
    wget \
    file \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev \
    lld \
    llvm

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

WORKDIR /app

COPY . .

RUN npm install

# Build the app
# We use a specific target directory to make it easier to find artifacts if needed, 
# but default is fine.
RUN npm run tauri build