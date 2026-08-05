import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
    page: { padding: 25, fontSize: 7.5, fontFamily: 'Helvetica' },
    // Header
    headerContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'flex-start' },
    headerLeft: { width: '70%' },
    headerRight: { width: 65, height: 80, border: '1pt solid #cbd5e1', borderRadius: 4, overflow: 'hidden', backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 11, fontWeight: 'bold', marginBottom: 1 },
    subtitle: { fontSize: 8, color: '#475569', marginBottom: 1 },
    dateText: { fontSize: 7, marginTop: 4 },
    // Sections
    section: { marginBottom: 4, border: '1pt solid #cbd5e1', borderRadius: 3, overflow: 'hidden' },
    sectionTitle: { backgroundColor: '#f1f5f9', padding: '3 6', fontWeight: 'bold', borderBottom: '1pt solid #cbd5e1', fontSize: 8, color: '#1e293b' },
    row: { flexDirection: 'row', borderBottom: '0.5pt solid #e2e8f0', minHeight: 14 },
    rowLast: { flexDirection: 'row', minHeight: 14 },
    colLabel: { width: '35%', padding: '3 6', backgroundColor: '#f8fafc', borderRight: '0.5pt solid #e2e8f0', fontWeight: 'bold', fontSize: 7 },
    colValue: { width: '65%', padding: '3 6', fontSize: 7 },
    colLabelWide: { width: '25%', padding: '3 6', backgroundColor: '#f8fafc', borderRight: '0.5pt solid #e2e8f0', fontWeight: 'bold', fontSize: 7 },
    colValueWide: { width: '75%', padding: '3 6', fontSize: 7 },
    // Grid
    grid: { flexDirection: 'row', flexWrap: 'wrap', padding: '3 6' },
    gridItem: { width: '33%', marginBottom: 2, fontSize: 7 },
    // Signatures
    signatures: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    signatureBox: { width: '45%', alignItems: 'center', position: 'relative' },
    signatureLine: { width: '100%', borderBottom: '1pt solid black', marginBottom: 2 },
    imgDoctorSig: { width: 100, height: 45, objectFit: 'contain' },
    imgDoctorSeal: { width: 80, height: 35, objectFit: 'contain', position: 'absolute', left: -10, top: 5 },
    imgPatientSig: { width: 120, height: 45, objectFit: 'contain', marginBottom: 2 },
    // Legal
    legalBox: { border: '1pt solid #cbd5e1', borderRadius: 3, padding: 6, marginTop: 6 },
    legalTitle: { fontSize: 8, fontWeight: 'bold', marginBottom: 3, textAlign: 'center' },
    legalText: { fontSize: 6, textAlign: 'justify', color: '#64748b', lineHeight: 1.3 },
    // Page num
    pageNum: { position: 'absolute', top: 10, right: 25, fontSize: 6, color: '#94a3b8' },
    patientPhoto: { width: '100%', height: '100%', objectFit: 'cover' },
});

const calcularEdad = (fn: string) => {
    if (!fn) return "N/A";
    const h = new Date(); const n = new Date(fn);
    let e = h.getFullYear() - n.getFullYear();
    if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) e--;
    return `${e}`;
};

const safe = (v: any, def = "N/A") => {
    if (v === null || v === undefined || v === "") return def;
    return typeof v === 'string' ? v.toUpperCase() : String(v);
};

export const CertificadoCMALAB = ({ datos }: { datos: any }) => (
    <Document>
        {/* PAGE 1: Datos del usuario + Valoración Médica */}
        <Page size="LETTER" style={styles.page}>
            <Text style={styles.pageNum}>Página 1</Text>

            {/* HEADER */}
            <View style={styles.headerContainer}>
                <View style={styles.headerLeft}>
                    <Text style={styles.title}>SEGURIDAD Y SALUD EN EL TRABAJO</Text>
                    <Text style={styles.title}>CONCEPTO MÉDICO DE APTITUD LABORAL</Text>
                    <Text style={[styles.dateText, { fontWeight: 'bold' }]}>CIUDAD Y FECHA DE REALIZACIÓN:</Text>
                    <Text style={styles.dateText}>
                        {safe(datos.lugar_realizacion || "PASTO (NARIÑO)")}, {new Date(datos.fecha_actual).toLocaleDateString('es-CO')} — {datos.hora_realizacion || new Date(datos.fecha_actual).toLocaleTimeString('es-CO')}
                    </Text>
                </View>
                <View style={styles.headerRight}>
                    {datos.paciente?.foto_url ? (
                        <Image style={styles.patientPhoto} src={datos.paciente.foto_url} />
                    ) : (
                        <Text style={{ fontSize: 7, color: '#94a3b8' }}>SIN FOTO</Text>
                    )}
                </View>
            </View>

            {/* DATOS DE EMPRESA */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>DATOS DE EMPRESA</Text>
                <View style={styles.row}>
                    <Text style={styles.colLabel}>EMPRESA CONTRATANTE</Text>
                    <Text style={styles.colValue}>{safe(datos.laboral?.empresa_nombre, "PARTICULAR")}</Text>
                </View>
                <View style={styles.rowLast}>
                    <Text style={styles.colLabel}>EMPRESA EN MISIÓN</Text>
                    <Text style={styles.colValue}>{safe(datos.paciente.empresa_en_mision, "NO APLICA")}</Text>
                </View>
            </View>

            {/* INFORMACIÓN DEL USUARIO */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>INFORMACIÓN DEL USUARIO</Text>
                <View style={styles.row}>
                    <Text style={styles.colLabel}>NOMBRES Y APELLIDOS</Text>
                    <Text style={styles.colValue}>{safe(datos.paciente.nombre_completo)}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.colLabel}>N° IDENTIFICACIÓN</Text>
                    <Text style={styles.colValue}>{safe(datos.paciente.tipo_documento || "CC")} - {safe(datos.paciente.documento_identidad)}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.colLabel}>SEXO / EDAD / F. NACIMIENTO</Text>
                    <Text style={styles.colValue}>{safe(datos.paciente.genero)} / {calcularEdad(datos.paciente.fecha_nacimiento)} AÑOS / {datos.paciente.fecha_nacimiento}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.colLabel}>LUGAR NACIMIENTO / RESIDENCIA</Text>
                    <Text style={styles.colValue}>{safe(datos.paciente.lugar_nacimiento)} / {safe(datos.paciente.lugar_residencia || datos.paciente.lugar_nacimiento)}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.colLabel}>DIRECCIÓN / TELÉFONO / CELULAR</Text>
                    <Text style={styles.colValue}>{safe(datos.paciente.direccion)} / {safe(datos.paciente.telefono_fijo)} / {safe(datos.paciente.movil)}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.colLabel}>CORREO ELECTRÓNICO</Text>
                    <Text style={styles.colValue}>{safe(datos.paciente.correo_electronico)}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.colLabel}>ESTADO CIVIL / ESCOLARIDAD</Text>
                    <Text style={styles.colValue}>{safe(datos.paciente.estado_civil)} / {safe(datos.paciente.escolaridad)}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.colLabel}>HEMOCLASIFICACIÓN / HIJOS / IMC</Text>
                    <Text style={styles.colValue}>{safe(datos.paciente.grupo_sanguineo)} / {safe(datos.paciente.hijos)} / {safe(datos.paciente.imc)}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.colLabel}>EPS / ARL</Text>
                    <Text style={styles.colValue}>{safe(datos.paciente.eps)} / {safe(datos.paciente.arl)}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.colLabel}>RÉGIMEN / FONDO PENSIÓN</Text>
                    <Text style={styles.colValue}>{safe(datos.paciente.regimen)} / {safe(datos.paciente.fondo_pension)}</Text>
                </View>
                <View style={styles.rowLast}>
                    <Text style={styles.colLabel}>ESTRATO / ZONA / GRUPO ÉTNICO</Text>
                    <Text style={styles.colValue}>{safe(datos.paciente.estrato)} / {safe(datos.paciente.zona)} / {safe(datos.paciente.grupo_etnico)} / DISCAPACIDAD: {datos.paciente.discapacitado ? "SÍ" : "NO"}</Text>
                </View>
            </View>

            {/* INFORMACIÓN DE LA ORDEN MÉDICA */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>INFORMACIÓN DE LA ORDEN MÉDICA</Text>
                <View style={styles.row}>
                    <Text style={styles.colLabel}>CARGO</Text>
                    <Text style={styles.colValue}>{safe(datos.laboral?.cargo)}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.colLabel}>FECHA / HORA DE INGRESO</Text>
                    <Text style={styles.colValue}>{safe(datos.laboral?.fecha_ingreso)} / {safe(datos.laboral?.hora_ingreso)}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.colLabel}>LUGAR DE REALIZACIÓN</Text>
                    <Text style={styles.colValue}>{safe(datos.lugar_realizacion)}</Text>
                </View>
                <View style={styles.rowLast}>
                    <Text style={styles.colLabel}>ENTIDAD / DIRECCIÓN</Text>
                    <Text style={styles.colValue}>{safe(datos.laboral?.entidad_realizadora)} / {safe(datos.laboral?.entidad_direccion)}</Text>
                </View>
            </View>

            {/* VALORACIÓN MÉDICA */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>VALORACIÓN MÉDICA</Text>
                <View style={styles.row}>
                    <Text style={styles.colLabel}>TIPO DE EXAMEN / EXAMEN</Text>
                    <Text style={styles.colValue}>{safe(datos.tipo_evaluacion)} / {safe(datos.examen_nombre)}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.colLabel}>ÉNFASIS</Text>
                    <Text style={styles.colValue}>{safe(datos.enfasis)}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.colLabel}>CONCEPTO</Text>
                    <Text style={{ ...styles.colValue, fontWeight: 'bold' }}>{safe(datos.concepto)}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.colLabel}>APTITUDES Y/O TAREAS</Text>
                    <Text style={styles.colValue}>{safe(datos.aptitudes_tareas)}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.colLabel}>INGRESO AL PVE PREVENTIVO</Text>
                    <Text style={styles.colValue}>{safe(datos.ingreso_pve_preventivo)}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.colLabel}>PROGRAMA PROMOCIÓN Y PREVENCIÓN</Text>
                    <Text style={styles.colValue}>{safe(datos.programa_promocion_prevencion)}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.colLabel}>RECOMENDACIONES Y/O RESTRICCIONES</Text>
                    <Text style={styles.colValue}>{safe(datos.recomendaciones, "NINGUNO")}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.colLabel}>CLASIFICACIÓN GATISO</Text>
                    <Text style={styles.colValue}>{safe(datos.clasificacion_gatiso)} — TIPO: {safe(datos.clasificacion_gatiso_tipo)} — GRUPO: {safe(datos.clasificacion_gatiso_grupo)}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.colLabel}>REMISIÓN Y CONTROLES EPS</Text>
                    <Text style={styles.colValue}>{safe(datos.remision_controles_eps)}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.colLabel}>¿EN CONTROLES CON ARL?</Text>
                    <Text style={styles.colValue}>{datos.controles_arl ? "SÍ" : "NO"}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.colLabelWide}>OBSERVACIONES MÉDICAS</Text>
                    <Text style={styles.colValueWide}>{safe(datos.observaciones_medicas)}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.colLabel}>RECOMENDACIONES LABORALES</Text>
                    <Text style={styles.colValue}>{safe(datos.recomendaciones_laborales)}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.colLabel}>RESTRICCIONES LABORALES</Text>
                    <Text style={styles.colValue}>{safe(datos.restricciones_laborales)}</Text>
                </View>
                <View style={styles.rowLast}>
                    <Text style={styles.colLabel}>OTROS EXÁMENES REALIZADOS</Text>
                    <Text style={styles.colValue}>{safe(datos.otros_examenes_realizados)}</Text>
                </View>
            </View>

            {/* RIESGOS */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>EXPOSICIÓN A FACTORES DE RIESGO</Text>
                <View style={styles.grid}>
                    <Text style={styles.gridItem}>FÍSICO: {datos.riesgos?.fisico ? 'X' : 'N/A'}</Text>
                    <Text style={styles.gridItem}>MECÁNICO: {datos.riesgos?.mecanico ? 'X' : 'N/A'}</Text>
                    <Text style={styles.gridItem}>QUÍMICO: {datos.riesgos?.quimico ? 'X' : 'N/A'}</Text>
                    <Text style={styles.gridItem}>BIOLÓGICO: {datos.riesgos?.biologico ? 'X' : 'N/A'}</Text>
                    <Text style={styles.gridItem}>ERGONÓMICO: {datos.riesgos?.ergonomico ? 'X' : 'N/A'}</Text>
                    <Text style={styles.gridItem}>PSICOSOCIAL: {datos.riesgos?.psicosocial ? 'X' : 'N/A'}</Text>
                </View>
            </View>

            {/* ANTECEDENTES LABORALES */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>ANTECEDENTES LABORALES DECLARADOS</Text>
                <View style={styles.row}>
                    <Text style={styles.colLabel}>INCIDENTES / ACCIDENTES</Text>
                    <Text style={styles.colValue}>{safe(datos.antecedentes_laborales?.incidentes)}</Text>
                </View>
                <View style={styles.rowLast}>
                    <Text style={styles.colLabel}>ENF. PROFESIONAL / SECUELAS</Text>
                    <Text style={styles.colValue}>{safe(datos.antecedentes_laborales?.enfermedad_profesional)} / {safe(datos.antecedentes_laborales?.secuelas)}</Text>
                </View>
            </View>

            {/* SIGNATURES */}
            <View style={[styles.signatures, { marginTop: 15 }]} wrap={false}>
                <View style={styles.signatureBox}>
                    <View style={{ position: 'relative', height: 50, justifyContent: 'flex-end', alignItems: 'center' }}>
                        <Image style={styles.imgDoctorSeal} src="/sellodra.png" />
                        <Image style={styles.imgDoctorSig} src="/firmadra.png" />
                    </View>
                    <View style={styles.signatureLine} />
                    <Text style={{ fontWeight: 'bold', fontSize: 8 }}>DRA. VIVIANA QUIROZ R.</Text>
                    <Text style={{ fontSize: 6 }}>MÉDICO GENERAL - ESP. SALUD OCUPACIONAL</Text>
                    <Text style={{ fontSize: 6 }}>REG. MED: 1085275155 - L-SST: 1586</Text>
                </View>

                <View style={styles.signatureBox}>
                    {datos.firma_paciente_url ? (
                        <Image style={styles.imgPatientSig} src={datos.firma_paciente_url} />
                    ) : (
                        <View style={{ height: 50, marginBottom: 5 }} />
                    )}
                    <View style={styles.signatureLine} />
                    <Text style={{ fontWeight: 'bold', fontSize: 8 }}>
                        {safe(datos.firma_paciente_nombre || "FIRMA DEL TRABAJADOR")}
                    </Text>
                    <Text style={{ fontSize: 6 }}>
                        C.C: {safe(datos.firma_paciente_cedula || datos.paciente.documento_identidad)}
                    </Text>
                </View>
            </View>
        </Page>

        {/* PAGE 2: Osteomuscular + Complementarios + Legal */}
        <Page size="LETTER" style={styles.page}>
            <Text style={styles.pageNum}>Página 2</Text>

            <Text style={[styles.title, { marginBottom: 8 }]}>CONCEPTO MÉDICO DE APTITUD LABORAL — CONTINUACIÓN</Text>

            {/* VALORACIÓN OSTEOMUSCULAR */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>VALORACIÓN OSTEOMUSCULAR</Text>
                <View style={{ padding: '4 6' }}>
                    <Text style={{ fontSize: 7 }}>{safe(datos.valoracion_osteomuscular, "NO APLICA")}</Text>
                </View>
            </View>

            {/* EXÁMENES COMPLEMENTARIOS */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>INFORMACIÓN DE LOS EXÁMENES COMPLEMENTARIOS</Text>
                <View style={{ padding: '4 6' }}>
                    <Text style={{ fontSize: 7 }}>{safe(datos.examenes_complementarios, "NO APLICA")}</Text>
                </View>
            </View>

            {/* DIAGNÓSTICOS CIE-10 */}
            {datos.diagnosticos_cie10 && datos.diagnosticos_cie10.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>DIAGNÓSTICOS CIE-10</Text>
                    <View style={{ padding: '4 6' }}>
                        {datos.diagnosticos_cie10.map((d: any, i: number) => (
                            <Text key={i} style={{ fontSize: 7, marginBottom: 1 }}>
                                • {d.codigo} — {(d.nombre || "").toUpperCase()}
                            </Text>
                        ))}
                    </View>
                </View>
            )}

            {/* CONSIDERACIONES LEGALES */}
            <View style={styles.legalBox}>
                <Text style={styles.legalTitle}>CONSIDERACIONES LEGALES</Text>
                <Text style={styles.legalText}>
                    El presente documento consigna la información suministrada por mí, certifica que es veraz y autorizo a la IPS a entregar el certificado médico ocupacional resultante de esta valoración ocupacional donde se registran las recomendaciones, restricciones y/u observaciones médicas dando cumplimiento al decreto 1072 del 2015 y las normas que las modifiquen, adicionen o sustituyan información que es necesaria para el programa de medicina preventiva de la compañía.
                </Text>
                <Text style={[styles.legalText, { marginTop: 4 }]}>
                    La IPS da cumplimiento a las resoluciones 2346 del 11 de julio de 2007 y 1918 del 5 de junio de 2009, la resolución 839 del 23 de marzo del 2017 y Decreto 1072/2015 — Artículo 2.2.4.6.13 numerales 1 y 2 del ministerio de trabajo y salud y protección social profesional, la guarda y custodia y solo se obtendrá dicha información bajo los requerimientos legales establecidos por la ley o cuando el trabajador lo demande, la empresa solo obtendrá los certificados médicos emitidos.
                </Text>
                <Text style={[styles.legalText, { marginTop: 4 }]}>
                    La IPS da cumplimiento a la Resolución 2346 del 11 de julio 2007 Parágrafo del Artículo 10 y la ley estatutaria 1581 de 2012, especialmente lo dispuesto en sus artículos 9 y 12, a su Decreto reglamentario 1377 de 2013 y las demás normas pertinentes como responsable del tratamiento de datos personales.
                </Text>
            </View>

            {/* Consentimiento */}
            <Text style={[styles.legalText, { marginTop: 6 }]}>
                Consentimiento informado: Autorizo de forma voluntaria a realizar mi examen médico ocupacional. Fui informado de las medidas para proteger la confidencialidad de mis resultados. Las respuestas dadas por mí son verídicas. Autorizo suministrar a las personas contempladas en la legislación vigente la información de este documento.
            </Text>

            {/* Second page signatures */}
            <View style={[styles.signatures, { marginTop: 20 }]} wrap={false}>
                <View style={styles.signatureBox}>
                    <View style={{ position: 'relative', height: 50, justifyContent: 'flex-end', alignItems: 'center' }}>
                        <Image style={styles.imgDoctorSeal} src="/sellodra.png" />
                        <Image style={styles.imgDoctorSig} src="/firmadra.png" />
                    </View>
                    <View style={styles.signatureLine} />
                    <Text style={{ fontWeight: 'bold', fontSize: 8 }}>DRA. VIVIANA QUIROZ R.</Text>
                    <Text style={{ fontSize: 6 }}>MÉDICO GENERAL - ESP. SALUD OCUPACIONAL</Text>
                    <Text style={{ fontSize: 6 }}>REG. MED: 1085275155 - L-SST: 1586</Text>
                </View>

                <View style={styles.signatureBox}>
                    {datos.firma_paciente_url ? (
                        <Image style={styles.imgPatientSig} src={datos.firma_paciente_url} />
                    ) : (
                        <View style={{ height: 50, marginBottom: 5 }} />
                    )}
                    <View style={styles.signatureLine} />
                    <Text style={{ fontWeight: 'bold', fontSize: 8 }}>
                        {safe(datos.firma_paciente_nombre || "FIRMA DEL TRABAJADOR")}
                    </Text>
                    <Text style={{ fontSize: 6 }}>
                        C.C: {safe(datos.firma_paciente_cedula || datos.paciente.documento_identidad)}
                    </Text>
                </View>
            </View>
        </Page>
    </Document>
);