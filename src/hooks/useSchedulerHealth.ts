import { useQuery } from '@tanstack/react-query';
import { getSchedulerApiUrl } from '@/lib/scheduler';

export function useSchedulerHealth() {
    const apiUrl = getSchedulerApiUrl();

    return useQuery({
        queryKey: ['scheduler-health', apiUrl],
        queryFn: async () => {
            // If no API URL is configured (or default /api which might not exist locally), fail fast
            if (!apiUrl) return false;

            try {
                // Try to fetch the base URL or a health endpoint
                // Since we don't know the exact API structure, we'll try a HEAD request to the base
                // or a simple GET. Many APIs return 404 on root but are active.
                // However, the user specifically mentioned "API Error: 404 page not found" implies the endpoint itself is missing.

                // We'll try fetching the stats endpoint which is likely used by usescheduledPostsStats
                // or just the health check if it exists.
                // Let's try /health first.
                let res = await fetch(`${apiUrl}/health`);
                if (res.ok) return true;

                // If that fails, try the root
                res = await fetch(apiUrl);
                if (res.ok) return true;

                // If that fails, it might be a 404 because the route is wrong
                // but if it's a 404, the user considers it "doesn't exist".
                // If it's 401/403, it exists but we aren't auth'd (which means it "exists").
                if (res.status === 401 || res.status === 403) return true;

                return false;
            } catch {
                return false;
            }
        },
        // Don't retry too much to avoid spamming a dead server
        retry: 1,
        // Cache check for 5 minutes
        staleTime: 1000 * 60 * 5,
    });
}
