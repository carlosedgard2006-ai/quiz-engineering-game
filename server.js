const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const questions = require("./data/questions");

const app = express();
const server = http.createServer(app);

// 🔥 PERMITE ACESSO EXTERNO (Render / celular)
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

app.use(express.static("public"));

let rooms = {};

function createRoomCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

io.on("connection", (socket) => {

  socket.on("createRoom", ({ player, mode }) => {

    const code = createRoomCode();

    rooms[code] = {
      players: [],
      questionIndex: 0,
      questions: questions
    };

    rooms[code].players.push({
      id: socket.id,
      name: player.name,
      score: 0,
      answered: false
    });

    socket.join(code);
    socket.emit("roomCreated", code);

    if (mode === "solo") {
      sendQuestion(code);
    }

  });

  socket.on("joinRoom", ({ code, player }) => {

    if (!rooms[code]) return;

    rooms[code].players.push({
      id: socket.id,
      name: player.name,
      score: 0,
      answered: false
    });

    socket.join(code);
  });

  socket.on("startGame", (code) => {
    sendQuestion(code);
  });

  socket.on("answer", ({ code, answer }) => {

    const room = rooms[code];
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    const q = room.questions[room.questionIndex];

    if (!player || !q || player.answered) return;

    const correct =
      String(answer).trim().toLowerCase() ===
      String(q.answer).trim().toLowerCase();

    if (correct) {
      player.score += 10;
    }

    player.answered = true;

    socket.emit("feedback", {
      correct,
      explanation: q.explanation || "Sem explicação.",
      score: player.score
    });

    io.to(code).emit("ranking", room.players);

    const allAnswered = room.players.every(p => p.answered);

    if (allAnswered) {

      setTimeout(() => {

        room.questionIndex++;

        if (room.questionIndex >= room.questions.length) {
          io.to(code).emit("gameOver", room.players);
          return;
        }

        room.players.forEach(p => p.answered = false);

        sendQuestion(code);

      }, 2000);
    }

  });

});

function sendQuestion(code) {

  const room = rooms[code];
  if (!room) return;

  const q = room.questions[room.questionIndex];
  if (!q) return;

  io.to(code).emit("question", {
    question: q.question,
    options: q.options,
    index: room.questionIndex + 1,
    total: room.questions.length
  });

}

// 🔥 CORREÇÃO ESSENCIAL PARA RENDER
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("🔥 servidor rodando na porta " + PORT);
});