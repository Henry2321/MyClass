# Public Access Guide

This project can now be exposed publicly in two practical ways.

## Option 1: Quick public test with a tunnel

Use this when you want two machines on different networks to try the app quickly.

1. Build the client:
```bash
cd client
npm install
npm run build
```

2. Configure the backend from `server/.env.example`.

3. Start the backend:
```bash
cd server
npm install
npm start
```

4. Expose port `5000` with a public HTTPS tunnel:
```bash
cloudflared tunnel --url http://localhost:5000
```
or
```bash
ngrok http 5000
```

5. Put the generated public HTTPS URL into `CLIENT_URL` in `server/.env`, then restart the backend.

Because the backend serves `client/dist` in production, the public URL from the tunnel is enough for both the frontend and backend.

## Option 2: Proper public deployment

Use this for long-term public use.

1. Build the frontend:
```bash
cd client
npm install
npm run build
```

2. Deploy the repository to a VPS or public host.

3. Set backend environment variables from `server/.env.example`.

4. Start the backend on the server:
```bash
cd server
npm install
npm start
```

5. Put HTTPS in front of the backend with Nginx, Caddy, Cloudflare Tunnel, or another reverse proxy.

Set `LOCAL_HTTPS=false` in `server/.env` for deployment. Public HTTPS should be handled by the reverse proxy, not by local self-signed certificates.

If you deploy the frontend and backend on different public domains, then set these client build variables before running `npm run build`:

- `VITE_API_BASE_URL`
- `VITE_SOCKET_URL`
- `VITE_PEER_SERVER_URL`
- `VITE_PEER_PATH`

If your API, Socket.IO server, and PeerJS server all run on the same backend domain, you can set only `VITE_API_BASE_URL` and leave the socket/peer URLs empty.

See `client/.env.production.example`.

## Important note about voice/WebRTC

API and socket access will work once the app is public, but voice/WebRTC between two different networks may still fail on strict NATs unless you provide a TURN server.

The client now supports `VITE_ICE_SERVERS` so you can add TURN later without changing code.

## Local HTTPS for camera and microphone

If you need camera or microphone during local development, generate local certificates on your machine only:

```bash
cd server
npm run cert:generate
```

Set `LOCAL_HTTPS_HOST` first if you want the certificate to match a LAN IP or hostname.

These files live in `server/certs/`, are ignored by Git, and must never be pushed to GitHub.
