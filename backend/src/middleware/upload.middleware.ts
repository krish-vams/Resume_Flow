import fs from "fs";
import path from "path";
import multer from "multer";
import { env } from "../config/env";

const focusTemplateUploadPath = path.join(env.LOCAL_STORAGE_PATH, "focus-templates");

fs.mkdirSync(focusTemplateUploadPath, { recursive: true });

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
