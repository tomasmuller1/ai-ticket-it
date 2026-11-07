// SecureStore usa el Keychain y el Keystore del celular: en los tests lo reemplaza un Map.
const almacen = new Map();

export const getItemAsync = async (clave) => almacen.get(clave) ?? null;
export const setItemAsync = async (clave, valor) => void almacen.set(clave, valor);
export const deleteItemAsync = async (clave) => void almacen.delete(clave);
export const vaciar = () => almacen.clear();
