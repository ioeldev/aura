import path from "path";

export const PORT = process.env.PORT || 2655;
export const STATIC_DIR = process.env.STATIC_DIR || path.join(__dirname, "../../public");
export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");

export const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
export const SESSION_EXPIRE_HOURS = parseInt(process.env.SESSION_EXPIRE_HOURS || "24", 10);
export const AUTH_ENABLED = !!ADMIN_PASSWORD;

export const SERVICES_CONFIG_PATH =
    process.env.SERVICES_CONFIG_PATH || path.join(process.cwd(), "config/services.json");
export const SERVICES_FALLBACK_PATH = path.join(process.cwd(), "config/services.example.json");
