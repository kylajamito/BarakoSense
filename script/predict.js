// script/predict.js — Simplified results + color on final prediction only

const FLASK_API = 'http://127.0.0.1:5000/predict';
const uploadedImages = { leaves: null, bark: null, cherries: null };

// === File Upload Setup ===
function setupFileUpload(inputId, previewId, type) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);

    input.addEventListener('change', e => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = ev => {
                uploadedImages[type] = file;
                preview.style.backgroundImage = `url('${ev.target.result}')`;
                preview.style.backgroundSize = 'cover';
                preview.style.backgroundPosition = 'center';
                preview.innerHTML = '';
                checkIfReadyToPredict();
            };
            reader.readAsDataURL(file);
        }
    });
}

['leaves', 'bark', 'cherries'].forEach(type =>
    setupFileUpload(`${type}-upload`, `${type}-preview`, type)
);

function checkIfReadyToPredict() {
    const ready = uploadedImages.leaves || uploadedImages.bark || uploadedImages.cherries;
    document.getElementById('predict-btn').disabled = !ready;
}

// === Flask Prediction Function ===
async function getPredictionsFromFlask() {
    const formData = new FormData();
    Object.entries(uploadedImages).forEach(([type, file]) => {
        if (file) formData.append('files', file);
    });

    const response = await fetch(FLASK_API, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) throw new Error(`Flask returned HTTP ${response.status}`);
    const data = await response.json();

    console.log('🧠 Flask Prediction Response:', data);
    if (!data.results || data.results.length === 0)
        throw new Error('No results field in Flask response');

    return data.results;
}

// === Predict Button Handler ===
document.getElementById('predict-btn').addEventListener('click', async function () {
    const btn = this;
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined animate-spin">autorenew</span><span>Analyzing...</span>';

    try {
        const results = await getPredictionsFromFlask();

        const types = ['leaves', 'bark', 'cherries'];
        let totalConfidence = 0;
        let count = 0;

        // Display per section
        results.forEach((result, index) => {
            const id = types[index];
            if (!id) return;

            const resultEl = document.getElementById(`${id}-result`);
            const liberica = (result.liberica_prob * 100).toFixed(2);
            const notLiberica = (result.not_liberica_prob * 100).toFixed(2);

            const isLiberica = result.predicted_class === "Liberica";
            const confidence = isLiberica ? liberica : notLiberica;
            totalConfidence += parseFloat(confidence);
            count++;

            resultEl.innerHTML = `
                <strong>${id.charAt(0).toUpperCase() + id.slice(1)}:</strong>
                ${result.predicted_class} ${confidence}%
            `;

            // No background color on individual cards
            resultEl.style.backgroundColor = '';
            resultEl.style.borderLeft = '';
        });

        // Compute final prediction and average confidence
        const avgLiberica = results.reduce((sum, r) => sum + r.liberica_prob, 0) / results.length;
        const finalPrediction = avgLiberica >= 0.5 ? 'Liberica' : 'Not Liberica';
        const avgConfidence = (totalConfidence / count).toFixed(2);

        const finalEl = document.getElementById('final-result');
        finalEl.innerHTML = `
            <strong>Final Prediction:</strong> ${finalPrediction}<br>
            <small>Average Confidence: ${avgConfidence}%</small>
        `;

        // Apply color to final result only
        finalEl.style.backgroundColor = finalPrediction === 'Liberica' ? '#e6f7e6' : '#ffeaea';
        finalEl.style.borderLeft = finalPrediction === 'Liberica'
            ? '6px solid #2e7d32'
            : '6px solid #c62828';
        finalEl.style.transition = '0.3s';

        console.log('✅ Prediction displayed successfully!');
    } catch (error) {
        console.error('❌ Prediction failed:', error);
        alert('Prediction failed. Please ensure Flask is running and reachable.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span class="material-symbols-outlined">auto_awesome</span><span>Start Prediction</span>';
    }
});

// === Clear Button ===
document.getElementById('clear-btn').addEventListener('click', () => {
    Object.keys(uploadedImages).forEach(key => (uploadedImages[key] = null));

    ['leaves', 'bark', 'cherries'].forEach(id => {
        const preview = document.getElementById(`${id}-preview`);
        preview.style.backgroundImage = '';
        preview.innerHTML = id.charAt(0).toUpperCase() + id.slice(1);
        const resultEl = document.getElementById(`${id}-result`);
        resultEl.textContent = '--';
        resultEl.style.backgroundColor = '';
        resultEl.style.borderLeft = '';
    });

    const finalEl = document.getElementById('final-result');
    finalEl.textContent = 'Awaiting analysis...';
    finalEl.style.backgroundColor = '';
    finalEl.style.borderLeft = '';

    document.getElementById('predict-btn').disabled = true;
});
