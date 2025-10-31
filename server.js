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
  { categoria: "CUSTOS OPERACIONAIS", tema: "Analisar o impacto da variação do preço do diesel nos custos logísticos" },
  { categoria: "CUSTOS OPERACIONAIS", tema: "Comparar resultados entre manutenção preventiva e corretiva" },
  { categoria: "CUSTOS OPERACIONAIS", tema: "Calcular o custo total de pedágios em rotas de longa distância" },
  { categoria: "CUSTOS OPERACIONAIS", tema: "Controlar gastos com pneus e peças de reposição" },
  { categoria: "CUSTOS OPERACIONAIS", tema: "Planejar a redução de consumo de combustível por rota" },

  { categoria: "GESTÃO FINANCEIRA", tema: "Determinar o ponto de equilíbrio operacional de uma frota" },
  { categoria: "GESTÃO FINANCEIRA", tema: "Gerenciar o fluxo de caixa em operações logísticas" },
  { categoria: "GESTÃO FINANCEIRA", tema: "Avaliar o retorno sobre investimento em novos veículos" },
  { categoria: "GESTÃO FINANCEIRA", tema: "Estimar custos fixos e variáveis de transporte" },
  { categoria: "GESTÃO FINANCEIRA", tema: "Monitorar indicadores de rentabilidade por cliente" },

  { categoria: "TRIBUTAÇÃO", tema: "Compreender o impacto do ICMS no preço do frete" },
  { categoria: "TRIBUTAÇÃO", tema: "Interpretar benefícios fiscais regionais para o transporte" },
  { categoria: "TRIBUTAÇÃO", tema: "Planejar a recuperação de créditos tributários" },
  { categoria: "TRIBUTAÇÃO", tema: "Controlar notas fiscais e obrigações acessórias" },
  { categoria: "TRIBUTAÇÃO", tema: "Reduzir riscos de autuações fiscais no transporte rodoviário" },

  { categoria: "GESTÃO DE PESSOAS", tema: "Implementar ações para reduzir a rotatividade de motoristas" },
  { categoria: "GESTÃO DE PESSOAS", tema: "Promover programas de capacitação contínua" },
  { categoria: "GESTÃO DE PESSOAS", tema: "Motivar equipes em ambientes de alta pressão" },
  { categoria: "GESTÃO DE PESSOAS", tema: "Desenvolver lideranças operacionais no setor" },
  { categoria: "GESTÃO DE PESSOAS", tema: "Gerenciar conflitos entre equipe administrativa e operacional" },

  { categoria: "LEGISLAÇÃO TRABALHISTA", tema: "Cumprir a Lei do Descanso de forma eficiente" },
  { categoria: "LEGISLAÇÃO TRABALHISTA", tema: "Adequar contratos de trabalho às novas regras da CLT" },
  { categoria: "LEGISLAÇÃO TRABALHISTA", tema: "Aplicar normas de segurança e saúde ocupacional" },
  { categoria: "LEGISLAÇÃO TRABALHISTA", tema: "Controlar a jornada de motoristas com sistemas digitais" },
  { categoria: "LEGISLAÇÃO TRABALHISTA", tema: "Garantir conformidade com normas do eSocial" },

  { categoria: "TECNOLOGIA", tema: "Utilizar telemetria para reduzir custos e melhorar segurança" },
  { categoria: "TECNOLOGIA", tema: "Adotar roteirização inteligente para otimizar entregas" },
  { categoria: "TECNOLOGIA", tema: "Integrar sistemas ERP e logística para maior eficiência" },
  { categoria: "TECNOLOGIA", tema: "Aplicar inteligência artificial na gestão de frotas" },
  { categoria: "TECNOLOGIA", tema: "Automatizar processos administrativos no transporte" },

  { categoria: "INOVAÇÃO", tema: "Explorar tendências em veículos elétricos e híbridos" },
  { categoria: "INOVAÇÃO", tema: "Testar o uso de caminhões autônomos em rotas controladas" },
  { categoria: "INOVAÇÃO", tema: "Criar soluções para logística urbana inteligente" },
  { categoria: "INOVAÇÃO", tema: "Desenvolver aplicativos internos para comunicação entre motoristas" },
  { categoria: "INOVAÇÃO", tema: "Aproveitar dados para tomada de decisão estratégica" },

  { categoria: "LEGISLAÇÃO", tema: "Cumprir exigências da ANTT para transporte de cargas" },
  { categoria: "LEGISLAÇÃO", tema: "Atender normas ambientais aplicáveis ao transporte" },
  { categoria: "LEGISLAÇÃO", tema: "Respeitar regulamentos de transporte de produtos perigosos" },
  { categoria: "LEGISLAÇÃO", tema: "Regularizar licenças e certificados operacionais" },
  { categoria: "LEGISLAÇÃO", tema: "Manter conformidade documental nas fiscalizações de estrada" },

  { categoria: "SEGURANÇA", tema: "Implementar medidas de prevenção contra roubo de cargas" },
  { categoria: "SEGURANÇA", tema: "Controlar a fadiga do motorista para evitar acidentes" },
  { categoria: "SEGURANÇA", tema: "Inspecionar veículos antes de viagens" },
  { categoria: "SEGURANÇA", tema: "Capacitar equipes para atuação em emergências" },
  { categoria: "SEGURANÇA", tema: "Gerenciar incidentes e quase-acidentes na operação" },

  { categoria: "LOGÍSTICA VERDE", tema: "Aplicar princípios de ESG no transporte" },
  { categoria: "LOGÍSTICA VERDE", tema: "Reduzir emissões de CO2 nas operações logísticas" },
  { categoria: "LOGÍSTICA VERDE", tema: "Reaproveitar materiais e embalagens de transporte" },
  { categoria: "LOGÍSTICA VERDE", tema: "Implementar logística de baixo impacto ambiental" },
  { categoria: "LOGÍSTICA VERDE", tema: "Engajar motoristas em práticas sustentáveis" },

  { categoria: "LOGÍSTICA REVERSA", tema: "Coletar e transportar produtos pós-consumo com eficiência" },
  { categoria: "LOGÍSTICA REVERSA", tema: "Gerenciar devoluções e trocas de produtos danificados" },
  { categoria: "LOGÍSTICA REVERSA", tema: "Integrar sistemas de rastreio para retorno de materiais" },
  { categoria: "LOGÍSTICA REVERSA", tema: "Aproveitar resíduos como insumo para novas operações" },
  { categoria: "LOGÍSTICA REVERSA", tema: "Avaliar custos e benefícios da logística reversa" },

  { categoria: "INFRAESTRUTURA", tema: "Avaliar impacto das condições das estradas na operação" },
  { categoria: "INFRAESTRUTURA", tema: "Planejar rotas alternativas em períodos de obras" },
  { categoria: "INFRAESTRUTURA", tema: "Mapear gargalos logísticos regionais" },
  { categoria: "INFRAESTRUTURA", tema: "Investir em bases e pátios de apoio para frotas" },
  { categoria: "INFRAESTRUTURA", tema: "Adaptar operações à falta de infraestrutura adequada" },

  { categoria: "ESTRATÉGIA", tema: "Decidir entre frota própria ou terceirizada" },
  { categoria: "ESTRATÉGIA", tema: "Desenvolver planos de contingência para falhas operacionais" },
  { categoria: "ESTRATÉGIA", tema: "Avaliar vantagens da logística de última milha" },
  { categoria: "ESTRATÉGIA", tema: "Definir indicadores estratégicos de desempenho" },
  { categoria: "ESTRATÉGIA", tema: "Utilizar benchmarking para melhoria de processos" },

  { categoria: "PLANEJAMENTO", tema: "Elaborar cronogramas de manutenção de frota" },
  { categoria: "PLANEJAMENTO", tema: "Antecipar demandas de transporte em períodos sazonais" },
  { categoria: "PLANEJAMENTO", tema: "Dimensionar equipes conforme o volume de entregas" },
  { categoria: "PLANEJAMENTO", tema: "Planejar investimentos logísticos de longo prazo" },
  { categoria: "PLANEJAMENTO", tema: "Estabelecer prioridades operacionais diárias" },

  { categoria: "QUALIDADE", tema: "Padronizar processos de carregamento e descarga" },
  { categoria: "QUALIDADE", tema: "Monitorar indicadores de não conformidade" },
  { categoria: "QUALIDADE", tema: "Auditar fornecedores de transporte terceirizado" },
  { categoria: "QUALIDADE", tema: "Implementar melhorias contínuas na operação" },
  { categoria: "QUALIDADE", tema: "Certificar o sistema de gestão logística" },

  { categoria: "SUSTENTABILIDADE", tema: "Reutilizar recursos naturais na operação" },
  { categoria: "SUSTENTABILIDADE", tema: "Gerenciar resíduos industriais com responsabilidade" },
  { categoria: "SUSTENTABILIDADE", tema: "Sensibilizar colaboradores para o uso consciente de energia" },
  { categoria: "SUSTENTABILIDADE", tema: "Integrar políticas ambientais às metas corporativas" },
  { categoria: "SUSTENTABILIDADE", tema: "Adotar práticas de economia circular" },

  { categoria: "CLIENTE E MERCADO", tema: "Aumentar a satisfação do cliente com entregas pontuais" },
  { categoria: "CLIENTE E MERCADO", tema: "Melhorar a comunicação com o cliente sobre prazos" },
  { categoria: "CLIENTE E MERCADO", tema: "Identificar tendências de consumo no setor logístico" },
  { categoria: "CLIENTE E MERCADO", tema: "Personalizar serviços logísticos para nichos específicos" },
  { categoria: "CLIENTE E MERCADO", tema: "Gerenciar reclamações de clientes de forma estratégica" },

  { categoria: "PRODUTIVIDADE", tema: "Otimizar o tempo de carga e descarga" },
  { categoria: "PRODUTIVIDADE", tema: "Reduzir ociosidade de veículos e operadores" },
  { categoria: "PRODUTIVIDADE", tema: "Aplicar métodos lean na operação logística" },
  { categoria: "PRODUTIVIDADE", tema: "Mensurar desempenho por indicador de eficiência" },
  { categoria: "PRODUTIVIDADE", tema: "Eliminar gargalos nos fluxos de trabalho" },

  { categoria: "LIDERANÇA", tema: "Inspirar equipes para alto desempenho" },
  { categoria: "LIDERANÇA", tema: "Delegar tarefas de forma clara e eficiente" },
  { categoria: "LIDERANÇA", tema: "Conduzir reuniões operacionais produtivas" },
  { categoria: "LIDERANÇA", tema: "Tomar decisões sob pressão com equilíbrio" },
  { categoria: "LIDERANÇA", tema: "Dar feedback construtivo para equipes" },

  { categoria: "COMUNICAÇÃO", tema: "Melhorar a comunicação entre setores logísticos" },
  { categoria: "COMUNICAÇÃO", tema: "Padronizar instruções de serviço para motoristas" },
  { categoria: "COMUNICAÇÃO", tema: "Utilizar linguagem assertiva em reuniões" },
  { categoria: "COMUNICAÇÃO", tema: "Fortalecer a cultura de diálogo e transparência" },
  { categoria: "COMUNICAÇÃO", tema: "Evitar ruídos e retrabalhos por falhas de informação" }
];

function resetRoundState(total = null) {
  currentTips = [];
  roundData = {
    playerAttempts: {},
    playersWhoFinished: {},
    totalPlayers: total
  };
}

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


