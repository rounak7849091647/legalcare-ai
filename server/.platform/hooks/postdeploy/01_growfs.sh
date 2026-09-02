#!/bin/bash
# Grow the root partition + filesystem to use the resized (30GB) EBS volume.
ROOT_DEV=$(findmnt -no SOURCE / 2>/dev/null)
DISK=$(lsblk -no PKNAME "$ROOT_DEV" 2>/dev/null | head -1)
PART=$(echo "$ROOT_DEV" | grep -oE '[0-9]+$')
if [ -n "$DISK" ] && [ -n "$PART" ]; then
  growpart "/dev/$DISK" "$PART" 2>/dev/null || true
  FSTYPE=$(findmnt -no FSTYPE / 2>/dev/null)
  if [ "$FSTYPE" = "xfs" ]; then xfs_growfs / 2>/dev/null || true; else resize2fs "$ROOT_DEV" 2>/dev/null || true; fi
fi
df -h / | logger -t growfs
