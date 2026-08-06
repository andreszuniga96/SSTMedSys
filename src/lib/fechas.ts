// Fecha local en formato YYYY-MM-DD (evita el desfase de UTC; relevante en Colombia UTC-5)
export const fechaLocal = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
