// --- ÉLÉMENTS DU DOM ---
// (Mis à jour pour inclure les nouveaux ID)
const dom = {
    // Listes S1-S3 + SAE
    cbSAE24: document.getElementById('cb-sae24'),
    cbS1: document.getElementById('cb-s1'),
    cbS2: document.getElementById('cb-s2'),
    cbS3: document.getElementById('cb-s3'),

    // Listes "Autres-mots"
    cbLiaisons: document.getElementById('cb-liaisons'),
    cbVocabulaire: document.getElementById('cb-vocabulaire'),
    cbVocabulaireLiaisons: document.getElementById('cb-vocabulaire-liaisons'),

    // Contrôles
    updateListBtn: document.getElementById('update-list-btn'),
    smartModeCheckbox: document.getElementById('smart-mode'),
    
    // Affichage
    scorePercent: document.getElementById('score-percent'),
    scoreCorrect: document.getElementById('score-correct'),
    scoreTotal: document.getElementById('score-total'),
    promptType: document.getElementById('prompt-type'),
    wordPrompt: document.getElementById('word-prompt'),
    answerInput: document.getElementById('answer-input'),
    submitBtn: document.getElementById('submit-btn'),
    feedbackText: document.getElementById('feedback-text'),
    correctAnswersText: document.getElementById('correct-answers')
};

// --- CARTE DE CONFIGURATION DES FICHIERS ---
// (Mis à jour avec les nouveaux chemins et éléments)
const vocabFileMap = [
    // Listes S1-S3 + SAE
    { element: dom.cbSAE24, path: 'vocabulaire_sae24.txt' },
    { element: dom.cbS1, path: 'vocabulaire_s1.txt' },
    { element: dom.cbS2, path: 'vocabulaire_s2.txt' },
    { element: dom.cbS3, path: 'vocabulaire_s3.txt' },
    
    // Nouvelles listes "Autres-mots"
    { element: dom.cbLiaisons, path: 'Autres-mots/Liaisons/vocabulaire.txt' },
    { element: dom.cbVocabulaire, path: 'Autres-mots/Vocabulaire/vocabulaire.txt' },
    { element: dom.cbVocabulaireLiaisons, path: 'Autres-mots/Vocabulaire-liaisons/vocabulaire.txt' }
];

// --- VARIABLES D'ÉTAT ---
let masterVocabList = []; 
let quizList = []; 
let currentWord = {};
let currentMode = 0; 
let correctAnswers = 0;
let totalAnswers = 0;
let isSmartMode = true;

// --- FONCTIONS DE NETTOYAGE ET CHARGEMENT ---

/**
 * Nettoie une chaîne de caractères, comme la fonction 'clean' de Python.
 */
function cleanString(s) {
    if (!s) return "";
    return s.toLowerCase()
            .trim()
            .normalize("NFD") // Sépare les accents des lettres
            .replace(/[\u0300-\u036f]/g, "") // Supprime les accents
            .replace(/[-',]/g, " "); // Remplace - ' , par des espaces
}

/**
 * Prend le contenu textuel d'un fichier .txt et le transforme en liste d'objets.
 * Version SANS REGEX, plus robuste.
 */
function parseVocabText(text) {
    const vocab = [];
    const lines = text.split('\n'); // Sépare le texte en lignes

    lines.forEach(line => {
        let cleanLine = line.trim(); // Nettoyage initial

        // 1. Nettoyage des balises SANS REGEX
        if (cleanLine.startsWith('[')) {
            const closingBracketIndex = cleanLine.indexOf(']');
            if (closingBracketIndex !== -1) {
                // Si on trouve un ']', on prend tout ce qui vient APRES
                cleanLine = cleanLine.substring(closingBracketIndex + 1).trim();
            }
        }

        // 2. On garde la logique originale pour extraire le mot
        if (cleanLine && cleanLine.includes(':')) {
            const parts = cleanLine.split(':');
            const eng = parts[0].trim();
            const fr = parts.slice(1).join(':').trim(); // Gère les ':' dans la traduction

            // Ignore les lignes mal formées
            if (eng && fr) {
                vocab.push({ en: eng, fr: fr });
            }
        }
    });
    return vocab;
}

/**
 * Récupère un fichier .txt depuis le serveur et le parse.
 */
async function loadVocabFile(fileName) {
    try {
        const response = await fetch(fileName); // Demande le fichier
        if (!response.ok) { // Vérifie si le fichier existe
            console.error(`Erreur: Fichier ${fileName} introuvable (404).`);
            alert(`Erreur: Fichier ${fileName} introuvable. Vérifiez le nom et le chemin.`);
            return [];
        }
        const text = await response.text(); // Récupère le contenu texte
        return parseVocabText(text); // Transforme le texte en liste
    } catch (error) {
        console.error(`Impossible de charger ${fileName}:`, error);
        alert(`Une erreur est survenue en chargeant ${fileName}. Vérifiez la console.`);
        return [];
    }
}

// --- FONCTIONS LOGIQUES DU QUIZ ---

/**
 * Construit la liste de quiz basée sur les cases cochées.
 * Utilise la 'vocabFileMap'
 */
async function buildQuizList() {
    masterVocabList = [];
    
    // Affiche un message de chargement
    dom.wordPrompt.textContent = "Chargement du vocabulaire...";
    
    // Boucle sur notre carte de configuration
    for (const item of vocabFileMap) {
        // On vérifie que l'élément HTML existe ET qu'il est coché
        if (item.element && item.element.checked) {
            try {
                // On charge le fichier associé
                const vocabData = await loadVocabFile(item.path);
                masterVocabList = masterVocabList.concat(vocabData);
                console.log(`Chargé avec succès : ${item.path}`);
            } catch (error) {
                console.error(`Erreur de chargement pour ${item.path}:`, error);
            }
        }
    }
    
    // Réinitialise la liste de travail et le score
    quizList = [...masterVocabList]; 
    correctAnswers = 0;
    totalAnswers = 0;
    updateScore();
    
    if (quizList.length === 0) {
        dom.promptType.textContent = "Erreur";
        dom.wordPrompt.textContent = "Aucun mot chargé. Vérifiez les cases et les fichiers .txt.";
    } else {
        displayNewQuestion();
    }
}

/**
 * Affiche une nouvelle question.
 */
function displayNewQuestion() {
    dom.feedbackText.textContent = "";
    dom.correctAnswersText.textContent = "";
    dom.answerInput.value = "";
    dom.feedbackText.className = "";
    
    if (quizList.length === 0) {
        dom.promptType.textContent = "Terminé !";
        dom.wordPrompt.textContent = "Bravo ! (ou rechargez les listes)";
        return;
    }

    currentWord = quizList[Math.floor(Math.random() * quizList.length)];
    
    currentMode = Math.floor(Math.random() * 2);
    
    if (currentMode === 0) {
        dom.promptType.textContent = "Traduire en Français :";
        dom.wordPrompt.textContent = currentWord.en;
    } else { 
        dom.promptType.textContent = "Traduire en Anglais :";
        dom.wordPrompt.textContent = currentWord.fr;
    }
    
    dom.answerInput.focus();
}

/**
 * Vérifie la réponse de l'utilisateur.
 */
function checkAnswer() {
    const userInput = dom.answerInput.value;
    if (!userInput) return; 

    const cleanedInput = cleanString(userInput);
    let possibleTranslations = [];
    
    if (currentMode === 0) { // EN->FR
        possibleTranslations = masterVocabList
            .filter(item => cleanString(item.en) === cleanString(currentWord.en))
            .map(item => item.fr);
    } else { // FR->EN
        possibleTranslations = masterVocabList
            .filter(item => cleanString(item.fr) === cleanString(currentWord.fr))
            .map(item => item.en);
    }

    const cleanedPossibilities = possibleTranslations.map(cleanString);
    
    if (cleanedPossibilities.includes(cleanedInput)) {
        dom.feedbackText.textContent = "✅ Correct !";
        dom.feedbackText.className = "correct";
        correctAnswers++;
        totalAnswers++;
    } else {
        dom.feedbackText.textContent = "❌ Faux.";
        dom.feedbackText.className = "incorrect";
        totalAnswers++;
        
        if (isSmartMode) {
            for (let i = 0; i < 10; i++) {
                quizList.push(currentWord);
            }
        }
    }
    
    const uniqueAnswers = [...new Set(possibleTranslations)];
    dom.correctAnswersText.textContent = `Réponses acceptées : ${uniqueAnswers.join(', ')}`;
    
    updateScore();
    
    setTimeout(displayNewQuestion, 2000);
}

/**
 * Met à jour l'affichage du score.
 */
function updateScore() {
    let percent = 0;
    if (totalAnswers > 0) {
        percent = Math.round((correctAnswers / totalAnswers) * 1000) / 10;
    }
    dom.scorePercent.textContent = percent;
    dom.scoreCorrect.textContent = correctAnswers;
    dom.scoreTotal.textContent = totalAnswers;
}

// --- ÉCOUTEURS D'ÉVÉNEMENTS (INIT) ---

// Démarrer le quiz au chargement de la page
window.addEventListener('DOMContentLoaded', buildQuizList);

// Bouton "Mettre à jour"
dom.updateListBtn.addEventListener('click', buildQuizList);

// Bouton "Valider"
dom.submitBtn.addEventListener('click', checkAnswer);

// Touche "Entrée" 
dom.answerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        checkAnswer();
    }
});

// Case à cocher "Mode intelligent"
dom.smartModeCheckbox.addEventListener('change', () => {
    isSmartMode = dom.smartModeCheckbox.checked;
});