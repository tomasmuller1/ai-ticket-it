import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { router, Stack } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { Ionicons } from "@expo/vector-icons";

import { SelectorFechaHora } from "../../../components/SelectorFechaHora";
import { Boton, Campo, Chip, Texto } from "../../../components/ui";
import { useCategorias } from "../../../hooks/eventos";
import { useCrearEvento } from "../../../hooks/organizador";
import { espacio, radio, useTema } from "../../../theme";

const MAXIMO_TIPOS = 10;
const UNA_SEMANA_MS = 7 * 24 * 60 * 60 * 1000;

function fechaSugerida() {
  const fecha = new Date(Date.now() + UNA_SEMANA_MS);
  fecha.setHours(21, 0, 0, 0);
  return fecha;
}

const tipoVacio = () => ({
  clave: Math.random().toString(36).slice(2),
  nombre: "",
  descripcion: "",
  precio: "",
  cupo: "",
});

// Validación en el dispositivo para avisar rápido; la definitiva la hace el backend.
function validar(datos) {
  const errores = {};
  if (datos.nombre.trim().length < 3) errores.nombre = "Usá al menos 3 caracteres.";
  if (!datos.descripcion.trim()) errores.descripcion = "Contá de qué se trata el evento.";
  if (!datos.categoriaId) errores.categoriaId = "Elegí una categoría.";
  if (datos.fecha <= new Date()) errores.fecha = "La fecha tiene que ser futura.";
  if (datos.lugar.trim().length < 3) errores.lugar = "Indicá dónde se hace.";
  if (datos.imagen.trim() && !/^https?:\/\/\S+$/.test(datos.imagen.trim())) {
    errores.imagen = "Pegá una URL que empiece con http:// o https://.";
  }
  const nombres = new Set();
  datos.tipos.forEach((tipo, i) => {
    const nombre = tipo.nombre.trim().toLowerCase();
    if (!nombre) errores[`tiposEntrada.${i}.nombre`] = "Poné un nombre (por ejemplo, General).";
    else if (nombres.has(nombre)) errores[`tiposEntrada.${i}.nombre`] = "Ya hay otro tipo con este nombre.";
    nombres.add(nombre);
    const precio = Number(tipo.precio.replace(",", "."));
    if (tipo.precio.trim() === "" || Number.isNaN(precio) || precio < 0) {
      errores[`tiposEntrada.${i}.precio`] = "Ingresá un precio en pesos (0 si es gratis).";
    }
    const cupo = Number(tipo.cupo);
    if (!Number.isInteger(cupo) || cupo < 1)
      errores[`tiposEntrada.${i}.cupo`] = "Ingresá cuántas entradas hay (1 o más).";
  });
  return errores;
}

function aCuerpo(datos) {
  return {
    nombre: datos.nombre.trim(),
    descripcion: datos.descripcion.trim(),
    categoriaId: datos.categoriaId,
    fecha: datos.fecha.toISOString(),
    lugar: datos.lugar.trim(),
    multimedia: datos.imagen.trim() ? [datos.imagen.trim()] : [],
    tiposEntrada: datos.tipos.map((tipo) => ({
      nombre: tipo.nombre.trim(),
      descripcion: tipo.descripcion.trim(),
      precio: Number(tipo.precio.replace(",", ".")),
      cupo: Number(tipo.cupo),
    })),
  };
}

function TipoEntradaForm({ tipo, indice, errores, onCambiar, onQuitar }) {
  const { colores } = useTema();
  const error = (campo) => errores[`tiposEntrada.${indice}.${campo}`];
  return (
    <View
      style={{
        gap: espacio.md,
        padding: espacio.lg,
        borderRadius: radio.lg,
        borderWidth: 1,
        borderColor: colores.borde,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Texto variante="cuerpoFuerte">Tipo de entrada {indice + 1}</Texto>
        {onQuitar && (
          <Pressable
            onPress={onQuitar}
            accessibilityRole="button"
            accessibilityLabel={`Quitar tipo de entrada ${indice + 1}`}
            hitSlop={12}
          >
            <Ionicons name="trash-outline" size={20} color={colores.peligro} />
          </Pressable>
        )}
      </View>
      <Campo
        etiqueta="Nombre"
        placeholder="General, Platea, VIP…"
        value={tipo.nombre}
        onChangeText={(valor) => onCambiar({ nombre: valor })}
        error={error("nombre")}
      />
      <Campo
        etiqueta="Descripción (opcional)"
        placeholder="Asiento numerado"
        value={tipo.descripcion}
        onChangeText={(valor) => onCambiar({ descripcion: valor })}
        error={error("descripcion")}
      />
      <View style={{ flexDirection: "row", gap: espacio.md }}>
        <Campo
          etiqueta="Precio ($)"
          placeholder="20000"
          keyboardType="decimal-pad"
          value={tipo.precio}
          onChangeText={(valor) => onCambiar({ precio: valor })}
          error={error("precio")}
          style={{ flex: 1 }}
        />
        <Campo
          etiqueta="Cupo"
          placeholder="200"
          keyboardType="number-pad"
          value={tipo.cupo}
          onChangeText={(valor) => onCambiar({ cupo: valor })}
          error={error("cupo")}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

// CU4: crear un evento ofreciendo distintos tipos de entrada, cada uno con su precio y cupo.
export default function NuevoEvento() {
  const { colores } = useTema();
  const alturaHeader = useHeaderHeight();
  const categorias = useCategorias();
  const crear = useCrearEvento();
  const [datos, setDatos] = useState({
    nombre: "",
    descripcion: "",
    categoriaId: null,
    fecha: fechaSugerida(),
    lugar: "",
    imagen: "",
    tipos: [tipoVacio()],
  });
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState(null);

  function cambiar(cambios) {
    setDatos((actual) => ({ ...actual, ...cambios }));
    setErrores((actual) => {
      const siguiente = { ...actual };
      for (const campo of Object.keys(cambios)) delete siguiente[campo];
      return siguiente;
    });
  }

  function cambiarTipo(indice, cambios) {
    setDatos((actual) => ({
      ...actual,
      tipos: actual.tipos.map((tipo, i) => (i === indice ? { ...tipo, ...cambios } : tipo)),
    }));
    setErrores((actual) => {
      const siguiente = { ...actual };
      for (const campo of Object.keys(cambios)) delete siguiente[`tiposEntrada.${indice}.${campo}`];
      return siguiente;
    });
  }

  function publicar() {
    const encontrados = validar(datos);
    setErrores(encontrados);
    setErrorGeneral(null);
    if (Object.keys(encontrados).length > 0) {
      setErrorGeneral("Revisá los campos marcados.");
      return;
    }
    crear.mutate(aCuerpo(datos), {
      onSuccess: (evento) => router.replace(`/organizador/evento/${evento.id}`),
      onError: (error) => {
        const porCampo = Object.fromEntries(error.detalles.map((d) => [d.campo, d.mensaje]));
        setErrores(porCampo);
        setErrorGeneral(error.message);
      },
    });
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={alturaHeader}
    >
      <Stack.Screen options={{ title: "Nuevo evento" }} />
      <ScrollView
        contentContainerStyle={{ padding: espacio.lg, gap: espacio.xl, paddingBottom: espacio.xxxl }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: espacio.lg }}>
          <Texto variante="subtitulo" accessibilityRole="header">
            El evento
          </Texto>
          <Campo
            etiqueta="Nombre"
            placeholder="Recital acústico"
            value={datos.nombre}
            onChangeText={(nombre) => cambiar({ nombre })}
            error={errores.nombre}
          />
          <Campo
            etiqueta="Descripción"
            placeholder="Contá de qué se trata, quiénes participan…"
            value={datos.descripcion}
            onChangeText={(descripcion) => cambiar({ descripcion })}
            error={errores.descripcion}
            multiline
            style={{ minHeight: 100 }}
          />
          <View style={{ gap: espacio.sm }}>
            <Texto variante="etiqueta">Categoría</Texto>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: espacio.sm }}>
              {categorias.data?.map((c) => (
                <Chip
                  key={c.id}
                  titulo={c.nombre}
                  seleccionado={datos.categoriaId === c.id}
                  onPress={() => cambiar({ categoriaId: c.id })}
                />
              ))}
            </View>
            {errores.categoriaId && (
              <Texto variante="pequenio" color="peligro">
                {errores.categoriaId}
              </Texto>
            )}
          </View>
          <SelectorFechaHora
            etiqueta="Fecha y hora"
            valor={datos.fecha}
            minimo={new Date()}
            onCambiar={(fecha) => cambiar({ fecha })}
            error={errores.fecha}
          />
          <Campo
            etiqueta="Lugar"
            placeholder="La Trastienda, CABA"
            value={datos.lugar}
            onChangeText={(lugar) => cambiar({ lugar })}
            error={errores.lugar}
          />
          <Campo
            etiqueta="Imagen (opcional)"
            placeholder="https://…"
            ayuda="URL de una imagen horizontal para la portada."
            autoCapitalize="none"
            keyboardType="url"
            value={datos.imagen}
            onChangeText={(imagen) => cambiar({ imagen })}
            error={errores.imagen ?? errores["multimedia.0"]}
          />
        </View>

        <View style={{ gap: espacio.md }}>
          <Texto variante="subtitulo" accessibilityRole="header">
            Tipos de entrada
          </Texto>
          <Texto color="secundario">
            Cada tipo tiene su precio y su cupo. Por ejemplo: General, Platea y VIP.
          </Texto>
          {datos.tipos.map((tipo, i) => (
            <TipoEntradaForm
              key={tipo.clave}
              tipo={tipo}
              indice={i}
              errores={errores}
              onCambiar={(cambios) => cambiarTipo(i, cambios)}
              onQuitar={
                datos.tipos.length > 1
                  ? () => {
                      setDatos((actual) => ({ ...actual, tipos: actual.tipos.filter((_, j) => j !== i) }));
                      setErrores({});
                    }
                  : undefined
              }
            />
          ))}
          {datos.tipos.length < MAXIMO_TIPOS && (
            <Boton
              titulo="Agregar tipo de entrada"
              variante="secundario"
              icono="add"
              onPress={() => setDatos((actual) => ({ ...actual, tipos: [...actual.tipos, tipoVacio()] }))}
            />
          )}
        </View>

        {errorGeneral && (
          <View
            style={{ backgroundColor: colores.peligroSuave, borderRadius: radio.md, padding: espacio.md }}
          >
            <Texto color="peligro" accessibilityLiveRegion="polite">
              {errorGeneral}
            </Texto>
          </View>
        )}

        <Boton
          titulo="Publicar evento"
          icono="megaphone-outline"
          onPress={publicar}
          cargando={crear.isPending}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
