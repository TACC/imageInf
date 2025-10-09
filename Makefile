.PHONY: build deploy start stop preload preload_and_start
TAG := $(shell git log --format=%h -1)
IMAGE=taccwma/imageinf
IMAGE_CLIENT = taccwma/imageinf-client

build: build-service build-client

build-service:
	docker build -t $(IMAGE):$(TAG) .
	docker tag $(IMAGE):$(TAG) $(IMAGE):local

build-client:
	docker build -f Dockerfile.client -t $(IMAGE_CLIENT):$(TAG) .

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

stop:
	docker-compose down
