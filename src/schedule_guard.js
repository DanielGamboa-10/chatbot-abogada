import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DateTime } from 'luxon';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar configuración de horarios
const scheduleConfigPath = path.resolve(__dirname, '../config/schedule.json');

class ScheduleGuard {
  constructor() {
    this.config = this.loadConfig();
    this.offHoursNotifiedUsers = new Map(); // senderId -> timestamp de último mensaje enviado
  }

  loadConfig() {
    try {
      const data = fs.readFileSync(scheduleConfigPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('⚠️ Error al leer schedule.json, usando valores por defecto:', error.message);
      return {
        timezone: 'America/Bogota',
        weeklySchedule: {},
        offHoursMessage: 'En este momento estamos fuera del horario de atención. Te responderemos a la brevedad posible en nuestro horario habitual.'
      };
    }
  }

  getTimezone() {
    return process.env.TIMEZONE || this.config.timezone || 'America/Bogota';
  }

  getNow(customDateTime = null) {
    const tz = this.getTimezone();
    if (customDateTime) {
      return DateTime.fromISO(customDateTime, { zone: tz });
    }
    return DateTime.now().setZone(tz);
  }

  getDayKey(weekdayNumber) {
    // luxon: 1 = Lunes, 7 = Domingo
    const daysMap = {
      1: 'monday',
      2: 'tuesday',
      3: 'wednesday',
      4: 'thursday',
      5: 'friday',
      6: 'saturday',
      7: 'sunday'
    };
    return daysMap[weekdayNumber] || 'monday';
  }

  isWithinOperatingHours(customDateTime = null) {
    if (process.env.ENABLE_SCHEDULE_RESTRICTION === 'false') {
      return {
        isOpen: true,
        reason: 'Restricción de horario desactivada en .env'
      };
    }

    const now = this.getNow(customDateTime);
    const dayKey = this.getDayKey(now.weekday);
    const dayConfig = this.config.weeklySchedule?.[dayKey];

    if (!dayConfig || !dayConfig.isOpen) {
      return {
        isOpen: false,
        currentTime: now.toFormat('yyyy-MM-dd HH:mm:ss (cccc)'),
        timezone: this.getTimezone(),
        reason: `Cerrado el día ${dayConfig?.name || dayKey}`
      };
    }

    const currentMinutes = now.hour * 60 + now.minute;

    for (const range of dayConfig.ranges || []) {
      const [startH, startM] = range.start.split(':').map(Number);
      const [endH, endM] = range.end.split(':').map(Number);

      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
        return {
          isOpen: true,
          currentTime: now.toFormat('yyyy-MM-dd HH:mm:ss (cccc)'),
          timezone: this.getTimezone(),
          activeRange: range
        };
      }
    }

    return {
      isOpen: false,
      currentTime: now.toFormat('yyyy-MM-dd HH:mm:ss (cccc)'),
      timezone: this.getTimezone(),
      reason: `Fuera del rango horario del día ${dayConfig.name}`
    };
  }

  getOffHoursMessage() {
    return this.config.offHoursMessage;
  }

  shouldSendOffHoursNotification(senderId) {
    const cooldownMinutes = parseInt(process.env.OFF_HOURS_COOLDOWN_MINUTES || '60', 10);
    const cooldownMs = cooldownMinutes * 60 * 1000;
    const nowMs = Date.now();

    const lastNotified = this.offHoursNotifiedUsers.get(senderId);

    if (!lastNotified || (nowMs - lastNotified) > cooldownMs) {
      this.offHoursNotifiedUsers.set(senderId, nowMs);
      return true;
    }

    return false;
  }
}

export const scheduleGuard = new ScheduleGuard();
