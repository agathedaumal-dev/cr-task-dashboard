import { redirect } from "next/navigation";

// This personal deployment's home is the To-Do view, not the template's demo
// tickets dashboard.
export default function HomePage() {
  redirect("/my-todo");
}
