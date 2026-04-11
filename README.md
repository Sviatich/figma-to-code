# Transfig

`Transfig` теперь собран вокруг модульного pipeline:

`Figma API -> Parser -> Transformer -> Generator -> Export`

## Архитектура

- `src/app` — страницы и route handlers на `Next.js App Router`
- `src/components` — UI для импорта и рабочей области `preview/code`
- `src/lib/figma` — клиент загрузки данных Figma, парсинг ссылки, выбор frame
- `src/lib/core` — parser, transformer, generator, exporter
- `src/lib/projects` — схемы, сервис проекта и in-memory store

## Пользовательский сценарий

1. На главной странице пользователь вставляет ссылку Figma или прикрепляет JSON-экспорт.
2. `/api/figma/load` загружает структуру и отдаёт список доступных frame.
3. Пользователь выбирает frame и запускает `/api/transform`.
4. Pipeline создаёт внутреннюю модель, генерирует код и сохраняет результат проекта.
5. В рабочей области доступны вкладки `Preview` и `Code`, а также экспорт ZIP через `/api/export/:projectId`.

## Запуск

```bash
npm install
npm run dev
```
