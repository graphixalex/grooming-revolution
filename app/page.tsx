import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { HomeLanding } from "@/components/landing/home-landing";
import { authOptions } from "@/lib/auth";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect("/dashboard");
  return <HomeLanding />;
}
