import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SidebarNav } from "@/components/SidebarNav";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        redirect("/login");
    }

    return (
        <div className="flex h-screen" style={{ background: 'var(--surface-bg)' }}>
            {/* Sidebar — Client Component for interactivity */}
            <SidebarNav userEmail={user.email || ""} />

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Content */}
                <div className="flex-1 overflow-auto p-4 md:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}