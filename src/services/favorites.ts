import { supabase } from "../lib/supabase";

export type FavoriteType = "stadium" | "restaurant" | "hotel" | "fan-zone";

export type FavoriteItem = {
  id?: string;
  user_id?: string;
  item_type: FavoriteType;
  item_id: string;
  name: string;
  city?: string;
  image?: string;
  metadata?: Record<string, any>;
  created_at?: string;
};

async function getUserId() {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("You must be signed in to use favorites.");

  return data.user.id;
}

export async function listFavorites() {
  const userId = await getUserId();

  const { data, error } = await supabase!
    .from("favorites")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as FavoriteItem[];
}

export async function isFavorite(itemType: FavoriteType, itemId: string) {
  const userId = await getUserId();

  const { data, error } = await supabase!
    .from("favorites")
    .select("id")
    .eq("user_id", userId)
    .eq("item_type", itemType)
    .eq("item_id", itemId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export async function saveFavorite(item: FavoriteItem) {
  const userId = await getUserId();

  const existing = await supabase!
    .from("favorites")
    .select("id")
    .eq("user_id", userId)
    .eq("item_type", item.item_type)
    .eq("item_id", item.item_id)
    .maybeSingle();

  if (existing.error) throw existing.error;
  if (existing.data) return existing.data;

  const { data, error } = await supabase!
    .from("favorites")
    .insert({
      user_id: userId,
      item_type: item.item_type,
      item_id: item.item_id,
      name: item.name,
      city: item.city || "",
      image: item.image || "",
      metadata: item.metadata || {}
    })
    .select("id")
    .single();

  if (error) throw error;
  return data;
}

export async function removeFavorite(itemType: FavoriteType, itemId: string) {
  const userId = await getUserId();

  const { error } = await supabase!
    .from("favorites")
    .delete()
    .eq("user_id", userId)
    .eq("item_type", itemType)
    .eq("item_id", itemId);

  if (error) throw error;
}
