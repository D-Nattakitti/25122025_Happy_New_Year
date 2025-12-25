// DOM Elements
const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');
const spinBtn = document.getElementById('spinBtn');
const nameInput = document.getElementById('nameInput');
const addBtn = document.getElementById('addBtn');
const clearInputBtn = document.getElementById('clearInputBtn');
const nameList = document.getElementById('nameList');
const countSpan = document.getElementById('count');
const clearListBtn = document.getElementById('clearListBtn');
const winnerModal = document.getElementById('winnerModal');
const winnerNameEl = document.getElementById('winnerName');
const closeModalBtn = document.getElementById('closeModalBtn');
const confettiCanvas = document.getElementById('confettiCanvas');
const confettiCtx = confettiCanvas.getContext('2d');

// State
let names = [];
let isSpinning = false;
let currentRotation = 0; // Degrees
let currentWinner = '';

// Colors for segments
const colors = [
    '#F43F5E', '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B',
    '#EF4444', '#6366F1', '#EC4899', '#14B8A6', '#84CC16'
];

// Initialize
function init() {
    // Canvas resolution fix
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Add event listeners
    addBtn.addEventListener('click', addNamesFromInput);
    clearInputBtn.addEventListener('click', () => { nameInput.value = ''; });
    clearListBtn.addEventListener('click', clearAllNames);
    spinBtn.addEventListener('click', spinWheel);
    closeModalBtn.addEventListener('click', confirmWinner);

    // Initial draw
    drawWheel();
    animateConfetti();
}

function resizeCanvas() {
    // Wheel Canvas
    const container = document.querySelector('.wheel-container');
    const size = container.clientWidth;
    canvas.width = size;
    canvas.height = size;
    drawWheel();

    // Confetti Canvas
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
}

function addNamesFromInput() {
    const rawInput = nameInput.value.trim();
    if (!rawInput) return;

    const newNames = rawInput.split('\n').filter(n => n.trim() !== '');

    // Check limit
    if (names.length + newNames.length > 50) {
        alert('ใส่รายชื่อได้สูงสุด 50 ชื่อครับ');
        return;
    }

    names = [...names, ...newNames];
    names = names.slice(0, 50);

    nameInput.value = '';
    updateUI();
}

function removeName(index) {
    if (isSpinning) return;
    names.splice(index, 1);
    updateUI();
}

function clearAllNames() {
    if (isSpinning) return;
    names = [];
    currentRotation = 0;
    updateUI();
}

function updateUI() {
    countSpan.textContent = names.length;

    // Update List
    nameList.innerHTML = '';
    names.forEach((name, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${index + 1}. ${name}</span>
            <button class="remove-item-btn" onclick="removeName(${index})">×</button>
        `;
        nameList.appendChild(li);
    });

    drawWheel();
}

function drawWheel() {
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = w / 2 - 10;

    ctx.clearRect(0, 0, w, h);

    if (names.length === 0) {
        // Draw empty placeholder
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
        ctx.fillStyle = '#1e293b';
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 10;
        ctx.stroke();

        ctx.fillStyle = '#64748b';
        ctx.font = `${w * 0.05}px Kanit`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('เพิ่มรายชื่อเพื่อเริ่ม', cx, cy);
        return;
    }

    const arcSize = (2 * Math.PI) / names.length;

    // Save context to rotate the whole wheel
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((currentRotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);

    names.forEach((name, i) => {
        const angle = i * arcSize;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, angle, angle + arcSize);
        ctx.fillStyle = colors[i % colors.length];
        ctx.fill();
        ctx.stroke();

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle + arcSize / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "#fff";
        ctx.font = `bold ${Math.min(20, (300 / names.length) + 12)}px Kanit`; // Adaptive font size
        ctx.fillText(name, radius - 20, 6);
        ctx.restore();
    });

    ctx.restore();

    // Draw center circle (The "Hub")
    ctx.beginPath();
    ctx.arc(cx, cy, 30, 0, 2 * Math.PI);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.shadowBlur = 10;
    ctx.shadowColor = "rgba(0,0,0,0.5)";

    // Decorate Hub
    ctx.beginPath();
    ctx.arc(cx, cy, 25, 0, 2 * Math.PI);
    ctx.fillStyle = '#F43F5E';
    ctx.fill();
}

function spinWheel() {
    if (isSpinning || names.length === 0) return;

    isSpinning = true;
    spinBtn.disabled = true;
    addBtn.disabled = true;
    clearListBtn.disabled = true;

    // Pick a winner randomly
    const winnerIndex = Math.floor(Math.random() * names.length);
    currentWinner = names[winnerIndex];

    // Calculate rotation to land on the winner
    // The pointer is at 270 degrees (Top)
    // 0 degrees is usually East.
    // We adjust currentRotation to land specific index at 270deg.

    const arcSize = 360 / names.length;

    // The angle of the start of the winning segment
    const winnerAngle = winnerIndex * arcSize;

    // We want the MIDDLE of the segment to align with 270deg (top pointer)
    // Target Rotation: We need (winnerAngle + arcSize/2 + Rotation) % 360 = 270

    // Add extra spins (5 to 10 full spins)
    const spins = 5 + Math.floor(Math.random() * 5);
    const extraDegrees = spins * 360;

    // Random offset within the segment to avoid landing on lines
    const randomOffset = (Math.random() * 0.8 + 0.1) * arcSize; // 10% to 90% of segment

    // Calculate total needed rotation
    // Pointer is at Top (270deg or -90deg)
    // In Canvas arc: 0=Right, 90=Bottom, 180=Left, 270=Top.
    // Our 'loop' draws index 0 at 0 radians (Right).
    // If we want index 0 to encounter the pointer (Top), we must rotate -90 deg.
    // If we want index i to encounter pointer, we rotate -(90 + i*arc)

    // Let's rely on simple addition:
    // Destination Angle relative to wheel start: 270 (Top Pointer)
    // Center of winner segment: winnerIndex * arcSize + arcSize/2
    // Rotation needed = 270 - (winnerIndex * arcSize + arcSize/2)
    // But we are ADDING rotation, so we need to overshoot.

    const targetRotation = currentRotation + extraDegrees + (360 * names.length); // Ensure positive

    // Calculate exact stop point
    // We can just animate TO a calculated value.
    // Let's recalculate simply:
    // We want final position % 360 such that the winner index is under pointer.
    // Pointer is static at top (-90/270).
    // Segment i spans [i*arc, (i+1)*arc].
    // With rotation R, segment spans [i*arc+R, (i+1)*arc+R].
    // We want 270 to be in [i*arc+R, (i+1)*arc+R] % 360.

    // Let's compute a random R_final that satisfies this.
    // R_final = 270 - (winnerIndex * arcSize) - (Math.random() * arcSize)
    // Add multiple of 360

    const stopAngle = 270 - (winnerIndex * arcSize) - (Math.random() * (arcSize * 0.8) + arcSize * 0.1);

    // We need to move from currentRotation to a value that is congruent to stopAngle mod 360, but much larger
    const currentMod = currentRotation % 360;
    let dist = stopAngle - currentMod;
    if (dist < 0) dist += 360;

    const finalRotation = currentRotation + dist + extraDegrees;

    // Animation
    const duration = 5000; // 5 seconds
    const startTime = performance.now();
    const startRotation = currentRotation;

    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing (EaseOutQuart)
        const ease = 1 - Math.pow(1 - progress, 4);

        currentRotation = startRotation + (finalRotation - startRotation) * ease;
        drawWheel();

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            isSpinning = false;
            spinBtn.disabled = false;
            addBtn.disabled = false;
            clearListBtn.disabled = false;
            announceWinner(currentWinner);
        }
    }

    requestAnimationFrame(animate);
}

function announceWinner(name) {
    if (!name) return;
    winnerNameEl.textContent = name;
    winnerModal.classList.remove('hidden');
    startConfetti();
}

function confirmWinner() {
    winnerModal.classList.add('hidden');
    stopConfetti();

    // Remove the winner
    const index = names.indexOf(currentWinner);
    if (index > -1) {
        names.splice(index, 1);
    }

    // Reset or adjust
    currentWinner = '';
    updateUI();
}

// Global functions
window.removeName = removeName;

// --- Confetti Logic (Simple Implementation) ---
const particles = [];
let confettiActive = false;

function startConfetti() {
    confettiActive = true;
    for (let i = 0; i < 150; i++) {
        particles.push({
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
            vx: (Math.random() - 0.5) * 20,
            vy: (Math.random() - 0.5) * 20,
            size: Math.random() * 8 + 4,
            color: colors[Math.floor(Math.random() * colors.length)],
            gravity: 0.2,
            drag: 0.96
        });
    }
}

function stopConfetti() {
    confettiActive = false;
    particles.length = 0;
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
}

function animateConfetti() {
    if (confettiActive) {
        confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];

            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.vx *= p.drag;
            p.vy *= p.drag;

            confettiCtx.fillStyle = p.color;
            confettiCtx.fillRect(p.x, p.y, p.size, p.size);

            if (p.y > window.innerHeight) {
                particles.splice(i, 1);
            }
        }

        // Continuous flow if active
        // But we just want one burst for now. 
        // If we want continuous, we add more. 
        // Let's do a loop while active.
        if (particles.length < 50 && confettiActive) {
            // Optional: add a few more for sustainable celebration
        }
    }
    requestAnimationFrame(animateConfetti);
}

// Handle Resize
window.addEventListener('resize', () => {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
});

init();
