const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const toolbar = document.getElementById("toolbar");

const TILE = 24;
const COLS = 160;
const ROWS = 60;
const GRAVITY = 0.45;
const JUMP_VELOCITY = -9.5;

const BLOCKS = [
  { id: 1, name: "Grass", color: "#3f9b0b" },
  { id: 2, name: "Dirt", color: "#7b4e2a" },
  { id: 3, name: "Stone", color: "#6b7280" },
  { id: 4, name: "Wood", color: "#8b5a2b" },
];

let selectedBlock = BLOCKS[0].id;

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

generateWorld();

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

function isSolidAt(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
  return world[ty][tx] !== 0;
}

function collides(px, py, pw, ph) {
  const left = Math.floor(px / TILE);
  const right = Math.floor((px + pw - 1) / TILE);
  const top = Math.floor(py / TILE);
  const bottom = Math.floor((py + ph - 1) / TILE);

  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      if (isSolidAt(x, y)) return true;
    }
  }
  return false;
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

  let nextX = player.x + player.vx;
  if (!collides(nextX, player.y, player.width, player.height)) {
    player.x = nextX;
  } else {
    const step = Math.sign(player.vx);
    while (!collides(player.x + step, player.y, player.width, player.height)) {
      player.x += step;
    }
    player.vx = 0;
  }

  let nextY = player.y + player.vy;
  if (!collides(player.x, nextY, player.width, player.height)) {
    player.y = nextY;
    player.onGround = false;
  } else {
    const step = Math.sign(player.vy);
    while (!collides(player.x, player.y + step, player.width, player.height)) {
      player.y += step;
    }
    player.onGround = player.vy > 0;
    player.vy = 0;
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

function drawWorld(cam) {
  ctx.fillStyle = "#7ec0ee";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const startX = Math.floor(cam.x / TILE);
  const endX = Math.ceil((cam.x + canvas.width) / TILE);
  const startY = Math.floor(cam.y / TILE);
  const endY = Math.ceil((cam.y + canvas.height) / TILE);

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const id = world[y]?.[x] || 0;
      if (!id) continue;
      const block = BLOCKS.find((b) => b.id === id);
      const px = x * TILE - cam.x;
      const py = y * TILE - cam.y;
      ctx.fillStyle = block.color;
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = "rgba(0,0,0,0.1)";
      ctx.fillRect(px, py + TILE - 4, TILE, 4);
    }
  }
}

let cursorTile = null;

function drawPlayer(cam) {
  ctx.fillStyle = "#ef4444";
  ctx.fillRect(player.x - cam.x, player.y - cam.y, player.width, player.height);
}

function drawCursor(cam) {
  if (!cursorTile) return;
  const px = cursorTile.x * TILE - cam.x;
  const py = cursorTile.y * TILE - cam.y;
  ctx.strokeStyle = "#f8fafc";
  ctx.lineWidth = 2;
  ctx.strokeRect(px + 1, py + 1, TILE - 2, TILE - 2);
}

function loop() {
  updatePlayer();
  const cam = getCamera();
  drawWorld(cam);
  drawPlayer(cam);
  drawCursor(cam);
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

setToolbar();

window.addEventListener("keydown", (e) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(e.code)) {
    e.preventDefault();
  }

  if (["Digit1", "Digit2", "Digit3", "Digit4"].includes(e.code)) {
    const index = Number(e.code.slice(-1)) - 1;
    selectedBlock = BLOCKS[index].id;
    setToolbar();
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
    world[y][x] = 0;
  } else if (e.button === 2 && !overlapsPlayer) {
    world[y][x] = selectedBlock;
  }
});

canvas.addEventListener("contextmenu", (e) => e.preventDefault());

loop();
