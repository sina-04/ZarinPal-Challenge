import Link from "next/link";
import { SearchXIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

export default function NotFound() {
  return (
    <div className="page-stack">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><SearchXIcon aria-hidden="true" /></EmptyMedia>
          <EmptyTitle>این بخش پیدا نشد</EmptyTitle>
          <EmptyDescription>از مرکز اقدام به یکی از چهار مقصد اصلی برگردید.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild><Link href="/">بازگشت به مرکز اقدام</Link></Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
