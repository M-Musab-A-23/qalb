import { forwardLiveStream } from "@/lib/live/proxy";

/** Streams a replay (Server-Sent Events) from the ML service at ML_API_URL. */
export async function GET(
  request: Request,
  context: { params: Promise<{ record: string }> },
): Promise<Response> {
  const { record } = await context.params;
  return forwardLiveStream(request, record, { baseUrl: process.env.ML_API_URL });
}
