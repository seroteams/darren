# Plan: Start the Sero Dev Server

## Context
The user wants to load and view the Sero project — a full-stack web app for AI-assisted 1:1 meeting preparation. The project uses Vite (frontend, port 3000) + a Node.js API server (port 3001), started together via a single npm script.

## Steps

1. Run `npm run dev` from `c:\Users\User\Documents\Sero\darren`
   - This starts both Vite (hot-reload frontend on port 3000) and the backend API server (port 3001) concurrently

2. Open http://localhost:3000 in the browser to view the app

## Critical Files
- [package.json](package.json) — defines the `dev` script
- [vite.config.js](vite.config.js) — proxies `/api` to port 3001
- [frontend/server/server.js](frontend/server/server.js) — backend API server
- [frontend/client/src/main.js](frontend/client/src/main.js) — frontend entry point

## Verification
- Vite prints a local URL (http://localhost:3000) when ready
- Backend starts and listens on port 3001
- App loads in browser showing the intake/meeting-setup stage
