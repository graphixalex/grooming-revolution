export class MetaError extends Error {
  constructor(public readonly code: string, public readonly status = 400) { super(code); }
}
export function metaErrorResponse(error: unknown) {
  const known = error instanceof MetaError;
  return Response.json(
    { error: known ? error.code : "meta_operation_failed" },
    { status: known ? error.status : 503, headers: { "Cache-Control": "no-store" } },
  );
}
