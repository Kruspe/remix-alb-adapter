"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRequestHandler = void 0;
const node_1 = require("@remix-run/node");
(0, node_1.installGlobals)();
var server_1 = require("./server");
Object.defineProperty(exports, "createRequestHandler", { enumerable: true, get: function () { return server_1.createRequestHandler; } });
