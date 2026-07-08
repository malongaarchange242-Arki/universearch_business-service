# Business Service

## Overview

`business-service` is the merged backend service for ads, content, and tracking features. It consolidates the existing `ads-service`, `content-service`, and a tracking proxy into a single Fastify application while preserving the original endpoints, data models, business logic, and Supabase integration.

## Architecture

- `cmd/main.ts` - bootstrap entrypoint.
- `app.ts` - single Fastify application, shared plugins, health checks, and routes registration.
- `routes/index.ts` - registers ads, content, and tracking routes.
- `internal/ads` - ads-related modules, routes, handlers, services, and middleware.
- `internal/content` - content-related modules, routes, handlers, services, validations, queues, and workers.
- `internal/tracking` - tracking route proxy to an external tracking API.
- `internal/shared` - shared plugins, middleware, and types.

## Modules

- `ads`
  - campaigns
  - media uploads
  - delivery
  - analytics
  - internal queue admin
- `content`
  - posts
  - interactions
  - activities
  - feed
  - stats
  - feedbacks
  - video processing support
- `tracking`
  - `/tracking/batch`
  - `/api/v1/tracking/batch`

## Routes

- Ads routes are mounted under `/ads`, `/ads/media`, and `/internal/queues/video-processing`.
- Content routes include `/posts`, `/feed`, `/activities`, `/stats`, `/feedbacks`, and uploads.
- Tracking proxy routes preserve existing tracking endpoints.
- Health checks: `/health`, `/health/db`, `/health`.

## Environment Variables

See `.env.example` for the full list. Key variables include:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `REDIS_URL`
- `VIDEO_PROCESSING_QUEUE`
- `VIDEO_PROCESSING_DLQ`
- `ADMIN_TOKEN`
- `VIDEO_QUEUE_ADMIN_TOKEN`
- `TRACKING_SERVICE_URL`
- `TRACKING_API_KEY`

## Start locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Docker

Build the container:

```bash
docker build -t business-service .
```

Run the container:

```bash
docker run -p 3000:3000 --env-file .env.example business-service
```
