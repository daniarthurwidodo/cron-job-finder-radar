import { isAuthorized } from "@/lib/auth/cronAuth";
import { CRON_SECRET_ENV_NAME, HTTP_STATUS } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { runDailyScrape } from "@/lib/services/dailyScrape";

export async function GET(request: Request): Promise<Response> {
  const secret = process.env[CRON_SECRET_ENV_NAME];
  if (!secret) {
    logger.error("cron secret is not configured", { envName: CRON_SECRET_ENV_NAME });
    return Response.json({ error: "Server misconfigured" }, { status: HTTP_STATUS.INTERNAL_SERVER_ERROR });
  }
  if (!isAuthorized({ authorizationHeader: request.headers.get("authorization"), secret })) {
    return Response.json({ error: "Unauthorized" }, { status: HTTP_STATUS.UNAUTHORIZED });
  }
  try {
    return Response.json({ summaries: await runDailyScrape() }, { status: HTTP_STATUS.OK });
  } catch (error) {
    logger.error("daily scrape failed", { error: String(error) });
    return Response.json({ error: "Scrape failed" }, { status: HTTP_STATUS.INTERNAL_SERVER_ERROR });
  }
}
