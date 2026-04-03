import { NextResponse } from "next/server";

const SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL;
const RETRYABLE_STATUS_CODES = new Set([500, 502, 503, 504]);
const SCRIPT_TIMEOUT_MS = 12000;

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export async function POST(request) {
  let payload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid request payload.",
      },
      { status: 400 },
    );
  }

  if (!SCRIPT_URL) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Google Sheet sync is not configured yet. Add GOOGLE_APPS_SCRIPT_URL to continue.",
      },
      { status: 503 },
    );
  }

  try {
    let lastErrorMessage = "Unable to reach the Google Sheet sync service.";

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, SCRIPT_TIMEOUT_MS);

      try {
        const response = await fetch(SCRIPT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
          redirect: "follow",
          signal: abortController.signal,
          body: JSON.stringify(payload),
        });

        const text = await response.text();
        let data;

        try {
          data = JSON.parse(text);
        } catch {
          data = {
            ok: false,
            error: text || "Unexpected response from Google Sheet sync service.",
          };
        }

        if (response.ok && data.ok) {
          clearTimeout(timeoutId);
          return NextResponse.json(data, { status: 200 });
        }

        lastErrorMessage = data.error || "Google Sheet sync request failed.";
        clearTimeout(timeoutId);

        if (!RETRYABLE_STATUS_CODES.has(response.status) || attempt === 2) {
          return NextResponse.json(
            {
              ok: false,
              error: lastErrorMessage,
            },
            { status: response.ok ? 200 : 502 },
          );
        }
      } catch (error) {
        clearTimeout(timeoutId);
        lastErrorMessage =
          error instanceof Error && error.name === "AbortError"
            ? "The quiz service is taking too long to respond. Please try again."
            : error instanceof Error
              ? error.message
              : "Unable to reach the Google Sheet sync service.";

        if (attempt === 2) {
          return NextResponse.json(
            {
              ok: false,
              error:
                "Unable to connect to the quiz service right now. Please try again in a few seconds.",
            },
            { status: 502 },
          );
        }
      }

      await wait(500 * (attempt + 1));
    }

    return NextResponse.json(
      {
        ok: false,
        error: lastErrorMessage,
      },
      { status: 502 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to reach the Google Sheet sync service.",
      },
      { status: 502 },
    );
  }
}
