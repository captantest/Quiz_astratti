// uiManager.js - Gestione completa interfaccia (fix feedback [object Object])

class QuizApp {
    constructor() {
        this.quizGen = new QuizGenerator();
        this.totalQuestions = 20;
        this.timerEnabled = false;
        this.timerDuration = 60;
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.responses = [];
        this.timerInterval = null;
        this.timeLeft = 0;
        this.questionStartTime = 0;
        this.answered = false;
        this.currentQuestion = null;
        
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

    async startTest() {
        this.quizGen.reset();
        this.score = 0;
        this.responses = [];
        this.currentQuestionIndex = 0;
        this.answered = false;
        this.showScreen('quiz');
        await this.renderQuestion();
    }

    async renderQuestion() {
        const question = await this.quizGen.generateQuestion();
        this.currentQuestion = question;
        this.answered = false;
        this.questionStartTime = Date.now();
        
        const progress = (this.currentQuestionIndex / this.totalQuestions) * 100;
        document.getElementById('progress-bar').style.width = `${progress}%`;
        
        const questionArea = document.getElementById('question-area');
        questionArea.innerHTML = '';
        const qText = document.createElement('div');
        qText.className = 'question-text';
        qText.textContent = question.question;
        questionArea.appendChild(qText);
        
        if (question.render) {
            const svgContainer = document.createElement('div');
            svgContainer.id = 'visual-container';
            questionArea.appendChild(svgContainer);
            if (question.render === 'matrice') {
                this.drawMatrix(svgContainer, question.matrix);
            } else if (question.render === 'cubo3D') {
                this.drawCube(svgContainer, question.correct);
            }
        }
        
        const optionsContainer = document.getElementById('options-container');
        optionsContainer.innerHTML = '';
        question.options.forEach((opt, index) => {
            const card = document.createElement('div');
            card.className = 'option-card';
            
            // Rendering specifico per tipo di domanda
            if (question.type === 'visivo' && typeof opt === 'object' && opt.shape) {
                const svg = this.createShapeSVG(opt.shape, opt.fill);
                card.appendChild(svg);
                // Aggiungi testo alternativo per accessibilità
                card.setAttribute('aria-label', this.optionToReadable(opt, question.type));
            } else if (question.type === 'spaziale' && typeof opt === 'object' && opt.front) {
                const miniSvg = this.createMiniCubeSVG(opt);
                card.appendChild(miniSvg);
                card.setAttribute('aria-label', this.optionToReadable(opt, question.type));
            } else {
                card.textContent = opt.toString();
            }
            
            card.addEventListener('click', () => this.selectOption(index, card));
            optionsContainer.appendChild(card);
        });
        
        if (this.timerEnabled) {
            this.startTimer();
        } else {
            document.getElementById('timer-display').textContent = '';
        }
        
        const fb = document.getElementById('feedback');
        fb.classList.remove('feedback-visible', 'feedback-correct', 'feedback-wrong');
        fb.textContent = '';
    }

    selectOption(index, cardElement) {
        if (this.answered) return;
        this.answered = true;
        
        this.stopTimer();
        const responseTime = (Date.now() - this.questionStartTime) / 1000;
        
        const correctIndex = this.currentQuestion.options.findIndex(
            opt => JSON.stringify(opt) === JSON.stringify(this.currentQuestion.correct)
        );
        const isCorrect = index === correctIndex;
        
        if (isCorrect) this.score++;
        this.quizGen.updateDifficulty(isCorrect, responseTime, this.timerDuration);
        this.responses.push({ correct: isCorrect, time: responseTime });
        
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
            // Usa la funzione per visualizzare la risposta corretta in formato leggibile
            const correctReadable = this.optionToReadable(this.currentQuestion.correct, this.currentQuestion.type);
            fb.innerHTML = `❌ Sbagliato. La risposta corretta è: ${correctReadable}. ${this.currentQuestion.explanation}`;
        }
        
        setTimeout(() => {
            this.nextQuestion();
        }, 2000);
    }

    async nextQuestion() {
        this.currentQuestionIndex++;
        if (this.currentQuestionIndex >= this.totalQuestions) {
            this.endTest();
        } else {
            this.answered = false;
            await this.renderQuestion();
        }
    }

    showSolution() {
        if (this.answered) return;
        this.stopTimer();
        this.answered = true;
        const responseTime = (Date.now() - this.questionStartTime) / 1000;
        this.quizGen.updateDifficulty(false, responseTime, this.timerDuration);
        this.responses.push({ correct: false, time: responseTime, helped: true });
        
        const fb = document.getElementById('feedback');
        fb.classList.add('feedback-visible', 'feedback-wrong');
        const correctReadable = this.optionToReadable(this.currentQuestion.correct, this.currentQuestion.type);
        fb.innerHTML = `La risposta corretta è: ${correctReadable}. ${this.currentQuestion.explanation}`;
        
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
        if (this.timeLeft <= 10) {
            display.classList.add('timer-danger');
        } else if (this.timeLeft <= 20) {
            display.classList.add('timer-warning');
        }
    }

    handleTimeout() {
        this.stopTimer();
        if (this.answered) return;
        this.answered = true;
        document.getElementById('feedback').classList.add('feedback-visible', 'feedback-wrong');
        const correctReadable = this.optionToReadable(this.currentQuestion.correct, this.currentQuestion.type);
        document.getElementById('feedback').innerHTML = `⏰ Tempo scaduto! La risposta corretta era: ${correctReadable}. ${this.currentQuestion.explanation}`;
        this.quizGen.updateDifficulty(false, this.timerDuration, this.timerDuration);
        this.responses.push({ correct: false, time: this.timerDuration, timeout: true });
        document.querySelectorAll('.option-card').forEach(card => card.style.pointerEvents = 'none');
        setTimeout(() => this.nextQuestion(), 2000);
    }

    endTest() {
        this.stopTimer();
        this.showScreen('result');
        const accuracy = this.score / this.totalQuestions * 100;
        const avgTime = this.responses.length ? this.responses.reduce((s, r) => s + r.time, 0) / this.responses.length : 0;
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

    // ======== FUNZIONE UTILITY PER DESCRIZIONE LEGGIBILE ========
    /**
     * Converte un'opzione (che può essere stringa, numero o oggetto) in testo leggibile
     */
    optionToReadable(option, type) {
        if (type === 'visivo' && typeof option === 'object' && option.shape) {
            const fillMap = { 'none': 'vuoto', 'solid': 'pieno', 'hatch': 'tratteggiato' };
            const shapeMap = { 'circle': 'cerchio', 'square': 'quadrato', 'triangle': 'triangolo', 'diamond': 'rombo' };
            const shapeText = shapeMap[option.shape] || option.shape;
            const fillText = fillMap[option.fill] || option.fill;
            return `${shapeText} ${fillText}`;
        }
        if (type === 'spaziale' && typeof option === 'object' && option.front) {
            return `Cubo con frontale ${option.front}, alto ${option.top}, destra ${option.right}`;
        }
        return option.toString();
    }

    // ======== DISEGNO ========
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
            case 'triangle':
                const points = `0,${-size} ${-size},${size} ${size},${size}`;
                g.append('polygon').attr('points', points).attr('fill', fill === 'solid' ? '#2563eb' : 'none').attr('stroke', '#1e293b').attr('stroke-width', 2);
                break;
            case 'diamond':
                const dPoints = `0,${-size} ${size},0 0,${size} ${-size},0`;
                g.append('polygon').attr('points', dPoints).attr('fill', fill === 'solid' ? '#2563eb' : 'none').attr('stroke', '#1e293b').attr('stroke-width', 2);
                break;
        }
    }

    drawCube(container, config) {
        const svg = d3.select(container).append('svg').attr('width', 150).attr('height', 150);
        const front = `M 50,80 L 90,80 L 90,110 L 50,110 Z`;
        const top = `M 50,80 L 70,60 L 110,60 L 90,80 Z`;
        const right = `M 90,80 L 110,60 L 110,90 L 90,110 Z`;
        svg.append('polygon').attr('points', front).attr('fill', config.front);
        svg.append('polygon').attr('points', top).attr('fill', config.top);
        svg.append('polygon').attr('points', right).attr('fill', config.right);
    }

    createMiniCubeSVG(config) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '60');
        svg.setAttribute('height', '60');
        const front = `M 20,35 L 40,35 L 40,55 L 20,55 Z`;
        const top = `M 20,35 L 30,20 L 50,20 L 40,35 Z`;
        const right = `M 40,35 L 50,20 L 50,40 L 40,55 Z`;
        const polygons = [
            { points: front, fill: config.front },
            { points: top, fill: config.top },
            { points: right, fill: config.right }
        ];
        polygons.forEach(p => {
            const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            poly.setAttribute('points', p.points);
            poly.setAttribute('fill', p.fill);
            svg.appendChild(poly);
        });
        return svg;
    }

    createShapeSVG(shape, fill) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '50');
        svg.setAttribute('height', '50');
        const size = 20;
        const centerX = 25, centerY = 25;
        let element;
        switch(shape) {
            case 'circle':
                element = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                element.setAttribute('cx', centerX);
                element.setAttribute('cy', centerY);
                element.setAttribute('r', size);
                break;
            case 'square':
                element = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                element.setAttribute('x', centerX - size);
                element.setAttribute('y', centerY - size);
                element.setAttribute('width', size * 2);
                element.setAttribute('height', size * 2);
                break;
            case 'triangle':
                element = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                const triPoints = `${centerX},${centerY - size} ${centerX - size},${centerY + size} ${centerX + size},${centerY + size}`;
                element.setAttribute('points', triPoints);
                break;
            case 'diamond':
                element = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                const diaPoints = `${centerX},${centerY - size} ${centerX + size},${centerY} ${centerX},${centerY + size} ${centerX - size},${centerY}`;
                element.setAttribute('points', diaPoints);
                break;
            default:
                element = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                element.setAttribute('cx', centerX);
                element.setAttribute('cy', centerY);
                element.setAttribute('r', size);
        }
        element.setAttribute('fill', fill === 'solid' ? '#2563eb' : 'none');
        element.setAttribute('stroke', '#1e293b');
        element.setAttribute('stroke-width', '2');
        svg.appendChild(element);
        return svg;
    }
}
