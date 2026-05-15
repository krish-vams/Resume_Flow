import fs from "fs";
import path from "path";
import multer from "multer";
import { env } from "../config/env";

const focusTemplateUploadPath = path.join(env.LOCAL_STORAGE_PATH, "focus-templates");
const rawResumeUploadPath = path.join(env.LOCAL_STORAGE_PATH, "raw-resumes");
const referenceUploadPath = path.join(env.LOCAL_STORAGE_PATH, "reference-files");

fs.mkdirSync(focusTemplateUploadPath, { recursive: true });
fs.mkdirSync(rawResumeUploadPath, { recursive: true });
fs.mkdirSync(referenceUploadPath, { recursive: true });

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => {
    callback(null, focusTemplateUploadPath);
  },
  filename: (_request, file, callback) => {
    const timestamp = Date.now();
    const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "-");
    callback(null, `${timestamp}-${safeOriginalName}`);
  }
});

export const uploadFocusTemplateFile = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (_request, file, callback) => {
    const allowedMimeTypes = new Set([
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "application/pdf",
      "text/plain"
    ]);

    if (allowedMimeTypes.has(file.mimetype)) {
      callback(null, true);
      return;
    }

    callback(new Error("Focused resume file must be DOCX, DOC, PDF, or TXT"));
  }
});

const rawResumeStorage = multer.diskStorage({
  destination: (request, _file, callback) => {
    const userId = request.user?.id ?? "unknown-user";
    const destination = path.join(rawResumeUploadPath, userId);
    fs.mkdirSync(destination, { recursive: true });
    callback(null, destination);
  },
  filename: (_request, file, callback) => {
    const timestamp = Date.now();
    const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "-");
    callback(null, `${timestamp}-${safeOriginalName}`);
  }
});

export const uploadRawResumeFile = multer({
  storage: rawResumeStorage,
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (_request, file, callback) => {
    const isDocxMime =
      file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const isDocxExtension = path.extname(file.originalname).toLowerCase() === ".docx";

    if (isDocxMime && isDocxExtension) {
      callback(null, true);
      return;
    }

    callback(new Error("Raw resume file must be a DOCX file"));
  }
});

const referenceStorage = multer.diskStorage({
  destination: (request, _file, callback) => {
    const userId = request.user?.id ?? "unknown-user";
    const destination = path.join(referenceUploadPath, userId);
    fs.mkdirSync(destination, { recursive: true });
    callback(null, destination);
  },
  filename: (_request, file, callback) => {
    const timestamp = Date.now();
    const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "-");
    callback(null, `${timestamp}-${safeOriginalName}`);
  }
});

export const uploadReferenceFile = multer({
  storage: referenceStorage,
  limits: {
    fileSize: 15 * 1024 * 1024
  },
  fileFilter: (_request, file, callback) => {
    const allowedMimeTypes = new Set([
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/octet-stream"
    ]);
    const isXlsxExtension = path.extname(file.originalname).toLowerCase() === ".xlsx";

    if (isXlsxExtension && allowedMimeTypes.has(file.mimetype)) {
      callback(null, true);
      return;
    }

    callback(new Error("Reference file must be an XLSX file"));
  }
});
