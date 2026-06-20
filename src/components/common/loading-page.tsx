import { LoadingSpinner } from "./loading-spinner";

export const LoadingPage = () => {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
};
