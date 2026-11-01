import { ReaderWorkspace } from "@/components/reader/reader-workspace";
import { providerMode } from "@/lib/assistance/provider";
export const dynamic = "force-dynamic";
export default async function Home() {
  return <ReaderWorkspace providerMode={providerMode()} />;
}
