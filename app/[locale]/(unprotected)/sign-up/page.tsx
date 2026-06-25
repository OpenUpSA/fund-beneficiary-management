
import { redirect } from "next/navigation"

// Self sign-up is currently disabled. The SignUpForm component and the
// /sign-up/pending page are kept intact so this can be re-enabled by
// restoring the previous implementation (see git history).
export default function Page() {
  redirect("/sign-in")
}
