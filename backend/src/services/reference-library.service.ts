import fs from "fs/promises";
import path from "path";
import { inflateRawSync } from "zlib";
import type { Prisma, ReferenceCategory } from "@prisma/client";
import { env } from "../config/env";
import { prisma } from "../utils/prisma";
import { HttpError } from "../utils/http-error";

type ZipEntry = {
  compression: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
};

type ParsedReferenceRow = {
  title?: string;
  content: string;
  tags: string[];
  metadata: Record<string, string>;
};

const referenceFileSelect = {
  id: true,
  userId: true,
  name: true,
  fileType: true,
  fileUrl: true,
  category: true,
  parsedStatus: true,
  uploadedAt: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      entries: true
    }
  }
};

const referenceEntrySelect = {
  id: true,
  referenceFileId: true,
  category: true,
  title: true,
  content: true,
  tagsJson: true,
  metadataJson: true,
  createdAt: true,
  updatedAt: true,
  referenceFile: {
    select: {
      id: true,
      name: true,
      category: true
    }
  }
};

function readUInt32(buffer: Buffer, offset: number) {
  return buffer.readUInt32LE(offset);
}

function readUInt16(buffer: Buffer, offset: number) {
  return buffer.readUInt16LE(offset);
}

function decodeXml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function stripXml(value: string) {
  return decodeXml(value.replace(/<[^>]+>/g, ""));
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function findZipEntry(buffer: Buffer, entryName: string): ZipEntry | null {
  for (let offset = buffer.length - 22; offset >= 0; offset -= 1) {
    if (readUInt32(buffer, offset) !== 0x06054b50) {
      continue;
    }

    const entryCount = readUInt16(buffer, offset + 10);
    const centralDirectoryOffset = readUInt32(buffer, offset + 16);
    let cursor = centralDirectoryOffset;

    for (let index = 0; index < entryCount; index += 1) {
      if (readUInt32(buffer, cursor) !== 0x02014b50) {
        return null;
      }

      const compression = readUInt16(buffer, cursor + 10);
      const compressedSize = readUInt32(buffer, cursor + 20);
      const uncompressedSize = readUInt32(buffer, cursor + 24);
      const fileNameLength = readUInt16(buffer, cursor + 28);
      const extraLength = readUInt16(buffer, cursor + 30);
      const commentLength = readUInt16(buffer, cursor + 32);
      const localHeaderOffset = readUInt32(buffer, cursor + 42);
      const fileName = buffer.toString("utf8", cursor + 46, cursor + 46 + fileNameLength);

      if (fileName === entryName) {
        return {
          compression,
          compressedSize,
          uncompressedSize,
          localHeaderOffset
        };
      }

      cursor += 46 + fileNameLength + extraLength + commentLength;
    }
  }

  return null;
}

function extractZipEntry(buffer: Buffer, entryName: string) {
  const entry = findZipEntry(buffer, entryName);

  if (!entry) {
    return null;
  }

  const fileNameLength = readUInt16(buffer, entry.localHeaderOffset + 26);
  const extraLength = readUInt16(buffer, entry.localHeaderOffset + 28);
  const dataStart = entry.localHeaderOffset + 30 + fileNameLength + extraLength;
  const compressed = buffer.subarray(dataStart, dataStart + entry.compressedSize);

  if (entry.compression === 0) {
    return compressed.toString("utf8");
  }

  if (entry.compression !== 8) {
    throw new HttpError(400, "Invalid XLSX");
  }

  const inflated = inflateRawSync(compressed);

  if (inflated.length !== entry.uncompressedSize) {
    throw new HttpError(400, "Invalid XLSX");
  }

  return inflated.toString("utf8");
}

function parseSharedStrings(buffer: Buffer) {
  const xml = extractZipEntry(buffer, "xl/sharedStrings.xml");

  if (!xml) {
    return [];
  }

  return (xml.match(/<si[\s\S]*?<\/si>/g) ?? []).map((item) =>
    normalizeWhitespace(
      (item.match(/<t[^>]*>[\s\S]*?<\/t>/g) ?? [])
        .map((part) => stripXml(part))
        .join("")
    )
  );
}

function getCellValue(cellXml: string, sharedStrings: string[]) {
  const type = cellXml.match(/<c[^>]*\st="([^"]+)"/)?.[1];
  const value = cellXml.match(/<v[^>]*>([\s\S]*?)<\/v>/)?.[1];
  const inlineValue = cellXml.match(/<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>[\s\S]*?<\/is>/)?.[1];

  if (type === "s" && value !== undefined) {
    return sharedStrings[Number(value)] ?? "";
  }

  if (inlineValue !== undefined) {
    return normalizeWhitespace(decodeXml(inlineValue));
  }

  return value !== undefined ? normalizeWhitespace(decodeXml(value)) : "";
}

function columnIndex(cellRef: string) {
  const letters = cellRef.replace(/[0-9]/g, "");
  return letters.split("").reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function parseWorksheetRows(sheetXml: string, sharedStrings: string[]) {
  return (sheetXml.match(/<row[\s\S]*?<\/row>/g) ?? [])
    .map((rowXml) => {
      const row: string[] = [];

      for (const cellXml of rowXml.match(/<c[\s\S]*?<\/c>/g) ?? []) {
        const cellRef = cellXml.match(/<c[^>]*\sr="([^"]+)"/)?.[1] ?? "";
        const index = cellRef ? columnIndex(cellRef) : row.length;
        row[index] = getCellValue(cellXml, sharedStrings);
      }

      return row.map((value) => normalizeWhitespace(value ?? ""));
    })
    .filter((row) => row.some(Boolean));
}

function parseXlsxRows(buffer: Buffer) {
  const sharedStrings = parseSharedStrings(buffer);
  const rows: string[][] = [];

  for (let sheetIndex = 1; sheetIndex <= 20; sheetIndex += 1) {
    const sheetXml = extractZipEntry(buffer, `xl/worksheets/sheet${sheetIndex}.xml`);

    if (!sheetXml) {
      if (sheetIndex === 1) {
        throw new HttpError(400, "Invalid XLSX");
      }
      break;
    }

    rows.push(...parseWorksheetRows(sheetXml, sharedStrings));
  }

  return rows;
}

function getField(row: Record<string, string>, candidates: string[]) {
  const normalizedCandidates = candidates.map((candidate) => candidate.toLowerCase());
  const match = Object.entries(row).find(([key]) => normalizedCandidates.includes(key.toLowerCase()));
  return match?.[1];
}

function rowToEntry(row: Record<string, string>): ParsedReferenceRow | null {
  const values = Object.values(row).filter(Boolean);

  if (values.length === 0) {
    return null;
  }

  const title = getField(row, ["title", "term", "keyword", "verb", "name", "category"]);
  const content =
    getField(row, ["content", "description", "example", "sentence", "rewrite", "guidance", "keyword", "term", "verb"]) ??
    values.join(" - ");
  const tags = (getField(row, ["tags", "tag", "skills", "skill", "stack"]) ?? "")
    .split(/[,;|]/)
    .map((tag) => normalizeWhitespace(tag))
    .filter(Boolean);

  return {
    title: title || undefined,
    content,
    tags,
    metadata: row
  };
}

function parseReferenceRows(buffer: Buffer) {
  const rows = parseXlsxRows(buffer);
  const [headerRow, ...dataRows] = rows;

  if (!headerRow || dataRows.length === 0) {
    throw new HttpError(400, "Reference file has no parsable rows");
  }

  const headers = headerRow.map((header, index) => normalizeWhitespace(header || `Column ${index + 1}`));

  return dataRows
    .map((row) =>
      rowToEntry(
        Object.fromEntries(
          headers.map((header, index) => [header, row[index] ?? ""])
        )
      )
    )
    .filter((entry): entry is ParsedReferenceRow => entry !== null);
}

function toStorageKey(filePath: string) {
  const storageRoot = path.resolve(env.LOCAL_STORAGE_PATH);
  const absoluteFilePath = path.resolve(filePath);
  const relativePath = path.relative(storageRoot, absoluteFilePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new HttpError(400, "Uploaded file is outside the configured storage path");
  }

  return relativePath.split(path.sep).join("/");
}

function resolveStorageKey(storageKey: string) {
  const storageRoot = path.resolve(env.LOCAL_STORAGE_PATH);
  const absolutePath = path.resolve(storageRoot, storageKey);

  if (!absolutePath.startsWith(`${storageRoot}${path.sep}`)) {
    throw new HttpError(400, "Stored reference path is invalid");
  }

  return absolutePath;
}

async function getReferenceFileForUser(userId: string, referenceFileId: string) {
  const referenceFile = await prisma.referenceFile.findFirst({
    where: {
      id: referenceFileId,
      userId
    },
    select: referenceFileSelect
  });

  if (!referenceFile) {
    throw new HttpError(404, "Reference file not found");
  }

  return referenceFile;
}

export async function uploadReferenceFile(userId: string, input: { category: ReferenceCategory; filePath: string; fileName: string; fileType: string }) {
  return prisma.referenceFile.create({
    data: {
      userId,
      name: input.fileName,
      fileType: input.fileType,
      fileUrl: toStorageKey(input.filePath),
      category: input.category,
      parsedStatus: "pending"
    },
    select: referenceFileSelect
  });
}

export async function listReferenceFiles(userId: string) {
  return prisma.referenceFile.findMany({
    where: { userId },
    select: referenceFileSelect,
    orderBy: { uploadedAt: "desc" }
  });
}

export async function parseReferenceFile(userId: string, referenceFileId: string) {
  const referenceFile = await getReferenceFileForUser(userId, referenceFileId);

  try {
    const buffer = await fs.readFile(resolveStorageKey(referenceFile.fileUrl));
    const entries = parseReferenceRows(buffer);

    if (entries.length === 0) {
      throw new HttpError(400, "Reference file has no parsable rows");
    }

    await prisma.$transaction([
      prisma.referenceEntry.deleteMany({
        where: { referenceFileId: referenceFile.id }
      }),
      prisma.referenceEntry.createMany({
        data: entries.map((entry) => ({
          referenceFileId: referenceFile.id,
          category: referenceFile.category,
          title: entry.title,
          content: entry.content,
          tagsJson: entry.tags as Prisma.InputJsonValue,
          metadataJson: entry.metadata as Prisma.InputJsonValue
        }))
      }),
      prisma.referenceFile.update({
        where: { id: referenceFile.id },
        data: { parsedStatus: "parsed" }
      })
    ]);

    return {
      referenceFile: await getReferenceFileForUser(userId, referenceFileId),
      entriesCreated: entries.length
    };
  } catch (error) {
    await prisma.referenceFile.update({
      where: { id: referenceFile.id },
      data: { parsedStatus: "failed" }
    });

    if (error instanceof HttpError) {
      throw error;
    }

    throw new HttpError(400, "Unable to parse reference file");
  }
}

export async function listReferenceEntries(userId: string, input: { category?: ReferenceCategory; referenceFileId?: string; limit: number }) {
  return prisma.referenceEntry.findMany({
    where: {
      ...(input.category ? { category: input.category } : {}),
      ...(input.referenceFileId ? { referenceFileId: input.referenceFileId } : {}),
      referenceFile: { userId }
    },
    select: referenceEntrySelect,
    orderBy: { createdAt: "desc" },
    take: input.limit
  });
}

export async function searchReferenceEntries(userId: string, input: { q: string; category?: ReferenceCategory; limit: number }) {
  return prisma.referenceEntry.findMany({
    where: {
      referenceFile: { userId },
      ...(input.category ? { category: input.category } : {}),
      OR: [
        { title: { contains: input.q, mode: "insensitive" } },
        { content: { contains: input.q, mode: "insensitive" } }
      ]
    },
    select: referenceEntrySelect,
    orderBy: { createdAt: "desc" },
    take: input.limit
  });
}

export async function getReferenceEntriesByIds(userId: string, referenceEntryIds: string[]) {
  if (referenceEntryIds.length === 0) {
    return [];
  }

  return prisma.referenceEntry.findMany({
    where: {
      id: { in: referenceEntryIds },
      referenceFile: { userId }
    },
    select: referenceEntrySelect,
    take: 50
  });
}
