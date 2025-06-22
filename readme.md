<h3 align="center">
    <strong>SMS</strong>
</h3>

> Need Help? Join my [Development Server](https://discord.gg/Wxrp73HVj4)

<p align="center">
    SMS makes simple file sharing easy! Upload, share, and manage your files quickly. Supports file expiration, quick filters, and previews!
</p>

## How to deploy?

### Install Dependencies

``npm i install``

``npm i -g concurrently``

### Run Start Script

``npm run startall``
> Ensure you run this script from ``SMS/``.

## Configuration

In ``src/lib/config.ts`` set the ``domain`` value to your server's domain.

## Notes

This service is **NOT** intended to be publicly available on your server. Please make sure ports 1337 and 5823 are not reachable from the internet.

## F&Q

### How do I set this up so I can quickly share links?

Create a simple host.js file that serves ``/uploads``, and run it on your server.

Here's an example:
```js
import express from 'express';
import path from 'path';
import * as fs from 'fs';
import http from 'node:http';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

const server = http.createServer(app);

const uploadsPath = path.join(__dirname, 'SMS', 'uploads');
if (fs.existsSync(uploadsPath)) {
    app.use('/uploads', express.static(uploadsPath));
    app.use('/uploads/*', (req, res) => {
        res.status(404).send('404, no media found!');
      });
    app.use('/SMS/upload/*', (req, res) => {
        res.status(404).send('404, did you mean `/SMS/uploads`?');
    });
}

server.listen(3000);
```

Then, simply make this server available at port 443 using your preferred web-server.

## Contributors

Main Developer: [Cattn](https://github.com/Cattn/)