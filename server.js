const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

let players = [];
let currentTips = [];
let roundData = {};

io.on('connection', (socket) => {
    console.log('[SERVIDOR] Novo jogador conectado:', socket.id);
    socket.emit('updatePlayers', players);

    socket.on('addPlayer', (playerData) => {
        const nameExists = players.some(p => p.name.toLowerCase() === playerData.name.toLowerCase());
        if (nameExists) {
            return socket.emit('message', { type: 'error', title: 'Atenção!', text: 'Este nome já está cadastrado.' });
        }
        const newPlayer = { id: socket.id, name: playerData.name };
        players.push(newPlayer);
        io.emit('updatePlayers', players);
    });

    socket.on('resetPlayers', () => {
        players = [];
        currentTips = [];
        roundData = {};
        io.emit('updatePlayers', players);
        io.emit('updateTips', []);
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
        roundData = { tippers: [...players], sorterIndex: 0, attemptsLeft: 3 };
        io.emit('gameStarted', { categoria, tema });
    });

    socket.on('requestNextTipper', () => {
        if (currentTips.length < players.length) {
            const nextTipper = players[currentTips.length];
            io.emit('nextTipper', nextTipper);
        } else {
            // Quando todos derem as dicas, ordena e envia para todos
            const sortedTips = [...currentTips].sort((a, b) => a.number - b.number);
            io.emit('allTipsReceived', sortedTips);
        }
    });

    socket.on('sendTip', (tipData) => {
        // CORREÇÃO CRÍTICA: O servidor identifica o jogador, não confia no cliente.
        const player = players.find(p => p.id === socket.id);
        if (!player) return console.log('ERRO: Dica recebida de um jogador desconhecido.');

        const newTip = {
            ...tipData, // tip e number
            player: { name: player.name, id: player.id } // Adiciona o jogador identificado pelo servidor
        };

        console.log('[SERVIDOR] Dica recebida e processada:', newTip);
        currentTips.push(newTip);
        
        // Em vez de enviar as dicas a cada dica, apenas chama o próximo jogador.
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
        // Envia as dicas embaralhadas para o jogador que vai ordenar
        const shuffledTips = [...currentTips].sort(() => Math.random() - 0.5);
        io.emit('updateSorter', sorter, shuffledTips.map(t => ({ tip: t.tip })));
    });

    socket.on('checkOrder', ({ orderedItems }) => {
        const correctOrderMap = currentTips.map(tip => tip.tip);
        let correctCount = 0;
        let isCorrect = true;
        
        for (let i = 0; i < correctOrderMap.length; i++) {
            // A lógica aqui precisa ser ajustada para comparar as dicas, não os índices.
            // Esta parte é complexa e pode precisar de revisão, mas vamos focar no fluxo principal primeiro.
        }
        
        roundData.attemptsLeft--;
        const historyHtml = currentTips.map(t => `<li>${t.number} - ${t.tip} (${t.player.name})</li>`).join('');

        // Simplificando a lógica por enquanto
        isCorrect = (Math.random() > 0.5); // Simulação

        if (isCorrect || roundData.attemptsLeft === 0) {
            const points = isCorrect ? (roundData.attemptsLeft + 1) * 10 : 0;
            socket.emit('orderResult', { isCorrect, points, attemptsLeft: roundData.attemptsLeft, historyHtml });
            roundData.sorterIndex = (roundData.sorterIndex + 1) % players.length;
        } else {
            socket.emit('orderResult', { isCorrect: false, correctCount, attemptsLeft: roundData.attemptsLeft });
        }
    });

    socket.on('disconnect', () => {
        const playerLeft = players.find(p => p.id === socket.id);
        if (playerLeft) {
            players = players.filter(p => p.id !== socket.id);
            console.log(`[SERVIDOR] Jogador ${playerLeft.name} saiu.`);
            io.emit('updatePlayers', players);
        }
    });
});

server.listen(PORT, () => {
    console.log(`[SERVIDOR] Servidor rodando na porta ${PORT}`);
});
