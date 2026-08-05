import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { success: false, error: "Variables de entorno Supabase no configuradas" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Consulta ultraligera para activar la base de datos de Supabase
    const { count, error } = await supabase
      .from("pacientes")
      .select("*", { count: "exact", head: true });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Base de datos de SST MedSys activa y respondiendo.",
      timestamp: new Date().toISOString(),
      pacientes_registrados: count || 0,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Error inesperado" },
      { status: 500 }
    );
  }
}
