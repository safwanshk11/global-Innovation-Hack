export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // 10 MB

export const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const ACCEPTED_PHOTO_ACCEPT_ATTR = "image/jpeg,image/png,image/webp";

// Formats we accept for the audio *upload* fallback. In-browser recording
// produces its own supported type (see useAudioRecorder), so this list is
// only consulted when a user picks an existing audio file from disk.
export const ACCEPTED_AUDIO_UPLOAD_TYPES = [
  "audio/webm",
  "audio/ogg",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/x-wav",
  "audio/m4a",
  "audio/x-m4a",
  "audio/aac",
];
export const ACCEPTED_AUDIO_ACCEPT_ATTR = "audio/*";

export function validatePhotoFile(file: File): string | null {
  if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
    return "Please choose a JPEG, PNG, or WebP image.";
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return "Photo must be 5 MB or smaller.";
  }
  return null;
}

export function validateAudioUploadFile(file: File): string | null {
  const looksLikeAudio =
    file.type.startsWith("audio/") || ACCEPTED_AUDIO_UPLOAD_TYPES.includes(file.type);
  if (!looksLikeAudio) {
    return "Please choose an audio file (M4A, MP3, WAV, OGG, or WebM).";
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return "Audio must be 10 MB or smaller.";
  }
  return null;
}
