.DEFAULT_GOAL := help
YARN ?= yarn
ARGS ?=
GENERATED := src/generated/api/v1.ts

.PHONY: help install install-ci dev build start lint lint-fix type-check format format-check test test-watch e2e-install e2e api-generate api-pull api-check check ci

help: ## Show available commands
	@awk 'BEGIN {FS = ":.*## "} /^[a-zA-Z0-9_-]+:.*## / {printf "  %-14s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	$(YARN) install $(ARGS)

install-ci: ## Install exactly what yarn.lock pins (fails if it would change)
	$(YARN) install --immutable

dev: ## Start the dev server on http://localhost:3000 (proxies /api to API_PROXY_TARGET)
	$(YARN) dev $(ARGS)

build: ## Production build (standalone)
	$(YARN) build

start: ## Serve the production build
	$(YARN) start $(ARGS)

lint: ## ESLint, including the layer rules
	$(YARN) lint

lint-fix: ## ESLint with automatic fixes
	$(YARN) lint:fix

type-check: ## TypeScript, no emit
	$(YARN) type-check

format: ## Apply Prettier
	$(YARN) format

format-check: ## Check Prettier formatting
	$(YARN) format:check

test: ## Vitest unit and component tests; optionally ARGS="path"
	$(YARN) test $(ARGS)

test-watch: ## Vitest in watch mode
	$(YARN) test:watch $(ARGS)

e2e-install: ## Install the Playwright browser (once per machine)
	$(YARN) playwright install chromium $(ARGS)

e2e: ## Playwright tests against a fake API (starts yarn dev unless one is running)
	$(YARN) test:e2e $(ARGS)

api-generate: ## Regenerate API types from the committed openapi/v1.json
	$(YARN) api:generate

api-pull: ## Refresh openapi/v1.json from a running backend, then regenerate
	$(YARN) api:generate --pull

api-check: ## Fail when the generated API types do not match openapi/v1.json
	@cp $(GENERATED) .api-check.ts
	@$(YARN) api:generate > /dev/null
	@if cmp -s $(GENERATED) .api-check.ts; then \
		rm .api-check.ts; echo "API types match openapi/v1.json"; \
	else \
		mv .api-check.ts $(GENERATED); \
		echo "$(GENERATED) is out of date: run 'make api-generate' and commit it"; exit 1; \
	fi

check: ## Everything CI checks except e2e: lint, types, format, tests, API types, build
	$(MAKE) lint
	$(MAKE) type-check
	$(MAKE) format-check
	$(MAKE) test
	$(MAKE) api-check
	$(MAKE) build

ci: install-ci check ## Clean install, then every check
