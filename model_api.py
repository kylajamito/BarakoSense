from flask import Flask, request, jsonify, render_template
from tensorflow.keras.models import load_model
from PIL import Image
import numpy as np
import io, os
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# =========================
# Load Models
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
    print(f"[INFO] Loaded {organ} model")

# =========================
# Image Preprocessing
# =========================
def preprocess_pil_image(file_bytes, target_size=(224, 224)):
    img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    img = img.resize(target_size)

    arr = np.array(img).astype("float32") / 255.0
    arr = np.expand_dims(arr, axis=0)
    return arr

# =========================
# Routes
# =========================
@app.route("/")
def home():
    return render_template("index.html")


@app.route("/predict", methods=["GET", "POST"])
def predict():
    # -------------------------
    # GET → show predict page
    # -------------------------
    if request.method == "GET":
        return render_template("predict.html")

    # -------------------------
    # POST → run inference
    # -------------------------
    if "file" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    file = request.files["file"]
    raw = file.read()
    arr = preprocess_pil_image(raw)

    model_results = []

    liberica_votes = 0
    not_liberica_votes = 0

    for organ, model in MODELS.items():
        pred = model.predict(arr, verbose=0)

        liberica_prob = float(pred[0][0])
        not_liberica_prob = 1.0 - liberica_prob

        predicted_class = "Liberica" if liberica_prob >= 0.5 else "Not Liberica"
        confidence = max(liberica_prob, not_liberica_prob)

        # Count votes
        if predicted_class == "Liberica":
            liberica_votes += 1
        else:
            not_liberica_votes += 1

        model_results.append({
            "organ": organ,
            "predicted_class": predicted_class,
            "confidence": round(confidence * 100, 2)
        })

    # =========================
    # Majority Voting Decision
    # =========================
    if liberica_votes >= 2:
        final_prediction = "Liberica"
    else:
        final_prediction = "Not Liberica"

    # Optional: overall confidence (average of 3 models)
    avg_confidence = round(
        sum(r["confidence"] for r in model_results) / 3, 2
    )

    return jsonify({
        "final_prediction": final_prediction,
        "liberica_votes": liberica_votes,
        "not_liberica_votes": not_liberica_votes,
        "average_confidence": avg_confidence,
        "all_model_outputs": model_results
    })

@app.route("/lexicon")
def lexicon():
    return render_template("lexicon.html")

# =========================
# Run Server
# =========================
if __name__ == "__main__":
    print("🚀 BarakoSense running at http://127.0.0.1:5000")
    app.run(port=5000, debug=False)

# if __name__ == '__main__':
#     port = int(os.environ.get("PORT", 5000))
#     print(f"Starting BarakoSense API on port {port}")
#     app.run(host="0.0.0.0", port=port, debug=False)