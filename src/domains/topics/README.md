# Topics Domain Documentation

## Overview
The Topics domain provides dynamic topic retrieval and source mapping. Adding a new topic requires zero changes to core stage logic, guaranteeing system extensibility.

## Key Files
- [`topicService.ts`](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/domains/topics/topicService.ts): Provides topic lookup and source data fetching.

## API Endpoints
- `GET /api/topics`: Returns all registered topics.
- `GET /api/topics/:topicId/sources`: Returns all sources associated with a topic.
