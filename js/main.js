import { Snake } from "./snake.js";
import { Food } from "./food.js";
import { mpapi } from "./mpapi.js";
import { Scoreboard } from "./scoreboard.js";

/* ===============================
   MULTIPLAYER API
================================ */
const api = new mpapi("wss://mpapi.se/net", "hungrig-orm");

let isMultiplayer = false;
let isHost = false;
let myId = null;
let gameStarted = false;

/* ===============================
   CANVAS
================================ */
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const CELL = 20;
const TICK_RATE = 120;

canvas.width = CELL * 40;
canvas.height = CELL * 25;

/* ===============================
   UI
================================ */
const uiOverlay = document.getElementById("uiOverlay");
const startScreen = document.getElementById("startScreen");
const gameOverScreen = document.getElementById("gameOverScreen");

const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const hostBtn = document.getElementById("hostBtn");
const joinBtn = document.getElementById("joinBtn");
const joinCodeInput = document.getElementById("joinCodeInput");

/* ===============================
   SCOREBOARD
================================ */
const scoreboard = new Scoreboard(
  document.getElementById("scoreboard")
);

/* ===============================
   GAME STATE
================================ */
let snakes = {};     // id -> Snake
let food = null;
let inputs = {};    // clientId -> direction
let lastTick = 0;

/* ===============================
   SINGLEPLAYER
================================ */
function startSingleplayer() {
  resetMultiplayer();

  isMultiplayer = false;
  isHost = false;
  myId = "local";
  gameStarted = true;

  snakes = {};
  scoreboard.reset();

  snakes[myId] = new Snake(canvas);
  food = new Food(canvas, snakes[myId]);

  scoreboard.ensurePlayer(myId);
  scoreboard.render(myId);

  hideUI();
  lastTick = 0;
  requestAnimationFrame(gameLoop);
}

/* ===============================
   HOST MULTIPLAYER
================================ */
async function startHost() {
  try {
    resetMultiplayer();

    isMultiplayer = true;
    isHost = true;
    gameStarted = false;

    const { session, clientId } = await api.host();
    myId = clientId;

    alert("Session ID: " + session);

    snakes = {};
    inputs = {};
    scoreboard.reset();

    snakes[myId] = new Snake(canvas);
    food = new Food(canvas, snakes[myId]);

    scoreboard.ensurePlayer(myId);
    scoreboard.render(myId);

    listenMultiplayer();
    hideUI();

  } catch (e) {
    alert("Kunde inte hosta: " + e);
  }
}

/* ===============================
   JOIN MULTIPLAYER
================================ */
async function joinMultiplayer() {
  const code = joinCodeInput.value.trim();
  if (!code) return alert("Skriv in sessionkod");

  try {
    resetMultiplayer();

    isMultiplayer = true;
    isHost = false;
    gameStarted = false;

    const res = await api.join(code);
    myId = res.clientId;

    listenMultiplayer();
    hideUI();

  } catch (e) {
    alert("Kunde inte ansluta: " + e);
  }
}

/* ===============================
   RESET MULTIPLAYER
================================ */
function resetMultiplayer() {
  try {
    api.leave();
  } catch {}

  isMultiplayer = false;
  isHost = false;
  gameStarted = false;
  snakes = {};
  inputs = {};
  food = null;
  scoreboard.reset();
}

/* ===============================
   MULTIPLAYER LISTENER
================================ */
function listenMultiplayer() {
  api.listen((event, _, clientId, data) => {

    /* ===== HOST: ny spelare ===== */
    if (isHost && event === "joined") {
      if (!snakes[clientId]) {
        snakes[clientId] = new Snake(canvas);
        scoreboard.ensurePlayer(clientId);
        scoreboard.render(myId);

        // starta spelet när minst 2 spelare
        if (Object.keys(snakes).length >= 2 && !gameStarted) {
          gameStarted = true;
          lastTick = 0;
          requestAnimationFrame(gameLoop);
        }
      }
    }

    /* ===== HOST: ta emot input ===== */
    if (isHost && event === "game" && data.input) {
      inputs[clientId] = data.input;
    }

    /* ===== CLIENT: ta emot state ===== */
    if (!isHost && event === "game" && data.type === "state") {

      snakes = {};
      Object.entries(data.snakes).forEach(([id, s]) => {
        const snake = new Snake(canvas);
        snake.body = s.body;
        snake.direction = s.direction;
        snakes[id] = snake;
      });

      if (!food && snakes[myId]) {
        food = new Food(canvas, snakes[myId]);
      }
      food.position = data.food;

      scoreboard.scores = data.scores || {};
      scoreboard.render(myId);

      if (!gameStarted) {
        gameStarted = true;
        lastTick = 0;
        requestAnimationFrame(gameLoop);
      }
    }
  });
}

/* ===============================
   GAME LOOP
================================ */
function gameLoop(ts) {
  if (!gameStarted) return;

  if (ts - lastTick > TICK_RATE) {
    updateGame();
    lastTick = ts;
  }

  renderGame();
  requestAnimationFrame(gameLoop);
}

/* ===============================
   UPDATE (HOST ONLY)
================================ */
function updateGame() {
  if (!isHost || !food) return;

  for (const id in snakes) {
    const s = snakes[id];
    if (inputs[id]) s.direction = inputs[id];
    s.update();

    if (
      s.head.x === food.position.x &&
      s.head.y === food.position.y
    ) {
      s.grow();
      food.respawn(s);
      scoreboard.addPoint(id);
    }
  }

  api.transmit({
    type: "state",
    snakes: Object.fromEntries(
      Object.entries(snakes).map(([id, s]) => [
        id,
        { body: s.body, direction: s.direction }
      ])
    ),
    food: food.position,
    scores: scoreboard.scores
  });
}

/* ===============================
   RENDER
================================ */
function renderGame() {
  drawGrid();

  if (food) food.draw(ctx);

  for (const id in snakes) {
    drawSnakeWithColor(snakes[id], id);
  }
}

/* ===============================
   DRAW SNAKE WITH COLOR
================================ */
function drawSnakeWithColor(snake, id) {
  ctx.save();
  const hue = scoreboard._hueFromId(id);
  ctx.filter = `hue-rotate(${hue}deg)`;
  snake.draw(ctx);
  ctx.restore();
}

/* ===============================
   GRID
================================ */
function drawGrid() {
  for (let x = 0; x < canvas.width / CELL; x++) {
    for (let y = 0; y < canvas.height / CELL; y++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? "#141a21" : "#10151b";
      ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    }
  }
}

/* ===============================
   INPUT (CLIENT)
================================ */
document.addEventListener("keydown", (e) => {
  if (!isMultiplayer || isHost) return;

  const dir =
    e.key === "ArrowUp" ? { x: 0, y: -1 } :
    e.key === "ArrowDown" ? { x: 0, y: 1 } :
    e.key === "ArrowLeft" ? { x: -1, y: 0 } :
    e.key === "ArrowRight" ? { x: 1, y: 0 } :
    null;

  if (dir) api.transmit({ input: dir });
});

/* ===============================
   MOBILE: STOP SCROLL
================================ */
canvas.addEventListener("touchmove", e => e.preventDefault(), { passive: false });

/* ===============================
   UI
================================ */
function hideUI() {
  uiOverlay.classList.add("hidden");
  startScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");
}

startBtn.onclick = startSingleplayer;
restartBtn.onclick = startSingleplayer;
hostBtn.onclick = startHost;
joinBtn.onclick = joinMultiplayer;
