import { Badge } from "@/components/ui/badge";

export function PageHeading({
  eyebrow,
  title,
  description,
  context,
}: {
  eyebrow: string;
  title: string;
  description: string;
  context: string;
}) {
  return (
    <header className="page-heading">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{eyebrow}</Badge>
        <span className="text-xs text-muted-foreground">{context}</span>
      </div>
      <div className="max-w-3xl">
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </header>
  );
}
