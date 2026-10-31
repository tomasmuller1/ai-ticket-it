import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";

import { api, API_URL } from "../api/client";
import { EventoCard } from "../components/EventoCard";

export default function EventosScreen() {
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .listarEventos()
      .then(setEventos)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, []);

  if (cargando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centro}>
        <Text style={styles.error}>No se pudo conectar con el backend</Text>
        <Text style={styles.detalle}>{API_URL}</Text>
        <Text style={styles.detalle}>{error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={eventos}
      keyExtractor={(evento) => evento.id}
      renderItem={({ item }) => <EventoCard evento={item} />}
      contentContainerStyle={styles.lista}
    />
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  lista: { padding: 16, gap: 12 },
  error: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  detalle: { color: "#666", textAlign: "center" },
});
