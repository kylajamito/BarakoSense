from flask import Flask, request, jsonify, render_template
from tensorflow.keras.models import load_model
from PIL import Image
import numpy as np
import io, os
from flask_cors import CORS


app = Flask(__name__)
CORS(app)

# =========================
# Load Keras Models
# =========================
MODEL_PATHS = {
    "leaf": "models/leaf_MobileNetV2_80-20_model.keras",
    "bark": "models/bark_MobileNetV2_80-20_model.keras",
    "cherry": "models/cherry_MobileNetV2_80-20_model.keras"
}

MODELS = {}
for organ, path in MODEL_PATHS.items():
    if not os.path.exists(path):
        raise FileNotFoundError(f"{path} not found")
    MODELS[organ] = load_model(path)
    print(f"[INFO] Loaded {organ} model → {path}")

# =========================
# Image Preprocessing
# =========================
def preprocess_pil_image(file_stream, target_size=(224, 224)):
    img = Image.open(io.BytesIO(file_stream)).convert('RGB')
    img = img.resize(target_size)

    arr = np.array(img).astype('float32') / 255.0
    stats = {
        'min': float(arr.min()),
        'max': float(arr.max()),
        'mean': float(arr.mean())
    }

    arr = np.expand_dims(arr, axis=0)
    return arr, stats


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/predict")
def predict_page():
    return render_template("predict.html")


@app.route("/lexicon")
def lexicon_page():
    return render_template("lexicon.html")


# =========================
# Prediction Route
# =========================
@app.route('/predict', methods=['POST'])
def predict():

    if 'files' not in request.files:
        return jsonify({'error': 'No files uploaded'}), 400

    organ = request.form.get('organ')  # leaf | bark | cherry
    if organ not in MODELS:
        return jsonify({
            'error': 'Invalid or missing organ type',
            'expected': ['leaf', 'bark', 'cherry']
        }), 400

    model = MODELS[organ]
    files = request.files.getlist('files')
    results = []

    for file in files:
        fname = file.filename
        raw = file.read()
        arr, stats = preprocess_pil_image(raw)

        # Model prediction
        pred = model.predict(arr, verbose=0)

        # Convert NumPy prediction to JSON-serializable list
        pred_list = pred.tolist()

        # --- Correct probability interpretation ---
        # Assuming the model outputs Liberica probability directly
        liberica_prob = float(pred[0][0])
        not_liberica_prob = 1.0 - liberica_prob

        predicted_class = "Liberica" if liberica_prob >= 0.5 else "Not Liberica"

        print(
            f"[DEBUG] {organ.upper()} | {fname} → "
            f"Liberica={liberica_prob:.4f}, "
            f"NotLiberica={not_liberica_prob:.4f}"
        )

        results.append({
            'filename': fname,
            'predicted_class': predicted_class,
            'liberica_prob': liberica_prob,
            'not_liberica_prob': not_liberica_prob,
            'organ': organ,  # essential for JS
            'preprocess_stats': stats,
            'pred_shape': list(pred.shape),
            'pred_array': pred_list
        })

    return jsonify({'results': results})

# =========================
# Run Server
# =========================
if __name__ == '__main__':
    print("Starting BarakoSense API on http://127.0.0.1:5000")
    app.run(port=5000, debug=False)
