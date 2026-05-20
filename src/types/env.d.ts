declare global {
  namespace NodeJS {
    interface ProcessEnv {
      APP_PORT?: string
      IDENTIFICATION_URL: string
      AUTHENTICATION_API_URL?: string
      GROUP_MANAGER_API_URL?: string
      EMPLOYEE_MANAGER_API_URL?: string
      MONGODB_CONNECTION_STRING?: string
      MONGODB_PROTOCOL?: string
      MONGODB_USERNAME?: string
      MONGODB_PASSWORD?: string
      MONGODB_HOST?: string
      MONGODB_PORT?: string
      MONGODB_DB?: string
      MONGODB_OPTIONS?: string
    }
  }
}

export {}
