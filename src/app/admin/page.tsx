import { redirect } from "next/navigation";
import { getAdminId } from "@/lib/auth";
import { AdminDashboard } from "@/components/admin-dashboard";
export default async function AdminPage() { if(!(await getAdminId())) redirect("/admin/login"); return <AdminDashboard/>; }
