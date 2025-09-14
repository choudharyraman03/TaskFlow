// This is now the legacy V1 - redirecting to V2
import { useRouter } from "expo-router";
import { useEffect } from "react";

export default function Index() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to V2
    router.replace("/index-v2");
  }, []);

  return null;
}