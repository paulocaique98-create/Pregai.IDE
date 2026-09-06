export function appUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

export function churchUrl(slug: string) {
  return `${appUrl()}/igreja/${slug}`;
}
