/**
 * AxisMessage stub — provides types referenced by KimiClusterOrchestrator
 * and kimi-cluster route. Shape matches actual usage in the codebase.
 */

export interface AxisMessageHeader {
  source: AxisEndpoint;
  target: AxisEndpoint;
  traceChain?: string[];
  timestamp?: string;
  correlationId?: string;
}

export interface AxisEndpoint {
  x: { type: string; action?: string; id?: string };
  y: { service: string; version?: string };
  z: { priority: number };
}

export interface AxisMessage {
  id: string;
  header: AxisMessageHeader;
  x: { type: string; action?: string; id?: string };
  y: { service: string; version?: string };
  z: { priority: number };
  payload: any;
  semantic_payload: any;
  protocol_adapter: string;
  timestamp: string;
  traceId: string;
}

export interface AxisMessageReply {
  header: AxisMessageHeader;
  payload: {
    action: string;
    entity?: string;
    data?: any;
    metadata?: Record<string, unknown>;
  };
  semantic_payload?: any;
  trace?: string[];
  status?: 'success' | 'error' | 'pending';
}

