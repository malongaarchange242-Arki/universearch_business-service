"use strict";
// src/middleware/index.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeOrg = exports.authenticate = void 0;
var authenticate_1 = require("./authenticate");
Object.defineProperty(exports, "authenticate", { enumerable: true, get: function () { return authenticate_1.authenticate; } });
var authorizeOrg_1 = require("./authorizeOrg");
Object.defineProperty(exports, "authorizeOrg", { enumerable: true, get: function () { return authorizeOrg_1.authorizeOrg; } });
//# sourceMappingURL=index.js.map