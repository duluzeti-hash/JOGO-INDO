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

    btnAddJogador.addEventListener('click', () => {
        const name = nomeJogadorInput.value.trim();
        if (name) {
            currentPlayerName = name;
            socket.emit('addPlayer', { name });
            nomeJogadorInput.value = '';
        }
    });

    btnResetJogadores.addEventListener('click', () => {
        if (confirm('Tem certeza que deseja resetar todos os jogadores e voltar para a tela de cadastro?')) {
            socket.emit('resetPlayers');
            // Recarrega a página para garantir que o estado do cliente seja limpo
            window.location.reload();
        }
    });

    btnIniciarJogo.addEventListener('click', () => socket.emit('startGame', { tema: 'aleatorio' }));
    btnUsarManual.addEventListener('click', () => {
        const categoria = categoriaManualInput.value.trim();
        const tema = temaManualInput.value.trim();
        if (categoria && tema) {
            socket.emit('startGame', { categoria, tema });
        } else {
            showMessage('Atenção!', 'Por favor, preencha a categoria e o tema.');
        }
    });

    btnEnviarDica.addEventListener('click', () => {
        const tip = inputDica.value.trim();
        if (tip) {
            const numeroSecreto = Math.floor(Math.random() * 100) + 1;
            // CORREÇÃO: MOSTRANDO O NÚMERO SECRETO NA TELA
            numeroSecretoDisplay.textContent = numeroSecreto;
            numeroSecretoDisplay.classList.remove('hidden');
            
            const tipData = { tip, number: numeroSecreto };
            socket.emit('sendTip', tipData);
            
            espacoDicas.classList.add('hidden');
        }
    });

    btnOrdenar.addEventListener('click', () => {
        if (sortable) {
            const orderedTips = sortable.toArray().map(tipText => {
                 return { tip: tipText };
            });
            socket.emit('checkOrder', { orderedTips });
        }
    });

    btnProximaRodada.addEventListener('click', () => {
        socket.emit('startGame', { tema: 'aleatorio' });
    });

    btnFecharMensagem.addEventListener('click', () => mensagemCustomizada.classList.add('hidden'));

    socket.on('connect', () => console.log('[CLIENTE] Conectado ao servidor com sucesso!'));
    socket.on('updatePlayers', updatePlayerList);

    socket.on('gameStarted', (gameInfo) => {
        // CORREÇÃO: LIGANDO A MÚSICA
        if (musica.paused) {
            musica.play().catch(e => console.log("A reprodução automática de áudio foi bloqueada pelo navegador."));
        }
        
        cadastroSection.classList.add('hidden');
        jogoSection.classList.remove('hidden');
        ordenacaoSection.classList.add('hidden');
        historicoRodadaDiv.classList.add('hidden');
        btnProximaRodada.classList.add('hidden');
        listaDicasUl.innerHTML = '';
        
        numRodadaSpan.textContent = parseInt(numRodadaSpan.textContent || 0) + 1;
        categoriaRodadaSpan.textContent = gameInfo.categoria;
        temaRodadaSpan.textContent = gameInfo.tema;
        socket.emit('requestNextTipper');
    });
    
    socket.on('nextTipper', (player) => {
        nomeJogadorVezSpan.textContent = player.name;
        // CORREÇÃO: Mostrando o nome do jogador da vez na caixa de dica
        nomeJogadorDicaSpan.textContent = player.name;
        numeroSecretoDisplay.classList.add('hidden');
        if (player.id === socket.id) {
            currentPlayerName = player.name;
            espacoDicas.classList.remove('hidden');
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
            // Mostra apenas a dica, como deve ser antes da ordenação
            li.textContent = tip.tip;
            listaDicasUl.appendChild(li);
        });
        socket.emit('requestSorter');
    });

    socket.on('updateSorter', (sorter, tipsToGuess) => {
        if (sorter.id === socket.id) {
            nomeJogadorVezSpan.textContent = 'Sua vez de ordenar!';
            ordenacaoSection.classList.remove('hidden');
            tentativasRestantesSpan.textContent = 3;
            listaDicasOrdenarUl.innerHTML = '';
            tipsToGuess.forEach((tip, index) => {
                const li = document.createElement('li');
                li.textContent = tip.tip;
                li.dataset.originalTip = tip.tip; // Guardando a dica original
                li.classList.add('sortable-item');
                listaDicasOrdenarUl.appendChild(li);
            });
            if (sortable) sortable.destroy();
            sortable = Sortable.create(listaDicasOrdenarUl, {
                animation: 150
            });
        } else {
            nomeJogadorVezSpan.textContent = `Aguardando ${sorter.name} ordenar...`;
            ordenacaoSection.classList.add('hidden');
        }
    });
    
    socket.on('orderResult', (result) => {
        if (result.isCorrect) {
            showMessage('PARABÉNS!', `Você acertou a ordem e ganhou ${result.points} pontos!`);
        } else {
            showMessage('QUASE LÁ!', `Você errou. Tentativas restantes: ${result.attemptsLeft}`);
        }
        
        tentativasRestantesSpan.textContent = result.attemptsLeft;
        
        if (result.isCorrect || result.attemptsLeft === 0) {
            ordenacaoSection.classList.add('hidden');
            historicoRodadaDiv.classList.remove('hidden');
            listaHistoricoUl.innerHTML = result.historyHtml;
            // CORREÇÃO: Mostrando o botão de próxima rodada
            btnProximaRodada.classList.remove('hidden');
        }
    });

    socket.on('message', (msg) => showMessage(msg.title, msg.text));
});
