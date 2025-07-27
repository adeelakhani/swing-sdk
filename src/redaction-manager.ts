import type { SwingEvent } from "./types";

export class SwingRedactionManager {
  private redactedFields: string[] = [];
  private redactedText: string = "***";

  public setRedactedFields(fields: string[]): void {
    this.redactedFields = fields;
  }

  public getRedactedFields(): string[] {
    return [...this.redactedFields];
  }

  public setRedactedText(text: string): void {
    this.redactedText = text;
  }

  public processEvent(event: SwingEvent): SwingEvent {
    if (!this.isActive()) return event;

    // Process different event types
    switch (event.type) {
      case 3: // IncrementalSnapshot
        return this.redactIncrementalSnapshot(event);
      case 2: // FullSnapshot
        return this.redactFullSnapshot(event);
      case 5: // Custom events
        return this.redactCustomEvent(event);
      default:
        return event;
    }
  }

  private isActive(): boolean {
    return this.redactedFields.length > 0;
  }

  private redactIncrementalSnapshot(event: SwingEvent): SwingEvent {
    // Deep clone to avoid mutating original
    const processedEvent = JSON.parse(JSON.stringify(event));

    if (processedEvent.data && processedEvent.data.source) {
      // Handle different incremental snapshot types
      switch (processedEvent.data.source) {
        case 0: // Mutation
          this.redactMutations(processedEvent.data);
          break;
        case 2: // Input
          this.redactInputs(processedEvent.data);
          break;
        case 3: // Text
          this.redactText(processedEvent.data);
          break;
        case 5: // Selection
          // Keep selection events as-is
          break;
        default:
          break;
      }
    }

    return processedEvent;
  }

  private redactFullSnapshot(event: SwingEvent): SwingEvent {
    // Deep clone to avoid mutating original
    const processedEvent = JSON.parse(JSON.stringify(event));

    if (processedEvent.data && processedEvent.data.node) {
      this.redactNode(processedEvent.data.node);
    }

    return processedEvent;
  }

  private redactCustomEvent(event: SwingEvent): SwingEvent {
    // Deep clone to avoid mutating original
    const processedEvent = JSON.parse(JSON.stringify(event));

    // For custom events, we might want to redact certain payload fields
    if (processedEvent.data && processedEvent.data.payload) {
      // Remove sensitive fields from custom event payloads
      const sensitiveFields = ["buttonText", "linkText", "message"];
      sensitiveFields.forEach((field) => {
        if (processedEvent.data.payload[field]) {
          processedEvent.data.payload[field] = this.redactedText;
        }
      });
    }

    return processedEvent;
  }

  private redactMutations(data: any): void {
    if (data.adds) {
      data.adds.forEach((add: any) => {
        if (add.node) {
          this.redactNode(add.node);
        }
      });
    }

    if (data.texts) {
      data.texts.forEach((text: any) => {
        if (this.shouldRedactText(text.id)) {
          text.value = this.redactedText;
        }
      });
    }

    if (data.attributes) {
      data.attributes.forEach((attr: any) => {
        if (this.shouldRedactAttribute(attr)) {
          if (attr.attributes) {
            Object.keys(attr.attributes).forEach((key) => {
              if (this.isRedactedField(key)) {
                attr.attributes[key] = this.redactedText;
              }
            });
          }
        }
      });
    }
  }

  private redactInputs(data: any): void {
    // Always redact password inputs
    if (data.text && this.shouldRedactInput(data.id)) {
      data.text = this.redactedText;
    }
  }

  private redactText(data: any): void {
    if (data.value && this.shouldRedactText(data.id)) {
      data.value = this.redactedText;
    }
  }

  private redactNode(node: any): void {
    if (!node) return;

    // Check if this node matches any redacted selectors
    if (this.shouldRedactNode(node)) {
      // Redact text content
      if (node.textContent) {
        node.textContent = this.redactedText;
      }

      // Redact attributes
      if (node.attributes) {
        Object.keys(node.attributes).forEach((key) => {
          if (this.isRedactedField(key) || key === "value") {
            node.attributes[key] = this.redactedText;
          }
        });
      }
    }

    // Recursively process child nodes
    if (node.childNodes) {
      node.childNodes.forEach((child: any) => {
        this.redactNode(child);
      });
    }
  }

  private shouldRedactNode(node: any): boolean {
    if (!node || !node.attributes) return false;

    // Check if node matches any redacted selectors
    return this.redactedFields.some((selector) => {
      // Handle simple cases
      if (selector.startsWith("#") && node.attributes.id) {
        return `#${node.attributes.id}` === selector;
      }

      if (selector.startsWith(".") && node.attributes.class) {
        const className = selector.substring(1);
        return node.attributes.class.split(" ").includes(className);
      }

      if (
        node.tagName &&
        node.tagName.toLowerCase() === selector.toLowerCase()
      ) {
        return true;
      }

      // Handle input[type="password"] selector
      if (
        selector === 'input[type="password"]' &&
        node.tagName === "INPUT" &&
        node.attributes.type === "password"
      ) {
        return true;
      }

      return false;
    });
  }

  private shouldRedactInput(nodeId: number): boolean {
    // This would require maintaining a mapping of node IDs to their selectors
    // For now, implement basic logic
    return true; // Redact all inputs for safety
  }

  private shouldRedactText(nodeId: number): boolean {
    // This would require maintaining a mapping of node IDs to their selectors
    // For now, implement basic logic
    return false; // Don't redact text by default
  }

  private shouldRedactAttribute(attr: any): boolean {
    return this.redactedFields.length > 0; // If any fields are configured for redaction
  }

  private isRedactedField(fieldName: string): boolean {
    const sensitiveFields = ["value", "data-value", "placeholder"];
    return sensitiveFields.includes(fieldName.toLowerCase());
  }
}
