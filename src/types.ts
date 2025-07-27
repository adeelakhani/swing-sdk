// We'll define our own types to avoid rrweb internal type dependencies
type RecordPlugin = any;

export interface SwingConfig {
  apiKey: string;
  endpoint: string;
  options?: SwingOptions;
}

export interface SwingOptions {
  /** Whether to record in debug mode */
  debug?: boolean;
  /** Ingestion URL for the API */
  ingestionUrl?: string;
  /** Fields to redact for privacy */
  redactFields?: string[];
  /** Enable automatic tracking of user interactions */
  enableAutomaticTracking?: boolean;
  /** Configuration for automatic tracking */
  automaticTrackingOptions?: {
    trackButtons?: boolean;
    trackLinks?: boolean;
    trackForms?: boolean;
    includeText?: boolean;
    includeClasses?: boolean;
  };
  /** Enable console log tracking */
  enableConsoleTracking?: boolean;
  /** Custom sampling configuration */
  sampling?: {
    /** Sample rate for mouse movements (0-1) */
    mousemove?: number;
    /** Sample rate for mouse interactions */
    mouseInteraction?: number;
    /** Sample rate for scrolling */
    scroll?: number;
    /** Sample rate for media interactions */
    media?: number;
    /** Sample rate for inputs */
    input?: number;
  };
  /** Custom record options passed to rrweb */
  recordOptions?: {
    emit?: (event: any, isCheckout?: boolean) => void;
    checkoutEveryNth?: number;
    checkoutEveryNms?: number;
    blockClass?: string | RegExp;
    blockSelector?: string;
    ignoreClass?: string;
    maskTextClass?: string | RegExp;
    maskTextSelector?: string;
    maskInputOptions?: {
      [key: string]: boolean;
    };
    slimDOMOptions?:
      | "all"
      | "last"
      | {
          script?: boolean;
          comment?: boolean;
          headFavicon?: boolean;
          headWhitespace?: boolean;
          headMetaDescKeywords?: boolean;
          headMetaSocial?: boolean;
          headMetaRobots?: boolean;
          headMetaHttpEquiv?: boolean;
          headMetaAuthorship?: boolean;
          headMetaVerification?: boolean;
        };
    inlineStylesheet?: boolean;
    hooks?: {
      mutation?: {
        beforeMutation?: (mutations: MutationRecord[]) => MutationRecord[];
      };
    };
    packFn?: any;
    plugins?: RecordPlugin[];
  };
  /** Upload configuration */
  upload?: {
    /** How often to flush events (in ms) */
    flushInterval?: number;
    /** Maximum events to batch before upload */
    maxBatchSize?: number;
    /** Whether to upload on page unload */
    uploadOnUnload?: boolean;
  };
}

export interface SwingEvent {
  type: number;
  data: any;
  timestamp: number;
  delay?: number;
}

export interface SwingSession {
  id: string;
  startTime: number;
  events: SwingEvent[];
  url: string;
  userAgent: string;
  viewport: {
    width: number;
    height: number;
  };
}

// New interfaces for HumanBehavior compatibility

export interface CustomEventPayload {
  eventType:
    | "button_clicked"
    | "link_clicked"
    | "form_submitted"
    | "console"
    | "navigation";
  buttonId?: string | null;
  buttonType?: string;
  buttonText?: string | null;
  buttonClass?: string | null;
  linkUrl?: string | null;
  linkId?: string | null;
  linkTarget?: string | null;
  linkText?: string | null;
  linkClass?: string | null;
  formId?: string | null;
  formAction?: string | null;
  formMethod?: string;
  fields?: string[];
  formClass?: string | null;
  level?: "log" | "warn" | "error";
  message?: string;
  url?: string;
  type?: string;
  from?: string;
  to?: string;
  pathname?: string;
  search?: string;
  hash?: string;
  referrer?: string;
  page?: string;
  timestamp: number | string;
}

export interface SwingCustomEvent extends SwingEvent {
  type: 5; // Custom event type
  data: {
    payload: CustomEventPayload;
  };
}

export interface APIInitResponse {
  sessionId: string;
  endUserId?: string;
}

export interface UserProperties {
  [key: string]: any;
}
