# Quick Start Guide

Get the Kodi Playlist Card running in 5 minutes!

## Prerequisites Checklist

- [ ] Home Assistant installed and running
- [ ] Access to Home Assistant admin panel
- [ ] `kodi_media_sensors` integration installed
- [ ] At least one Kodi instance configured

## Step 1: Find Your Config Entry ID (2 minutes)

### Via Home Assistant UI (Easiest)

1. Open Home Assistant web interface
2. Go to **Settings** (gear icon)
3. Select **Devices & Services**
4. Click **Integrations** tab
5. Find **kodi_media_sensors** in the list
6. Click on it
7. **Copy the entry ID** (shown in the integration title bar)
   - It looks like: `a1b2c3d4e5f6` or similar

**Save this ID!** You'll need it in Step 3.

### Via File (Alternative)

If UI doesn't work:

1. SSH into your Home Assistant machine (or use Studio Code Server)
2. Navigate to: `~/.homeassistant/`
3. Open: `.storage/core.config_entries`
4. Search for: `kodi_media_sensors`
5. Find the `"entry_id"` field
6. Copy that value

## Step 2: Install the Card (2 minutes)

### Option A: Via HACS (Recommended)

1. Open Home Assistant
2. Click **HACS** (if installed)
3. Click **Frontend**
4. Search: **Kodi Playlist Card**
5. Click **Install**
6. Click **Install** again to confirm
7. **Restart Home Assistant**
   - Settings → System → Restart Home Assistant

### Option B: Manual Installation

1. Download `kodi-playlist-card.js` from releases
2. SSH/Connect to Home Assistant
3. Create folder: `~/.homeassistant/www/kodi-playlist-card/`
4. Copy file into that folder
5. In Home Assistant UI:
   - Settings → Dashboards → Resources (⋯ menu)
   - Add resource:
     - URL: `/local/kodi-playlist-card/kodi-playlist-card.js`
     - Type: `JavaScript Module`
   - Refresh your browser
6. **Restart Home Assistant** to be safe

### Option C: Development Install

```bash
# Clone and build
git clone <repo-url>
cd kodi-playlist-card
npm install
npm run build

# Copy to Home Assistant
cp dist/kodi-playlist-card.js ~/.homeassistant/www/kodi-playlist-card/

# Add resource in Home Assistant UI (see Option B step 5)
```

## Step 3: Add Card to Dashboard (1 minute)

### Method 1: YAML Editor

1. Open Home Assistant Dashboard
2. Click edit (pencil icon)
3. Click "Edit dashboard" (three dots → Raw configuration editor)
4. Find the `views:` section
5. Add this card:

```yaml
views:
  - title: Home
    cards:
      - type: custom:kodi-playlist-card
        entry_id: "YOUR_ENTRY_ID_HERE"
        title: "Audio Playlist"
```

Replace `YOUR_ENTRY_ID_HERE` with the ID from Step 1.

6. Click "Save"
7. Click "Done"

### Method 2: UI Editor

1. Open Home Assistant Dashboard
2. Click edit (pencil icon)
3. Click "Add card"
4. Scroll down and select "Custom: Kodi Playlist Card"
5. Enter your `entry_id` from Step 1
6. (Optional) Enter a custom `title`
7. Click "Save"

## Step 4: Verify It Works (Optional)

1. Look for the card on your dashboard
2. You should see:
   - Title with music icon
   - Connection indicator (green dot = connected)
   - Playlist items with album art

3. **If it doesn't work**, check:

   ```
   ❌ Card doesn't appear at all
   ✅ Check browser console (F12 → Console tab)
   ✅ Look for JavaScript errors
   ✅ Verify custom resource is added
   ✅ Hard refresh (Ctrl+Shift+R)
   
   ❌ Card shows but says "Error"
   ✅ Check your entry_id is correct
   ✅ Verify kodi_media_sensors integration is installed
   ✅ Restart Home Assistant
   
   ❌ Playlist is empty
   ✅ Start playing something in Kodi
   ✅ Check Kodi is online
   
   ❌ Status shows "Offline"
   ✅ Check Kodi is running
   ✅ Check network connectivity
   ```

## Configuration Reference

### Minimal (Required)
```yaml
type: custom:kodi-playlist-card
entry_id: "a1b2c3d4e5f6"
```

### Full (All Options)
```yaml
type: custom:kodi-playlist-card
entry_id: "a1b2c3d4e5f6"      # Required
title: "My Music"              # Optional (default: "Audio Playlist")
```

## What You Should See

### 🟢 Connected State
- Green pulsing dot in top right
- Says "Live"
- Shows list of tracks with:
  - Album art thumbnail
  - Song title (bold)
  - Artist • Album (gray text)
  - Duration (mm:ss)

### 🟡 Connecting State
- Yellow pulsing dot
- Says "Connecting..."

### 🔴 Error/Offline State
- Red dot
- Says "Error" or "Offline"
- Check entry_id and integration status

### ⚪ Empty Playlist
- Says "No tracks in playlist"
- Play something in Kodi to populate

## Common Issues

### "entry_id not found"
```
1. Double-check you copied the ID correctly
2. Go back to Settings → Devices & Services → Integrations
3. Find kodi_media_sensors again
4. Copy the entry ID carefully (no spaces)
5. Update your card configuration
```

### "Card doesn't show up"
```
1. Make sure you added the resource:
   Settings → Dashboards → Resources
   URL: /local/kodi-playlist-card/kodi-playlist-card.js
   
2. Hard refresh browser: Ctrl+Shift+R (or Cmd+Shift+R on Mac)

3. Check browser console for errors (F12)

4. Try restarting Home Assistant:
   Settings → System → Restart Home Assistant
```

### "Status shows error but Kodi is running"
```
1. Check Kodi is actually playing or has a playlist
   
2. Verify kodi_media_sensors integration status:
   Settings → Devices & Services → Integrations
   Should show as "Loaded"
   
3. Check Home Assistant logs:
   Settings → System → Logs
   Look for kodi_media_sensors entries
```

### "Thumbnails don't load"
```
1. Make sure your Kodi HTTP server is accessible
   
2. Check that library scanning is enabled in Kodi
   
3. Try playing a different item (old library items might not have thumbnails)

4. Check browser console (F12) for image load errors
```

## Next Steps

Once it's working:

1. ✅ Try adding multiple cards for different Kodi instances
2. ✅ Customize the title for each card
3. ✅ Check out [EXAMPLES.md](EXAMPLES.md) for advanced layouts
4. ✅ Read [specs.md](specs.md) to understand how it works
5. ⏳ Wait for Phase 2 features:
   - Card configuration UI
   - Play buttons
   - Drag & drop reordering
   - Delete functionality

## Where to Get Help

- 📖 **Full Documentation**: See [README.md](README.md)
- 🔧 **Troubleshooting**: See [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md#troubleshooting)
- 📋 **Examples**: See [EXAMPLES.md](EXAMPLES.md)
- 📚 **Technical Details**: See [specs.md](specs.md)
- 🐛 **Issues**: Check GitHub issues or create a new one

## Quick Reference

| Task | What To Do |
|------|-----------|
| **Find entry_id** | Settings → Devices & Services → Integrations → kodi_media_sensors |
| **Add resource** | Settings → Dashboards → Resources (⋯ menu) |
| **Edit dashboard** | Click pencil icon on dashboard |
| **See errors** | Press F12, click Console tab |
| **Restart HA** | Settings → System → Restart Home Assistant |
| **Clear cache** | Ctrl+Shift+R (hard refresh browser) |

## You're Done! 🎉

The Kodi Playlist Card is now displaying your Kodi playlists in real-time.

Enjoy! 🎵

---

**Need more help?** 
- Check [README.md](README.md) for detailed documentation
- See [EXAMPLES.md](EXAMPLES.md) for configuration examples
- Review [specs.md](specs.md) for technical details
