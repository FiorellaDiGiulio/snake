import { Snake } from './snake.js';
import { Food } from './food.js';

//--------------------------------------------------
// CANVAS SETUP (MÅSTE VARA FÖRST)
//--------------------------------------------------
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Mobil-first canvas fix
function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.width; // alltid kvadratisk
}
resizeCanvas();

//--------------------------------------------------
// UI ELEMENTS
//--------------------------------------------------
const uiOverlay = document.getElementById("uiOverlay");
const startScreen = document.getElementById("startScreen");
const gameOverScreen = document.getElementById("gameOverScreen");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");

//--------------------------------------------------
// GAME STATE
//--------------------------------------------------
let snake;
let food;
let score = 0;
let bestScore = Number(localStorage.getItem("bestScore") || 0);
let lastTick = 0;

document.getElementById("bestScore").textContent = bestScore;

const TICK_RATE = 120;

//--------------------------------------------------
// START GAME
//--------------------------------------------------
function startGame() {
  uiOverlay.classList.add("hidden");
  startScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");

  score = 0;
  document.getElementById("score").textContent = score;

  snake = new Snake(canvas);
  food = new Food(canvas, snake);

  lastTick = 0;
  requestAnimationFrame(gameLoop);
}

//--------------------------------------------------
// END GAME
//--------------------------------------------------
function endGame() {
  uiOverlay.classList.remove("hidden");
  gameOverScreen.classList.remove("hidden");

  document.getElementById("finalScore").textContent = score;

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("bestScore", bestScore);
    document.getElementById("newRecordMsg").classList.remove("hidden");
  } else {
    document.getElementById("newRecordMsg").classList.add("hidden");
  }

  document.getElementById("bestScore").textContent = bestScore;
}

//--------------------------------------------------
// GAME LOOP
//--------------------------------------------------
function gameLoop(timestamp) {
  if (snake.dead) {
    endGame();
    return;
  }

  if (timestamp - lastTick > TICK_RATE) {
    updateGame();
    lastTick = timestamp;
  }

  renderGame();
  requestAnimationFrame(gameLoop);
}

//--------------------------------------------------
// UPDATE LOGIC
//--------------------------------------------------
function updateGame() {
  snake.update();

  if (snake.head.x === food.position.x && snake.head.y === food.position.y) {
    snake.grow();
    score++;
    document.getElementById("score").textContent = score;
    food.respawn(snake);
  }
}

//--------------------------------------------------
// RENDER
//--------------------------------------------------
function renderGame() {
  drawGrid();
  food.draw(ctx);
  snake.draw(ctx);
}

function drawGrid() {
  const cell = 20; // samma som snake.size
  const cols = canvas.width / cell;
  const rows = canvas.height / cell;

  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? "#a8dca0" : "#99d38c";
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }
}


//--------------------------------------------------
// BUTTONS
//--------------------------------------------------
startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);


// MOBIL KONTROLLER
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener("touchstart", (e) => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
});

canvas.addEventListener("touchmove", (e) => {
  e.preventDefault(); // stoppa scroll
}, { passive: false });

canvas.addEventListener("touchend", (e) => {
  const touchEndX = e.changedTouches[0].clientX;
  const touchEndY = e.changedTouches[0].clientY;

  const dx = touchEndX - touchStartX;
  const dy = touchEndY - touchStartY;

  // Om rörelsen är större horisontellt
  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 0 && snake.direction.x !== -1) {
      snake.direction = { x: 1, y: 0 }; // höger
    }
    if (dx < 0 && snake.direction.x !== 1) {
      snake.direction = { x: -1, y: 0 }; // vänster
    }
  } else {
    if (dy > 0 && snake.direction.y !== -1) {
      snake.direction = { x: 0, y: 1 }; // ner
    }
    if (dy < 0 && snake.direction.y !== 1) {
      snake.direction = { x: 0, y: -1 }; // upp
    }
  }
});
