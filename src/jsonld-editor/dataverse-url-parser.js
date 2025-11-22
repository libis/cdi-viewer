/**
 * Dataverse URL Parser
 * Parses various Dataverse URL formats and constructs appropriate API call URLs
 */

/**
 * Parse a Dataverse URL and return API endpoint information
 * @param {string} url - The Dataverse URL to parse
 * @returns {Object} - Object with { valid, type, apiUrl, error }
 *   - valid: boolean indicating if URL is valid
 *   - type: 'replace' or 'add'
 *   - apiUrl: constructed API endpoint URL (without /api/files/{id}/replace or /api/datasets/:persistentId/add)
 *   - fileId: extracted file ID (for replace)
 *   - persistentId: extracted persistent ID (for add)
 *   - serverUrl: base server URL
 *   - error: error message if invalid
 */
export function parseDataverseUrl(url) {
  if (!url || typeof url !== "string") {
    return { valid: false, error: "URL is required" };
  }

  url = url.trim();

  // Basic URL validation
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch (e) {
    return { valid: false, error: "Invalid URL format" };
  }

  const serverUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
  const pathname = parsedUrl.pathname;
  const searchParams = parsedUrl.searchParams;

  // Case 1: SPA files URL - /files? with id parameter
  if (pathname.includes("/files") && searchParams.has("id")) {
    const fileId = searchParams.get("id");
    if (!fileId || !/^\d+$/.test(fileId)) {
      return { valid: false, error: "Invalid file ID in URL" };
    }
    return {
      valid: true,
      type: "replace",
      serverUrl,
      fileId,
      apiUrl: `${serverUrl}/api/files/${fileId}/replace`,
    };
  }

  // Case 2: JSF file URL - /file.xhtml? with fileId parameter
  if (pathname.includes("/file.xhtml") && searchParams.has("fileId")) {
    const fileId = searchParams.get("fileId");
    if (!fileId || !/^\d+$/.test(fileId)) {
      return { valid: false, error: "Invalid file ID in URL" };
    }
    return {
      valid: true,
      type: "replace",
      serverUrl,
      fileId,
      apiUrl: `${serverUrl}/api/files/${fileId}/replace`,
    };
  }

  // Case 3: Direct API files URL - /api/files/123
  const fileMatch = pathname.match(/\/api\/files\/(\d+)/);
  if (fileMatch) {
    const fileId = fileMatch[1];
    return {
      valid: true,
      type: "replace",
      serverUrl,
      fileId,
      apiUrl: `${serverUrl}/api/files/${fileId}/replace`,
    };
  }

  // Case 4: URLs with persistentId parameter (JSF, SPA, or API)
  if (searchParams.has("persistentId")) {
    const persistentId = decodeURIComponent(searchParams.get("persistentId"));
    if (!persistentId) {
      return { valid: false, error: "Invalid persistent ID in URL" };
    }

    // Validate DOI format (most common case)
    if (!persistentId.match(/^(doi:)?10\.\d+/)) {
      return {
        valid: false,
        error: "Persistent ID should be a DOI (e.g., doi:10.1234/ABCD)",
      };
    }

    return {
      valid: true,
      type: "add",
      serverUrl,
      persistentId,
      apiUrl: `${serverUrl}/api/datasets/:persistentId/add?persistentId=${encodeURIComponent(persistentId)}`,
    };
  }

  // Case 5: Direct API dataset URL by ID - /api/datasets/123
  const datasetMatch = pathname.match(/\/api\/datasets\/(\d+)/);
  if (datasetMatch) {
    const datasetId = datasetMatch[1];
    return {
      valid: true,
      type: "add",
      serverUrl,
      datasetId,
      apiUrl: `${serverUrl}/api/datasets/${datasetId}/add`,
    };
  }

  // No valid pattern matched
  return {
    valid: false,
    error:
      "URL does not match any supported Dataverse format (file URL, dataset URL, or API endpoint)",
  };
}

/**
 * Validate if a URL can be parsed successfully
 * @param {string} url - The URL to validate
 * @returns {boolean} - True if URL is valid and parseable
 */
export function isValidDataverseUrl(url) {
  return parseDataverseUrl(url).valid;
}
