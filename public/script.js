document.addEventListener('DOMContentLoaded', () => {
    const socket = io({ transports: ['websocket', 'polling'] });

    // Referências do DOM
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
    
    let currentSecretNumber = 0;
    let sortable;
    let lastRoundResult = null; // Variável para guardar o resultado final

    // Função showMessage CORRIGIDA para bater com o CSS
    function showMessage(title, text, type = 'info') {
        mensagemTitulo.textContent = title;
        mensagemTexto.textContent = text;
        mensagemCustomizada.classList.remove('mensagem-success', 'mensagem-error');
        if (type === 'success') {
            mensagemCustomizada.classList.add('mensagem-success');
        } else if (type === 'error') {
            mensagemCustomizada.classList.add('mensagem-error');
        }
        mensagemCustomizada.classList.remove('hidden');
    }

    function updatePlayerList(playerList) {
        listaJogadoresDiv.innerHTML = '<h4>Jogadores (Ranking):</h4>';
        playerList.sort((a, b) => b.score - a.score).forEach((player, index) => {
            const playerDiv = document.createElement('div');
            playerDiv.classList.add('player-item');
            playerDiv.innerHTML = `<span class="player-rank">${index + 1}º</span> <span class="player-name">${player.name}</span> <span class="player-score">${player.score} pts</span>`;
            listaJogadoresDiv.appendChild(playerDiv);
        });
        const canStart = playerList.length >= 2;
        btnIniciarJogo.classList.toggle('hidden', !canStart);
        painelTemaManual.classList.toggle('hidden', !canStart);
    }

    // NOVA Função para mostrar o histórico
    function mostrarHistorico(result) {
        mensagemCustomizada.classList.add('hidden');
        ordenacaoSection.classList.add('hidden');
        historicoRodadaDiv.classList.remove('hidden');
        listaHistoricoUl.innerHTML = result.historyHtml;
        updatePlayerList(result.players);
        btnProximaRodada.classList.remove('hidden');
        btnResetJogadores.classList.remove('hidden'); 
    }

    // Botões
    btnAddJogador.addEventListener('click', () => {
        const name = nomeJogadorInput.value.trim();
        if (name) socket.emit('addPlayer', { name });
        nomeJogadorInput.value = '';
    });

    btnResetJogadores.addEventListener('click', () => {
        if (confirm('Tem certeza que deseja resetar o jogo e as pontuações?')) socket.emit('resetPlayers');
    });

    btnIniciarJogo.addEventListener('click', () => socket.emit('startGame', { tema: 'aleatorio' }));

    btnUsarManual.addEventListener('click', () => {
        const categoria = categoriaManualInput.value.trim();
        const tema = temaManualInput.value.trim();
        if (categoria && tema) socket.emit('startGame', { categoria, tema });
        else showMessage('Atenção!', 'Por favor, preencha a categoria e o tema.', 'error');
    });

    btnEnviarDica.addEventListener('click', () => {
        const tip = inputDica.value.trim();
        if (tip) {
            socket.emit('sendTip', { tip, number: currentSecretNumber });
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
    
    // Botão "OK" do Popup AGORA CONTROLA O HISTÓRICO
    btnFecharMensagem.addEventListener('click', () => {
        mensagemCustomizada.classList.add('hidden');
        // Se a gente fechou o popup e tinha um resultado final guardado, mostra o histórico
        if (lastRoundResult) {
            mostrarHistorico(lastRoundResult);
            lastRoundResult = null; // Limpa a variável
        }
    });

    // Sockets
    socket.on('updatePlayers', updatePlayerList);
    socket.on('resetGame', () => window.location.reload());

    socket.on('gameStarted', (gameInfo) => {
        if (musica.paused) musica.play().catch(e => {});
        cadastroSection.classList.add('hidden');
        jogoSection.classList.remove('hidden');
        ordenacaoSection.classList.add('hidden');
        historicoRodadaDiv.classList.add('hidden');
        btnProximaRodada.classList.add('hidden');
        btnResetJogadores.classList.add('hidden');
        listaDicasUl.innerHTML = '';
        numeroSecretoDisplay.classList.add('hidden');
        lastRoundResult = null; // Limpa o resultado da rodada anterior
        numRodadaSpan.textContent = parseInt(numRodadaSpan.textContent || 0) + 1;
        categoriaRodadaSpan.textContent = gameInfo.categoria;
        temaRodadaSpan.textContent = gameInfo.tema;
        socket.emit('requestNextTipper');
    });
    
    socket.on('nextTipper', (player) => {
        nomeJogadorVezSpan.textContent = player.name;
        nomeJogadorDicaSpan.textContent = player.name;
        const isMyTurn = player.id === socket.id;
        espacoDicas.classList.toggle('hidden', !isMyTurn);
        if (isMyTurn) {
            currentSecretNumber = Math.floor(Math.random() * 100) + 1;
            numeroSecretoDisplay.textContent = currentSecretNumber;
            numeroSecretoDisplay.classList.remove('hidden');
            inputDica.disabled = false;
            btnEnviarDica.disabled = false;
            inputDica.value = '';
            inputDica.focus();
        }
    });

    socket.on('startSortingPhase', (tipsToGuess) => {
        espacoDicas.classList.add('hidden');
        nomeJogadorVezSpan.textContent = 'Sua vez de ordenar!';
        ordenacaoSection.classList.remove('hidden');
        tentativasRestantesSpan.textContent = 3;
        btnOrdenar.disabled = false;
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
    
    // Lida com resultados individuais
    socket.on('orderResult', (result) => {
        updatePlayerList(result.players);
        tentativasRestantesSpan.textContent = result.attemptsLeft;
        if (result.isCorrect) {
            showMessage('PARABÉNS!', `Você acertou e ganhou ${result.points} pontos! Aguardando os outros jogadores...`, 'success');
            btnOrdenar.disabled = true;
        } else if (result.attemptsLeft > 0) {
            showMessage('QUASE LÁ!', `Você errou. Tentativas restantes: ${result.attemptsLeft}`, 'error');
        } else {
            showMessage('FIM DAS TENTATIVAS!', 'Você não acertou. Aguardando os outros jogadores...', 'error');
            btnOrdenar.disabled = true;
        }
    });

    // Lida com o FIM DA RODADA (LÓGICA CORRIGIDA)
    socket.on('roundOver', (result) => {
        ordenacaoSection.classList.add('hidden');
        lastRoundResult = result; // Guarda o resultado final

        const lastPlayer = result.lastPlayerResult;
        
        // Se EU SOU o último jogador, mostra meu popup final
        if (lastPlayer && lastPlayer.id === socket.id) {
            if (lastPlayer.isCorrect) {
                showMessage('PARABÉNS!', `Você acertou e ganhou ${lastPlayer.points} pontos!`, 'success');
            } else {
                showMessage('FIM DAS TENTATIVAS!', 'Você não acertou.', 'error');
            }
        } else {
            // Se eu NÃO SOU o último, mostra o histórico imediatamente
            mostrarHistorico(result);
            lastRoundResult = null; // Limpa para não bugar o botão "OK"
        }
    });
});
