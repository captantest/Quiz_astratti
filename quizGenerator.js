// quizGenerator.js - Logica di generazione e adattamento difficoltà (con Web Worker per matrici pesanti)

class QuizGenerator {
    constructor() {
        this.currentDifficulty = 5.0; // Scala 1-10
        this.questionHistory = [];
        this.maxHistory = 20;
    }

    updateDifficulty(correct, responseTimeSec, targetTimeSec) {
        const fastThreshold = targetTimeSec * 0.5;
        let delta = 0;
        if (correct) {
            delta = responseTimeSec < fastThreshold ? 0.8 : 0.4;
        } else {
            delta = responseTimeSec < fastThreshold ? -0.5 : -0.9;
        }
        this.currentDifficulty = Math.min(10, Math.max(1, this.currentDifficulty + delta));
    }

    getLevel() {
        const d = this.currentDifficulty;
        if (d <= 2) return 1;
        if (d <= 4) return 2;
        if (d <= 6) return 3;
        if (d <= 8) return 4;
        return 5;
    }

    async generateQuestion() {
        const level = this.getLevel();
        const typeWeights = {
            1: { verbale: 0.3, numerico: 0.3, visivo: 0.3, spaziale: 0.1 },
            2: { verbale: 0.25, numerico: 0.25, visivo: 0.3, spaziale: 0.2 },
            3: { verbale: 0.2, numerico: 0.3, visivo: 0.25, spaziale: 0.25 },
            4: { verbale: 0.15, numerico: 0.3, visivo: 0.25, spaziale: 0.3 },
            5: { verbale: 0.1, numerico: 0.3, visivo: 0.25, spaziale: 0.35 }
        };
        const weights = typeWeights[level];
        const types = Object.keys(weights);
        const probs = types.map(t => weights[t]);
        const random = Math.random();
        let cum = 0;
        let chosenType = types[0];
        for (let i = 0; i < types.length; i++) {
            cum += probs[i];
            if (random <= cum) {
                chosenType = types[i];
                break;
            }
        }
        
        let question;
        let attempts = 0;
        const maxAttempts = 10;
        do {
            question = await this._createQuestionOfType(chosenType, level);
            attempts++;
        } while (attempts < maxAttempts && this._isDuplicate(question));
        
        this._addToHistory(question);
        return question;
    }

    async _createQuestionOfType(type, level) {
        switch(type) {
            case 'verbale':
                return Math.random() < 0.5 ? generaAnalogiaVerbale() : generaSinonimoContrario();
            case 'numerico':
                return generaSequenzaNumerica(level);
            case 'spaziale':
                return generaCuboSpaziale();
            case 'visivo':
                return this._generateVisual(level);
            default:
                return generaSequenzaNumerica(level);
        }
    }

    async _generateVisual(level) {
        if (level >= 4 && window.Worker) {
            return this._generateVisualWithWorker(level);
        } else {
            return generaMatriceVisiva(level);
        }
    }

    _generateVisualWithWorker(level) {
        return new Promise((resolve, reject) => {
            try {
                const worker = new Worker('worker.js');
                worker.onmessage = (e) => {
                    if (e.data.error) {
                        console.warn('Worker error, falling back to sync:', e.data.error);
                        resolve(generaMatriceVisiva(level));
                    } else {
                        resolve(e.data.question);
                    }
                    worker.terminate();
                };
                worker.onerror = (err) => {
                    console.warn('Worker error, falling back to sync:', err);
                    resolve(generaMatriceVisiva(level));
                    worker.terminate();
                };
                worker.postMessage({ task: 'generateMatrix', level: level });
            } catch (e) {
                console.warn('Worker not supported, using sync generator');
                resolve(generaMatriceVisiva(level));
            }
        });
    }

    _isDuplicate(q) {
        return this.questionHistory.some(h => 
            h.question === q.question && JSON.stringify(h.correct) === JSON.stringify(q.correct)
        );
    }

    _addToHistory(question) {
        this.questionHistory.push({
            question: question.question,
            correct: question.correct,
            type: question.type
        });
        if (this.questionHistory.length > this.maxHistory) {
            this.questionHistory.shift();
        }
    }

    reset() {
        this.currentDifficulty = 5.0;
        this.questionHistory = [];
    }
}
