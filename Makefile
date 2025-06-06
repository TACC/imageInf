.PHONY: build deploy start stop

TAG := $(shell git log --format=%h -1)
IMAGE=taccwma/imageinf
IMAGE_CLIENT  = taccwma/imageinf-ui

build: build-service build-client


build-service:
	docker build -t $(IMAGE):$(TAG) .
	docker tag $(IMAGE):$(TAG) $(IMAGE):local

build-client:
	docker build -f Dockerfile.client -t $(IMAGE_CLIENT):$(TAG) .

deploy:
	docker push $(IMAGE):$(TAG)
	docker push $(IMAGE_CLIENT):$(TAG)

start:
	docker-compose up

stop:
	docker-compose down
