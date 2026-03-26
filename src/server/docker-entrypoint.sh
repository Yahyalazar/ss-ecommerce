#!/bin/sh
# Reinstall dependencies to ensure compatibility
npm ci
node dist/server.js
