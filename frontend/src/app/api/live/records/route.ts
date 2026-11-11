import { forwardRecordList } from "@/lib/live/proxy";

export const dynamic = "force-dynamic";

/** Lists the demo records the ML service can replay. */
export async function GET(): Promise<Response> {
  return forwardRecordList({ baseUrl: process.env.ML_API_URL });
}
