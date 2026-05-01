import { Alert } from '../types';

const alerts: Map<string, Alert> = new Map();
const triggeredFeed: Alert[] = [];

export function saveAlert(alert: Alert): void {
  alerts.set(alert.alertId, alert);
}

export function getAlert(alertId: string): Alert | null {
  return alerts.get(alertId) || null;
}

export function getActiveAlerts(): Alert[] {
  const now = new Date();
  return Array.from(alerts.values()).filter(a => {
    if (a.status === 'expired') return false;
    if (new Date(a.expiresAt) < now) {
      a.status = 'expired';
      return false;
    }
    return true;
  });
}

export function getAlertsBySymbol(symbol: string): Alert[] {
  return getActiveAlerts().filter(a => a.symbol.toUpperCase() === symbol.toUpperCase());
}

export function triggerAlert(alertId: string, currentValue: number, message: string): void {
  const alert = alerts.get(alertId);
  if (!alert) return;
  alert.triggered = true;
  alert.triggeredAt = new Date().toISOString();
  alert.triggeredValue = currentValue;
  alert.status = 'triggered';
  alert.message = message;
  triggeredFeed.unshift({ ...alert });
  if (triggeredFeed.length > 100) triggeredFeed.splice(100);
}

export function getTriggeredFeed(limit = 20): Alert[] {
  return triggeredFeed.slice(0, limit);
}

export function alertCount(): number {
  return getActiveAlerts().length;
}
