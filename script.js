const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const openBtn = document.getElementById("openBtn");
const closeBtn = document.getElementById("closeBtn");
const statusBox = document.getElementById("status");

let stream = null;
let detector = null;

function setGood() {
  statusBox.textContent = "✅ ท่านั่งดี";
  statusBox.className = "status good";
}

function setBad() {
  statusBox.textContent = "⚠️ ท่านั่งไม่ดี";
  statusBox.className = "status bad";
}

openBtn.onclick = async () => {
  stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
  openBtn.disabled = true;
  closeBtn.disabled = false;

  await loadModel();
  detectPose();
};

closeBtn.onclick = () => {
  if (stream) stream.getTracks().forEach(t => t.stop());
  video.srcObject = null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  openBtn.disabled = false;
  closeBtn.disabled = true;
};

async function loadModel() {
  detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    {
      modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
    }
  );
}

function drawPoint(p) {
  ctx.beginPath();
  ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
  ctx.fillStyle = "red";
  ctx.fill();
}

function drawLine(p1, p2, color) {
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawText(text, x, y) {
  ctx.fillStyle = "white";
  ctx.font = "18px Arial";
  ctx.fillText(text, x, y);
}

function angleDeg(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p1.y - p2.y;
  return Math.abs(Math.atan2(dy, dx) * 180 / Math.PI);
}

function checkPosture(angle) {
  angle > 80 && angle < 100 ? setGood() : setBad();
}

async function detectPose() {
  if (!detector || !video.srcObject) return;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const poses = await detector.estimatePoses(video);

  if (poses.length) {
    const kps = poses[0].keypoints;

    kps.forEach(p => p.score > 0.4 && drawPoint(p));

    const ls = kps.find(p => p.name === "left_shoulder");
    const rs = kps.find(p => p.name === "right_shoulder");
    const lh = kps.find(p => p.name === "left_hip");
    const rh = kps.find(p => p.name === "right_hip");

    if (ls && rs && ls.score > 0.4 && rs.score > 0.4)
      drawLine(ls, rs, "lime");

    if (lh && rh && lh.score > 0.4 && rh.score > 0.4)
      drawLine(lh, rh, "cyan");

    if (ls && lh && ls.score > 0.4 && lh.score > 0.4) {
      drawLine(ls, lh, "yellow");

      const angle = angleDeg(lh, ls);
      drawText(`Angle: ${angle.toFixed(1)}°`, ls.x + 10, ls.y - 10);
      checkPosture(angle);
    }

    if (rs && rh && rs.score > 0.4 && rh.score > 0.4)
      drawLine(rs, rh, "yellow");
  }

  requestAnimationFrame(detectPose);
}
