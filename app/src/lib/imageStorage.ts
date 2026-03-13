import { promises as fs } from "fs";
import * as path from "path";
import { v4 as uuid } from "uuid";

const IMAGE_DIR = process.env.VERCEL
  ? path.join("/tmp", "images")
  : path.join(process.cwd(), "public", "images");

// Ensure image directory exists
export async function ensureImageDir(): Promise<void> {
  try {
    await fs.mkdir(IMAGE_DIR, { recursive: true });
  } catch (error) {
    console.error("Failed to create image directory:", error);
  }
}

export async function downloadImage(imageUrl: string, type: "thumbnail" | "profile"): Promise<string> {
  try {
    if (!imageUrl) return "";

    // Download image
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Failed to download image: ${response.status}`);
      return "";
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // Determine file extension from content-type
    const contentType = response.headers.get("content-type") || "image/jpeg";
    let ext = "jpg";
    if (contentType.includes("png")) ext = "png";
    else if (contentType.includes("webp")) ext = "webp";
    else if (contentType.includes("gif")) ext = "gif";

    // Generate unique filename
    const filename = `${type}-${uuid().slice(0, 8)}.${ext}`;
    const filePath = path.join(IMAGE_DIR, filename);

    // Save file
    await fs.writeFile(filePath, buffer);

    // Return relative path for web usage
    return `/images/${filename}`;
  } catch (error) {
    console.error(`Error downloading image from ${imageUrl}:`, error);
    return "";
  }
}

export async function downloadImages(urls: string[], type: "thumbnail" | "profile"): Promise<string[]> {
  return Promise.all(
    urls.map((url) => downloadImage(url, type).catch(() => ""))
  );
}
