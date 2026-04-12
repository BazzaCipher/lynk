# Paperbridge

> Visual document data extraction for Australian tax practices

Paperbridge is a browser-based canvas tool that lets accountants and tax agents upload client documents (rental statements, loan summaries, receipts, payment summaries), extract figures from them, and produce audit-ready summaries - with every number traced back to its source document.

## Who it's for

- Australian tax practitioners preparing individual and rental property returns
- Bookkeepers processing client source documents
- Anyone who needs to extract structured data from PDFs and images with a full audit trail

## What it does

- **Document upload** - Drop PDFs or images onto a visual canvas
- **Data extraction** - Select and extract figures (income, deductions, expenses) from uploaded documents
- **Source linking** - Every extracted value links back to the exact line on the original document
- **Automatic totals** - Income, deductions, and expenses are totalled and cross-checked without manual formulas
- **Client-ready output** - Generate clean summaries for tax returns or client sign-off
- **Organised by client** - Separate workspaces per property or income source, rolled up into a single summary
- **Full audit trail** - Export the complete workpaper as a single portable `.lynk` archive

## How it works

1. Upload documents - drop statements, receipts, and summaries onto the canvas (PDF or image)
2. Extract the numbers - select figures you need; each value stays linked to the original document
3. Export the summary - get an ATO audit-ready summary with every number traceable and every document attached

## Tech stack

- **React 19** + **TypeScript** - UI framework
- **Vite 7** - Build tooling and dev server
- **Tailwind CSS 4** - Styling
- **Zustand** - State management (sliced store architecture)
- **React Flow (@xyflow/react)** - Canvas and node graph
- **react-pdf** - PDF rendering
- **Tesseract.js** - OCR extraction
- **AI SDK** - Multi-provider AI integration (Anthropic, OpenAI, Google)
- **fflate** - ZIP-based `.lynk` archive format
- **Zod** - Schema validation
- **Vitest** - Unit testing

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Scripts

| Command              | Description                          |
| -------------------- | ------------------------------------ |
| `npm run dev`        | Start dev server with HMR            |
| `npm run build`      | Type-check and build for production  |
| `npm run preview`    | Preview production build locally     |
| `npm run lint`       | Run ESLint                           |
| `npm test`           | Run unit tests                       |
| `npm run test:watch` | Run tests in watch mode              |
| `npm run test:coverage` | Run tests with coverage report    |

## Testing

The project has a comprehensive unit test suite with **432 tests across 35 test files**, covering:

- **Core logic** - node registry, connection validation, dependency graph, field detection, layout algorithms, operation registry
- **Store slices** - core, group, history, persistence, file registry, pipeline, blob registry
- **Services** - canvas persistence, canvas validation, `.lynk` archive pack/unpack, file codecs
- **Types** - node categories, AI types, data types, view types
- **Utilities** - formatting, geometry, colors, ID generation, region helpers, suggestions
- **Schemas** - canvas schema validation
- **Config & data** - AI config, templates, node defaults

**Coverage:** [![codecov](https://codecov.io/github/BazzaCipher/lynk/graph/badge.svg?token=LX8LVSG14J)](https://codecov.io/github/BazzaCipher/lynk)

Run the full suite:

```bash
npm test
```

Run with coverage report:

```bash
npm run test:coverage
```

## Project structure

```
src/
├── components/     # React components (canvas, nodes, AI, site, UI)
├── core/           # Core logic (extraction, layout, nodes, operations)
├── config/         # AI and app configuration
├── data/           # Templates and static data
├── hooks/          # React hooks
├── pages/          # Route pages
├── providers/      # React context providers
├── schemas/        # Zod validation schemas
├── services/       # Canvas persistence, validation, archive format
├── store/          # Zustand store with sliced architecture
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
└── __tests__/      # Unit tests (mirrors src/ structure)
```

## Links

- Website: https://paperbridge.com.au
- Blog: https://paperbridge.com.au/blog
- Canvas: https://paperbridge.com.au/canvas
