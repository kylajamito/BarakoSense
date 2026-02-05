const FLASK_API = "/predict";
let uploadedFile = null;

// =========================
// Elements
// =========================
const uploadInput = document.getElementById("image-upload");
const previewBox = document.getElementById("image-preview");
const predictBtn = document.getElementById("predict-btn");
const clearBtn = document.getElementById("clear-btn");
const finalResult = document.getElementById("final-result");

// =========================
// Upload + Preview
// =========================

function setPreviewPlaceholder() {
  previewBox.innerHTML = `
    <input
      id="image-upload"
      type="file"
      accept="image/*"
      class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
    />
    <div class="flex flex-col items-center gap-1 pointer-events-none group-hover:scale-105 transition-transform">
      <span class="material-symbols-outlined text-3xl text-primary animate-bounce group-hover:animate-none">
        cloud_upload
      </span>
      <p class="font-medium text-xs">Click or drag image here</p>
    </div>
  `;
  // Re-attach input event
  const newInput = previewBox.querySelector('#image-upload');
  newInput.addEventListener("change", handleFileInput);
}

function handleFileInput(e) {
  const file = e.target.files[0];
  if (!file) return;
  uploadedFile = file;
  const reader = new FileReader();
  reader.onload = ev => {
    previewBox.innerHTML = `
      <div class="relative w-full h-full">
        <input
          id="image-upload"
          type="file"
          accept="image/*"
          class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <img src="${ev.target.result}"
             class="w-full h-full object-cover rounded-lg" />
      </div>
    `;
    // Re-attach input event
    const newInput = previewBox.querySelector('#image-upload');
    newInput.addEventListener("change", handleFileInput);
  };
  reader.readAsDataURL(file);
  predictBtn.disabled = false;
  finalResult.innerText = "Ready for prediction";
}

// Initial placeholder
setPreviewPlaceholder();

// Drag-and-drop support
function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  const dt = e.dataTransfer;
  if (dt && dt.files && dt.files.length > 0) {
    const fileInput = previewBox.querySelector('#image-upload');
    // Set file input's files property
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(dt.files[0]);
    fileInput.files = dataTransfer.files;
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
  }
  previewBox.classList.remove('ring-4', 'ring-primary');
}
function handleDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  previewBox.classList.add('ring-4', 'ring-primary');
}
function handleDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  previewBox.classList.remove('ring-4', 'ring-primary');
}
previewBox.addEventListener('dragover', handleDragOver);
previewBox.addEventListener('dragleave', handleDragLeave);
previewBox.addEventListener('drop', handleDrop);

// Also re-attach drag events after every clear or upload
const observer = new MutationObserver(() => {
  previewBox.addEventListener('dragover', handleDragOver);
  previewBox.addEventListener('dragleave', handleDragLeave);
  previewBox.addEventListener('drop', handleDrop);
});
observer.observe(previewBox, { childList: true });

// Remove old uploadInput event (if any)
// Add new event to dynamic input
// (handled in setPreviewPlaceholder and handleFileInput)

// =========================
// Predict
// =========================
predictBtn.addEventListener("click", async () => {
  if (!uploadedFile) return;

  predictBtn.disabled = true;
  predictBtn.innerText = "Analyzing...";
  finalResult.innerText = "Running inference...";

  const formData = new FormData();
  formData.append("file", uploadedFile);

  try {
    const response = await fetch(FLASK_API, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    finalResult.innerText =
      `${data.final_prediction} (${data.confidence}%) — ${data.detected_plant_part}`;

  } catch (err) {
    console.error(err);
    finalResult.innerText = "Prediction failed.";
  } finally {
    predictBtn.disabled = false;
    predictBtn.innerText = "Start Prediction";
  }
});

// =========================
// Clear
// =========================
clearBtn.addEventListener("click", () => {
  uploadedFile = null;
  setPreviewPlaceholder();
  finalResult.innerText = "Awaiting analysis...";
  predictBtn.disabled = true;
});
