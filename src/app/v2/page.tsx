import { redirect } from "next/navigation";

export default function V2HomePage() {
  // Redirect to the main location screen
  redirect("/v2/location");
}