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
let teclas = []; 
let modoAtual = 'ESCALA'; // ESCALA, PROGRESSAO, MUSICA, IMPROVISACAO
let musicaAtual = null;

// Web Audio API
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

// Frequências da Oitava 4 (Baseado na frequência de A4=440Hz)
const FREQUENCIAS = {
    'C': 261.63, 'C#': 277.18, 'D': 293.66, 'D#': 311.13, 'E': 329.63, 
    'F': 349.23, 'F#': 369.99, 'G': 392.00, 'G#': 415.30, 'A': 440.00, 
    'A#': 466.16, 'B': 493.88
};

// Gera o som da nota usando um oscilador
function tocarNota(nota) {
    const freq = FREQUENCIAS[nota];
    if (!freq) return;

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'sine'; 
    oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    
    oscillator.connect(gainNode).connect(audioCtx.destination);
    
    oscillator.start();
    
    // Para o som com um "fade out" para evitar cliques
    setTimeout(() => {
        gainNode.gain.exponentialRampToValueAtTime(
            0.001, audioCtx.currentTime + 0.5
        );
        oscillator.stop(audioCtx.currentTime + 0.5);
    }, 300);
}

// =================================================================
// 2. BASE DE DADOS MUSICAIS GOSPEL AVANÇADA
// =================================================================

// Escalas Maiores e Menores (para Desafio de Escala)
const ESCALAS = {
    'Dó Maior (C)': ['C', 'D', 'E', 'F', 'G', 'A', 'B'], 
    'Sol Maior (G)': ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
    'Mi Menor (Em)': ['E', 'F#', 'G', 'A', 'B', 'C', 'D'], 
    'Ré Maior (D)': ['D', 'E', 'F#', 'G', 'A', 'B', 'C#']
};

// Músicas Gospel e suas Progressões (para Desafio "Descubra a Música")
const MUSICAS_GOSPEL = [
    {
        titulo: "Lindo És / O Meu Respirar",
        tom: "Sol Maior (G)",
        progressao: ['E', 'C', 'G', 'D'], // Em-C-G-D (vi-IV-I-V) - Tônicas dos acordes
        escalaImproviso: "Escala Pentatônica de Mi Menor",
        escalaNotas: ['E', 'G', 'A', 'B', 'D'] 
    },
    {
        titulo: "Pra Sempre (For the rest of my life)",
        tom: "Dó Maior (C)",
        progressao: ['C', 'G', 'A', 'F'], // C-G-Am-F (I-V-vi-IV)
        escalaImproviso: "Escala Pentatônica de Lá Menor",
        escalaNotas: ['A', 'C', 'D', 'E', 'G'] 
    },
    {
        titulo: "Ousado Amor (Reckless Love)",
        tom: "Lá Maior (A)",
        progressao: ['A', 'E', 'F#', 'D'], // A-E-F#m-D (I-V-vi-IV)
        escalaImproviso: "Escala Pentatônica de Fá Sustenido Menor",
        escalaNotas: ['F#', 'A', 'B', 'C#', 'E']
    }
];

// Função auxiliar para obter o nome do grau do acorde
function getGrau(tonalidade, nota) {
    // Para fins de simplificação, buscamos o grau na escala maior correspondente
    const escalaNome = tonalidade.split(' ')[0]; // Ex: "Sol" de "Sol Maior (G)"
    const escalaNotas = ESCALAS[Object.keys(ESCALAS).find(key => key.startsWith(escalaNome))];
    if (!escalaNotas) return '';

    const grausRomanos = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
    let index = escalaNotas.indexOf(nota);
    
    // Tenta encontrar o enharmônico se necessário (ex: A# é Bb)
    if (index === -1) {
        if (nota === 'A#' && escalaNotas.includes('B') && escalaNome !== 'Fá') index = escalaNotas.indexOf('B');
        // Adicionar mais lógica enharmônica se necessário
    }

    if (index !== -1) {
        // Assume que a progressão é I-V-vi-IV (maior, maior, menor, maior)
        const grau = grausRomanos[index];
        if (grau === 'VI' || grau === 'II' || grau === 'III') {
            return `${grau}m`; // Adiciona 'm' para acordes menores comuns
        }
        return grau;
    }
    return '';
}

// =================================================================
// 3. DESENHO DO PIANO (CANVAS)
// =================================================================

const LARGURA_TECLA_BRANCA = canvas.width / 12; // 12 teclas brancas para 2 oitavas incompletas
const ALTURA_TECLA_BRANCA = canvas.height;
const NOMES_NOTAS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C5'];

function desenharPiano(corDestaque = null, notaDestaque = null) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    teclas = [];
    let indiceBranca = 0;

    // 1. Desenha as Teclas Brancas
    for (let i = 0; i < NOMES_NOTAS.length; i++) {
        const nota = NOMES_NOTAS[i];
        if (!nota.includes('#')) {
            const tecla = {
                nome: nota.replace('5', ''), // Remove o 5 para ter a nota base (C)
                x: indiceBranca * LARGURA_TECLA_BRANCA,
                y: 0,
                largura: LARGURA_TECLA_BRANCA,
                altura: ALTURA_TECLA_BRANCA,
                isPreta: false
            };
            
            ctx.fillStyle = (notaDestaque === tecla.nome) ? corDestaque : 'white';
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
            const LARGURA_TECLA_PRETA = LARGURA_TECLA_BRANCA * 0.6;
            const ALTURA_TECLA_PRETA = ALTURA_TECLA_BRANCA * 0.6;

            // Posição X ajustada para ficar entre as teclas brancas (simplificado)
            const xCentroBrancaAnterior = (indiceBranca) * LARGURA_TECLA_BRANCA;
            
            const tecla = {
                nome: nota,
                x: xCentroBrancaAnterior, 
                y: 0,
                largura: LARGURA_TECLA_PRETA,
                altura: ALTURA_TECLA_PRETA,
                isPreta: true
            };
            
            ctx.fillStyle = (notaDestaque === tecla.nome) ? corDestaque : 'black';
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
    
    nomeDesafioDiv.innerHTML = `
        Desafio de **ESCALA**: Toque todas as notas da escala de **${nome}** na ordem.
    `;
    feedbackDiv.textContent = 'Clique na primeira nota para começar.';
    desenharPiano();
}

function iniciarDesafioMusica() {
    modoAtual = 'MUSICA';
    
    musicaAtual = MUSICAS_GOSPEL[Math.floor(Math.random() * MUSICAS_GOSPEL.length)];
    escalaOuProgressaoAlvo = musicaAtual.progressao;
    notasClicadas = [];
    
    nomeDesafioDiv.innerHTML = `
        Desafio: **Descubra a Música!**
        <br>
        Progresso: **${musicaAtual.progressao.length} Acordes**. Qual é a música?
    `;
    
    feedbackDiv.innerHTML = `
        **Desafio 1:** Toque as **tônicas** da progressão na ordem.
        <br>
        1ª Tônica: ${musicaAtual.progressao[0]}
    `;
    desenharPiano();
}


function handleClique(event) {
    if (escalaOuProgressaoAlvo.length === 0 && modoAtual !== 'IMPROVISACAO') return;

    // Obter a posição do clique no Canvas (mesma lógica de antes)
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    let notaClicada = null;

    // Verifica qual tecla foi clicada (lógica simplificada, prioriza pretas)
    for (let i = teclas.length - 1; i >= 0; i--) {
        const tecla = teclas[i];
        
        let areaX = tecla.x;
        let areaY = tecla.y;
        let areaL = tecla.largura;
        let areaA = tecla.altura;
        
        if (tecla.isPreta) {
            areaX = tecla.x - tecla.largura / 2;
            areaA = ALTURA_TECLA_BRANCA * 0.6; // Apenas a metade de cima para as pretas
        }

        if (mouseX >= areaX && mouseX <= areaX + areaL &&
            mouseY >= areaY && mouseY <= areaY + areaA) {
            
            notaClicada = tecla.nome;
            break; 
        }
    }

    if (notaClicada) {
        // Toca o som da nota
        tocarNota(notaClicada); 
        
        // Feedback Visual: desenha a nota em verde ao ser clicada
        desenharPiano('#388e3c', notaClicada); 
        setTimeout(() => {
            desenharPiano(); 
        }, 200);

        // Lógica de Verificação
        notasClicadas.push(notaClicada);
        verificarProgresso(notaClicada);
    }
}

function verificarProgresso(notaClicada) {
    const indiceAtual = notasClicadas.length - 1;
    const proximaNotaCorreta = escalaOuProgressaoAlvo[indiceAtual];

    if (modoAtual === 'IMPROVISACAO') {
        const ehCorreta = escalaOuProgressaoAlvo.includes(notaClicada);
        if (ehCorreta) {
            feedbackDiv.innerHTML = `Muito bom! A nota <span style="color: blue;">${notaClicada}</span> está na escala de improvisação! Continue treinando!`;
        } else {
            feedbackDiv.innerHTML = `<span style="color: red;">Ops! A nota ${notaClicada} NÃO está na escala de improvisação!</span>`;
        }
        notasClicadas.pop(); // Modo livre, não acumula
        return;
    }
    
    // Lógica para ESCALA ou MUSICA (sequencial)
    if (notaClicada === proximaNotaCorreta) {
        
        if (notasClicadas.length === escalaOuProgressaoAlvo.length) {
            // SEQUÊNCIA COMPLETA!
            if (modoAtual === 'MUSICA') {
                
                feedbackDiv.innerHTML = `
                    <span style="color: #0d47a1;">PROGRESSÃO CORRETA! Parabéns!</span>
                    <br>
                    **A Música é:** ${musicaAtual.titulo}
                    <br>
                    **Tonalidade:** ${musicaAtual.tom}
                    <br>
                    <span style="color: #1b5e20;">**DESAFIO FINAL (IMPROVISO):** Toque qualquer nota de **${musicaAtual.escalaImproviso}** (${musicaAtual.escalaNotas.join(', ')})
                `;
                
                // Transição para o modo de treino livre
                escalaOuProgressaoAlvo = musicaAtual.escalaNotas; 
                notasClicadas = [];
                modoAtual = 'IMPROVISACAO';
                
            } else {
                // Escala Simples Completa
                feedbackDiv.textContent = `GLÓRIA! Desafio de ${modoAtual} CONCLUÍDO! Tente o próximo.`;
                escalaOuProgressaoAlvo = []; 
            }
        } else {
            // Próxima nota na sequência
            const proximaNota = escalaOuProgressaoAlvo[indiceAtual + 1];
            
            if (modoAtual === 'MUSICA') {
                const grau = getGrau(musicaAtual.tom, proximaNota);
                feedbackDiv.textContent = `Correto! Próxima tônica: ${proximaNota} (${grau})`;
            } else {
                feedbackDiv.textContent = `Correto! Próxima nota: ${proximaNota}`;
            }
        }
    } else {
        // ERRO NA SEQUÊNCIA
        let erroMsg = `ERRADO! Você tocou <span style="color: red;">${notaClicada}</span>. A nota esperada era **${proximaNotaCorreta}**. Desafio Reiniciado!`;
        notasClicadas = []; 
        feedbackDiv.innerHTML = erroMsg;
        desenharPiano();
    }
}


// 5. LISTENERS DE EVENTOS

// Inicia o contexto de áudio com o primeiro clique do usuário
document.body.addEventListener('click', () => {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}, { once: true });

iniciarBtn.addEventListener('click', iniciarDesafioEscala);
iniciarAcordeBtn.addEventListener('click', iniciarDesafioMusica);
canvas.addEventListener('click', handleClique);

// Início: Desenha o piano ao carregar a página
desenharPiano();
