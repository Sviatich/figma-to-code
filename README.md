# Transfig

Базовый стек для веб-сервиса, который:

- принимает `fileKey` и `nodeId` из Figma
- запрашивает данные узла через Figma REST API
- прогоняет их через генератор кода
- показывает preview результата
- отдает архив с исходниками

## Стек

- Frontend: `React`, `TypeScript`, `Next.js App Router`, `CSS Modules`, `TanStack Query`, `Zod`
- Backend: `Next.js Route Handlers` на `Node.js`
- Хранилище: без БД, in-memory store для быстрого старта

## Что уже реализовано

- UI-форма для импорта Figma-макета
- клиентский state/query-слой через `TanStack Query`
- общие схемы валидации через `Zod`
- серверный модуль работы с Figma API
- генератор демо-артефактов для будущего пайплайна `figma -> code`
- preview в `iframe`
- скачивание ZIP-архива с файлами

## API

### `POST /api/projects`

```json
{
  "name": "Landing Import",
  "figmaFileKey": "AbCdEf123456",
  "nodeId": "1:2",
  "accessToken": "optional"
}
```

### `GET /api/projects`

Возвращает список созданных проектов.

### `GET /api/projects/:projectId`

Возвращает один проект с файлами и метаданными.

### `GET /api/projects/:projectId/preview`

Возвращает HTML preview.

### `GET /api/projects/:projectId/download`

Возвращает ZIP-архив с исходниками.

## Figma API

Сейчас сервер использует официальный REST API Figma:

- `https://api.figma.com`
- `GET /v1/files/:key/nodes?ids=:nodeId`

Если токен не передан в форме и не задан в `.env.local`, приложение автоматически переходит в `mock`-режим.

## Запуск

```bash
npm install
npm run dev
```

Открыть: `http://localhost:3000`
