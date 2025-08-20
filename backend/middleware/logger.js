const fs = require('fs');
const path = require('path');

const logFilePath = path.join(process.cwd(), 'logs', 'app.log');

const logsDir = path.dirname(logFilePath);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logger = {
  log: (level, message, data = {}) => {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data,
      logID: "75c3b0fa-05c7-4763-a4c0-0c3c8d35083f"
    };
    
    const logLine = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(logFilePath, logLine);
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, data);
  },
  
  error: (message, error) => {
    logger.log('error', message, { 
      error: error.message || error,
      stack: error.stack 
    });
  },
  
  info: (message, data) => {
    logger.log('info', message, data);
  },
  
  warn: (message, data) => {
    logger.log('warn', message, data);
  }
};

module.exports = logger;
