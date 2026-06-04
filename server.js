const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

const rooms = new Map();

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
  });
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, text) {
  response.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  });
  response.end(text);
}

function randomId(length = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let value = "";
  for (let i = 0; i < length; i += 1) {
    value += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return value;
}

function cloneSnapshot(snapshot) {
  return JSON.parse(JSON.stringify(snapshot));
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let data = "";
    request.on("data", (chunk) => {
      data += chunk;
      if (data.length > 20_000_000) {
        reject(new Error("Request too large"));
      }
    });
    request.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    request.on("error", reject);
  });
}

function getRoom(roomId) {
  return rooms.get(String(roomId || "").toUpperCase());
}

function createRoom(name, snapshot) {
  const roomId = randomId();
  const playerId = `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const safeSnapshot = cloneSnapshot(snapshot);
  const room = {
    id: roomId,
    hostPlayerId: playerId,
    snapshot: safeSnapshot,
    players: new Map(),
    changes: [],
    worldVersion: 0,
    meta: {
      currentDimension: safeSnapshot.currentDimension || "overworld",
      worldTick: safeSnapshot.worldTick || 0,
      gameMode: safeSnapshot.gameMode || "survival",
    },
  };

  room.players.set(playerId, {
    id: playerId,
    name: name || "Host",
    x: 0,
    y: 0,
    width: 24,
    height: 48,
    facing: 1,
    health: 8,
    maxHealth: 8,
    dimension: room.meta.currentDimension,
    updatedAt: Date.now(),
  });
  rooms.set(roomId, room);
  return { room, roomId, playerId };
}

function joinRoom(room, name) {
  const playerId = `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  room.players.set(playerId, {
    id: playerId,
    name: name || "Player",
    x: 0,
    y: 0,
    width: 24,
    height: 48,
    facing: 1,
    health: 8,
    maxHealth: 8,
    dimension: room.meta.currentDimension,
    updatedAt: Date.now(),
  });
  return playerId;
}

function applySetBlock(room, change) {
  const targetDimension = room.snapshot.dimensions?.[change.dimension];
  if (!targetDimension || !Array.isArray(targetDimension.world)) return;
  if (change.y < 0 || change.y >= targetDimension.world.length) return;
  const row = targetDimension.world[change.y];
  if (!Array.isArray(row) || row.length === 0) return;
  const wrappedX = ((change.x % row.length) + row.length) % row.length;
  row[wrappedX] = change.id;
}

function buildSyncPayload(room, playerId, knownWorldVersion) {
  const players = Array.from(room.players.values()).map((entry) => ({
    id: entry.id,
    name: entry.name,
    x: entry.x,
    y: entry.y,
    width: entry.width,
    height: entry.height,
    facing: entry.facing,
    health: entry.health,
    maxHealth: entry.maxHealth,
    dimension: entry.dimension,
  }));

  return {
    ok: true,
    roomId: room.id,
    playerId,
    players,
    meta: room.meta,
    worldVersion: room.worldVersion,
    changes: room.changes.filter((entry) => entry.version > (knownWorldVersion || 0)).map((entry) => entry.change),
  };
}

function handleApi(request, response, url) {
  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    response.end();
    return;
  }

  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  readJsonBody(request)
    .then((body) => {
      if (url.pathname === "/api/host") {
        const { room, roomId, playerId } = createRoom(body.name, body.snapshot);
        sendJson(response, 200, {
          ok: true,
          roomId,
          playerId,
          snapshot: room.snapshot,
          worldVersion: room.worldVersion,
        });
        return;
      }

      if (url.pathname === "/api/join") {
        const room = getRoom(body.roomId);
        if (!room) {
          sendJson(response, 404, { error: "Room not found" });
          return;
        }
        const playerId = joinRoom(room, body.name);
        sendJson(response, 200, {
          ok: true,
          roomId: room.id,
          playerId,
          snapshot: room.snapshot,
          worldVersion: room.worldVersion,
        });
        return;
      }

      if (url.pathname === "/api/sync") {
        const room = getRoom(body.roomId);
        const player = room?.players.get(body.playerId);
        if (!room || !player) {
          sendJson(response, 404, { error: "Room or player not found" });
          return;
        }

        if (body.player) {
          Object.assign(player, body.player, { id: player.id, updatedAt: Date.now() });
        }
        if (body.meta && body.playerId === room.hostPlayerId) {
          room.meta = {
            currentDimension: body.meta.currentDimension || room.meta.currentDimension,
            worldTick: typeof body.meta.worldTick === "number" ? body.meta.worldTick : room.meta.worldTick,
            gameMode: body.meta.gameMode || room.meta.gameMode,
          };
          room.snapshot.currentDimension = room.meta.currentDimension;
          room.snapshot.worldTick = room.meta.worldTick;
          room.snapshot.gameMode = room.meta.gameMode;
        }

        sendJson(response, 200, buildSyncPayload(room, body.playerId, body.knownWorldVersion));
        return;
      }

      if (url.pathname === "/api/action") {
        const room = getRoom(body.roomId);
        const player = room?.players.get(body.playerId);
        if (!room || !player || !body.change) {
          sendJson(response, 404, { error: "Room, player, or change not found" });
          return;
        }

        if (body.change.type === "setBlock") {
          applySetBlock(room, body.change);
          room.worldVersion += 1;
          room.changes.push({ version: room.worldVersion, change: body.change });
          if (room.changes.length > 400) {
            room.changes.splice(0, room.changes.length - 400);
          }
        }

        sendJson(response, 200, { ok: true, worldVersion: room.worldVersion });
        return;
      }

      sendJson(response, 404, { error: "Unknown API route" });
    })
    .catch((error) => {
      sendJson(response, 400, { error: error.message });
    });
}

function serveStatic(request, response, url) {
  let pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  pathname = decodeURIComponent(pathname);
  const targetPath = path.resolve(ROOT, `.${pathname}`);
  if (!targetPath.startsWith(ROOT)) {
    sendText(response, 403, "Forbidden");
    return;
  }

  fs.readFile(targetPath, (error, data) => {
    if (error) {
      sendText(response, 404, "Not found");
      return;
    }
    const extension = path.extname(targetPath).toLowerCase();
    response.writeHead(200, {
      "Content-Type": MIME_TYPES[extension] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(data);
  });
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  if (url.pathname.startsWith("/api/")) {
    handleApi(request, response, url);
    return;
  }
  serveStatic(request, response, url);
});

server.listen(PORT, () => {
  console.log(`ImmaniCraft server running at http://localhost:${PORT}`);
});
