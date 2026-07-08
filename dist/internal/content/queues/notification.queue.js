"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addNotificationJob = exports.notificationQueue = exports.NOTIFICATION_QUEUE = void 0;
const bullmq_1 = require("bullmq");
const videoProcessing_queue_1 = require("./videoProcessing.queue");
exports.NOTIFICATION_QUEUE = process.env.NOTIFICATION_QUEUE || 'notification-queue';
exports.notificationQueue = new bullmq_1.Queue(exports.NOTIFICATION_QUEUE, {
    connection: videoProcessing_queue_1.redisConnection,
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
});
const addNotificationJob = async (data) => {
    return exports.notificationQueue.add('notify-followers', data);
};
exports.addNotificationJob = addNotificationJob;
//# sourceMappingURL=notification.queue.js.map