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
      ,
      parent_comment_id: {
        type: ['string', 'null'],
        description: 'Optionnel: identifiant du commentaire parent si c\u0027est une r\u00e9ponse'
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
        type: 'number', // Accept both integer and decimal numbers
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
