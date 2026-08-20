#!/usr/bin/env bash
set -euo pipefail

echo "Hostname: $(hostname)"
echo "Date: $(date)"
echo "Uptime:"
uptime
echo "CPU:"
top -bn1 | head -n 5
echo "Memory:"
free -h
echo "Disk:"
df -h