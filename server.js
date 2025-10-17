const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

let players = [];
let currentTips = [];
let roundData = { sorterIndex: -1 };

io.on('connection', (socket) => {
    console.log('[SERVIDOR] Novo jogador conectado:', socket.id);
    socket.emit('updatePlayers', players);

    socket.on('addPlayer', (playerData) => {
        const nameExists = players.some(p => p.name.toLowerCase() === playerData.name.toLowerCase());
        if (nameExists) {
            return socket.emit('message', { type: 'error', title: 'Atenção!', text: 'Este nome já está cadastrado.' });
        }
        const newPlayer = { id: socket.id, name: playerData.name, score: 0 };
        players.push(newPlayer);
        io.emit('updatePlayers', players);
    });

    socket.on('resetPlayers', () => {
        players.forEach(p => p.score = 0);
        currentTips = [];
        roundData = { sorterIndex: -1 };
        io.emit('resetGame');
    });

    socket.on('startGame', (gameData) => {
        currentTips = [];
        let categoria, tema;
        if (gameData.tema === 'aleatorio') {
            const temasPorCategoria = {
                "NOÇÕES DE ADMINISTRAÇÃO GERAL": ["Planejamento estratégico", "Liderança e equipe", "Cultura organizacional", "Gestão da inovação", "Governança corporativa"],
                "ORGANIZAÇÃO DE DOCUMENTOS": ["Arquivamento digital vs físico", "Segurança de dados", "Gestão eletrônica (GED)", "Impacto da desorganização", "Comunicação interna e externa"],
                "GESTÃO DE PESSOAS": ["Motivação e engajamento", "Diversidade e inclusão", "Ambiente de trabalho seguro", "Retenção de talentos", "Feedback e avaliação"],
                "DEPARTAMENTO PESSOAL": ["Desafios do eSocial", "Direitos trabalhistas", "Gestão de benefícios", "Redução de absenteísmo", "Automação da folha"],
                "GESTÃO DE PROJETOS": ["Planejamento e escopo", "Análise de riscos", "Metodologias Ágeis", "Gestão de stakeholders", "Recursos e cronograma"],
                "LEGISLAÇÃO DE TRANSPORTE": ["Legislação da ANTT", "Jornada de motoristas", "Cargas perigosas", "Transporte próprio vs fretado", "Conformidade ambiental"],
                "CUSTOS DE TRANSPORTE": ["Custos fixos e variáveis", "Gestão de combustíveis", "Manutenção preventiva", "Uso de telemetria", "Roteirização e despesas"],
                "VISÃO SISTÊMICA DO TRANSPORTE": ["Interdependência de modais", "Logística reversa", "Sincronia entre setores", "Integração tecnológica", "Transporte e desenvolvimento"],
                "MOBILIDADE URBANA": ["Desafios do transporte público", "Faixas exclusivas e ciclovias", "Impacto de aplicativos", "Acessibilidade", "Eletrificação e autônomos"],
                "RELAÇÕES INTERPESSOAIS": ["Comunicação não-violenta", "Empatia e respeito", "Gestão de conflitos", "Ética e confidencialidade", "Responsabilidade social"],
                "SAÚDE E SEGURANÇA": ["Ginástica laboral e ergonomia", "Prevenção de acidentes", "Bem-estar mental", "Sustentabilidade e resíduos", "Qualidade de vida"],
                "EDUCAÇÃO FINANCEIRA": ["Orçamento pessoal", "Investimento de curto e longo prazo", "Gestão de dívidas", "Planejamento para aposentadoria", "Poupança vs investimento"],
                "INOVAÇÃO E TECNOLOGIA": ["Inteligência Artificial", "Cultura de inovação", "Impacto da automação", "Cibersegurança", "Big Data e decisões"]
            };
            const categorias = Object.keys(temasPorCategoria);
            const categoriaSorteada = categorias[Math.floor(Math.random() * categorias.length)];
            const temasDaCategoria = temasPorCategoria[categoriaSorteada];
            const temaSorteado = temasDaCategoria[Math.floor(Math.random() * temasDaCategoria.length)];
            categoria = categoriaSorteada;
            tema = temaSorteado;
        } else {
            categoria = gameData.categoria;
            tema = gameData.tema;
        }
        roundData.sorterIndex = (roundData.sorterIndex + 1) % players.length;
        roundData.attemptsLeft = 3;
        io.emit('gameStarted', { categoria, tema });
    });

    socket.on('requestNextTipper', () => {
        if (currentTips.length < players.length) {
            const nextTipper = players[currentTips.length];
            io.emit('nextTipper', nextTipper);
        } else {
            const sortedTips = [...currentTips].sort((a, b) => a.number - b.number);
            io.emit('allTipsReceived', sortedTips);
        }
    });

    socket.on('sendTip', (tipData) => {
        const player = players.find(p => p.id === socket.id);
        if (!player) return;

        const newTip = { ...tipData, player: { name: player.name, id: player.id } };
        currentTips.push(newTip);
        
        if (currentTips.length < players.length) {
            const nextTipper = players[currentTips.length];
            io.emit('nextTipper', nextTipper);
        } else {
            const sortedTips = [...currentTips].sort((a, b) => a.number - b.number);
            io.emit('allTipsReceived', sortedTips);
        }
    });

    socket.on('requestSorter', () => {
        const sorter = players[roundData.sorterIndex];
        const shuffledTips = [...currentTips].sort(() => Math.random() - 0.5).map(t => t.tip);
        io.emit('updateSorter', sorter, shuffledTips);
    });

    socket.on('checkOrder', ({ orderedTips }) => {
        roundData.attemptsLeft--;
        
        const correctOrder = [...currentTips].sort((a, b) => a.number - b.number).map(t => t.tip);
        let isCorrect = orderedTips.length === correctOrder.length && orderedTips.every((value, index) => value === correctOrder[index]);
        
        const historyHtml = [...currentTips].sort((a,b) => a.number - b.number).map(t => `<li><b>${t.number}</b> - ${t.tip} <i>(${t.player.name})</i></li>`).join('');
        const points = isCorrect ? (roundData.attemptsLeft + 1) * 10 : 0;
        
        const sorterPlayer = players.find(p => p.id === socket.id);
        if (isCorrect && sorterPlayer) {
            sorterPlayer.score += points;
        }
        
        const rankedPlayers = [...players].sort((a, b) => b.score - a.score);

        if (isCorrect || roundData.attemptsLeft === 0) {
            io.emit('orderResult', { isCorrect, points, attemptsLeft: 0, historyHtml, players: rankedPlayers, sorterId: socket.id });
        } else {
            socket.emit('orderResult', { isCorrect: false, attemptsLeft: roundData.attemptsLeft, players: rankedPlayers, sorterId: socket.id });
        }
    });

    socket.on('disconnect', () => {
        const playerLeft = players.find(p => p.id === socket.id);
        if (playerLeft) {
            players = players.filter(p => p.id !== socket.id);
            io.emit('updatePlayers', players);
        }
    });
});

server.listen(PORT, () => {
    console.log(`[SERVIDOR] Servidor rodando na porta ${PORT}`);
});
