import { z } from 'zod';
export declare const createFeedbackSchema: z.ZodObject<{
    type: z.ZodEnum<{
        bug: "bug";
        suggestion: "suggestion";
        review: "review";
    }>;
    rating: z.ZodNumber;
    message: z.ZodString;
    page: z.ZodEnum<{
        universite: "universite";
        feed: "feed";
        quiz: "quiz";
        messages: "messages";
    }>;
    metadata: z.ZodOptional<z.ZodObject<{}, z.core.$catchall<z.ZodUnknown>>>;
}, z.core.$strip>;
export declare const getFeedbacksQuerySchema: z.ZodObject<{
    limit: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    offset: z.ZodDefault<z.ZodOptional<z.ZodCoercedNumber<unknown>>>;
    type: z.ZodOptional<z.ZodEnum<{
        bug: "bug";
        suggestion: "suggestion";
        review: "review";
    }>>;
    status: z.ZodOptional<z.ZodEnum<{
        pending: "pending";
        reviewed: "reviewed";
        resolved: "resolved";
    }>>;
    page: z.ZodOptional<z.ZodEnum<{
        universite: "universite";
        feed: "feed";
        quiz: "quiz";
        messages: "messages";
    }>>;
}, z.core.$strip>;
export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;
export type GetFeedbacksQuery = z.infer<typeof getFeedbacksQuerySchema>;
//# sourceMappingURL=feedbacks.d.ts.map