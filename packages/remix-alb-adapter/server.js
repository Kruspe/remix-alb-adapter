"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendRemixResponse = exports.createRemixHeaders = exports.createRemixRequest = exports.createRequestHandler = void 0;
const node_1 = require("@remix-run/node");
const binaryTypes_1 = require("./binaryTypes");
function createRequestHandler({ build, getLoadContext, mode = process.env.NODE_ENV, }) {
    const handleRequest = (0, node_1.createRequestHandler)(build, mode);
    return async (event) => {
        const request = createRemixRequest(event);
        const loadContext = await getLoadContext?.(event);
        const response = await handleRequest(request, loadContext);
        return sendRemixResponse(response);
    };
}
exports.createRequestHandler = createRequestHandler;
function createRemixRequest(event) {
    const host = event.headers?.["x-forwarded-host"] || event.headers?.host;
    // @ts-ignore
    const searchParameters = Object.entries(event.queryStringParameters).map(([key, value]) => `${key}=${value}`);
    const queryString = searchParameters.join("&");
    const search = queryString.length ? `?${queryString}` : "";
    const scheme = process.env.ARC_SANDBOX ? "http" : "https";
    const url = new URL(`${scheme}://${host}${event.path}${search}`);
    const isFormData = event.headers?.["content-type"]?.includes("multipart/form-data");
    // Note: No current way to abort these for Architect, but our router expects
    // requests to contain a signal, so it can detect aborted requests
    const controller = new AbortController();
    let body;
    if (event.body && event.body != "") {
        if (event.isBase64Encoded) {
            if (isFormData) {
                body = Buffer.from(event.body, "base64");
            }
            else {
                body = Buffer.from(event.body, "base64").toString();
            }
        }
        else {
            body = event.body;
        }
    }
    return new Request(url.href, {
        method: event.httpMethod,
        headers: createRemixHeaders(event.headers),
        signal: controller.signal,
        body,
    });
}
exports.createRemixRequest = createRemixRequest;
function createRemixHeaders(requestHeaders) {
    const headers = new Headers();
    if (!requestHeaders) {
        return headers;
    }
    for (const [header, value] of Object.entries(requestHeaders)) {
        if (value) {
            headers.append(header, value);
        }
    }
    if (requestHeaders["cookies"]) {
        headers.append("Cookie", requestHeaders["cookies"]);
    }
    return headers;
}
exports.createRemixHeaders = createRemixHeaders;
async function sendRemixResponse(nodeResponse) {
    const contentType = nodeResponse.headers.get("Content-Type");
    const isBase64Encoded = (0, binaryTypes_1.isBinaryType)(contentType);
    let body;
    if (nodeResponse.body) {
        if (isBase64Encoded) {
            body = await (0, node_1.readableStreamToString)(nodeResponse.body, "base64");
        }
        else {
            body = await nodeResponse.text();
        }
    }
    return {
        statusCode: nodeResponse.status,
        headers: Object.fromEntries(nodeResponse.headers.entries()),
        body,
        isBase64Encoded,
    };
}
exports.sendRemixResponse = sendRemixResponse;
