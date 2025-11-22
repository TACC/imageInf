.PHONY: build deploy start stop

TAG := $(shell git log --format=%h -1)
IMAGE=taccwma/imageinf
IMAGE_CLIENT  = taccwma/imageinf-client

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

# Built client mode (for iframe testing)
start-built:
	cd client && npm run build && cd .. && docker-compose -f docker-compose.built.yml up

stop-built:
	docker-compose -f docker-compose.built.yml down

# Run like a demo cep.test with iframe
start-iframe-test:
	docker-compose -f docker-compose.iframe-test.yml up

stop-iframe-test:
	docker-compose -f docker-compose.iframe-test.yml down

stop:
	docker-compose down
	$(MAKE) stop-built
	$(MAKE) stop-iframe-test
