import { auth } from "../firebase";

export async function getSignedUrl(fileName: string, contentType: string) {
  return fetch("https://us-central1-onlinetaxman-c6d0f.cloudfunctions.net/user/getSignedUrlForClientFiles", {
    method: "POST", // Ensure POST is explicitly set
    headers: {
      "Content-Type": "application/json", 
      "x-api-key": process.env.XAPIKEY || "",
    },
    body: JSON.stringify({
      fileName,
      email: auth.currentUser?.email,
      contentType,
    }),
  })}

  export const isLikelyHTML = (value: string): boolean => {
    return /<\/?[a-z][\s\S]*>/i.test(value.trim());
};

export const stripOuterPTag = (html: string): string => {
  const trimmed = html.trim();

  // Match a single <p> wrapper at the start and end of the string
  const match = trimmed.match(/^<p[^>]*>(.*?)<\/p>$/i);
  if (match) {
    return match[1]; // return the inner content
  }

  return html; // return unchanged if not wrapped in <p>
};