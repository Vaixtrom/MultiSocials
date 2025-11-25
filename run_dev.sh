#!/bin/sh
# Source cargo environment to ensure tauri CLI is available
if [ -f "$HOME/.cargo/env" ]; then
    . "$HOME/.cargo/env"
fi

# Enable Rust backtrace for debugging crashes
export RUST_BACKTRACE=1

# Run the tauri dev command
npm run tauri dev