import os
import getpass
import requests
import torch
from PIL import Image
from tapipy.tapis import Tapis
from transformers import ViTForImageClassification, ViTImageProcessor
import matplotlib.pyplot as plt
import uuid
from fontawesome import icons


# Constants
HAZMAPPER_BACKEND = "https://hazmapper.tacc.utexas.edu/geoapi-staging"
PROJECT_ID = 204
# Due to https://tacc-main.atlassian.net/issues/WG-384, need to also
# hardcode the original system of images as geoapi is unaware of those.
ORIGINAL_SYSTEM = "project-7a8056ca-7c32-4456-9187-4452eaf0f9e7"
CACHE_DIR = "cache_images/"
ICON_CACHE_PATH = "cache/icons.json"


def get_fa_icon(icon_name):
    # Convert the icon name to the expected 'fa-' format
    icon_class = f"fa-{icon_name}"

    # Check if the icon exists in the Font Awesome set
    if icon_class in icons:
        return icon_class
    else:
        return None


# Function to get a unique color
def get_unique_color(index, total_classes):
    """Return a unique color from a colormap."""
    cmap = plt.get_cmap("tab10")  # Discrete colormap with distinct colors
    return "#{:02x}{:02x}{:02x}".format(
        *[int(255 * c) for c in cmap(index % total_classes)[:3]]
    )


# Classifier
class ViTModel:
    """Encapsulates ViT model setup and image classification."""

    def __init__(self, model_name="google/vit-base-patch16-224"):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = ViTForImageClassification.from_pretrained(model_name).to(
            self.device
        )
        self.processor = ViTImageProcessor.from_pretrained(model_name)

    def classify_image(self, image):
        """Classifies an image using the ViT model."""
        inputs = self.processor(images=image, return_tensors="pt").to(self.device)
        with torch.no_grad():
            outputs = self.model(inputs.pixel_values)
            prediction = outputs.logits.argmax(-1)
        return self.model.config.id2label[prediction.item()]


# Authenticate Tapis
def authenticate_tapis():
    """Authenticate with Tapis and return a valid JWT token."""
    username = input("Enter your username: ")
    password = getpass.getpass("Enter your password: ")

    tapis = Tapis(
        base_url="https://designsafe.tapis.io", username=username, password=password
    )
    tapis.get_tokens()
    return tapis, tapis.access_token.access_token


# Fetch project features
def get_project_features(project_id, jwt):
    """Fetch project features from Hazmapper GeoAPI."""
    response = requests.get(
        f"{HAZMAPPER_BACKEND}/projects/{project_id}/features/",
        headers={"X-Tapis-Token": jwt},
    )
    return response.json()


# Retrieve and cache images
def get_image_file(tapis, system, path):
    """Retrieve image from Tapis storage, caching it locally."""
    local_path = os.path.join(CACHE_DIR, path)
    os.makedirs(os.path.dirname(local_path), exist_ok=True)

    if not os.path.exists(local_path):
        print(f"Downloading: {system}/{path}")
        file_content = tapis.files.getContents(systemId=system, path=path)
        with open(local_path, "wb") as f:
            f.write(file_content)

    return Image.open(local_path)


# Update feature properties
def update_feature_properties(
    project_id, feature_id, taggit_groups, taggit_tags, style, jwt
):
    """Update feature properties in Hazmapper GeoAPI."""
    url = f"{HAZMAPPER_BACKEND}/projects/{project_id}/features/{feature_id}/properties/"
    payload = {"taggit": {"groups": taggit_groups, "tags": taggit_tags}, "style": style}
    response = requests.post(url, json=payload, headers={"X-Tapis-Token": jwt})
    return response.json()


# Authenticate
tapis, jwt = authenticate_tapis()

# Initialize Vision Transformer model
vit_model = ViTModel()

# Fetch project features
project_features_json = get_project_features(PROJECT_ID, jwt)
feature_to_class_label = {}

# Process images and classify
for feature in project_features_json.get("features", []):
    assets = feature.get("assets", [])
    feature_id = feature["id"]

    if assets:
        asset = assets[0]
        original_path = asset.get("original_path", "")

        if original_path.lower().endswith(".jpg"):
            image = get_image_file(tapis, ORIGINAL_SYSTEM, original_path)
            print(f"Processing {original_path}")

            try:
                predicted_class = vit_model.classify_image(image)
                feature_to_class_label[feature_id] = predicted_class
                print(f"Image: {original_path} -> Predicted class: {predicted_class}")

            except Exception as e:
                print(f"Error processing {original_path}: {str(e)}")

# Get unique class labels
unique_class_labels = list(set(feature_to_class_label.values()))

# Assign icons and colors
class_to_taggit_properties_map = {}
for i, class_label in enumerate(unique_class_labels):
    color = get_unique_color(i, len(unique_class_labels))

    # Get the icon for the class label
    icon = get_fa_icon(class_label)

    # Start constructing the class-to-properties mapping
    class_to_taggit_properties_map[class_label] = {
        "group": {
            "id": str(uuid.uuid4()),
            "name": class_label,
            "color": color,
        },
        "style": {
            "color": color,
        },
    }

    # Add the icon to the group and style only if it's found
    if icon and "not found" not in icon:
        class_to_taggit_properties_map[class_label]["group"]["icon"] = icon
        class_to_taggit_properties_map[class_label]["style"]["faIcon"] = icon

# Update features with styles
for feature_id, class_label in feature_to_class_label.items():
    properties = class_to_taggit_properties_map[class_label]
    update_feature_properties(
        PROJECT_ID, feature_id, [properties["group"]], [], properties["style"], jwt
    )
    print(f"Updated feature {feature_id} with {properties}")
