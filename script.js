const playLink = document.querySelector(".play-link");

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const toolbar = document.getElementById("toolbar");
const inventoryRoot = document.getElementById("inventory");
const craftingRoot = document.getElementById("crafting-recipes");
const craftStatus = document.getElementById("craft-status");
const eatMeatButton = document.getElementById("eat-meat");
const drinkWaterButton = document.getElementById("drink-water");
const foodStatus = document.getElementById("food-status");
const waterStatus = document.getElementById("water-status");
const drowningStatus = document.getElementById("drowning-status");
const timeStatus = document.getElementById("time-status");
const weatherStatus = document.getElementById("weather-status");
const heartsRoot = document.getElementById("hearts");
const survivalButton = document.getElementById("mode-survival");
const creativeButton = document.getElementById("mode-creative");
const startGameButton = document.getElementById("start-game");
const pauseGameButton = document.getElementById("pause-game");
const gameRunStatus = document.getElementById("game-run-status");
const modeCopy = document.getElementById("mode-copy");
const playerCopy = document.getElementById("player-copy");
const playerButtons = Array.from(document.querySelectorAll(".player-button"));
const fullscreenToggle = document.getElementById("fullscreen-toggle");
const muteToggle = document.getElementById("mute-toggle");
const tabButtons = Array.from(document.querySelectorAll(".tab-button"));
const tabPanels = Array.from(document.querySelectorAll(".tab-panel"));
const gameTabPanel = document.getElementById("game-tab-panel");
const serverUrlInput = document.getElementById("server-url");
const playerNameInput = document.getElementById("player-name");
const roomCodeInput = document.getElementById("room-code");
const hostRoomButton = document.getElementById("host-room");
const joinRoomButton = document.getElementById("join-room");
const onlineStatus = document.getElementById("online-status");
const STORAGE_KEY = "immanicraft-ui-state";

function readUiState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeUiState(patch) {
  try {
    const nextState = {
      ...readUiState(),
      ...patch,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  } catch {
    // Ignore storage failures so the game still works normally.
  }
}

function focusGame() {
  canvas.scrollIntoView({ behavior: "smooth", block: "center" });
  canvas.focus();
}

function renderGameRunState() {
  if (startGameButton) {
    startGameButton.textContent = gameStarted && gamePaused ? "Resume" : "Start";
  }
  if (pauseGameButton) {
    pauseGameButton.disabled = !gameStarted || gamePaused;
  }
  if (gameRunStatus) {
    gameRunStatus.textContent = gamePaused
      ? gameStarted
        ? "Paused. Press Resume to continue playing."
        : "Paused. Press Start when you are ready to play."
      : "Running. The game will auto-pause if you leave the tab.";
  }
}

function showTab(tabName) {
  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });
  tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.panel === tabName);
  });
  writeUiState({ activeTab: tabName });
}

function ensureAudio() {
  if (!audioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    audioContext = new AudioCtx();
  }

  if (!isMuted && audioContext.state === "suspended") {
    audioContext.resume();
  }

  if (!isMuted) {
    startAmbientMusic();
  }

  return audioContext;
}

function playMusicNote(ctxx, frequency, startAt, duration, volume = 0.018, wave = "triangle") {
  const osc = ctxx.createOscillator();
  const gain = ctxx.createGain();
  const filter = ctxx.createBiquadFilter();

  osc.type = wave;
  osc.frequency.setValueAtTime(frequency, startAt);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1200, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.linearRampToValueAtTime(volume, startAt + 0.18);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctxx.destination);

  osc.start(startAt);
  osc.stop(startAt + duration + 0.05);
}

function scheduleAmbientPhrase(startAt) {
  if (!audioContext) return;

  const melody = [220, 246.94, 293.66, 246.94, 329.63, 293.66, 246.94, 196];
  const bass = [98, 110, 123.47, 146.83];
  const step = 1.5;

  melody.forEach((frequency, index) => {
    playMusicNote(audioContext, frequency, startAt + index * step, 1.8, 0.014, "triangle");
    if (index % 2 === 0) {
      playMusicNote(audioContext, frequency / 2, startAt + index * step + 0.24, 1.2, 0.009, "sine");
    }
  });

  bass.forEach((frequency, index) => {
    playMusicNote(audioContext, frequency, startAt + index * (step * 2), 2.6, 0.012, "sine");
  });

  musicScheduledUntil = startAt + melody.length * step;
}

function startAmbientMusic() {
  if (!audioContext || musicEnabled) return;
  musicEnabled = true;
  musicScheduledUntil = audioContext.currentTime;

  const scheduleLoop = () => {
    if (!audioContext || !musicEnabled) return;
    while (musicScheduledUntil < audioContext.currentTime + 8) {
      scheduleAmbientPhrase(musicScheduledUntil + 0.1);
    }
    musicTimer = window.setTimeout(scheduleLoop, 3000);
  };

  scheduleLoop();
}

function playSound(type) {
  if (isMuted) return;
  const ctxx = ensureAudio();
  if (!ctxx) return;

  const now = ctxx.currentTime;
  const osc = ctxx.createOscillator();
  const gain = ctxx.createGain();
  const filter = ctxx.createBiquadFilter();

  let frequency = 220;
  let duration = 0.08;
  let volume = 0.04;
  let wave = "square";

  switch (type) {
    case "jump":
      frequency = 420;
      duration = 0.07;
      volume = 0.03;
      wave = "triangle";
      break;
    case "mine":
      frequency = 180;
      duration = 0.05;
      volume = 0.035;
      wave = "square";
      break;
    case "place":
      frequency = 260;
      duration = 0.05;
      volume = 0.03;
      wave = "triangle";
      break;
    case "hurt":
      frequency = 120;
      duration = 0.14;
      volume = 0.05;
      wave = "sawtooth";
      break;
    case "heal":
      frequency = 520;
      duration = 0.12;
      volume = 0.025;
      wave = "sine";
      break;
    case "craft":
      frequency = 340;
      duration = 0.09;
      volume = 0.03;
      wave = "triangle";
      break;
    case "portal":
      frequency = 160;
      duration = 0.22;
      volume = 0.045;
      wave = "sine";
      break;
    case "hit":
      frequency = 150;
      duration = 0.05;
      volume = 0.04;
      wave = "square";
      break;
    case "thunder":
      frequency = 72;
      duration = 0.32;
      volume = 0.06;
      wave = "sawtooth";
      break;
    default:
      break;
  }

  osc.type = wave;
  osc.frequency.setValueAtTime(frequency, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(70, frequency * 0.85), now + duration);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1800, now);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctxx.destination);

  osc.start(now);
  osc.stop(now + duration);
}

if (playLink) {
  playLink.addEventListener("click", (event) => {
    event.preventDefault();
    showTab("game");
    ensureAudio();
    focusGame();
  });
}

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    showTab(button.dataset.tab);
    if (button.dataset.tab === "game") {
      focusGame();
    }
  });
});

const TILE = 24;
const COLS = 320;
const ROWS = 72;
const WORLD_WIDTH = COLS * TILE;
const GRAVITY = 0.45;
const JUMP_VELOCITY = -9.5;
const DAY_LENGTH = 2400;
const SUN_TRAVEL_MS = 600000;
const MOON_DRIFT_MS = 600000;
const MOON_DRIFT_DISTANCE = 24;
const PLAYER_MAX_HEARTS = 8;

const ITEM_DEFS = [
  { id: 1, name: "Grass", color: "#55c825", placeId: 1 },
  { id: 2, name: "Dirt", color: "#8c5a34", placeId: 2 },
  { id: 3, name: "Rock", color: "#9aa2b1", placeId: 3 },
  { id: 4, name: "Wood", color: "#be7a42", placeId: 4 },
  { id: 5, name: "Leaves", color: "#74d766", placeId: 5 },
  { id: 6, name: "Water", color: "#6bc7ff", placeId: 6 },
  { id: 7, name: "Door", color: "#ffd39a", placeId: 7 },
  { id: 8, name: "Lava", color: "#ff7b2c", placeId: 16 },
  { id: 9, name: "Sand", color: "#e7d29a", placeId: 9 },
  { id: 10, name: "Coal Ore", color: "#45484f", placeId: 10 },
  { id: 11, name: "Iron Ore", color: "#c19a78", placeId: 11 },
  { id: 12, name: "Planks", color: "#c99552", placeId: 12 },
  { id: 13, name: "Stone Brick", color: "#b7bec8", placeId: 13 },
  { id: 14, name: "Glass", color: "#baf3ff", placeId: 14 },
  { id: 15, name: "Torch", color: "#ffd24d", placeId: 15 },
  { id: 16, name: "Coal", color: "#2c2f37", placeId: 10 },
  { id: 17, name: "Nether Portal", color: "#8a54ff", placeId: 17 },
  { id: 18, name: "Snow", color: "#f6fbff", placeId: 18 },
  { id: 19, name: "Ice", color: "#9fe7ff", placeId: 19 },
  { id: 20, name: "Bucket", color: "#c9d2de" },
  { id: 21, name: "Water Bucket", color: "#67cfff", placeId: 6 },
  { id: 22, name: "Lead", color: "#b38b5d" },
  { id: 23, name: "Meat", color: "#b85a4a" },
  { id: 24, name: "Ender Pearl", color: "#47d3a2" },
  { id: 25, name: "Bed", color: "#d46666", placeId: 20 },
];

const BLOCK_DEFS = {
  1: { id: 1, itemId: 1, name: "Grass", solid: true, draw: "grass", color: "#3f9b0b" },
  2: { id: 2, itemId: 2, name: "Dirt", solid: true, draw: "dirt", color: "#7b4e2a" },
  3: { id: 3, itemId: 3, name: "Rock", solid: true, draw: "rock", color: "#6b7280" },
  4: { id: 4, itemId: 4, name: "Wood", solid: true, draw: "wood", color: "#8b5a2b" },
  5: { id: 5, itemId: 5, name: "Leaves", solid: false, draw: "leaves", color: "#4caf50" },
  6: { id: 6, itemId: 6, name: "Water", solid: false, draw: "water", color: "#47a7e7", liquid: true },
  7: { id: 7, itemId: 7, name: "Door", solid: true, draw: "doorClosed", color: "#d8a15a" },
  8: { id: 8, itemId: 7, name: "Door", solid: false, draw: "doorOpen", color: "#d8a15a" },
  9: { id: 9, itemId: 9, name: "Sand", solid: true, draw: "sand", color: "#dbc27a" },
  10: { id: 10, itemId: 16, name: "Coal Ore", solid: true, draw: "coal", color: "#585b62" },
  11: { id: 11, itemId: 11, name: "Iron Ore", solid: true, draw: "iron", color: "#8d6e63" },
  12: { id: 12, itemId: 12, name: "Planks", solid: true, draw: "planks", color: "#bf8a4b" },
  13: { id: 13, itemId: 13, name: "Stone Brick", solid: true, draw: "brick", color: "#8b95a3" },
  14: { id: 14, itemId: 14, name: "Glass", solid: true, draw: "glass", color: "#a7ebff" },
  15: { id: 15, itemId: 15, name: "Torch", solid: false, draw: "torch", color: "#ffd24d" },
  16: { id: 16, itemId: 8, name: "Lava", solid: false, draw: "lava", color: "#ff7b2c", liquid: true },
  17: { id: 17, itemId: 17, name: "Nether Portal", solid: false, draw: "portal", color: "#8a54ff" },
  18: { id: 18, itemId: 18, name: "Snow", solid: true, draw: "snow", color: "#f6fbff" },
  19: { id: 19, itemId: 19, name: "Ice", solid: true, draw: "ice", color: "#9fe7ff" },
  20: { id: 20, itemId: 25, name: "Bed", solid: true, draw: "bed", color: "#d46666" },
};

const RECIPES = [
  { id: "door", name: "Door", needs: { 4: 3 }, makes: { 7: 1 } },
  { id: "planks", name: "Planks", needs: { 4: 1 }, makes: { 12: 4 } },
  { id: "stone-brick", name: "Stone Brick", needs: { 3: 3 }, makes: { 13: 2 } },
  { id: "glass", name: "Glass", needs: { 9: 2 }, makes: { 14: 2 } },
  { id: "torch", name: "Torch", needs: { 4: 1, 16: 1 }, makes: { 15: 2 } },
  { id: "portal", name: "Nether Portal", needs: { 13: 4, 8: 1 }, makes: { 17: 1 } },
  { id: "bucket", name: "Bucket", needs: { 11: 2 }, makes: { 20: 1 } },
  { id: "water-bucket", name: "Water Bucket", needs: { 20: 1, 6: 1 }, makes: { 21: 1 } },
  { id: "lead", name: "Lead", needs: { 4: 1, 12: 1 }, makes: { 22: 1 } },
  { id: "bed", name: "Bed", needs: { 12: 2, 23: 2 }, makes: { 25: 1 } },
];

const itemLookup = Object.fromEntries(ITEM_DEFS.map((item) => [item.id, item]));
const inventory = Object.fromEntries(ITEM_DEFS.map((item) => [item.id, 0]));

inventory[1] = 14;
inventory[2] = 12;
inventory[3] = 12;
inventory[4] = 10;
inventory[5] = 8;
inventory[6] = 4;
inventory[8] = 3;
inventory[9] = 6;
inventory[22] = 2;
inventory[25] = 1;

let world = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
let surfaceHeights = Array(COLS).fill(0);
const rainDrops = Array.from({ length: 90 }, () => ({
  x: Math.random() * canvas.width,
  y: Math.random() * canvas.height,
  speed: 5 + Math.random() * 4,
  length: 10 + Math.random() * 8,
}));

const player = {
  x: 15 * TILE,
  y: 10 * TILE,
  width: TILE,
  height: TILE * 2,
  vx: 0,
  vy: 0,
  onGround: false,
  isSwimming: false,
  maxHealth: PLAYER_MAX_HEARTS,
  health: PLAYER_MAX_HEARTS,
  lastDamageTick: -999,
  lastRegenAt: 0,
  isFlying: false,
  facing: 1,
  maxAir: 8,
  air: 8,
  lastAirTick: 0,
  leadHolder: null,
};

const playerTwo = {
  x: 19 * TILE,
  y: 10 * TILE,
  width: TILE,
  height: TILE * 2,
  vx: 0,
  vy: 0,
  onGround: false,
  isSwimming: false,
  maxHealth: PLAYER_MAX_HEARTS,
  health: PLAYER_MAX_HEARTS,
  lastDamageTick: -999,
  lastRegenAt: 0,
  isFlying: false,
  facing: 1,
  maxAir: 8,
  air: 8,
  lastAirTick: 0,
  leadHolder: null,
};

const playerThree = {
  x: 23 * TILE,
  y: 10 * TILE,
  width: TILE,
  height: TILE * 2,
  vx: 0,
  vy: 0,
  onGround: false,
  isSwimming: false,
  maxHealth: PLAYER_MAX_HEARTS,
  health: PLAYER_MAX_HEARTS,
  lastDamageTick: -999,
  lastRegenAt: 0,
  isFlying: false,
  facing: 1,
  maxAir: 8,
  air: 8,
  lastAirTick: 0,
  leadHolder: null,
};

const playerFour = {
  x: 27 * TILE,
  y: 10 * TILE,
  width: TILE,
  height: TILE * 2,
  vx: 0,
  vy: 0,
  onGround: false,
  isSwimming: false,
  maxHealth: PLAYER_MAX_HEARTS,
  health: PLAYER_MAX_HEARTS,
  lastDamageTick: -999,
  lastRegenAt: 0,
  isFlying: false,
  facing: 1,
  maxAir: 8,
  air: 8,
  lastAirTick: 0,
  leadHolder: null,
};

const allPlayers = [player, playerTwo, playerThree, playerFour];

const dimensions = {
  overworld: { world, surfaceHeights },
  nether: {
    world: Array.from({ length: ROWS }, () => Array(COLS).fill(0)),
    surfaceHeights: Array(COLS).fill(0),
  },
};

const keys = new Set();
const monsters = [];
const villagers = [];
const animals = [];
const seaAnimals = [];
let selectedBlock = ITEM_DEFS[0].id;
let cursorTile = null;
let worldTick = 0;
let liquidTick = 0;
let gameMode = "survival";
let lastSpaceTap = -1000;
let currentDimension = "overworld";
let portalCooldown = 0;
let activePlayerCount = 1;
let currentViewport = null;
let audioContext = null;
let musicEnabled = false;
let musicScheduledUntil = 0;
let musicTimer = null;
let thunderFlash = 0;
let isMuted = false;
let gameStarted = false;
let gamePaused = true;
let animationFrameId = null;
let networkMode = "offline";
let networkRoomId = "";
let networkPlayerId = "";
let networkIsHost = false;
let networkSyncTimer = null;
let networkSyncBusy = false;
let networkWorldVersion = 0;
let networkRemotePlayers = [];

const LAND_ANIMAL_TYPES = ["sheep", "pig", "cow", "chicken", "bunny"];
const SEA_ANIMAL_TYPES = ["fish", "jelly", "dolphin", "shark"];
const MONSTER_TYPES = ["zombie", "skeleton", "ghost", "orc", "enderman", "drowned", "dragon", "creeper"];

function renderMode() {
  const creative = gameMode === "creative";
  survivalButton.classList.toggle("active", !creative);
  creativeButton.classList.toggle("active", creative);
  modeCopy.textContent = creative
    ? "Creative gives you unlimited blocks, double-space flight, and local 1-4 player split-screen."
    : "Survival uses real inventory counts and local 1-4 player split-screen.";
  writeUiState({ gameMode });
  renderHearts();
}

function renderPlayerCount() {
  playerButtons.forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.playerCount) === activePlayerCount);
  });

  if (playerCopy) {
    if (networkMode === "online") {
      playerCopy.textContent = `Online room ${networkRoomId || ""}. Other players join with the room code.`;
      return;
    }
    playerCopy.textContent =
      activePlayerCount === 1
        ? "1 player uses a full screen."
        : `${activePlayerCount} players each get their own screen.`;
  }
  writeUiState({ activePlayerCount });
}

playerButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.id === "fullscreen-toggle" || button.id === "mute-toggle") return;
    activePlayerCount = Number(button.dataset.playerCount);
    renderPlayerCount();
    renderHearts();
  });
});

if (fullscreenToggle) {
  fullscreenToggle.addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await gameTabPanel.requestFullscreen();
      }
    } catch {
      updateStatus("Fullscreen is not available right now.");
    }
  });
}

function renderFullscreenButton() {
  if (!fullscreenToggle) return;
  fullscreenToggle.textContent = document.fullscreenElement ? "Exit Full Screen" : "Full Screen";
}

document.addEventListener("fullscreenchange", () => {
  document.body.classList.toggle("fullscreen-game", Boolean(document.fullscreenElement));
  renderFullscreenButton();
});

function renderMuteButton() {
  if (!muteToggle) return;
  muteToggle.textContent = isMuted ? "Unmute" : "Mute";
  muteToggle.classList.toggle("active", isMuted);
  writeUiState({ isMuted });
}

if (muteToggle) {
  muteToggle.addEventListener("click", async () => {
    isMuted = !isMuted;
    renderMuteButton();

    if (!audioContext) return;

    try {
      if (isMuted) {
        await audioContext.suspend();
      } else {
        await audioContext.resume();
        startAmbientMusic();
      }
    } catch {
      updateStatus("Audio could not change right now.");
    }
  });
}

function startGame() {
  gameStarted = true;
  gamePaused = false;
  renderGameRunState();
  ensureAudio();
  if (!animationFrameId) {
    animationFrameId = requestAnimationFrame(loop);
  }
}

function pauseGame(reason = "") {
  if (!gameStarted) {
    gamePaused = true;
    renderGameRunState();
    renderFrame();
    return;
  }

  gamePaused = true;
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  renderGameRunState();
  renderFrame();
  if (reason && gameRunStatus) {
    gameRunStatus.textContent = reason;
  }
}

if (startGameButton) {
  startGameButton.addEventListener("click", () => {
    startGame();
    focusGame();
  });
}

if (pauseGameButton) {
  pauseGameButton.addEventListener("click", () => {
    pauseGame("Paused. Press Resume to continue playing.");
  });
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    pauseGame("Paused because you left the tab.");
  }
});

window.addEventListener("blur", () => {
  pauseGame("Paused because the window is no longer active.");
});

function getServerUrl() {
  const fallback = window.location.origin && window.location.origin !== "null" ? window.location.origin : "http://localhost:3000";
  return (serverUrlInput?.value || fallback).replace(/\/+$/, "");
}

function setOnlineStatus(message) {
  if (onlineStatus) {
    onlineStatus.textContent = message;
  }
}

function getPlayerName() {
  return (playerNameInput?.value || "Player").trim() || "Player";
}

function serializeSnapshot() {
  return {
    dimensions: {
      overworld: {
        world: dimensions.overworld.world,
        surfaceHeights: dimensions.overworld.surfaceHeights,
      },
      nether: {
        world: dimensions.nether.world,
        surfaceHeights: dimensions.nether.surfaceHeights,
      },
    },
    currentDimension,
    worldTick,
    gameMode,
  };
}

function applySnapshot(snapshot) {
  if (!snapshot?.dimensions?.overworld?.world || !snapshot?.dimensions?.nether?.world) return;
  dimensions.overworld.world = snapshot.dimensions.overworld.world;
  dimensions.overworld.surfaceHeights = snapshot.dimensions.overworld.surfaceHeights;
  dimensions.nether.world = snapshot.dimensions.nether.world;
  dimensions.nether.surfaceHeights = snapshot.dimensions.nether.surfaceHeights;
  currentDimension = snapshot.currentDimension || "overworld";
  worldTick = snapshot.worldTick || 0;
  gameMode = snapshot.gameMode || "survival";
  syncDimensionRefs();
  renderMode();
  refreshWorldStatus();
}

function getLocalPlayerState() {
  return {
    x: player.x,
    y: player.y,
    width: player.width,
    height: player.height,
    facing: player.facing,
    health: player.health,
    maxHealth: player.maxHealth,
    name: getPlayerName(),
    dimension: currentDimension,
  };
}

function applyNetworkMeta(meta) {
  if (!meta) return;
  if (meta.currentDimension && meta.currentDimension !== currentDimension) {
    currentDimension = meta.currentDimension;
    syncDimensionRefs();
  }
  if (typeof meta.worldTick === "number") {
    worldTick = meta.worldTick;
  }
  if (meta.gameMode) {
    gameMode = meta.gameMode;
    renderMode();
  }
}

function applyNetworkChanges(changes) {
  if (!Array.isArray(changes)) return;
  changes.forEach((change) => {
    if (change.type !== "setBlock") return;
    const targetDimension = dimensions[change.dimension];
    if (!targetDimension) return;
    if (change.y < 0 || change.y >= ROWS) return;
    const wrappedX = ((change.x % COLS) + COLS) % COLS;
    targetDimension.world[change.y][wrappedX] = change.id;
  });
  syncDimensionRefs();
}

async function postJson(path, body) {
  const response = await fetch(`${getServerUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

function stopNetworkSync() {
  if (networkSyncTimer) {
    window.clearInterval(networkSyncTimer);
    networkSyncTimer = null;
  }
}

async function syncOnlineState() {
  if (networkMode !== "online" || !networkRoomId || !networkPlayerId || networkSyncBusy) return;
  networkSyncBusy = true;
  try {
    const result = await postJson("/api/sync", {
      roomId: networkRoomId,
      playerId: networkPlayerId,
      player: getLocalPlayerState(),
      knownWorldVersion: networkWorldVersion,
      meta: networkIsHost
        ? {
            currentDimension,
            worldTick,
            gameMode,
          }
        : null,
    });

    networkWorldVersion = result.worldVersion ?? networkWorldVersion;
    networkRemotePlayers = (result.players || []).filter((entry) => entry.id !== networkPlayerId && entry.dimension === currentDimension);
    applyNetworkMeta(result.meta);
    applyNetworkChanges(result.changes);
    renderHearts();
    refreshWorldStatus();
    setOnlineStatus(`Online room ${networkRoomId} with ${result.players?.length || 1} player(s).`);
  } catch (error) {
    setOnlineStatus(`Online sync stopped: ${error.message}`);
    stopNetworkSync();
  } finally {
    networkSyncBusy = false;
  }
}

function startNetworkSync() {
  stopNetworkSync();
  networkSyncTimer = window.setInterval(() => {
    syncOnlineState();
  }, 180);
}

async function hostOnlineRoom() {
  const result = await postJson("/api/host", {
    name: getPlayerName(),
    snapshot: serializeSnapshot(),
  });
  networkMode = "online";
  networkRoomId = result.roomId;
  networkPlayerId = result.playerId;
  networkIsHost = true;
  networkWorldVersion = result.worldVersion || 0;
  networkRemotePlayers = [];
  activePlayerCount = 1;
  renderPlayerCount();
  if (roomCodeInput) roomCodeInput.value = networkRoomId;
  applySnapshot(result.snapshot);
  setOnlineStatus(`Hosting room ${networkRoomId}. Share this code so others can join.`);
  startNetworkSync();
}

async function joinOnlineRoom() {
  const roomId = (roomCodeInput?.value || "").trim().toUpperCase();
  if (!roomId) {
    setOnlineStatus("Enter a room code first.");
    return;
  }

  const result = await postJson("/api/join", {
    roomId,
    name: getPlayerName(),
  });
  networkMode = "online";
  networkRoomId = result.roomId;
  networkPlayerId = result.playerId;
  networkIsHost = false;
  networkWorldVersion = result.worldVersion || 0;
  networkRemotePlayers = [];
  activePlayerCount = 1;
  renderPlayerCount();
  applySnapshot(result.snapshot);
  setOnlineStatus(`Joined room ${networkRoomId}.`);
  startNetworkSync();
}

async function sendWorldAction(change) {
  if (networkMode !== "online" || !networkRoomId || !networkPlayerId) return;
  try {
    const result = await postJson("/api/action", {
      roomId: networkRoomId,
      playerId: networkPlayerId,
      change,
    });
    networkWorldVersion = result.worldVersion ?? networkWorldVersion;
  } catch (error) {
    setOnlineStatus(`World sync failed: ${error.message}`);
  }
}

if (hostRoomButton) {
  hostRoomButton.addEventListener("click", async () => {
    try {
      await hostOnlineRoom();
    } catch (error) {
      setOnlineStatus(`Could not host room: ${error.message}`);
    }
  });
}

if (joinRoomButton) {
  joinRoomButton.addEventListener("click", async () => {
    try {
      await joinOnlineRoom();
    } catch (error) {
      setOnlineStatus(`Could not join room: ${error.message}`);
    }
  });
}

if (window.location.protocol === "file:") {
  setOnlineStatus("You are on file:// right now. Multiplayer works from http://localhost:3000 after you run npm start.");
}

const initialUiState = readUiState();
if (initialUiState.gameMode === "creative" || initialUiState.gameMode === "survival") {
  gameMode = initialUiState.gameMode;
}
if (Number.isInteger(initialUiState.activePlayerCount) && initialUiState.activePlayerCount >= 1 && initialUiState.activePlayerCount <= 4) {
  activePlayerCount = initialUiState.activePlayerCount;
}
if (typeof initialUiState.isMuted === "boolean") {
  isMuted = initialUiState.isMuted;
}
const initialTab = typeof initialUiState.activeTab === "string" ? initialUiState.activeTab : "home";

survivalButton.addEventListener("click", () => {
  gameMode = "survival";
  player.isFlying = false;
  renderMode();
  renderToolbar();
  renderInventory();
});

creativeButton.addEventListener("click", () => {
  gameMode = "creative";
  renderMode();
  renderToolbar();
  renderInventory();
});

function renderHeartsLegacy() {
  if (!heartsRoot) return;

  if (gameMode === "creative") {
    heartsRoot.innerHTML = `
      <span class="heart">∞</span>
      <span class="heart-label">Creative mode</span>
    `;
    return;
  }

  let markup = "";
  for (let i = 0; i < player.maxHealth; i++) {
    const full = i < player.health;
    markup += `<span class="heart${full ? "" : " empty"}" aria-hidden="true">${full ? "♥" : "♡"}</span>`;
  }
  markup += `<span class="heart-label">${player.health}/${player.maxHealth} hearts</span>`;
  heartsRoot.innerHTML = markup;
}

function setBlock(x, y, id) {
  if (y < 0 || y >= ROWS) return;
  const wrappedX = ((x % COLS) + COLS) % COLS;
  world[y][wrappedX] = id;
}

function getBlock(tx, ty) {
  if (ty < 0 || ty >= ROWS) return 0;
  const wrappedX = ((tx % COLS) + COLS) % COLS;
  return world[ty][wrappedX];
}

function isEmptyForLiquid(id) {
  return id === 0;
}

function syncDimensionRefs() {
  world = dimensions[currentDimension].world;
  surfaceHeights = dimensions[currentDimension].surfaceHeights;
}

function placeTree(baseX, surfaceY) {
  const trunkHeight = 3 + Math.floor(Math.random() * 3);
  for (let y = surfaceY - 1; y > surfaceY - 1 - trunkHeight; y--) {
    setBlock(baseX, y, 4);
  }

  const canopyY = surfaceY - trunkHeight;
  for (let y = canopyY - 1; y <= canopyY + 1; y++) {
    for (let x = baseX - 2; x <= baseX + 2; x++) {
      const distance = Math.abs(x - baseX) + Math.abs(y - canopyY);
      if (distance <= 3 && getBlock(x, y) === 0) {
        setBlock(x, y, 5);
      }
    }
  }

  if (getBlock(baseX, canopyY - 2) === 0) {
    setBlock(baseX, canopyY - 2, 5);
  }
}

function addOreBands() {
  for (let y = 28; y < ROWS - 2; y++) {
    for (let x = 2; x < COLS - 2; x++) {
      if (world[y][x] !== 3) continue;
      const roll = Math.random();
      if (roll < 0.02) {
        setBlock(x, y, 10);
      } else if (roll < 0.03) {
        setBlock(x, y, 11);
      }
    }
  }
}

function addWaterPools() {
  for (let x = 8; x < COLS - 8; x += 18) {
    if (Math.random() < 0.45) continue;
    const width = 3 + Math.floor(Math.random() * 3);
    const centerHeight = surfaceHeights[x];

    for (let dx = -width; dx <= width; dx++) {
      const column = x + dx;
      const rim = Math.abs(dx) === width;
      const waterSurface = centerHeight + (rim ? 0 : 1);
      setBlock(column, waterSurface - 1, 9);
      setBlock(column, waterSurface, 6);
      for (let y = waterSurface + 1; y < ROWS && world[y][column] === 0; y++) {
        setBlock(column, y, 6);
      }
    }
  }
}

function addLavaPools() {
  for (let x = 14; x < COLS - 14; x += 26) {
    if (Math.random() < 0.55) continue;
    const poolWidth = 2 + Math.floor(Math.random() * 2);
    const poolDepth = 42 + Math.floor(Math.random() * 8);

    for (let dx = -poolWidth; dx <= poolWidth; dx++) {
      const column = x + dx;
      setBlock(column, poolDepth - 1, 3);
      setBlock(column, poolDepth, 16);
      setBlock(column, poolDepth + 1, 16);
    }
  }
}

function addVolcanoes() {
  for (let centerX = 18; centerX < COLS - 18; centerX += 42) {
    if (Math.random() < 0.6) continue;
    const peakY = Math.max(16, surfaceHeights[centerX] - (7 + Math.floor(Math.random() * 5)));
    const baseY = surfaceHeights[centerX];
    const radius = 5 + Math.floor(Math.random() * 3);

    for (let dx = -radius; dx <= radius; dx++) {
      const column = centerX + dx;
      const taper = Math.abs(dx);
      const topY = peakY + taper;
      for (let y = topY; y <= baseY; y++) {
        setBlock(column, y, taper <= 1 && y <= peakY + 2 ? 16 : 3);
      }
      if (taper <= 1) {
        setBlock(column, topY - 1, 16);
      }
    }
  }
}

function addPortalRings() {
  for (let x = 14; x < COLS - 14; x += 34) {
    if (Math.random() < 0.65) continue;
    const baseY = surfaceHeights[x] - 1;
    for (let dx = -1; dx <= 1; dx++) {
      setBlock(x + dx, baseY + 2, 13);
      setBlock(x + dx, baseY - 2, 13);
    }
    for (let dy = -1; dy <= 1; dy++) {
      setBlock(x - 2, baseY + dy, 13);
      setBlock(x + 2, baseY + dy, 13);
    }
    setBlock(x, baseY, 17);
    setBlock(x, baseY - 1, 17);
  }
}

function spawnVillager(x, y) {
  villagers.push({
    x: x * TILE,
    y: y * TILE,
    width: TILE,
    height: TILE * 2,
    vx: Math.random() < 0.5 ? -0.45 : 0.45,
    vy: 0,
    onGround: false,
    stepTick: Math.floor(Math.random() * 120),
    leadTarget: null,
  });
}

function spawnAnimal(x, y, type = "sheep") {
  animals.push({
    x: x * TILE,
    y: y * TILE,
    width: TILE,
    height: TILE,
    vx: Math.random() < 0.5 ? -0.35 : 0.35,
    vy: 0,
    onGround: false,
    stepTick: Math.floor(Math.random() * 120),
    type,
    leadTarget: null,
  });
}

function spawnSeaAnimal(x, y, type = "fish") {
  seaAnimals.push({
    x: x * TILE,
    y: y * TILE,
    width: TILE,
    height: Math.round(TILE * 0.7),
    vx: Math.random() < 0.5 ? -0.45 : 0.45,
    vy: 0,
    swimTick: Math.floor(Math.random() * 120),
    type,
    leadTarget: null,
  });
}

function createMonster(type, x, y) {
  const base = {
    x: x * TILE,
    y: y * TILE,
    width: TILE,
    height: TILE * 2,
    vx: 0,
    vy: 0,
    onGround: false,
    health: 10,
    maxHealth: 10,
    burnTick: 0,
    type,
    leadTarget: null,
    phaseTick: Math.floor(Math.random() * 200),
    waterTicks: 0,
  };

  if (type === "enderman") {
    base.height = Math.round(TILE * 2.4);
  }
  if (type === "ghost") {
    base.height = Math.round(TILE * 1.8);
  }
  if (type === "creeper") {
    base.width = Math.round(TILE * 0.95);
    base.height = Math.round(TILE * 1.9);
  }
  if (type === "dragon") {
    base.width = TILE * 2;
    base.height = TILE * 2;
    base.health = 16;
    base.maxHealth = 16;
  }
  return base;
}

function addVillage(centerX) {
  const baseY = surfaceHeights[centerX];

  for (let x = centerX - 14; x <= centerX + 14; x++) {
    setBlock(x, baseY, 12);
  }

  for (let x = centerX - 3; x <= centerX + 3; x++) {
    setBlock(x, baseY - 1, 13);
  }

  const houseOffsets = [-12, -6, 0, 6, 12];
  houseOffsets.forEach((offset) => {
    const left = centerX + offset;
    const floorY = baseY - 1;

    for (let x = left; x < left + 5; x++) {
      setBlock(x, floorY + 3, 4);
      setBlock(x, floorY, 12);
    }

    for (let y = floorY + 1; y <= floorY + 3; y++) {
      setBlock(left, y, 4);
      setBlock(left + 4, y, 4);
    }

    setBlock(left + 1, floorY + 2, 14);
    setBlock(left + 3, floorY + 2, 14);
    setBlock(left + 1, floorY + 1, 7);
    setBlock(left + 1, floorY, 7);
    setBlock(left + 2, floorY + 4, 12);
    setBlock(left + 1, floorY + 4, 4);
    setBlock(left + 3, floorY + 4, 4);
  });

  setBlock(centerX, baseY - 1, 15);
  setBlock(centerX, baseY - 2, 15);
  spawnVillager(centerX - 10, baseY - 2);
  spawnVillager(centerX - 4, baseY - 2);
  spawnVillager(centerX + 4, baseY - 2);
  spawnVillager(centerX + 10, baseY - 2);
}

function addVillages() {
  for (let x = 24; x < COLS - 24; x += 52) {
    const flat =
      Math.abs(surfaceHeights[x] - surfaceHeights[x - 2]) <= 1 &&
      Math.abs(surfaceHeights[x] - surfaceHeights[x + 2]) <= 1;
    if (flat && Math.random() < 0.72) {
      addVillage(x);
    }
  }
}

function addSnowAndIce() {
  for (let x = 0; x < COLS; x++) {
    if (surfaceHeights[x] > 27 || currentDimension === "nether") continue;

    if (getBlock(x, surfaceHeights[x]) === 1) {
      setBlock(x, surfaceHeights[x], 18);
    }

    for (let y = Math.max(0, surfaceHeights[x] - 2); y <= Math.min(ROWS - 1, surfaceHeights[x] + 2); y++) {
      if (getBlock(x, y) === 6 && Math.random() < 0.7) {
        setBlock(x, y, 19);
      }
    }
  }
}

function addAnimals() {
  for (let x = 10; x < COLS - 10; x += 20) {
    if (currentDimension === "nether") continue;
    if (Math.random() < 0.45) continue;
    const groundY = surfaceHeights[x] - 1;
    if (getBlock(x, groundY) === 0 && getBlock(x, groundY + 1) !== 0) {
      spawnAnimal(x, groundY, LAND_ANIMAL_TYPES[Math.floor(Math.random() * LAND_ANIMAL_TYPES.length)]);
    }
  }
}

function addSeaAnimals() {
  for (let x = 8; x < COLS - 8; x += 18) {
    if (currentDimension === "nether") continue;
    for (let y = 10; y < ROWS - 6; y++) {
      if (getBlock(x, y) === 6 && getBlock(x, y + 1) === 6) {
        if (Math.random() < 0.5) {
          spawnSeaAnimal(x, y, SEA_ANIMAL_TYPES[Math.floor(Math.random() * SEA_ANIMAL_TYPES.length)]);
        }
        break;
      }
    }
  }
}

function generateWorld() {
  let height = 34;
  for (let x = 0; x < COLS; x++) {
    if (Math.random() < 0.38) {
      height += Math.floor(Math.random() * 3) - 1;
      height = Math.max(23, Math.min(41, height));
    }

    surfaceHeights[x] = height;
    for (let y = height; y < ROWS; y++) {
      if (y === height) {
        setBlock(x, y, 1);
      } else if (y < height + 4) {
        setBlock(x, y, 2);
      } else {
        setBlock(x, y, 3);
      }
    }
  }

  addOreBands();

  for (let x = 6; x < COLS - 6; x++) {
    const isFlatEnough =
      Math.abs(surfaceHeights[x] - surfaceHeights[x - 1]) <= 1 &&
      Math.abs(surfaceHeights[x] - surfaceHeights[x + 1]) <= 1;
    if (isFlatEnough && Math.random() < 0.08) {
      placeTree(x, surfaceHeights[x]);
      x += 4;
    }
  }

  addWaterPools();
  addLavaPools();
  addVolcanoes();
  addPortalRings();
  addVillages();
  addSnowAndIce();
  addAnimals();
  addSeaAnimals();
}

function generateNetherWorld() {
  for (let x = 0; x < COLS; x++) {
    const base = 24 + Math.floor(Math.sin(x / 6) * 2);
    surfaceHeights[x] = base;

    for (let y = base; y < ROWS; y++) {
      if (y < base + 2) {
        setBlock(x, y, 16);
      } else {
        setBlock(x, y, 3);
      }
    }

    for (let y = 0; y < 8; y++) {
      setBlock(x, y, 3);
    }
  }

  addVolcanoes();
  addPortalRings();
  addLavaPools();
}

generateWorld();
currentDimension = "nether";
syncDimensionRefs();
generateNetherWorld();
currentDimension = "overworld";
syncDimensionRefs();

function flowLiquids() {
  liquidTick += 1;
  if (liquidTick % 8 !== 0) return;

  const next = world.map((row) => row.slice());

  for (let y = ROWS - 2; y >= 0; y--) {
    for (let x = 1; x < COLS - 1; x++) {
      const id = world[y][x];
      if (id !== 6 && id !== 16) continue;

      const below = world[y + 1][x];
      if (isEmptyForLiquid(below)) {
        next[y + 1][x] = id;
        continue;
      }

      if (id === 16 && below === 6) {
        next[y + 1][x] = 3;
      }

      const directions = id === 6 ? [-1, 1] : [1, -1];
      for (const dx of directions) {
        const side = world[y][x + dx];
        const sideBelow = world[y + 1][x + dx];

        if (id === 16 && (side === 6 || sideBelow === 6)) {
          if (side === 6) next[y][x + dx] = 3;
          if (sideBelow === 6) next[y + 1][x + dx] = 3;
        }

        if (isEmptyForLiquid(side) && !isEmptyForLiquid(sideBelow)) {
          next[y][x + dx] = id;
          break;
        }
      }
    }
  }

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      world[y][x] = next[y][x];
    }
  }
}

function getDayPhase() {
  return (worldTick % DAY_LENGTH) / DAY_LENGTH;
}

function isThunderStorm() {
  return currentDimension !== "nether" && Math.sin(worldTick / 320) > 0.55;
}

function isRaining() {
  if (isThunderStorm()) return true;
  return currentDimension !== "nether" && Math.sin(worldTick / 220) > -0.1;
}

function getTimeLabel() {
  const phase = getDayPhase();
  if (phase < 0.22) return "Morning";
  if (phase < 0.48) return "Day";
  if (phase < 0.72) return "Evening";
  return "Night";
}

function isNightTime() {
  return getDayPhase() >= 0.72;
}

function isEarlyMorning() {
  return getDayPhase() < 0.22;
}

function canSleepNow() {
  return currentDimension !== "nether" && (isNightTime() || isThunderStorm());
}

function skipSleepTime() {
  if (isNightTime()) {
    const cycles = Math.floor(worldTick / DAY_LENGTH);
    worldTick = (cycles + 1) * DAY_LENGTH + Math.floor(DAY_LENGTH * 0.08);
  }

  let guard = 0;
  while (isThunderStorm() && guard < DAY_LENGTH * 3) {
    worldTick += 1;
    guard += 1;
  }

  monsters.length = 0;
  thunderFlash = 0;
  updateStatus("You slept until morning and waited out the thunder storm.");
}

function refreshWorldStatus() {
  timeStatus.textContent = `${getTimeLabel()} - ${currentDimension === "nether" ? "Nether" : "Overworld"}`;
  weatherStatus.textContent = currentDimension === "nether" ? "Ash" : isThunderStorm() ? "Thunder Storm" : isRaining() ? "Rain" : "Clear";
  renderStations();
}

function isSolidAt(tx, ty) {
  if (ty < 0 || ty >= ROWS) return true;
  const block = BLOCK_DEFS[getBlock(tx, ty)];
  return Boolean(block?.solid);
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

function isWaterAt(tx, ty) {
  return getBlock(tx, ty) === 6;
}

function isLavaAt(tx, ty) {
  return getBlock(tx, ty) === 16;
}

function isPortalAt(tx, ty) {
  return getBlock(tx, ty) === 17;
}

function isEntityInWater(entity) {
  const left = Math.floor(entity.x / TILE);
  const right = Math.floor((entity.x + entity.width - 1) / TILE);
  const top = Math.floor(entity.y / TILE);
  const bottom = Math.floor((entity.y + entity.height - 1) / TILE);

  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      if (isWaterAt(x, y)) return true;
    }
  }
  return false;
}

function isEntityInLava(entity) {
  const left = Math.floor(entity.x / TILE);
  const right = Math.floor((entity.x + entity.width - 1) / TILE);
  const top = Math.floor(entity.y / TILE);
  const bottom = Math.floor((entity.y + entity.height - 1) / TILE);

  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      if (isLavaAt(x, y)) return true;
    }
  }
  return false;
}

function isEntityInPortal(entity) {
  const left = Math.floor(entity.x / TILE);
  const right = Math.floor((entity.x + entity.width - 1) / TILE);
  const top = Math.floor(entity.y / TILE);
  const bottom = Math.floor((entity.y + entity.height - 1) / TILE);

  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      if (isPortalAt(x, y)) return true;
    }
  }
  return false;
}

function isPlayerInWater() {
  return isEntityInWater(player);
}

function isPlayerInLava() {
  return isEntityInLava(player);
}

function respawnEntity(entity) {
  const index = allPlayers.indexOf(entity);
  const spawnXs = [15, 19, 23, 27];
  entity.x = spawnXs[Math.max(0, index)] * TILE;
  entity.y = 10 * TILE;
  entity.vx = 0;
  entity.vy = 0;
  entity.onGround = false;
  entity.health = entity.maxHealth;
  entity.lastDamageTick = -999;
  entity.lastRegenAt = performance.now();
  entity.air = entity.maxAir;
  entity.lastAirTick = performance.now();
}

function damageEntity(entity, amount, reason) {
  if (gameMode === "creative") return;
  if (worldTick - entity.lastDamageTick < 45) return;

  entity.health = Math.max(0, entity.health - amount);
  entity.lastDamageTick = worldTick;
  entity.lastRegenAt = performance.now();
  renderHearts();
  playSound("hurt");

  const playerNumber = allPlayers.indexOf(entity) + 1;
  if (entity.health <= 0) {
    respawnEntity(entity);
    renderHearts();
    updateStatus(`Player ${playerNumber} ran out of hearts and respawned.`);
    return;
  }

  if (reason) {
    updateStatus(`Player ${playerNumber}: ${reason}`);
  }
}

function updateHealing() {
  if (gameMode !== "survival") return;

  const now = performance.now();
  getActivePlayers().forEach((activePlayer, index) => {
    if (activePlayer.health >= activePlayer.maxHealth) return;
    if (activePlayer.lastRegenAt === 0) {
      activePlayer.lastRegenAt = now;
      return;
    }

    if (now - activePlayer.lastRegenAt >= 30000) {
      activePlayer.health = Math.min(activePlayer.maxHealth, activePlayer.health + 0.5);
      activePlayer.lastRegenAt = now;
      renderHearts();
      playSound("heal");
      updateStatus(`Player ${index + 1} recovered half a heart.`);
    }
  });
}

function updateDrowning() {
  if (gameMode === "creative") return;

  const now = performance.now();
  getActivePlayers().forEach((activePlayer, index) => {
    if (isEntityInWater(activePlayer)) {
      if (activePlayer.lastAirTick === 0) {
        activePlayer.lastAirTick = now;
        return;
      }

      if (now - activePlayer.lastAirTick >= 1000) {
        activePlayer.lastAirTick = now;
        activePlayer.air = Math.max(0, activePlayer.air - 1);
        if (activePlayer.air === 0) {
          damageEntity(activePlayer, 1, "You are drowning.");
        }
      }
    } else {
      activePlayer.air = activePlayer.maxAir;
      activePlayer.lastAirTick = now;
    }
  });
}

function updateEntityMovement(entity, controls, allowCreativeFlight = false) {
  entity.isSwimming = isEntityInWater(entity);
  const speed = 2.8;
  const swimSpeed = 2.2;
  const flySpeed = 3.6;
  entity.vx = 0;

  if (keys.has(controls.left)) {
    entity.vx = entity.isSwimming ? -swimSpeed : entity.isFlying ? -flySpeed : -speed;
    entity.facing = -1;
  }
  if (keys.has(controls.right)) {
    entity.vx = entity.isSwimming ? swimSpeed : entity.isFlying ? flySpeed : speed;
    entity.facing = 1;
  }

  if (entity.isFlying && allowCreativeFlight) {
    entity.vy = 0;
    if (keys.has(controls.jump)) entity.vy = -flySpeed;
    if (keys.has(controls.down)) entity.vy = flySpeed;
  } else if (entity.isSwimming) {
    if (keys.has(controls.jump)) {
      entity.vy = -3.8;
    } else {
      entity.vy += 0.08;
    }
    entity.vy = Math.max(-3.8, Math.min(entity.vy, 2));
  } else if (keys.has(controls.jump) && entity.onGround) {
    entity.vy = JUMP_VELOCITY;
    entity.onGround = false;
    entity.isSwimming = false;
    playSound("jump");
  }

  if (!entity.isSwimming && !entity.isFlying) {
    entity.vy += GRAVITY;
    entity.vy = Math.min(entity.vy, 12);
  }

  const nextX = entity.x + entity.vx;
  if (!collides(nextX, entity.y, entity.width, entity.height)) {
    entity.x = nextX;
  } else if (entity.vx !== 0) {
    const step = Math.sign(entity.vx);
    while (!collides(entity.x + step, entity.y, entity.width, entity.height)) {
      entity.x += step;
    }
  }

  if (entity.x < 0) entity.x += WORLD_WIDTH;
  if (entity.x >= WORLD_WIDTH) entity.x -= WORLD_WIDTH;

  const nextY = entity.y + entity.vy;
  if (!collides(entity.x, nextY, entity.width, entity.height)) {
    entity.y = nextY;
    entity.onGround = false;
  } else {
    const step = Math.sign(entity.vy);
    while (step !== 0 && !collides(entity.x, entity.y + step, entity.width, entity.height)) {
      entity.y += step;
    }
    entity.onGround = entity.vy > 0 && !entity.isSwimming && !entity.isFlying;
    entity.vy = 0;
  }
}

function usePortal() {
  currentDimension = currentDimension === "overworld" ? "nether" : "overworld";
  syncDimensionRefs();
  monsters.length = 0;
  const targetX = Math.floor(player.x / TILE);
  const surfaceY = Math.max(8, surfaceHeights[((targetX % COLS) + COLS) % COLS] - 3);
  getActivePlayers().forEach((activePlayer, index) => {
    activePlayer.y = surfaceY * TILE;
    activePlayer.x = (targetX + index * 2) * TILE;
    activePlayer.vx = 0;
    activePlayer.vy = 0;
  });
  portalCooldown = 90;
  updateStatus(currentDimension === "nether" ? "Entered the Nether." : "Returned to the Overworld.");
  playSound("portal");
}

function updatePlayer() {
  const configs = getPlayerConfigs();
  configs.forEach((config, index) => {
    updateEntityMovement(config.entity, config.controls, gameMode === "creative" && config.flight);

    if (isEntityInLava(config.entity)) {
      damageEntity(config.entity, 1, "Lava hurts. Get back to water or land.");
    }
  });

  if (portalCooldown > 0) {
    portalCooldown -= 1;
  } else if (getActivePlayers().some((activePlayer) => isEntityInPortal(activePlayer))) {
    usePortal();
  }
}

function spawnMonster() {
  if (!isNightTime() || monsters.length >= 6 || worldTick % 150 !== 0) return;

  const playerTileX = Math.floor(player.x / TILE);
  const spawnOffset = Math.random() < 0.5 ? -1 : 1;
  const spawnX = Math.max(3, Math.min(COLS - 4, playerTileX + spawnOffset * (10 + Math.floor(Math.random() * 8))));
  const surfaceY = surfaceHeights[spawnX] - 2;

  if (getBlock(spawnX, surfaceY) !== 0 || getBlock(spawnX, surfaceY + 1) !== 0) return;
  const nearWater = isWaterAt(spawnX, surfaceY + 1) || isWaterAt(spawnX - 1, surfaceY + 1) || isWaterAt(spawnX + 1, surfaceY + 1);
  let type = "zombie";

  if (nearWater && Math.random() < 0.55) {
    type = "drowned";
  } else {
    const roll = Math.random();
    if (roll > 0.96) type = "dragon";
    else if (roll > 0.86) type = "enderman";
    else if (roll > 0.74) type = "creeper";
    else if (roll > 0.64) type = "ghost";
    else if (roll > 0.52) type = "orc";
    else if (roll > 0.4) type = "skeleton";
  }

  monsters.push(createMonster(type, spawnX, surfaceY));
}

function updateMonsters() {
  spawnMonster();

  for (let i = monsters.length - 1; i >= 0; i--) {
    const monster = monsters[i];
    const targetPlayer = getActivePlayers().reduce((best, activePlayer) => {
      let distance = activePlayer.x - monster.x;
      if (distance > WORLD_WIDTH / 2) distance -= WORLD_WIDTH;
      if (distance < -WORLD_WIDTH / 2) distance += WORLD_WIDTH;
      if (!best || Math.abs(distance) < Math.abs(best.distance)) {
        return { player: activePlayer, distance };
      }
      return best;
    }, null);
    if (!targetPlayer) continue;

    let dx = targetPlayer.distance;
    if (dx > WORLD_WIDTH / 2) dx -= WORLD_WIDTH;
    if (dx < -WORLD_WIDTH / 2) dx += WORLD_WIDTH;
    const nearPlayer = Math.abs(dx) < TILE * 18;
    const burning = isEarlyMorning() && monster.type !== "ghost" && monster.type !== "drowned";
    let monsterSpeed = burning ? 1 : 1.35;
    if (monster.type === "ghost") monsterSpeed = 1.7;
    if (monster.type === "orc") monsterSpeed = 1.15;
    if (monster.type === "enderman") monsterSpeed = 2.1;
    if (monster.type === "creeper") monsterSpeed = 1.1;
    if (monster.type === "dragon") monsterSpeed = 1.5;
    if (monster.type === "drowned") monsterSpeed = isEntityInWater(monster) ? 1.5 : 0.95;

    if (monster.type === "zombie" && isEntityInWater(monster)) {
      monster.waterTicks += 1;
      if (monster.waterTicks > 180) {
        monster.type = "drowned";
        monster.waterTicks = 0;
        updateStatus("A zombie sank and became a drowned zombie.");
      }
    } else {
      monster.waterTicks = 0;
    }

    monster.vx = nearPlayer ? Math.sign(dx) * monsterSpeed : 0;
    monster.phaseTick += 1;
    if (monster.type === "ghost" || monster.type === "dragon") {
      monster.vy = Math.sin(monster.phaseTick / 22) * 1.1;
    } else {
      monster.vy += GRAVITY;
      monster.vy = Math.min(monster.vy, 10);
    }

    if (monster.type === "enderman" && nearPlayer && monster.onGround && worldTick % 90 === 0) {
      monster.vy = JUMP_VELOCITY * 0.8;
      monster.onGround = false;
    }
    if (monster.type === "enderman" && nearPlayer && worldTick % 150 === 0) {
      const teleportOffsets = [6, -6, 8, -8, 10, -10];
      for (const offset of teleportOffsets) {
        const nextTileX = Math.floor(monster.x / TILE) + offset;
        const nextTileY = Math.max(2, surfaceHeights[((nextTileX % COLS) + COLS) % COLS] - 2);
        const nextX = (((nextTileX % COLS) + COLS) % COLS) * TILE;
        const nextY = nextTileY * TILE;
        if (!collides(nextX, nextY, monster.width, monster.height)) {
          monster.x = nextX;
          monster.y = nextY;
          monster.vx = 0;
          monster.vy = 0;
          updateStatus("An enderman teleported.");
          playSound("portal");
          break;
        }
      }
    }

    const nextX = monster.x + monster.vx;
    if (!collides(nextX, monster.y, monster.width, monster.height)) {
      monster.x = nextX;
    }

    if (monster.x < 0) monster.x += WORLD_WIDTH;
    if (monster.x >= WORLD_WIDTH) monster.x -= WORLD_WIDTH;

    const nextY = monster.y + monster.vy;
    if (monster.type === "ghost" || monster.type === "dragon") {
      monster.y = Math.max(0, Math.min(ROWS * TILE - monster.height, nextY));
      monster.onGround = false;
    } else if (!collides(monster.x, nextY, monster.width, monster.height)) {
      monster.y = nextY;
      monster.onGround = false;
    } else {
      const step = Math.sign(monster.vy);
      while (step !== 0 && !collides(monster.x, monster.y + step, monster.width, monster.height)) {
        monster.y += step;
      }
      monster.onGround = monster.vy > 0;
      monster.vy = 0;
    }

    if (burning) {
      monster.burnTick += 1;
      if (monster.burnTick % 20 === 0) {
        monster.health -= 1;
      }
    } else {
      monster.burnTick = 0;
    }

    const hitPlayer = getActivePlayers().find((activePlayer) => {
      return (
        monster.x < activePlayer.x + activePlayer.width &&
        monster.x + monster.width > activePlayer.x &&
        monster.y < activePlayer.y + activePlayer.height &&
        monster.y + monster.height > activePlayer.y
      );
    });
    if (hitPlayer) {
      damageEntity(hitPlayer, 1, burning ? "A burning monster tagged you." : "A monster hit you.");
    }

    const nearestPlayerDistance = Math.min(
      ...getActivePlayers().map((activePlayer) => {
        let distance = Math.abs(monster.x - activePlayer.x);
        return Math.min(distance, WORLD_WIDTH - distance);
      })
    );
    if (monster.health <= 0 || nearestPlayerDistance > TILE * 34) {
      monsters.splice(i, 1);
    }
  }
}

function updateVillagers() {
  if (currentDimension === "nether") return;
  for (let i = 0; i < villagers.length; i++) {
    const villager = villagers[i];
    villager.stepTick += 1;
    if (villager.stepTick % 160 === 0) {
      villager.vx = Math.random() < 0.5 ? -0.45 : 0.45;
    }

    if (villager.leadTarget) {
      villager.vx = Math.sign(villager.leadTarget.x - villager.x) * 0.55;
    }

    const nextX = villager.x + villager.vx;
    if (!collides(nextX, villager.y, villager.width, villager.height)) {
      villager.x = nextX;
    } else {
      villager.vx *= -1;
    }

    if (villager.x < 0) villager.x += WORLD_WIDTH;
    if (villager.x >= WORLD_WIDTH) villager.x -= WORLD_WIDTH;

    villager.vy += GRAVITY;
    if (villager.onGround && villager.stepTick % 210 === 0) {
      villager.vy = JUMP_VELOCITY * 0.65;
    }
    villager.vy = Math.min(villager.vy, 8);
    const nextY = villager.y + villager.vy;
    if (!collides(villager.x, nextY, villager.width, villager.height)) {
      villager.y = nextY;
      villager.onGround = false;
    } else {
      const step = Math.sign(villager.vy);
      while (step !== 0 && !collides(villager.x, villager.y + step, villager.width, villager.height)) {
        villager.y += step;
      }
      villager.onGround = villager.vy > 0;
      villager.vy = 0;
    }
  }
}

function updateAnimals() {
  if (currentDimension === "nether") return;
  animals.forEach((animal) => {
    animal.stepTick += 1;
    if (!animal.leadTarget && animal.stepTick % 160 === 0) {
      animal.vx = Math.random() < 0.5 ? -0.35 : 0.35;
    }

    if (animal.leadTarget) {
      const dx = animal.leadTarget.x - animal.x;
      animal.vx = Math.sign(dx) * 0.6;
    }

    const nextX = animal.x + animal.vx;
    if (!collides(nextX, animal.y, animal.width, animal.height)) {
      animal.x = nextX;
    } else {
      animal.vx *= -1;
    }

    animal.vy += GRAVITY;
    if (animal.onGround && animal.stepTick % 190 === 0) {
      animal.vy = JUMP_VELOCITY * 0.55;
    }
    animal.vy = Math.min(animal.vy, 8);
    const nextY = animal.y + animal.vy;
    if (!collides(animal.x, nextY, animal.width, animal.height)) {
      animal.y = nextY;
      animal.onGround = false;
    } else {
      const step = Math.sign(animal.vy);
      while (step !== 0 && !collides(animal.x, animal.y + step, animal.width, animal.height)) {
        animal.y += step;
      }
      animal.onGround = animal.vy > 0;
      animal.vy = 0;
    }
  });
}

function updateSeaAnimals() {
  if (currentDimension === "nether") return;
  seaAnimals.forEach((animal) => {
    animal.swimTick += 1;
    if (!animal.leadTarget && animal.swimTick % 120 === 0) {
      animal.vx = Math.random() < 0.5 ? -0.45 : 0.45;
      animal.vy = Math.random() < 0.5 ? -0.2 : 0.2;
    }

    if (animal.leadTarget) {
      animal.vx = Math.sign(animal.leadTarget.x - animal.x) * 0.5;
      animal.vy = Math.sign(animal.leadTarget.y - animal.y) * 0.3;
    }

    animal.x += animal.vx;
    animal.y += animal.vy;

    if (!isEntityInWater(animal)) {
      animal.y += 1.2;
    }
    if (animal.x < 0) animal.x += WORLD_WIDTH;
    if (animal.x >= WORLD_WIDTH) animal.x -= WORLD_WIDTH;
  });
}

function getViewWidth() {
  return currentViewport?.width ?? canvas.width;
}

function getViewHeight() {
  return currentViewport?.height ?? canvas.height;
}

function getCameraFor(entity) {
  const viewWidth = getViewWidth();
  const viewHeight = getViewHeight();
  const cx = entity.x + entity.width / 2 - viewWidth / 2;
  const cy = entity.y + entity.height / 2 - viewHeight / 2;
  const maxY = ROWS * TILE - viewHeight;
  return {
    x: cx,
    y: Math.max(0, Math.min(maxY, cy)),
  };
}

function getActivePlayers() {
  return allPlayers.slice(0, activePlayerCount);
}

function getPlayerConfigs() {
  return [
    { entity: player, controls: { left: "ArrowLeft", right: "ArrowRight", jump: "Space", down: "ShiftLeft" }, flight: true },
    { entity: playerTwo, controls: { left: "KeyA", right: "KeyD", jump: "KeyW", down: "KeyS" }, flight: false },
    { entity: playerThree, controls: { left: "KeyJ", right: "KeyL", jump: "KeyI", down: "KeyK" }, flight: false },
    { entity: playerFour, controls: { left: "Numpad4", right: "Numpad6", jump: "Numpad8", down: "Numpad5" }, flight: false },
  ].slice(0, activePlayerCount);
}

function getViewports() {
  if (activePlayerCount === 1) {
    return [{ x: 0, y: 0, width: canvas.width, height: canvas.height }];
  }

  if (activePlayerCount === 2) {
    return [
      { x: 0, y: 0, width: canvas.width / 2, height: canvas.height },
      { x: canvas.width / 2, y: 0, width: canvas.width / 2, height: canvas.height },
    ];
  }

  return [
    { x: 0, y: 0, width: canvas.width / 2, height: canvas.height / 2 },
    { x: canvas.width / 2, y: 0, width: canvas.width / 2, height: canvas.height / 2 },
    { x: 0, y: canvas.height / 2, width: canvas.width / 2, height: canvas.height / 2 },
    { x: canvas.width / 2, y: canvas.height / 2, width: canvas.width / 2, height: canvas.height / 2 },
  ].slice(0, activePlayerCount);
}

function getSkyColors() {
  const phase = getDayPhase();
  const brightness = 0.5 + 0.5 * Math.sin(phase * Math.PI * 2 - Math.PI / 2);
  return {
    top: `rgba(${Math.round(28 + brightness * 110)}, ${Math.round(54 + brightness * 150)}, ${Math.round(
      88 + brightness * 150
    )}, 1)`,
    bottom: `rgba(${Math.round(54 + brightness * 180)}, ${Math.round(88 + brightness * 150)}, ${Math.round(
      124 + brightness * 110
    )}, 1)`,
    darkness: 0.62 - brightness * 0.52,
  };
}

function drawSky() {
  const viewWidth = getViewWidth();
  const viewHeight = getViewHeight();
  const colors = getSkyColors();
  const skyGradient = ctx.createLinearGradient(0, 0, 0, viewHeight);
  skyGradient.addColorStop(0, colors.top);
  skyGradient.addColorStop(1, colors.bottom);
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, viewWidth, viewHeight);

  const phase = getDayPhase();
  const sunTravel = ((performance.now() % SUN_TRAVEL_MS) / SUN_TRAVEL_MS) * (viewWidth + 200);
  const sunX = sunTravel - 100;
  const sunY = 110 - Math.sin(phase * Math.PI) * 60;
  const moonX = 120 + ((performance.now() % MOON_DRIFT_MS) / MOON_DRIFT_MS) * MOON_DRIFT_DISTANCE;
  const moonY = 92;

  if (phase > 0.72 || phase < 0.18) {
    ctx.fillStyle = "rgba(245,245,255,0.85)";
    ctx.beginPath();
    ctx.arc(moonX, moonY, 22, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = phase > 0.72 || phase < 0.18 ? "rgba(245,245,255,0.2)" : "rgba(255, 236, 160, 0.9)";
  ctx.beginPath();
  ctx.arc(sunX, sunY, 26, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
  ctx.fillRect(220, 80, 90, 18);
  ctx.fillRect(245, 64, 45, 16);
  ctx.fillRect(560, 115, 110, 18);
  ctx.fillRect(590, 99, 52, 16);

  ctx.fillStyle = "rgba(46, 83, 88, 0.22)";
  ctx.beginPath();
  ctx.moveTo(0, viewHeight);
  for (let x = 0; x <= viewWidth + 40; x += 40) {
    const ridge = viewHeight - 150 - Math.sin((x + worldTick * 0.2) / 110) * 18;
    ctx.lineTo(x, ridge);
  }
  ctx.lineTo(viewWidth, viewHeight);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(28, 58, 64, 0.34)";
  ctx.beginPath();
  ctx.moveTo(0, viewHeight);
  for (let x = 0; x <= viewWidth + 40; x += 32) {
    const ridge = viewHeight - 110 - Math.sin((x + worldTick * 0.35) / 78) * 14;
    ctx.lineTo(x, ridge);
  }
  ctx.lineTo(viewWidth, viewHeight);
  ctx.closePath();
  ctx.fill();

  if (colors.darkness > 0.06) {
    ctx.fillStyle = `rgba(8, 16, 34, ${colors.darkness})`;
    ctx.fillRect(0, 0, viewWidth, viewHeight);
  }

  if (isThunderStorm()) {
    ctx.fillStyle = "rgba(28, 38, 58, 0.28)";
    ctx.fillRect(0, 0, viewWidth, viewHeight);
  }

  if (thunderFlash > 0) {
    ctx.fillStyle = `rgba(245, 250, 255, ${Math.min(0.35, thunderFlash / 12)})`;
    ctx.fillRect(0, 0, viewWidth, viewHeight);
  }
}

function drawBlock(block, px, py) {
  if (block.solid) {
    ctx.fillStyle = "rgba(10, 18, 12, 0.28)";
    ctx.fillRect(px + 4, py + 4, TILE, TILE);
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.fillRect(px + 2, py + 1, TILE - 2, 3);
    ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
    ctx.fillRect(px + TILE - 4, py + 2, 4, TILE - 2);
    ctx.fillRect(px + 2, py + TILE - 4, TILE - 2, 4);
  }

  switch (block.draw) {
    case "grass":
      ctx.fillStyle = "#5a9e1f";
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = "#79d242";
      ctx.fillRect(px, py, TILE, 5);
      break;
    case "dirt":
      ctx.fillStyle = "#7b4e2a";
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = "#9b6b44";
      ctx.fillRect(px + 5, py + 6, 6, 4);
      ctx.fillRect(px + 12, py + 13, 4, 3);
      break;
    case "rock":
      ctx.fillStyle = "#7b8592";
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = "#a4adbb";
      ctx.fillRect(px + 4, py + 4, 6, 4);
      ctx.fillRect(px + 12, py + 10, 5, 4);
      break;
    case "wood":
      ctx.fillStyle = "#8b5a2b";
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = "#b5793e";
      ctx.fillRect(px + 9, py, 3, TILE);
      break;
    case "leaves":
      ctx.fillStyle = "rgba(72, 157, 74, 0.95)";
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = "rgba(119, 214, 112, 0.65)";
      ctx.fillRect(px + 4, py + 4, 7, 7);
      ctx.fillRect(px + 12, py + 9, 5, 5);
      break;
    case "water":
      ctx.fillStyle = "rgba(63, 166, 234, 0.72)";
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = "rgba(175, 236, 255, 0.45)";
      ctx.fillRect(px, py + 3, TILE, 3);
      break;
    case "lava":
      ctx.fillStyle = "rgba(255, 107, 44, 0.86)";
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = "rgba(255, 208, 92, 0.75)";
      ctx.fillRect(px, py + 4, TILE, 3);
      ctx.fillStyle = "rgba(255, 149, 34, 0.65)";
      ctx.fillRect(px + 5, py + 10, 7, 5);
      break;
    case "doorClosed":
      ctx.fillStyle = "#d8a15a";
      ctx.fillRect(px + 4, py, TILE - 8, TILE);
      ctx.fillStyle = "#8b5a2b";
      ctx.fillRect(px + 7, py + 4, TILE - 14, TILE - 8);
      ctx.fillStyle = "#f7d488";
      ctx.fillRect(px + TILE - 9, py + 12, 2, 2);
      break;
    case "doorOpen":
      ctx.fillStyle = "#c48c4a";
      ctx.fillRect(px + 2, py, 5, TILE);
      ctx.fillStyle = "#8b5a2b";
      ctx.fillRect(px + 3, py + 4, 3, TILE - 8);
      break;
    case "sand":
      ctx.fillStyle = "#dbc27a";
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = "#f2e0ac";
      ctx.fillRect(px + 5, py + 6, 5, 3);
      ctx.fillRect(px + 12, py + 12, 4, 3);
      break;
    case "coal":
      ctx.fillStyle = "#70757e";
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = "#1f2937";
      ctx.fillRect(px + 4, py + 5, 5, 5);
      ctx.fillRect(px + 12, py + 12, 4, 4);
      break;
    case "iron":
      ctx.fillStyle = "#7c848e";
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = "#d8b08c";
      ctx.fillRect(px + 4, py + 4, 5, 4);
      ctx.fillRect(px + 11, py + 11, 5, 4);
      break;
    case "planks":
      ctx.fillStyle = "#bf8a4b";
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = "#94642e";
      ctx.fillRect(px, py + 7, TILE, 2);
      ctx.fillRect(px, py + 15, TILE, 2);
      break;
    case "brick":
      ctx.fillStyle = "#8b95a3";
      ctx.fillRect(px, py, TILE, TILE);
      ctx.strokeStyle = "rgba(216, 223, 230, 0.55)";
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
      ctx.beginPath();
      ctx.moveTo(px, py + 8);
      ctx.lineTo(px + TILE, py + 8);
      ctx.moveTo(px, py + 16);
      ctx.lineTo(px + TILE, py + 16);
      ctx.stroke();
      break;
    case "glass":
      ctx.fillStyle = "rgba(167, 235, 255, 0.32)";
      ctx.fillRect(px, py, TILE, TILE);
      ctx.strokeStyle = "rgba(220, 248, 255, 0.82)";
      ctx.strokeRect(px + 1, py + 1, TILE - 2, TILE - 2);
      break;
    case "torch":
      ctx.fillStyle = "#6b4423";
      ctx.fillRect(px + 10, py + 8, 3, 12);
      ctx.fillStyle = "#ffd24d";
      ctx.fillRect(px + 8, py + 5, 7, 5);
      break;
    case "portal":
      ctx.fillStyle = "rgba(76, 22, 163, 0.55)";
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = "rgba(176, 109, 255, 0.82)";
      ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
      ctx.fillStyle = "rgba(234, 219, 255, 0.45)";
      ctx.fillRect(px + 6, py + 6, TILE - 12, 4);
      break;
    case "snow":
      ctx.fillStyle = "#eef8ff";
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = "#dceeff";
      ctx.fillRect(px, py + TILE - 6, TILE, 6);
      break;
    case "ice":
      ctx.fillStyle = "rgba(159, 231, 255, 0.85)";
      ctx.fillRect(px, py, TILE, TILE);
      ctx.strokeStyle = "rgba(225, 248, 255, 0.85)";
      ctx.strokeRect(px + 1, py + 1, TILE - 2, TILE - 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
      ctx.fillRect(px + 4, py + 4, TILE - 8, 4);
      break;
    case "bed":
      ctx.fillStyle = "#8b5a2b";
      ctx.fillRect(px + 3, py + 18, TILE - 6, 4);
      ctx.fillRect(px + 4, py + 4, 3, 15);
      ctx.fillRect(px + TILE - 7, py + 4, 3, 15);
      ctx.fillStyle = "#d46666";
      ctx.fillRect(px + 3, py + 6, TILE - 6, 10);
      ctx.fillStyle = "#f7d7d7";
      ctx.fillRect(px + 4, py + 3, TILE - 8, 5);
      break;
    default:
      ctx.fillStyle = block.color;
      ctx.fillRect(px, py, TILE, TILE);
  }
}

function drawWorld(cam) {
  drawSky();

  const startX = Math.floor(cam.x / TILE);
  const endX = Math.ceil((cam.x + getViewWidth()) / TILE);
  const startY = Math.floor(cam.y / TILE);
  const endY = Math.ceil((cam.y + getViewHeight()) / TILE);

  for (let wrap = -1; wrap <= 1; wrap++) {
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const id = getBlock(x, y);
        if (!id) continue;
        const block = BLOCK_DEFS[id];
        const px = x * TILE - cam.x + wrap * WORLD_WIDTH;
        const py = y * TILE - cam.y;
        if (px < -TILE * 2 || px > getViewWidth() + TILE * 2) continue;
        drawBlock(block, px, py);
      }
    }
  }
}

function drawHero(entity, cam, palette) {
  let px = entity.x - cam.x;
  if (px < -WORLD_WIDTH / 2) px += WORLD_WIDTH;
  if (px > WORLD_WIDTH / 2) px -= WORLD_WIDTH;
  const py = entity.y - cam.y;
  const facing = entity.facing >= 0 ? 1 : -1;
  const step = Math.sin(worldTick * 0.22 + entity.x * 0.08) * Math.min(1, Math.abs(entity.vx) / 2.6);
  const armSwing = step * 3.5;
  const legSwing = step * 3;
  const idleBob = Math.sin(worldTick * 0.12 + entity.x * 0.03) * (entity.onGround ? 0.6 : 0.2);
  const torsoTop = py + 17 + idleBob;
  const headTop = py + 4 + idleBob;
  const legTop = py + entity.height - 15;
  const leadArmX = facing === 1 ? 17 : 4;
  const trailArmX = facing === 1 ? 4 : 17;
  const noseX = facing === 1 ? 15 : 8;
  const mouthX = facing === 1 ? 12 : 10;

  ctx.fillStyle = "rgba(10, 18, 24, 0.28)";
  ctx.fillRect(px + 4, py + 4, entity.width, entity.height);

  ctx.fillStyle = palette.skin;
  ctx.fillRect(px + 8, headTop, 8, 11);
  ctx.fillRect(px + 7, headTop + 1, 10, 8);
  ctx.fillRect(px + 9, headTop + 11, 6, 1);
  ctx.fillStyle = palette.hair;
  ctx.fillRect(px + 7, headTop - 2, 10, 3);
  ctx.fillRect(px + 6, headTop + 1, 2, 4);
  ctx.fillRect(px + 16, headTop + 1, 2, 4);
  ctx.fillRect(px + (facing === 1 ? 7 : 15), headTop + 4, 2, 3);
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(px + 9, headTop + 4, 1, 2);
  ctx.fillRect(px + 14, headTop + 4, 1, 2);
  ctx.fillRect(px + noseX, headTop + 6, 1, 2);
  ctx.fillRect(px + mouthX, headTop + 8, 3, 1);

  ctx.fillStyle = palette.skinShadow;
  ctx.fillRect(px + 10, headTop + 10, 4, 1);
  ctx.fillRect(px + (facing === 1 ? 16 : 7), headTop + 6, 1, 2);

  ctx.fillStyle = palette.skin;
  ctx.fillRect(px + 10, torsoTop - 2, 4, 2);
  ctx.fillRect(px + 9, torsoTop, 6, 1);
  ctx.fillStyle = palette.body;
  ctx.fillRect(px + 7, torsoTop, 10, 12);
  ctx.fillRect(px + 6, torsoTop + 1, 12, 3);
  ctx.fillRect(px + 8, torsoTop - 1, 8, 2);
  ctx.fillStyle = palette.accent;
  ctx.fillRect(px + 11, torsoTop + 1, 2, 8);
  ctx.fillRect(px + 9, torsoTop + 3, 6, 1);

  ctx.fillStyle = palette.sleeve;
  ctx.fillRect(px + trailArmX, torsoTop + 2 + armSwing, 3, 6);
  ctx.fillRect(px + leadArmX, torsoTop + 2 - armSwing, 3, 6);
  ctx.fillStyle = palette.skin;
  ctx.fillRect(px + trailArmX, torsoTop + 8 + armSwing, 3, 4);
  ctx.fillRect(px + leadArmX, torsoTop + 8 - armSwing, 3, 4);
  ctx.fillStyle = palette.skinShadow;
  ctx.fillRect(px + trailArmX + 1, torsoTop + 11 + armSwing, 1, 1);
  ctx.fillRect(px + leadArmX + 1, torsoTop + 11 - armSwing, 1, 1);

  ctx.fillStyle = palette.body;
  ctx.fillRect(px + 8, torsoTop + 10, 3, 4);
  ctx.fillRect(px + 13, torsoTop + 10, 3, 4);
  ctx.fillStyle = palette.legs;
  ctx.fillRect(px + 8, legTop + legSwing, 3, 10);
  ctx.fillRect(px + 13, legTop - legSwing, 3, 10);
  ctx.fillStyle = palette.legShade;
  ctx.fillRect(px + 10, legTop + legSwing, 1, 10);
  ctx.fillRect(px + 15, legTop - legSwing, 1, 10);
  ctx.fillStyle = palette.boots;
  ctx.fillRect(px + 7, py + entity.height - 4 + legSwing, 5, 3);
  ctx.fillRect(px + 13, py + entity.height - 4 - legSwing, 5, 3);
}

function drawPlayer(cam) {
  const palettes = [
    { legs: "#2563eb", legShade: "#1d4ed8", body: "#22c55e", hair: "#2f241f", accent: "#f8fafc", sleeve: "#16a34a", boots: "#1e3a8a", skin: "#f2bf98", skinShadow: "#d59673" },
    { legs: "#7c3aed", legShade: "#6d28d9", body: "#f97316", hair: "#4b2d1f", accent: "#fde68a", sleeve: "#ea580c", boots: "#4c1d95", skin: "#d6a07a", skinShadow: "#a56d49" },
    { legs: "#e11d48", legShade: "#be123c", body: "#facc15", hair: "#1f2937", accent: "#ffffff", sleeve: "#f59e0b", boots: "#9f1239", skin: "#f0c7ab", skinShadow: "#ca9476" },
    { legs: "#0f766e", legShade: "#115e59", body: "#f43f5e", hair: "#7c2d12", accent: "#ffe4e6", sleeve: "#e11d48", boots: "#134e4a", skin: "#8f5a3a", skinShadow: "#6f4328" },
  ];

  getActivePlayers().forEach((activePlayer, index) => {
    drawHero(activePlayer, cam, palettes[index]);
  });

  networkRemotePlayers.forEach((remotePlayer, index) => {
    const palette = palettes[(index + 1) % palettes.length];
    drawHero(remotePlayer, cam, palette);
    let px = remotePlayer.x - cam.x;
    if (px < -WORLD_WIDTH / 2) px += WORLD_WIDTH;
    if (px > WORLD_WIDTH / 2) px -= WORLD_WIDTH;
    const py = remotePlayer.y - cam.y;
    ctx.fillStyle = "rgba(6, 12, 10, 0.72)";
    ctx.fillRect(px - 4, py - 18, 72, 16);
    ctx.fillStyle = "#eef6ea";
    ctx.font = "700 11px Trebuchet MS";
    ctx.fillText(remotePlayer.name || "Player", px, py - 6);
  });
}

function drawMonsters(cam) {
  monsters.forEach((monster) => {
    let px = monster.x - cam.x;
    if (px < -WORLD_WIDTH / 2) px += WORLD_WIDTH;
    if (px > WORLD_WIDTH / 2) px -= WORLD_WIDTH;
    const py = monster.y - cam.y;
    const burning = isEarlyMorning();

    ctx.fillStyle = "rgba(10, 18, 24, 0.24)";
    ctx.fillRect(px + 4, py + 4, monster.width, monster.height);
    if (burning) {
      ctx.fillStyle = "rgba(255, 153, 51, 0.75)";
      ctx.fillRect(px + 4, py - 6, TILE - 8, 8);
    }

    if (monster.type === "dragon") {
      ctx.fillStyle = "#8b2d2d";
      ctx.fillRect(px + 6, py + 10, TILE + 10, TILE);
      ctx.fillStyle = "#c54646";
      ctx.fillRect(px + 2, py + 14, 12, 8);
      ctx.fillRect(px + TILE + 4, py + 6, 10, 10);
      ctx.fillStyle = "#5a1c1c";
      ctx.fillRect(px + 10, py + 4, 8, 6);
      ctx.fillRect(px + 10, py + TILE + 6, 4, 10);
      ctx.fillRect(px + TILE, py + TILE + 6, 4, 10);
      return;
    }

    if (monster.type === "ghost") {
      ctx.fillStyle = "rgba(220, 232, 255, 0.8)";
      ctx.fillRect(px + 4, py + 6, TILE - 8, TILE);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(px + 8, py + 11, 2, 2);
      ctx.fillRect(px + 14, py + 11, 2, 2);
      return;
    }

    if (monster.type === "creeper") {
      ctx.fillStyle = "#4d9c49";
      ctx.fillRect(px + 5, py + 8, TILE - 10, TILE);
      ctx.fillStyle = "#7fd46d";
      ctx.fillRect(px + 7, py + 2, TILE - 14, 10);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(px + 8, py + 5, 2, 3);
      ctx.fillRect(px + 14, py + 5, 2, 3);
      ctx.fillRect(px + 10, py + 9, 4, 5);
      ctx.fillRect(px + 7, py + monster.height - 12, 3, 12);
      ctx.fillRect(px + 14, py + monster.height - 12, 3, 12);
      return;
    }

    if (monster.type === "enderman") {
      ctx.fillStyle = "#22142f";
      ctx.fillRect(px + 7, py + 8, TILE - 14, monster.height - 8);
      ctx.fillStyle = "#17101f";
      ctx.fillRect(px + 8, py + 2, TILE - 16, 10);
      ctx.fillStyle = "#d78cff";
      ctx.fillRect(px + 8, py + 6, 3, 2);
      ctx.fillRect(px + 13, py + 6, 3, 2);
      return;
    }

    ctx.fillStyle = monster.type === "drowned" ? "#3b7f84" : monster.type === "skeleton" ? "#d9dee3" : monster.type === "orc" ? "#4d7a37" : "#5b7459";
    ctx.fillRect(px + 2, py + 12, TILE - 4, TILE + 10);
    ctx.fillStyle = monster.type === "drowned" ? "#6eaeb2" : monster.type === "skeleton" ? "#eef2f5" : "#a8c49b";
    ctx.fillRect(px + 4, py + 2, TILE - 8, 14);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(px + 7, py + 7, 2, 2);
    ctx.fillRect(px + 15, py + 7, 2, 2);
    ctx.fillRect(px + 7, py + monster.height - 14, 4, 14);
    ctx.fillRect(px + 13, py + monster.height - 14, 4, 14);
  });
}

function drawVillagers(cam) {
  if (currentDimension === "nether") return;
  villagers.forEach((villager) => {
    let px = villager.x - cam.x;
    if (px < -WORLD_WIDTH / 2) px += WORLD_WIDTH;
    if (px > WORLD_WIDTH / 2) px -= WORLD_WIDTH;
    const py = villager.y - cam.y;

    ctx.fillStyle = "rgba(10, 18, 24, 0.2)";
    ctx.fillRect(px + 4, py + 4, villager.width, villager.height);
    ctx.fillStyle = "#6d4725";
    ctx.fillRect(px + 4, py + villager.height - 14, 6, 14);
    ctx.fillRect(px + 14, py + villager.height - 14, 6, 14);
    ctx.fillStyle = "#8b5a2b";
    ctx.fillRect(px + 3, py + 15, 18, 17);
    ctx.fillStyle = "#d7a881";
    ctx.fillRect(px, py + 17, 3, 11);
    ctx.fillRect(px + 21, py + 17, 3, 11);
    ctx.fillRect(px + 5, py + 2, 14, 12);
    ctx.fillStyle = "#c18b61";
    ctx.fillRect(px + 10, py + 8, 7, 3);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(px + 8, py + 6, 2, 2);
    ctx.fillRect(px + 14, py + 6, 2, 2);
  });
}

function drawAnimals(cam) {
  if (currentDimension === "nether") return;
  animals.forEach((animal) => {
    let px = animal.x - cam.x;
    if (px < -WORLD_WIDTH / 2) px += WORLD_WIDTH;
    if (px > WORLD_WIDTH / 2) px -= WORLD_WIDTH;
    const py = animal.y - cam.y;

    ctx.fillStyle = animal.type === "pig" ? "#f7a6b7" : "#f2f4f5";
    ctx.fillRect(px + 2, py + 6, TILE - 4, TILE - 8);
    ctx.fillStyle = "#6b4f36";
    ctx.fillRect(px + 5, py + TILE - 6, 3, 6);
    ctx.fillRect(px + 15, py + TILE - 6, 3, 6);

    if (animal.leadTarget) {
      ctx.strokeStyle = "#b38b5d";
      ctx.beginPath();
      ctx.moveTo(px + TILE / 2, py + TILE / 2);
      ctx.lineTo(px + TILE / 2 + animal.vx * 8, py + TILE / 2 - 8);
      ctx.stroke();
    }
  });
}

function drawSeaAnimals(cam) {
  if (currentDimension === "nether") return;
  seaAnimals.forEach((animal) => {
    let px = animal.x - cam.x;
    if (px < -WORLD_WIDTH / 2) px += WORLD_WIDTH;
    if (px > WORLD_WIDTH / 2) px -= WORLD_WIDTH;
    const py = animal.y - cam.y;

    ctx.fillStyle = animal.type === "jelly" ? "rgba(196, 155, 255, 0.75)" : "#ffb84d";
    ctx.fillRect(px + 3, py + 6, TILE - 8, TILE - 12);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(px + 6, py + 8, 6, 3);
  });
}

function drawCursor(cam) {
  if (!cursorTile) return;
  const px = cursorTile.x * TILE - cam.x;
  const py = cursorTile.y * TILE - cam.y;
  ctx.strokeStyle = "#f8fafc";
  ctx.lineWidth = 2;
  ctx.strokeRect(px + 1, py + 1, TILE - 2, TILE - 2);
  ctx.beginPath();
  ctx.moveTo(px + TILE / 2, py + 5);
  ctx.lineTo(px + TILE / 2, py + TILE - 5);
  ctx.moveTo(px + 5, py + TILE / 2);
  ctx.lineTo(px + TILE - 5, py + TILE / 2);
  ctx.stroke();
}

function updateRain() {
  if (thunderFlash > 0) {
    thunderFlash -= 1;
  }

  if (isThunderStorm() && worldTick % 90 === 0) {
    thunderFlash = 10;
    playSound("thunder");
  }

  if (!isRaining()) return;
  rainDrops.forEach((drop) => {
    drop.y += drop.speed;
    drop.x -= 0.7;
    if (drop.y > canvas.height || drop.x < -20) {
      drop.x = Math.random() * (canvas.width + 80);
      drop.y = -Math.random() * 80;
    }
  });
}

function drawRain() {
  if (!isRaining()) return;
  const viewWidth = getViewWidth();
  const viewHeight = getViewHeight();
  ctx.strokeStyle = isThunderStorm() ? "rgba(205, 233, 255, 0.8)" : "rgba(193, 233, 255, 0.58)";
  ctx.lineWidth = isThunderStorm() ? 2 : 1.5;
  ctx.beginPath();
  rainDrops.forEach((drop) => {
    const rx = drop.x % (viewWidth + 40);
    const ry = drop.y % (viewHeight + 60);
    ctx.moveTo(rx, ry);
    ctx.lineTo(rx - 4, ry + drop.length);
  });
  ctx.stroke();
}

function renderToolbar() {
  toolbar.innerHTML = "";
  const creative = gameMode === "creative";
  ITEM_DEFS.forEach((item, index) => {
    const slot = document.createElement("button");
    slot.className = `slot${item.id === selectedBlock ? " active" : ""}`;
    slot.type = "button";
    slot.title = `${index + 1}: ${item.name}`;
    slot.innerHTML = `
      <span class="slot-swatch" style="background:${item.color}"></span>
      <strong class="slot-label">${item.name}</strong>
      <span class="slot-count">${creative ? "Inf" : `${inventory[item.id]} owned`}</span>
    `;
    slot.addEventListener("click", () => {
      selectedBlock = item.id;
      renderToolbar();
    });
    toolbar.appendChild(slot);
  });
}

function renderInventory() {
  const creative = gameMode === "creative";
  inventoryRoot.innerHTML = ITEM_DEFS.map((item) => {
    return `
      <div class="inventory-row">
        <span class="inventory-name">
          <span class="inventory-swatch" style="background:${item.color}"></span>
          ${item.name}
        </span>
        <strong>${creative ? "Inf" : inventory[item.id]}</strong>
      </div>
    `;
  }).join("");
}

function formatNeeds(needs) {
  return Object.entries(needs)
    .map(([itemId, amount]) => `${amount} ${itemLookup[Number(itemId)].name}`)
    .join(", ");
}

function renderCrafting() {
  craftingRoot.innerHTML = "";
  RECIPES.forEach((recipe) => {
    const button = document.createElement("button");
    button.className = "craft-button";
    button.type = "button";
    button.innerHTML = `
      <span class="recipe-name">Craft ${recipe.name}</span>
      <span class="recipe-cost">Needs: ${formatNeeds(recipe.needs)}</span>
    `;
    button.addEventListener("click", () => craftRecipe(recipe.id));
    craftingRoot.appendChild(button);
  });
}

function updateStatus(message) {
  craftStatus.textContent = message;
}

function updateFoodStatus(message) {
  if (foodStatus) {
    foodStatus.textContent = message;
  }
}

function updateWaterStatus(message) {
  if (waterStatus) {
    waterStatus.textContent = message;
  }
}

function renderStations() {
  if (drowningStatus) {
    drowningStatus.innerHTML = getActivePlayers()
      .map((activePlayer, index) => {
        const state = activePlayer.air <= 2 ? "Drowning" : activePlayer.air < activePlayer.maxAir ? "Swimming" : "Safe";
        return `
          <div>
            <p class="mini-label">P${index + 1} Air</p>
            <strong>${activePlayer.air}/${activePlayer.maxAir} - ${state}</strong>
          </div>
        `;
      })
      .join("");
  }

  updateFoodStatus("Eat Meat heals 1 heart for the first hurt active player.");
  updateWaterStatus("Drink Water uses 1 Water and refills air for active players.");
}

function eatMeat() {
  if (gameMode === "creative") {
    updateFoodStatus("Creative mode does not need food.");
    return;
  }
  if (inventory[23] <= 0) {
    updateFoodStatus("You need Meat in your inventory.");
    return;
  }

  const target = getActivePlayers().find((activePlayer) => activePlayer.health < activePlayer.maxHealth);
  if (!target) {
    updateFoodStatus("Everyone already has full hearts.");
    return;
  }

  inventory[23] -= 1;
  target.health = Math.min(target.maxHealth, target.health + 1);
  target.lastRegenAt = performance.now();
  renderToolbar();
  renderInventory();
  renderHearts();
  playSound("heal");
  updateFoodStatus("A player ate Meat and recovered 1 heart.");
}

function drinkWater() {
  if (gameMode === "creative") {
    updateWaterStatus("Creative mode does not need water.");
    return;
  }
  if (inventory[6] <= 0) {
    updateWaterStatus("You need Water in your inventory.");
    return;
  }

  inventory[6] -= 1;
  const now = performance.now();
  getActivePlayers().forEach((activePlayer) => {
    activePlayer.air = activePlayer.maxAir;
    activePlayer.lastAirTick = now;
  });
  renderToolbar();
  renderInventory();
  updateWaterStatus("Water restored air for the active players.");
}

function collectBlock(id) {
  const block = BLOCK_DEFS[id];
  if (!block?.itemId || inventory[block.itemId] === undefined) return;
  inventory[block.itemId] += 1;
}

function getMonsterAtTile(x, y) {
  return monsters.find((monster) => {
    const left = Math.floor(monster.x / TILE);
    const right = Math.floor((monster.x + monster.width - 1) / TILE);
    const top = Math.floor(monster.y / TILE);
    const bottom = Math.floor((monster.y + monster.height - 1) / TILE);
    return x >= left && x <= right && y >= top && y <= bottom;
  });
}

function getVillagerAtTile(x, y) {
  return villagers.find((villager) => {
    const left = Math.floor(villager.x / TILE);
    const right = Math.floor((villager.x + villager.width - 1) / TILE);
    const top = Math.floor(villager.y / TILE);
    const bottom = Math.floor((villager.y + villager.height - 1) / TILE);
    return x >= left && x <= right && y >= top && y <= bottom;
  });
}

function getAnimalAtTile(x, y) {
  return animals.find((animal) => {
    const left = Math.floor(animal.x / TILE);
    const right = Math.floor((animal.x + animal.width - 1) / TILE);
    const top = Math.floor(animal.y / TILE);
    const bottom = Math.floor((animal.y + animal.height - 1) / TILE);
    return x >= left && x <= right && y >= top && y <= bottom;
  });
}

function getSeaAnimalAtTile(x, y) {
  return seaAnimals.find((animal) => {
    const left = Math.floor(animal.x / TILE);
    const right = Math.floor((animal.x + animal.width - 1) / TILE);
    const top = Math.floor(animal.y / TILE);
    const bottom = Math.floor((animal.y + animal.height - 1) / TILE);
    return x >= left && x <= right && y >= top && y <= bottom;
  });
}

function getPlayerAtTile(x, y) {
  return getActivePlayers().find((activePlayer) => {
    const left = Math.floor(activePlayer.x / TILE);
    const right = Math.floor((activePlayer.x + activePlayer.width - 1) / TILE);
    const top = Math.floor(activePlayer.y / TILE);
    const bottom = Math.floor((activePlayer.y + activePlayer.height - 1) / TILE);
    return x >= left && x <= right && y >= top && y <= bottom;
  });
}

function getLeashableAtTile(x, y) {
  return (
    getAnimalAtTile(x, y) ||
    getSeaAnimalAtTile(x, y) ||
    getVillagerAtTile(x, y) ||
    getPlayerAtTile(x, y)
  );
}

function collectEntityDrop(itemId, amount = 1) {
  if (inventory[itemId] === undefined) return;
  inventory[itemId] += amount;
  renderToolbar();
  renderInventory();
}

function hitMonster(x, y) {
  const monster = getMonsterAtTile(x, y);
  if (!monster) return false;

  monster.health -= 1;
  playSound("hit");
  if (monster.health <= 0) {
    monsters.splice(monsters.indexOf(monster), 1);
    if (monster.type === "enderman") {
      collectEntityDrop(24, 1);
      updateStatus("Enderman defeated. You got 1 Ender Pearl.");
    } else {
      collectEntityDrop(23, monster.type === "dragon" ? 3 : 1);
      updateStatus(`Monster defeated. You got ${monster.type === "dragon" ? "3 Meat" : "1 Meat"}.`);
    }
  } else {
    updateStatus(`Monster hit. ${monster.health} hits left.`);
  }
  return true;
}

function mineVillager(x, y) {
  const villager = getVillagerAtTile(x, y);
  if (!villager) return false;
  villagers.splice(villagers.indexOf(villager), 1);
  collectEntityDrop(23, 1);
  updateStatus("You mined a villager and got 1 Meat.");
  return true;
}

function mineAnimal(x, y) {
  const animal = getAnimalAtTile(x, y) || getSeaAnimalAtTile(x, y);
  if (!animal) return false;

  const fromSea = seaAnimals.includes(animal);
  if (fromSea) {
    seaAnimals.splice(seaAnimals.indexOf(animal), 1);
    collectEntityDrop(23, 1);
    updateStatus("You mined a sea animal and got 1 Meat.");
  } else {
    animals.splice(animals.indexOf(animal), 1);
    collectEntityDrop(23, animal.type === "cow" ? 2 : 1);
    updateStatus(`You mined an animal and got ${animal.type === "cow" ? "2 Meat" : "1 Meat"}.`);
  }
  playSound("mine");
  return true;
}

function useLeadAt(x, y) {
  if (selectedBlock !== 22) return false;
  const target = getLeashableAtTile(x, y);
  if (!target) return false;
  if (target === player) return false;

  if (target.leadTarget || target.leadHolder) {
    target.leadTarget = null;
    target.leadHolder = null;
    updateStatus("Lead removed.");
  } else {
    target.leadTarget = player;
    target.leadHolder = player;
    updateStatus("Lead attached.");
  }
  playSound("place");
  return true;
}

function getReachTile(entity) {
  return {
    x: Math.floor((entity.x + entity.width / 2) / TILE) + entity.facing,
    y: Math.floor((entity.y + entity.height / 2) / TILE),
  };
}

function breakBlock(x, y) {
  const id = getBlock(x, y);
  if (!id) return;
  const clearedTiles = [];
  if (id === 7 || id === 8 || id === 17 || id === 20) {
    if (getBlock(x, y - 1) === id) {
      setBlock(x, y - 1, 0);
      clearedTiles.push({ x, y: y - 1 });
    }
    if (getBlock(x, y + 1) === id) {
      setBlock(x, y + 1, 0);
      clearedTiles.push({ x, y: y + 1 });
    }
  }
  setBlock(x, y, 0);
  clearedTiles.push({ x, y });
  if (gameMode === "survival") {
    collectBlock(id);
  }
  playSound("mine");
  renderToolbar();
  renderInventory();
  updateStatus(`Collected 1 ${BLOCK_DEFS[id].name}.`);
  clearedTiles.forEach((tile) => {
    sendWorldAction({ type: "setBlock", dimension: currentDimension, x: tile.x, y: tile.y, id: 0 });
  });
}

function toggleDoor(x, y) {
  const id = getBlock(x, y);
  if (id === 7) {
    setBlock(x, y, 8);
    if (getBlock(x, y - 1) === 7) setBlock(x, y - 1, 8);
    if (getBlock(x, y + 1) === 7) setBlock(x, y + 1, 8);
    updateStatus("Door opened.");
    return true;
  }
  if (id === 8) {
    setBlock(x, y, 7);
    if (getBlock(x, y - 1) === 8) setBlock(x, y - 1, 7);
    if (getBlock(x, y + 1) === 8) setBlock(x, y + 1, 7);
    updateStatus("Door closed.");
    return true;
  }
  return false;
}

function trySleepAt(x, y) {
  if (getBlock(x, y) !== 20) return false;
  if (!canSleepNow()) {
    updateStatus("Beds work only at night or during thunder storms.");
    return true;
  }

  skipSleepTime();
  renderHearts();
  refreshWorldStatus();
  return true;
}

function placeBlock(x, y) {
  if (toggleDoor(x, y)) return;
  if (trySleepAt(x, y)) return;
  if (getBlock(x, y) !== 0) return;
  if (!itemLookup[selectedBlock].placeId) {
    updateStatus(`${itemLookup[selectedBlock].name} is a tool item, not a place block.`);
    return;
  }
  if (gameMode === "survival" && inventory[selectedBlock] <= 0) {
    updateStatus(`You need ${itemLookup[selectedBlock].name} in your inventory.`);
    return;
  }

  const overlapsPlayer = getActivePlayers().some((activePlayer) => {
    const playerTileLeft = Math.floor(activePlayer.x / TILE);
    const playerTileRight = Math.floor((activePlayer.x + activePlayer.width - 1) / TILE);
    const playerTileTop = Math.floor(activePlayer.y / TILE);
    const playerTileBottom = Math.floor((activePlayer.y + activePlayer.height - 1) / TILE);
    return x >= playerTileLeft && x <= playerTileRight && y >= playerTileTop && y <= playerTileBottom;
  });

  if (overlapsPlayer) {
    updateStatus("Move your character before placing a block there.");
    return;
  }

  const placeId = itemLookup[selectedBlock].placeId;
  if ((selectedBlock === 7 || selectedBlock === 17 || selectedBlock === 25) && getBlock(x, y - 1) !== 0) {
    updateStatus("Need 2 blocks of height for that.");
    return;
  }

  setBlock(x, y, placeId);
  if (selectedBlock === 7 || selectedBlock === 17 || selectedBlock === 25) {
    setBlock(x, y - 1, placeId);
  }
  if (gameMode === "survival") {
    inventory[selectedBlock] -= 1;
    if (selectedBlock === 21) {
      inventory[20] += 1;
    }
  }
  playSound("place");
  renderToolbar();
  renderInventory();
  updateStatus(`Placed 1 ${itemLookup[selectedBlock].name}.`);
  sendWorldAction({ type: "setBlock", dimension: currentDimension, x, y, id: placeId });
  if (selectedBlock === 7 || selectedBlock === 17 || selectedBlock === 25) {
    sendWorldAction({ type: "setBlock", dimension: currentDimension, x, y: y - 1, id: placeId });
  }
}

function craftRecipe(recipeId) {
  const recipe = RECIPES.find((entry) => entry.id === recipeId);
  if (!recipe) return;

  if (gameMode === "creative") {
    Object.entries(recipe.makes).forEach(([itemId, amount]) => {
      inventory[itemId] += amount;
    });
    renderToolbar();
    renderInventory();
    updateStatus(`Creative crafted ${recipe.name} for free.`);
    return;
  }

  const canCraft = Object.entries(recipe.needs).every(([itemId, amount]) => inventory[itemId] >= amount);
  if (!canCraft) {
    updateStatus(`Need: ${formatNeeds(recipe.needs)}.`);
    return;
  }

  Object.entries(recipe.needs).forEach(([itemId, amount]) => {
    inventory[itemId] -= amount;
  });
  Object.entries(recipe.makes).forEach(([itemId, amount]) => {
    inventory[itemId] += amount;
  });

  renderToolbar();
  renderInventory();
  playSound("craft");
  updateStatus(
    `Crafted ${Object.entries(recipe.makes)
      .map(([itemId, amount]) => `${amount} ${itemLookup[itemId].name}`)
      .join(", ")}.`
  );
}

window.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(event.code)) {
    event.preventDefault();
  }

  if (event.code === "Space" && !event.repeat && gameMode === "creative") {
    if (performance.now() - lastSpaceTap < 280) {
      player.isFlying = !player.isFlying;
      player.vy = 0;
      player.onGround = false;
      updateStatus(player.isFlying ? "Creative flight on." : "Creative flight off.");
    }
    lastSpaceTap = performance.now();
  }

  const digitMatch = event.code.match(/^Digit(\d+)$/);
  if (digitMatch) {
    const index = Number(digitMatch[1]) - 1;
    const item = ITEM_DEFS[index];
    if (item) {
      selectedBlock = item.id;
      renderToolbar();
    }
  }

  if (event.code === "KeyF") {
    const target = getReachTile(playerTwo);
    if (!hitMonster(target.x, target.y) && !mineVillager(target.x, target.y)) {
      breakBlock(target.x, target.y);
    }
  }

  if (event.code === "KeyG") {
    const target = getReachTile(playerTwo);
    placeBlock(target.x, target.y);
  }

  if (event.code === "KeyU") {
    const target = getReachTile(playerThree);
    if (!hitMonster(target.x, target.y) && !mineVillager(target.x, target.y)) {
      breakBlock(target.x, target.y);
    }
  }

  if (event.code === "KeyO") {
    const target = getReachTile(playerThree);
    placeBlock(target.x, target.y);
  }

  if (event.code === "Numpad7") {
    const target = getReachTile(playerFour);
    if (!hitMonster(target.x, target.y) && !mineVillager(target.x, target.y)) {
      breakBlock(target.x, target.y);
    }
  }

  if (event.code === "Numpad9") {
    const target = getReachTile(playerFour);
    placeBlock(target.x, target.y);
  }

  keys.add(event.code);
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

canvas.addEventListener("mousemove", (event) => {
  const rect = canvas.getBoundingClientRect();
  const firstViewport = getViewports()[0];
  const localX = ((event.clientX - rect.left) * canvas.width) / rect.width;
  const localY = ((event.clientY - rect.top) * canvas.height) / rect.height;

  if (
    localX < firstViewport.x ||
    localX > firstViewport.x + firstViewport.width ||
    localY < firstViewport.y ||
    localY > firstViewport.y + firstViewport.height
  ) {
    cursorTile = null;
    return;
  }

  currentViewport = firstViewport;
  const cam = getCameraFor(player);
  const x = Math.floor((localX - firstViewport.x + cam.x) / TILE);
  const y = Math.floor((localY - firstViewport.y + cam.y) / TILE);
  currentViewport = null;
  cursorTile = { x, y };
});

canvas.addEventListener("mousedown", (event) => {
  if (!cursorTile) return;
  const { x, y } = cursorTile;
  if (y < 0 || y >= ROWS) return;

  if (event.button === 0) {
    if (hitMonster(x, y) || mineVillager(x, y) || mineAnimal(x, y)) return;
    breakBlock(x, y);
  } else if (event.button === 2) {
    if (useLeadAt(x, y)) return;
    placeBlock(x, y);
  }
});

canvas.addEventListener("contextmenu", (event) => event.preventDefault());
canvas.addEventListener("click", () => {
  ensureAudio();
  canvas.focus();
});

function renderViewport(activePlayer, viewport, index) {
  currentViewport = viewport;
  const cam = getCameraFor(activePlayer);

  ctx.save();
  ctx.beginPath();
  ctx.rect(viewport.x, viewport.y, viewport.width, viewport.height);
  ctx.clip();
  ctx.translate(viewport.x, viewport.y);

  drawWorld(cam);
  drawMonsters(cam);
  drawVillagers(cam);
  drawAnimals(cam);
  drawSeaAnimals(cam);
  drawPlayer(cam);
  if (index === 0) {
    drawCursor(cam);
  }
  drawRain();

  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, viewport.width - 2, viewport.height - 2);
  ctx.fillStyle = "rgba(6, 12, 10, 0.62)";
  ctx.fillRect(10, 10, 92, 24);
  ctx.fillStyle = "#eef6ea";
  ctx.font = "700 13px Trebuchet MS";
  ctx.fillText(`Player ${index + 1}`, 18, 27);

  ctx.restore();
  currentViewport = null;
}

function renderFrame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const activePlayers = getActivePlayers();
  const viewports = getViewports();
  activePlayers.forEach((activePlayer, index) => {
    renderViewport(activePlayer, viewports[index], index);
  });
}

function loop() {
  if (gamePaused) {
    animationFrameId = null;
    renderGameRunState();
    renderFrame();
    return;
  }

  worldTick += 1;
  updatePlayer();
  updateMonsters();
  updateVillagers();
  updateAnimals();
  updateSeaAnimals();
  updateDrowning();
  updateHealing();
  updateRain();
  flowLiquids();
  refreshWorldStatus();
  renderFrame();
  animationFrameId = requestAnimationFrame(loop);
}

function renderHearts() {
  if (!heartsRoot) return;

  if (gameMode === "creative") {
    heartsRoot.innerHTML = `
      <span class="heart">&infin;</span>
      <span class="heart-label">Creative mode</span>
    `;
    return;
  }

  const fullHeart = String.fromCharCode(9829);
  const halfHeart = "&#189;";
  const emptyHeart = String.fromCharCode(9825);
  let markup = "";

  getActivePlayers().forEach((activePlayer, index) => {
    markup += `<span class="heart-label">P${index + 1}</span>`;
    for (let i = 0; i < activePlayer.maxHealth; i++) {
      const heartLevel = activePlayer.health - i;
      let heart = emptyHeart;
      let stateClass = " empty";

      if (heartLevel >= 1) {
        heart = fullHeart;
        stateClass = "";
      } else if (heartLevel >= 0.5) {
        heart = halfHeart;
        stateClass = " half";
      }

      markup += `<span class="heart${stateClass}" aria-hidden="true">${heart}</span>`;
    }
    markup += `<span class="heart-label">${activePlayer.health}/${activePlayer.maxHealth}</span>`;
  });

  heartsRoot.innerHTML = markup;
}

renderToolbar();
renderInventory();
renderCrafting();
showTab(initialTab);
renderMode();
renderPlayerCount();
renderMuteButton();
renderFullscreenButton();
renderGameRunState();
renderHearts();
refreshWorldStatus();
renderFrame();
