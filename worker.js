// worker.js - Web Worker per generazione di matrici complesse
// Importa le funzioni di data.js (deve essere un percorso relativo valido)
importScripts('data.js');

self.onmessage = function(e) {
    const { task, level } = e.data;
    if (task === 'generateMatrix') {
        try {
            // Per livelli alti, simula un calcolo più pesante (es. matrice 4x4)
            let question;
            if (level >= 5) {
                question = generaMatricePesante(level);
            } else {
                question = generaMatriceVisiva(level);
            }
            // Piccolo ritardo artificiale per simulare calcolo (opzionale)
            // setTimeout non esiste in worker, usiamo un loop per test
            self.postMessage({ question });
        } catch (error) {
            self.postMessage({ error: error.message });
        }
    }
};

function generaMatricePesante(level) {
    // Versione più complessa: matrice 4x4 con regole multiple
    const size = 4;
    const shapes = ['circle', 'square', 'triangle', 'diamond'];
    const fills = ['none', 'solid', 'hatch'];
    let matrix = [];
    for (let i = 0; i < size; i++) {
        matrix[i] = [];
        for (let j = 0; j < size; j++) {
            const shapeIndex = (i * 2 + j) % shapes.length;
            const fillIndex = (i + j * 2) % fills.length;
            matrix[i][j] = { shape: shapes[shapeIndex], fill: fills[fillIndex] };
        }
    }
    const correct = matrix[size-1][size-1];
    matrix[size-1][size-1] = null;
    
    const options = [];
    for (let k = 0; k < 4; k++) {
        if (k === 0) options.push(correct);
        else {
            const fakeShape = randomChoice(shapes);
            const fakeFill = randomChoice(fills);
            options.push({ shape: fakeShape, fill: fakeFill });
        }
    }
    return {
        type: 'visivo',
        question: 'Quale figura completa la matrice?',
        matrix: matrix,
        correct: correct,
        options: shuffle(options),
        render: 'matrice',
        explanation: `Regola complessa: forma basata su (riga*2+colonna), riempimento su (riga+colonna*2).`
    };
}
