document.addEventListener('DOMContentLoaded', () => {
    const socket = io();

    // --- Seletores de Elementos ---
    const cadastroSection = document.getElementById('cadastro-jogadores');
    const jogoSection = document.getElementById('jogo');
    const nomeJogadorInput = document.getElementById('nome-jogador');
    const btnAddJogador = document.getElementById('btn-add-jogador');
    const btnResetJogadores = document.getElementById('btn-reset-jogadores');
    const listaJogadoresDiv = document.getElementById('lista-jogadores');
    const btnIniciarJogo = document.getElementById('btn-iniciar-jogo');

    const painelTemaManual = document.getElementById('painel-tema-manual');
    const categoriaManualInput = document.getElementById('categoria-manual');
    const temaManualInput = document.getElementById('tema-manual');
    const btnUsarManual = document.getElementById('btn-usar-manual');

    const numRodadaSpan = document.getElementById('num-rodada');
    const categoriaRodadaSpan = document.getElementById('categoria-rodada');
    const temaRodadaSpan = document.getElementById('tema-rodada');
    const nomeJogadorVezSpan = document.getElementById('nome-jogador-vez');
    const numeroSecretoDisplay = document.getElementById('numero-secreto-display');

    const espacoDicas = document.getElementById('espaco-dicas');
    const nomeJogadorDicaSpan = document.getElementById('nome-jogador-dica');
    const inputDica = document.getElementById('input-dica');
    const btnEnviarDica = document.getElementById('btn-enviar-dica');
    const listaDicasUl = document.getElementById('lista-dicas');

    const ordenacaoSection = document.getElementById('ordenacao-dicas');
    const listaDicasOrdenarUl = document.getElementById('lista-dicas-ordenar');
    const tentativasRestantesSpan = document.getElementById('tentativas-restantes');
    const btnOrdenar = document.getElementById('btn-ordenar');

    const historicoRodadaDiv = document.getElementById('historico-rodada');
    const listaHistoricoUl = document.getElementById('lista-historico');
    const btnProximaRodada = document.getElementById('btn-proxima-rodada');

    const mensagemCustomizada = document.getElementById('mensagem-customizada');
    const mensagemTitulo = document.getElementById('mensagem-titulo');
    const mensagemTexto = document.getElementById('mensagem-texto');
    const btnFecharMensagem = document.getElementById('btn-fechar-mensagem');
    
    const musica = document.getElementById('musica');

    let players = [];
    let currentPlayerName = '';
    let sortable;

    // --- Funções Auxiliares ---
    function showMessage(title, text) {
        mensagemTitulo.textContent = title;
        mensagemTexto.textContent = text;
        mensagemCustomizada.classList.remove('hidden');
    }

    function updatePlayerList(playerList) {
        players = playerList;
        listaJogadoresDiv.innerHTML = '<h4>Jogadores na Sala:</h4>';
        players.forEach(player => {
            const playerDiv = document.createElement('div');
            playerDiv.textContent = player.name;
            playerDiv.classList.add('player-item');
            listaJogadoresDiv.appendChild(playerDiv);
        });
        const canStart = players.length >= 2;
        btnIniciarJogo.classList.toggle('hidden', !canStart);
        painelTemaManual.classList.toggle('hidden', !canStart);
    }

    // --- Lógica de Cadastro ---
    btnAddJogador.addEventListener('click', () => {
        const name = nomeJogadorInput.value.trim();
        if (name) {
            currentPlayerName = name;
            socket.emit('addPlayer', { name });
            nomeJogadorInput.value = '';
        }
    });

    btnResetJogadores.addEventListener('click', () => {
        if (confirm('Tem certeza que deseja resetar todos os jogadores?')) {
            socket.emit('resetPlayers');
        }
    });

    // --- Lógica de Início de Jogo ---
    btnIniciarJogo.addEventListener('click', () => {
        socket.emit('startGame', { tema: 'aleatorio' });
    });

    btnUsarManual.addEventListener('click', () => {
        const categoria = categoriaManualInput.value.trim();
        const tema = temaManualInput.value.trim();
        if (categoria && tema) {
            socket.emit('startGame', { categoria, tema });
        } else {
            showMessage('Atenção!', 'Por favor, preencha a categoria e o tema.');
        }
    });

    // --- Lógica da Rodada de Dicas ---
    btnEnviarDica.addEventListener('click', () => {
        const tip = inputDica.value.trim();
        if (tip) {
            const player = players.find(p => p.name === currentPlayerName);
            const numeroSecreto = Math.floor(Math.random() * 100) + 1;
            socket.emit('sendTip', { tip, number: numeroSecreto, player: player });
            espacoDicas.classList.add('hidden');
        }
    });

    // --- Lógica de Ordenação ---
    btnOrdenar.addEventListener('click', () => {
        const orderedItems = [...listaDicasOrdenarUl.children].map(item => item.dataset.originalIndex);
        socket.emit('checkOrder', { orderedItems });
    });

    btnProximaRodada.addEventListener('click', () => {
        socket.emit('startGame', { tema: 'aleatorio' });
    });

    btnFecharMensagem.addEventListener('click', () => {
        mensagemCustomizada.classList.add('hidden');
    });

    // --- Eventos do Servidor (Socket.IO) ---
    socket.on('connect', () => {
        console.log('Conectado ao servidor!', socket.id);
    });

    socket.on('updatePlayers', updatePlayerList);

    socket.on('gameStarted', (gameInfo) => {
        cadastroSection.classList.add('hidden');
        jogoSection.classList.remove('hidden');
        ordenacaoSection.classList.add('hidden');
        historicoRodadaDiv.classList.add('hidden');
        btnProximaRodada.classList.add('hidden');
        listaDicasUl.innerHTML = '';
        
        numRodadaSpan.textContent = parseInt(numRodadaSpan.textContent) + 1;
        categoriaRodadaSpan.textContent = gameInfo.categoria;
        temaRodadaSpan.textContent = gameInfo.tema;
        
        socket.emit('requestNextTipper');
    });
    
    socket.on('nextTipper', (player) => {
        nomeJogadorVezSpan.textContent = player.name;
        if (player.id === socket.id) {
            currentPlayerName = player.name;
            espacoDicas.classList.remove('hidden');
            nomeJogadorDicaSpan.textContent = player.name;
            inputDica.value = '';
            inputDica.focus();
        } else {
            espacoDicas.classList.add('hidden');
        }
    });

    socket.on('allTipsReceived', (tips) => {
        espacoDicas.classList.add('hidden');
        listaDicasUl.innerHTML = '<h4>Dicas Enviadas:</h4>';
        tips.forEach(tip => {
            const li = document.createElement('li');
            li.textContent = `${tip.player.name}: ${tip.tip}`;
            listaDicasUl.appendChild(li);
        });
        socket.emit('requestSorter');
    });

    socket.on('yourTurnToSort', (tips) => {
        nomeJogadorVezSpan.textContent = currentPlayerName + ' (Sua vez de ordenar!)';
        ordenacaoSection.classList.remove('hidden');
        tentativasRestantesSpan.textContent = 3;
        listaDicasOrdenarUl.innerHTML = '';
        tips.forEach((tip, index) => {
            const li = document.createElement('li');
            li.textContent = tip.tip;
            li.dataset.originalIndex = index;
            li.classList.add('sortable-item');
            listaDicasOrdenarUl.appendChild(li);
        });
        if (sortable) sortable.destroy();
        sortable = Sortable.create(listaDicasOrdenarUl);
    });

    socket.on('waitingForSorter', (sorterName) => {
        nomeJogadorVezSpan.textContent = `Aguardando ${sorterName} ordenar...`;
        ordenacaoSection.classList.add('hidden');
    });
    
    socket.on('orderResult', (result) => {
        if(result.isCorrect) {
            showMessage('PARABÉNS!', `Você acertou a ordem e ganhou ${result.points} pontos!`);
            ordenacaoSection.classList.add('hidden');
            historicoRodadaDiv.classList.remove('hidden');
            listaHistoricoUl.innerHTML = result.historyHtml;
            btnProximaRodada.classList.remove('hidden');
        } else {
            showMessage('QUASE LÁ!', `Você errou a ordem. Itens corretos: ${result.correctCount}. Tentativas restantes: ${result.attemptsLeft}`);
            tentativasRestantesSpan.textContent = result.attemptsLeft;
            if (result.attemptsLeft === 0) {
                ordenacaoSection.classList.add('hidden');
                historicoRodadaDiv.classList.remove('hidden');
                listaHistoricoUl.innerHTML = result.historyHtml;
                btnProximaRodada.classList.remove('hidden');
            }
        }
    });

    socket.on('message', (msg) => {
        showMessage(msg.title, msg.text);
    });
});
