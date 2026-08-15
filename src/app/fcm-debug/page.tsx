import { FcmDebugInfo } from "@/components/fcm-debug-info";

export default function FcmDebugPage() {
  return (
    <div className="bg-background min-h-screen">
      <div className="container max-w-2xl py-8">
        <h1 className="mb-4 text-2xl font-bold">FCM Debug Page</h1>
        <p className="text-muted-foreground mb-6">
          Use this page to compare FCM configuration between prepro and pro environments.
        </p>
        <FcmDebugInfo />

        <div className="bg-muted mx-4 mt-6 rounded-lg p-4">
          <h2 className="mb-2 font-semibold">How to use:</h2>
          <ol className="list-inside list-decimal space-y-2 text-sm">
            <li>Open this page in prepro environment and note all the ✓/✗ indicators</li>
            <li>Open this page in pro environment and compare</li>
            <li>
              Look for any differences in Firebase configuration, Service Worker support, or
              permissions
            </li>
            <li>Check browser console for detailed FCM logs</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
