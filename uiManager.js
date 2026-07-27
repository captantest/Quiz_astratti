// uiManager.js - Gestione completa dell'interfaccia utente e del flusso del test
// Dipende da QuizGenerator e data.js; utilizza D3 per disegnare matrici e cubi

class QuizApp {
    constructor() {
        this.quizGen = new QuizGenerator();
        this.totalQuestions = 20;
        this.timerEnabled = false;
        this.timerDuration = 60; // secondi
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.responses = []; // per statistiche
        this.timerInterval = null;
        this.timeLeft = 0;
        this.questionStartTime = 0;
        
        this.loadSettings();
        this.bindEvents();
        this.showScreen('intro');
    }

    loadSettings() {
        const saved = JSON.parse(localStorage.getItem('quizSettings')) || {};
        if (saved.numQuestions) this.totalQuestions = saved.numQuestions;
        if (saved.timerEnabled !== undefined) this.timerEnabled = saved.timerEnabled;
        if (saved.timerDuration) this.timerDuration = saved.timerDuration;
        document.getElementById('num-questions').value = this.totalQuestions;
        document.getElementById('enable-timer').checked = this.timerEnabled;
        document.getElementById('timer-duration').value = this.timerDuration;
        this.updateHighScoreDisplay();
    }

    saveSettings() {
        localStorage.setItem('quizSettings', JSON.stringify({
            numQuestions: this.totalQuestions,
            timerEnabled: this.timerEnabled,
            timerDuration: this.timerDuration
        }));
    }

    bindEvents() {
        document.getElementById('start-btn').addEventListener('click', () => this.startTest());
        document.getElementById('quit-btn').addEventListener('click', () => this.endTest());
        document.getElementById('restart-btn').addEventListener('click', () => this.restart());
        document.getElementById('help-btn').addEventListener('click', () => this.showSolution());
        document.getElementById('enable-timer').addEventListener('change', (e) => {
            this.timerEnabled = e.target.checked;
            this.saveSettings();
        });
        document.getElementById('num-questions').addEventListener('change', (e) => {
            this.totalQuestions = parseInt(e.target.value);
            this.saveSettings();
        });
        document.getElementById('timer-duration').addEventListener('change', (e) => {
            this.timerDuration = parseInt(e.target.value);
            this.saveSettings();
        });
    }

    showScreen(screen) {
        document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
        document.getElementById(screen + '-screen').style.display = 'block';
    }

    startTest() {
        this.quizGen.reset();
        this.score = 0;
        this.responses = [];
        this.currentQuestionIndex = 0;
        this.showScreen('quiz');
        this.renderQuestion();
    }

    renderQuestion() {
        // Genera nuova domanda
        const question = this.quizGen.generateQuestion();
        this.currentQuestion = question;
        this.questionStartTime = Date.now();
        
        // Aggiorna progresso
        const progress = (this.currentQuestionIndex / this.totalQuestions) * 100;
        document.getElementById('progress-bar').style.width = `${progress}%`;
        
        // Pulisce area domanda e opzioni
        const questionArea = document.getElementById('question-area');
        questionArea.innerHTML = '';
        const qText = document.createElement('div');
        qText.className = 'question-text';
        qText.textContent = question.question;
        questionArea.appendChild(qText);
        
        // Se richiede visualizzazione grafica (matrice o cubo)
        if (question.render) {
            const svgContainer = document.createElement('div');
            svgContainer.id = 'visual-container';
            questionArea.appendChild(svgContainer);
            if (question.render === 'matrice') {
                this.drawMatrix(svgContainer, question.matrix);
            } else if (question.render === 'cubo3D') {
                this.drawCube(svgContainer, question.correct); // mostriamo cubo originale? Per semplificare mostreremo il cubo di riferimento (non ruotato) e le opzioni sono altri cubi
                // In realtà la domanda spaziale mostra un cubo con configurazione nota e chiede la rotazione
            }
        }
        
        // Opzioni
        const optionsContainer = document.getElementById('options-container');
        optionsContainer.innerHTML = '';
        question.options.forEach((opt, index) => {
            const card = document.createElement('div');
            card.className = 'option-card';
            // Se l'opzione è un oggetto (es. cubo) dobbiamo renderizzare una miniatura
            if (typeof opt === 'object' && opt !== null && question.type === 'spaziale') {
                // Crea un piccolo svg per il cubo opzione
                const miniSvg = this.createMiniCubeSVG(opt);
                card.appendChild(miniSvg);
            } else {
                card.textContent = opt.toString();
            }
            card.addEventListener('click', () => this.selectOption(index, card));
            optionsContainer.appendChild(card);
        });
        
        // Timer
        if (this.timerEnabled) {
            this.startTimer();
        } else {
            document.getElementById('timer-display').textContent = '';
        }
        
        // Nascondi feedback
        const fb = document.getElementById('feedback');
        fb.classList.remove('feedback-visible', 'feedback-correct', 'feedback-wrong');
        fb.textContent = '';
    }

    selectOption(index, cardElement) {
        // Previeni doppia selezione
        if (this.answered) return;
        this.answered = true;
        
        // Ferma timer
        this.stopTimer();
        const responseTime = (Date.now() - this.questionStartTime) / 1000;
        
        const isCorrect = index === this.currentQuestion.options.indexOf(this.currentQuestion.correct);
        // Aggiorna punteggio e difficoltà
        if (isCorrect) this.score++;
        this.quizGen.updateDifficulty(isCorrect, responseTime, this.timerDuration);
        this.responses.push({ correct: isCorrect, time: responseTime });
        
        // Feedback visivo
        const allCards = document.querySelectorAll('.option-card');
        allCards.forEach((card, i) => {
            card.style.pointerEvents = 'none';
            if (i === index) {
                card.classList.add(isCorrect ? 'correct-feedback' : 'wrong-feedback');
            }
        });
        
        const fb = document.getElementById('feedback');
        fb.classList.add('feedback-visible');
        if (isCorrect) {
            fb.classList.add('feedback-correct');
            fb.innerHTML = `✅ Corretto! ${this.currentQuestion.explanation}`;
        } else {
            fb.classList.add('feedback-wrong');
            fb.innerHTML = `❌ Sbagliato. La risposta corretta è: ${this.currentQuestion.correct}. ${this.currentQuestion.explanation}`;
        }
        
        // Dopo breve pausa passa alla prossima domanda
        setTimeout(() => {
            this.nextQuestion();
        }, 2000);
    }

    nextQuestion() {
        this.currentQuestionIndex++;
        if (this.currentQuestionIndex >= this.totalQuestions) {
            this.endTest();
        } else {
            this.answered = false;
            this.renderQuestion();
        }
    }

    showSolution() {
        if (this.answered) return;
        // Mostra la soluzione e segna come risposta errata (aiuto)
        this.stopTimer();
        this.answered = true;
        const responseTime = (Date.now() - this.questionStartTime) / 1000;
        this.quizGen.updateDifficulty(false, responseTime, this.timerDuration);
        this.responses.push({ correct: false, time: responseTime, helped: true });
        
        const correctOption = this.currentQuestion.correct;
        const fb = document.getElementById('feedback');
        fb.classList.add('feedback-visible', 'feedback-wrong');
        fb.innerHTML = `La risposta corretta è: ${correctOption}. ${this.currentQuestion.explanation}`;
        
        // Disabilita opzioni
        document.querySelectorAll('.option-card').forEach(card => card.style.pointerEvents = 'none');
        setTimeout(() => this.nextQuestion(), 2000);
    }

    startTimer() {
        this.timeLeft = this.timerDuration;
        this.updateTimerDisplay();
        this.timerInterval = setInterval(() => {
            this.timeLeft--;
            this.updateTimerDisplay();
            if (this.timeLeft <= 0) {
                this.handleTimeout();
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    updateTimerDisplay() {
        const display = document.getElementById('timer-display');
        display.textContent = `Tempo: ${this.timeLeft}s`;
        display.className = 'timer';
        if (this.timeLeft <= 10) display.classList.add('timer-danger');
        else if (this.timeLeft <= 20) display.classList.add('timer-warning');
    }

    handleTimeout() {
        this.stopTimer();
        if (this.answered) return;
        // Tempo scaduto -> errore automatico
        this.answered = true;
        document.getElementById('feedback').classList.add('feedback-visible', 'feedback-wrong');
        document.getElementById('feedback').innerHTML = `⏰ Tempo scaduto! La risposta corretta era: ${this.currentQuestion.correct}. ${this.currentQuestion.explanation}`;
        this.quizGen.updateDifficulty(false, this.timerDuration, this.timerDuration);
        this.responses.push({ correct: false, time: this.timerDuration, timeout: true });
        document.querySelectorAll('.option-card').forEach(card => card.style.pointerEvents = 'none');
        setTimeout(() => this.nextQuestion(), 2000);
    }

    endTest() {
        this.stopTimer();
        this.showScreen('result');
        const accuracy = this.score / this.totalQuestions * 100;
        const avgTime = this.responses.reduce((s, r) => s + r.time, 0) / this.responses.length;
        document.getElementById('final-score').textContent = `${this.score} / ${this.totalQuestions}`;
        document.getElementById('performance-stats').innerHTML = `
            Accuratezza: ${accuracy.toFixed(1)}%<br>
            Tempo medio per risposta: ${avgTime.toFixed(1)}s<br>
            Livello difficoltà raggiunto: ${this.quizGen.getLevel()}
        `;
        this.saveHighScore();
        this.updateHighScoreDisplay();
    }

    saveHighScore() {
        const prev = JSON.parse(localStorage.getItem('quizHighScore')) || { score: 0, total: 0 };
        if (this.score / this.totalQuestions > prev.score / prev.total) {
            localStorage.setItem('quizHighScore', JSON.stringify({ score: this.score, total: this.totalQuestions }));
        }
    }

    updateHighScoreDisplay() {
        const hs = JSON.parse(localStorage.getItem('quizHighScore'));
        const el = document.getElementById('high-score-display');
        if (hs && hs.score) {
            el.textContent = `🏆 Miglior punteggio: ${hs.score}/${hs.total} (${(hs.score/hs.total*100).toFixed(0)}%)`;
        } else {
            el.textContent = '';
        }
    }

    restart() {
        this.quizGen.reset();
        this.showScreen('intro');
    }

    // ======== Funzioni di disegno con D3 ========
    drawMatrix(container, matrix) {
        const size = matrix.length;
        const cellSize = 70;
        const svg = d3.select(container).append('svg')
            .attr('width', size * cellSize)
            .attr('height', size * cellSize);
        
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const cell = matrix[i][j];
                const g = svg.append('g')
                    .attr('transform', `translate(${j*cellSize+cellSize/2}, ${i*cellSize+cellSize/2})`);
                if (cell) {
                    this.drawShape(g, cell.shape, cell.fill, cellSize*0.35);
                } else {
                    g.append('text').text('?').attr('text-anchor', 'middle').attr('dy', '0.3em').style('font-size', '24px');
                }
                // Bordo cella
                svg.append('rect')
                    .attr('x', j*cellSize).attr('y', i*cellSize)
                    .attr('width', cellSize).attr('height', cellSize)
                    .attr('fill', 'none').attr('stroke', '#cbd5e1').attr('stroke-width', 2);
            }
        }
    }

    drawShape(g, shape, fill, size) {
        switch(shape) {
            case 'circle':
                g.append('circle').attr('r', size).attr('fill', fill === 'solid' ? '#2563eb' : 'none').attr('stroke', '#1e293b').attr('stroke-width', 2);
                break;
            case 'square':
                g.append('rect').attr('x', -size).attr('y', -size).attr('width', size*2).attr('height', size*2)
                    .attr('fill', fill === 'solid' ? '#2563eb' : 'none').attr('stroke', '#1e293b').attr('stroke-width', 2);
                break;
            // ... altri casi triangolo, diamante
        }
    }

    drawCube(container, config) {
        // Disegna un cubo 3D isometrico semplificato (3 facce visibili)
        // Implementazione omessa per brevità, utilizzerebbe D3 path per poligoni colorati
    }

    createMiniCubeSVG(config) {
        // Restituisce un elemento SVG ridotto per le opzioni spaziali
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '60');
        svg.setAttribute('height', '60');
        // ... disegna cubo piccolo
        return svg;
    }
}
