"""Pre-download all registered models to cache"""
import os
from imageinf.inference.processor import MODEL_REGISTRY

# Force progress bars to show in Docker
os.environ["HF_HUB_ENABLE_HF_TRANSFER"] = "0"
os.environ["TQDM_MININTERVAL"] = "1"


def preload_models():
    """Automatically preload all models registered with @register_model_runner"""
    print(f"Found {len(MODEL_REGISTRY)} registered models", flush=True)
    print("-" * 60, flush=True)

    for idx, model_name in enumerate(MODEL_REGISTRY.keys(), 1):
        print(f"\n[{idx}/{len(MODEL_REGISTRY)}] Preloading: {model_name}", flush=True)
        try:
            ModelClass = MODEL_REGISTRY[model_name]
            # Instantiating the model class triggers from_pretrained download
            # Progress bars will show automatically for each file
            ModelClass(model_name)
            print(f"✓ {model_name} cached successfully", flush=True)
        except Exception as e:
            print(f"✗ Failed to preload {model_name}: {e}", flush=True)

    print("\n" + "-" * 60, flush=True)
    print("Preloading complete!", flush=True)


if __name__ == "__main__":
    preload_models()
