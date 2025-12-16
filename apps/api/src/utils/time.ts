/**
 * Time utilities for UTC+8 timezone
 */

/**
 * Get current datetime string in UTC+8 (China Standard Time)
 * Format: YYYY-MM-DD HH:MM:SS
 */
export function getNowUTC8(): string {
    const now = new Date();
    // Add 8 hours to UTC time
    const utc8 = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    return utc8.toISOString().replace('T', ' ').slice(0, 19);
}

/**
 * Get today's date string in UTC+8
 * Format: YYYY-MM-DD
 */
export function getTodayUTC8(): string {
    const now = new Date();
    const utc8 = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    return utc8.toISOString().slice(0, 10);
}
