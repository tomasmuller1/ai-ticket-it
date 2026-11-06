process.env.EXPO_PUBLIC_API_URL = "http://api.test/api";

module.exports = {
  preset: "jest-expo",
  testEnvironment: "<rootDir>/test/helpers/entorno.js",
  testMatch: ["<rootDir>/test/**/*.test.{js,jsx}"],
  setupFilesAfterEnv: ["<rootDir>/test/helpers/setup.js"],
  // Lista de la documentación de Expo, más los paquetes de fuentes y de datos que se publican en ESM.
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|react-native-svg|msw|@mswjs|until-async|rettime|@tanstack)",
  ],
  // El preset resuelve los paquetes con la condición "react-native"; MSW publica su versión de Node sin ella.
  testEnvironmentOptions: { customExportConditions: ["node", "require", "default"] },
  collectCoverageFrom: ["src/**/*.{js,jsx}", "!src/app/**"],
  coverageReporters: ["text", "html"],
};
