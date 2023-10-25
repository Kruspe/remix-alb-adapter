import * as fsp from "fs/promises";
import * as path from "path";
import { createRequestHandler as createRemixRequestHandler } from "@remix-run/node";
import type { ALBEvent } from "aws-lambda";

import {
  createRequestHandler,
  createRemixHeaders,
  createRemixRequest,
  sendRemixResponse,
} from "../server";
import * as lambdaTester from "lambda-tester";

// We don't want to test that the remix server works here (that's what the
// playwright tests do), we just want to test the architect adapter
jest.mock("@remix-run/node", () => {
  const original = jest.requireActual("@remix-run/node");
  return {
    ...original,
    createRequestHandler: jest.fn(),
  };
});
const mockedCreateRequestHandler =
  createRemixRequestHandler as jest.MockedFunction<
    typeof createRemixRequestHandler
  >;

function createMockEvent(event: Partial<ALBEvent> = {}) {
  return {
    headers: {
      host: "lambda-alb-123578498.us-east-1.elb.amazonaws.com",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      connection: "keep-alive",
      "upgrade-insecure-requests": "1",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15",
      "accept-language": "en-US,en;q=0.9",
      "accept-encoding": "gzip",
      "x-amzn-trace-id": "Root=1-5c536348-3d683b8b04734faae651f476",
      "x-forwarded-for": "72.12.164.125",
      "x-forwarded-port": "80",
      "x-forwarded-proto": "http",
      "x-imforwards": "20",
      ...event.headers,
    },
    isBase64Encoded: false,
    httpMethod: "GET",
    path: "/",
    queryStringParameters: {},
    requestContext: {
      elb: {
        targetGroupArn:
          "arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/lambda-279XGJDqGZ5rsrHC2Fjr/49e9d65c45c6791a",
      },
    },
    body: "",
    ...event,
  };
}

describe("architect createRequestHandler", () => {
  describe("basic requests", () => {
    afterEach(() => {
      mockedCreateRequestHandler.mockReset();
    });

    afterAll(() => {
      jest.restoreAllMocks();
    });

    it("handles requests", async () => {
      mockedCreateRequestHandler.mockImplementation(() => async (req) => {
        return new Response(`URL: ${new URL(req.url).pathname}`);
      });

      // We don't have a real app to test, but it doesn't matter. We won't ever
      // call through to the real createRequestHandler
      // @ts-expect-error
      await lambdaTester(createRequestHandler({ build: undefined }))
        .event(createMockEvent({ path: "/foo/bar" }))
        .expectResolve((res) => {
          expect(res.statusCode).toBe(200);
          expect(res.body).toBe("URL: /foo/bar");
        });
    });

    it("handles root // requests", async () => {
      mockedCreateRequestHandler.mockImplementation(() => async (req) => {
        return new Response(`URL: ${new URL(req.url).pathname}`);
      });

      // We don't have a real app to test, but it doesn't matter. We won't ever
      // call through to the real createRequestHandler
      // @ts-expect-error
      await lambdaTester(createRequestHandler({ build: undefined }))
        .event(createMockEvent({ path: "//" }))
        .expectResolve((res) => {
          expect(res.statusCode).toBe(200);
          expect(res.body).toBe("URL: //");
        });
    });

    it("handles nested // requests", async () => {
      mockedCreateRequestHandler.mockImplementation(() => async (req) => {
        return new Response(`URL: ${new URL(req.url).pathname}`);
      });

      // We don't have a real app to test, but it doesn't matter. We won't ever
      // call through to the real createRequestHandler
      // @ts-expect-error
      await lambdaTester(createRequestHandler({ build: undefined }))
        .event(createMockEvent({ path: "//foo//bar" }))
        .expectResolve((res) => {
          expect(res.statusCode).toBe(200);
          expect(res.body).toBe("URL: //foo//bar");
        });
    });

    it("handles null body", async () => {
      mockedCreateRequestHandler.mockImplementation(() => async () => {
        return new Response(null, { status: 200 });
      });

      // We don't have a real app to test, but it doesn't matter. We won't ever
      // call through to the real createRequestHandler
      // @ts-expect-error
      await lambdaTester(createRequestHandler({ build: undefined }))
        .event(createMockEvent({ path: "/foo/bar" }))
        .expectResolve((res) => {
          expect(res.statusCode).toBe(200);
        });
    });

    it("handles status codes", async () => {
      mockedCreateRequestHandler.mockImplementation(() => async () => {
        return new Response(null, { status: 204 });
      });

      // We don't have a real app to test, but it doesn't matter. We won't ever
      // call through to the real createRequestHandler
      // @ts-expect-error
      await lambdaTester(createRequestHandler({ build: undefined }))
        .event(createMockEvent({ path: "/foo/bar" }))
        .expectResolve((res) => {
          expect(res.statusCode).toBe(204);
        });
    });

    it("sets headers", async () => {
      mockedCreateRequestHandler.mockImplementation(() => async () => {
        const headers = new Headers();
        headers.append("X-Time-Of-Year", "most wonderful");
        headers.append(
          "Set-Cookie",
          "first=one; Expires=0; Path=/; HttpOnly; Secure; SameSite=Lax",
        );
        headers.append(
          "Set-Cookie",
          "second=two; MaxAge=1209600; Path=/; HttpOnly; Secure; SameSite=Lax",
        );
        headers.append(
          "Set-Cookie",
          "third=three; Expires=Wed, 21 Oct 2015 07:28:00 GMT; Path=/; HttpOnly; Secure; SameSite=Lax",
        );

        return new Response(null, { headers });
      });

      // We don't have a real app to test, but it doesn't matter. We won't ever
      // call through to the real createRequestHandler
      // @ts-expect-error
      await lambdaTester(createRequestHandler({ build: undefined }))
        .event(createMockEvent({ path: "/" }))
        .expectResolve((res) => {
          expect(res.statusCode).toBe(200);
          expect(res.headers?.["x-time-of-year"]).toBe("most wonderful");
          expect(res.headers?.["set-cookie"]).toEqual(
            "third=three; Expires=Wed, 21 Oct 2015 07:28:00 GMT; Path=/; HttpOnly; Secure; SameSite=Lax",
          );
        });
    });
  });
});

describe("architect createRemixHeaders", () => {
  describe("creates fetch headers from architect headers", () => {
    it("handles empty headers", () => {
      const headers = createRemixHeaders({});
      expect(Object.fromEntries(headers.entries())).toMatchInlineSnapshot(`{}`);
    });

    it("handles simple headers", () => {
      const headers = createRemixHeaders({ "x-foo": "bar" });
      expect(headers.get("x-foo")).toBe("bar");
    });

    it("handles multiple headers", () => {
      const headers = createRemixHeaders({ "x-foo": "bar", "x-bar": "baz" });
      expect(headers.get("x-foo")).toBe("bar");
      expect(headers.get("x-bar")).toBe("baz");
    });

    it("handles headers with multiple values", () => {
      const headers = createRemixHeaders({
        "x-foo": "bar, baz",
        "x-bar": "baz",
      });
      // @ts-ignore
      expect(headers.getAll("x-foo")).toEqual(["bar, baz"]);
      expect(headers.get("x-bar")).toBe("baz");
    });

    // it("handles multiple request cookies", () => {
    //   const headers = createRemixHeaders(
    //     {
    //       cookies: {},
    //     },
    //     ["__session=some_value", "__other=some_other_value"],
    //   );
    //   expect(headers.getAll("cookie")).toEqual([
    //     "__session=some_value; __other=some_other_value",
    //   ]);
    // });
  });
});

describe("architect createRemixRequest", () => {
  it("creates a request with the correct headers", () => {
    const remixRequest = createRemixRequest(
      createMockEvent({ headers: { cookie: "__session=value" } }),
    );

    expect(remixRequest.method).toBe("GET");
    expect(remixRequest.headers.get("cookie")).toBe("__session=value");
  });
});

describe("sendRemixResponse", () => {
  it("handles regular responses", async () => {
    const response = new Response("anything");
    const result = await sendRemixResponse(response);
    expect(result.body).toBe("anything");
  });

  it("handles resource routes with regular data", async () => {
    const json = JSON.stringify({ foo: "bar" });
    const response = new Response(json, {
      headers: {
        "Content-Type": "application/json",
        "content-length": json.length.toString(),
      },
    });

    const result = await sendRemixResponse(response);

    expect(result.body).toMatch(json);
  });

  it("handles resource routes with binary data", async () => {
    const image = await fsp.readFile(path.join(__dirname, "554828.jpeg"));

    const response = new Response(image, {
      headers: {
        "content-type": "image/jpeg",
        "content-length": image.length.toString(),
      },
    });

    const result = await sendRemixResponse(response);

    expect(result.body).toMatch(image.toString("base64"));
  });
});
