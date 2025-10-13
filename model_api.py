from flask import Flask, request, jsonify
from tensorflow.keras.models import load_model
from PIL import Image
import numpy as np
import io, os
from flask_cors import CORS
app = Flask(__name__)
CORS(app)



# Load your trained model
MODEL = "coffee_model.h5"
if not os.path.exists(MODEL):
    raise FileNotFoundError(f"{MODEL} not found")
model = load_model(MODEL)
print("✅ Loaded model:", MODEL)

# Preprocessing function
def preprocess_pil_image(file_stream, target_size=(224, 224), normalize=True):
    img = Image.open(io.BytesIO(file_stream)).convert('RGB')
    img = img.resize(target_size)
    arr = np.array(img).astype('float32')
    if normalize:
        arr = arr / 255.0
    stats = {'min': float(arr.min()), 'max': float(arr.max()), 'mean': float(arr.mean())}
    arr = np.expand_dims(arr, axis=0)
    return arr, stats

# Helper function
def get_pred_info(pred):
    p = np.array(pred)
    return {'pred_shape': p.shape, 'pred_array': p.tolist()}

# Main route
@app.route('/predict', methods=['POST'])
def predict():
    if 'files' not in request.files:
        return jsonify({'error': 'No files uploaded. Use key \"files\"'}), 400

    files = request.files.getlist('files')
    results = []

    for file in files:
        fname = file.filename
        raw = file.read()
        arr, stats = preprocess_pil_image(raw, target_size=(224,224), normalize=True)

        # Run model prediction
        pred = model.predict(arr, verbose=0)
        pred_info = get_pred_info(pred)

        # The sigmoid output represents probability of "Not Liberica"
        not_liberica_prob = float(pred[0][0])
        liberica_prob = 1.0 - not_liberica_prob

        # Classification decision
        predicted_class = "Liberica" if liberica_prob > 0.5 else "Not Liberica"

        # Debug info
        print(f"[DEBUG] {fname}: liberica={liberica_prob:.4f}, not_liberica={not_liberica_prob:.4f} → {predicted_class}")

        # Append both probabilities to JSON response
        results.append({
            'filename': fname,
            'liberica_prob': liberica_prob,
            'not_liberica_prob': not_liberica_prob,
            'predicted_class': predicted_class,
            'preprocess_stats': stats,
            'pred_shape': pred_info['pred_shape'],
            'pred_array': pred_info['pred_array']
        })

    return jsonify({'results': results})

if __name__ == '__main__':
    print("Starting BarakoSense API on http://127.0.0.1:5000")
    app.run(port=5000)
