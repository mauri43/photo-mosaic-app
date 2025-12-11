"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionStore = void 0;
const uuid_1 = require("uuid");
// In-memory session store - all data is lost on server restart
class SessionStore {
    sessions = new Map();
    cleanupInterval = null;
    SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
    constructor() {
        // Start cleanup interval
        this.cleanupInterval = setInterval(() => {
            this.cleanupExpiredSessions();
        }, 5 * 60 * 1000); // Check every 5 minutes
    }
    createSession() {
        const session = {
            id: (0, uuid_1.v4)(),
            targetImage: null,
            targetWidth: 0,
            targetHeight: 0,
            tileImages: new Map(),
            allowDuplicates: true,
            allowTinting: true,
            tintPercentage: 50,
            maxRepeatsPerTile: 5,
            colorMode: 'blend',
            mosaic: null,
            dziTiles: new Map(),
            dziMetadata: null,
            createdAt: Date.now()
        };
        this.sessions.set(session.id, session);
        return session;
    }
    getSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            // Update activity timestamp
            session.createdAt = Date.now();
        }
        return session;
    }
    deleteSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            // Clear all buffers to help garbage collection
            session.targetImage = null;
            session.mosaic = null;
            session.tileImages.clear();
            session.dziTiles.clear();
            return this.sessions.delete(sessionId);
        }
        return false;
    }
    clearSessionMosaic(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.mosaic = null;
            session.dziTiles.clear();
            session.dziMetadata = null;
        }
    }
    cleanupExpiredSessions() {
        const now = Date.now();
        for (const [sessionId, session] of this.sessions.entries()) {
            if (now - session.createdAt > this.SESSION_TIMEOUT_MS) {
                this.deleteSession(sessionId);
                console.log(`Cleaned up expired session: ${sessionId}`);
            }
        }
    }
    getStats() {
        let totalTiles = 0;
        let totalMemory = 0;
        for (const session of this.sessions.values()) {
            totalTiles += session.tileImages.size;
            if (session.targetImage) {
                totalMemory += session.targetImage.length;
            }
            if (session.mosaic) {
                totalMemory += session.mosaic.length;
            }
            for (const tile of session.tileImages.values()) {
                totalMemory += tile.buffer.length;
            }
            for (const dziTile of session.dziTiles.values()) {
                totalMemory += dziTile.length;
            }
        }
        return {
            sessionCount: this.sessions.size,
            totalTiles,
            totalMemoryMB: Math.round(totalMemory / (1024 * 1024) * 100) / 100
        };
    }
    shutdown() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        // Clear all sessions
        for (const sessionId of this.sessions.keys()) {
            this.deleteSession(sessionId);
        }
    }
}
exports.sessionStore = new SessionStore();
//# sourceMappingURL=sessionStore.js.map