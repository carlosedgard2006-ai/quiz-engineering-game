const socket = io(window.location.origin);

let currentRoom = "";
let score = 0;

function getPlayer() {
  return {
    name: document.getElementById("name").value || "Jogador"
  };
}

// 🔥 FUNÇÃO DE NÍVEL
function getNivel(score) {
  if (score >= 85) return "🥇 Excelente (nível engenheiro avançado)";
  if (score >= 70) return "🥈 Muito bom";
  if (score >= 50) return "🥉 Bom";
  return "⚠️ Precisa revisar";
}

function solo() {
  socket.emit("createRoom", {
    player: getPlayer(),
    mode: "solo"
  });
}

function createRoom() {
  socket.emit("createRoom", {
    player: getPlayer(),
    mode: "multi"
  });
}

function joinRoom() {
  const code = document.getElementById("code").value;

  socket.emit("joinRoom", {
    code,
    player: getPlayer()
  });

  currentRoom = code;
}

function startGame() {
  socket.emit("startGame", currentRoom);
}

socket.on("roomCreated", (code) => {
  currentRoom = code;
  document.getElementById("roomCode").innerText = "Sala: " + code;
});

socket.on("question", (q) => {

  document.getElementById("menu").classList.add("hidden");
  document.getElementById("game").classList.remove("hidden");

  document.getElementById("question").innerText =
    `Questão ${q.index}/${q.total}\n${q.question}`;

  const optionsDiv = document.getElementById("options");

  optionsDiv.innerHTML = `
    <h3>⭐ Pontuação: ${score}</h3>
    <h4>${getNivel(score)}</h4>
  `;

  let time = 100;
  const timer = document.getElementById("timer");
  timer.style.width = "100%";

  const interval = setInterval(() => {
    time -= 0.5;
    timer.style.width = time + "%";

    if (time <= 0) clearInterval(interval);
  }, 100);

  q.options.forEach(opt => {
    const btn = document.createElement("button");
    btn.innerText = opt;

    btn.onclick = () => {

      clearInterval(interval);

      document.querySelectorAll("#options button").forEach(b => {
        b.disabled = true;
      });

      socket.emit("answer", {
        code: currentRoom,
        answer: opt
      });

    };

    optionsDiv.appendChild(btn);
  });

});

socket.on("feedback", (data) => {

  const options = document.getElementById("options");

  if (data.correct) {
    score += 10;
  }

  options.innerHTML = `
    <h2>${data.correct ? "✅ Acertou!" : "❌ Errou!"}</h2>
    <h3>⭐ Pontuação: ${score}</h3>
    <h4>${getNivel(score)}</h4>
  `;

});

socket.on("gameOver", (players) => {

  players.sort((a,b) => b.score - a.score);

  let player = players.find(p => p.id === socket.id) || players[0];

  let finalScore = player.score || score;

  let html = "<h1>🏆 Ranking</h1>";

  players.forEach(p => {
    html += `<p>${p.name} - ${p.score}</p>`;
  });

  html += `
    <h2>Sua pontuação: ${finalScore}</h2>
    <h3>${getNivel(finalScore)}</h3>
    <button onclick="location.reload()">Jogar novamente</button>
  `;

  document.body.innerHTML = html;

});