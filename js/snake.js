export class Snake {
  constructor(canvas) {
    this.canvas = canvas;
    this.size = 20;

    this.body = [
      { x: 5, y: 5 },
      { x: 4, y: 5 }
    ];

    this.direction = { x: 1, y: 0 };
    this.dead = false;

    document.addEventListener('keydown', e => this.handleInput(e));
  }

  get head() {
    return this.body[0];
  }

  handleInput(e) {
    const key = e.key.toLowerCase();

    if (key === 'arrowup' || key === 'w') this.direction = { x: 0, y: -1 };
    if (key === 'arrowdown' || key === 's') this.direction = { x: 0, y: 1 };
    if (key === 'arrowleft' || key === 'a') this.direction = { x: -1, y: 0 };
    if (key === 'arrowright' || key === 'd') this.direction = { x: 1, y: 0 };
  }

  update() {
    const newHead = {
      x: this.head.x + this.direction.x,
      y: this.head.y + this.direction.y
    };

    if (newHead.x < 0 || newHead.x >= this.canvas.width / this.size ||
        newHead.y < 0 || newHead.y >= this.canvas.height / this.size) {
      this.dead = true;
      return;
    }

    if (this.body.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
      this.dead = true;
      return;
    }

    this.body.unshift(newHead);
    this.body.pop();
  }

  grow() {
    this.body.push({ ...this.body[this.body.length - 1] });
  }

 draw(ctx) {
  const head = this.body[0];
  const size = this.size;

  // --- Rita kroppen (varierande färger) ---
  for (let i = 1; i < this.body.length; i++) {
    const part = this.body[i];

    ctx.fillStyle = i % 2 === 0 ? "#418649ff" : "#56a662ff"; 
    ctx.beginPath();
    ctx.roundRect(
      part.x * size,
      part.y * size,
      size,
      size,
      6
    );
    ctx.fill();
  }

  // --- Rita huvudet ---
  ctx.fillStyle = "#418649ff";
  ctx.beginPath();
  ctx.roundRect(
    head.x * size,
    head.y * size,
    size,
    size,
    8
  );
  ctx.fill();

  // --- Rita ögon (superenkelt & gulligt) ---
  const centerX = head.x * size + size / 2;
  const centerY = head.y * size + size / 2;

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(centerX - 4, centerY - 2, 3, 0, Math.PI * 2);
  ctx.arc(centerX + 4, centerY - 2, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.arc(centerX - 4, centerY - 2, 1.5, 0, Math.PI * 2);
  ctx.arc(centerX + 4, centerY - 2, 1.5, 0, Math.PI * 2);
  ctx.fill();
}
}