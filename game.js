
const {
    Engine,
    Bodies,
    Body,
    Composite,
    Events
} = Matter;

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const engine = Engine.create();
engine.gravity.y = 1;

const W = canvas.width;
const H = canvas.height;

const anchor = { x: 180, y: 365 };
const maxPull = 110;

let bird;
let pigs = [];
let blocks = [];
let score = 0;
let birdsLeft = 3;
let launched = false;
let dragging = false;
let level = 1;
let gameOver = false;
let won = false;

let pointer = { x: 0, y: 0 };

function createBird() {
    bird = Bodies.circle(anchor.x, anchor.y, 22, {
        label: "bird",
        isStatic: true,
        restitution: 0.45,
        friction: 0.5,
        density: 0.008,
        render: { visible: false }
    });

    Composite.add(engine.world, bird);
}

function createBlock(x, y, width, height) {
    const block = Bodies.rectangle(x, y, width, height, {
        label: "block",
        density: 0.003,
        friction: 0.7,
        restitution: 0.1,
        render: { visible: false }
    });

    block.customWidth = width;
    block.customHeight = height;

    blocks.push(block);
    Composite.add(engine.world, block);
}

function createPig(x, y) {
    const pig = Bodies.circle(x, y, 19, {
        label: "pig",
        density: 0.001,
        restitution: 0.4,
        friction: 0.6,
        render: { visible: false }
    });

    pigs.push(pig);
    Composite.add(engine.world, pig);
}

function createLevel() {
    Composite.clear(engine.world, false);
    Engine.clear(engine);

    pigs = [];
    blocks = [];
    score = 0;
    birdsLeft = 3;
    launched = false;
    dragging = false;
    gameOver = false;
    won = false;

    const ground = Bodies.rectangle(
        500, 550, 1200, 40,
        { isStatic: true, label: "ground" }
    );

    Composite.add(engine.world, ground);

    // Structure
    const baseX = level === 1 ? 690 : 700;

    createBlock(baseX - 45, 475, 24, 110);
    createBlock(baseX + 45, 475, 24, 110);
    createBlock(baseX, 410, 120, 20);

    createBlock(baseX - 25, 360, 20, 80);
    createBlock(baseX + 25, 360, 20, 80);
    createBlock(baseX, 310, 90, 20);

    // Pigs
    createPig(baseX, 455);
    createPig(baseX, 280);

    if (level >= 2) {
        createBlock(850, 475, 25, 110);
        createBlock(805, 410, 110, 20);
        createPig(850, 385);
    }

    if (level >= 3) {
        createBlock(570, 475, 25, 110);
        createBlock(615, 410, 110, 20);
        createPig(615, 380);
    }

    createBird();

    updateUI();
    setMessage("Drag the bird backward and release!");
}

// Pointer controls
function getPointer(event) {
    const rect = canvas.getBoundingClientRect();

    return {
        x: (event.clientX - rect.left) * W / rect.width,
        y: (event.clientY - rect.top) * H / rect.height
    };
}

canvas.addEventListener("pointerdown", event => {
    if (launched || gameOver || birdsLeft <= 0) return;

    pointer = getPointer(event);

    const distance = Math.hypot(
        pointer.x - bird.position.x,
        pointer.y - bird.position.y
    );

    if (distance < 45) {
        dragging = true;
        canvas.setPointerCapture(event.pointerId);
    }
});

canvas.addEventListener("pointermove", event => {
    if (!dragging) return;

    pointer = getPointer(event);

    let dx = pointer.x - anchor.x;
    let dy = pointer.y - anchor.y;

    const distance = Math.hypot(dx, dy);

    if (distance > maxPull) {
        dx = dx / distance * maxPull;
        dy = dy / distance * maxPull;
    }

    // Bird must stay behind the slingshot
    dx = Math.min(dx, 0);

    Body.setPosition(bird, {
        x: anchor.x + dx,
        y: anchor.y + dy
    });
});

canvas.addEventListener("pointerup", () => {
    if (!dragging) return;

    dragging = false;
    launched = true;

    Body.setStatic(bird, false);

    const dx = anchor.x - bird.position.x;
    const dy = anchor.y - bird.position.y;

    Body.setVelocity(bird, {
        x: dx * 0.19,
        y: dy * 0.19
    });

    birdsLeft--;
    updateUI();
    setMessage("Nice shot! Hit those pigs!");
});

// Collision handling
Events.on(engine, "collisionStart", event => {
    for (const pair of event.pairs) {
        const a = pair.bodyA;
        const b = pair.bodyB;

        const pig = a.label === "pig" ? a :
                    b.label === "pig" ? b : null;

        const other = pig === a ? b : a;

        if (!pig) continue;

        if (other === bird || other.label === "block") {
            if (pigs.includes(pig)) {
                Composite.remove(engine.world, pig);
                pigs = pigs.filter(item => item !== pig);
                score += 100;

                updateUI();

                if (pigs.length === 0) {
                    won = true;
                    gameOver = true;
                    setMessage("🎉 LEVEL COMPLETE! Great job!");
                }
            }
        }
    }
});

// Background drawing
function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#56b9ed");
    sky.addColorStop(1, "#d6f2ff");

    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Sun
    ctx.fillStyle = "#ffdf62";
    ctx.beginPath();
    ctx.arc(850, 85, 45, 0, Math.PI * 2);
    ctx.fill();

    // Clouds
    drawCloud(270, 90);
    drawCloud(570, 135);

    // Hills
    ctx.fillStyle = "#7cc65b";
    ctx.beginPath();
    ctx.moveTo(0, 490);
    ctx.quadraticCurveTo(300, 340, 580, 490);
    ctx.quadraticCurveTo(800, 390, 1000, 490);
    ctx.lineTo(1000, 560);
    ctx.lineTo(0, 560);
    ctx.fill();

    ctx.fillStyle = "#4b963b";
    ctx.fillRect(0, 530, W, 30);
}

function drawCloud(x, y) {
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(x, y, 23, 0, Math.PI * 2);
    ctx.arc(x + 27, y - 12, 30, 0, Math.PI * 2);
    ctx.arc(x + 58, y, 22, 0, Math.PI * 2);
    ctx.fill();
}

// Slingshot

function drawSlingshot() {
    // Back wooden fork
    ctx.strokeStyle = "#713e20";
    ctx.lineWidth = 14;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(160, 470);
    ctx.lineTo(180, 340);
    ctx.lineTo(210, 470);
    ctx.stroke();

    ctx.strokeStyle = "#4d2815";
    ctx.lineWidth = 6;

    ctx.beginPath();
    ctx.moveTo(180, 340);
    ctx.lineTo(150, 300);
    ctx.stroke();

    // Aiming trajectory
    if (dragging && bird) {
        const dx = (anchor.x - bird.position.x) * 0.19;
        const dy = (anchor.y - bird.position.y) * 0.19;

        ctx.fillStyle = "rgba(255,255,255,0.8)";

        for (let i = 1; i <= 15; i++) {
            const t = i * 0.12;
            const x = bird.position.x + dx * t;
            const y = bird.position.y + dy * t
                + 0.5 * engine.gravity.y * t * t * 0.7;

            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Elastic bands
    if (!launched && bird) {
        ctx.strokeStyle = "#422214";
        ctx.lineWidth = 6;

        ctx.beginPath();
        ctx.moveTo(180, 340);
        ctx.lineTo(bird.position.x, bird.position.y);
        ctx.stroke();
    }
}


// Bird drawing
function drawBird() {
    if (!bird) return;

    const x = bird.position.x;
    const y = bird.position.y;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(bird.angle);

    // Body
    ctx.fillStyle = "#e52b23";
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#9e1915";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Belly
    ctx.fillStyle = "#f6d3a1";
    ctx.beginPath();
    ctx.ellipse(-3, 10, 12, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(8, -7, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(11, -7, 3, 0, Math.PI * 2);
    ctx.fill();

    // Eyebrow
    ctx.strokeStyle = "#46130e";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(17, -15);
    ctx.stroke();

    // Beak
    ctx.fillStyle = "#ffb52b";
    ctx.beginPath();
    ctx.moveTo(18, 1);
    ctx.lineTo(33, 7);
    ctx.lineTo(18, 12);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

// Pig drawing
function drawPig(pig) {
    const x = pig.position.x;
    const y = pig.position.y;

    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = "#65c940";
    ctx.beginPath();
    ctx.arc(0, 0, 19, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#338c29";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Ears
    ctx.fillStyle = "#65c940";
    ctx.beginPath();
    ctx.arc(-13, -16, 8, 0, Math.PI * 2);
    ctx.arc(13, -16, 8, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(-7, -5, 5, 0, Math.PI * 2);
    ctx.arc(7, -5, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#172b16";
    ctx.beginPath();
    ctx.arc(-6, -5, 2, 0, Math.PI * 2);
    ctx.arc(8, -5, 2, 0, Math.PI * 2);
    ctx.fill();

    // Nose
    ctx.fillStyle = "#9be36f";
    ctx.beginPath();
    ctx.ellipse(0, 7, 10, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#438c30";
    ctx.beginPath();
    ctx.arc(-4, 7, 2, 0, Math.PI * 2);
    ctx.arc(4, 7, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// Wooden blocks
function drawBlocks() {
    for (const block of blocks) {
        const vertices = block.vertices;

        ctx.beginPath();
        ctx.moveTo(vertices[0].x, vertices[0].y);

        for (let i = 1; i < vertices.length; i++) {
            ctx.lineTo(vertices[i].x, vertices[i].y);
        }

        ctx.closePath();

        ctx.fillStyle = "#b87938";
        ctx.fill();

        ctx.strokeStyle = "#70411e";
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.strokeStyle = "rgba(255,220,160,0.6)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(vertices[0].x + 4, vertices[0].y + 5);
        ctx.lineTo(vertices[1].x - 4, vertices[1].y + 5);
        ctx.stroke();
    }
}

// Game loop
let lastTime = 0;

function gameLoop(time) {
    const delta = Math.min(time - (lastTime || time), 32);
    lastTime = time;

    Engine.update(engine, delta);

    drawBackground();
    drawBlocks();

    drawSlingshot();

    pigs.forEach(drawPig);
    drawBird();

    // Win or lose
    if (!gameOver && launched && bird) {
        const outside =
            bird.position.x > W + 100 ||
            bird.position.x < -100 ||
            bird.position.y > H + 100;

        if (outside || (
            bird.speed < 0.35 &&
            time > launchTime + 1600
        )) {
            if (outside || bird.speed < 0.35) {
                if (birdsLeft > 0 && pigs.length > 0) {
                    // Prepare the next bird
                    Composite.remove(engine.world, bird);
                    createBird();
                    launched = false;
                    setMessage("Next bird! Take your shot.");
                } else if (pigs.length > 0) {
                    gameOver = true;
                    setMessage("Game Over! Try again.");
                }
            }
        }
    }

    requestAnimationFrame(gameLoop);
}

let launchTime = 0;

canvas.addEventListener("pointerup", () => {
    if (launched) launchTime = performance.now();
});

function updateUI() {
    document.getElementById("score").textContent =
        "SCORE: " + score;

    document.getElementById("birds").textContent =
        "BIRDS: " + birdsLeft;
}

function setMessage(message) {
    document.getElementById("message").textContent = message;
}

document.getElementById("restartBtn").addEventListener("click", () => {
    createLevel();
});

document.getElementById("nextBtn").addEventListener("click", () => {
    if (won) {
        level++;
        createLevel();
        setMessage("Welcome to Level " + level + "!");
    } else {
        setMessage("Complete this level first!");
    }
});

// Start
createLevel();
requestAnimationFrame(gameLoop);
