const FLASK_API = '/predict';


// Map uploaded images by organ
const uploadedImages = { leaf: null, bark: null, cherry: null };

// Map organ keys to their HTML result element IDs
const organToResultId = {
    leaf: 'leaves-result',
    bark: 'bark-result',
    cherry: 'cherries-result'
};

// Map organ keys to their preview IDs
const organToPreviewId = {
    leaf: 'leaves-preview',
    bark: 'bark-preview',
    cherry: 'cherries-preview'
};

// Map organ keys to placeholder text for clear button
const organToPlaceholder = {
    leaf: 'Leaves',
    bark: 'Bark',
    cherry: 'Cherries'
};

// === File Upload Setup ===
function setupFileUpload(inputId, previewId, organ) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);

    input.addEventListener('change', e => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = ev => {
                uploadedImages[organ] = file;
                preview.style.backgroundImage = `url('${ev.target.result}')`;
                preview.style.backgroundSize = 'cover';
                preview.style.backgroundPosition = 'center';
                preview.innerHTML = '';
                checkIfReadyToPredict();
                console.log(`[DEBUG] ${organ} file uploaded: ${file.name}`);
            };
            reader.readAsDataURL(file);
        }
    });
}

// Setup uploads
setupFileUpload('leaves-upload', 'leaves-preview', 'leaf');
setupFileUpload('bark-upload', 'bark-preview', 'bark');
setupFileUpload('cherries-upload', 'cherries-preview', 'cherry');

// Enable predict button only if at least one file is uploaded
function checkIfReadyToPredict() {
    const ready = uploadedImages.leaf || uploadedImages.bark || uploadedImages.cherry;
    document.getElementById('predict-btn').disabled = !ready;
}

// === Flask Prediction Function ===
async function getPredictionsFromFlask() {
    const results = [];

    for (const [organ, file] of Object.entries(uploadedImages)) {
        if (!file) continue;

        const formData = new FormData();
        formData.append('files', file);
        formData.append('organ', organ);

        console.log(`[DEBUG] Sending ${organ}: ${file.name}`);

        const response = await fetch(FLASK_API, { method: 'POST', body: formData });

        if (!response.ok) throw new Error(`Flask returned HTTP ${response.status}`);

        let data;
        try {
            data = await response.json();
        } catch (err) {
            const text = await response.text();
            console.error('❌ JSON parse failed:', err, 'Raw response:', text);
            throw new Error('Invalid JSON from Flask');
        }

        if (!data.results || data.results.length === 0) {
            throw new Error('No results returned from Flask for organ: ' + organ);
        }

        results.push(data.results[0]);
    }

    return results;
}

// === Predict Button Handler ===
document.getElementById('predict-btn').addEventListener('click', async function () {
    const btn = this;
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined animate-spin">autorenew</span><span>Analyzing...</span>';

    try {
        const results = await getPredictionsFromFlask();
        if (results.length === 0) throw new Error('No predictions returned from Flask');

        let totalLiberica = 0;
        let totalConfidence = 0;

        results.forEach(result => {
            const organ = result.organ;
            const resultEl = document.getElementById(organToResultId[organ]);
            if (!resultEl) return console.warn(`[WARN] Missing element for ${organ}`);

            const liberica = Number((result.liberica_prob * 100).toFixed(2));
            const notLiberica = Number((result.not_liberica_prob * 100).toFixed(2));

            const isLiberica = result.predicted_class === "Liberica";
            const confidence = isLiberica ? liberica : notLiberica;

            totalLiberica += liberica;
            totalConfidence += confidence;

            resultEl.innerHTML = `<strong>${organToPlaceholder[organ]}:</strong> ${result.predicted_class} ${confidence}%`;
            resultEl.style.backgroundColor = '';
            resultEl.style.borderLeft = '';
        });

        // Ensemble final prediction
        const count = results.length;
        const avgLibericaProb = totalLiberica / count;
        const finalPrediction = avgLibericaProb >= 50 ? 'Liberica' : 'Not Liberica';
        const avgConfidence = (totalConfidence / count).toFixed(2);

        const finalEl = document.getElementById('final-result');
        finalEl.innerHTML = `<strong>Final Prediction:</strong> ${finalPrediction}<br><small>Average Confidence: ${avgConfidence}%</small>`;
        finalEl.style.backgroundColor = finalPrediction === 'Liberica' ? '#e6f7e6' : '#ffeaea';
        finalEl.style.borderLeft = finalPrediction === 'Liberica' ? '6px solid #2e7d32' : '6px solid #c62828';
        finalEl.style.transition = '0.3s';

        console.log('✅ Prediction displayed successfully!');
    } catch (error) {
        console.error('❌ Prediction failed:', error);
        alert('Prediction failed. Check console for details.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span class="material-symbols-outlined">auto_awesome</span><span>Start Prediction</span>';
    }
});

// === Clear Button ===
document.getElementById('clear-btn').addEventListener('click', () => {
    Object.keys(uploadedImages).forEach(key => uploadedImages[key] = null);

    Object.entries(organToPreviewId).forEach(([organ, previewId]) => {
        const preview = document.getElementById(previewId);
        if (preview) {
            preview.style.backgroundImage = '';
            preview.innerHTML = organToPlaceholder[organ]; // ✅ fixed placeholder text
        }

        const resultEl = document.getElementById(organToResultId[organ]);
        if (resultEl) {
            resultEl.textContent = '--';
            resultEl.style.backgroundColor = '';
            resultEl.style.borderLeft = '';
        }
    });

    const finalEl = document.getElementById('final-result');
    if (finalEl) {
        finalEl.textContent = 'Awaiting analysis...';
        finalEl.style.backgroundColor = '';
        finalEl.style.borderLeft = '';
    }

    document.getElementById('predict-btn').disabled = true;
});
