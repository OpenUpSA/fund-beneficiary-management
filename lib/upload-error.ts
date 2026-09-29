// Turn a failed upload response into a message for the user. A 413 comes from
// the reverse proxy (an HTML page, not our JSON), so it gets its own message.
export async function getUploadErrorMessage(response: Response, fallback: string): Promise<string> {
  if (response.status === 413) {
    return "File is too large to upload. Please choose a smaller file."
  }
  const errorData = await response.json().catch(() => null)
  return errorData?.error || fallback
}
