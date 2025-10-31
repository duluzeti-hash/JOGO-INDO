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

function resetRoundState() {
    currentTips = [];
    roundData = {
        playerAttempts: {},
        playersWhoFinished: {}
    };
}

io.on('connection', (socket) => {
    socket.emit('updatePlayers', players);

    socket.on('addPlayer', ({ name }) => {
        if (players.length < 8 && !players.some(p => p.id === socket.id)) {
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
        const gameInfo = (data.tema === 'aleatorio') ? temas[Math.floor(Math.random() * temas.length)] : { categoria: data.categoria, tema: data.tema };
        io.emit('gameStarted', gameInfo);
    });

    socket.on('requestNextTipper', () => {
        if (currentTips.length < players.length) {
            io.emit('nextTipper', players[currentTips.length]);
        } else {
            const shuffledTips = [...currentTips].sort(() => Math.random() - 0.5).map(t => t.tip);
            io.emit('startSortingPhase', shuffledTips);
        }
    });

    socket.on('sendTip', (tipData) => {
        const player = players.find(p => p.id === socket.id);
        if (player) {
            currentTips.push({ ...tipData, player: { id: socket.id, name: player.name } });
            if (currentTips.length < players.length) {
                io.emit('nextTipper', players[currentTips.length]);
            } else {
                const shuffledTips = [...currentTips].sort(() => Math.random() - 0.5).map(t => t.tip);
                io.emit('startSortingPhase', shuffledTips);
            }
        }
    });

    socket.on('checkOrder', ({ orderedTips }) => {
    const player = players.find(p => p.id === socket.id);
    if (!player || roundData.playersWhoFinished[player.id]) return;

    if (roundData.playerAttempts[player.id] === undefined) {
        roundData.playerAttempts[player.id] = 3;
    }
    roundData.playerAttempts[player.id]--;
    const attemptsLeft = roundData.playerAttempts[player.id];

    const correctOrder = [...currentTips].sort((a, b) => a.number - b.number).map(t => t.tip);
    const isCorrect = orderedTips.every((value, index) => value === correctOrder[index]);

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
    const everyoneFinished = Object.keys(roundData.playersWhoFinished).length === players.length;

    const resultPayload = { isCorrect, points, attemptsLeft, players: rankedPlayers };

    if (everyoneFinished) {
        // ===== A ÚNICA LINHA CORRIGIDA ESTÁ AQUI =====
        const historyHtml = [...currentTips].sort((a, b) => a.number - b.number).map((tip, index) => `<li data-numero="${index + 1}"><b>${tip.tip}</b> <i>(Nº ${tip.number} por ${tip.player.name})</i></li>`).join('');
        // ===== FIM DA CORREÇÃO =====

        io.emit('roundOver', { historyHtml, players: rankedPlayers, lastPlayerResult: { ...resultPayload, id: player.id } });
    } else {
        socket.emit('orderResult', resultPayload);
    }
});

    socket.on('disconnect', () => {
        players = players.filter(p => p.id !== socket.id);
        io.emit('updatePlayers', players);
    });
});

server.listen(PORT, () => {
    console.log(`[SERVIDOR] Servidor rodando na porta ${PORT}`);
});

