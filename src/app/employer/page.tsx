import { redirect } from "next/navigation";

/** The Employer portal's home is its benefit list (H01). */
export default function EmployerHomePage() {
  redirect("/employer/benefits");
}
