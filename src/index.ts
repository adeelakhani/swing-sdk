import * as rrweb from 'rrweb';

export interface RecorderOptions {
  projectId: string;
  uploadUrl: string;
  bufferSeconds?: number;
}

export function initRecorder(options: RecorderOptions): void {
  const { projectId, uploadUrl, bufferSeconds = 5 } = options;
  let events: any[] = [];

  rrweb.record({
    emit(event: any) {
      events.push(event);
    },
  });

  setInterval(() => {
    if (events.length === 0) return;

    const payload = {
      projectId,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      events,
    };

    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], {
        type: 'application/json',
      });
      navigator.sendBeacon(uploadUrl, blob);
    } else {
      fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    events = [];
  }, bufferSeconds * 1000);
}
