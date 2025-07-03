<h3 align="center">
    <strong>SMS</strong>
</h3>

### Showcases

<p align="center">
    <img src="https://play.maple.music/SMS/uploads/Screenshot%202025-06-21%20225628.png" alt="SMS Screenshot">
</p>

https://github.com/user-attachments/assets/b7dfac92-f7b6-48b4-92dd-677fc9952333

> Need Help? Join my [Development Server](https://discord.gg/Wxrp73HVj4)

<p align="center">
    SMS makes simple file sharing easy! Upload, share, and manage your files quickly. Supports file expiration, quick filters, and previews!
</p>

## Use Cases

**Remote File Management**
- Access your home server or NAS remotely through Cloudflare Zero Trust or Tailscale
- Drag-and-drop file uploads from any device without SSH/SCP commands
- Manage media libraries for Plex, Jellyfin, and other media servers

**Quick Link Sharing\***
- Generate instant download links for files too large for traditional sharing services
- Set expiration times to automatically clean up storage
- Perfect for temporary file sharing with automatic cleanup

**Server Administration**
- Browse and organize server file systems through a web interface
- Upload configuration files, scripts, or media content easily
- Monitor storage usage and file expiration schedules

> *Disabled by default, to serve your files publicly, please enable "File Serving" in settings.

## Installation

**Clone Repository**
```bash
git clone https://github.com/Cattn/SMS && cd SMS
```

**Install Dependencies**
```bash
npm i
npm i -g concurrently
```

**Start Application**
```bash
npm run startall
```

The application will be available at `http://localhost:1337`

## Environment Setup

**Prerequisites**
- Node.js 18+ and npm

**Network Access**
- Frontend runs on port `1337`
- Backend API runs on port `5823`
- Both ports must be accessible for proper operation
- File serving runs on port ``3000`` (disabled by default)

**Security Note**
Do not expose ports 1337 and 5823 directly to the internet. Use reverse proxy, VPN, or tunneling solutions like Cloudflare Zero Trust or Tailscale for remote access.

## Configuration

Configuration is automatically generated in `api/config.json` on first startup. Settings can be modified:
- Through the web interface (Settings tab)
- By directly editing the JSON file (no restart required)

## Build Scripts

**Production Deployment**
```bash
npm run startall          # Full build and start both services
```

**Development**
```bash
npm run dev              # Frontend development server only
npm run dev:api          # Backend development server only
```

**Optimized Builds** (for resource-constrained servers)
```bash
npm run ncuStart         # Rebuild server only, reuse client build
npm run nsuStart         # Rebuild client only, reuse server build  
npm run nobStart         # Start without rebuilding (fastest)
```

**Update Strategy**
When updates are released, they are tagged to indicate what needs rebuilding:
- `-s` Server update - use `ncuStart`
- `-c` Client update - use `nsuStart` 
- `-b` Both updated - use `startall`

## Docker Usage
This is for people with dependancy issues, or would like an "easier" setup.

- Build: ``docker build -t sms-app .``
- Run (Unix): ``docker run -it --rm --name sms-running -p 1337:1337 -p 5823:5823 --add-host="$(hostname):127.0.0.1" sms-app``
- Run (Powershell): ``docker run -it --rm --name sms-running -p 1337:1337 -p 5823:5823 --add-host="$env:COMPUTERNAME:127.0.0.1" sms-app``
- Run (Detatched, Unix): ``docker run -d --name sms-running -p 1337:1337 -p 5823:5823 sms-app``
- Run (Detatched, Powershell): ``docker run -d --name sms-running -p 1337:1337 -p 5823:5823 --add-host="$env:COMPUTERNAME:127.0.0.1" sms-app``

### Warning

This service is **NOT** intended to be publicly available on your server. Please make sure ports 1337 and 5823 are not reachable from the internet.

However, if you'd like to serve your files publicy, please make port 3000 available from the internet (or use your preferred web server to serve it on port 443)

## F&Q

### How do I set this up so I can quickly share links?

Simply enable "File Serving" in settings! Your files will be served to port 3000.

## Contributors

Main Developer: [Cattn](https://github.com/Cattn/)
