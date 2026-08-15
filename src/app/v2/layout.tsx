import { V2AppLayout } from "@/layouts/v2-app-layout";

export default function V2Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <V2AppLayout>
      {children}
    </V2AppLayout>
  );
}