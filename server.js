const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://jogo-indo.fly.dev",
    methods: ["GET", "POST"]
  }
});

app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

let players = [];
let currentTips = [];
let roundData = {}; // Este é o nosso "baú" para a rodada

const initialRoundData = {
    tipperId: null,
    sorterId: null,
    playerAttempts: {},
    playersWhoFinished: {}
};

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
                "NOÇÕES DE ADMINISTRAÇÃO GERAL": [
                    "Planejamento estratégico e sua relevância no mercado",
                    "Liderança e seus impactos na equipe",
                    "A cultura organizacional como vantagem competitiva",
                    "A gestão da inovação e o ciclo de vida da empresa",
                    "A ética e a transparência na governança corporativa"
                ],
                "ORGANIZAÇÃO DE DOCUMENTOS E CORRESPONDÊNCIAS": [
                    "Sistemas de arquivamento digital versus físico",
                    "Protocolos de segurança e confidencialidade de dados",
                    "A gestão eletrônica de documentos (GED) na otimização de processos",
                    "O impacto da desorganização de documentos na produtividade",
                    "A comunicação interna e externa na empresa"
                ],
                "GESTÃO DE PESSOAS": [
                    "Programas de motivação e engajamento da equipe",
                    "Políticas de diversidade, inclusão e equidade",
                    "Criação de um ambiente de trabalho psicologicamente seguro",
                    "Estratégias de retenção de talentos",
                    "Sistemas de feedback e avaliação de desempenho"
                ],
                "NOÇÕES DE DEPARTAMENTO PESSOAL": [
                    "Os desafios do eSocial para o Departamento Pessoal",
                    "A importância da comunicação clara sobre direitos trabalhistas",
                    "Gestão de benefícios corporativos como um diferencial",
                    "Estratégias para a redução do absenteísmo e da rotatividade",
                    "O papel da tecnologia na automação das rotinas de folha de pagamento"
                ],
                "NOÇÕES DE GESTÃO DE PROJETOS": [
                    "O planejamento e o escopo como pilares do projeto",
                    "Análise de riscos e planos de contingência",
                    "Metodologias Ágeis (Scrum, Kanban) e sua aplicação",
                    "A gestão de stakeholders e a comunicação do projeto",
                    "Alocação de recursos e gestão de cronograma"
                ],
                "LEGISLAÇÃO DO SETOR DE TRANSPORTE": [
                    "O impacto da legislação da ANTT nas operações",
                    "Normas sobre jornada de trabalho e descanso de motoristas",
                    "Regulamentação para o transporte de cargas perigosas",
                    "As diferenças legais entre transporte próprio e fretado",
                    "A conformidade ambiental e suas regulamentações"
                ],
                "CUSTOS OPERACIONAIS DO TRANSPORTE": [
                    "Análise de custos fixos e variáveis da frota",
                    "A gestão de combustíveis e a eficiência energética",
                    "O impacto da manutenção preventiva e corretiva",
                    "O uso da tecnologia (telemetria) na otimização de custos",
                    "Estratégias de roteirização para redução de despesas"
                ],
                "VISÃO SISTÊMICA DO TRANSPORTE": [
                    "A interdependência dos modais de transporte",
                    "Estratégias de logística reversa na cadeia de suprimentos",
                    "O papel da sincronia entre os setores para o resultado final",
                    "Integração tecnológica e compartilhamento de informações",
                    "O transporte como vetor de desenvolvimento socioeconômico"
                ],
                "ACESSIBILIDADE E MOBILIDADE URBANA": [
                    "Desafios do transporte público em grandes metrópoles",
                    "A implementação de faixas exclusivas e infraestrutura cicloviária",
                    "O impacto de aplicativos de transporte na mobilidade",
                    "Iniciativas para garantir a acessibilidade de pessoas com deficiência",
                    "O futuro da frota urbana: eletrificação e veículos autônomos"
                ],
                "Relações interpessoais Éticas e Sociais": [ 
                    "A comunicação não-violenta no ambiente de trabalho",
                    "O papel da empatia e do respeito nas relações de equipe",
                    "Gestão de conflitos e a busca por soluções construtivas",
                    "A ética no uso de informações confidenciais",
                    "Responsabilidade social corporativa (RSC) e seu impacto na comunidade"
                ],
                "Saúde segurança e Meio Ambiente com Qualidade de Vida": [ 
                    "Programas de ginástica laboral e ergonomia",
                    "A cultura de segurança do trabalho e a prevenção de acidentes",
                    "Iniciativas para o bem-estar mental dos colaboradores",
                    "Práticas de sustentabilidade e a gestão de resíduos",
                    "A importância da qualidade de vida na produtividade"
                ],
                "Noções de Educação Financeira": [ 
                    "Organização do orçamento pessoal e familiar",
                    "Estratégias de investimento de curto e longo prazo",
                    "Gestão de dívidas e o impacto no bem-estar",
                    "O planejamento financeiro para a aposentadoria",
                    "A diferença entre poupança e investimento"
                ],
                "Inovação, Tecnologia e economia 4.0": [ 
                    "O uso de Inteligência Artificial e Machine Learning",
                    "A cultura de inovação e o intraempreendedorismo",
                    "Impacto da automação na força de trabalho",
                    "Sistemas de cibersegurança e proteção de dados",
                    "Big Data e a tomada de decisão baseada em dados"
                ]
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

        // SE FOR A PRIMEIRA DICA DA RODADA, GUARDAMOS QUEM A ENVIOU
        if (currentTips.length === 0) {
            roundData.tipperId = player.id; // Anotando o ID do Doador da Rodada
        }

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
    // Agora, em vez de escolher UM ordenador, preparamos as dicas para TODOS.
    const shuffledTips = [...currentTips].sort(() => Math.random() - 0.5).map(t => t.tip);
    
    // E enviamos um novo evento chamado 'startSortingPhase' para TODO MUNDO.
    io.emit('startSortingPhase', shuffledTips);
});
   
socket.on('checkOrder', ({ orderedTips }) => {
    const player = players.find(p => p.id === socket.id);
    if (!player || roundData.playersWhoFinished[player.id]) {
        return; // Ignora se o jogador não existe ou já terminou suas tentativas
    }

    // Gerencia as tentativas INDIVIDUALMENTE
    if (roundData.playerAttempts[player.id] === undefined) {
        roundData.playerAttempts[player.id] = 3;
    }
    roundData.playerAttempts[player.id]--;
    const attemptsLeft = roundData.playerAttempts[player.id];

    const correctOrder = [...currentTips].sort((a, b) => a.number - b.number).map(t => t.tip);
    const isCorrect = orderedTips.length === correctOrder.length && orderedTips.every((value, index) => value === correctOrder[index]);

    let points = 0;
    if (isCorrect) {
        // Lógica de pontuação baseada na tentativa
        if (attemptsLeft === 2) points = 30; // Acertou na 1ª tentativa
        if (attemptsLeft === 1) points = 20; // Acertou na 2ª
        if (attemptsLeft === 0) points = 10; // Acertou na 3ª
        player.score += points;
        roundData.playersWhoFinished[player.id] = true; // Marca que este jogador acertou
    }

    // Marca que o jogador terminou se acabaram as tentativas
    if (attemptsLeft === 0) {
        roundData.playersWhoFinished[player.id] = true;
    }

    const rankedPlayers = [...players].sort((a, b) => b.score - a.score);

    // Envia um resultado PARCIAL apenas para o jogador que tentou
    socket.emit('orderResult', { isCorrect, points, attemptsLeft, players: rankedPlayers });

    // VERIFICA SE TODOS OS JOGADORES TERMINARAM
    const activePlayers = players.length;
    if (Object.keys(roundData.playersWhoFinished).length === activePlayers) {
        // SE SIM, ENVIA O RESULTADO FINAL PARA TODO MUNDO
        const historyHtml = [...currentTips].sort((a,b) => a.number - b.number).map(t => `<li><b>${t.number}</b> - ${t.tip} <i>(${t.player.name})</i></li>`).join('');
        io.emit('roundOver', { historyHtml, players: rankedPlayers });
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




