declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_OCR_SPACE_API_KEY: string;
    }
  }
}

export {};