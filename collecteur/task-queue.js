// File d'attente simple pour les requêtes Twitch API
// Rate limiting: maxRequestsPerMin toutes les 60 secondes
let lastReset = Date.now();
let requestCount = 0;

export class ApiQueue {
  constructor(maxRequestsPerMin = 800) {
    this.maxRequestsPerMin = maxRequestsPerMin;
  }

  async add(task) {
    // Reset compteur toutes les minutes
    const now = Date.now();
    if (now - lastReset > 60000) {
      lastReset = now;
      requestCount = 0;
    }

    // Attendre si on a dépassé le quota
    while (requestCount >= this.maxRequestsPerMin) {
      await new Promise(r => setTimeout(r, 100));
    }

    requestCount++;
    return task();
  }
}

export const apiQueue = new ApiQueue(750);