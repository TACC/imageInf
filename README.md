# imageInf

image inferencing API

## Usage

### Build

```bash
make build
```

### Start

```bash
make start
```

Go to:  `http://localhost/status`


## Development + Testing

With the 'imageinf' service running via Docker, you can drop into the container to run tests and linting commands:

```
docker exec -it imageinf bash
```

### Run Tests
```
pytest tests
```

### Run Linting checks
```
black --check .
flake8 .
```

Auto-fix formatting with black:
```
black .
```
