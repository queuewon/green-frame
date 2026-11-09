import path from 'path';

import type { Middleware } from './types.js';

const MIME_TYPES: Partial<Record<string, string>> = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
};

export function serveStatic(baseDir: string): Middleware {
    return (req, res, next) => {
        if (req.method !== 'GET') return next();

        let reqUrl = req.url === '/' ? '/index.html' : req.url;
        if (!reqUrl) {
            return next();
        }

        const root = path.resolve(baseDir);
        const filePath = path.resolve(root, '.' + reqUrl);
        if (!filePath.startsWith(root + path.sep)) {
            return next();
        }

        let extName = path.extname(filePath);

        let contentType = MIME_TYPES[extName];
        if (!contentType) {
            return next();
        }

        res.sendFile(filePath, contentType);
    };
}
