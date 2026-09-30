import { getLayoutSideData } from "../actions/query";
import LayoutSideDataBridge from "./layout-side-data-bridge";

export default async function LayoutSideContent() {
  const data = await getLayoutSideData();

  return <LayoutSideDataBridge data={data} />;
}
