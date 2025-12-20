export class Renderer {
  constructor(canvas, scoreboard) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.scoreboard = scoreboard;
    this.CELL = 20;
  }

  draw(snakes, food, myId) {
    this.drawGrid();

    if (food) food.draw(this.ctx);

    for (const id in snakes) {
      this.drawSnakeColored(snakes[id], id);
    }
  }

  drawSnakeColored(snake, id) {
    this.ctx.save();
    const hue = this.scoreboard._hueFromId(id);
    this.ctx.filter = `hue-rotate(${hue}deg)`;
    snake.draw(this.ctx);
    this.ctx.restore();
  }

  drawGrid() {
    for (let x = 0; x < this.canvas.width / this.CELL; x++) {
      for (let y = 0; y < this.canvas.height / this.CELL; y++) {
        this.ctx.fillStyle =
          (x + y) % 2 === 0 ? "#141a21" : "#10151b";
        this.ctx.fillRect(
          x * this.CELL,
          y * this.CELL,
          this.CELL,
          this.CELL
        );
      }
    }
  }
}
