import type { SessionData } from '../types/index.js';
declare class SessionStore {
    private sessions;
    private cleanupInterval;
    private readonly SESSION_TIMEOUT_MS;
    constructor();
    createSession(): SessionData;
    getSession(sessionId: string): SessionData | undefined;
    deleteSession(sessionId: string): boolean;
    clearSessionMosaic(sessionId: string): void;
    private cleanupExpiredSessions;
    getStats(): {
        sessionCount: number;
        totalTiles: number;
        totalMemoryMB: number;
    };
    shutdown(): void;
}
export declare const sessionStore: SessionStore;
export {};
//# sourceMappingURL=sessionStore.d.ts.map