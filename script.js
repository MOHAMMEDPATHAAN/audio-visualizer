/* =========================
   BASIC AUDIO SETUP
========================= */
const AudioCtx = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioCtx();

let analyser = audioCtx.createAnalyser();
analyser.fftSize = 2048;
let bufferLength = analyser.frequencyBinCount;
let dataArray = new Uint8Array(bufferLength);

/* =========================
   AUDIO PITCH (REAL PITCH)
========================= */
const pitchNode = audioCtx.createBiquadFilter();
pitchNode.type = "allpass";

/* =========================
   VISUALIZER SCALE CONTROL
========================= */
const canvasContainer = document.querySelector('.canvas-container');
function setVisualizerScale(v) {
  canvasContainer.style.setProperty('--viz-scale', v);
}

/* =========================
   MIRRORED FLUID CIRCLE
========================= */
function drawFluidCircle(ctx, cx, cy, radius, mirror = true) {
  ctx.beginPath();
  for (let i = 0; i < bufferLength; i++) {
    const angle = (i / bufferLength) * Math.PI * 2;
    const amp = dataArray[i] / 255;
    const r = radius + amp * 120;

    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);

    if (mirror) {
      ctx.lineTo(cx - (x - cx), y);
    }
  }
  ctx.closePath();
  ctx.stroke();
}

/* =========================
   PARTICLE SYSTEM (SMOOTH)
========================= */
let particles = [];

function spawnParticle(cx, cy, intensity) {
  particles.push({
    x: cx,
    y: cy,
    vx: (Math.random() - 0.5) * intensity * 3,
    vy: (Math.random() - 0.5) * intensity * 3,
    life: 1
  });
}

function updateParticles(ctx) {
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.01;

    ctx.globalAlpha = p.life;
    ctx.fillRect(p.x, p.y, 2, 2);
  });
  particles = particles.filter(p => p.life > 0);
  ctx.globalAlpha = 1;
}

/* =========================
   CAPTIONS (SRT / VTT)
========================= */
let captions = [];
let captionIndex = 0;

function parseTime(t) {
  const p = t.replace(',', '.').split(':');
  return (+p[0]) * 3600 + (+p[1]) * 60 + parseFloat(p[2]);
}

function parseSRT(text) {
  return text.split('\n\n').map(block => {
    const lines = block.split('\n');
    if (lines.length < 3) return null;
    const times = lines[1].split(' --> ');
    return {
      start: parseTime(times[0]),
      end: parseTime(times[1]),
      text: lines.slice(2).join('\n')
    };
  }).filter(Boolean);
}

/* =========================
   CAPTION RENDER
========================= */
const captionLayer = document.createElement('div');
captionLayer.className = 'caption-layer';
const captionText = document.createElement('div');
captionText.className = 'caption-text';
captionLayer.appendChild(captionText);
document.querySelector('.canvas-container').appendChild(captionLayer);

function updateCaptions(currentTime) {
  if (!captions.length) return;
  const cap = captions[captionIndex];
  if (cap && currentTime >= cap.start && currentTime <= cap.end) {
    captionText.textContent = cap.text;
  } else {
    captionText.textContent = '';
    if (currentTime > cap?.end) captionIndex++;
  }
}

/* =========================
   LOGO POSITION (X/Y)
========================= */
function moveLogo(x, y) {
  const logo = document.getElementById('logoOverlay');
  logo.style.transform = `translate(${x}px, ${y}px)`;
}

/* =========================
   MAIN DRAW LOOP
========================= */
function render() {
  requestAnimationFrame(render);
  analyser.getByteFrequencyData(dataArray);

  ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);

  drawFluidCircle(
    ctx,
    mainCanvas.width / 2,
    mainCanvas.height / 2,
    Math.min(mainCanvas.width, mainCanvas.height) / 4,
    document.getElementById('enableMirroring')?.checked
  );

  spawnParticle(
    mainCanvas.width / 2,
    mainCanvas.height / 2,
    dataArray[0] / 255
  );

  updateParticles(ctx);

  if (audioElement) updateCaptions(audioElement.currentTime);
}

render();
