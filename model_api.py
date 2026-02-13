from flask import Flask, request, jsonify, render_template
from tensorflow.keras.models import load_model, Model
import tensorflow as tf
from PIL import Image
import numpy as np
import io, os
import base64
from flask_cors import CORS
import cv2

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
    return arr, img

# =========================
# Grad-CAM Implementation (FIXED)
# =========================
def make_gradcam_heatmap(img_array, model):
    """
    Generate Grad-CAM heatmap - FIXED VERSION
    """
    try:
        # Try multiple layers in order of preference
        layer_names = ['out_relu', 'Conv_1', 'block_16_project', 'block_16_expand']
        
        last_conv_layer = None
        last_conv_layer_name = None
        
        for layer_name in layer_names:
            try:
                layer = model.get_layer(layer_name)
                last_conv_layer = layer
                last_conv_layer_name = layer_name
                print(f"[INFO] Using layer '{layer_name}' for Grad-CAM")
                break
            except:
                continue
        
        if last_conv_layer is None:
            print("[ERROR] Could not find suitable layer")
            return None
        
        # Create gradient model
        grad_model = Model(
            inputs=[model.inputs],
            outputs=[last_conv_layer.output, model.output]
        )
        
        # Compute gradients
        with tf.GradientTape() as tape:
            last_conv_layer_output, preds = grad_model(img_array)
            
            # Handle potential list outputs
            if isinstance(last_conv_layer_output, list):
                last_conv_layer_output = last_conv_layer_output[0]
            if isinstance(preds, list):
                preds = preds[0]
            
            # For binary classification
            class_channel = preds[:, 0]
        
        # Compute gradients
        grads = tape.gradient(class_channel, last_conv_layer_output)
        
        if grads is None:
            print("[ERROR] Gradients are None")
            return None
        
        # Convert to numpy and handle list if needed
        if isinstance(grads, list):
            grads = grads[0]
        if isinstance(last_conv_layer_output, list):
            last_conv_layer_output = last_conv_layer_output[0]
            
        # Pool gradients across spatial dimensions
        pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
        
        # Convert to numpy
        last_conv_layer_output = last_conv_layer_output.numpy()
        pooled_grads = pooled_grads.numpy()
        
        # Get the first sample if batch
        if len(last_conv_layer_output.shape) == 4:
            last_conv_layer_output = last_conv_layer_output[0]
        
        # Weight the channels
        for i in range(pooled_grads.shape[0]):
            last_conv_layer_output[:, :, i] *= pooled_grads[i]
        
        # Create heatmap
        heatmap = np.mean(last_conv_layer_output, axis=-1)
        
        # Normalize
        heatmap = np.maximum(heatmap, 0)
        if heatmap.max() > 0:
            heatmap = heatmap / heatmap.max()
        
        print(f"[INFO] ✓ Heatmap generated! Shape: {heatmap.shape}, Min: {heatmap.min():.3f}, Max: {heatmap.max():.3f}")
        return heatmap
        
    except Exception as e:
        print(f"[ERROR] Grad-CAM generation failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def create_superimposed_gradcam(img, heatmap, alpha=0.4):
    """
    Superimpose the Grad-CAM heatmap on the original image
    """
    # Resize heatmap to match image size
    heatmap_resized = cv2.resize(heatmap, (img.width, img.height))
    
    # Convert heatmap to RGB using JET colormap
    heatmap_colored = np.uint8(255 * heatmap_resized)
    heatmap_colored = cv2.applyColorMap(heatmap_colored, cv2.COLORMAP_JET)
    heatmap_colored = cv2.cvtColor(heatmap_colored, cv2.COLOR_BGR2RGB)
    
    # Convert PIL image to numpy array
    img_array = np.array(img)
    
    # Superimpose: heatmap * alpha + image * (1 - alpha)
    superimposed = heatmap_colored * alpha + img_array * (1 - alpha)
    superimposed = np.clip(superimposed, 0, 255).astype(np.uint8)
    
    return superimposed

def image_to_base64(img_array):
    """Convert numpy array to base64 encoded string"""
    img = Image.fromarray(img_array)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    img_str = base64.b64encode(buffer.getvalue()).decode()
    return f"data:image/png;base64,{img_str}"

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
    arr, original_img = preprocess_pil_image(raw)

    liberica_votes = 0
    not_liberica_votes = 0
    
    # To store the winning model for Grad-CAM
    winning_model = None
    winning_organ = None
    max_confidence = 0

    for organ, model in MODELS.items():
        pred = model.predict(arr, verbose=0)

        liberica_prob = float(pred[0][0])
        not_liberica_prob = 1.0 - liberica_prob

        predicted_class = "Liberica" if liberica_prob >= 0.5 else "Not Liberica"
        confidence = max(liberica_prob, not_liberica_prob)

        print(f"[INFO] {organ}: {predicted_class} ({confidence*100:.2f}%)")

        # Count votes
        if predicted_class == "Liberica":
            liberica_votes += 1
        else:
            not_liberica_votes += 1
        
        # Track the most confident prediction for Grad-CAM
        if confidence > max_confidence:
            max_confidence = confidence
            winning_model = model
            winning_organ = organ

    # =========================
    # Majority Voting Decision
    # =========================
    if liberica_votes >= 2:
        final_prediction = "Liberica"
    else:
        final_prediction = "Not Liberica"

    # Calculate confidence level
    total_votes = liberica_votes + not_liberica_votes
    confidence_ratio = max(liberica_votes, not_liberica_votes) / total_votes * 100
    
    print(f"[INFO] Final prediction: {final_prediction} (Votes: L={liberica_votes}, NL={not_liberica_votes})")
    print(f"[INFO] Using '{winning_organ}' model for Grad-CAM (confidence: {max_confidence*100:.2f}%)")
    
    # =========================
    # Generate Grad-CAM
    # =========================
    gradcam_image = None
    if winning_model is not None:
        print("[INFO] Generating Grad-CAM...")
        heatmap = make_gradcam_heatmap(arr, winning_model)
        
        if heatmap is not None:
            try:
                # Create superimposed image
                superimposed = create_superimposed_gradcam(original_img, heatmap)
                gradcam_image = image_to_base64(superimposed)
                print("[INFO] ✓ Grad-CAM image generated and encoded successfully")
            except Exception as e:
                print(f"[ERROR] Failed to create superimposed image: {str(e)}")
                import traceback
                traceback.print_exc()
        else:
            print("[WARNING] ✗ Grad-CAM heatmap generation failed")

    response_data = {
        "final_prediction": final_prediction,
        "liberica_votes": liberica_votes,
        "not_liberica_votes": not_liberica_votes,
        "confidence_ratio": round(confidence_ratio, 2),
        "gradcam_image": gradcam_image,
        "gradcam_model": winning_organ
    }
    
    # Log what we're sending
    print(f"[INFO] Response data:")
    print(f"  - final_prediction: {final_prediction}")
    print(f"  - confidence_ratio: {confidence_ratio:.2f}%")
    print(f"  - gradcam_image: {'✓ Present (' + str(len(gradcam_image)) + ' chars)' if gradcam_image else '✗ None'}")
    print(f"  - gradcam_model: {winning_organ}")
    
    return jsonify(response_data)

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