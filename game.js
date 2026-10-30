const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const playerScoreEl = document.getElementById("playerScore");
const cpuScoreEl = document.getElementById("cpuScore");
const statusEl = document.getElementById("status");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const WIN_SCORE = 7;

const PADDLE_WIDTH = 12;
const PADDLE_HEIGHT = 90;
const PADDLE_SPEED = 7;
const CPU_SPEED = 5;
const BALL_SIZE = 12;
const BALL_START_SPEED = 6;
const BALL_MAX_SPEED = 14;
const MAX_BOUNCE_ANGLE = Math.PI / 3; // 60 degrees

const player = { x: 20, y: HEIGHT / 2 - PADDLE_HEIGHT / 2, score: 0 };
const cpu = { x: WIDTH - 20 - PADDLE_WIDTH, y: HEIGHT / 2 - PADDLE_HEIGHT / 2, score: 0 };
const ball = { x: WIDTH / 2, y: HEIGHT / 2, vx: 0, vy: 0, speed: BALL_START_SPEED };

const keys = { up: false, down: false };
let state = "ready"; // ready | playing | paused | over

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function resetBall(direction) {
  ball.x = WIDTH / 2;
  ball.y = HEIGHT / 2;
  ball.speed = BALL_START_SPEED;
  const angle = (Math.random() * 0.8 - 0.4) * Math.PI / 2;
  ball.vx = direction * ball.speed * Math.cos(angle);
  ball.vy = ball.speed * Math.sin(angle);
}

function resetGame() {
  player.score = 0;
  cpu.score = 0;
  player.y = cpu.y = HEIGHT / 2 - PADDLE_HEIGHT / 2;
  resetBall(Math.random() < 0.5 ? -1 : 1);
  updateScoreboard();
  setState("ready");
}

function setState(next) {
  state = next;
  const messages = {
    ready: "Press Space or click to start",
    playing: `First to ${WIN_SCORE} wins`,
    paused: "Paused. Press Space to resume",
    over: player.score > cpu.score ? "You win! Press R to play again" : "CPU wins! Press R to play again",
  };
  statusEl.textContent = messages[next];
}

function updateScoreboard() {
  playerScoreEl.textContent = player.score;
  cpuScoreEl.textContent = cpu.score;
}

function bounceOffPaddle(paddle, direction) {
  // Angle depends on where the ball hits the paddle: edges give sharper angles.
  const paddleCenter = paddle.y + PADDLE_HEIGHT / 2;
  const offset = clamp((ball.y - paddleCenter) / (PADDLE_HEIGHT / 2), -1, 1);
  const angle = offset * MAX_BOUNCE_ANGLE;
  ball.speed = Math.min(ball.speed + 0.5, BALL_MAX_SPEED);
  ball.vx = direction * ball.speed * Math.cos(angle);
  ball.vy = ball.speed * Math.sin(angle);
}

function hitsPaddle(paddle) {
  return (
    ball.x - BALL_SIZE / 2 < paddle.x + PADDLE_WIDTH &&
    ball.x + BALL_SIZE / 2 > paddle.x &&
    ball.y + BALL_SIZE / 2 > paddle.y &&
    ball.y - BALL_SIZE / 2 < paddle.y + PADDLE_HEIGHT
  );
}

function scorePoint(scorer) {
  scorer.score++;
  updateScoreboard();
  if (scorer.score >= WIN_SCORE) {
    setState("over");
    return;
  }
  // Serve toward the player who just lost the point.
  resetBall(scorer === player ? 1 : -1);
}

function update() {
  // Player movement (keyboard)
  if (keys.up) player.y -= PADDLE_SPEED;
  if (keys.down) player.y += PADDLE_SPEED;
  player.y = clamp(player.y, 0, HEIGHT - PADDLE_HEIGHT);

  if (state !== "playing") return;

  // CPU follows the ball with limited speed so it can be beaten.
  const cpuCenter = cpu.y + PADDLE_HEIGHT / 2;
  if (ball.vx > 0) {
    if (cpuCenter < ball.y - 15) cpu.y += CPU_SPEED;
    else if (cpuCenter > ball.y + 15) cpu.y -= CPU_SPEED;
  }
  cpu.y = clamp(cpu.y, 0, HEIGHT - PADDLE_HEIGHT);

  ball.x += ball.vx;
  ball.y += ball.vy;

  // Top and bottom walls
  if (ball.y - BALL_SIZE / 2 <= 0) {
    ball.y = BALL_SIZE / 2;
    ball.vy = Math.abs(ball.vy);
  } else if (ball.y + BALL_SIZE / 2 >= HEIGHT) {
    ball.y = HEIGHT - BALL_SIZE / 2;
    ball.vy = -Math.abs(ball.vy);
  }

  // Paddles
  if (ball.vx < 0 && hitsPaddle(player)) {
    ball.x = player.x + PADDLE_WIDTH + BALL_SIZE / 2;
    bounceOffPaddle(player, 1);
  } else if (ball.vx > 0 && hitsPaddle(cpu)) {
    ball.x = cpu.x - BALL_SIZE / 2;
    bounceOffPaddle(cpu, -1);
  }

  // Missed the ball
  if (ball.x < -BALL_SIZE) scorePoint(cpu);
  else if (ball.x > WIDTH + BALL_SIZE) scorePoint(player);
}

function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  // Center net
  ctx.fillStyle = "#334155";
  for (let y = 10; y < HEIGHT; y += 30) {
    ctx.fillRect(WIDTH / 2 - 2, y, 4, 16);
  }

  // Paddles
  ctx.fillStyle = "#38bdf8";
  ctx.fillRect(player.x, player.y, PADDLE_WIDTH, PADDLE_HEIGHT);
  ctx.fillStyle = "#f472b6";
  ctx.fillRect(cpu.x, cpu.y, PADDLE_WIDTH, PADDLE_HEIGHT);

  // Ball
  ctx.fillStyle = "#f8fafc";
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, BALL_SIZE / 2, 0, Math.PI * 2);
  ctx.fill();

  // Overlay text
  if (state !== "playing") {
    ctx.fillStyle = "rgba(2, 6, 23, 0.6)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "#f8fafc";
    ctx.textAlign = "center";
    ctx.font = "bold 36px system-ui, sans-serif";
    const titles = {
      ready: "Bounce Ping Pong",
      paused: "Paused",
      over: player.score > cpu.score ? "You Win!" : "CPU Wins",
    };
    ctx.fillText(titles[state], WIDTH / 2, HEIGHT / 2 - 10);
    ctx.font = "18px system-ui, sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(statusEl.textContent, WIDTH / 2, HEIGHT / 2 + 26);
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

function togglePlay() {
  if (state === "ready" || state === "paused") setState("playing");
  else if (state === "playing") setState("paused");
}

// Keyboard controls
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") keys.up = true;
  if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") keys.down = true;
  if (e.key === " ") {
    e.preventDefault();
    togglePlay();
  }
  if (e.key === "r" || e.key === "R") resetGame();
  if (e.key.startsWith("Arrow")) e.preventDefault();
});

document.addEventListener("keyup", (e) => {
  if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") keys.up = false;
  if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") keys.down = false;
});

// Mouse and touch controls: paddle follows the pointer.
function movePaddleTo(clientY) {
  const rect = canvas.getBoundingClientRect();
  const y = (clientY - rect.top) * (HEIGHT / rect.height);
  player.y = clamp(y - PADDLE_HEIGHT / 2, 0, HEIGHT - PADDLE_HEIGHT);
}

canvas.addEventListener("pointermove", (e) => movePaddleTo(e.clientY));
canvas.addEventListener("pointerdown", (e) => {
  movePaddleTo(e.clientY);
  if (state === "ready" || state === "paused") setState("playing");
  else if (state === "over") resetGame();
});

resetGame();
loop();
