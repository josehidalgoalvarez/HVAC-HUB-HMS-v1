
interface IcsEvent {
  title: string;
  description: string;
  location: string;
  start: Date;
  end: Date;
  organizerName?: string;
  organizerEmail?: string;
  attendeeName?: string;
  attendeeEmail?: string;
}

export const generateICSContent = (event: IcsEvent): string => {
  const formatTime = (date: Date) => date.toISOString().replace(/-|:|\.\d\d\d/g, '');
  const now = formatTime(new Date());

  // Escape special characters in text fields
  const escape = (str: string) => str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

  let content = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HVACHome//Appliance Management//EN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${Date.now()}-${Math.floor(Math.random() * 10000)}@hvachome.com`,
    `DTSTAMP:${now}`,
    `DTSTART:${formatTime(event.start)}`,
    `DTEND:${formatTime(event.end)}`,
    `SUMMARY:${escape(event.title)}`,
    `DESCRIPTION:${escape(event.description)}`,
    `LOCATION:${escape(event.location)}`,
    `STATUS:CONFIRMED`,
    `SEQUENCE:0`
  ];

  if (event.organizerName && event.organizerEmail) {
    content.push(`ORGANIZER;CN="${escape(event.organizerName)}":mailto:${event.organizerEmail}`);
  }

  if (event.attendeeName && event.attendeeEmail) {
    content.push(`ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN="${escape(event.attendeeName)}":mailto:${event.attendeeEmail}`);
  }

  content.push('END:VEVENT');
  content.push('END:VCALENDAR');

  return content.join('\r\n');
};
