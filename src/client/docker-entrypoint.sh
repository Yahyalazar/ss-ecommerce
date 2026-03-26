#!/bin/sh
# Remove old node_modules that may have been mounted via volume
npm ci
exec npm run dev
