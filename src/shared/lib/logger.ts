/**
 * MailPulse Structured Logger
 * Centraliza logs para facilitar monitoramento em produção.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogPayload {
  message: string;
  context?: Record<string, any>;
  error?: any;
}

const isProd = process.env.NODE_ENV === 'production';

function log(level: LogLevel, payload: LogPayload) {
  const timestamp = new Date().toISOString();
  const { message, context, error } = payload;

  const logObj = {
    timestamp,
    level: level.toUpperCase(),
    message,
    ...context,
    ...(error && { 
      error: {
        message: error.message,
        stack: isProd ? undefined : error.stack,
        code: error.code
      }
    })
  };

  if (isProd) {
    // Em produção, logs estruturados em JSON são melhores para ferramentas de busca (CloudWatch, Datadog, etc)
    console.log(JSON.stringify(logObj));
  } else {
    // Em dev, log colorido e legível
    const colors = {
      info: '\x1b[34m',
      warn: '\x1b[33m',
      error: '\x1b[31m',
      debug: '\x1b[32m',
    };
    console.log(`${colors[level]}[${level.toUpperCase()}]\x1b[0m ${message}`, context || '');
    if (error) console.error(error);
  }
}

export const logger = {
  info: (message: string, context?: Record<string, any>) => log('info', { message, context }),
  warn: (message: string, context?: Record<string, any>) => log('warn', { message, context }),
  error: (message: string, error?: any, context?: Record<string, any>) => log('error', { message, error, context }),
  debug: (message: string, context?: Record<string, any>) => log('debug', { message, context }),
};
