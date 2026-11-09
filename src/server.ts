import crypto from 'node:crypto';
import path from 'node:path';

import GreenFrame from './greenFrame.js';

import { serveStatic } from './staticMiddleware.js';
import { bodyParser } from './bodyParser.js';

import type { LoginBody, UserTable } from './types.js';

function isLoginBody(body: unknown): body is LoginBody {
    return (
        typeof body === 'object' &&
        body !== null &&
        'id' in body &&
        typeof body.id === 'string' &&
        'password' in body &&
        typeof body.password === 'string'
    );
}

const PORT = 6500;
const server = new GreenFrame();
const currentDir = process.cwd();

const userTable: UserTable = {
    user1: {
        id: 'user1',
        name: '경원',
        password: '1234',
        role: 'user',
    },
};

// ============================================================================
// 미들웨어
// ============================================================================
// 정적 파일 서빙 미들웨어
server.use(serveStatic(path.join(currentDir, 'public')));
// 바디 파서 미들웨어
server.use(bodyParser());
// 로깅 미들웨어
server.use((req, _, next) => {
    console.log(`[Logger] 클라이언트가 ${req.method} ${req.url} 에 접근.`);
    req.requestTime = new Date().toISOString();
    next();
});

// ============================================================================
// 엔드포인트
// ============================================================================
server.addRoute('POST', '/api/login', (req, res) => {
    if (!isLoginBody(req.body)) {
        return res
            .status(401)
            .json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    const { id, password } = req.body;
    const user = userTable[id];

    if (!user || user.password !== password) {
        return res
            .status(401)
            .json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    const sessionToken = crypto.randomBytes(32).toString('hex');
    const sessionLifespan = 3600 * 1000; // 수명: 1시간 (밀리초 단위 계산)

    server.sessionStore[sessionToken] = {
        userId: user.id,
        expires: Date.now() + sessionLifespan,
    };

    res.setHeader(
        'Set-Cookie',
        `token=${sessionToken}; Max-Age=3600; HttpOnly; Path=/; SameSite=Strict`,
    );

    return res.status(200).json({
        message: '로그인 성공! 브라우저에 쿠키가 안착되었습니다.',
    });
});

server.addRoute('GET', '/api/profile', (req, res) => {
    const clientToken = req.cookies['token'];
    if (!clientToken) {
        return res
            .status(401)
            .json({ error: '인증 쿠키가 존재하지 않습니다.' });
    }

    const sessionData = server.sessionStore[clientToken];
    if (!sessionData) {
        // Max-Age=0 수명 0초로 쿠키를 발송해서 브라우저 금고에 남아있는 오염된 쿠키까지 강제파괴
        res.setHeader('Set-Cookie', `token=; Max-Age=0; HttpOnly; Path=/`);
        return res.status(401).json({
            error: '만료된 세션입니다. 클라이언트 측 쿠키를 폐기합니다.',
        });
    }

    // Rolling Session
    sessionData.expires = Date.now() + 3600 * 1000;
    res.setHeader(
        'Set-Cookie',
        `token=${clientToken}; Max-Age=3600; HttpOnly; Path=/; SameSite=Strict`,
    );

    const userInfo = userTable[sessionData.userId];

    return res.status(200).json({
        message: '인증 통과 및 세션 수명 1시간 연장(Rolling) 성공!',
        data: { name: userInfo.name },
    });
});

server.listen(PORT, () => {
    console.log(`GreenFrame ${PORT} 포트에서 시작`);
});
