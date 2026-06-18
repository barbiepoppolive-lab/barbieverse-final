"""
Ocean Hunt Max Hit Monitor - Phone Setup Script
================================================
Generates Tasker configuration and setup instructions for the spare phone.
"""
import json
from pathlib import Path
from datetime import datetime, timezone, timedelta

IST = timezone(timedelta(hours=5, minutes=30))


def generate_tasker_config() -> dict:
    """
    Generate Tasker task configuration for automated screenshots.
    This creates a JSON file that can be imported into Tasker.
    """
    config = {
        "name": "OceanHunt_Screenshot",
        "description": "Automated screenshots for Ocean Hunt Max Hit monitoring",
        "version": "1.0",
        "created": datetime.now(IST).isoformat(),
        "tasks": [
            {
                "name": "Take Screenshot Every 10s",
                "description": "Captures screen and saves to sync folder",
                "steps": [
                    {
                        "action": "Media.Control",
                        "type": "Screenshot",
                        "description": "Take a screenshot"
                    },
                    {
                        "action": "File.Move",
                        "source": "/sdcard/Pictures/Screenshots/latest.png",
                        "destination": "/sdcard/Sync/OceanHunt/",
                        "description": "Move to sync folder"
                    }
                ]
            }
        ],
        "profiles": [
            {
                "name": "Ocean Hunt Active",
                "description": "Trigger when Ocean Hunt app is in foreground",
                "condition": "app = com.poppo.live",
                "interval_seconds": 10
            }
        ]
    }
    return config


def generate_setup_guide() -> str:
    guide = """
OCEAN HUNT MAX HIT MONITOR - PHONE SETUP GUIDE
================================================

PREREQUISITES:
- Spare Android phone with Poppo Live installed
- Ocean Hunt game accessible in Poppo Live
- Phone connected to same WiFi as desktop (for Syncthing)

STEP 1: Install Screenshot App
------------------------------
Option A (Recommended): Install "Screenshot Touch" from Play Store
  - Free, no ads, reliable
  - Supports auto-screenshot at intervals

Option B: Use built-in Android screenshot gesture
  - May need Tasker for automation

STEP 2: Install Syncthing on Phone
-----------------------------------
1. Install "Syncthing" from Play Store (free, open-source)
2. Open Syncthing and note the device ID
3. Add your desktop as a remote device (see desktop setup below)
4. Share the folder: /sdcard/Sync/OceanHunt/
   - This folder will be created by the sync setup

STEP 3: Configure Auto-Screenshot
----------------------------------
If using Screenshot Touch:
1. Open Screenshot Touch
2. Settings:
   - Capture method: Accessibility Service (recommended)
   - Save folder: /sdcard/Sync/OceanHunt/
   - Auto capture interval: 10 seconds
   - Start on boot: YES
   - Notification: Minimal (to avoid popup interference)

If using Tasker (more reliable but complex):
1. Install Tasker from Play Store (paid, but free trial available)
2. Import the generated tasker_config.json (see tasker_config.json)
3. Or manually create:
   - Profile: App > Poppo Live
   - Task: Media > Take Screenshot
   - Action: File > Move file to /sdcard/Sync/OceanHunt/
   - Loop: Wait 10 seconds, repeat

STEP 4: Configure Syncthing on Phone
-------------------------------------
1. Open Syncthing
2. Go to Devices > Add Device
3. Enter your desktop's device ID (from desktop Syncthing)
4. Go to Folders > Add Folder
5. Folder label: OceanHunt
6. Folder path: /sdcard/Sync/OceanHunt/
7. Share with your desktop device

STEP 5: Phone Settings
-----------------------
1. Disable screen timeout:
   Settings > Display > Sleep > Never (or max 30 min)
   Note: This will use more battery. Consider keeping phone plugged in.

2. Disable battery optimization for:
   - Screenshot Touch (or Tasker)
   - Syncthing
   - Poppo Live
   Settings > Apps > [App] > Battery > Unrestricted

3. Keep screen on while charging:
   Settings > Developer options > Stay awake: ON (optional)

4. Disable notifications that might overlay on screen:
   - Mute all non-essential notifications
   - Or enable DND mode (allow Syncthing and Screenshot Touch)

STEP 6: Test the Setup
-----------------------
1. Open Poppo Live on the phone
2. Navigate to Ocean Hunt
3. Wait 30 seconds
4. Check desktop: ocean_hunt_monitor/screenshots/raw/
5. You should see new .png files appearing every ~10 seconds

STEP 7: Start Monitoring
-------------------------
On desktop, run:
  python main.py

The system will automatically:
- Watch for new screenshots
- Run OCR on each one
- Classify events (Max Hit, Big Win, etc.)
- Store results in database
- Generate reports

TROUBLESHOOTING:
----------------
- No screenshots appearing:
  - Check Syncthing is running on both devices
  - Check screenshot app is running
  - Check phone is connected to WiFi
  - Check /sdcard/Sync/OceanHunt/ folder exists

- OCR not detecting text:
  - Run test_ocr.py on a sample screenshot
  - Adjust BANNER_REGION in config.py if needed
  - Check screenshot quality (not too blurry)

- Phone overheating:
  - Reduce screenshot frequency to 15-20 seconds
  - Keep phone in a cool location
  - Consider using a phone cooling pad

- App crashes or logout:
  - Enable auto-start for Poppo Live
  - Keep phone plugged in and charged
  - Health monitor will alert if no screenshots for 5+ minutes
"""
    return guide.strip()


def generate_sync_folder_script() -> str:
    """Generate a PowerShell script to set up Syncthing on desktop."""
    script = """
# Ocean Hunt Monitor - Desktop Syncthing Setup
# Run this script to set up the sync folder on your desktop

# Create sync folder
$syncFolder = "$env:USERPROFILE\\Sync\\OceanHunt"
New-Item -ItemType Directory -Path $syncFolder -Force

# Create symbolic link to watcher input folder
$watcherFolder = "C:\\Users\\Priyanka Singh\\Downloads\\barbieverse-final\\ocean_hunt_monitor\\screenshots\\raw"

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
"""
    return script.strip()


def save_configs(output_dir: str = None):
    """Save all generated configs to files."""
    if output_dir is None:
        output_dir = Path(__file__).parent / "phone_setup"
    else:
        output_dir = Path(output_dir)

    output_dir.mkdir(parents=True, exist_ok=True)

    # Save Tasker config
    tasker_config = generate_tasker_config()
    with open(output_dir / "tasker_config.json", "w") as f:
        json.dump(tasker_config, f, indent=2)

    # Save setup guide
    guide = generate_setup_guide()
    with open(output_dir / "SETUP_GUIDE.txt", "w") as f:
        f.write(guide)

    # Save sync folder script
    sync_script = generate_sync_folder_script()
    with open(output_dir / "setup_sync_folder.ps1", "w") as f:
        f.write(sync_script)

    print(f"Phone setup files saved to: {output_dir}")
    print(f"Files created:")
    print(f"  - tasker_config.json")
    print(f"  - SETUP_GUIDE.txt")
    print(f"  - setup_sync_folder.ps1")


if __name__ == "__main__":
    save_configs()
    print()
    print(generate_setup_guide())
