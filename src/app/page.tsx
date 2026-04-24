import { RoadsExplorer } from "@/components/roads-explorer";
import { getRoads } from "@/lib/roads/get-roads";

export default async function Home() {
  const roads = await getRoads();
  return <RoadsExplorer roads={roads} />;
}
