import http from 'node:http';
import { pipeline } from 'node:stream';

interface Backend {
    host: string;
    port: number;
}

const backends: Backend[] = [];

let currentIdx = 0;

const proxyServer = http.createServer((clientReq, proxyRes) => {
    // 1. 백엔드 수 검토
    if (backends.length === 0) {
        proxyRes.writeHead(503, {
            'Content-Type': 'text/plain; charset=utf-8',
        });
        return proxyRes.end('Service Unavailable: 등록된 백엔드가 없습니다.');
    }

    // 2. 트래픽이 보내줄 백엔드 조회
    const idx = currentIdx % backends.length;
    const targetServer = backends[idx];
    currentIdx = idx + 1;

    console.log(
        `[Load Balancer] 트래픽 진입: ${clientReq.url} -> 포트: ${targetServer.port}`,
    );

    // 3. 클라이언트 요청 정보 복사 및 원본 IP를 헤더에 추가
    const clientIp = clientReq.socket.remoteAddress ?? 'unknown';
    const options = {
        hostname: targetServer.host,
        port: targetServer.port,
        path: clientReq.url,
        method: clientReq.method,
        headers: {
            ...clientReq.headers,
            'X-Forwarded-For': clientReq.headers['x-forwarded-for']
                ? `${clientReq.headers['x-forwarded-for']}, ${clientIp}`
                : clientIp,
            'X-Forwarded-Proto': 'http',
            Host: `${targetServer.host}:${targetServer.port}`,
        },
    };

    // 4. 프록시 -> 백엔드 요청 객체 생성
    const proxyReq = http.request(options, (targetRes) => {
        proxyRes.writeHead(targetRes.statusCode ?? 502, targetRes.headers);

        pipeline(targetRes, proxyRes, (err) => {
            if (err)
                console.log(`[Proxy Error] 응답 전달 실패: ${err.message}`);
        });
    });

    // 5. 프록시 요청 객체 에러 핸들링
    proxyReq.on('error', (err) => {
        console.log(`[Proxy Error] 대상 서버 연결 실패: ${err.message}`);
        if (proxyRes.headersSent) {
            return proxyRes.destroy();
        }
        proxyRes.writeHead(502, {
            'Content-Type': 'text/plain; charset=utf-8',
        });
        proxyRes.end('Bad Gateway: 내부 백엔드 서버가 응답하지 않습니다.');
    });

    // 6. 클라이언트 요청 -> 다음 트래픽 전달 서버로 전달 (클라이언트가 끊기면 백엔드 요청도 취소)
    pipeline(clientReq, proxyReq, (err) => {
        if (err) console.log(`[Proxy Error] 요청 전달 실패: ${err.message}`);
    });
});

proxyServer.listen(9000, () => {
    console.log('[Proxy Log] 로드 밸런서가 9000번 포트에서 가동 중.');
});
