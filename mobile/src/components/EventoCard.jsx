import { StyleSheet, Text, View } from "react-native";

const formatoFecha = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" });
const formatoPrecio = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export function EventoCard({ evento }) {
  return (
    <View style={styles.card}>
      <Text style={styles.categoria}>{evento.categoria}</Text>
      <Text style={styles.titulo}>{evento.titulo}</Text>
      <Text style={styles.detalle}>{formatoFecha.format(new Date(evento.fecha))}</Text>
      <Text style={styles.detalle}>{evento.lugar}</Text>
      <Text style={styles.precio}>Desde {formatoPrecio.format(evento.precioDesde)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#e5e5e5" },
  categoria: { fontSize: 12, fontWeight: "600", color: "#6b4eff", textTransform: "uppercase", marginBottom: 4 },
  titulo: { fontSize: 18, fontWeight: "700", marginBottom: 6 },
  detalle: { color: "#555" },
  precio: { marginTop: 8, fontWeight: "600" },
});
