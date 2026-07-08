export declare const createActivitySchema: {
    body: {
        type: string;
        required: string[];
        properties: {
            title: {
                type: string;
                minLength: number;
            };
            description: {
                type: string;
            };
            status: {
                type: string;
                enum: string[];
            };
            is_public: {
                type: string;
            };
            organization_id: {
                type: string;
            };
            organization_type: {
                type: string;
                enum: string[];
            };
        };
        additionalProperties: boolean;
    };
};
export declare const getActivitySchema: {
    params: {
        type: string;
        required: string[];
        properties: {
            id: {
                type: string;
            };
        };
        additionalProperties: boolean;
    };
};
export declare const updateActivitySchema: {
    params: {
        type: string;
        required: string[];
        properties: {
            id: {
                type: string;
            };
        };
        additionalProperties: boolean;
    };
    body: {
        type: string;
        properties: {
            title: {
                type: string;
                minLength: number;
            };
            description: {
                type: string;
            };
            status: {
                type: string;
                enum: string[];
            };
            is_public: {
                type: string;
            };
            organization_id: {
                type: string;
            };
            organization_type: {
                type: string;
                enum: string[];
            };
        };
        additionalProperties: boolean;
    };
};
//# sourceMappingURL=activities.schema.d.ts.map