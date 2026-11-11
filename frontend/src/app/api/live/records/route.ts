import { connection } from "next/server";
import { forwardRecordList } from "@/lib/live/proxy";

/** Lists the demo records the ML service can replay. */
export async function GET(): Promise<Response> {
  // Always answered at request time, never prerendered.
  await connection();
  return forwardRecordList({ baseUrl: process.env.ML_API_URL });
}
