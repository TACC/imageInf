.PHONY: build build-dev deploy start stop preload preload_and_start
TAG := $(shell git log --format=%h -1)
IMAGE=taccwma/imageinf
IMAGE_CLIENT = taccwma/imageinf-client

build: build-service build-client

build-dev: build-service-dev build-client

build-service:
	docker build -t $(IMAGE):$(TAG) .
	docker tag $(IMAGE):$(TAG) $(IMAGE):local

build-service-dev:
	docker build --build-arg DEV=true -t $(IMAGE):local .

build-client:
	docker build -f Dockerfile.client -t $(IMAGE_CLIENT):$(TAG) .
	docker tag $(IMAGE_CLIENT):$(TAG) $(IMAGE_CLIENT):local

deploy:
	docker push $(IMAGE):$(TAG)
	docker push $(IMAGE_CLIENT):$(TAG)

# Preload models into cache
preload:
	docker-compose --profile setup run --rm model-preloader

# Preload models and start services
preload_and_start: preload start
	@echo "✓ Models preloaded and services running"

start:
	docker-compose up

setup-tapis-token:
	@echo "Getting tapis token for iframe cep.test"
	@docker run -it --rm -v $(PWD):/app taccwma/imageinf:local python /app/scripts/setup_iframe_token.py

# Run like a demo cep.test with iframe
start-iframe-cep-test-simulation:
	docker-compose -f docker-compose.iframe-cep-test-simulation.yml up

stop-iframe-cep-test-simulation:
	docker-compose -f docker-compose.iframe-cep-test-simulation.yml down

stop:
	docker-compose down
	$(MAKE) stop-iframe-cep-test-simulation
