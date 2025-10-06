// =================================================================
// 1. CONFIGURAÇÃO INICIAL E WEB AUDIO API
// =================================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const iniciarBtn = document.getElementById('iniciar');
const iniciarAcordeBtn = document.getElementById('iniciarAcorde');
const feedbackDiv = document.getElementById('feedback');
const nomeDesafioDiv = document.getElementById('desafio-nome');

// Variáveis de Estado do Jogo
let escalaOuProgressaoAlvo = [];
let notasClicadas = [];
let teclas = []; // Armazena a posição e nome das teclas no Canvas
let modoAtual = 'ESCALA'; // ESCALA ou PROGRESSAO

// Web Audio API
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

// Frequências da Oitava 4 (Baseado na frequência de A4=440Hz)
const FREQUENCIAS = {
    'C': 261.63, 'C#': 277.18, 'D': 293.66, 'D#': 311.13, 'E': 329.63, 
    'F': 349.23, 'F#': 369.99, 'G': 392.00, 'G#': 415.30, 'A': 440.00, 
    'A#': 466.16, 'B': 493.88
};

// Gera o som da nota usando um oscilador (onda senoidal para um som suave)
function tocarNota(nota) {
    const freq = FREQUENCIAS[nota];
    if (!freq) return;

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'sine'; // Tipo de onda: 'sine', 'square', 'sawtooth', 'triangle'
    oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    
    // Conecta o oscilador ao ganho e ao destino de saída (falantes)
    oscillator.connect(gainNode).connect(audioCtx.destination);
    
    oscillator.start();
    
    // Para o som após um curto período de tempo
    setTimeout(() => {
        gainNode.gain.exponentialRampToValueAtTime(
            0.001, audioCtx.currentTime + 0.5
        );
        oscillator.stop(audioCtx.currentTime + 0.5);
    }, 300);
}

// =================================================================
// 2. BASE DE DADOS MUSICAIS GOSPEL
// =================================================================

// Definição das notas dentro das escalas mais comuns no Worship
const ESCALAS = {
    'Dó Maior (C)': ['C', 'D', 'E', 'F', 'G', 'A', 'B'], 
    'Sol Maior (G)': ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
    'Fá Maior (F)': ['F', 'G', 'A', 'A#', 'C', 'D', 'E'],
    'Mi Menor (Em)': ['E', 'F#', 'G', 'A', 'B', 'C', 'D'], // Relativa de Sol
};

// Progressões de Acordes comuns no Worship (I-V-vi-IV, vi-IV-I-V, etc.)
// A progressão deve ser tocada como a tônica de cada acorde (para simplificar o clique)
const PROGRESSOES = {
    'C-G-Am-F (1-5-6-4 em Dó)': ['C', 'G', 'A', 'F'],
    'G-D-Em-C (1-5-6-4 em Sol)': ['G', 'D', 'E', 'C'],
    'F-C-Dm-Bb (1-5-6-4 em Fá)': ['F', 'C', 'D', 'A#'],
    'Em-C-G-D (6-4-1-5 em Sol)': ['E', 'C', 'G', 'D']
};


// =================================================================
// 3. DESENHO DO PIANO (CANVAS)
// =================================================================

const LARGURA_TECLA_BRANCA = canvas.width / 12; // 12 teclas brancas (2 oitavas incompletas para layout)
const ALTURA_TECLA_BRANCA = canvas.height;
const NOMES_NOTAS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C5'];
const OITAVA_BASE = 4; // Começa na oitava 4

function desenharPiano(corDestaque = null, notaDestaque = null) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    teclas = [];
    let x = 0;
    
    // Posições X das teclas pretas (como índice na lista de todas as 12 notas)
    const INDICES_PRETAS = [1, 3, 6, 8, 10]; 
    let indiceBranca = 0;

    // 1. Desenha as Teclas Brancas
    for (let i = 0; i < NOMES_NOTAS.length; i++) {
        const nota = NOMES_NOTAS[i];
        if (!nota.includes('#')) {
            const tecla = {
                nome: nota,
                x: indiceBranca * LARGURA_TECLA_BRANCA,
                y: 0,
                largura: LARGURA_TECLA_BRANCA,
                altura: ALTURA_TECLA_BRANCA,
                isPreta: false
            };
            
            // Verifica destaque
            ctx.fillStyle = (notaDestaque === nota) ? corDestaque : 'white';
            ctx.fillRect(tecla.x, tecla.y, tecla.largura, tecla.altura);
            ctx.strokeStyle = '#333';
            ctx.strokeRect(tecla.x, tecla.y, tecla.largura, tecla.altura);
            
            // Adiciona o nome da nota
            ctx.fillStyle = '#333';
            ctx.font = '16px Arial';
            ctx.fillText(tecla.nome, tecla.x + tecla.largura / 3, tecla.altura - 10);
            
            teclas.push(tecla);
            indiceBranca++;
        }
    }

    // 2. Desenha as Teclas Pretas (por cima)
    indiceBranca = 0;
    for (let i = 0; i < NOMES_NOTAS.length; i++) {
        const nota = NOMES_NOTAS[i];
        
        if (nota.includes('#')) {
            // Posiciona a preta sobre as brancas C, D, F, G, A
            const xCentroBrancaAnterior = (indiceBranca - 1) * LARGURA_TECLA_BRANCA + LARGURA_TECLA_BRANCA / 2;
            const LARGURA_TECLA_PRETA = LARGURA_TECLA_BRANCA * 0.6;
            const ALTURA_TECLA_PRETA = ALTURA_TECLA_BRANCA * 0.6;

            const tecla = {
                nome: nota,
                x: xCentroBrancaAnterior + LARGURA_TECLA_BRANCA * 0.25, // Ajuste para centralizar visualmente
                y: 0,
                largura: LARGURA_TECLA_PRETA,
                altura: ALTURA_TECLA_PRETA,
                isPreta: true
            };
            
            // Verifica destaque
            ctx.fillStyle = (notaDestaque === nota) ? corDestaque : 'black';
            ctx.fillRect(tecla.x - LARGURA_TECLA_PRETA / 2, tecla.y, tecla.largura, tecla.altura);
            
            teclas.push(tecla);
        } else {
            indiceBranca++;
        }
    }
}


// =================================================================
// 4. LÓGICA DO JOGO E EVENTOS
// =================================================================

function iniciarDesafioEscala() {
    modoAtual = 'ESCALA';
    const tonalidades = Object.keys(ESCALAS);
    const nome = tonalidades[Math.floor(Math.random() * tonalidades.length)];
    
    escalaOuProgressaoAlvo = ESCALAS[nome];
    notasClicadas = [];
    
    nomeDesafioDiv.textContent = `Desafio de ESCALA: Toque a escala de ${nome} na ordem.`;
    feedbackDiv.textContent = 'Clique na primeira nota para começar.';
    desenharPiano();
}

function iniciarDesafioProgressao() {
    modoAtual = 'PROGRESSAO';
    const progressaoNomes = Object.keys(PROGRESSOES);
    const nome = progressaoNomes[Math.floor(Math.random() * progressaoNomes.length)];
    
    escalaOuProgressaoAlvo = PROGRESSOES[nome];
    notasClicadas = [];
    
    nomeDesafioDiv.textContent = `Desafio de PROGRESSÃO GOSPEL: Toque a progressão ${nome}.`;
    feedbackDiv.textContent = 'Toque na tônica (primeira nota) de cada acorde em sequência.';
    desenharPiano();
}


function handleClique(event) {
    if (escalaOuProgressaoAlvo.length === 0) return;

    // 1. Obter a posição do clique no Canvas
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    let notaClicada = null;
    let teclaClicada = null;

    // 2. Determinar qual tecla foi clicada (priorizando as pretas se o clique estiver na área de sobreposição)
    for (const tecla of teclas) {
        // Ajuste a área de clique para teclas pretas (mais estreitas e mais altas)
        let areaX = tecla.x;
        let areaY = tecla.y;
        let areaL = tecla.largura;
        let areaA = tecla.altura;

        if (tecla.isPreta) {
            areaX = tecla.x - tecla.largura / 2;
            areaL = tecla.largura;
            areaA = ALTURA_TECLA_BRANCA * 0.6; // Apenas a metade de cima
        }

        if (mouseX >= areaX && mouseX <= areaX + areaL &&
            mouseY >= areaY && mouseY <= areaY + areaA) {
            
            teclaClicada = tecla;
            notaClicada = tecla.nome;
        }
    }

    if (notaClicada) {
        // Toca o som da nota clicada
        tocarNota(notaClicada); 
        
        // 3. Feedback Visual (Highlight)
        desenharPiano('#4CAF50', notaClicada); // Desenha a nota correta em verde
        setTimeout(() => {
            desenharPiano(); // Retorna ao normal após um breve momento
        }, 200);

        // 4. Lógica de Verificação
        notasClicadas.push(notaClicada);
        verificarProgresso(notaClicada);
    }
}

function verificarProgresso(notaClicada) {
    const indiceAtual = notasClicadas.length - 1;
    const proximaNotaCorreta = escalaOuProgressaoAlvo[indiceAtual];

    // Se a nota clicada for a correta na sequência
    if (notaClicada === proximaNotaCorreta) {
        
        // Se a sequência estiver completa
        if (notasClicadas.length === escalaOuProgressaoAlvo.length) {
            feedbackDiv.textContent = `Glória! Desafio de ${modoAtual} CONCLUÍDO! Tente o próximo.`;
            // Redesenha a tela final (opcionalmente destacando todas as notas)
            escalaOuProgressaoAlvo = []; 
        } else {
            feedbackDiv.textContent = `Correto! Próxima nota: ${escalaOuProgressaoAlvo[indiceAtual + 1]}`;
        }
    } else {
        // Se a nota clicada estiver errada
        const desafio = modoAtual === 'ESCALA' ? 'escala' : 'progressão';
        feedbackDiv.textContent = `ERRADO! Você tocou ${notaClicada}, mas a nota esperada na ${desafio} era ${proximaNotaCorreta}. Reinicie o desafio!`;
        notasClicadas = []; // Reinicia a tentativa
        // Redesenha a tela com o piano normal
        desenharPiano();
    }
}


// 5. Listeners de Eventos

// Inicia o contexto de áudio com o primeiro clique do usuário
document.body.addEventListener('click', () => {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}, { once: true });

iniciarBtn.addEventListener('click', iniciarDesafioEscala);
iniciarAcordeBtn.addEventListener('click', iniciarDesafioProgressao);
canvas.addEventListener('click', handleClique);

// Início: Desenha o piano ao carregar a página
desenharPiano();