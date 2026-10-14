import { redirect } from "next/navigation";

/** The Client portal's home is its benefit list. */
export default function ClientHomePage() {
  redirect("/client/benefits");
}
