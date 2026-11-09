import http, { IncomingMessage, ServerResponse } from 'node:http';
import fs from 'node:fs/promises';

import type { Middleware, Session } from './types.js';

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

const parseCookies = (cookie: string | undefined): Record<string, string> => {
    if (!cookie) return {};
    return cookie.split(';').reduce<Record<string, string>>((acc, cookie) => {
        // 세미콜론(;)으로 쪼갠 개별 쿠키를 다시 등호(=)를 기준으로 Key와 Value로 분리
        const [key, value] = cookie.split('=');

        if (key && value) {
            acc[key.trim()] = value.trim();
        }
        return acc;
    }, {});
};

class GreenFrame {
    private server: http.Server;
    private routingTable: Map<string, Handler>;
    private middlewares: Middleware[] = [];

    sessionStore: Record<string, Session>;

    constructor() {
        this.server = http.createServer();
        this.routingTable = new Map();
        this.sessionStore = {};

        // 좀비 세션 청소
        setInterval(() => {
            const currentTime = Date.now();
            for (const token in this.sessionStore) {
                if (this.sessionStore[token].expires < currentTime) {
                    delete this.sessionStore[token];
                }
            }
        }, 3600000);

        // ============================================================================
        // 이벤트 리스너
        // ============================================================================
        this.server.on('request', (req, res) => {
            // 쿠키 헤더 파싱
            req.cookies = parseCookies(req.headers['cookie']);

            // 파일 전달 메소드
            res.sendFile = async (filePath, mimeType) => {
                try {
                    const fileHandle = await fs.open(filePath, 'r');
                    const fileStream = fileHandle.createReadStream();

                    res.setHeader('Content-Type', mimeType);

                    fileStream.pipe(res);
                } catch {
                    res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
                }
            };

            // 상태코드 세팅 메소드
            res.status = (code) => {
                res.statusCode = code;
                return res;
            };

            // JSON 문자열 반환 메소드
            res.json = (data) => {
                if (!res.headersSent) {
                    res.setHeader(
                        'Content-Type',
                        'application/json; charset=utf-8',
                    );
                }

                res.end(JSON.stringify(data));
            };

            // ============================================================================
            // 미들웨어
            // ============================================================================

            let idx = 0;

            const next = () => {
                // 처리필요 미들웨어 존재 시
                if (idx < this.middlewares.length) {
                    const currentMiddleware = this.middlewares[idx++];
                    currentMiddleware(req, res, next);
                }
                // 미들웨어 전부 처리 시
                else {
                    // 라우팅 처리 영역
                    if (!req.method || !req.url) {
                        res.statusCode = 404;
                        res.end();
                        return;
                    }

                    const routeKey = req.method.toLowerCase() + ':' + req.url;
                    const foundHandler = this.routingTable.get(routeKey);

                    if (!foundHandler) {
                        return res.status(404).json({
                            error: `${req.method} ${req.url} 경로를 찾을 수 없습니다.`,
                        });
                    }

                    foundHandler(req, res);
                }
            };

            next();
        });
    }

    // ============================================================================
    // 프레임워크 API
    // ============================================================================

    use(middleware: Middleware) {
        this.middlewares.push(middleware);
    }

    // Route 등록
    addRoute(method: string, path: string, handler: Handler) {
        const key = method.toLowerCase() + ':' + path;
        this.routingTable.set(key, handler);
    }

    listen(port: number, callback: () => void) {
        this.server.listen(port, () => callback());
    }
}

export default GreenFrame;

// 미들웨어
