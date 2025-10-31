const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["https://jogo-indo.fly.dev", "http://localhost:3000"],
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, 'public')));

let players = [];
let currentTips = [];
let roundData = {};

const temas = [
  { categoria: "CUSTOS OPERACIONAIS", tema: "O impacto da flutuação do preço do diesel na planilha de frete" },
  { categoria: "CUSTOS OPERACIONAIS", tema: "Manutenção preventiva vs. corretiva: qual reduz mais os gastos?" },
  { categoria: "CUSTOS OPERACIONAIS", tema: "Custo real de pedágios em rotas de longa distância no Brasil" },
  { categoria: "GESTÃO FINANCEIRA", tema: "Como calcular o ponto de equilíbrio de um veículo de carga" },
  { categoria: "TRIBUTAÇÃO", tema: "Impacto de impostos como ICMS e IPI no valor final do frete" },
  { categoria: "GESTÃO DE PESSOAS", tema: "Estratégias para reduzir o turnover (rotatividade) de motoristas" },
  { categoria: "GESTÃO DE PESSOAS", tema: "A importância do treinamento e capacitação contínua para a equipe" },
  { categoria: "LEGISLAÇÃO TRABALHISTA", tema: "Lei do Descanso: como cumprir a jornada de trabalho do motorista sem perder produtividade" },
  { categoria: "TECNOLOGIA", tema: "O papel da Telemetria na redução de custos e aumento da segurança" },
  { categoria: "TECNOLOGIA", tema: "Benefícios da roteirização inteligente para otimização de entregas" },
  { categoria: "INOVAÇÃO", tema: "O futuro dos caminhões autônomos e o impacto no mercado de trabalho" },
  { categoria: "LEGISLAÇÃO", tema: "Principais exigências da ANTT para o transporte de cargas" },
  { categoria: "SEGURANÇA", tema: "Tecnologias e estratégias eficazes para a prevenção de roubo de cargas" },
  { categoria: "SEGURANÇA", tema: "A relação entre a fadiga do motorista e o risco de acidentes" },
  { categoria: "SEGURANÇA", tema: "Regras para o transporte de cargas perigosas (produtos químicos, inflamáveis)" },
  { categoria: "LOGÍSTICA VERDE", tema: "Práticas de ESG (Ambiental, Social e Governança) no setor de transportes" },
  { categoria: "LOGÍSTICA REVERSA", tema: "Os desafios de coletar e transportar produtos pós-consumo" },
  { categoria: "INFRAESTRUTURA", tema: "O impacto da má condição das estradas brasileiras na operação logística" },
  { categoria: "ESTRATÉGIA", tema: "Vantagens e desvantagens da terceirização de frota" },
  { categoria: "ESTRATÉGIA", tema: "Como a logística 'last mile' (última milha) impacta a satisfação do cliente" }
];

// ---------- FUNÇÃO DE RESET ----------
function resetRoundState(total = null) {
  currentTips = [];
  roundData = {
    playerAttempts: {},
    playersWhoFinished: {},
    totalPlayers: total
  };
}

// ---------- SOCKET.IO ----------
io.on('connection', (socket) => {
  socket.emit('updatePlayers', players);

  // Adicionar jogador
  socket.on('addPlayer', ({ name }) => {
    if (players.length < 8 && !players.some(p => p.id === socket.id)) {
      const newPlayer = { id: socket.id, name, score: 0 };
      players.push(newPlayer);
      io.emit('updatePlayers', players);
    }
  });

  // Resetar jogadores
  socket.on('resetPlayers', () => {
    players = [];
    resetRoundState();
    io.emit('resetGame');
  });

  // Iniciar o jogo
  socket.on('startGame', (data) => {
    resetRoundState(players.length);
    const gameInfo = (data.tema === 'aleatorio')
      ? temas[Math.floor(Math.random() * temas.length)]
      : { categoria: data.categoria, tema: data.tema };
    io.emit('gameStarted', gameInfo);
  });

  // Solicitar próximo jogador a dar dica
  socket.on('requestNextTipper', () => {
    if (currentTips.length < players.length) {
      io.emit('nextTipper', players[currentTips.length]);
    } else {
      const shuffledTips = [...currentTips].sort(() => Math.random() - 0.5).map(t => t.tip);
      io.emit('startSortingPhase', shuffledTips);
    }
  });

  // Receber dica do jogador
  socket.on('sendTip', (tipData) => {
    const player = players.find(p => p.id === socket.id);
    if (player) {
      const number = currentTips.length + 1; // garante numeração
      currentTips.push({ ...tipData, number, player: { id: socket.id, name: player.name } });

      if (currentTips.length < players.length) {
        io.emit('nextTipper', players[currentTips.length]);
      } else {
        const shuffledTips = [...currentTips].sort(() => Math.random() - 0.5).map(t => t.tip);
        io.emit('startSortingPhase', shuffledTips);
      }
    }
  });

  // Verificar ordem das dicas
  socket.on('checkOrder', ({ orderedTips }) => {
    const player = players.find(p => p.id === socket.id);
    if (!player || roundData.playersWhoFinished[player.id]) return;

    if (roundData.playerAttempts[player.id] === undefined) {
      roundData.playerAttempts[player.id] = 3;
    }
    roundData.playerAttempts[player.id]--;
    const attemptsLeft = roundData.playerAttempts[player.id];

    // Ordem correta
    const correctOrderObjects = [...currentTips].sort((a, b) => a.number - b.number);
    const correctOrderText = correctOrderObjects.map(t => t.tip);

    const normalize = s => (s || '').trim().normalize('NFC');
    const isCorrect = orderedTips.every((v, i) => normalize(v) === normalize(correctOrderText[i]));

    let points = 0;
    if (isCorrect) {
      if (attemptsLeft === 2) points = 30;
      else if (attemptsLeft === 1) points = 20;
      else if (attemptsLeft === 0) points = 10;
      player.score += points;
    }

    if (isCorrect || attemptsLeft === 0) {
      roundData.playersWhoFinished[player.id] = true;
    }

    const rankedPlayers = [...players].sort((a, b) => b.score - a.score);
    const everyoneFinished = Object.keys(roundData.playersWhoFinished).length === roundData.totalPlayers;

    const resultPayload = { isCorrect, points, attemptsLeft, players: rankedPlayers };

    if (everyoneFinished) {
      const historyObjects = correctOrderObjects.map(t => ({
        number: t.number,
        tip: t.tip,
        playerName: t.player.name
      }));

      const historyHtml = historyObjects.map(t =>
        `<li data-numero="${t.number}"><b>${t.tip}</b> <i>(Nº ${t.number} por ${t.playerName})</i></li>`
      ).join('');

      io.emit('roundOver', {
        historyHtml,
        historyObjects,
        players: rankedPlayers,
        lastPlayerResult: { ...resultPayload, id: player.id }
      });
    } else {
      socket.emit('orderResult', resultPayload);
    }
  });

  // Quando alguém desconectar
  socket.on('disconnect', () => {
    players = players.filter(p => p.id !== socket.id);
    if (roundData.totalPlayers) {
      roundData.totalPlayers = Math.max(0, roundData.totalPlayers - 1);
    }
    io.emit('updatePlayers', players);
  });
});

server.listen(PORT, () => {
  console.log(`[SERVIDOR] Rodando na porta ${PORT}`);
});
