const FLASK_API = "/predict";
let uploadedFile = null;
let cameraStream = null;
let isCameraActive = false;
let selectedPlantPart = "mix"; // default selection

// =========================
// Elements
// =========================
const imageUpload = document.getElementById("image-upload");
const previewBox = document.getElementById("image-preview");
const placeholder = document.getElementById("placeholder");
const previewImg = document.getElementById("preview-img");
const cameraVideo = document.getElementById("camera-video");
const cameraBtn = document.getElementById("camera-btn");
const cameraBtnText = document.getElementById("camera-btn-text");
const predictBtn = document.getElementById("predict-btn");
const clearBtn = document.getElementById("clear-btn");
const loader = document.getElementById("loader");

// Result elements
const finalResult = document.getElementById("final-result");
const confidenceBar = document.getElementById("confidence-bar");
const confidenceText = document.getElementById("confidence-text");
const gradcamImage = document.getElementById("gradcam-image");

// Checklist selection elements
const checklistItems = document.querySelectorAll(".checklist-item");

// =========================
// Plant Part Selection (Checklist)
// =========================

checklistItems.forEach(item => {
  item.addEventListener("click", () => {
    // Remove selected class from all items
    checklistItems.forEach(i => {
      i.classList.remove("selected");
    });
    
    // Add selected class to clicked item
    item.classList.add("selected");
    
    // Update selected plant part
    selectedPlantPart = item.getAttribute("data-part");
    console.log(`[INFO] Selected plant part: ${selectedPlantPart}`);
    
    // Show notification
    const partNames = {
      "leaf": "Leaf",
      "bark": "Bark",
      "cherry": "Cherry",
      "mix": "Mix (Ensemble)"
    };
    showNotification(`Selected: ${partNames[selectedPlantPart]}`, "info");
  });
});

// =========================
// Camera Functions
// =========================

async function startCamera() {
  try {
    // Request camera access
    cameraStream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: 'environment' // Use back camera on mobile
      } 
    });
    
    // Show camera video
    cameraVideo.srcObject = cameraStream;
    cameraVideo.classList.remove('hidden');
    placeholder.classList.add('hidden');
    previewImg.classList.add('hidden');
    
    isCameraActive = true;
    cameraBtnText.textContent = "Capture Photo";
    cameraBtn.querySelector('.material-symbols-outlined').textContent = "photo_camera";
    
  } catch (err) {
    console.error("Camera access error:", err);
    alert("Could not access camera. Please check permissions or use file upload instead.");
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  cameraVideo.classList.add('hidden');
  isCameraActive = false;
  cameraBtnText.textContent = "Use Camera";
  cameraBtn.querySelector('.material-symbols-outlined').textContent = "photo_camera";
}

function capturePhoto() {
  // Create a canvas to capture the current video frame
  const canvas = document.createElement('canvas');
  canvas.width = cameraVideo.videoWidth;
  canvas.height = cameraVideo.videoHeight;
  
  const ctx = canvas.getContext('2d');
  ctx.drawImage(cameraVideo, 0, 0);
  
  // Convert canvas to blob
  canvas.toBlob((blob) => {
    uploadedFile = new File([blob], "camera-capture.jpg", { type: "image/jpeg" });
    
    // Show preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      previewImg.src = ev.target.result;
      previewImg.classList.remove('hidden');
      cameraVideo.classList.add('hidden');
      placeholder.classList.add('hidden');
      predictBtn.disabled = false;
      
      // Update result text
      finalResult.textContent = "Ready for prediction";
      finalResult.classList.remove('text-primary');
      finalResult.classList.add('text-text-muted-light', 'dark:text-text-muted-dark');
    };
    reader.readAsDataURL(uploadedFile);
    
    // Stop camera
    stopCamera();
  }, 'image/jpeg', 0.95);
}

// Camera button click handler
cameraBtn.addEventListener("click", () => {
  if (isCameraActive) {
    // Capture photo
    capturePhoto();
  } else {
    // Start camera
    startCamera();
  }
});

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

  // Stop camera if active
  if (isCameraActive) {
    stopCamera();
  }

  uploadedFile = file;
  const reader = new FileReader();
  
  reader.onload = (ev) => {
    previewImg.src = ev.target.result;
    previewImg.classList.remove('hidden');
    placeholder.classList.add('hidden');
    cameraVideo.classList.add('hidden');
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
    // Stop camera if active
    if (isCameraActive) {
      stopCamera();
    }
    
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
  
  // Reset heatmap to empty state
  const gradcamEmpty = document.getElementById('gradcam-empty');
  gradcamEmpty.classList.remove('hidden');
  gradcamImage.classList.add('hidden');

  const formData = new FormData();
  formData.append("file", uploadedFile);
  formData.append("plant_part", selectedPlantPart); // Add plant part selection

  try {
    const response = await fetch(FLASK_API, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    console.log('[DEBUG] Response data:', data);

    // Hide loader, show results
    loader.classList.add('hidden');
    finalResult.classList.remove('hidden');
    
    // Update main result
    finalResult.textContent = data.final_prediction;
    finalResult.classList.remove('text-text-muted-light', 'dark:text-text-muted-dark');
    finalResult.classList.add('text-primary');

    // Update confidence bar
    const confidenceRatio = data.confidence_ratio;
    confidenceText.textContent = `${confidenceRatio}%`;
    
    // Set width to actual percentage
    confidenceBar.style.width = `${confidenceRatio}%`;

    // Set confidence bar color based on level
    if (confidenceRatio >= 80) {
      confidenceBar.classList.remove('bg-yellow-500', 'bg-red-500');
      confidenceBar.classList.add('bg-primary');
    } else if (confidenceRatio >= 60) {
      confidenceBar.classList.remove('bg-primary', 'bg-red-500');
      confidenceBar.classList.add('bg-yellow-500');
    } else {
      confidenceBar.classList.remove('bg-primary', 'bg-yellow-500');
      confidenceBar.classList.add('bg-red-500');
    }

    // Display Grad-CAM if available
    console.log('[DEBUG] Checking Grad-CAM data...');
    console.log('[DEBUG] gradcam_image exists:', !!data.gradcam_image);
    
    if (data.gradcam_image) {
      console.log('[DEBUG] Setting Grad-CAM image source...');
      gradcamImage.src = data.gradcam_image;
      
      // Hide empty state, show heatmap
      gradcamEmpty.classList.add('hidden');
      gradcamImage.classList.remove('hidden');
      
      console.log('[DEBUG] ✓ Grad-CAM should now be visible');
    } else {
      console.log('[DEBUG] ✗ No Grad-CAM image received from server');
      // Show empty state, hide heatmap
      gradcamEmpty.classList.remove('hidden');
      gradcamImage.classList.add('hidden');
    }

    // Success notification
    const modeText = data.plant_part_mode === "mix" ? "Ensemble" : data.plant_part_mode.charAt(0).toUpperCase() + data.plant_part_mode.slice(1);
    showNotification(`Prediction complete (${modeText} mode)`, "success");

  } catch (err) {
    console.error("Prediction error:", err);
    
    // Hide loader, show error
    loader.classList.add('hidden');
    finalResult.classList.remove('hidden');
    finalResult.textContent = "Prediction failed";
    finalResult.classList.remove('text-primary');
    finalResult.classList.add('text-red-600', 'dark:text-red-400');
    
    confidenceBar.style.width = "0%";
    confidenceText.textContent = "0%";

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
  // Stop camera if active
  if (isCameraActive) {
    stopCamera();
  }
  
  uploadedFile = null;
  imageUpload.value = '';
  
  // Reset preview
  previewImg.classList.add('hidden');
  previewImg.src = '';
  cameraVideo.classList.add('hidden');
  placeholder.classList.remove('hidden');
  
  // Disable predict button
  predictBtn.disabled = true;
  
  // Reset results
  finalResult.textContent = "Awaiting Upload...";
  finalResult.classList.remove('text-red-600', 'dark:text-red-400');
  finalResult.classList.add('text-primary');
  
  confidenceBar.style.width = "0%";
  confidenceText.textContent = "0%";
  confidenceBar.className = "bg-primary h-2.5 rounded-full transition-all duration-500";
  
  // Reset Grad-CAM display
  const gradcamEmpty = document.getElementById('gradcam-empty');
  gradcamEmpty.classList.remove('hidden');
  gradcamImage.classList.add('hidden');
  gradcamImage.src = '';
  
  // Hide loader if visible
  loader.classList.add('hidden');
  finalResult.classList.remove('hidden');
  
  showNotification("All cleared", "info");
});

// =========================
// Helper Functions
// =========================

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
// Cleanup on page unload
// =========================

window.addEventListener('beforeunload', () => {
  if (isCameraActive) {
    stopCamera();
  }
});

// =========================
// Initialize
// =========================

console.log("BarakoSense Predict Page Loaded ✅");
console.log(`Default plant part: ${selectedPlantPart}`);