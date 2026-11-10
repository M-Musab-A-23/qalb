import { forwardToMlService } from "@/lib/analysis/proxy";

/** Forwards the upload to the ML service at ML_API_URL (default http://localhost:8000). */
export async function POST(request: Request): Promise<Response> {
  return forwardToMlService(request, { baseUrl: process.env.ML_API_URL });
}
