const FLASK_API = "/predict";
let uploadedFile = null;

// =========================
// Elements
// =========================
const imageUpload = document.getElementById("image-upload");
const previewBox = document.getElementById("image-preview");
const placeholder = document.getElementById("placeholder");
const previewImg = document.getElementById("preview-img");
const predictBtn = document.getElementById("predict-btn");
const clearBtn = document.getElementById("clear-btn");
const loader = document.getElementById("loader");

// Result elements
const leafResult = document.getElementById("leaf-result");
const barkResult = document.getElementById("bark-result");
const cherryResult = document.getElementById("cherry-result")
const finalResult = document.getElementById("final-result");
const confidence = document.getElementById("confidence");
const confidenceBar = document.getElementById("confidence-bar");

// =========================
// Upload + Preview
// =========================

function handleFileInput(e) {
  const file = e.target.files[0];
  if (!file) return;

  // Validate file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    alert("File size exceeds 5MB. Please upload a smaller image.");
    return;
  }

  // Validate file type
  if (!file.type.match('image.*')) {
    alert("Please upload a valid image file (JPG, PNG, GIF).");
    return;
  }

  uploadedFile = file;
  const reader = new FileReader();
  
  reader.onload = (ev) => {
    previewImg.src = ev.target.result;
    previewImg.classList.remove('hidden');
    placeholder.classList.add('hidden');
    predictBtn.disabled = false;
    
    // Update result text
    finalResult.textContent = "Ready for prediction";
    finalResult.classList.remove('text-primary');
    finalResult.classList.add('text-text-muted-light', 'dark:text-text-muted-dark');
  };
  
  reader.readAsDataURL(file);
}

// Attach event listener to file input
imageUpload.addEventListener("change", handleFileInput);

// =========================
// Drag-and-drop support
// =========================

function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  previewBox.classList.remove('ring-4', 'ring-primary', 'scale-105');
  
  const dt = e.dataTransfer;
  if (dt && dt.files && dt.files.length > 0) {
    // Set file to input
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(dt.files[0]);
    imageUpload.files = dataTransfer.files;
    
    // Trigger change event
    imageUpload.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

function handleDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  previewBox.classList.add('ring-4', 'ring-primary', 'scale-105');
}

function handleDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  previewBox.classList.remove('ring-4', 'ring-primary', 'scale-105');
}

previewBox.addEventListener('dragover', handleDragOver);
previewBox.addEventListener('dragleave', handleDragLeave);
previewBox.addEventListener('drop', handleDrop);

// =========================
// Predict
// =========================

predictBtn.addEventListener("click", async () => {
  if (!uploadedFile) return;

  // Disable button and show loading state
  predictBtn.disabled = true;
  const originalBtnHTML = predictBtn.innerHTML;
  predictBtn.innerHTML = `
    <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
    </svg>
    <span>Analyzing...</span>
  `;

  // Show loader in results
  finalResult.classList.add('hidden');
  loader.classList.remove('hidden');

  const formData = new FormData();
  formData.append("file", uploadedFile);

  try {
    const response = await fetch(FLASK_API, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Hide loader, show results
    loader.classList.add('hidden');
    finalResult.classList.remove('hidden');
    
    // Update main result
    finalResult.textContent = data.final_prediction;
    finalResult.classList.remove('text-text-muted-light', 'dark:text-text-muted-dark');
    finalResult.classList.add('text-primary');

    // =============================
    // Show individual model outputs
    // =============================
    data.all_model_outputs.forEach(result => {
      const text = `${result.predicted_class} (${result.confidence}%)`;

      if (result.organ === "leaf") {
        leafResult.textContent = text;
      }
      if (result.organ === "bark") {
        barkResult.textContent = text;
      }
      if (result.organ === "cherry") {
        cherryResult.textContent = text;
      }
    });

    // =============================
    // Use ensemble average confidence
    // =============================
    confidence.textContent = data.average_confidence + "%";
    confidenceBar.style.width = data.average_confidence + "%";


    // Set confidence bar color based on level
    if (data.average_confidence >= 80) {
      confidenceBar.classList.remove('bg-yellow-500', 'bg-red-500');
      confidenceBar.classList.add('bg-primary');
    } else if (data.average_confidence >= 60) {
      confidenceBar.classList.remove('bg-primary', 'bg-red-500');
      confidenceBar.classList.add('bg-yellow-500');
    } else {
      confidenceBar.classList.remove('bg-primary', 'bg-yellow-500');
      confidenceBar.classList.add('bg-red-500');
    }

    // Success notification (optional)
    showNotification("Prediction complete!", "success");

  } catch (err) {
    console.error("Prediction error:", err);
    
    // Hide loader, show error
    loader.classList.add('hidden');
    finalResult.classList.remove('hidden');
    finalResult.textContent = "Prediction failed";
    finalResult.classList.remove('text-primary');
    finalResult.classList.add('text-red-600', 'dark:text-red-400');
    
    leafResult.textContent = "-";
    barkResult.textContent = "-";
    cherryResult.textContent = "-";
    confidence.textContent = "0%";
    confidenceBar.style.width = "0%";
    
    detailedResults.innerHTML = `
      <div class="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 text-center">
        <span class="material-symbols-outlined text-red-600 dark:text-red-400 text-3xl mb-2">error</span>
        <p class="text-sm text-red-600 dark:text-red-400 font-semibold">Failed to process image</p>
        <p class="text-xs text-red-500 dark:text-red-300 mt-1">${err.message}</p>
      </div>
    `;

    showNotification("Prediction failed. Please try again.", "error");
  } finally {
    // Re-enable button
    predictBtn.disabled = false;
    predictBtn.innerHTML = originalBtnHTML;
  }
});

// =========================
// Clear
// =========================

clearBtn.addEventListener("click", () => {
  uploadedFile = null;
  imageUpload.value = '';
  
  // Reset preview
  previewImg.classList.add('hidden');
  previewImg.src = '';
  placeholder.classList.remove('hidden');
  
  // Disable predict button
  predictBtn.disabled = true;
  
  // Reset results
  finalResult.textContent = "Awaiting Upload...";
  finalResult.classList.remove('text-red-600', 'dark:text-red-400');
  finalResult.classList.add('text-primary');
  
  leafResult.textContent = "-";
  barkResult.textContent = "-";
  cherryResult.textContent = "-";
  confidence.textContent = "-";
  confidenceBar.style.width = "0%";
  confidenceBar.className = "bg-primary h-2.5 rounded-full transition-all duration-500";
  
  detailedResults.innerHTML = "";
  
  // Hide loader if visible
  loader.classList.add('hidden');
  finalResult.classList.remove('hidden');
});

// =========================
// Helper Functions
// =========================

function getOrganIcon(organ) {
  const icons = {
    'leaf': 'eco',
    'bark': 'park',
    'cherry': 'nutrition'
  };
  return icons[organ.toLowerCase()] || 'category';
}

function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `fixed top-20 right-4 z-50 px-6 py-4 rounded-lg shadow-lg border-2 transform transition-all duration-300 translate-x-full`;
  
  if (type === 'success') {
    notification.className += ' bg-green-50 dark:bg-green-900/20 border-green-500 text-green-800 dark:text-green-200';
    notification.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="material-symbols-outlined">check_circle</span>
        <span class="font-semibold">${message}</span>
      </div>
    `;
  } else if (type === 'error') {
    notification.className += ' bg-red-50 dark:bg-red-900/20 border-red-500 text-red-800 dark:text-red-200';
    notification.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="material-symbols-outlined">error</span>
        <span class="font-semibold">${message}</span>
      </div>
    `;
  } else {
    notification.className += ' bg-primary/10 dark:bg-primary/20 border-primary text-primary';
    notification.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="material-symbols-outlined">info</span>
        <span class="font-semibold">${message}</span>
      </div>
    `;
  }
  
  document.body.appendChild(notification);
  
  // Slide in
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 10);
  
  // Slide out and remove
  setTimeout(() => {
    notification.style.transform = 'translateX(120%)';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

// =========================
// Keyboard Shortcuts
// =========================

document.addEventListener('keydown', (e) => {
  // Enter to predict (if image is uploaded)
  if (e.key === 'Enter' && !predictBtn.disabled) {
    predictBtn.click();
  }
  
  // Escape to clear
  if (e.key === 'Escape' && uploadedFile) {
    clearBtn.click();
  }
});

// =========================
// Initialize
// =========================

console.log("BarakoSense Predict Page Loaded ✅");