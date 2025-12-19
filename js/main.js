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

/* ===============================
   SCOREBOARD
================================ */
const scoreboard = new Scoreboard(
  document.getElementById("scoreboard")
);

/* ===============================
   GAME STATE
================================ */
let snakes = {}; // id -> Snake
let food = null;
let lastTick = 0;

/* ===============================
   SINGLEPLAYER
================================ */
function startSingleplayer() {
  isMultiplayer = false;
  isHost = false;

  snakes = {};
  scoreboard.reset();

  myId = "local";
  snakes[myId] = new Snake(canvas);
  food = new Food(canvas, snakes[myId]);

  scoreboard.ensurePlayer(myId);
  scoreboard.render(myId);

  hideUI();
  lastTick = 0;
  requestAnimationFrame(gameLoop);
}

/* ===============================
   GAME LOOP
================================ */
function gameLoop(ts) {
  if (ts - lastTick > TICK_RATE) {
    updateGame();
    lastTick = ts;
  }

  renderGame();
  requestAnimationFrame(gameLoop);
}

/* ===============================
   UPDATE
================================ */
function updateGame() {
  const me = snakes[myId];
  if (!me || !food) return;

  me.update();

  // Äta mat
  if (
    me.head.x === food.position.x &&
    me.head.y === food.position.y
  ) {
    me.grow();
    food.respawn(me);

    scoreboard.addPoint(myId);
    scoreboard.render(myId);
  }

  // (Multiplayer-host skulle skicka state här senare)
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
   DRAW SNAKE MED FÄRG
   (utan att ändra snake.js)
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
      ctx.fillStyle =
        (x + y) % 2 === 0 ? "#141a21" : "#10151b";
      ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    }
  }
}

/* ===============================
   INPUT (SINGLEPLAYER)
================================ */
document.addEventListener("keydown", (e) => {
  if (!snakes[myId]) return;

  const dir =
    e.key === "ArrowUp"    ? { x: 0, y: -1 } :
    e.key === "ArrowDown"  ? { x: 0, y: 1 } :
    e.key === "ArrowLeft"  ? { x: -1, y: 0 } :
    e.key === "ArrowRight" ? { x: 1, y: 0 } :
    null;

  if (!dir) return;
  snakes[myId].direction = dir;
});

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
