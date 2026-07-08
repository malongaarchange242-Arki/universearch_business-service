export declare const createPostSchema: {
    body: {
        type: string;
        required: string[];
        properties: {
            titre: {
                type: string;
                minLength: number;
                maxLength: number;
            };
            description: {
                type: string[];
                minLength: number;
                maxLength: number;
                description: string;
            };
            media_url: {
                type: string[];
                description: string;
            };
            thumbnail_url: {
                type: string[];
                description: string;
            };
            media_type: {
                type: string[];
                enum: string[];
                description: string;
            };
            category: {
                type: string[];
                description: string;
            };
            hashtags: {
                type: string[];
                items: {
                    type: string;
                };
                description: string;
            };
            media_processing_status: {
                type: string[];
                enum: string[];
            };
            media_processing_error: {
                type: string[];
            };
        };
    };
    response: {
        201: {
            type: string;
            properties: {
                success: {
                    type: string;
                };
                data: {
                    type: string;
                    properties: {
                        id: {
                            type: string;
                        };
                        author_id: {
                            type: string;
                        };
                        author_type: {
                            type: string;
                        };
                        titre: {
                            type: string;
                        };
                        description: {
                            type: string[];
                        };
                        contenu: {
                            type: string;
                        };
                        media_url: {
                            type: string[];
                        };
                        thumbnail_url: {
                            type: string[];
                        };
                        media_type: {
                            type: string[];
                        };
                        category: {
                            type: string[];
                        };
                        media_processing_status: {
                            type: string[];
                        };
                        media_processing_error: {
                            type: string[];
                        };
                        statut: {
                            type: string;
                        };
                        date_creation: {
                            type: string;
                        };
                    };
                };
            };
        };
    };
};
export declare const updatePostSchema: {
    body: {
        type: string;
        properties: {
            description: {
                type: string;
                minLength: number;
                maxLength: number;
            };
            media_url: {
                type: string;
                format: string;
            };
            thumbnail_url: {
                type: string;
                format: string;
            };
            media_type: {
                type: string;
                enum: string[];
            };
            hashtags: {
                type: string;
            };
            media_processing_status: {
                type: string;
                enum: string[];
            };
            media_processing_error: {
                type: string;
            };
        };
    };
};
export declare const createCommentSchema: {
    body: {
        type: string;
        required: string[];
        properties: {
            contenu: {
                type: string;
                minLength: number;
                maxLength: number;
            };
            parent_comment_id: {
                type: string[];
                description: string;
            };
        };
    };
};
//# sourceMappingURL=posts.schema.d.ts.map