// Archived October 14, 2026. Restore the previous implementation from Git history to resume calls.
// Reject every request before authentication, database writes, attempt reservations, or provider requests.
export default async function(_req: Request): Promise<Response> {
  return Response.json(
    { error: "VozCare demo is archived; calls are disabled" },
    { status: 503 },
  );
}
