# imageInf

AI-powered image inferencing service that applies domain-specific categorization tags to
uploaded datasets to support research workflows and data discovery.

## API Endpoints

- `/api/status`: Health check
- `/api/inference/sync`: Run inference on a single image (synchronous)
- `/api/inference/async`: Submit a batch for async processing (coming soon)

## API Documentation

- Swagger UI: `http://localhost:8080/api/docs`
- ReDoc: `http://localhost:8080/api/redoc`

## Running locally

### Build

```bash
make build-dev
```

### Start

Preload models into cache and then start

```bash
make preload
make start
```

or

```bash
make preload_start
```



Go to:  `http://localhost:8080/api/status`

## Examples

[Run a demo script or notebook](example/README.md) to test the image inference API.

## Testing and Linting

With the `imageinf` service running via Docker, you can open a shell inside the container to run tests:

```bash
docker exec -it imageinf_service bash
```

### Run Tests
```bash
pytest
```

> **Note**
> Some tests may download large models. To skip those, run only non-slow tests:
> ```bash
> pytest -m "not slow"
> ```
>
### Run Linting checks
```
black --check .
flake8 .
```

Auto-fix formatting with black:
```
black .
```

### Client example (frontend)

```
cd client
npm ci
npm run dev
```

Go to http://localhost:8080/

For more info, see [Client README](client/README.md)


### iframe Testing (CEP Simulation)
Test how the SPA behaves when embedded in production (like within a CEP portal). See the [iframe Testing Guide](README-IFRAME-TEST.md) for detailed setup instructions.
