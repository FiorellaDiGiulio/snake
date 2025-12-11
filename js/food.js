export class Food {
  constructor(canvas, snake) {
    this.canvas = canvas;
    this.size = 20; // måste matcha snake size
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
      // undvik att mat spawnar ovanpå ormen
    } while (snake.body.some(seg => seg.x === pos.x && seg.y === pos.y));

    return pos;
  }

  respawn(snake) {
    this.position = this.randomPosition(snake);
  }

  draw(ctx) {
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(
      this.position.x * this.size + this.size / 2,
      this.position.y * this.size + this.size / 2,
      this.size / 2.4,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
}
