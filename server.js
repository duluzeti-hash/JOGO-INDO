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

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

let players = [];
let currentTips = [];

// Eventos de Socket.IO
io.on('connection', (socket) => {
  console.log('--- NOVO JOGADOR CONECTADO --- ID:', socket.id);
  socket.emit('updatePlayers', players);

  // LINHA DE DEPURAÇÃO: Mostra QUALQUER mensagem que o servidor receber
  socket.onAny((eventName, ...args) => {
    console.log(`--- MENSAGEM RECEBIDA --- Evento: ${eventName}`, args);
  });

  socket.on('addPlayer', (playerData) => {
    console.log('--- EVENTO addPlayer RECONHECIDO ---', playerData);
    const nameExists = players.some(p => p.name.toLowerCase() === playerData.name.toLowerCase());
    if (nameExists) {
        socket.emit('message', { type: 'error', title: 'Atenção!', text: 'Este nome já está cadastrado.' });
        return;
    }
    const newPlayer = { id: socket.id, name: playerData.name };
    players.push(newPlayer);
    io.emit('updatePlayers', players);
    console.log(`Jogador adicionado: ${playerData.name}. Jogadores totais:`, players.length);
  });
  
  socket.on('resetPlayers', () => {
    players = [];
    currentTips = []; 
    console.log('A lista de jogadores foi resetada.');
    io.emit('updatePlayers', players);
    io.emit('updateTips', []);
  });

  socket.on('startGame', (gameData) => {
    console.log('Pedido para iniciar o jogo recebido.');
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

    io.emit('gameStarted', { categoria, tema });
    console.log(`Jogo iniciado! Categoria: ${categoria}, Tema: ${tema}`);
  });
  
  socket.on('sendTip', (tipData) => {
    currentTips.push(tipData);
    console.log(`Dica recebida de ${tipData.player.name}: ${tipData.tip}`);
    // Transmite a lista de dicas atualizada para todos os clientes
    io.emit('updateTips', currentTips);
  });

  socket.on('disconnect', () => {
    console.log('Um jogador se desconectou. ID:', socket.id);

    const playerLeft = players.find(p => p.id === socket.id);
    if (playerLeft) {
      players = players.filter(p => p.id !== socket.id);
      console.log(`Jogador ${playerLeft.name} saiu da sala.`);
      io.emit('updatePlayers', players);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});