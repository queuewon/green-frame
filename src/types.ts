import { IncomingMessage, ServerResponse } from 'node:http';

// ============================================================================
// common
// ============================================================================
declare module 'http' {
    interface IncomingMessage {
        cookies: Record<string, string>;
        body?: unknown;
        requestTime?: string;
        user?: User;
    }

    interface ServerResponse {
        sendFile(filePath: string, mimeType: string): Promise<void>;
        status(code: number): this;
        json(data: unknown): void;
    }
}

// ============================================================================
// server.ts
// ============================================================================
export interface User {
    id: string;
    name: string;
    role: string;
    password: string;
}
export type UserTable = Record<string, User>;
export interface LoginBody {
    id: string;
    password: string;
}

// ============================================================================
// greenFrame.js
// ============================================================================
export interface Session {
    userId: string;
    expires: number;
}
export type Next = () => void;
export type Middleware = (
    req: IncomingMessage,
    res: ServerResponse,
    next: Next,
) => void;
