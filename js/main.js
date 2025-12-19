import { Snake } from "./snake.js";
import { Food } from "./food.js";
import { mpapi } from "./mpapi.js";

/* ===============================
   MULTIPLAYER API
================================ */
const api = new mpapi(
  "wss://mpapi.se/net", // SERVER
  "hungrig-orm"         // identifier (måste vara samma för alla)
);

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

canvas.width = CELL * 40; // 800
canvas.height = CELL * 25; // 500

/* ===============================
   UI ELEMENTS
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
   GAME STATE
================================ */
let snakes = {};
let food = null;
let score = 0;
let lastTick = 0;

let bestScore = Number(localStorage.getItem("bestScore") || 0);
document.getElementById("bestScore").textContent = bestScore;

/* ===============================
   SINGLEPLAYER
================================ */
function startSingleplayer() {
  isMultiplayer = false;
  isHost = false;

  snakes = {};
  myId = "local";

  snakes[myId] = new Snake(canvas);
  food = new Food(canvas, snakes[myId]);

  score = 0;
  document.getElementById("score").textContent = score;

  hideUI();
  requestAnimationFrame(gameLoop);
}

/* ===============================
   HOST MULTIPLAYER
================================ */
async function startHost() {
  try {
    isMultiplayer = true;
    isHost = true;

    const { session, clientId } = await api.host();
    myId = clientId;

    alert("Session code: " + session);

    snakes = {};
    snakes[myId] = new Snake(canvas);
    food = new Food(canvas, snakes[myId]);

    listenMultiplayer();
    hideUI();
    requestAnimationFrame(gameLoop);
  } catch (e) {
    alert("Kunde inte hosta: " + e);
  }
}

/* ===============================
   JOIN MULTIPLAYER
================================ */
async function joinMultiplayer() {
  const code = joinCodeInput.value.trim();
  if (!code) {
    alert("Skriv in session-kod");
    return;
  }

  try {
    isMultiplayer = true;
    isHost = false;

    const res = await api.join(code);
    myId = res.clientId;

    listenMultiplayer();
    hideUI();
  } catch (e) {
    alert("Kunde inte ansluta: " + e);
  }
}

/* ===============================
   MULTIPLAYER LISTENER
================================ */
function listenMultiplayer() {
  api.listen((event, messageId, clientId, data) => {

    /* =========================
       NÅGON ANSLÖT
    ========================== */
    if (event === "joined") {
      if (!snakes[clientId]) {
        const s = new Snake(canvas);
        s.resetRandom?.(); // om du har en sådan metod
        snakes[clientId] = s;
        console.log("Ny spelare anslöt:", clientId);
      }
    }

    function applyGameState(state) {
  if (!state.snakes) return;

  for (const id in state.snakes) {
    if (!snakes[id]) {
      snakes[id] = new Snake(canvas);
    }

    snakes[id].body = state.snakes[id].body;
    snakes[id].direction = state.snakes[id].direction;
  }

  if (food) {
    food.position = state.food;
  }
}


    /* =========================
       GAME STATE (från host)
    ========================== */
    if (event === "game") {
      applyGameState(data);
    }
  });
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
   UPDATE GAME
================================ */
function updateGame() {
  const me = snakes[myId];
  if (!me || !food) return;

  me.update();

  // äta mat
  if (me.head.x === food.position.x && me.head.y === food.position.y) {
    me.grow();
    score++;
    document.getElementById("score").textContent = score;
    food.respawn(me);
  }

  // host skickar state
  if (isMultiplayer && isHost) {
  api.transmit({
    snakes: Object.fromEntries(
      Object.entries(snakes).map(([id, s]) => [
        id,
        {
          body: s.body,
          direction: s.direction
        }
      ])
    ),
    food: food.position
  });
}
}

/* ===============================
   RENDER
================================ */
function renderGame() {
  drawGrid();
  if (food) food.draw(ctx);
  for (const id in snakes) snakes[id].draw(ctx);
}

function drawGrid() {
  for (let x = 0; x < canvas.width / CELL; x++) {
    for (let y = 0; y < canvas.height / CELL; y++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? "#141a21" : "#10151b";
      ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    }
  }
}

/* ===============================
   INPUT
================================ */
document.addEventListener("keydown", (e) => {
  const dir =
    e.key === "ArrowUp" ? { x: 0, y: -1 } :
    e.key === "ArrowDown" ? { x: 0, y: 1 } :
    e.key === "ArrowLeft" ? { x: -1, y: 0 } :
    e.key === "ArrowRight" ? { x: 1, y: 0 } :
    null;

  if (!dir || !snakes[myId]) return;

  snakes[myId].direction = dir;

  if (isMultiplayer && !isHost) {
    api.transmit({ input: dir });
  }
});

/* ===============================
   UI
================================ */
function hideUI() {
  uiOverlay.classList.add("hidden");
  startScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");
}

startBtn.addEventListener("click", startSingleplayer);
restartBtn.addEventListener("click", startSingleplayer);
hostBtn.addEventListener("click", startHost);
joinBtn.addEventListener("click", joinMultiplayer);

/* ===============================
   DEBUG (valfritt)
================================ */
window.host = startHost;
window.join = (code) => api.join(code);
