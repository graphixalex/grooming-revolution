import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function AccountingScopeSwitcher({
  basePath,
  selectedScope,
  options,
  extraQuery,
}: {
  basePath: string;
  selectedScope: string;
  options: Array<{ value: string; label: string }>;
  extraQuery?: Record<string, string | undefined>;
}) {
  if (options.length <= 1) return null;

  return (
    <Card className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-zinc-500">Vista contabile</span>
      {options.map((o) => (
        <Link
          key={o.value}
          href={`${basePath}?${new URLSearchParams({
            ...(extraQuery
              ? Object.fromEntries(Object.entries(extraQuery).filter(([, value]) => Boolean(value)) as Array<[string, string]>)
              : {}),
            scope: o.value,
          }).toString()}`}
        >
          <Button variant={selectedScope === o.value ? "default" : "outline"}>{o.label}</Button>
        </Link>
      ))}
    </Card>
  );
}
