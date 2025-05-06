import { supabase } from "../utils/supabase-client.js";

export const getStats = async () => {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const [{ count: activeUsers }, { count: gamesCovered }, { count: totalCodes }] = await Promise.all([
    supabase.from("players").select("*", { count: "exact", head: true }).gte("last_activity", oneWeekAgo.toISOString()),
    supabase.from("games").select("*", { count: "exact", head: true }),
    supabase.from("codes").select("*", { count: "exact", head: true }),
  ]);

  return {
    activeUsers: activeUsers ?? 0,
    gamesCovered: gamesCovered ?? 0,
    totalCodes: totalCodes ?? 0,
  };
};
