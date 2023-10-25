import type {
  ALBEvent,
  ALBEventHeaders,
  ALBHandler,
  ALBResult,
} from "aws-lambda";
import type { AppLoadContext, ServerBuild } from "@remix-run/node";
import {
  createRequestHandler as createRemixRequestHandler,
  readableStreamToString,
} from "@remix-run/node";
import { isBinaryType } from "./binaryTypes";

export type RequestHandler = ALBHandler;

export type GetLoadContextFunction = (
  event: ALBEvent,
) => Promise<AppLoadContext> | AppLoadContext;

export function createRequestHandler({
  build,
  getLoadContext,
  mode = process.env.NODE_ENV,
}: {
  build: ServerBuild;
  getLoadContext?: GetLoadContextFunction;
  mode?: string;
}): RequestHandler {
  const handleRequest = createRemixRequestHandler(build, mode);

  return async (event) => {
    const request = createRemixRequest(event);
    const loadContext = await getLoadContext?.(event);

    const response = await handleRequest(request, loadContext);

    return sendRemixResponse(response);
  };
}

export function createRemixRequest(event: ALBEvent): Request {
  const host = event.headers?.["x-forwarded-host"] || event.headers?.host;
  // @ts-ignore
  const searchParameters = Object.entries(event.queryStringParameters).map(
    ([key, value]) => `${key}=${value}`,
  );
  const queryString = searchParameters.join("&");
  const search = queryString.length ? `?${queryString}` : "";
  const scheme = process.env.ARC_SANDBOX ? "http" : "https";
  const url = new URL(`${scheme}://${host}${event.path}${search}`);
  const isFormData = event.headers?.["content-type"]?.includes(
    "multipart/form-data",
  );
  // Note: No current way to abort these for Architect, but our router expects
  // requests to contain a signal, so it can detect aborted requests
  const controller = new AbortController();
  let body;
  if (event.body && event.body != "") {
    if (event.isBase64Encoded) {
      if (isFormData) {
        body = Buffer.from(event.body, "base64");
      } else {
        body = Buffer.from(event.body, "base64").toString();
      }
    } else {
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

export function createRemixHeaders(requestHeaders?: ALBEventHeaders): Headers {
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

export async function sendRemixResponse(
  nodeResponse: Response,
): Promise<ALBResult> {
  const contentType = nodeResponse.headers.get("Content-Type");
  const isBase64Encoded = isBinaryType(contentType);
  let body: string | undefined;

  if (nodeResponse.body) {
    if (isBase64Encoded) {
      body = await readableStreamToString(nodeResponse.body, "base64");
    } else {
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
