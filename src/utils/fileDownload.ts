/**
 * Utility to force real browser file downloads (rather than opening in a new tab)
 * Handles cross-origin URLs (e.g. Cloudinary, AWS S3, etc.)
 */
export async function downloadFileFromUrl(url: string, customFileName?: string): Promise<void> {
  if (!url) return;

  const fileName =
    customFileName ||
    url.split("/").pop()?.split("?")[0] ||
    "download";

  // Method 1: Fetch as Blob and create local object URL (always forces browser download dialog)
  try {
    const response = await fetch(url);
    if (response.ok) {
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      return;
    }
  } catch (err) {
    console.warn("Direct blob download failed, falling back to download attachment link:", err);
  }

  // Method 2: Cloudinary specific attachment transformation
  let finalUrl = url;
  if (url.includes("cloudinary.com") && url.includes("/upload/")) {
    if (!url.includes("fl_attachment")) {
      const cleanFileName = encodeURIComponent(fileName.replace(/[^a-zA-Z0-9._-]/g, "_"));
      finalUrl = url.replace("/upload/", `/upload/fl_attachment:${cleanFileName}/`);
    }
  }

  // Method 3: Anchor tag trigger with download attribute
  const link = document.createElement("a");
  link.href = finalUrl;
  link.setAttribute("download", fileName);
  link.setAttribute("target", "_blank");
  link.setAttribute("rel", "noopener noreferrer");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
