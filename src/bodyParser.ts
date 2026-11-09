import type { Middleware } from './types.js';

const PAYLOAD_LIMIT = 1024 * 1024;

export function bodyParser(): Middleware {
    return (req, res, next) => {
        if (req.method === 'GET' || req.method === 'DELETE') return next();
        if (req.headers['content-type'] !== 'application/json') return next();

        const chunks: Buffer[] = [];
        let receivedBytes = 0;
        let aborted = false;

        req.on('data', (chunk: Buffer) => {
            if (aborted) return;

            receivedBytes += chunk.length;
            if (receivedBytes > PAYLOAD_LIMIT) {
                aborted = true;
                console.error(
                    `[Warning] 허용된 요청 용량 초과 (${receivedBytes} bytes)`,
                );
                res.setHeader('Connection', 'close');
                res.status(413).json({
                    error: '페이로드 용량 초과',
                });

                // 응답을 전부 보내면
                res.on('finish', () => req.destroy());
                return;
            }

            chunks.push(chunk);
        });
        req.on('end', () => {
            if (aborted) return;

            const bodyString = Buffer.concat(chunks).toString('utf-8');
            if (!bodyString) {
                req.body = {};
                return next();
            }

            try {
                req.body = JSON.parse(bodyString);
            } catch (error) {
                console.error('[Parser Error] JSON 파싱에 실패했습니다.');
                // 에러로 서버가 종료되는 대신 원본 문자열이라도 보존
                req.body = bodyString;
            }

            // 전부 읽고 next
            next();
        });
    };
}
