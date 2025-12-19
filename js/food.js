export class Food {
  constructor(canvas, snake) {
    this.canvas = canvas;
    this.size = 20;

    this.type = "apple"; // apple | spider
    this.position = this.randomPosition(snake);
  }

  randomPosition(snake) {
    const cols = Math.floor(this.canvas.width / this.size);
    const rows = Math.floor(this.canvas.height / this.size);

    let pos;
    do {
      pos = {
        x: Math.floor(Math.random() * cols),
        y: Math.floor(Math.random() * rows)
      };
    } while (snake.body.some(seg => seg.x === pos.x && seg.y === pos.y));

    return pos;
  }

  // score skickas in från main.js
  respawn(snake, score) {
    if (score >= 20) {
      // Efter 20 poäng: förvirring
      this.type = Math.random() < 0.7 ? "apple" : "spider";
    } else {
      // Innan 20 poäng: bara äpple
      this.type = "apple";
    }

    this.position = this.randomPosition(snake);
  }

  draw(ctx) {
    const x = this.position.x * this.size + this.size / 2;
    const y = this.position.y * this.size + this.size / 2;

    ctx.font = "18px system-ui, Apple Color Emoji, Segoe UI Emoji";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.shadowBlur = 10;
    ctx.shadowColor =
      this.type === "apple"
        ? "rgba(242, 201, 76, 0.6)"
        : "rgba(235, 87, 87, 0.6)";

    ctx.fillText(this.type === "apple" ? "🍎" : "🕷️", x, y);
    ctx.shadowBlur = 0;
  }
}

