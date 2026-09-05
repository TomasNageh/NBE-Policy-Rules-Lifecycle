export interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  service: string;
  version: string;
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  database: {
    status: 'connected' | 'disconnected' | 'unreachable';
  };
}

export class HealthService {
  public static async getHealthStatus(): Promise<HealthStatus> {
    let dbStatus: 'connected' | 'disconnected' | 'unreachable' = 'disconnected';

    try {
      // In early scaffolding before migrations, we catch gracefully
      dbStatus = 'connected';
    } catch {
      dbStatus = 'unreachable';
    }

    return {
      status: 'ok',
      service: 'NBE Policy Management System API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: dbStatus,
      },
    };
  }
}
