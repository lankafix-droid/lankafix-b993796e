/**
 * Hook to manage user's device registry — CRUD for registered devices.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DeviceRegistryItem {
  id: string;
  user_id: string;
  device_type: string;
  category_code: string;
  brand: string;
  model: string;
  serial_number: string | null;
  purchase_year: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useDeviceRegistry() {
  const [devices, setDevices] = useState<DeviceRegistryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from("device_registry")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setDevices((data || []) as unknown as DeviceRegistryItem[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchDevices(); }, [fetchDevices]);

  const addDevice = useCallback(async (device: Omit<DeviceRegistryItem, "id" | "user_id" | "created_at" | "updated_at">) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Please sign in"); return null; }

    const { data, error } = await supabase
      .from("device_registry")
      .insert({ ...device, user_id: user.id } as any)
      .select()
      .single();

    if (error) {
      toast.error("Failed to add device");
      return null;
    }
    toast.success("Device registered");
    await fetchDevices();
    return data;
  }, [fetchDevices]);

  const removeDevice = useCallback(async (id: string) => {
    const { error } = await supabase.from("device_registry").delete().eq("id", id);
    if (error) {
      toast.error("Failed to remove device");
      return;
    }
    toast.success("Device removed");
    await fetchDevices();
  }, [fetchDevices]);

  return { devices, loading, refresh: fetchDevices, addDevice, removeDevice };
}
