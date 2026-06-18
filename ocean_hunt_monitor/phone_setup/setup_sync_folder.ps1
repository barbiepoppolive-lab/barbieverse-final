# Ocean Hunt Monitor - Desktop Syncthing Setup
# Run this script to set up the sync folder on your desktop

# Create sync folder
$syncFolder = "$env:USERPROFILE\Sync\OceanHunt"
New-Item -ItemType Directory -Path $syncFolder -Force

# Create symbolic link to watcher input folder
$watcherFolder = "C:\Users\Priyanka Singh\Downloads\barbieverse-final\ocean_hunt_monitor\screenshots\raw"

# Copy files from sync folder to watcher folder
# This script should be run as a scheduled task or monitored by Syncthing

Write-Host "Sync folder created at: $syncFolder"
Write-Host "Watcher input folder: $watcherFolder"
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Install Syncthing on desktop"
Write-Host "2. Add phone as remote device"
Write-Host "3. Share the OceanHunt folder"
Write-Host "4. Configure Syncthing to sync to: $syncFolder"
Write-Host "5. Set up folder watching: $syncFolder -> $watcherFolder"