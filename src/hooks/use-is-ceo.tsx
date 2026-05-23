import { useAuthStore } from "@/lib/auth-store";

export const useIsCeo = () => {
  const { user } = useAuthStore();
  return user?.role === 'CEO';
};
