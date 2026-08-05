import { createClient } from "@/lib/supabase/server";
import PacienteForm from "@/components/PacienteForm";
import { notFound } from "next/navigation";

interface EditarPacientePageProps {
    params: Promise<{ id: string }>;
}

export default async function EditarPacientePage({ params }: EditarPacientePageProps) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: paciente, error } = await supabase
        .from("pacientes")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !paciente) {
        notFound();
    }

    return <PacienteForm pacienteInicial={paciente} isEditing={true} />;
}
