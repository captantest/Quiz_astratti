// data.js - Banche dati e utility per generazione di quiz
// Attenzione: questo file viene usato anche dal Web Worker, quindi niente DOM o window.

// ============================================
// UTILITÀ GLOBALI
// ============================================
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// ============================================
// BANCHE DATI VERBALI (italiano)
// ============================================
const SYNONYMS = [
    { word: "fugace", synonyms: ["effimero", "breve", "passeggero"] },
    { word: "garrulo", synonyms: ["loquace", "chiacchierone", "ciarliero"] },
    { word: "probo", synonyms: ["onesto", "integro", "rettitudine"] },
    { word: "opimo", synonyms: ["grasso", "pingue", "obeso"] },
    { word: "laconico", synonyms: ["conciso", "breve", "stringato"] }
];

const ANTONYMS = [
    { word: "opaco", antonyms: ["lucido", "brillante", "trasparente"] },
    { word: "effimero", antonyms: ["eterno", "duraturo", "perenne"] },
    { word: "garrulo", antonyms: ["taciturno", "silenzioso", "muto"] },
    { word: "probo", antonyms: ["disonesto", "corrotto", "immorale"] }
];

const ANALOGIES = [
    { a: "medico", b: "ospedale", c: "insegnante", d: "scuola" },
    { a: "pittore", b: "tela", c: "scultore", d: "marmo" },
    { a: "cane", b: "bau", c: "gatto", d: "miao" },
    { a: "occhio", b: "vedere", c: "orecchio", d: "sentire" }
];

// ============================================
// GENERATORI DI QUIZ VERBALI
// ============================================
function generaAnalogiaVerbale() {
    const template = randomChoice(ANALOGIES);
    const allAnswers = ["scuola", "università", "studio", "casa", "ospedale", "marmo", "bronzo", "pennello", "miao", "bau", "vedere", "sentire"];
    const wrong = shuffle(allAnswers.filter(w => w !== template.d)).slice(0, 3);
    const options = shuffle([template.d, ...wrong]);
    return {
        type: 'verbale',
        question: `${template.a} sta a ${template.b} come ${template.c} sta a ...`,
        correct: template.d,
        options: options,
        explanation: `${template.a} è associato a ${template.b}, così come ${template.c} a ${template.d}.`
    };
}

function generaSinonimoContrario() {
    const type = Math.random() < 0.5 ? 'syn' : 'ant';
    if (type === 'syn') {
        const item = randomChoice(SYNONYMS);
        const wrong = shuffle(['facile', 'complicato', 'veloce', 'lento', 'brutto'].filter(w => !item.synonyms.includes(w))).slice(0, 3);
        return {
            type: 'verbale',
            question: `Trova il sinonimo di "${item.word}":`,
            correct: item.synonyms[0],
            options: shuffle([item.synonyms[0], ...wrong]),
            explanation: `"${item.word}" significa "${item.synonyms[0]}".`
        };
    } else {
        const item = randomChoice(ANTONYMS);
        const wrong = shuffle(['oscuro', 'debole', 'calmo', 'lento'].filter(w => !item.antonyms.includes(w))).slice(0, 3);
        return {
            type: 'verbale',
            question: `Trova il contrario di "${item.word}":`,
            correct: item.antonyms[0],
            options: shuffle([item.antonyms[0], ...wrong]),
            explanation: `Il contrario di "${item.word}" è "${item.antonyms[0]}".`
        };
    }
}

// ============================================
// GENERATORI DI QUIZ NUMERICI
// ============================================
function generaSequenzaNumerica(livello) {
    let length, rule, start, seq = [];
    const maxNum = 100;
    if (livello <= 3) {
        length = 5;
        const step = randomInt(2, 5);
        const start = randomInt(1, 10);
        for (let i = 0; i < length; i++) seq.push(start + i * step);
        rule = `+${step}`;
    } else if (livello <= 6) {
        length = 6;
        const step = randomInt(2, 4);
        const start = randomInt(2, 6);
        for (let i = 0; i < length; i++) seq.push(start * Math.pow(step, i));
        rule = `*${step}`;
    } else {
        length = 7;
        let a = randomInt(1, 3), b = randomInt(4, 7);
        seq = [a, b];
        for (let i = 2; i < length; i++) seq.push(seq[i-1] + seq[i-2]);
        rule = "somma dei due precedenti";
    }
    const missingIdx = seq.length - 1;
    const correct = seq[missingIdx];
    seq[missingIdx] = "?";
    
    const wrongAnswers = new Set();
    while (wrongAnswers.size < 4) {
        let w = correct + randomInt(-10, 10);
        if (w !== correct && w > 0 && w < 1000) wrongAnswers.add(w);
    }
    const options = shuffle([correct, ...Array.from(wrongAnswers).slice(0, 4)]);
    return {
        type: 'numerico',
        question: `Completa la sequenza: ${seq.join(", ")}`,
        correct: correct,
        options: options,
        explanation: `La regola è: ${rule}. Il numero mancante è ${correct}.`
    };
}

// ============================================
// GENERATORI DI QUIZ SPAZIALI (Cubi con D3) - versione semplificata
// ============================================
function generaCuboSpaziale() {
    const facce = ['red', 'green', 'blue', 'yellow', 'orange', 'purple'];
    const posizioni = ['left', 'right', 'top', 'bottom', 'front', 'back'];
    const configurazione = {};
    facce.forEach((colore, i) => configurazione[posizioni[i]] = colore);
    
    const rotazioniPossibili = ['right', 'left', 'up', 'down'];
    const rotazione = randomChoice(rotazioniPossibili);
    let nuovaConfig = {...configurazione};
    if (rotazione === 'right') {
        nuovaConfig.front = configurazione.right;
        nuovaConfig.right = configurazione.back;
        nuovaConfig.back = configurazione.left;
        nuovaConfig.left = configurazione.front;
    } else if (rotazione === 'left') {
        nuovaConfig.front = configurazione.left;
        nuovaConfig.left = configurazione.back;
        nuovaConfig.back = configurazione.right;
        nuovaConfig.right = configurazione.front;
    } else if (rotazione === 'up') {
        nuovaConfig.front = configurazione.bottom;
        nuovaConfig.bottom = configurazione.back;
        nuovaConfig.back = configurazione.top;
        nuovaConfig.top = configurazione.front;
    } else if (rotazione === 'down') {
        nuovaConfig.front = configurazione.top;
        nuovaConfig.top = configurazione.back;
        nuovaConfig.back = configurazione.bottom;
        nuovaConfig.bottom = configurazione.front;
    }
    
    const distrattori = [];
    for (let i = 0; i < 3; i++) {
        let facceMix = shuffle([...facce]);
        let falso = {};
        posizioni.forEach((p, idx) => falso[p] = facceMix[idx]);
        distrattori.push(falso);
    }
    const tutteOpzioni = shuffle([nuovaConfig, ...distrattori]);
    return {
        type: 'spaziale',
        question: 'Osserva il cubo. Quale delle seguenti figure mostra la rotazione corretta?',
        correct: nuovaConfig,
        options: tutteOpzioni,
        render: 'cubo3D',
        explanation: `Ruotando il cubo verso ${rotazione}, la faccia ${nuovaConfig.front} diventa frontale.`
    };
}

// ============================================
// GENERATORI DI QUIZ VISIVI (Matrici con forme)
// ============================================
function generaMatriceVisiva(livello) {
    const size = livello <= 4 ? 2 : 3;
    const shapes = ['circle', 'square', 'triangle', 'diamond'];
    const fills = ['none', 'solid', 'hatch'];
    let matrix = [];
    for (let i = 0; i < size; i++) {
        matrix[i] = [];
        for (let j = 0; j < size; j++) {
            const shapeIndex = (i + j) % shapes.length;
            const fillIndex = (i * j) % fills.length;
            matrix[i][j] = { shape: shapes[shapeIndex], fill: fills[fillIndex] };
        }
    }
    const correct = matrix[size-1][size-1];
    matrix[size-1][size-1] = null;
    
    const options = [];
    for (let k = 0; k < 4; k++) {
        let opt;
        if (k === 0) opt = correct;
        else {
            const fakeShape = randomChoice(shapes);
            const fakeFill = randomChoice(fills);
            opt = { shape: fakeShape, fill: fakeFill };
        }
        options.push(opt);
    }
    return {
        type: 'visivo',
        question: 'Quale figura completa la matrice?',
        matrix: matrix,
        correct: correct,
        options: shuffle(options),
        render: 'matrice',
        explanation: `La regola: la forma dipende dalla somma degli indici (${(size-1)+(size-1)}), il riempimento dal prodotto (${(size-1)*(size-1)}).`
    };
}
