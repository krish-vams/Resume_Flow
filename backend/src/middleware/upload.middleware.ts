import fs from "fs";
import path from "path";
import multer from "multer";
import { env } from "../config/env";

const focusTemplateUploadPath = path.join(env.LOCAL_STORAGE_PATH, "focus-templates");
const rawResumeUploadPath = path.join(env.LOCAL_STORAGE_PATH, "raw-resumes");
const referenceUploadPath = path.join(env.LOCAL_STORAGE_PATH, "reference-files");
const megabyte = 1024 * 1024;

const uploadSizeLimits = {
  focusTemplate: 10 * megabyte,
  rawResume: 10 * megabyte,
  referenceFile: 15 * megabyte
};

const focusTemplateFileTypes = new Map([
  [".docx", new Set(["application/vnd.openxmlformats-officedocument.wordprocessingml.document"])],
  [".doc", new Set(["application/msword"])],
  [".pdf", new Set(["application/pdf"])],
  [".txt", new Set(["text/plain"])]
]);

const referenceFileTypes = new Map([
  [".xlsx", new Set(["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/octet-stream"])]
]);

fs.mkdirSync(focusTemplateUploadPath, { recursive: true });
fs.mkdirSync(rawResumeUploadPath, { recursive: true });
fs.mkdirSync(referenceUploadPath, { recursive: true });

function safeOriginalName(originalName: string) {
  return originalName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 140) || "upload";
}

function hasAllowedFileType(file: Express.Multer.File, allowedTypes: Map<string, Set<string>>) {
  const extension = path.extname(file.originalname).toLowerCase();
  const allowedMimeTypes = allowedTypes.get(extension);

  return Boolean(allowedMimeTypes?.has(file.mimetype));
}

function rejectFile(callback: multer.FileFilterCallback, message: string) {
  callback(new Error(message));
}

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => {
    callback(null, focusTemplateUploadPath);
  },
  filename: (_request, file, callback) => {
    const timestamp = Date.now();
    callback(null, `${timestamp}-${safeOriginalName(file.originalname)}`);
  }
});

export const uploadFocusTemplateFile = multer({
  storage,
  limits: {
    fileSize: uploadSizeLimits.focusTemplate
  },
  fileFilter: (_request, file, callback) => {
    if (hasAllowedFileType(file, focusTemplateFileTypes)) {
      callback(null, true);
      return;
    }

    rejectFile(callback, "Focused resume file must be DOCX, DOC, PDF, or TXT");
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
    callback(null, `${timestamp}-${safeOriginalName(file.originalname)}`);
  }
});

export const uploadRawResumeFile = multer({
  storage: rawResumeStorage,
  limits: {
    fileSize: uploadSizeLimits.rawResume
  },
  fileFilter: (_request, file, callback) => {
    const isDocxMime =
      file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const isDocxExtension = path.extname(file.originalname).toLowerCase() === ".docx";

    if (isDocxMime && isDocxExtension) {
      callback(null, true);
      return;
    }

    rejectFile(callback, "Raw resume file must be a DOCX file");
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
    callback(null, `${timestamp}-${safeOriginalName(file.originalname)}`);
  }
});

export const uploadReferenceFile = multer({
  storage: referenceStorage,
  limits: {
    fileSize: uploadSizeLimits.referenceFile
  },
  fileFilter: (_request, file, callback) => {
    if (hasAllowedFileType(file, referenceFileTypes)) {
      callback(null, true);
      return;
    }

    rejectFile(callback, "Reference file must be an XLSX file");
  }
});
