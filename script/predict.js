// script/predict.js - Database Integration for Predict Page

const API_URL = 'http://localhost:3000/api';
const uploadedImages = { leaves: null, bark: null, cherries: null };
let currentUploadId = null;

// Setup file upload handlers
function setupFileUpload(inputId, previewId, type) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    
    input.addEventListener('change', e => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = ev => {
                uploadedImages[type] = file; // Store the actual file, not base64
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

// Initialize file uploads
['leaves', 'bark', 'cherries'].forEach(type =>
    setupFileUpload(`${type}-upload`, `${type}-preview`, type)
);

// Check if ready to predict
function checkIfReadyToPredict() {
    const ready = uploadedImages.leaves || uploadedImages.bark || uploadedImages.cherries;
    document.getElementById('predict-btn').disabled = !ready;
}

// Upload images to server and database
async function uploadImagesToServer() {
    try {
        const formData = new FormData();
        
        if (uploadedImages.leaves) formData.append('leaf_image', uploadedImages.leaves);
        if (uploadedImages.bark) formData.append('bark_image', uploadedImages.bark);
        if (uploadedImages.cherries) formData.append('cherry_image', uploadedImages.cherries);
        
        const response = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Images uploaded! Upload ID:', data.upload_id);
            currentUploadId = data.upload_id;
            return data.upload_id;
        } else {
            throw new Error(data.error || 'Upload failed');
        }
    } catch (error) {
        console.error('❌ Error uploading images:', error);
        alert('Failed to upload images. Please check your connection and try again.');
        throw error;
    }
}

// Save prediction results to database
async function savePredictionResults(predictions) {
    if (!currentUploadId) {
        console.error('No upload ID available');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/results`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                upload_id: currentUploadId,
                leaf_prediction: predictions.leaves.prediction,
                leaf_confidence: predictions.leaves.confidence,
                bark_prediction: predictions.bark.prediction,
                bark_confidence: predictions.bark.confidence,
                cherry_prediction: predictions.cherries.prediction,
                cherry_confidence: predictions.cherries.confidence,
                final_result: predictions.final.prediction,
                final_confidence: predictions.final.confidence
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Results saved! Result ID:', data.result_id);
        } else {
            throw new Error(data.error || 'Failed to save results');
        }
    } catch (error) {
        console.error('❌ Error saving results:', error);
        // Don't alert here - prediction was successful, just storage failed
    }
}

// Mock ML prediction function (replace with your actual ML model)
function performMLPrediction() {
    const predictions = {
        leaves: { 
            prediction: uploadedImages.leaves ? 'Coffea Liberica' : null,
            confidence: uploadedImages.leaves ? (90 + Math.random() * 8).toFixed(2) : null
        },
        bark: { 
            prediction: uploadedImages.bark ? 'Coffea Liberica' : null,
            confidence: uploadedImages.bark ? (85 + Math.random() * 10).toFixed(2) : null
        },
        cherries: { 
            prediction: uploadedImages.cherries ? 'Coffea Liberica' : null,
            confidence: uploadedImages.cherries ? (88 + Math.random() * 10).toFixed(2) : null
        }
    };
    
    // Calculate weighted average for final prediction
    let totalConfidence = 0;
    let count = 0;
    
    ['leaves', 'bark', 'cherries'].forEach(key => {
        if (predictions[key].confidence) {
            totalConfidence += parseFloat(predictions[key].confidence);
            count++;
        }
    });
    
    predictions.final = {
        prediction: 'Coffea Liberica',
        confidence: count > 0 ? (totalConfidence / count).toFixed(2) : 0
    };
    
    return predictions;
}

// Main predict button handler
document.getElementById('predict-btn').addEventListener('click', async function() {
    const btn = this;
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined animate-spin">autorenew</span><span>Uploading...</span>';
    
    try {
        // Step 1: Upload images to server
        await uploadImagesToServer();
        
        // Step 2: Update UI to show analysis in progress
        btn.innerHTML = '<span class="material-symbols-outlined animate-spin">autorenew</span><span>Analyzing...</span>';
        
        // Step 3: Perform ML prediction (simulate delay)
        await new Promise(resolve => setTimeout(resolve, 1500));
        const predictions = performMLPrediction();
        
        // Step 4: Display results
        ['leaves', 'bark', 'cherries'].forEach(id => {
            const resultElement = document.getElementById(`${id}-result`);
            if (predictions[id].confidence) {
                resultElement.textContent = `${predictions[id].prediction} (${predictions[id].confidence}%)`;
            } else {
                resultElement.textContent = '--';
            }
        });
        
        document.getElementById('final-result').textContent = 
            `${predictions.final.prediction} (${predictions.final.confidence}% confidence)`;
        
        // Step 5: Save results to database
        await savePredictionResults(predictions);
        
        // Reset button
        btn.disabled = false;
        btn.innerHTML = '<span class="material-symbols-outlined">auto_awesome</span><span>Start Prediction</span>';
        
        console.log('✅ Prediction complete and saved!');
        
    } catch (error) {
        console.error('❌ Prediction failed:', error);
        btn.disabled = false;
        btn.innerHTML = '<span class="material-symbols-outlined">auto_awesome</span><span>Start Prediction</span>';
    }
});

// Clear button functionality
document.getElementById('clear-btn').addEventListener('click', () => {
    // Reset uploaded images
    uploadedImages.leaves = uploadedImages.bark = uploadedImages.cherries = null;
    currentUploadId = null;

    // Reset file inputs
    document.getElementById('leaves-upload').value = '';
    document.getElementById('bark-upload').value = '';
    document.getElementById('cherries-upload').value = '';

    // Reset previews
    ['leaves', 'bark', 'cherries'].forEach(id => {
        const preview = document.getElementById(`${id}-preview`);
        preview.style.backgroundImage = '';
        preview.innerHTML = id.charAt(0).toUpperCase() + id.slice(1);
    });

    // Reset results
    ['leaves', 'bark', 'cherries'].forEach(id => {
        document.getElementById(`${id}-result`).textContent = '--';
    });
    document.getElementById('final-result').textContent = 'Awaiting analysis...';

    // Disable predict button
    document.getElementById('predict-btn').disabled = true;
});

// Highlight active navbar link
document.addEventListener("DOMContentLoaded", () => {
    const currentPage = window.location.pathname.split("/").pop(); 
    const links = document.querySelectorAll("nav a");

    links.forEach(link => {
        const href = link.getAttribute("href");
        if (href === currentPage) {
            link.classList.add("text-primary", "font-bold");
        } else {
            link.classList.remove("text-primary", "font-bold");
        }
    });
});