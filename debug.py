"""
Test script to verify Grad-CAM generation works independently - FIXED VERSION
"""

from tensorflow.keras.models import load_model, Model
import tensorflow as tf
from PIL import Image
import numpy as np
import cv2

# Load one model for testing
print("Loading model...")
model = load_model("models/leaf_MobileNetV2_80-20_model.keras")
print(f"✓ Model loaded with {len(model.layers)} layers")

# Create a simple test image
print("\nCreating test image...")
test_img = Image.new('RGB', (224, 224), color=(100, 150, 100))
img_array = np.array(test_img).astype("float32") / 255.0
img_array = np.expand_dims(img_array, axis=0)
print(f"✓ Test image created: {img_array.shape}")

# Try to get prediction
print("\nRunning prediction...")
pred = model.predict(img_array, verbose=0)
print(f"✓ Prediction: {pred[0][0]:.4f}")

# Try to find the layer
print("\nFinding layer for Grad-CAM...")
layer_names_to_try = ['out_relu', 'Conv_1', 'block_16_project']

for layer_name in layer_names_to_try:
    try:
        layer = model.get_layer(layer_name)
        print(f"✓ Found layer: {layer_name} ({layer.__class__.__name__})")
        
        # Try to create Grad-CAM
        print(f"\nAttempting Grad-CAM with layer '{layer_name}'...")
        
        grad_model = Model(
            inputs=[model.inputs],
            outputs=[layer.output, model.output]
        )
        
        with tf.GradientTape() as tape:
            conv_outputs, predictions = grad_model(img_array)
            
            # Handle list outputs
            if isinstance(conv_outputs, list):
                conv_outputs = conv_outputs[0]
            if isinstance(predictions, list):
                predictions = predictions[0]
            
            loss = predictions[:, 0]
        
        grads = tape.gradient(loss, conv_outputs)
        
        if grads is None:
            print(f"✗ Gradients are None for layer '{layer_name}'")
            continue
        
        # Handle list gradients
        if isinstance(grads, list):
            grads = grads[0]
        
        print(f"✓ Gradients computed successfully")
        print(f"  Conv outputs shape: {conv_outputs.shape}")
        print(f"  Gradients shape: {grads.shape}")
        
        # Create heatmap
        pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
        
        conv_outputs_np = conv_outputs.numpy()
        pooled_grads_np = pooled_grads.numpy()
        
        # Handle batch dimension
        if len(conv_outputs_np.shape) == 4:
            conv_outputs_np = conv_outputs_np[0]
        
        for i in range(pooled_grads_np.shape[0]):
            conv_outputs_np[:, :, i] *= pooled_grads_np[i]
        
        heatmap = np.mean(conv_outputs_np, axis=-1)
        
        # Normalize the heatmap
        heatmap = np.maximum(heatmap, 0)
        if heatmap.max() > 0:
            heatmap = heatmap / heatmap.max()
        
        print(f"✓ Heatmap created successfully!")
        print(f"  Shape: {heatmap.shape}")
        print(f"  Min: {heatmap.min():.4f}, Max: {heatmap.max():.4f}")
        print(f"  Mean: {heatmap.mean():.4f}")
        
        # Try to create colored heatmap
        heatmap_resized = cv2.resize(heatmap, (224, 224))
        heatmap_colored = np.uint8(255 * heatmap_resized)
        heatmap_colored = cv2.applyColorMap(heatmap_colored, cv2.COLORMAP_JET)
        
        print(f"✓ Colored heatmap created!")
        print(f"  Shape: {heatmap_colored.shape}")
        
        # Try to save it
        cv2.imwrite("test_gradcam.png", heatmap_colored)
        print(f"✓ Saved test heatmap to 'test_gradcam.png'")
        
        # Create superimposed version
        heatmap_rgb = cv2.cvtColor(heatmap_colored, cv2.COLOR_BGR2RGB)
        test_img_array = np.array(test_img)
        superimposed = heatmap_rgb * 0.4 + test_img_array * 0.6
        superimposed = np.clip(superimposed, 0, 255).astype(np.uint8)
        
        superimposed_pil = Image.fromarray(superimposed)
        superimposed_pil.save("test_gradcam_overlay.png")
        print(f"✓ Saved overlaid heatmap to 'test_gradcam_overlay.png'")
        
        print(f"\n{'='*60}")
        print(f"SUCCESS! Layer '{layer_name}' works for Grad-CAM")
        print(f"{'='*60}")
        print(f"\nCheck the generated images:")
        print(f"  - test_gradcam.png (raw heatmap)")
        print(f"  - test_gradcam_overlay.png (overlay on image)")
        break
        
    except Exception as e:
        print(f"✗ Layer '{layer_name}' failed: {e}")
        import traceback
        traceback.print_exc()
        continue
else:
    print("\n✗✗✗ FAILED: No suitable layer found for Grad-CAM")

print("\nTest complete!")