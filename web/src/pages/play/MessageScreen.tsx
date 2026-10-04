import { TopBar } from "../../components/TopBar";
import { Frame, Label } from "../../components/ui";

/** A centred one-line message (loading, restoring…). */
export function MessageScreen({ message, right }: { message: string; right?: string }) {
  return (
    <Frame>
      <TopBar right={right} />
      <main className="grid place-content-center">
        <Label>{message}</Label>
      </main>
    </Frame>
  );
}
