import axios from 'axios';
import { TrackingBatch } from '../types';

const TRACKING_SERVICE_URL = process.env.TRACKING_SERVICE_URL || 'http://localhost:8080';
const TRACKING_API_KEY = process.env.TRACKING_API_KEY || process.env.INTERNAL_API_KEY || '';

export const sendTrackingBatch = async (batch: TrackingBatch) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (TRACKING_API_KEY) {
    headers['X-API-Key'] = TRACKING_API_KEY;
  }

  const response = await axios.post(`${TRACKING_SERVICE_URL}/tracking/batch`, batch, { headers });
  return response.data;
};
