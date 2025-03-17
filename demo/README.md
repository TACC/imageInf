# Demo at 2025-02-27 WMA Meeting

This folder contains a simple Python script demonstrating how Vision Transformer (ViT) can classify images stored in a Hazmapper project and update Taggit metadata accordingly.

## Overview

The script, `classify_images_in_geoapi_project.py`, is a **bare-bones prototype** that:

- Fetches images from a **Tapis system**.
- Uses a **pretrained Vision Transformer (ViT)** model to classify images.
- Maps predicted class labels to **unique colors and icons**.
- Updates corresponding **feature properties** in the Hazmapper GeoAPI.

This is not a production-ready implementation; it contains **hardcoded values** and serves as a starting point for discussion and future improvements. This is to illustrate our project where we want to develop a **standalone image inference service** that can be used by **Taggit and other systems** for automated image categorization.

```bash
pip install torch transformers tapipy requests pillow matplotlib fontawesome

