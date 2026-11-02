import { redirect } from "next/navigation";
import { getAdminId } from "@/lib/auth";
import { AdminLogin } from "@/components/admin-login";
export default async function LoginPage() { if(await getAdminId()) redirect("/admin"); return <main className="page-shell"><div className="eyebrow">SV GROUPS · ADMINISTRATION</div><h1 className="page-title">Welcome <em>back.</em></h1><p className="page-lede">Sign in to manage the catalogue and customer enquiries.</p><AdminLogin/></main>; }
