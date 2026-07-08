import { Queue } from 'bullmq';
import { redisConnection } from './videoProcessing.queue';

export const NOTIFICATION_QUEUE = process.env.NOTIFICATION_QUEUE || 'notification-queue';

export interface NotificationJobData {
  postId: string;
  authorId: string;
  authorType: string;
}

export const notificationQueue = new Queue<NotificationJobData, void>(
  NOTIFICATION_QUEUE,
  {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: Number(process.env.NOTIFICATION_JOB_ATTEMPTS || 3),
      backoff: {
        type: 'exponential',
        delay: Number(process.env.NOTIFICATION_JOB_BACKOFF_MS || 10000),
      },
      removeOnComplete: {
        age: Number(process.env.NOTIFICATION_JOB_COMPLETE_TTL_SECONDS || 86400),
        count: Number(process.env.NOTIFICATION_JOB_COMPLETE_KEEP || 1000),
      },
      removeOnFail: {
        age: Number(process.env.NOTIFICATION_JOB_FAILED_TTL_SECONDS || 604800),
        count: Number(process.env.NOTIFICATION_JOB_FAILED_KEEP || 5000),
      },
    },
  }
);

export const addNotificationJob = async (data: NotificationJobData) => {
  return notificationQueue.add('notify-followers', data);
};
