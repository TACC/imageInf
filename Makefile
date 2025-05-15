.PHONY: build deploy start stop

TAG := $(shell git log --format=%h -1)
IMAGE=taccwma/imageinf

build:
	docker build -t $(IMAGE):$(TAG) .
	docker tag $(IMAGE):$(TAG) $(IMAGE):local

deploy:
	docker push $(IMAGE):$(TAG)

start:
	docker-compose up

stop:
	docker-compose down
