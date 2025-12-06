// This will be used to calculate how long ago a post was made
// Why am i doing this? BECAUSE IM CRAZY THATS WHY

export function timeAgo(isoString) {
  if (!isoString) return "";

  const then = new Date(isoString);
  const now = new Date();
  const diffMs = now - then;

  if (Number.isNaN(diffMs) || diffMs < 0) {
    return "";
  }

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours   = Math.floor(minutes / 60);
  const days    = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  if (hours < 24)   return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  if (days < 7)     return `${days} day${days === 1 ? "" : "s"} ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 4)    return `${weeks} week${weeks === 1 ? "" : "s"} ago`;

  const months = Math.floor(days / 30);
  if (months < 12)  return `${months} month${months === 1 ? "" : "s"} ago`;

  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}
