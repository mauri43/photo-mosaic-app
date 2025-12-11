"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const api_js_1 = __importDefault(require("./routes/api.js"));
const sessionStore_js_1 = require("./services/sessionStore.js");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Middleware
// Allow CORS from localhost and production Vercel domain
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://photo-mosaic-app-sigma.vercel.app'
];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            console.log('CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express_1.default.json());
// Routes
app.use('/api', api_js_1.default);
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', ...sessionStore_js_1.sessionStore.getStats() });
});
// Error handling
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});
// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down...');
    sessionStore_js_1.sessionStore.shutdown();
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down...');
    sessionStore_js_1.sessionStore.shutdown();
    process.exit(0);
});
app.listen(PORT, () => {
    console.log(`Photo Mosaic Backend running on http://localhost:${PORT}`);
    console.log('All data is stored in memory only - will be cleared on restart');
});
//# sourceMappingURL=index.js.map