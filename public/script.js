document.addEventListener('DOMContentLoaded', () => {
    const socket = io();

    // Referências aos Elementos do DOM
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
    let currentSecretNumber = 0;
    let sortable;

    // Funções Auxiliares
    function showMessage(title, text, type = 'info') {
        mensagemTitulo.textContent = title;
        mensagemTexto.textContent = text;
        mensagemCustomizada.className = ''; // Limpa classes anteriores
        mensagemCustomizada.classList.add('mensagem-customizada'); // Adiciona a classe base
        if (type === 'success') {
            mensagemCustomizada.classList.add('mensagem-sucesso');
        } else if (type === 'error') {
            mensagemCustomizada.classList.add('mensagem-erro');
        }
        mensagemCustomizada.classList.remove('hidden');
    }

    function updatePlayerList(playerList) {
        players = playerList;
        listaJogadoresDiv.innerHTML = '<h4>Jogadores (Ranking):</h4>';
        players.forEach((player, index) => {
            const playerDiv = document.createElement('div');
            playerDiv.classList.add('player-item');
            playerDiv.innerHTML = `<span class="player-rank">${index + 1}º</span> <span class="player-name">${player.name}</span> <span class="player-score">${player.score} pts</span>`;
            listaJogadoresDiv.appendChild(playerDiv);
        });
        const canStart = players.length >= 2;
        btnIniciarJogo.classList.toggle('hidden', !canStart);
        painelTemaManual.classList.toggle('hidden', !canStart);
    }

    // Event Listeners dos Botões
    btnAddJogador.addEventListener('click', () => {
        const name = nomeJogadorInput.value.trim();
        if (name) {
            socket.emit('addPlayer', { name });
            nomeJogadorInput.value = '';
        }
    });

    btnResetJogadores.addEventListener('click', () => {
        if (confirm('Tem certeza que deseja resetar o jogo e as pontuações?')) {
            socket.emit('resetPlayers');
        }
    });

    btnIniciarJogo.addEventListener('click', () => socket.emit('startGame', { tema: 'aleatorio' }));

    btnUsarManual.addEventListener('click', () => {
        const categoria = categoriaManualInput.value.trim();
        const tema = temaManualInput.value.trim();
        if (categoria && tema) {
            socket.emit('startGame', { categoria, tema });
        } else {
            showMessage('Atenção!', 'Por favor, preencha a categoria e o tema.', 'error');
        }
    });

    btnEnviarDica.addEventListener('click', () => {
        const tip = inputDica.value.trim();
        if (tip) {
            const tipData = { tip, number: currentSecretNumber };
            socket.emit('sendTip', tipData);
            inputDica.disabled = true;
            btnEnviarDica.disabled = true;
        }
    });

    btnOrdenar.addEventListener('click', () => {
        if (sortable) {
            const orderedTips = Array.from(listaDicasOrdenarUl.children).map(li => li.textContent);
            socket.emit('checkOrder', { orderedTips });
        }
    });

    btnProximaRodada.addEventListener('click', () => socket.emit('startGame', { tema: 'aleatorio' }));

    btnFecharMensagem.addEventListener('click', () => {
        mensagemCustomizada.classList.add('hidden');
    });

    // Listeners do Socket.IO
    socket.on('connect', () => console.log('[CLIENTE] Conectado ao servidor com sucesso!'));
    socket.on('resetGame', () => window.location.reload());
    socket.on('updatePlayers', updatePlayerList);

    socket.on('gameStarted', (gameInfo) => {
        if (musica.paused) {
            musica.play().catch(e => console.log("A reprodução automática foi bloqueada."));
        }
        
        cadastroSection.classList.add('hidden');
        jogoSection.classList.remove('hidden');
        ordenacaoSection.classList.add('hidden');
        historicoRodadaDiv.classList.add('hidden');
        btnProximaRodada.classList.add('hidden');
        listaDicasUl.innerHTML = '';
        
        const currentRound = parseInt(numRodadaSpan.textContent || 0) + 1;
        numRodadaSpan.textContent = currentRound;
        
        categoriaRodadaSpan.textContent = gameInfo.categoria;
        temaRodadaSpan.textContent = gameInfo.tema;
        
        socket.emit('requestNextTipper');
    });
    
    socket.on('nextTipper', (player) => {
        nomeJogadorVezSpan.textContent = player.name;
        nomeJogadorDicaSpan.textContent = player.name;
        
        if (player.id === socket.id) {
            currentSecretNumber = Math.floor(Math.random() * 100) + 1;
            numeroSecretoDisplay.textContent = currentSecretNumber;
            numeroSecretoDisplay.classList.remove('hidden');
            espacoDicas.classList.remove('hidden');
            inputDica.disabled = false;
            btnEnviarDica.disabled = false;
            inputDica.value = '';
            inputDica.focus();
        } else {
            espacoDicas.classList.add('hidden');
            numeroSecretoDisplay.classList.add('hidden');
        }
    });

    socket.on('allTipsReceived', (tips) => {
        espacoDicas.classList.add('hidden');
        numeroSecretoDisplay.classList.add('hidden');
        listaDicasUl.innerHTML = '<h4>Dicas Enviadas:</h4>';
        tips.forEach(tip => {
            const li = document.createElement('li');
            li.textContent = tip.tip;
            listaDicasUl.appendChild(li);
        });
        socket.emit('requestSorter');
    });

   socket.on('startSortingPhase', (tipsToGuess) => {
    // Não existe mais "if (sou eu)". TODOS os jogadores entram nesta fase.
    nomeJogadorVezSpan.textContent = 'Sua vez de ordenar!';
    ordenacaoSection.classList.remove('hidden');
    tentativasRestantesSpan.textContent = 3; // Cada jogador começa com 3 tentativas
    listaDicasOrdenarUl.innerHTML = '';
    
    tipsToGuess.forEach((tip) => {  
        const li = document.createElement('li');
        li.textContent = tip;
        li.classList.add('sortable-item');
        listaDicasOrdenarUl.appendChild(li);
    });
    
    if (sortable) sortable.destroy();
    sortable = Sortable.create(listaDicasOrdenarUl, { animation: 150 });
});
    
   socket.on('orderResult', (result) => {
    // Atualiza o placar para todos verem a pontuação em tempo real
    updatePlayerList(result.players); 

    if (result.isCorrect) {
        showMessage('PARABÉNS!', `Você acertou e ganhou ${result.points} pontos! Aguardando os outros jogadores...`, 'success');
        ordenacaoSection.classList.add('hidden'); // Esconde a sua tela de ordenação, pois você já acertou
    } else if (result.attemptsLeft > 0) {
        tentativasRestantesSpan.textContent = result.attemptsLeft;
        showMessage('QUASE LÁ!', `Você errou. Tentativas restantes: ${result.attemptsLeft}`, 'error');
    } else {
        showMessage('FIM DAS TENTATIVAS!', 'Você não acertou. Aguardando os outros jogadores...', 'error');
        ordenacaoSection.classList.add('hidden'); // Esconde sua tela, pois suas tentativas acabaram
    }
});

// Função 2 (NOVA): Lida com o FIM DA RODADA para todo mundo
socket.on('roundOver', (result) => {
    // Garante que qualquer pop-up ("Quase lá!") seja fechado
    mensagemCustomizada.classList.add('hidden');
    
    // Esconde a área de ordenação de vez para todos
    ordenacaoSection.classList.add('hidden');
    
    // FINALMENTE, MOSTRA O HISTÓRICO DA RODADA
    historicoRodadaDiv.classList.remove('hidden');
    listaHistoricoUl.innerHTML = result.historyHtml;
    
    // E mostra os botões de controle final
    btnProximaRodada.classList.remove('hidden');
    btnResetJogadores.classList.remove('hidden'); 
});

    socket.on('message', (msg) => showMessage(msg.title, msg.text, msg.type));

});


