// Strips HTML tags and dangerous content from user-supplied strings
export function sanitizeInput(input: string): string {
  if (!input) return "";
  return input
    .replace(/<[^>]*>/g, "") // strip all HTML tags
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .trim();
}

// Validates and trims text with a max length
export function validateText(input: string, maxLength: number): string {
  return sanitizeInput(input).slice(0, maxLength);
}

// Max length constants
export const MAX_LENGTHS = {
  username: 30,
  bio: 200,
  message: 500,
  journalTitle: 100,
  journalContent: 5000,
  groupName: 50,
  groupDescription: 200,
  starName: 50,
  starMessage: 300,
  eventTitle: 100,
  eventDescription: 500,
};
