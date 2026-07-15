export declare const createCommentSchema: {
    body: {
        type: string;
        required: string[];
        properties: {
            commentaire: {
                type: string;
                minLength: number;
                maxLength: number;
                description: string;
            };
            parent_comment_id: {
                type: string[];
                description: string;
            };
        };
    };
};
export declare const getCommentsSchema: {
    querystring: {
        type: string;
        properties: {
            page: {
                type: string;
                default: number;
                minimum: number;
            };
            limit: {
                type: string;
                default: number;
                minimum: number;
                maximum: number;
            };
        };
    };
};
export declare const recordViewSchema: {
    body: {
        type: string;
        additionalProperties: boolean;
        properties: {
            view_duration: {
                type: string;
                minimum: number;
                description: string;
            };
        };
    };
};
export declare const getViewsSchema: {
    querystring: {
        type: string;
        properties: {
            page: {
                type: string;
                default: number;
                minimum: number;
            };
            limit: {
                type: string;
                default: number;
                minimum: number;
                maximum: number;
            };
        };
    };
};
//# sourceMappingURL=interactions.schema.d.ts.map