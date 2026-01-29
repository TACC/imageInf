MODEL_REGISTRY = {}
MODEL_METADATA = {}


def register_model_runner(model_name, model_type, description=None, link=None):
    def decorator(cls):
        MODEL_REGISTRY[model_name] = cls
        MODEL_METADATA[model_name] = {
            "name": model_name,
            "type": model_type,
            "description": description or model_name,
            "link": link or "",
        }
        return cls

    return decorator
