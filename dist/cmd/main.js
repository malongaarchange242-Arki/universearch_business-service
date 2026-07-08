"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
console.log('=== Starting business-service ===');
console.log('Loading dotenv...');
dotenv_1.default.config();
console.log('Dotenv loaded');
console.log('Setting up global error handlers...');
process.on('uncaughtException', (error) => {
    console.error('[UNCAUGHT EXCEPTION] ', error instanceof Error ? error.stack : error);
});
process.on('unhandledRejection', (reason) => {
    console.error('[UNHANDLED REJECTION] ', reason instanceof Error ? reason.stack : reason);
});
console.log('Loading app...');
const { app, initializeApp } = require('../app');
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';
console.log('Creating Fastify...');
console.log('Registering plugins...');
console.log('Registering routes...');
const start = async () => {
    try {
        if (typeof initializeApp === 'function') {
            await initializeApp();
        }
        console.log('Starting server...');
        await app.listen({ port: PORT, host: HOST });
        console.log('Server started.');
        console.log(`Server listening on http://${HOST}:${PORT}`);
        app.log.info(`Business service listening on http://${HOST}:${PORT}`);
    }
    catch (err) {
        console.error('[STARTUP ERROR]', err instanceof Error ? err.stack : err);
        if (app && typeof app.log === 'object' && typeof app.log.error === 'function') {
            app.log.error(err);
        }
        process.exit(1);
    }
};
start().catch((err) => {
    console.error('[START CATCH]', err instanceof Error ? err.stack : err);
    process.exit(1);
});
//# sourceMappingURL=main.js.map