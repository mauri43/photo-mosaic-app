# Photo Mosaic Generator

A professional-grade web application that creates photo mosaics with deep-zoom viewing capability. Upload a target image and tile images, and the system generates a mosaic where zooming in reveals the actual tile images at full clarity.

## Features

- **Target Image Upload**: Upload any image to use as the mosaic reference
- **Resolution Tiers**: Calculate required tiles for LOW, MEDIUM, and HIGH resolution outputs
- **Tile Image Upload**: Batch upload up to 1000 tile images
- **Smart Color Matching**: Uses Delta-E 2000 (perceptually uniform) color comparison in LAB color space
- **Duplicate Control**: Toggle to allow/disallow tile reuse
- **Subtle Tinting**: Optional color adjustment for better visual accuracy
- **Deep Zoom Viewer**: Powered by OpenSeadragon for smooth, infinite zoom capability
- **Memory-Only Storage**: All data exists only in RAM - nothing persists to disk

## Tech Stack

### Backend
- **Node.js + Express**: Fast, scalable HTTP server
- **Sharp**: High-performance image processing (libvips-based)
- **TypeScript**: Type-safe codebase
- **Multer**: Multipart file upload handling

### Frontend
- **React 18**: Modern component architecture
- **TypeScript**: Full type safety
- **Vite**: Lightning-fast development server
- **Tailwind CSS**: Utility-first styling
- **OpenSeadragon**: Industry-standard deep zoom viewer
- **react-dropzone**: Elegant file upload UX

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │
│  React Frontend │────▶│  Express API    │
│  (Vite + TS)    │     │  (Node.js + TS) │
│                 │     │                 │
└─────────────────┘     └────────┬────────┘
                                 │
                        ┌────────▼────────┐
                        │                 │
                        │  Sharp Image    │
                        │  Processing     │
                        │                 │
                        └────────┬────────┘
                                 │
                        ┌────────▼────────┐
                        │                 │
                        │  In-Memory      │
                        │  Session Store  │
                        │                 │
                        └─────────────────┘
```

## Resolution Calculation

Tile counts are calculated based on output dimensions:

| Resolution | Formula | Example (3000×2000) |
|------------|---------|---------------------|
| LOW | `(w × h) / 2500` | 2,400 tiles |
| MEDIUM | `(w × h) / 1200` | 5,000 tiles |
| HIGH | `(w × h) / 400` | 15,000 tiles |

## Color Matching Algorithm

1. **Target Analysis**: Divide target image into grid cells
2. **Color Extraction**: Calculate average LAB color for each cell
3. **Tile Analysis**: Pre-compute average LAB color for each tile image
4. **Matching**: Use Delta-E 2000 formula for perceptually accurate matching
5. **Prioritization**: Match "difficult" colors (extreme hues) first
6. **Duplicate Handling**: Track usage counts when duplicates enabled

## Deep Zoom Implementation

1. **DZI Pyramid**: Generate multi-resolution tile pyramid (256×256 tiles)
2. **Level Calculation**: `maxLevel = ceil(log2(max(width, height)))`
3. **In-Memory Storage**: All pyramid tiles stored in session Map
4. **On-Demand Serving**: OpenSeadragon requests tiles as user zooms
5. **Smooth Interpolation**: Hardware-accelerated rendering

## Setup & Run

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone and enter directory
cd photo-mosaic-app

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Development

```bash
# Terminal 1: Start backend (port 3001)
cd backend
npm run dev

# Terminal 2: Start frontend (port 5173)
cd frontend
npm run dev
```

Open http://localhost:5173 in your browser.

### Production Build

```bash
# Build backend
cd backend
npm run build

# Build frontend
cd ../frontend
npm run build
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/session` | Create new session |
| DELETE | `/api/session/:id` | Delete session |
| POST | `/api/session/:id/target` | Upload target image |
| POST | `/api/session/:id/dimensions` | Set output dimensions |
| POST | `/api/session/:id/tiles` | Upload tile images |
| DELETE | `/api/session/:id/tiles` | Clear tile images |
| PUT | `/api/session/:id/settings` | Update settings |
| POST | `/api/session/:id/generate` | Generate mosaic |
| GET | `/api/session/:id/mosaic.dzi` | Get DZI descriptor |
| GET | `/api/session/:id/mosaic_files/:level/:tile` | Get pyramid tile |
| GET | `/api/session/:id/download` | Download full mosaic |
| GET | `/api/session/:id/status` | Get session status |

## Memory Management

- Sessions auto-expire after 30 minutes of inactivity
- Cleanup runs every 5 minutes
- Page unload triggers session deletion via `sendBeacon`
- All buffers cleared on session delete

## Performance Notes

- Tile processing batched (20 images at a time)
- Mosaic composition batched (100 tiles at a time)
- DZI pyramid generated in parallel per level
- Images stored as optimized JPEG (90% quality)
- LAB color calculations cached per tile

## Limitations

- Browser memory limits apply for very large tile sets
- Processing time increases with resolution
- No persistence - refresh loses everything
