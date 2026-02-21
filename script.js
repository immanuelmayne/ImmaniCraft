const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const toolbar = document.getElementById("toolbar");

const TILE = 24;
const COLS = 160;
const ROWS = 60;
const GRAVITY = 0.45;
const JUMP_VELOCITY = -9.5;
const DAY_LENGTH_FRAMES = 2400;

const BLOCKS = [
  { id: 1, name: "Grass", color: "#3f9b0b" },
  { id: 2, name: "Dirt", color: "#7b4e2a" },
  { id: 3, name: "Stone", color: "#6b7280" },
  { id: 4, name: "Wood", color: "#8b5a2b" },
  { id: 5, name: "Door", color: "#d9a15b" },
];

const DOOR_BOTTOM_CLOSED = 5;
const DOOR_TOP_CLOSED = 6;
const DOOR_BOTTOM_OPEN = 7;
const DOOR_TOP_OPEN = 8;

let selectedBlock = BLOCKS[0].id;
let frame = 0;
const monsters = [];
let lastSpawnFrame = 0;

const world = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

function generateWorld() {
  let height = 34;
  for (let x = 0; x < COLS; x++) {
    if (Math.random() < 0.34) {
      height += Math.floor(Math.random() * 3) - 1;
      height = Math.max(22, Math.min(42, height));
    }

    for (let y = height; y < ROWS; y++) {
      if (y === height) world[y][x] = 1;
      else if (y < height + 3) world[y][x] = 2;
      else world[y][x] = 3;
    }
  }
}

function placeStarterDoor() {
  const x = 18;
  for (let y = 1; y < ROWS - 1; y++) {
    if (world[y][x] === 0 && world[y - 1][x] === 0 && world[y + 1][x] !== 0) {
      world[y][x] = DOOR_BOTTOM_CLOSED;
      world[y - 1][x] = DOOR_TOP_CLOSED;
      return;
    }
  }
}

generateWorld();
placeStarterDoor();

const player = {
  x: 15 * TILE,
  y: 10 * TILE,
  width: 16,
  height: 28,
  vx: 0,
  vy: 0,
  onGround: false,
};

const keys = new Set();
let cursorTile = null;

function getTile(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return 1;
  return world[ty][tx];
}

function isDoorTile(id) {
  return [DOOR_BOTTOM_CLOSED, DOOR_TOP_CLOSED, DOOR_BOTTOM_OPEN, DOOR_TOP_OPEN].includes(id);
}

function isDoorOpen(id) {
  return id === DOOR_BOTTOM_OPEN || id === DOOR_TOP_OPEN;
}

function isSolidForPlayer(tileId) {
  return tileId !== 0 && !isDoorOpen(tileId);
}

function isSolidForMonster(tileId) {
  return tileId !== 0;
}

function collides(px, py, pw, ph, solidRule) {
  const left = Math.floor(px / TILE);
  const right = Math.floor((px + pw - 1) / TILE);
  const top = Math.floor(py / TILE);
  const bottom = Math.floor((py + ph - 1) / TILE);

  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      if (solidRule(getTile(x, y))) return true;
    }
  }
  return false;
}

function resolveMotion(entity, solidRule) {
  const nextX = entity.x + entity.vx;
  if (!collides(nextX, entity.y, entity.width, entity.height, solidRule)) {
    entity.x = nextX;
  } else {
    const step = Math.sign(entity.vx);
    while (step !== 0 && !collides(entity.x + step, entity.y, entity.width, entity.height, solidRule)) {
      entity.x += step;
    }
    entity.vx = 0;
  }

  const nextY = entity.y + entity.vy;
  if (!collides(entity.x, nextY, entity.width, entity.height, solidRule)) {
    entity.y = nextY;
    entity.onGround = false;
  } else {
    const step = Math.sign(entity.vy);
    while (step !== 0 && !collides(entity.x, entity.y + step, entity.width, entity.height, solidRule)) {
      entity.y += step;
    }
    entity.onGround = entity.vy > 0;
    entity.vy = 0;
  }
}

function updatePlayer() {
  const speed = keys.has("ShiftLeft") ? 4.2 : 2.8;
  player.vx = 0;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) player.vx = -speed;
  if (keys.has("KeyD") || keys.has("ArrowRight")) player.vx = speed;

  if ((keys.has("KeyW") || keys.has("Space") || keys.has("ArrowUp")) && player.onGround) {
    player.vy = JUMP_VELOCITY;
    player.onGround = false;
  }

  player.vy += GRAVITY;
  player.vy = Math.min(player.vy, 12);
  resolveMotion(player, isSolidForPlayer);
}

function isNight() {
  const cycle = (frame % DAY_LENGTH_FRAMES) / DAY_LENGTH_FRAMES;
  return cycle >= 0.55 || cycle < 0.15;
}

function maybeSpawnMonster() {
  if (!isNight()) return;
  if (frame - lastSpawnFrame < 120 || monsters.length >= 8) return;

  const direction = Math.random() < 0.5 ? -1 : 1;
  const spawnXTile = Math.floor((player.x + direction * (8 + Math.floor(Math.random() * 8)) * TILE) / TILE);
  if (spawnXTile < 1 || spawnXTile >= COLS - 1) return;

  for (let y = 1; y < ROWS - 2; y++) {
    if (world[y][spawnXTile] === 0 && isSolidForMonster(world[y + 1][spawnXTile])) {
      monsters.push({
        x: spawnXTile * TILE + 4,
        y: y * TILE - 22,
        width: 14,
        height: 22,
        vx: 0,
        vy: 0,
        onGround: false,
      });
      lastSpawnFrame = frame;
      return;
    }
  }
}

function updateMonsters() {
  for (let i = monsters.length - 1; i >= 0; i--) {
    const m = monsters[i];
    const dx = player.x - m.x;
    m.vx = Math.abs(dx) < 4 ? 0 : Math.sign(dx) * 1.2;

    if (m.onGround && Math.random() < 0.03) {
      m.vy = -7.5;
      m.onGround = false;
    }

    m.vy += GRAVITY;
    m.vy = Math.min(m.vy, 10);
    resolveMotion(m, isSolidForMonster);

    if (Math.abs(dx) < 12 && Math.abs(player.y - m.y) < 18) {
      player.x = 15 * TILE;
      player.y = 10 * TILE;
      player.vx = 0;
      player.vy = 0;
      monsters.length = 0;
      break;
    }
  }

  if (!isNight()) {
    for (let i = monsters.length - 1; i >= 0; i--) {
      if (Math.random() < 0.03) monsters.splice(i, 1);
    }
  }
}

function getCamera() {
  const cx = player.x + player.width / 2 - canvas.width / 2;
  const cy = player.y + player.height / 2 - canvas.height / 2;
  const maxX = COLS * TILE - canvas.width;
  const maxY = ROWS * TILE - canvas.height;
  return {
    x: Math.max(0, Math.min(maxX, cx)),
    y: Math.max(0, Math.min(maxY, cy)),
  };
}

function drawDoorTile(px, py, isTop, open) {
  ctx.fillStyle = open ? "#f1c27d" : "#d9a15b";
  ctx.fillRect(px, py, TILE, TILE);

  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.fillRect(px, py + TILE - 3, TILE, 3);

  ctx.fillStyle = "#8b5a2b";
  ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
  ctx.fillStyle = open ? "#f9e2b2" : "#c98f4a";
  ctx.fillRect(px + 4, py + 4, TILE - 8, TILE - 8);

  if (!isTop) {
    ctx.fillStyle = "#3f2a14";
    ctx.fillRect(px + TILE - 7, py + TILE / 2, 3, 3);
  }

  if (open) {
    ctx.fillStyle = "rgba(17,24,39,0.25)";
    ctx.fillRect(px, py, 5, TILE);
  }
}

function drawWorld(cam) {
  const night = isNight();
  ctx.fillStyle = night ? "#0f172a" : "#7ec0ee";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const startX = Math.floor(cam.x / TILE);
  const endX = Math.ceil((cam.x + canvas.width) / TILE);
  const startY = Math.floor(cam.y / TILE);
  const endY = Math.ceil((cam.y + canvas.height) / TILE);

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const id = world[y]?.[x] || 0;
      if (!id) continue;
      const px = x * TILE - cam.x;
      const py = y * TILE - cam.y;

      if (isDoorTile(id)) {
        drawDoorTile(px, py, id === DOOR_TOP_CLOSED || id === DOOR_TOP_OPEN, isDoorOpen(id));
        continue;
      }

      const block = BLOCKS.find((b) => b.id === id) || { color: "#f2c94c" };
      ctx.fillStyle = block.color;
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = "rgba(0,0,0,0.1)";
      ctx.fillRect(px, py + TILE - 4, TILE, 4);
    }
  }
}

function drawPlayer(cam) {
  const px = player.x - cam.x;
  const py = player.y - cam.y;

  ctx.fillStyle = "#2563eb";
  ctx.fillRect(px + 3, py + player.height - 10, 4, 10);
  ctx.fillRect(px + 9, py + player.height - 10, 4, 10);

  ctx.fillStyle = "#dc2626";
  ctx.fillRect(px + 2, py + 8, 12, 12);

  ctx.fillStyle = "#fca5a5";
  ctx.fillRect(px, py + 9, 2, 8);
  ctx.fillRect(px + 14, py + 9, 2, 8);

  ctx.fillStyle = "#f2c09a";
  ctx.fillRect(px + 3, py, 10, 8);

  ctx.fillStyle = "#111827";
  ctx.fillRect(px + 5, py + 3, 1, 1);
  ctx.fillRect(px + 9, py + 3, 1, 1);
}

function drawMonsters(cam) {
  for (const m of monsters) {
    const px = m.x - cam.x;
    const py = m.y - cam.y;
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(px + 2, py + 6, 10, 12);
    ctx.fillRect(px + 1, py + 18, 4, 4);
    ctx.fillRect(px + 9, py + 18, 4, 4);
    ctx.fillStyle = "#16a34a";
    ctx.fillRect(px + 2, py, 10, 8);
    ctx.fillStyle = "#111827";
    ctx.fillRect(px + 4, py + 2, 1, 1);
    ctx.fillRect(px + 8, py + 2, 1, 1);
  }
}

function drawCursor(cam) {
  if (!cursorTile) return;
  const px = cursorTile.x * TILE - cam.x;
  const py = cursorTile.y * TILE - cam.y;
  ctx.strokeStyle = "#f8fafc";
  ctx.lineWidth = 2;
  ctx.strokeRect(px + 1, py + 1, TILE - 2, TILE - 2);
}

function drawHud() {
  if (isNight()) {
    ctx.fillStyle = "rgba(17, 24, 39, 0.35)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#e5e7eb";
    ctx.font = "16px sans-serif";
    ctx.fillText(`Night: ${monsters.length} monsters`, 12, 24);
  } else {
    ctx.fillStyle = "#111827";
    ctx.font = "16px sans-serif";
    ctx.fillText("Daytime", 12, 24);
  }
}

function loop() {
  frame += 1;
  updatePlayer();
  maybeSpawnMonster();
  updateMonsters();

  const cam = getCamera();
  drawWorld(cam);
  drawPlayer(cam);
  drawMonsters(cam);
  drawCursor(cam);
  drawHud();

  requestAnimationFrame(loop);
}

function setToolbar() {
  toolbar.innerHTML = "";
  BLOCKS.forEach((block, idx) => {
    const slot = document.createElement("button");
    slot.className = "slot" + (block.id === selectedBlock ? " active" : "");
    slot.title = `${idx + 1}: ${block.name}`;
    slot.style.background = block.color;
    slot.type = "button";
    slot.addEventListener("click", () => {
      selectedBlock = block.id;
      setToolbar();
    });
    toolbar.appendChild(slot);
  });
}

function setDoorState(baseX, baseY, open) {
  if (baseY <= 0 || baseY >= ROWS) return;
  world[baseY][baseX] = open ? DOOR_BOTTOM_OPEN : DOOR_BOTTOM_CLOSED;
  world[baseY - 1][baseX] = open ? DOOR_TOP_OPEN : DOOR_TOP_CLOSED;
}

function findDoorBottom(x, y) {
  const id = getTile(x, y);
  if (id === DOOR_BOTTOM_CLOSED || id === DOOR_BOTTOM_OPEN) return { x, y };
  if (id === DOOR_TOP_CLOSED || id === DOOR_TOP_OPEN) return { x, y: y + 1 };
  return null;
}

function toggleDoorAt(x, y) {
  const doorBottom = findDoorBottom(x, y);
  if (!doorBottom) return false;
  const current = getTile(doorBottom.x, doorBottom.y);
  setDoorState(doorBottom.x, doorBottom.y, current === DOOR_BOTTOM_CLOSED);
  return true;
}

function clearDoorAt(x, y) {
  const doorBottom = findDoorBottom(x, y);
  if (!doorBottom) return false;
  world[doorBottom.y][doorBottom.x] = 0;
  world[doorBottom.y - 1][doorBottom.x] = 0;
  return true;
}

function canPlaceDoorAt(x, y) {
  const bottomY = y;
  const topY = y - 1;
  return topY >= 0 && getTile(x, bottomY) === 0 && getTile(x, topY) === 0 && getTile(x, bottomY + 1) !== 0;
}

setToolbar();

window.addEventListener("keydown", (e) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(e.code)) {
    e.preventDefault();
  }

  if (["Digit1", "Digit2", "Digit3", "Digit4", "Digit5"].includes(e.code)) {
    const index = Number(e.code.slice(-1)) - 1;
    if (BLOCKS[index]) {
      selectedBlock = BLOCKS[index].id;
      setToolbar();
    }
  }

  keys.add(e.code);
});

window.addEventListener("keyup", (e) => keys.delete(e.code));

canvas.addEventListener("mousemove", (e) => {
  const cam = getCamera();
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left + cam.x) / TILE);
  const y = Math.floor((e.clientY - rect.top + cam.y) / TILE);
  cursorTile = { x, y };
});

canvas.addEventListener("mousedown", (e) => {
  if (!cursorTile) return;
  const { x, y } = cursorTile;
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return;

  const playerTileLeft = Math.floor(player.x / TILE);
  const playerTileRight = Math.floor((player.x + player.width - 1) / TILE);
  const playerTileTop = Math.floor(player.y / TILE);
  const playerTileBottom = Math.floor((player.y + player.height - 1) / TILE);

  const overlapsPlayer =
    x >= playerTileLeft && x <= playerTileRight && y >= playerTileTop && y <= playerTileBottom;

  if (e.button === 0) {
    if (!clearDoorAt(x, y)) world[y][x] = 0;
  } else if (e.button === 2 && !overlapsPlayer) {
    if (toggleDoorAt(x, y)) {
      return;
    }

    if (selectedBlock === DOOR_BOTTOM_CLOSED) {
      if (canPlaceDoorAt(x, y)) {
        setDoorState(x, y, false);
      }
      return;
    }

    world[y][x] = selectedBlock;
  }
});

canvas.addEventListener("contextmenu", (e) => e.preventDefault());

loop();
