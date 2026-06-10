import { BUILD_INFO } from '$lib/generated/build-info';

export type DiagnosticArea =
  | 'app'
  | 'setup'
  | 'permissions'
  | 'fn-listener'
  | 'tray'
  | 'model'
  | 'runtime'
  | 'recording';

export type DiagnosticLevel = 'info' | 'warn' | 'error';

const diagnosticsSessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function serializableDetails(details: Record<string, unknown> | undefined) {
  if (!details) return undefined;

  try {
    return JSON.parse(
      JSON.stringify(details, (_key, value) => {
        if (value instanceof Error) {
          return {
            name: value.name,
            message: value.message,
            stack: value.stack,
          };
        }
        if (typeof value === 'bigint') return value.toString();
        return value;
      }),
    ) as Record<string, unknown>;
  } catch (error) {
    return {
      serializationError: error instanceof Error ? error.message : String(error),
      detailsSummary: String(details),
    };
  }
}

function consoleMethod(level: DiagnosticLevel) {
  if (level === 'error') return console.error;
  if (level === 'warn') return console.warn;
  return console.info;
}

export function logDiagnostic(
  area: DiagnosticArea,
  event: string,
  details?: Record<string, unknown>,
  level: DiagnosticLevel = 'info',
) {
  const record = {
    type: 'diagnostic',
    area,
    event,
    level,
    sessionId: diagnosticsSessionId,
    build: BUILD_INFO,
    route:
      typeof window === 'undefined'
        ? undefined
        : {
            href: window.location.href,
            pathname: window.location.pathname,
          },
    isTauri: typeof window !== 'undefined' ? Boolean(window.__TAURI_INTERNALS__) : false,
    details: serializableDetails(details),
  };

  consoleMethod(level)(`[Diag:${area}] ${event}`, record);

  if (typeof window === 'undefined' || !window.__TAURI_INTERNALS__) return;

  void import('@tauri-apps/api/core')
    .then(({ invoke }) => invoke('log_local_analytics_event', { event: record }))
    .catch((error) => {
      console.warn('[Diag] Failed to persist diagnostic event', {
        area,
        event,
        error: error instanceof Error ? error.message : String(error),
      });
    });
}
