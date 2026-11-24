// Export vers Prometheus + file de log
import fs from 'node:fs';

export class Metrics {
  constructor() {
    this.reset();
    this.logPath = './metrics.log';
  }

  reset() {
    this.apiCalls = 0;
    this.apiErrors = 0;
    this.dbInserts = 0;
    this.queueSize = 0;
    this.startTime = Date.now();
  }

  inc(type) {
    this[type] = (this[type] || 0) + 1;
  }

  log() {
    const entry = {
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      apiCalls: this.apiCalls,
      apiErrors: this.apiErrors,
      dbInserts: this.dbInserts,
      queueSize: this.queueSize,
      successRate: this.apiCalls > 0 ? ((this.apiCalls - this.apiErrors) / this.apiCalls * 100).toFixed(2) : 100
    };

    fs.appendFileSync(this.logPath, JSON.stringify(entry) + '\n');
    this.reset();
  }
}

export const metrics = new Metrics();