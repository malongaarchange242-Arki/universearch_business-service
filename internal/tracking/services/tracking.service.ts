import axios from 'axios';
import { EventAction, TrackingBatch } from '../types';

const TRACKING_SERVICE_URL = process.env.TRACKING_SERVICE_URL || 'http://localhost:8080';
const TRACKING_API_KEY = process.env.TRACKING_API_KEY || process.env.INTERNAL_API_KEY || '';

const normalizeEventAction = (action: any): EventAction => {
  const meta = action?.meta && typeof action.meta === 'object'
    ? action.meta
    : action?.metadata && typeof action.metadata === 'object'
      ? action.metadata
      : undefined;

  const normalized: EventAction = {
    name: String(action?.name ?? action?.action ?? action?.event ?? 'unknown'),
  };

  if (typeof action?.user_id === 'string' && action.user_id) {
    normalized.user_id = action.user_id;
  }

  if (typeof action?.anonymous_id === 'string' && action.anonymous_id) {
    normalized.anonymous_id = action.anonymous_id;
  }

  if (typeof action?.session_id === 'string' && action.session_id) {
    normalized.session_id = action.session_id;
  }

  if (typeof action?.device_token === 'string' && action.device_token) {
    normalized.device_token = action.device_token;
  }

  if (typeof action?.page === 'string' && action.page) {
    normalized.page = action.page;
  }

  if (typeof action?.element === 'string' && action.element) {
    normalized.element = action.element;
  }

  if (typeof action?.timestamp === 'string' && action.timestamp) {
    normalized.timestamp = action.timestamp;
  }

  if (meta) {
    normalized.meta = meta as Record<string, unknown>;
  }

  return normalized;
};

const normalizeTrackingPayload = (payload: unknown): TrackingBatch => {
  if (Array.isArray(payload)) {
    return {
      version: 1,
      actions: payload.map(normalizeEventAction),
      total: payload.length,
    };
  }

  if (payload && typeof payload === 'object') {
    const candidate = payload as Record<string, unknown>;

    const rawActions = Array.isArray(candidate.actions) ? candidate.actions : undefined;
    if (rawActions) {
      return {
        version: Number(candidate.version ?? 1),
        actions: rawActions.map(normalizeEventAction),
        total: Number(candidate.total ?? rawActions.length),
      };
    }

    if (typeof candidate.action === 'string' || typeof candidate.name === 'string' || typeof candidate.event === 'string') {
      return {
        version: 1,
        actions: [normalizeEventAction(candidate)],
        total: 1,
      };
    }
  }

  throw new Error('Invalid tracking payload');
};

export const sendTrackingBatch = async (batch: TrackingBatch | unknown) => {
  const normalizedBatch = normalizeTrackingPayload(batch);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (TRACKING_API_KEY) {
    headers['X-API-Key'] = TRACKING_API_KEY;
  }

  const response = await axios.post(`${TRACKING_SERVICE_URL}/tracking/batch`, normalizedBatch, { headers });
  return response.data;
};
