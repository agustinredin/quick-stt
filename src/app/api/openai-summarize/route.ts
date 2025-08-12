import { NextRequest } from "next/server";
import { handleSummarizeRequest } from "@/interfaces/http/handleSummarizeRequest";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return handleSummarizeRequest(req);
}
