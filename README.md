# Embedding API Service

A lightweight, production-ready embedding API built with Node.js, Fastify, and `@xenova/transformers`. Designed specifically for low-RAM environments like a 1 GB Azure App Service.

## Features
- **Model**: `Xenova/multilingual-e5-base` (ONNX quantized).
- **RAM Optimized**: Limits excessive concurrent inference and payload sizes.
- **Single Responsibility**: Only computes embeddings.
- **Secure**: Bearer token authentication.

## Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Setup Environment Variables:
   Copy `.env.example` to `.env` and adjust the configuration:
   ```bash
   cp .env.example .env
   ```
   Set your `EMBEDDING_API_KEY`.

3. Pre-download the model:
   This ensures the model is cached locally before the server starts.
   ```bash
   npm run prestart
   ```

4. Start the server:
   ```bash
   npm run start
   ```

## API Usage

### Health Check
```bash
curl http://localhost:8080/health
```

### Create Embeddings
Requires `Authorization: Bearer <your_api_key>` header.
The `type` can be `"passage"` (default) or `"query"`.

```bash
curl -X POST http://localhost:8080/embed \
  -H "Authorization: Bearer your_secure_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{"texts": ["First text", "Second text"], "type": "passage"}'
```

## Azure App Service Deployment

1. Set up an Azure App Service with Node.js (Linux is recommended).
2. Set the `EMBEDDING_API_KEY` in the Azure App Service **Application Settings**.
3. (Optional) Set `PORT=8080` if required by Azure, though Azure sets the `PORT` env var automatically.
4. Deploy the source code via GitHub Actions, ZIP deploy, or Local Git.
5. During deployment, the `prestart` script runs automatically or can be configured as a post-install hook to cache the model. On first boot, the server will cache it if not already present.

> **Note**: Azure App Service provides a persistent filesystem at `/home` which is where `.cache` will be stored. The model is only downloaded once.
