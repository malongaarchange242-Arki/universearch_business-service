// src/modules/interactions/interactions.schema.ts

export const createCommentSchema = {
  body: {
    type: 'object',
    required: ['commentaire'],
    properties: {
      commentaire: {
        type: 'string',
        minLength: 1,
        maxLength: 1000,
        description: 'Texte du commentaire'
      }
    }
  }
};

export const getCommentsSchema = {
  querystring: {
    type: 'object',
    properties: {
      page: {
        type: 'integer',
        default: 1,
        minimum: 1
      },
      limit: {
        type: 'integer',
        default: 20,
        minimum: 1,
        maximum: 100
      }
    }
  }
};

export const recordViewSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    properties: {
      view_duration: {
        type: 'integer',
        minimum: 0,
        description: 'Durée de vue en secondes'
      }
    }
  }
};

export const getViewsSchema = {
  querystring: {
    type: 'object',
    properties: {
      page: {
        type: 'integer',
        default: 1,
        minimum: 1
      },
      limit: {
        type: 'integer',
        default: 20,
        minimum: 1,
        maximum: 100
      }
    }
  }
};
