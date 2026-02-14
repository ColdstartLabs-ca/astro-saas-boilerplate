/**
 * Day.js plugin for RFC 822 date formatting
 * Used for RSS feed pubDate and lastBuildDate fields
 *
 * RFC 822 format: "Wed, 02 Oct 2002 13:00:00 GMT"
 */

import type { PluginFunc } from 'dayjs';

 
interface IDayjs {
  toDate(): Date;
  toRFC822(): string;
}

declare module 'dayjs' {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  interface Dayjs {
    toRFC822(): string;
  }
}

const rfc822: PluginFunc = (_option, dayjsClass) => {
  /**
   * Format date as RFC 822 string for RSS feeds
   * Example: "Wed, 02 Oct 2002 13:00:00 GMT"
   */
  (dayjsClass.prototype as IDayjs).toRFC822 = function toRFC822(): string {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const date = this.toDate();
    const dayName = days[date.getUTCDay()];
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = months[date.getUTCMonth()];
    const year = date.getUTCFullYear();
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');

    return `${dayName}, ${day} ${month} ${year} ${hours}:${minutes}:${seconds} GMT`;
  };
};

export { rfc822 };
