import { Queue } from 'bullmq';
export declare const NOTIFICATION_QUEUE: string;
export interface NotificationJobData {
    postId: string;
    authorId: string;
    authorType: string;
}
export declare const notificationQueue: Queue<NotificationJobData, void, string, NotificationJobData, void, string>;
export declare const addNotificationJob: (data: NotificationJobData) => Promise<import("bullmq").Job<NotificationJobData, void, string>>;
//# sourceMappingURL=notification.queue.d.ts.map