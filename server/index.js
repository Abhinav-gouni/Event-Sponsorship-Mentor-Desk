import app from './app.js';

const PORT = process.env.PORT || 5000;

process.on('uncaughtException', (err) => {
  console.error('[Process Uncaught Exception]:', err.stack || err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Process Unhandled Rejection]:', reason);
});

process.on('exit', (code) => {
  console.error('[Process Exit] code:', code);
});

process.on('beforeExit', (code) => {
  console.error('[Process BeforeExit] code:', code);
});

process.on('SIGINT', () => {
  console.error('[Process Signal] SIGINT');
});

process.on('SIGTERM', () => {
  console.error('[Process Signal] SIGTERM');
});

// Heartbeat timer to keep event loop active
const timer = setInterval(() => {}, 10000);
timer.unref = () => {}; // keep referenced

const server = app.listen(PORT, () => {
  console.log(`C34 sponsorship server running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  console.error('[Server Error]:', err);
});
