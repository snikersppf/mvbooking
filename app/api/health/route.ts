export function GET(): Response {
  return Response.json(
    { status: "ok" },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export const runtime = "nodejs";
