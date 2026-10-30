import { redirect } from 'next/navigation';

export default async function Home({ searchParams }) {
  const resolvedParams = await searchParams;
  const query = new URLSearchParams();
  if (resolvedParams) {
    Object.entries(resolvedParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v) => query.append(key, String(v)));
      } else if (value !== undefined && value !== null) {
        query.set(key, String(value));
      }
    });
  }
  const qs = query.toString();
  redirect(qs ? `/register?${qs}` : '/register');
}
