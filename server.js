const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://jogo-indo.fly.dev",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, 'public')));

let players = [];
let currentTips = [];
let roundData = {};

const temas = [
    { categoria: "CUSTOS OPERACIONAIS", tema: "O impacto da manutenção preventiva e corretiva" },
    { categoria: "GESTÃO DE FROTAS", tema: "Tecnologias de rastreamento e monitoramento" },
    { categoria: "LOGÍSTICA REVERSA", tema: "Desafios e oportunidades no retorno de embalagens" },
    { categoria: "LEGISLAÇÃO DO SETOR", tema: "Normas sobre o tempo de direção e descanso do motorista" },
    { categoria: "SEGURANÇA NO TRANSPORTE", tema: "Medidas para prevenção de roubo de cargas" }
];

function resetRoundState() {
    currentTips = [];
    roundData = {
        playersWhoFinished: {}
    };
}

io.on('connection', (socket) => {
    console.log(`[SERVIDOR] Novo jogador conectado: ${socket.id}`);
    socket.emit('updatePlayers', players);

    socket.on('addPlayer', ({ name }) => {
        if (players.length < 8) {
            const newPlayer = { id: socket.id, name, score: 0 };
            players.push(newPlayer);
            io.emit('updatePlayers', players);
        }
    });

    socket.on('resetPlayers', () => {
        players = [];
        resetRoundState();
        io.emit('resetGame');
    });

    socket.on('startGame', (data) => {
        resetRoundState();
        let gameInfo = {};
        if (data.tema === 'aleatorio') {
            gameInfo = temas[Math.floor(Math.random() * temas.length)];
        } else {
            gameInfo = { categoria: data.categoria, tema: data.tema };
        }
        io.emit('gameStarted', gameInfo);
    });

    socket.on('requestNextTipper', () => {
        if (currentTips.length < players.length) {
            const nextTipper = players[currentTips.length];
            io.emit('nextTipper', nextTipper);
        } else {
            const shuffledTips = [...currentTips].sort(() => Math.random() - 0.5).map(t => t.tip);
            io.emit('startSortingPhase', shuffledTips);
        }
    });

    socket.on('sendTip', (tipData) => {
        const player = players.find(p => p.id === socket.id);
        if (player) {
            currentTips.push({ ...tipData, player: { name: player.name, id: player.id } });
            if (currentTips.length < players.length) {
                const nextTipper = players[currentTips.length];
                io.emit('nextTipper', nextTipper);
            } else {
                const shuffledTips = [...currentTips].sort(() => Math.random() - 0.5).map(t => t.tip);
                io.emit('startSortingPhase', shuffledTips);
            }
        }
    });

    socket.on('checkOrder', ({ orderedTips }) => {
        const player = players.find(p => p.id === socket.id);
        if (!player) return;

        const correctOrder = [...currentTips].sort((a, b) => a.number - b.number).map(t => t.tip);
        const isCorrect = orderedTips.every((value, index) => value === correctOrder[index]);

        if (isCorrect) {
            player.score += 30;
        }

        roundData.playersWhoFinished[player.id] = true;
        const rankedPlayers = [...players].sort((a, b) => b.score - a.score);
        socket.emit('orderResult', { isCorrect, players: rankedPlayers });

        if (Object.keys(roundData.playersWhoFinished).length === players.length) {
            const historyHtml = correctOrder.map(tip => `<li>${tip}</li>`).join('');
            io.emit('roundOver', { historyHtml, players: rankedPlayers });
        }
    });

    socket.on('disconnect', () => {
        players = players.filter(p => p.id !== socket.id);
        io.emit('updatePlayers', players);
        console.log(`[SERVIDOR] Jogador desconectado: ${socket.id}`);
    });
});

server.listen(PORT, () => {
    console.log(`[SERVIDOR] Servidor rodando na porta ${PORT}`);
});
